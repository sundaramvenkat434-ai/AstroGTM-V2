'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Sparkles, Check, ChevronUp, ChevronDown,
  Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2,
  Eye, Plus, X, Trash2, Type, AlignLeft, FileText, MessageSquare,
  Search, Link2, Tag, DollarSign, Pencil, Globe, Star, Save,
  PanelLeftClose, PanelLeft, Shield, RefreshCw, GitCompare, Zap, Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'seo', label: 'SEO & Content' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'developer', label: 'Developer Tools' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'security', label: 'Security' },
  { value: 'design', label: 'Design' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const TABS = [
  { id: 'content', label: 'Content' },
  { id: 'analysis', label: 'Tool Analysis' },
  { id: 'sections', label: 'Comparison' },
  { id: 'seo', label: 'SEO & Meta' },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Types ────────────────────────────────────────────────────────────────────

interface ToolOption {
  id: string;
  name: string;
  tagline: string;
  slug: string;
  tags: string[];
  rating: number;
  rating_count: string;
  users: string;
  badge: string | null;
  features: { title: string; description: string }[];
  use_cases: string[];
  description: string;
  long_description: string;
  category: string;
  pricing: { plan: string; price: string; features: string[] }[];
}

interface ToolEntry {
  tool_id: string;
  score: number;
  best_for: string;
  pros: string[];
  cons: string[];
  pricing_summary: string;
  verdict: string;
}

interface ComparisonSection {
  title: string;
  dimension: string;
  tool_a_value: string;
  tool_b_value: string;
  winner_id: string | null;
  notes: string;
}

interface FeatureRow {
  feature: string;
  tool_a: string;
  tool_b: string;
  winner_id: string | null;
}

interface UseCaseWinner {
  use_case: string;
  winner_id: string;
  reason: string;
}

interface ComparisonRecord {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  tool_ids: string[];
  intro: string;
  verdict: string;
  outro: string;
  tool_a_entry: ToolEntry;
  tool_b_entry: ToolEntry;
  sections: ComparisonSection[];
  feature_matrix: FeatureRow[];
  use_case_winners: UseCaseWinner[];
  faqs: { q: string; a: string }[];
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  status: string;
  noindex: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface EeatResult {
  overall_score: number;
  experience_score: number;
  expertise_score: number;
  authoritativeness_score: number;
  trustworthiness_score: number;
  strengths: string[];
  improvements: string[];
  analyzed_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count, action }: {
  icon: React.ReactNode; label: string; count?: number; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-slate-400">{icon}</span>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</h3>
      {count !== undefined && <span className="text-[11px] text-slate-400 tabular-nums">({count})</span>}
      <div className="h-px flex-1 bg-slate-100" />
      {action}
    </div>
  );
}

function EditableField({ label, icon, value, onChange, charLimit, multiline, placeholder }: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void;
  charLimit?: { min: number; max: number }; multiline?: boolean; placeholder?: string;
}) {
  const len = value.length;
  const isOver = charLimit && len > charLimit.max;
  return (
    <div className="rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">{icon}</span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {charLimit && <span className={`text-[10px] font-medium tabular-nums ${isOver ? 'text-red-500' : 'text-slate-400'}`}>{len}/{charLimit.max}</span>}
          <Pencil className="w-3 h-3 text-slate-300" />
        </div>
      </div>
      <div className="px-3.5 py-2">
        {multiline ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
            className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300" />
        ) : (
          <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
        )}
      </div>
    </div>
  );
}

function eeatBg(s: number, max: number) {
  const p = s / max;
  return p >= 0.8 ? 'border-emerald-400 bg-emerald-50' : p >= 0.5 ? 'border-amber-400 bg-amber-50' : 'border-red-400 bg-red-50';
}
function eeatColor(s: number, max: number) {
  const p = s / max;
  return p >= 0.8 ? 'text-emerald-600' : p >= 0.5 ? 'text-amber-600' : 'text-red-600';
}

