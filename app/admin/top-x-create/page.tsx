'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Zap,
  Trophy,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle2,
  Eye,
  Plus,
  X,
  GripVertical,
  Trash2,
  Type,
  AlignLeft,
  FileText,
  MessageSquare,
  Search,
  Link2,
  Tag,
  DollarSign,
  Pencil,
  Globe,
  Star,
  Users,
  PanelLeftClose,
  PanelLeft,
  Monitor,
  Shield,
  RefreshCw,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TopXPageView, type TopXPageData, type TopXTool } from '@/components/top-x-page-view';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'seo', label: 'SEO & Content' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'developer', label: 'Developer Tools' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'security', label: 'Security' },
  { value: 'design', label: 'Design' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

const BEST_FOR_SEGMENTS = [
  { segment: 'beginners', label: 'Best for Beginners' },
  { segment: 'free', label: 'Best Free Option' },
  { segment: 'advanced', label: 'Best for Power Users' },
];

const TABS = [
  { id: 'content', label: 'Content' },
  { id: 'entries', label: 'Tool Entries' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'seo', label: 'SEO & Meta' },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Types ─────────────────────────────────────────────────────────────────────

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
  pricing: { plan: string; price: string; features: string[]; highlighted?: boolean }[];
}

interface TopXEntry {
  tool_id: string;
  score: number;
  best_for: string;
  pros: string[];
  cons: string[];
  pricing_summary: string;
  verdict: string;
}

interface ComparisonRow {
  tool_id: string;
  tool_name: string;
  starting_price: string;
  free_plan: boolean;
  rating: number;
  best_for: string;
  key_feature: string;
}

interface BestForSegment {
  segment: string;
  label: string;
  tool_id: string;
  reason: string;
}

interface TopXDraft {
  slug: string;
  name: string;
  tagline: string;
  intro: string;
  outro: string;
  entries: TopXEntry[];
  comparison_table: ComparisonRow[];
  best_for: BestForSegment[];
  faqs: { q: string; a: string }[];
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
}

interface EeatResult {
  overall_score: number;
  experience_score: number;
  expertise_score: number;
  authoritativeness_score: number;
  trustworthiness_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_signals: string[];
  improvements: string[];
  analyzed_at: string;
}

const EMPTY_DRAFT: TopXDraft = {
  slug: '',
  name: '',
  tagline: '',
  intro: '',
  outro: '',
  entries: [],
  comparison_table: [],
  best_for: [],
  faqs: [{ q: '', a: '' }, { q: '', a: '' }, { q: '', a: '' }],
  meta_title: '',
  meta_description: '',
  focus_keyword: '',
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  count,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  action?: React.ReactNode;
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

function EditableField({
  label,
  icon,
  value,
  onChange,
  charLimit,
  multiline,
  placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  charLimit?: { min: number; max: number };
  multiline?: boolean;
  placeholder?: string;
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
          {charLimit && (
            <span className={`text-[10px] font-medium tabular-nums ${isOver ? 'text-red-500' : 'text-slate-400'}`}>
              {len}/{charLimit.max}
            </span>
          )}
          <Pencil className="w-3 h-3 text-slate-300" />
        </div>
      </div>
      <div className="px-3.5 py-2">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300"
          />
        )}
      </div>
    </div>
  );
}

function EmptyGenerateState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center bg-white rounded-xl border border-slate-200">
      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
        <Sparkles className="w-5 h-5 text-amber-400" />
      </div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="text-xs text-slate-300 mt-1">Click &ldquo;Generate Full Content&rdquo; to populate</p>
    </div>
  );
}

// ── E-E-A-T helpers ───────────────────────────────────────────────────────────

function eeatScoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.8) return 'text-emerald-600';
  if (pct >= 0.5) return 'text-amber-600';
  return 'text-red-600';
}

function eeatScoreBg(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.8) return 'border-emerald-400 bg-emerald-50';
  if (pct >= 0.5) return 'border-amber-400 bg-amber-50';
  return 'border-red-400 bg-red-50';
}

function eeatOverallLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600' };
  if (score >= 60) return { label: 'Good', color: 'text-emerald-500' };
  if (score >= 40) return { label: 'Fair', color: 'text-amber-600' };
  return { label: 'Needs Work', color: 'text-red-600' };
}

