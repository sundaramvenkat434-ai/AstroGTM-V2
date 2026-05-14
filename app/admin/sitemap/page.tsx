'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Search, Plus, ExternalLink, Copy,
  CircleCheck as CheckCircle2, Loader as Loader2, X, Map,
  SlidersHorizontal, Clock, Send, TriangleAlert as AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

interface SitemapEntry {
  id: string;
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
  enabled: boolean;
  title: string;
  page_type: string;
  source: string;
  source_table: string | null;
  source_id: string | null;
}

interface Suggestion {
  loc: string;
  title: string;
  lastmod: string;
  changefreq: string;
  priority: number;
  page_type: string;
  source: string;
  source_table: string | null;
  source_id: string | null;
}

interface Submission {
  id: string;
  submitted_at: string;
  total_urls: number;
  index_allowed: number;
  noindex_count: number;
  notes: string;
}

interface XmlWarning { type: 'error' | 'warn' | 'info'; message: string; }

const CHANGEFREQ_OPTIONS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

const PRIORITY_OPTIONS = [
  { value: '1.0', label: '1.0 — Highest' },
  { value: '0.9', label: '0.9' },
  { value: '0.8', label: '0.8 — High' },
  { value: '0.7', label: '0.7' },
  { value: '0.6', label: '0.6' },
  { value: '0.5', label: '0.5 — Default' },
  { value: '0.4', label: '0.4' },
  { value: '0.3', label: '0.3 — Low' },
  { value: '0.2', label: '0.2' },
  { value: '0.1', label: '0.1 — Lowest' },
];

const PAGE_TYPES = ['homepage', 'category', 'tool', 'top-x', 'content', 'custom'];

const PAGE_TYPE_DEFAULTS: Record<string, { changefreq: string; priority: string }> = {
  homepage: { changefreq: 'daily', priority: '1.0' },
  category: { changefreq: 'weekly', priority: '0.8' },
  tool: { changefreq: 'weekly', priority: '0.7' },
  'top-x': { changefreq: 'weekly', priority: '0.75' },
  content: { changefreq: 'monthly', priority: '0.6' },
  custom: { changefreq: 'weekly', priority: '0.5' },
};

// ── XML helpers ────────────────────────────────────────────────────────────────