function EeatPanel({ record }: { record: ComparisonRecord | null }) {
  const [eeat, setEeat] = useState<EeatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function runEeat() {
    if (!record) return;
    setLoading(true); setError('');
    try {
      const content = [
        `# ${record.name}`, record.tagline, record.intro, record.verdict,
        ...(record.sections || []).flatMap(s => [s.tool_a_value, s.tool_b_value, s.notes]),
        record.outro,
        ...(record.faqs || []).flatMap(f => [`Q: ${f.q}`, `A: ${f.a}`]),
      ].filter(Boolean).join('\n');
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-eeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: record.name, content, meta_description: record.meta_description, focus_keyword: record.focus_keyword }),
      });
      if (res.status === 429) { setError('Rate limited.'); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setEeat(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">E-E-A-T Score</h3>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Experience, Expertise, Authoritativeness, Trust</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {eeat && (
            <div className="flex items-center gap-1.5 mr-1">
              <div className={`w-9 h-9 rounded-full border-[3px] flex items-center justify-center ${eeatBg(eeat.overall_score, 100)}`}>
                <span className={`text-sm font-bold ${eeatColor(eeat.overall_score, 100)}`}>{eeat.overall_score}</span>
              </div>
              <span className={`text-xs font-semibold ${eeat.overall_score >= 80 ? 'text-emerald-600' : eeat.overall_score >= 60 ? 'text-emerald-500' : eeat.overall_score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                {eeat.overall_score >= 80 ? 'Excellent' : eeat.overall_score >= 60 ? 'Good' : eeat.overall_score >= 40 ? 'Fair' : 'Needs Work'}
              </span>
            </div>
          )}
          <button onClick={runEeat} disabled={loading || !record?.name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {eeat ? 'Refresh' : 'Analyze'}
          </button>
          {eeat && (
            <button onClick={() => setExpanded(!expanded)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      {loading && !eeat && <div className="px-4 py-6 text-center"><Loader2 className="w-5 h-5 text-teal-500 animate-spin mx-auto mb-2" /><p className="text-xs text-slate-500">Analyzing…</p></div>}
      {error && <div className="px-4 py-2.5 bg-red-50 border-t border-red-100"><p className="text-xs text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p></div>}
      {eeat && !loading && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center justify-around">
            {[{ score: eeat.experience_score, label: 'Experience' }, { score: eeat.expertise_score, label: 'Expertise' }, { score: eeat.authoritativeness_score, label: 'Authority' }, { score: eeat.trustworthiness_score, label: 'Trust' }].map(({ score, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full border-[3px] flex items-center justify-center ${eeatBg(score, 25)}`}>
                  <span className={`text-xs font-bold ${eeatColor(score, 25)}`}>{score}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-500 text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {eeat && expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
          {eeat.strengths?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Strengths</h4>
              <ul className="space-y-1">{eeat.strengths.slice(0, 3).map((s, i) => <li key={i} className="text-xs text-slate-600 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5 flex items-start gap-1.5"><span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>{s}</li>)}</ul>
            </div>
          )}
          {eeat.improvements?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> Improvements</h4>
              <ul className="space-y-1">{eeat.improvements.slice(0, 3).map((imp, i) => <li key={i} className="text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5 flex items-start gap-1.5"><span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>{imp}</li>)}</ul>
            </div>
          )}
          <p className="text-[10px] text-slate-400 text-right pt-1">Analyzed {new Date(eeat.analyzed_at).toLocaleString()}</p>
        </div>
      )}
      {!eeat && !loading && !error && <div className="px-4 py-4 text-center"><p className="text-xs text-slate-400">Click "Analyze" to check E-E-A-T signals.</p></div>}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ComparisonEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<ComparisonRecord | null>(null);
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slugError, setSlugError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/admin/login'); return; }
    });
    supabase.from('tool_comparisons').select('*').eq('id', id).maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) { setError('Comparison not found.'); setLoading(false); return; }
        const rec = data as ComparisonRecord;
        setRecord(rec);
        // Load tools for the category
        supabase.from('tool_pages').select('id,name,tagline,slug,tags,rating,rating_count,users,badge,features,use_cases,description,long_description,category,pricing')
          .eq('category', rec.category).eq('status', 'published').order('name')
          .then(({ data: td }) => { setTools((td || []) as ToolOption[]); setLoading(false); });
      });
  }, [id, router]);

  const checkSlug = useCallback(async (slug: string, cat: string) => {
    if (!slug || !cat || !record) return;
    const [{ data: tc }, { data: tp }] = await Promise.all([
      supabase.from('tool_comparisons').select('id').eq('slug', slug).eq('category', cat).neq('id', record.id).maybeSingle(),
      supabase.from('tool_pages').select('id').eq('slug', slug).eq('category', cat).maybeSingle(),
    ]);
    if (tc) { setSlugError('Slug already used by another comparison.'); return; }
    if (tp) { setSlugError('Slug already used by a tool page.'); return; }
    setSlugError('');
  }, [record]);

  function patch(field: keyof ComparisonRecord, val: unknown) {
    setRecord(r => r ? { ...r, [field]: val } : r);
    setHasChanges(true);
  }

  const toolA = tools.find(t => t.id === record?.tool_ids?.[0]) || null;
  const toolB = tools.find(t => t.id === record?.tool_ids?.[1]) || null;

  const updateEntry = (side: 'a' | 'b', p: Partial<ToolEntry>) => {
    const field = `tool_${side}_entry` as 'tool_a_entry' | 'tool_b_entry';
    setRecord(r => r ? { ...r, [field]: { ...r[field], ...p } } : r);
    setHasChanges(true);
  };

  const updateEntryList = (side: 'a' | 'b', field: 'pros' | 'cons', idx: number, val: string) => {
    const key = `tool_${side}_entry` as 'tool_a_entry' | 'tool_b_entry';
    setRecord(r => {
      if (!r) return r;
      const e = { ...r[key] };
      const list = [...e[field]]; list[idx] = val; e[field] = list;
      return { ...r, [key]: e };
    });
    setHasChanges(true);
  };

  const addEntryListItem = (side: 'a' | 'b', field: 'pros' | 'cons') => {
    const key = `tool_${side}_entry` as 'tool_a_entry' | 'tool_b_entry';
    setRecord(r => { if (!r) return r; const e = { ...r[key] }; e[field] = [...(e[field] || []), '']; return { ...r, [key]: e }; });
    setHasChanges(true);
  };

  const removeEntryListItem = (side: 'a' | 'b', field: 'pros' | 'cons', idx: number) => {
    const key = `tool_${side}_entry` as 'tool_a_entry' | 'tool_b_entry';
    setRecord(r => { if (!r) return r; const e = { ...r[key] }; e[field] = e[field].filter((_, j) => j !== idx); return { ...r, [key]: e }; });
    setHasChanges(true);
  };

  const updateSection = (i: number, p: Partial<ComparisonSection>) => {
    setRecord(r => { if (!r) return r; const s = [...r.sections]; s[i] = { ...s[i], ...p }; return { ...r, sections: s }; });
    setHasChanges(true);
  };
  const removeSection = (i: number) => { setRecord(r => r ? { ...r, sections: r.sections.filter((_, j) => j !== i) } : r); setHasChanges(true); };
  const addSection = () => { setRecord(r => r ? { ...r, sections: [...r.sections, { title: '', dimension: '', tool_a_value: '', tool_b_value: '', winner_id: null, notes: '' }] } : r); setHasChanges(true); };

  const updateFeatureRow = (i: number, p: Partial<FeatureRow>) => {
    setRecord(r => { if (!r) return r; const f = [...r.feature_matrix]; f[i] = { ...f[i], ...p }; return { ...r, feature_matrix: f }; });
    setHasChanges(true);
  };
  const removeFeatureRow = (i: number) => { setRecord(r => r ? { ...r, feature_matrix: r.feature_matrix.filter((_, j) => j !== i) } : r); setHasChanges(true); };
  const addFeatureRow = () => { setRecord(r => r ? { ...r, feature_matrix: [...r.feature_matrix, { feature: '', tool_a: '', tool_b: '', winner_id: null }] } : r); setHasChanges(true); };

  const updateUseCase = (i: number, p: Partial<UseCaseWinner>) => {
    setRecord(r => { if (!r) return r; const u = [...r.use_case_winners]; u[i] = { ...u[i], ...p }; return { ...r, use_case_winners: u }; });
    setHasChanges(true);
  };
  const removeUseCase = (i: number) => { setRecord(r => r ? { ...r, use_case_winners: r.use_case_winners.filter((_, j) => j !== i) } : r); setHasChanges(true); };
  const addUseCase = () => { setRecord(r => r ? { ...r, use_case_winners: [...r.use_case_winners, { use_case: '', winner_id: '', reason: '' }] } : r); setHasChanges(true); };

  const updateFaq = (i: number, field: 'q' | 'a', val: string) => {
    setRecord(r => { if (!r) return r; const f = [...r.faqs]; f[i] = { ...f[i], [field]: val }; return { ...r, faqs: f }; });
    setHasChanges(true);
  };
  const removeFaq = (i: number) => { setRecord(r => r ? { ...r, faqs: r.faqs.filter((_, j) => j !== i) } : r); setHasChanges(true); };
  const addFaq = () => { setRecord(r => r ? { ...r, faqs: [...r.faqs, { q: '', a: '' }] } : r); setHasChanges(true); };

  const handleSave = async (newStatus?: 'draft' | 'published') => {
    if (!record) return;
    if (!record.slug) { setError('Slug is required.'); return; }
    if (!record.name) { setError('Name is required.'); return; }
    if (slugError) { setError('Fix slug conflict first.'); return; }
    setSaving(true); setError('');
    try {
      const updatePayload: Partial<ComparisonRecord> & { updated_at: string; published_at?: string | null } = {
        slug: record.slug, name: record.name, tagline: record.tagline,
        intro: record.intro, verdict: record.verdict, outro: record.outro,
        tool_a_entry: record.tool_a_entry, tool_b_entry: record.tool_b_entry,
        sections: record.sections, feature_matrix: record.feature_matrix,
        use_case_winners: record.use_case_winners,
        faqs: record.faqs.filter(f => f.q || f.a),
        meta_title: record.meta_title, meta_description: record.meta_description,
        focus_keyword: record.focus_keyword,
        status: newStatus || record.status,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'published' && !record.published_at) {
        updatePayload.published_at = new Date().toISOString();
      }
      const { error: dbErr } = await supabase.from('tool_comparisons').update(updatePayload).eq('id', record.id);
      if (dbErr) throw new Error(dbErr.message);
      setRecord(r => r ? { ...r, ...updatePayload } : r);
      setHasChanges(false);
      setSuccess(newStatus === 'published' ? 'Published!' : 'Saved!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) { setError(String(e)); }
    setSaving(false);
  };

  const handleRegenerate = async () => {
    if (!record || !toolA || !toolB) return;
    setRegenerating(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ tools: [toolA, toolB], category: record.category, mode: 'content' }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRecord(r => r ? {
        ...r,
        intro: json.intro || r.intro, verdict: json.verdict || r.verdict, outro: json.outro || r.outro,
        tool_a_entry: json.tool_a_entry || r.tool_a_entry,
        tool_b_entry: json.tool_b_entry || r.tool_b_entry,
        sections: json.sections?.length ? json.sections : r.sections,
        feature_matrix: json.feature_matrix?.length ? json.feature_matrix : r.feature_matrix,
        use_case_winners: json.use_case_winners?.length ? json.use_case_winners : r.use_case_winners,
        faqs: json.faqs?.length ? json.faqs : r.faqs,
        meta_title: json.meta_title || r.meta_title,
        meta_description: json.meta_description || r.meta_description,
        focus_keyword: json.focus_keyword || r.focus_keyword,
      } : r);
      setHasChanges(true);
    } catch (e) { setError(String(e)); }
    setRegenerating(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  }
  if (!record) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500">{error || 'Comparison not found.'}</p></div>;
  }

  const selectedTools = [toolA, toolB].filter(Boolean) as ToolOption[];
  const catLabel = CATEGORIES.find(c => c.value === record.category)?.label || record.category;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />Back
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                    <GitCompare className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold text-slate-900 truncate max-w-[220px]">{record.name || 'Edit Comparison'}</h1>
                    <p className="text-[10px] text-slate-400">Last saved {record.updated_at ? format(new Date(record.updated_at), 'MMM d, HH:mm') : '—'}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-medium">{catLabel}</Badge>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${record.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {record.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {record.status === 'published' && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                    onClick={() => window.open(`/compare/${record.category}/${record.slug}`, '_blank')}>
                    <Eye className="w-3 h-3" />View Live
                  </Button>
                )}
                {success && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{success}</span>}
                {record.status === 'draft' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" disabled={saving || !hasChanges}
                    onClick={() => handleSave('published')}>
                    <Globe className="w-3.5 h-3.5 mr-1.5" />Publish
                  </Button>
                )}
                {record.status === 'published' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" disabled={saving}
                    onClick={() => handleSave('draft')}>
                    Unpublish
                  </Button>
                )}
                <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-700 text-white"
                  disabled={saving || !hasChanges} onClick={() => handleSave()}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left panel */}
          <div className={`border-r border-slate-200 bg-white flex flex-col transition-all duration-300 ease-in-out shrink-0 ${leftCollapsed ? 'w-12' : 'w-[300px]'}`}>
            {leftCollapsed ? (
              <div className="flex flex-col items-center pt-4 gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setLeftCollapsed(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                      <PanelLeft className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Show details</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-sky-500" />
                    <h2 className="text-sm font-semibold text-slate-700">Comparison</h2>
                  </div>
                  <button onClick={() => setLeftCollapsed(true)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-5 flex-1">
                  {/* Tool A & B display */}
                  {[{ side: 'A', tool: toolA, color: 'bg-sky-600' }, { side: 'B', tool: toolB, color: 'bg-slate-700' }].map(({ side, tool, color }) => (
                    <div key={side}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-5 h-5 rounded-full ${color} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>{side}</span>
                        <p className="text-xs font-bold text-slate-900">{tool?.name || `Tool ${side}`}</p>
                      </div>
                      {tool && (
                        <div className="ml-7 text-[11px] text-slate-500 space-y-0.5">
                          <p className="truncate">{tool.tagline}</p>
                          <p className="text-slate-400">★ {tool.rating}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {toolA && toolB && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[10px] font-black text-slate-400">VS</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  )}

                  {/* Regenerate */}
                  {toolA && toolB && (
                    <Button className="w-full h-9 text-xs gap-1.5 bg-slate-900 hover:bg-slate-700 text-white"
                      disabled={regenerating} onClick={handleRegenerate}>
                      {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {regenerating ? 'Regenerating…' : 'Regenerate Content'}
                    </Button>
                  )}

                  {/* Meta */}
                  <div className="space-y-1.5 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <p>Created: {format(new Date(record.created_at), 'MMM d, yyyy')}</p>
                    {record.published_at && <p>Published: {format(new Date(record.published_at), 'MMM d, yyyy')}</p>}
                    <p className="font-mono text-[10px] text-slate-400 break-all">/compare/{record.category}/{record.slug}</p>
                  </div>

                  {/* Status toggle */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {record.status === 'draft' ? (
                      <Button className="w-full h-9 text-xs gap-1.5 bg-slate-900 hover:bg-slate-700 text-white"
                        disabled={saving || !record.slug} onClick={() => handleSave('published')}>
                        <Globe className="w-3.5 h-3.5" />Publish Page
                      </Button>
                    ) : (
                      <Button className="w-full h-9 text-xs gap-1.5" variant="outline"
                        disabled={saving} onClick={() => handleSave('draft')}>
                        Unpublish
                      </Button>
                    )}
                    <Button className="w-full h-9 text-xs gap-1.5" variant="outline"
                      disabled={saving || !hasChanges} onClick={() => handleSave()}>
                      <Save className="w-3.5 h-3.5" />Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex gap-1">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                    {tab.id === 'sections' && record.sections.length > 0 ? `Comparison (${record.sections.length})` : tab.label}
                  </button>
                ))}
              </div>
              {hasChanges && <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Unsaved changes</span>}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* CONTENT TAB */}
                {activeTab === 'content' && (
                  <>
                    <div className="lg:col-span-2 space-y-5">
                      <EeatPanel record={record} />

                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader icon={<Type className="w-3.5 h-3.5" />} label="Identity" />
                        <div className="space-y-2">
                          <EditableField label="Page Title" icon={<Type className="w-3 h-3" />} value={record.name}
                            onChange={v => patch('name', v)} charLimit={{ min: 10, max: 70 }} />
                          <EditableField label="Tagline" icon={<Zap className="w-3 h-3" />} value={record.tagline}
                            onChange={v => patch('tagline', v)} charLimit={{ min: 40, max: 120 }} />
                          <div className="rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 border-b border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <Link2 className="w-3 h-3 text-slate-400" />
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Slug</span>
                                {slugError && <span className="text-[10px] text-red-500 ml-1">{slugError}</span>}
                              </div>
                              <Pencil className="w-3 h-3 text-slate-300" />
                            </div>
                            <div className="px-3.5 py-2 flex items-center gap-1.5">
                              <span className="text-xs text-slate-400 shrink-0">/compare/{record.category}/</span>
                              <input type="text" value={record.slug}
                                onChange={e => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); patch('slug', v); if (v) checkSlug(v, record.category); }}
                                className={`w-full text-sm font-mono bg-transparent border-0 p-0 focus:outline-none focus:ring-0 ${slugError ? 'text-red-600' : 'text-slate-800'}`} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader icon={<AlignLeft className="w-3.5 h-3.5" />} label="Introduction" />
                        <textarea value={record.intro} onChange={e => patch('intro', e.target.value)} rows={5} placeholder="Opening paragraph…"
                          className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300" />
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader icon={<Trophy className="w-3.5 h-3.5" />} label="Verdict" />
                        <textarea value={record.verdict} onChange={e => patch('verdict', e.target.value)} rows={3} placeholder="Clear, evidence-based verdict…"
                          className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300" />
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader icon={<FileText className="w-3.5 h-3.5" />} label="Conclusion" />
                        <textarea value={record.outro} onChange={e => patch('outro', e.target.value)} rows={3} placeholder="Closing paragraph…"
                          className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300" />
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader icon={<MessageSquare className="w-3.5 h-3.5" />} label="FAQs" count={record.faqs.length}
                          action={<button onClick={addFaq} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add</button>} />
                        <div className="space-y-2">
                          {record.faqs.map((faq, i) => (
                            <div key={i} className="rounded-lg border border-slate-200 p-3.5 hover:border-slate-300 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex items-start gap-1.5">
                                    <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                                    <input type="text" value={faq.q} onChange={e => updateFaq(i, 'q', e.target.value)} placeholder="Question"
                                      className="w-full text-sm font-semibold text-slate-800 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                                  </div>
                                  <textarea value={faq.a} onChange={e => updateFaq(i, 'a', e.target.value)} placeholder="Answer" rows={2}
                                    className="w-full text-xs text-slate-500 leading-relaxed bg-transparent border-0 p-0 pl-[18px] focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300" />
                                </div>
                                <button onClick={() => removeFaq(i)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <SectionHeader icon={<Trophy className="w-3.5 h-3.5" />} label="Use-Case Winners" count={record.use_case_winners.length}
                          action={<button onClick={addUseCase} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add</button>} />
                        <div className="space-y-3">
                          {record.use_case_winners.map((uc, i) => (
                            <div key={i} className="space-y-1.5 p-2.5 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-1.5">
                                <input type="text" value={uc.use_case} onChange={e => updateUseCase(i, { use_case: e.target.value })} placeholder="Use case label"
                                  className="flex-1 text-xs font-semibold text-slate-800 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                                <button onClick={() => removeUseCase(i)} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                              </div>
                              <Select value={uc.winner_id} onValueChange={v => updateUseCase(i, { winner_id: v })}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Winner…" /></SelectTrigger>
                                <SelectContent>{selectedTools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                              </Select>
                              <input type="text" value={uc.reason} onChange={e => updateUseCase(i, { reason: e.target.value })} placeholder="One sentence why"
                                className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* TOOL ANALYSIS TAB */}
                {activeTab === 'analysis' && (
                  <div className="lg:col-span-3 space-y-5">
                    {(['a', 'b'] as const).map(side => {
                      const entry = record[`tool_${side}_entry`];
                      const tool = side === 'a' ? toolA : toolB;
                      const toolName = tool?.name || `Tool ${side.toUpperCase()}`;
                      const sideColor = side === 'a' ? 'bg-sky-600' : 'bg-slate-700';
                      return (
                        <div key={side} className="bg-white rounded-xl border border-slate-200 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <span className={`w-6 h-6 rounded-full ${sideColor} text-white text-[11px] font-bold flex items-center justify-center shrink-0`}>{side.toUpperCase()}</span>
                            <h3 className="text-sm font-bold text-slate-900">{toolName}</h3>
                            <div className="ml-auto flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">Score:</span>
                              <input type="number" min={0} max={100} value={entry.score} onChange={e => updateEntry(side, { score: parseInt(e.target.value) || 0 })}
                                className="w-12 text-sm font-bold text-slate-900 bg-transparent border border-slate-200 rounded px-1.5 py-0.5 text-center focus:outline-none focus:ring-0" />
                              <span className="text-[10px] text-slate-400">/100</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <EditableField label="Best For" icon={<Star className="w-3 h-3" />} value={entry.best_for} onChange={v => updateEntry(side, { best_for: v })} placeholder="e.g. Enterprise teams" />
                              <EditableField label="Pricing" icon={<DollarSign className="w-3 h-3" />} value={entry.pricing_summary} onChange={v => updateEntry(side, { pricing_summary: v })} placeholder="e.g. Free · Paid from $29/mo" />
                              <EditableField label="Verdict" icon={<FileText className="w-3 h-3" />} value={entry.verdict} onChange={v => updateEntry(side, { verdict: v })} placeholder="When to choose this" multiline />
                            </div>
                            <div className="rounded-lg border border-slate-200 p-3.5">
                              <div className="flex items-center gap-1.5 mb-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pros</span></div>
                              <div className="space-y-1.5">
                                {(entry.pros || []).map((pro, j) => (
                                  <div key={j} className="flex items-center gap-1.5">
                                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <input type="text" value={pro} onChange={e => updateEntryList(side, 'pros', j, e.target.value)} placeholder="Pro" className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                                    <button onClick={() => removeEntryListItem(side, 'pros', j)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => addEntryListItem(side, 'pros')} className="mt-2 text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add pro</button>
                            </div>
                            <div className="rounded-lg border border-slate-200 p-3.5">
                              <div className="flex items-center gap-1.5 mb-2"><AlertCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cons</span></div>
                              <div className="space-y-1.5">
                                {(entry.cons || []).map((con, j) => (
                                  <div key={j} className="flex items-center gap-1.5">
                                    <X className="w-3 h-3 text-red-400 shrink-0" />
                                    <input type="text" value={con} onChange={e => updateEntryList(side, 'cons', j, e.target.value)} placeholder="Con" className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                                    <button onClick={() => removeEntryListItem(side, 'cons', j)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => addEntryListItem(side, 'cons')} className="mt-2 text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add con</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* COMPARISON SECTIONS TAB */}
                {activeTab === 'sections' && (
                  <div className="lg:col-span-3 space-y-5">
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <SectionHeader icon={<GitCompare className="w-3.5 h-3.5" />} label="Comparison Sections" count={record.sections.length}
                        action={<button onClick={addSection} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add</button>} />
                      <div className="space-y-4">
                        {record.sections.map((sec, i) => (
                          <div key={i} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                              <input type="text" value={sec.title} onChange={e => updateSection(i, { title: e.target.value })} placeholder="Section title"
                                className="flex-1 text-sm font-bold text-slate-900 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                              <Select value={sec.winner_id || ''} onValueChange={v => updateSection(i, { winner_id: v || null })}>
                                <SelectTrigger className="h-7 text-[11px] w-32"><SelectValue placeholder="Winner…" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Tie</SelectItem>
                                  {selectedTools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <button onClick={() => removeSection(i)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-2">
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wide">{toolA?.name || 'Tool A'}</p>
                                <textarea value={sec.tool_a_value} onChange={e => updateSection(i, { tool_a_value: e.target.value })} rows={3} placeholder="Assessment…"
                                  className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{toolB?.name || 'Tool B'}</p>
                                <textarea value={sec.tool_b_value} onChange={e => updateSection(i, { tool_b_value: e.target.value })} rows={3} placeholder="Assessment…"
                                  className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300" />
                              </div>
                            </div>
                            <input type="text" value={sec.notes} onChange={e => updateSection(i, { notes: e.target.value })} placeholder="Summary note…"
                              className="w-full text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <SectionHeader icon={<FileText className="w-3.5 h-3.5" />} label="Feature Matrix" count={record.feature_matrix.length}
                        action={<button onClick={addFeatureRow} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add row</button>} />
                      {record.feature_matrix.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No features yet</p>
                      ) : (
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                          <div className="grid grid-cols-[1fr_1fr_1fr_80px_32px] bg-slate-50 border-b border-slate-200">
                            <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Feature</div>
                            <div className="px-3 py-2 text-[10px] font-semibold text-sky-600 uppercase tracking-wide">{toolA?.name || 'Tool A'}</div>
                            <div className="px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{toolB?.name || 'Tool B'}</div>
                            <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Winner</div>
                            <div />
                          </div>
                          {record.feature_matrix.map((row, i) => (
                            <div key={i} className={`grid grid-cols-[1fr_1fr_1fr_80px_32px] border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                              <input type="text" value={row.feature} onChange={e => updateFeatureRow(i, { feature: e.target.value })} placeholder="Feature"
                                className="px-3 py-2 text-xs font-medium text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                              <input type="text" value={row.tool_a} onChange={e => updateFeatureRow(i, { tool_a: e.target.value })} placeholder="Tool A"
                                className="px-3 py-2 text-xs text-slate-600 bg-transparent border-0 border-l border-slate-100 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                              <input type="text" value={row.tool_b} onChange={e => updateFeatureRow(i, { tool_b: e.target.value })} placeholder="Tool B"
                                className="px-3 py-2 text-xs text-slate-600 bg-transparent border-0 border-l border-slate-100 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                              <div className="px-2 py-1.5 border-l border-slate-100">
                                <Select value={row.winner_id || ''} onValueChange={v => updateFeatureRow(i, { winner_id: v || null })}>
                                  <SelectTrigger className="h-6 text-[10px] border-0 p-0 shadow-none"><SelectValue placeholder="—" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Tie</SelectItem>
                                    {selectedTools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center justify-center border-l border-slate-100">
                                <button onClick={() => removeFeatureRow(i)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SEO TAB */}
                {activeTab === 'seo' && (
                  <>
                    <div className="lg:col-span-2 space-y-4">
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader icon={<Search className="w-3.5 h-3.5" />} label="SEO Metadata" />
                        <div className="space-y-2">
                          <EditableField label="Meta Title" icon={<Search className="w-3 h-3" />} value={record.meta_title}
                            onChange={v => patch('meta_title', v)} charLimit={{ min: 50, max: 60 }} />
                          <EditableField label="Meta Description" icon={<AlignLeft className="w-3 h-3" />} value={record.meta_description}
                            onChange={v => patch('meta_description', v)} charLimit={{ min: 120, max: 160 }} multiline />
                          <EditableField label="Focus Keyword" icon={<Tag className="w-3 h-3" />} value={record.focus_keyword}
                            onChange={v => patch('focus_keyword', v)} />
                        </div>
                        {(record.name || record.meta_title) && (
                          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Search Preview</p>
                            <p className="text-xs text-emerald-700 truncate">yoursite.com/compare/{record.category}/{record.slug}</p>
                            <p className="text-sm text-blue-700 hover:underline cursor-pointer mt-0.5 truncate leading-snug">{record.meta_title || record.name}</p>
                            {record.meta_description && <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{record.meta_description}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Noindex</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={record.noindex} onChange={e => patch('noindex', e.target.checked)} className="rounded border-slate-300 accent-slate-900" />
                          <span className="text-xs text-slate-600">Hide from search engines</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="h-6" />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