function MiniScoreRing({ score, max, label }: { score: number; max: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-10 rounded-full border-[3px] flex items-center justify-center ${eeatScoreBg(score, max)}`}>
        <span className={`text-xs font-bold ${eeatScoreColor(score, max)}`}>{score}</span>
      </div>
      <span className="text-[10px] font-medium text-slate-500 leading-tight text-center">{label}</span>
    </div>
  );
}

function EeatPanel({ draft }: { draft: TopXDraft }) {
  const [eeat, setEeat] = useState<EeatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function runEeat() {
    setLoading(true);
    setError('');
    try {
      const content = [
        `# ${draft.name}`,
        draft.tagline,
        draft.intro,
        ...(draft.entries || []).flatMap((e) => [e.verdict, ...e.pros, ...e.cons]),
        draft.outro,
        ...(draft.faqs || []).flatMap((f) => [`Q: ${f.q}`, `A: ${f.a}`]),
      ].filter(Boolean).join('\n');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-eeat`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: draft.name,
            content,
            meta_description: draft.meta_description,
            focus_keyword: draft.focus_keyword,
          }),
        }
      );
      if (res.status === 429) { setError('Rate limited. Please wait and try again.'); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Analysis failed'); }
      const data = await res.json();
      setEeat(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  }

  const overallInfo = eeat ? eeatOverallLabel(eeat.overall_score) : null;

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
              <div className={`w-9 h-9 rounded-full border-[3px] flex items-center justify-center ${eeatScoreBg(eeat.overall_score, 100)}`}>
                <span className={`text-sm font-bold ${eeatScoreColor(eeat.overall_score, 100)}`}>{eeat.overall_score}</span>
              </div>
              <span className={`text-xs font-semibold ${overallInfo?.color}`}>{overallInfo?.label}</span>
            </div>
          )}
          <button
            onClick={runEeat}
            disabled={loading || !draft.name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {eeat ? 'Refresh' : 'Analyze'}
          </button>
          {eeat && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {loading && !eeat && (
        <div className="px-4 py-6 text-center">
          <Loader2 className="w-5 h-5 text-teal-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Analyzing E-E-A-T signals…</p>
        </div>
      )}
      {error && (
        <div className="px-4 py-2.5 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>
        </div>
      )}
      {eeat && !loading && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center justify-around">
            <MiniScoreRing score={eeat.experience_score} max={25} label="Experience" />
            <MiniScoreRing score={eeat.expertise_score} max={25} label="Expertise" />
            <MiniScoreRing score={eeat.authoritativeness_score} max={25} label="Authority" />
            <MiniScoreRing score={eeat.trustworthiness_score} max={25} label="Trust" />
          </div>
        </div>
      )}
      {eeat && expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
          {eeat.strengths?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Strengths
              </h4>
              <ul className="space-y-1">
                {eeat.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-xs text-slate-600 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {eeat.improvements?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500" /> Improvements
              </h4>
              <ul className="space-y-1">
                {eeat.improvements.slice(0, 3).map((imp, i) => (
                  <li key={i} className="text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>{imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-slate-400 text-right pt-1">
            Analyzed {new Date(eeat.analyzed_at).toLocaleString()}
          </p>
        </div>
      )}
      {!eeat && !loading && !error && (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-slate-400">Click &ldquo;Analyze&rdquo; to check E-E-A-T signals.</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TopXCreatePage() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<TopXDraft>(EMPTY_DRAFT);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slugError, setSlugError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const selectedTools = selectedIds
    .map((id) => tools.find((t) => t.id === id))
    .filter(Boolean) as ToolOption[];

  useEffect(() => {
    if (!category) { setTools([]); setSelectedIds([]); return; }
    setLoadingTools(true);
    setSelectedIds([]);
    supabase
      .from('tool_pages')
      .select('id, name, tagline, slug, tags, rating, rating_count, users, badge, features, use_cases, description, long_description, category, pricing')
      .eq('category', category)
      .eq('status', 'published')
      .order('name')
      .then(({ data }) => {
        setTools((data || []) as ToolOption[]);
        setLoadingTools(false);
      });
  }, [category]);

  const toggleTool = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 10 ? [...prev, id] : prev
    );
  };

  const moveTool = (id: string, dir: 'up' | 'down') => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  // Universal slug uniqueness check — checks both tool_pages and top_x_pages
  const checkSlugAvailable = useCallback(async (slug: string, cat: string) => {
    if (!slug || !cat) return;
    const [{ data: tx }, { data: tp }] = await Promise.all([
      supabase.from('top_x_pages').select('id').eq('slug', slug).eq('category', cat).maybeSingle(),
      supabase.from('tool_pages').select('id').eq('slug', slug).eq('category', cat).maybeSingle(),
    ]);
    if (tx) { setSlugError('This slug already exists as a Top X page in this category.'); return; }
    if (tp) { setSlugError('This slug is already used by a tool page in this category.'); return; }
    setSlugError('');
  }, []);

  const handleGenerateSlug = async () => {
    if (selectedTools.length < 3) { setError('Select at least 3 tools first.'); return; }
    setError('');
    setGeneratingSlug(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-top-x`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ tools: selectedTools, category, mode: 'slug' }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDraft((d) => ({
        ...d,
        slug: json.slug || d.slug,
        name: json.name || d.name,
        tagline: json.tagline || d.tagline,
        focus_keyword: json.focus_keyword || d.focus_keyword,
      }));
      if (json.slug) checkSlugAvailable(json.slug, category);
    } catch (e) {
      setError(String(e));
    } finally {
      setGeneratingSlug(false);
    }
  };

  const handleGenerateContent = async () => {
    if (selectedTools.length < 3) { setError('Select at least 3 tools first.'); return; }
    setError('');
    setGeneratingContent(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-top-x`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ tools: selectedTools, category, mode: 'content' }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDraft({
        slug: json.slug || draft.slug,
        name: json.name || draft.name,
        tagline: json.tagline || draft.tagline,
        intro: json.intro || draft.intro,
        outro: json.outro || draft.outro,
        entries: json.entries?.length ? json.entries : draft.entries,
        comparison_table: json.comparison_table?.length ? json.comparison_table : draft.comparison_table,
        best_for: json.best_for_segments?.length ? json.best_for_segments : draft.best_for,
        faqs: json.faqs?.length ? json.faqs : draft.faqs,
        meta_title: json.meta_title || draft.meta_title,
        meta_description: json.meta_description || draft.meta_description,
        focus_keyword: json.focus_keyword || draft.focus_keyword,
      });
      if (json.slug) checkSlugAvailable(json.slug, category);
      setLeftCollapsed(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setGeneratingContent(false);
    }
  };

  const handlePublish = async (status: 'draft' | 'published') => {
    if (!draft.slug) { setError('Slug is required.'); return; }
    if (!draft.name) { setError('Name is required.'); return; }
    if (selectedIds.length < 3) { setError('Select at least 3 tools.'); return; }
    if (selectedIds.length > 10) { setError('Maximum 10 tools allowed.'); return; }
    if (slugError) { setError('Fix slug conflict before publishing.'); return; }
    setError('');
    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated.'); setPublishing(false); return; }
      const { error: dbErr } = await supabase.from('top_x_pages').insert({
        slug: draft.slug,
        name: draft.name,
        tagline: draft.tagline,
        category,
        tool_ids: selectedIds,
        intro: draft.intro,
        outro: draft.outro,
        entries: draft.entries,
        comparison_table: draft.comparison_table,
        best_for: draft.best_for,
        faqs: draft.faqs.filter((f) => f.q || f.a),
        meta_title: draft.meta_title,
        meta_description: draft.meta_description,
        focus_keyword: draft.focus_keyword,
        status,
        author_id: user.id,
        ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
      });
      if (dbErr) throw new Error(dbErr.message);
      setSuccess(status === 'published' ? 'Page published!' : 'Saved as draft.');
      setTimeout(() => router.push('/admin'), 1500);
    } catch (e) {
      setError(String(e));
    } finally {
      setPublishing(false);
    }
  };

  // ── Entry/Comparison helpers ───────────────────────────────────────────────

  const updateEntry = (i: number, patch: Partial<TopXEntry>) =>
    setDraft((d) => { const e = [...d.entries]; e[i] = { ...e[i], ...patch }; return { ...d, entries: e }; });

  const updateEntryList = (ei: number, field: 'pros' | 'cons', idx: number, val: string) =>
    setDraft((d) => { const e = [...d.entries]; const list = [...e[ei][field]]; list[idx] = val; e[ei] = { ...e[ei], [field]: list }; return { ...d, entries: e }; });

  const addEntryListItem = (ei: number, field: 'pros' | 'cons') =>
    setDraft((d) => { const e = [...d.entries]; e[ei] = { ...e[ei], [field]: [...(e[ei][field] || []), ''] }; return { ...d, entries: e }; });

  const removeEntryListItem = (ei: number, field: 'pros' | 'cons', idx: number) =>
    setDraft((d) => { const e = [...d.entries]; e[ei] = { ...e[ei], [field]: e[ei][field].filter((_, j) => j !== idx) }; return { ...d, entries: e }; });

  const updateComparison = (i: number, patch: Partial<ComparisonRow>) =>
    setDraft((d) => { const c = [...d.comparison_table]; c[i] = { ...c[i], ...patch }; return { ...d, comparison_table: c }; });

  const upsertBestFor = (seg: string, segLabel: string, patch: Partial<BestForSegment>) => {
    setDraft((d) => {
      const idx = d.best_for.findIndex((b) => b.segment === seg);
      if (idx >= 0) {
        const bf = [...d.best_for]; bf[idx] = { ...bf[idx], ...patch }; return { ...d, best_for: bf };
      }
      return { ...d, best_for: [...d.best_for, { segment: seg, label: segLabel, tool_id: '', reason: '', ...patch }] };
    });
  };

  const updateFaq = (i: number, field: 'q' | 'a', val: string) =>
    setDraft((d) => { const f = [...d.faqs]; f[i] = { ...f[i], [field]: val }; return { ...d, faqs: f }; });

  const removeFaq = (i: number) =>
    setDraft((d) => ({ ...d, faqs: d.faqs.filter((_, j) => j !== i) }));

  const addFaq = () =>
    setDraft((d) => ({ ...d, faqs: [...d.faqs, { q: '', a: '' }] }));

  // ── Preview data shape ────────────────────────────────────────────────────

  const previewPageData: TopXPageData = {
    id: 'preview',
    slug: draft.slug,
    name: draft.name || 'Top X Page Preview',
    tagline: draft.tagline,
    category,
    tool_ids: selectedIds,
    intro: draft.intro,
    outro: draft.outro,
    entries: draft.entries,
    comparison_table: draft.comparison_table,
    best_for: draft.best_for,
    faqs: draft.faqs.filter((f) => f.q || f.a),
    meta_title: draft.meta_title,
    meta_description: draft.meta_description,
    focus_keyword: draft.focus_keyword,
    noindex: false,
  };

  const previewTools: TopXTool[] = selectedTools.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    category: t.category,
    tags: t.tags,
    badge: t.badge,
    rating: t.rating,
    rating_count: t.rating_count,
    users: t.users,
    features: t.features,
    use_cases: t.use_cases,
    pricing: t.pricing,
  }));

  const catLabel = CATEGORIES.find((c) => c.value === category)?.label || '';
  const canGenerate = selectedIds.length >= 3 && selectedIds.length <= 10;
  const hasContent = draft.name || draft.intro;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h1 className="text-sm font-semibold text-slate-900">Create Top X Page</h1>
                  {category && (
                    <Badge variant="outline" className="text-[10px] font-medium">{catLabel}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {draft.slug && !slugError && (
                  <span className="hidden md:block text-[11px] text-slate-400 font-mono truncate max-w-[260px]">
                    /category/{category}/{draft.slug}
                  </span>
                )}
                {success ? (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => window.open(`/category/${category}/${draft.slug}`, '_blank')}
                  >
                    <Eye className="w-3 h-3 mr-1.5" />
                    View Live
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={publishing || !canGenerate || !draft.slug}
                      onClick={() => handlePublish('draft')}
                    >
                      Save Draft
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-slate-900 hover:bg-slate-700 text-white"
                      disabled={publishing || !canGenerate || !draft.slug || !!slugError}
                      onClick={() => handlePublish('published')}
                    >
                      {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Globe className="w-3.5 h-3.5 mr-1" />}
                      Publish
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Alerts */}
        {(error || success) && (
          <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left panel — tool selection */}
          <div className={`border-r border-slate-200 bg-white flex flex-col transition-all duration-300 ease-in-out shrink-0 ${leftCollapsed ? 'w-12' : 'w-[380px]'}`}>
            {leftCollapsed ? (
              <div className="flex flex-col items-center pt-4 gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setLeftCollapsed(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <PanelLeft className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Show tool selection</TooltipContent>
                </Tooltip>
                <div className="w-6 h-px bg-slate-200" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-slate-300" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{selectedIds.length} tools selected</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-slate-700">Tool Selection</h2>
                  </div>
                  {hasContent && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setLeftCollapsed(true)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <PanelLeftClose className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Collapse panel</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <div className="p-5 space-y-5 flex-1">
                  {/* Step 1: Category */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                      <p className="text-xs font-bold text-slate-900">Select Category</p>
                    </div>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Choose a category…" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 2: Tool selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                        <p className="text-xs font-bold text-slate-900">Select Tools</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        selectedIds.length < 3 ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : selectedIds.length > 10 ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>{selectedIds.length}/10</span>
                    </div>

                    {!category && <p className="text-xs text-slate-400 text-center py-4">Select a category first</p>}
                    {category && loadingTools && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
                    {category && !loadingTools && tools.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No published tools in this category yet.</p>}
                    {category && !loadingTools && tools.length > 0 && (
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {tools.map((tool) => {
                          const selected = selectedIds.includes(tool.id);
                          const atMax = selectedIds.length >= 10 && !selected;
                          return (
                            <button
                              key={tool.id}
                              onClick={() => !atMax && toggleTool(tool.id)}
                              disabled={atMax}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                                selected ? 'bg-slate-900 text-white'
                                : atMax ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${selected ? 'bg-white border-transparent' : 'border-slate-300'}`}>
                                {selected && <Check className="w-2.5 h-2.5 text-slate-900" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{tool.name}</p>
                                <p className={`text-[10px] truncate ${selected ? 'text-slate-300' : 'text-slate-400'}`}>{tool.tagline}</p>
                              </div>
                              <span className={`text-[10px] shrink-0 ${selected ? 'text-slate-300' : 'text-slate-400'}`}>★ {tool.rating}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {selectedIds.length > 0 && selectedIds.length < 3 && (
                      <p className="text-[10px] text-amber-600 mt-1.5">Select {3 - selectedIds.length} more tool{3 - selectedIds.length > 1 ? 's' : ''}</p>
                    )}
                  </div>

                  {/* Step 3: Order */}
                  {selectedIds.length >= 1 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                        <p className="text-xs font-bold text-slate-900">Ranking Order</p>
                      </div>
                      <div className="space-y-1">
                        {selectedIds.map((id, i) => {
                          const t = tools.find((x) => x.id === id);
                          if (!t) return null;
                          return (
                            <div key={id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                              <GripVertical className="w-3 h-3 text-slate-300 shrink-0" />
                              <span className="flex-1 text-xs font-medium text-slate-700 truncate">{t.name}</span>
                              <div className="flex items-center gap-0.5">
                                <button onClick={() => moveTool(id, 'up')} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"><ChevronUp className="w-3 h-3" /></button>
                                <button onClick={() => moveTool(id, 'down')} disabled={i === selectedIds.length - 1} className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors"><ChevronDown className="w-3 h-3" /></button>
                                <button onClick={() => toggleTool(id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 4: AI Generate */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                      <p className="text-xs font-bold text-slate-900">AI Generate</p>
                    </div>
                    <div className="space-y-2">
                      <Button className="w-full h-9 text-xs gap-1.5" variant="outline" disabled={!canGenerate || generatingSlug} onClick={handleGenerateSlug}>
                        {generatingSlug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        Generate Slug & Title
                      </Button>
                      <Button className="w-full h-9 text-xs gap-1.5 bg-slate-900 hover:bg-slate-700 text-white" disabled={!canGenerate || generatingContent} onClick={handleGenerateContent}>
                        {generatingContent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {generatingContent ? 'Generating…' : 'Generate Full Content'}
                      </Button>
                    </div>
                    {!canGenerate && (
                      <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                        {selectedIds.length < 3 ? 'Need at least 3 tools' : 'Maximum 10 tools'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel — editor / preview */}
          <div className={`flex flex-col overflow-hidden bg-slate-50 flex-1 transition-all duration-300 ease-in-out`}>

            {/* Sub-header: edit/preview toggle + tabs */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Monitor className="w-3 h-3" />
                  Preview
                </button>
              </div>

              {viewMode === 'edit' && (
                <div className="flex gap-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {tab.id === 'entries' && draft.entries.length > 0
                        ? `Tool Entries (${draft.entries.length})`
                        : tab.label}
                    </button>
                  ))}
                </div>
              )}

              {viewMode === 'edit' && hasContent && (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Draft ready
                </Badge>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── PREVIEW MODE ── */}
              {viewMode === 'preview' && (
                selectedIds.length < 3 || !draft.name ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                      <Monitor className="w-7 h-7 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-400 mb-2">Nothing to preview yet</h3>
                    <p className="text-sm text-slate-400">Select 3+ tools and generate content first.</p>
                  </div>
                ) : (
                  <TopXPageView
                    page={previewPageData}
                    tools={previewTools}
                    categoryLabel={catLabel}
                    siteUrl=""
                  />
                )
              )}

              {/* ── EDIT MODE ── */}
              {viewMode === 'edit' && (
                <div className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* ── CONTENT TAB ── */}
                    {activeTab === 'content' && (
                      <>
                        <div className="lg:col-span-2 space-y-5">
                          <EeatPanel draft={draft} />

                          {/* Identity */}
                          <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <SectionHeader icon={<Type className="w-3.5 h-3.5" />} label="Identity" />
                            <div className="space-y-2">
                              <EditableField label="Page Title" icon={<Type className="w-3 h-3" />} value={draft.name}
                                onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
                                placeholder="e.g. Best SEO Tools in 2026" charLimit={{ min: 10, max: 70 }} />
                              <EditableField label="Tagline" icon={<Zap className="w-3 h-3" />} value={draft.tagline}
                                onChange={(v) => setDraft((d) => ({ ...d, tagline: v }))}
                                placeholder="One sentence describing who this list helps" charLimit={{ min: 40, max: 120 }} />
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
                                  <span className="text-xs text-slate-400 shrink-0">/{category || '[category]'}/</span>
                                  <input
                                    type="text"
                                    value={draft.slug}
                                    onChange={(e) => {
                                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                      setDraft((d) => ({ ...d, slug: v }));
                                      if (v && category) checkSlugAvailable(v, category);
                                    }}
                                    placeholder="best-seo-tools"
                                    className={`w-full text-sm font-mono bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300 ${slugError ? 'text-red-600' : 'text-slate-800'}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Introduction */}
                          <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <SectionHeader icon={<AlignLeft className="w-3.5 h-3.5" />} label="Introduction" />
                            <textarea
                              value={draft.intro}
                              onChange={(e) => setDraft((d) => ({ ...d, intro: e.target.value }))}
                              placeholder="Opening paragraph. Introduce the topic, who it's for, and what readers will find…"
                              rows={5}
                              className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300"
                            />
                          </div>

                          {/* Conclusion */}
                          <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <SectionHeader icon={<FileText className="w-3.5 h-3.5" />} label="Conclusion" />
                            <textarea
                              value={draft.outro}
                              onChange={(e) => setDraft((d) => ({ ...d, outro: e.target.value }))}
                              placeholder="Closing paragraph with key takeaways and a call to action…"
                              rows={4}
                              className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300"
                            />
                          </div>

                          {/* FAQs */}
                          <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <SectionHeader
                              icon={<MessageSquare className="w-3.5 h-3.5" />}
                              label="FAQs"
                              count={draft.faqs.length}
                              action={<button onClick={addFaq} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add</button>}
                            />
                            <div className="space-y-2">
                              {draft.faqs.map((faq, i) => (
                                <div key={i} className="rounded-lg border border-slate-200 p-3.5 hover:border-slate-300 transition-colors">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                      <div className="flex items-start gap-1.5">
                                        <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                                        <input type="text" value={faq.q} onChange={(e) => updateFaq(i, 'q', e.target.value)} placeholder="Question"
                                          className="w-full text-sm font-semibold text-slate-800 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                                      </div>
                                      <textarea value={faq.a} onChange={(e) => updateFaq(i, 'a', e.target.value)} placeholder="Answer" rows={2}
                                        className="w-full text-xs text-slate-500 leading-relaxed bg-transparent border-0 p-0 pl-[18px] focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300" />
                                    </div>
                                    <button onClick={() => removeFaq(i)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Content sidebar */}
                        <div className="space-y-4">
                          {/* Best For segments */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Best For Segments</h3>
                            <div className="space-y-3">
                              {BEST_FOR_SEGMENTS.map((seg) => {
                                const bf = draft.best_for.find((b) => b.segment === seg.segment);
                                return (
                                  <div key={seg.segment} className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{seg.label}</p>
                                    <Select
                                      value={bf?.tool_id || ''}
                                      onValueChange={(v) => upsertBestFor(seg.segment, seg.label, { tool_id: v })}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select tool…" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {selectedTools.map((t) => (
                                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <input
                                      type="text"
                                      value={bf?.reason || ''}
                                      onChange={(e) => upsertBestFor(seg.segment, seg.label, { reason: e.target.value })}
                                      placeholder="One sentence why"
                                      className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Publish CTA */}
                          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                            <Button
                              className="w-full h-9 text-xs gap-1.5 bg-slate-900 hover:bg-slate-700 text-white"
                              disabled={publishing || !canGenerate || !draft.slug || !!slugError}
                              onClick={() => handlePublish('published')}
                            >
                              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                              Publish Page
                            </Button>
                            <Button
                              className="w-full h-9 text-xs gap-1.5"
                              variant="outline"
                              disabled={publishing || !canGenerate || !draft.slug}
                              onClick={() => handlePublish('draft')}
                            >
                              Save as Draft
                            </Button>
                            <p className="text-[10px] text-slate-400 text-center">Review all sections before publishing</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── TOOL ENTRIES TAB ── */}
                    {activeTab === 'entries' && (
                      <div className="lg:col-span-3 space-y-5">
                        {draft.entries.length === 0 ? (
                          <EmptyGenerateState label="No tool entries yet" />
                        ) : (
                          draft.entries.map((entry, i) => {
                            const tool = tools.find((t) => t.id === entry.tool_id) || selectedTools[i];
                            const toolName = tool?.name || `Tool ${i + 1}`;
                            return (
                              <div key={entry.tool_id || i} className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                  <h3 className="text-sm font-bold text-slate-900">{toolName}</h3>
                                  <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">Score:</span>
                                    <input
                                      type="number" min={0} max={100} value={entry.score}
                                      onChange={(e) => updateEntry(i, { score: parseInt(e.target.value) || 0 })}
                                      className="w-12 text-sm font-bold text-slate-900 bg-transparent border border-slate-200 rounded px-1.5 py-0.5 text-center focus:outline-none focus:ring-0"
                                    />
                                    <span className="text-[10px] text-slate-400">/100</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <EditableField label="Best For" icon={<Star className="w-3 h-3" />} value={entry.best_for}
                                      onChange={(v) => updateEntry(i, { best_for: v })} placeholder="e.g. Enterprise teams" />
                                    <EditableField label="Pricing" icon={<DollarSign className="w-3 h-3" />} value={entry.pricing_summary}
                                      onChange={(v) => updateEntry(i, { pricing_summary: v })} placeholder="e.g. Free · Paid from $29/mo" />
                                    <EditableField label="Verdict" icon={<FileText className="w-3 h-3" />} value={entry.verdict}
                                      onChange={(v) => updateEntry(i, { verdict: v })} placeholder="When to choose this tool" multiline />
                                  </div>
                                  <div className="rounded-lg border border-slate-200 p-3.5">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pros</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {(entry.pros || []).map((pro, j) => (
                                        <div key={j} className="flex items-center gap-1.5">
                                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                          <input type="text" value={pro} onChange={(e) => updateEntryList(i, 'pros', j, e.target.value)}
                                            placeholder="Pro" className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                                          <button onClick={() => removeEntryListItem(i, 'pros', j)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button onClick={() => addEntryListItem(i, 'pros')} className="mt-2 text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                                      <Plus className="w-3 h-3" /> Add pro
                                    </button>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 p-3.5">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cons</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {(entry.cons || []).map((con, j) => (
                                        <div key={j} className="flex items-center gap-1.5">
                                          <X className="w-3 h-3 text-red-400 shrink-0" />
                                          <input type="text" value={con} onChange={(e) => updateEntryList(i, 'cons', j, e.target.value)}
                                            placeholder="Con" className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                                          <button onClick={() => removeEntryListItem(i, 'cons', j)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button onClick={() => addEntryListItem(i, 'cons')} className="mt-2 text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                                      <Plus className="w-3 h-3" /> Add con
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* ── COMPARISON TAB ── */}
                    {activeTab === 'comparison' && (
                      <div className="lg:col-span-3 space-y-5">
                        {draft.comparison_table.length === 0 ? (
                          <EmptyGenerateState label="No comparison data yet" />
                        ) : (
                          draft.comparison_table.map((row, i) => {
                            const tool = tools.find((t) => t.id === row.tool_id) || selectedTools[i];
                            const toolName = tool?.name || row.tool_name || `Tool ${i + 1}`;
                            return (
                              <div key={row.tool_id || i} className="bg-white rounded-xl border border-slate-200 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                  <h3 className="text-sm font-bold text-slate-900">{toolName}</h3>
                                  <div className="ml-auto flex items-center gap-4">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input type="checkbox" checked={row.free_plan}
                                        onChange={(e) => updateComparison(i, { free_plan: e.target.checked })}
                                        className="w-3.5 h-3.5 rounded border-slate-300 accent-emerald-500" />
                                      <span className="text-xs text-slate-600">Free plan</span>
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      <Star className="w-3 h-3 text-amber-400" />
                                      <input type="number" step="0.1" min={0} max={5} value={row.rating}
                                        onChange={(e) => updateComparison(i, { rating: parseFloat(e.target.value) || 0 })}
                                        className="w-12 text-sm font-medium text-slate-900 bg-transparent border border-slate-200 rounded px-1.5 py-0.5 text-center focus:outline-none focus:ring-0" />
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <EditableField label="Starting Price" icon={<DollarSign className="w-3 h-3" />} value={row.starting_price}
                                    onChange={(v) => updateComparison(i, { starting_price: v })} placeholder="Free / $29/mo" />
                                  <EditableField label="Best For" icon={<Users className="w-3 h-3" />} value={row.best_for}
                                    onChange={(v) => updateComparison(i, { best_for: v })} placeholder="e.g. Small teams" />
                                  <EditableField label="Key Feature" icon={<Zap className="w-3 h-3" />} value={row.key_feature}
                                    onChange={(v) => updateComparison(i, { key_feature: v })} placeholder="Standout capability" />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* ── SEO TAB ── */}
                    {activeTab === 'seo' && (
                      <>
                        <div className="lg:col-span-2 space-y-4">
                          <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <SectionHeader icon={<Search className="w-3.5 h-3.5" />} label="SEO Metadata" />
                            <div className="space-y-2">
                              <EditableField label="Meta Title" icon={<Search className="w-3 h-3" />} value={draft.meta_title}
                                onChange={(v) => setDraft((d) => ({ ...d, meta_title: v }))}
                                placeholder="Best SEO Tools | Top 5 Compared (2026)" charLimit={{ min: 50, max: 60 }} />
                              <EditableField label="Meta Description" icon={<AlignLeft className="w-3 h-3" />} value={draft.meta_description}
                                onChange={(v) => setDraft((d) => ({ ...d, meta_description: v }))}
                                placeholder="Discover the best tools compared side-by-side…" charLimit={{ min: 120, max: 160 }} multiline />
                              <EditableField label="Focus Keyword" icon={<Tag className="w-3 h-3" />} value={draft.focus_keyword}
                                onChange={(v) => setDraft((d) => ({ ...d, focus_keyword: v }))} placeholder="best seo tools" />
                            </div>
                            {(draft.name || draft.meta_title) && (
                              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Search Preview</p>
                                <p className="text-xs text-emerald-700 truncate">yoursite.com/category/{category || '[category]'}/{draft.slug || '[slug]'}</p>
                                <p className="text-sm text-blue-700 hover:underline cursor-pointer mt-0.5 truncate leading-snug">{draft.meta_title || draft.name}</p>
                                {draft.meta_description && <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{draft.meta_description}</p>}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Publish</h3>
                            <Button className="w-full h-9 text-xs gap-1.5 bg-slate-900 hover:bg-slate-700 text-white"
                              disabled={publishing || !canGenerate || !draft.slug || !!slugError}
                              onClick={() => handlePublish('published')}>
                              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                              Publish Page
                            </Button>
                            <Button className="w-full h-9 text-xs gap-1.5" variant="outline"
                              disabled={publishing || !canGenerate || !draft.slug}
                              onClick={() => handlePublish('draft')}>
                              Save as Draft
                            </Button>
                          </div>
                          {draft.slug && category && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                              <p className="text-xs font-semibold text-amber-800 mb-1">Page URL</p>
                              <p className="text-[10px] text-amber-600 font-mono break-all">/category/{category}/{draft.slug}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                  </div>
                  <div className="h-6" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