function entriesToXml(entries: SitemapEntry[]): string {
  const urls = entries
    .filter(e => e.enabled)
    .sort((a, b) => b.priority - a.priority)
    .map(e => {
      const url = e.loc.startsWith('http') ? e.loc : `${SITE_URL}${e.loc}`;
      const mod = format(new Date(e.lastmod), 'yyyy-MM-dd');
      return [
        '  <url>',
        `    <loc>${url}</loc>`,
        `    <lastmod>${mod}</lastmod>`,
        `    <changefreq>${e.changefreq}</changefreq>`,
        `    <priority>${Number(e.priority).toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${urls}\n\n</urlset>`;
}

function parseXmlToLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>(.*?)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SitemapAdmin() {
  const router = useRouter();
  const [entries, setEntries] = useState<SitemapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  // XML editor
  const [xml, setXml] = useState('');
  const [xmlDirty, setXmlDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // XML validation
  const [xmlWarnings, setXmlWarnings] = useState<XmlWarning[]>([]);
  const [xmlValidated, setXmlValidated] = useState(false);

  // Scan modal
  const [scanning, setScanning] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // Bulk edit modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState('tool');
  const [bulkPriority, setBulkPriority] = useState('0.7');
  const [bulkFreq, setBulkFreq] = useState('weekly');
  const [bulkLastmod, setBulkLastmod] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [applyingBulk, setApplyingBulk] = useState(false);

  // Submission log modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);

  // Copy
  const [copied, setCopied] = useState(false);

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('sitemap_entries')
      .select('*')
      .order('priority', { ascending: false });
    const ents = (data || []) as SitemapEntry[];
    setEntries(ents);
    setXml(entriesToXml(ents));
    setLoading(false);
    return ents;
  }, []);

  // Auto-seed on first open when table is empty
  const seedIfEmpty = useCallback(async (uid: string) => {
    const ents = await loadEntries();
    if (ents.length > 0) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-sitemap`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
      );
      const result = await res.json();
      const suggs: Suggestion[] = result.suggestions || [];
      if (suggs.length) {
        await supabase.from('sitemap_entries').upsert(
          suggs.map(s => ({
            loc: s.loc, title: s.title, lastmod: s.lastmod, changefreq: s.changefreq,
            priority: s.priority, page_type: s.page_type || 'custom',
            source: s.source, source_table: s.source_table, source_id: s.source_id,
            enabled: true, author_id: uid,
          })),
          { onConflict: 'loc' }
        );
        await loadEntries();
      }
    } catch { /* silent */ }
  }, [loadEntries]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/admin/login'); return; }
      setUserId(session.user.id);
      seedIfEmpty(session.user.id);
    });
  }, [router, seedIfEmpty]);

  // ── Save XML ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const locsInXml = new Set(parseXmlToLocs(xml).map(l =>
      l.startsWith(SITE_URL) ? l.slice(SITE_URL.length) || '/' : l
    ));
    for (const entry of entries) {
      const inXml = locsInXml.has(entry.loc);
      if (entry.enabled && !inXml) {
        await supabase.from('sitemap_entries')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('id', entry.id);
      } else if (!entry.enabled && inXml) {
        await supabase.from('sitemap_entries')
          .update({ enabled: true, updated_at: new Date().toISOString() })
          .eq('id', entry.id);
      }
    }
    await loadEntries();
    setXmlDirty(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Scan ─────────────────────────────────────────────────────────────────────
  async function handleScan() {
    setScanning(true);
    setSuggestions([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-sitemap`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
      );
      const result = await res.json();
      const suggs: Suggestion[] = result.suggestions || [];
      setSuggestions(suggs);
      setSelected(new Set(suggs.map(s => s.loc)));
      setShowScanModal(true);
    } catch { /* silent */ }
    setScanning(false);
  }

  async function handleAddSelected() {
    setAdding(true);
    const toAdd = suggestions.filter(s => selected.has(s.loc));
    if (toAdd.length) {
      await supabase.from('sitemap_entries').upsert(
        toAdd.map(s => ({
          loc: s.loc, title: s.title, lastmod: s.lastmod, changefreq: s.changefreq,
          priority: s.priority, page_type: s.page_type || 'custom',
          source: s.source, source_table: s.source_table, source_id: s.source_id,
          enabled: true, author_id: userId,
        })),
        { onConflict: 'loc' }
      );
    }
    await loadEntries();
    setShowScanModal(false);
    setSuggestions([]);
    setSelected(new Set());
    setAdding(false);
  }

  // ── Bulk edit ────────────────────────────────────────────────────────────────
  function handleBulkTypeChange(type: string) {
    setBulkType(type);
    const d = PAGE_TYPE_DEFAULTS[type];
    if (d) { setBulkPriority(d.priority); setBulkFreq(d.changefreq); }
  }

  async function handleApplyBulk() {
    setApplyingBulk(true);
    const ids = entries.filter(e => e.page_type === bulkType).map(e => e.id);
    if (ids.length) {
      await supabase.from('sitemap_entries').update({
        priority: parseFloat(bulkPriority),
        changefreq: bulkFreq,
        lastmod: new Date(bulkLastmod).toISOString(),
        updated_at: new Date().toISOString(),
      }).in('id', ids);
      await loadEntries();
    }
    setApplyingBulk(false);
    setShowBulkModal(false);
  }

  const bulkMatchCount = entries.filter(e => e.page_type === bulkType).length;

  // ── Submission log ───────────────────────────────────────────────────────────
  async function openLog() {
    setShowLogModal(true);
    setLoadingLog(true);
    const { data } = await supabase.from('sitemap_submissions')
      .select('*').order('submitted_at', { ascending: false }).limit(20);
    setSubmissions((data || []) as Submission[]);
    setLoadingLog(false);
  }

  async function handleLogSubmission() {
    setSubmitting(true);
    const enabled = entries.filter(e => e.enabled);
    const { data } = await supabase.from('sitemap_submissions').insert({
      total_urls: enabled.length,
      index_allowed: enabled.length,
      noindex_count: 0,
      submitted_by: userId,
      notes: '',
    }).select().maybeSingle();
    if (data) setSubmissions(prev => [data as Submission, ...prev]);
    setSubmitting(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // ── Validate XML ─────────────────────────────────────────────────────────────
  function handleValidate() {
    const warnings: XmlWarning[] = [];

    // Empty content
    if (!xml.trim()) {
      warnings.push({ type: 'error', message: 'XML content is empty.' });
      setXmlWarnings(warnings);
      setXmlValidated(true);
      return;
    }

    // Must contain <urlset> root
    if (!/<urlset[\s>]/i.test(xml)) {
      warnings.push({ type: 'error', message: 'Missing <urlset> root element — not a valid sitemap structure.' });
      setXmlWarnings(warnings);
      setXmlValidated(true);
      return;
    }

    // Missing xmlns attribute on urlset
    if (!/<urlset[^>]*xmlns=/i.test(xml)) {
      warnings.push({ type: 'warn', message: '<urlset> is missing the required xmlns attribute.' });
    }

    // Extract all <url> blocks
    const urlBlocks: string[] = [];
    const urlBlockRe = /<url>([\s\S]*?)<\/url>/gi;
    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = urlBlockRe.exec(xml)) !== null) {
      urlBlocks.push(blockMatch[1]);
    }

    // Any <url> block missing <loc>
    let missingLocCount = 0;
    for (const block of urlBlocks) {
      if (!/<loc>/i.test(block)) missingLocCount++;
    }
    if (missingLocCount > 0) {
      warnings.push({ type: 'error', message: `${missingLocCount} <url> block${missingLocCount !== 1 ? 's' : ''} missing a <loc> element.` });
    }

    // Extract all locs
    const locs = parseXmlToLocs(xml);

    // Any <loc> that is relative
    const relativeLocs = locs.filter(l => !l.startsWith('http'));
    if (relativeLocs.length > 0) {
      warnings.push({ type: 'error', message: `${relativeLocs.length} <loc> value${relativeLocs.length !== 1 ? 's' : ''} are relative URLs (must start with http).` });
    }

    // Duplicate <loc> values
    const locCounts: Record<string, number> = {};
    for (const loc of locs) {
      locCounts[loc] = (locCounts[loc] || 0) + 1;
    }
    const duplicates = Object.entries(locCounts).filter(([, count]) => count > 1).map(([loc]) => loc);
    if (duplicates.length > 0) {
      const shown = duplicates.slice(0, 3).join(', ');
      const extra = duplicates.length > 3 ? ` and ${duplicates.length - 3} more` : '';
      warnings.push({ type: 'error', message: `Duplicate <loc> values found: ${shown}${extra}.` });
    }

    // <priority> values outside 0.0–1.0
    const priorityRe = /<priority>(.*?)<\/priority>/gi;
    let prioMatch: RegExpExecArray | null;
    let badPriorityCount = 0;
    let moreThanOneDecimalCount = 0;
    while ((prioMatch = priorityRe.exec(xml)) !== null) {
      const raw = prioMatch[1].trim();
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0 || val > 1) {
        badPriorityCount++;
      }
      // More than 1 decimal place
      const decimalMatch = raw.match(/\.(\d+)/);
      if (decimalMatch && decimalMatch[1].length > 1) {
        moreThanOneDecimalCount++;
      }
    }
    if (badPriorityCount > 0) {
      warnings.push({ type: 'error', message: `${badPriorityCount} <priority> value${badPriorityCount !== 1 ? 's' : ''} outside the valid 0.0–1.0 range.` });
    }
    if (moreThanOneDecimalCount > 0) {
      warnings.push({ type: 'warn', message: `${moreThanOneDecimalCount} <priority> value${moreThanOneDecimalCount !== 1 ? 's' : ''} have more than 1 decimal place (e.g. use 0.7 not 0.75).` });
    }

    // <changefreq> values not in the allowed list
    const validFreqs = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);
    const freqRe = /<changefreq>(.*?)<\/changefreq>/gi;
    let freqMatch: RegExpExecArray | null;
    let badFreqCount = 0;
    while ((freqMatch = freqRe.exec(xml)) !== null) {
      const val = freqMatch[1].trim().toLowerCase();
      if (!validFreqs.has(val)) badFreqCount++;
    }
    if (badFreqCount > 0) {
      warnings.push({ type: 'warn', message: `${badFreqCount} <changefreq> value${badFreqCount !== 1 ? 's' : ''} are not valid (allowed: always, hourly, daily, weekly, monthly, yearly, never).` });
    }

    // Total URL count (info)
    warnings.push({ type: 'info', message: `${locs.length} URL${locs.length !== 1 ? 's' : ''} found in sitemap.` });

    // 0 enabled URLs
    const enabledInEntries = entries.filter(e => e.enabled).length;
    if (enabledInEntries === 0) {
      warnings.push({ type: 'warn', message: 'No enabled URLs in the sitemap entries — the sitemap will be empty when saved.' });
    }

    setXmlWarnings(warnings);
    setXmlValidated(true);
  }

  const enabledCount = entries.filter(e => e.enabled).length;
  const lastSub = submissions[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <Map className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-900 text-sm truncate">Sitemap Editor</span>
              <span className="text-xs text-slate-400 shrink-0">{enabledCount} URLs</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />View
              </a>

              <button onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Bulk edit */}
              <button onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bulk</span>
              </button>

              {/* Validate */}
              <button onClick={handleValidate}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 transition-colors">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Validate</span>
              </button>

              {/* Submission log */}
              <button onClick={openLog}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log</span>
              </button>

              {/* Scan */}
              <button onClick={handleScan} disabled={scanning}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 transition-colors disabled:opacity-50">
                {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{scanning ? 'Scanning…' : 'Scan'}</span>
              </button>

              {/* Save */}
              <button onClick={handleSave} disabled={saving || !xmlDirty}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 ${
                  xmlDirty ? 'bg-slate-900 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-400'
                }`}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── XML Editor ── */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {/* ── Validation panel ── */}
        {xmlValidated && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <span className="text-xs font-semibold text-slate-700">Validation Results</span>
              <button
                onClick={() => { setXmlValidated(false); setXmlWarnings([]); }}
                className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {xmlWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                  {w.type === 'error' && (
                    <span className="mt-px text-red-500 shrink-0 font-bold text-sm leading-none">✕</span>
                  )}
                  {w.type === 'warn' && (
                    <span className="mt-px text-amber-500 shrink-0 text-sm leading-none">⚠</span>
                  )}
                  {w.type === 'info' && (
                    <span className="mt-px text-teal-500 shrink-0 text-sm leading-none">✓</span>
                  )}
                  <span className={`text-xs leading-relaxed ${
                    w.type === 'error' ? 'text-red-700' :
                    w.type === 'warn' ? 'text-amber-700' :
                    'text-teal-700'
                  }`}>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/80">
            <span className="text-[11px] font-mono text-slate-400">sitemap.xml</span>
            <span className="text-[11px] text-slate-400">Edit directly · delete a &lt;url&gt; block to exclude · Save to apply</span>
          </div>
          <textarea
            ref={textareaRef}
            value={xml}
            onChange={e => { setXml(e.target.value); setXmlDirty(true); setXmlValidated(false); setXmlWarnings([]); }}
            spellCheck={false}
            className="w-full font-mono text-xs text-slate-700 leading-relaxed p-5 resize-none outline-none bg-white"
            style={{ minHeight: 'calc(100vh - 170px)', tabSize: 2 }}
          />
        </div>
      </div>

      {/* ── Scan modal ── */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowScanModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Missing pages</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {suggestions.length === 0
                    ? 'All published pages are already in the sitemap.'
                    : `${suggestions.length} page${suggestions.length !== 1 ? 's' : ''} not in sitemap yet`}
                </p>
              </div>
              <button onClick={() => setShowScanModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {suggestions.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">Every published page is already in the sitemap.</p>
                <Button className="mt-5" variant="outline" size="sm" onClick={() => setShowScanModal(false)}>Close</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100 bg-slate-50">
                  <button
                    onClick={() => setSelected(selected.size === suggestions.length ? new Set() : new Set(suggestions.map(s => s.loc)))}
                    className="text-xs text-sky-600 hover:text-sky-800 font-medium transition-colors">
                    {selected.size === suggestions.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <span className="text-xs text-slate-400">{selected.size} selected</span>
                </div>
                <div className="overflow-y-auto max-h-72 divide-y divide-slate-100">
                  {suggestions.map(s => (
                    <label key={s.loc} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input type="checkbox" checked={selected.has(s.loc)}
                        onChange={e => {
                          const next = new Set(selected);
                          e.target.checked ? next.add(s.loc) : next.delete(s.loc);
                          setSelected(next);
                        }}
                        className="rounded border-slate-300 accent-slate-900 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.title}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{s.loc}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">{Number(s.priority).toFixed(1)}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-100 bg-slate-50">
                  <Button variant="outline" size="sm" onClick={() => setShowScanModal(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAddSelected} disabled={adding || selected.size === 0}
                    className="bg-slate-900 hover:bg-slate-800 gap-1.5">
                    {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add {selected.size > 0 ? `${selected.size} ` : ''}page{selected.size !== 1 ? 's' : ''}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk edit modal ── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBulkModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Bulk Edit by Page Type</h2>
              <button onClick={() => setShowBulkModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Page type */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Page Type</label>
                <Select value={bulkType} onValueChange={handleBulkTypeChange}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {bulkMatchCount} URL{bulkMatchCount !== 1 ? 's' : ''} will be updated
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Priority</label>
                <Select value={bulkPriority} onValueChange={setBulkPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Change freq */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Change Frequency</label>
                <Select value={bulkFreq} onValueChange={setBulkFreq}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANGEFREQ_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Last mod */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Last Modified Date</label>
                <input type="date" value={bulkLastmod} onChange={e => setBulkLastmod(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-100 bg-slate-50">
              <Button variant="outline" size="sm" onClick={() => setShowBulkModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleApplyBulk} disabled={applyingBulk || bulkMatchCount === 0}
                className="bg-slate-900 hover:bg-slate-800 gap-1.5">
                {applyingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Apply to {bulkMatchCount} URL{bulkMatchCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submission log modal ── */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Google Submission Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">Record each time you submit the sitemap to Google Search Console</p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Log submission CTA */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-600">
                  After submitting to <span className="font-semibold">Google Search Console</span>, log it here.
                </p>
                {submissions[0] && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Last logged: {format(new Date(submissions[0].submitted_at), 'MMM d, yyyy — HH:mm')}
                  </p>
                )}
              </div>
              <Button size="sm" onClick={handleLogSubmission} disabled={submitting}
                className="bg-slate-900 hover:bg-slate-800 gap-1.5 shrink-0">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Log Now
              </Button>
            </div>

            {/* History */}
            <div className="overflow-y-auto max-h-72">
              {loadingLog ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-slate-400">No submissions logged yet.</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-6 py-2 font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Date</th>
                      <th className="text-right px-4 py-2 font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Total</th>
                      <th className="text-right px-6 py-2 font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Indexed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-2.5 text-slate-600">{format(new Date(sub.submitted_at), 'MMM d, yyyy — HH:mm')}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-800">{sub.total_urls}</td>
                        <td className="px-6 py-2.5 text-right text-emerald-600 font-medium">{sub.index_allowed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowLogModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
