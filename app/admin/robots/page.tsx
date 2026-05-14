'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Copy, ExternalLink, CircleCheck as CheckCircle2,
  Loader as Loader2, Shield, TriangleAlert as AlertTriangle,
  RefreshCw,
} from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

const DEFAULT_ROBOTS = `# robots.txt — managed via Admin > Robots.txt Editor
# Learn more: https://developers.google.com/search/docs/crawling-indexing/robots/intro

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin

# Block common bot traps
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;

interface Warning {
  type: 'error' | 'warn' | 'info';
  message: string;
}

// ── Validator ──────────────────────────────────────────────────────────────────

function validate(content: string): Warning[] {
  const warnings: Warning[] = [];
  const lines = content.split('\n').map(l => l.trim());
  const nonComment = lines.filter(l => l && !l.startsWith('#'));

  // Must have at least one User-agent directive
  const hasUserAgent = nonComment.some(l => /^user-agent:/i.test(l));
  if (!hasUserAgent) {
    warnings.push({ type: 'error', message: 'Missing User-agent directive — crawlers need at least one.' });
  }

  // Must reference the sitemap
  const hasSitemap = nonComment.some(l => /^sitemap:/i.test(l));
  if (!hasSitemap) {
    warnings.push({ type: 'warn', message: 'No Sitemap directive found. Consider adding: Sitemap: ' + SITE_URL + '/sitemap.xml' });
  }

  // Warn if root is blocked
  const blocksRoot = nonComment.some(l => /^disallow:\s*\/\s*$/i.test(l));
  if (blocksRoot) {
    warnings.push({ type: 'error', message: 'Disallow: / blocks all crawlers from the entire site.' });
  }

  // Warn if Sitemap URL is relative
  const sitemapLines = nonComment.filter(l => /^sitemap:/i.test(l));
  for (const sl of sitemapLines) {
    const url = sl.replace(/^sitemap:\s*/i, '').trim();
    if (url && !url.startsWith('http')) {
      warnings.push({ type: 'error', message: `Sitemap URL must be absolute (starts with https://): "${url}"` });
    }
  }

  // Warn about disallowing admin but not both variants
  const disallows = nonComment.filter(l => /^disallow:/i.test(l)).map(l => l.replace(/^disallow:\s*/i, '').trim());
  if (disallows.includes('/admin/') && !disallows.includes('/admin')) {
    warnings.push({ type: 'info', message: 'Consider also adding "Disallow: /admin" (without trailing slash) for full coverage.' });
  }

  // Crawl-delay warning
  const hasCrawlDelay = nonComment.some(l => /^crawl-delay:/i.test(l));
  if (hasCrawlDelay) {
    warnings.push({ type: 'info', message: 'Crawl-delay is not supported by Googlebot — use Google Search Console instead.' });
  }

  // Empty content
  if (!content.trim()) {
    warnings.push({ type: 'error', message: 'robots.txt is empty.' });
  }

  if (warnings.length === 0) {
    warnings.push({ type: 'info', message: 'Looks good — no issues detected.' });
  }

  return warnings;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RobotsAdmin() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [userId, setUserId] = useState('');
  const [copied, setCopied] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [validated, setValidated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadContent = useCallback(async () => {
    const { data } = await supabase
      .from('robots_txt')
      .select('content')
      .eq('singleton_key', 'default')
      .maybeSingle();
    const text = data?.content ?? DEFAULT_ROBOTS;
    setContent(text);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/admin/login'); return; }
      setUserId(session.user.id);
      loadContent();
    });
  }, [router, loadContent]);

  async function handleSave() {
    setSaving(true);
    await supabase.from('robots_txt').upsert(
      { singleton_key: 'default', content, updated_at: new Date().toISOString(), updated_by: userId },
      { onConflict: 'singleton_key' }
    );
    setSaving(false);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleValidate() {
    setWarnings(validate(content));
    setValidated(true);
  }

  function handleReset() {
    setContent(DEFAULT_ROBOTS);
    setDirty(true);
    setValidated(false);
    setWarnings([]);
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleChange(val: string) {
    setContent(val);
    setDirty(true);
    setValidated(false);
    setWarnings([]);
  }

  const errorCount = warnings.filter(w => w.type === 'error').length;
  const warnCount = warnings.filter(w => w.type === 'warn').length;

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-slate-900 text-sm truncate">robots.txt Editor</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a href="/robots.txt" target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />View
              </a>

              <button onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button onClick={handleValidate}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 transition-colors font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Validate</span>
              </button>

              <button onClick={handleSave} disabled={saving || !dirty}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 ${
                  dirty ? 'bg-slate-900 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-400'
                }`}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">

        {/* Validation panel */}
        {validated && warnings.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Validation Results</span>
              </div>
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {warnCount} warning{warnCount !== 1 ? 's' : ''}
                  </span>
                )}
                {errorCount === 0 && warnCount === 0 && (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    All clear
                  </span>
                )}
                <button onClick={() => { setValidated(false); setWarnings([]); }}
                  className="text-slate-400 hover:text-slate-600 transition-colors">
                  <span className="text-xs">✕</span>
                </button>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 shrink-0 text-sm ${
                    w.type === 'error' ? 'text-red-500' :
                    w.type === 'warn' ? 'text-amber-500' :
                    'text-emerald-500'
                  }`}>
                    {w.type === 'error' ? '✕' : w.type === 'warn' ? '⚠' : '✓'}
                  </span>
                  <span className="text-xs text-slate-700 leading-relaxed">{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Editor */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/80">
            <span className="text-[11px] font-mono text-slate-400">robots.txt</span>
            <span className="text-[11px] text-slate-400">Edit directly · Validate before saving · Save to apply</span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => handleChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="w-full font-mono text-xs text-slate-700 leading-relaxed p-5 resize-none outline-none bg-white"
            style={{ minHeight: 'calc(100vh - 240px)', tabSize: 2 }}
          />
        </div>

        {/* Help reference */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">Quick Reference</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              ['User-agent: *', 'Applies rules to all crawlers'],
              ['User-agent: Googlebot', 'Applies rules only to Googlebot'],
              ['Allow: /', 'Permit crawling of a path'],
              ['Disallow: /admin/', 'Block crawling of a path'],
              ['Sitemap: https://…/sitemap.xml', 'Point to your sitemap'],
              ['Crawl-delay: 10', 'Delay between requests (not Google)'],
            ].map(([directive, desc]) => (
              <div key={directive} className="flex items-start gap-2">
                <code className="text-[11px] font-mono text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">{directive}</code>
                <span className="text-[11px] text-slate-500 mt-0.5">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
