'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { TopXPageView, type TopXPageData, type TopXTool } from '@/components/top-x-page-view';
import {
  ArrowLeft,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle2,
  FileText,
  AlignLeft,
  Tag,
  Search,
  Link2,
  Type,
  Zap,
  MessageSquare,
  Globe,
  Trash2,
  Plus,
  GripVertical,
  Pencil,
  Eye,
  Check,
  DollarSign,
  Star,
  Users,
  Save,
  Monitor,
  Trophy,
  ChevronUp,
  ChevronDown,
  X,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface TopXPageRecord {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  tool_ids: string[];
  intro: string;
  outro: string;
  entries: TopXEntry[];
  comparison_table: ComparisonRow[];
  best_for: BestForSegment[];
  faqs: { q: string; a: string }[];
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  status: string;
  noindex: boolean;
  published_at: string | null;
  updated_at: string;
}

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

interface EeatResult {
  overall_score: number;
  experience_score: number;
  expertise_score: number;
  authoritativeness_score: number;
  trustworthiness_score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  analyzed_at: string;
}

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

// ── Shared UI ─────────────────────────────────────────────────────────────────

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

function EeatPanel({ page }: { page: TopXPageRecord }) {
  const [eeat, setEeat] = useState<EeatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function runEeat() {
    setLoading(true);
    setError('');
    try {
      const content = [
        `# ${page.name}`,
        page.tagline,
        page.intro,
        ...(page.entries || []).flatMap((e) => [e.verdict, ...e.pros, ...e.cons]),
        page.outro,
        ...(page.faqs || []).flatMap((f) => [`Q: ${f.q}`, `A: ${f.a}`]),
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
            title: page.name,
            content,
            meta_description: page.meta_description,
            focus_keyword: page.focus_keyword,
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
            disabled={loading || !page.name}
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

export default function EditTopXPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [page, setPage] = useState<TopXPageRecord | null>(null);
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [slugError, setSlugError] = useState('');

  const loadPage = useCallback(async () => {
    const { data, error } = await supabase
      .from('top_x_pages')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      router.push('/admin');
      return;
    }

    const record = data as TopXPageRecord;
    setPage(record);

    // Load tools from this category
    if (record.category) {
      const { data: toolData } = await supabase
        .from('tool_pages')
        .select('id, name, tagline, slug, tags, rating, rating_count, users, badge, features, use_cases, description, long_description, category, pricing')
        .eq('category', record.category)
        .order('name');
      setTools((toolData || []) as ToolOption[]);
    }

    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/admin/login');
        return;
      }
      loadPage();
    });
  }, [router, loadPage]);

  function update(patch: Partial<TopXPageRecord>) {
    if (!page) return;
    setPage({ ...page, ...patch });
    setHasChanges(true);
    setSaveSuccess('');
  }

  // ── Slug check ───────────────────────────────────────────────────────────

  const checkSlugAvailable = useCallback(async (slug: string, cat: string, currentId: string) => {
    if (!slug || !cat) return;
    const [{ data: tx }, { data: tp }] = await Promise.all([
      supabase.from('top_x_pages').select('id').eq('slug', slug).eq('category', cat).neq('id', currentId).maybeSingle(),
      supabase.from('tool_pages').select('id').eq('slug', slug).eq('category', cat).maybeSingle(),
    ]);
    if (tx) { setSlugError('This slug already exists as another Top X page.'); return; }
    if (tp) { setSlugError('This slug is used by a tool page in this category.'); return; }
    setSlugError('');
  }, []);

  // ── Entry helpers ─────────────────────────────────────────────────────────

  const updateEntry = (i: number, patch: Partial<TopXEntry>) => {
    if (!page) return;
    const entries = [...page.entries];
    entries[i] = { ...entries[i], ...patch };
    update({ entries });
  };

  const updateEntryList = (ei: number, field: 'pros' | 'cons', idx: number, val: string) => {
    if (!page) return;
    const entries = [...page.entries];
    const list = [...entries[ei][field]];
    list[idx] = val;
    entries[ei] = { ...entries[ei], [field]: list };
    update({ entries });
  };

  const addEntryListItem = (ei: number, field: 'pros' | 'cons') => {
    if (!page) return;
    const entries = [...page.entries];
    entries[ei] = { ...entries[ei], [field]: [...(entries[ei][field] || []), ''] };
    update({ entries });
  };

  const removeEntryListItem = (ei: number, field: 'pros' | 'cons', idx: number) => {
    if (!page) return;
    const entries = [...page.entries];
    entries[ei] = { ...entries[ei], [field]: entries[ei][field].filter((_, j) => j !== idx) };
    update({ entries });
  };

  // ── Comparison helpers ───────────────────────────────────────────────────

  const updateComparison = (i: number, patch: Partial<ComparisonRow>) => {
    if (!page) return;
    const comparison_table = [...page.comparison_table];
    comparison_table[i] = { ...comparison_table[i], ...patch };
    update({ comparison_table });
  };

  // ── Best for helpers ──────────────────────────────────────────────────────

  const upsertBestFor = (seg: string, segLabel: string, patch: Partial<BestForSegment>) => {
    if (!page) return;
    const idx = page.best_for.findIndex((b) => b.segment === seg);
    if (idx >= 0) {
      const bf = [...page.best_for];
      bf[idx] = { ...bf[idx], ...patch };
      update({ best_for: bf });
    } else {
      update({ best_for: [...page.best_for, { segment: seg, label: segLabel, tool_id: '', reason: '', ...patch }] });
    }
  };

  // ── FAQ helpers ───────────────────────────────────────────────────────────

  const updateFaq = (i: number, field: 'q' | 'a', val: string) => {
    if (!page) return;
    const faqs = [...page.faqs];
    faqs[i] = { ...faqs[i], [field]: val };
    update({ faqs });
  };

  const removeFaq = (i: number) => {
    if (!page) return;
    update({ faqs: page.faqs.filter((_, j) => j !== i) });
  };

  const addFaq = () => {
    if (!page) return;
    update({ faqs: [...page.faqs, { q: '', a: '' }] });
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(newStatus?: string) {
    if (!page) return;
    if (slugError) { setSaveError('Fix slug conflict before saving.'); return; }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const slug = page.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 80);
    const status = newStatus || page.status;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('top_x_pages')
      .update({
        slug,
        name: page.name,
        tagline: page.tagline,
        category: page.category,
        intro: page.intro,
        outro: page.outro,
        entries: page.entries,
        comparison_table: page.comparison_table,
        best_for: page.best_for,
        faqs: page.faqs.filter((f) => f.q || f.a),
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        focus_keyword: page.focus_keyword,
        status,
        noindex: page.noindex,
        updated_at: now,
        ...(status === 'published' && !page.published_at ? { published_at: now } : {}),
      })
      .eq('id', page.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    setPage({ ...page, slug, status, updated_at: now });
    setHasChanges(false);
    setSaveSuccess(newStatus === 'published' ? 'Published successfully!' : 'Changes saved.');
  }

  // ── Preview data ──────────────────────────────────────────────────────────

  const selectedTools: TopXTool[] = page
    ? (page.tool_ids || [])
        .map((tid) => {
          const t = tools.find((x) => x.id === tid);
          return t
            ? {
                id: t.id, slug: t.slug, name: t.name, tagline: t.tagline, description: t.description,
                category: t.category, tags: t.tags, badge: t.badge, rating: t.rating,
                rating_count: t.rating_count, users: t.users, features: t.features,
                use_cases: t.use_cases, pricing: t.pricing,
              }
            : null;
        })
        .filter(Boolean) as TopXTool[]
    : [];

  const previewPageData: TopXPageData | null = page
    ? {
        id: page.id,
        slug: page.slug,
        name: page.name,
        tagline: page.tagline,
        category: page.category,
        tool_ids: page.tool_ids,
        intro: page.intro,
        outro: page.outro,
        entries: page.entries,
        comparison_table: page.comparison_table,
        best_for: page.best_for,
        faqs: page.faqs.filter((f) => f.q || f.a),
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        focus_keyword: page.focus_keyword,
        noindex: page.noindex,
      }
    : null;

  const catLabel = CATEGORIES.find((c) => c.value === page?.category)?.label || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!page) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate max-w-[260px]">{page.name || 'Untitled'}</p>
                    <p className="text-[11px] text-slate-400">/category/{page.category}/{page.slug}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`hidden sm:inline-flex text-[10px] font-semibold ${
                      page.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {page.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit/Preview toggle */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Monitor className="w-3 h-3" /> Preview
                  </button>
                </div>

                {page.status === 'published' && (
                  <Button variant="outline" size="sm" className="h-8 text-xs"
                    onClick={() => window.open(`/category/${page.category}/${page.slug}`, '_blank')}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> View Live
                  </Button>
                )}

                {page.status === 'draft' && (
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleSave('published')} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 mr-1.5" />}
                    Publish
                  </Button>
                )}

                <Button
                  size="sm"
                  className={`h-8 text-xs ${hasChanges ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 cursor-default'}`}
                  onClick={() => handleSave()} disabled={saving || !hasChanges}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Save feedback */}
        {(saveError || saveSuccess) && (
          <div className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 ${
            saveError ? 'bg-red-50 text-red-700 border-b border-red-100' : 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'
          }`}>
            {saveError ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {saveError || saveSuccess}
          </div>
        )}

        {/* Tab bar (edit mode only) */}
        {viewMode === 'edit' && (
          <div className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto flex gap-1 py-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.id === 'entries' && page.entries?.length > 0 ? `Tool Entries (${page.entries.length})` : tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

          {/* ── PREVIEW MODE ── */}
          {viewMode === 'preview' && previewPageData && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <TopXPageView page={previewPageData} tools={selectedTools} categoryLabel={catLabel} siteUrl="" />
            </div>
          )}

          {/* ── EDIT MODE ── */}
          {viewMode === 'edit' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ── CONTENT TAB ── */}
              {activeTab === 'content' && (
                <>
                  <div className="lg:col-span-2 space-y-5">
                    <EeatPanel page={page} />

                    {/* Identity */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <SectionHeader icon={<Type className="w-3.5 h-3.5" />} label="Identity" />
                      <div className="space-y-2">
                        <EditableField label="Page Title" icon={<Type className="w-3 h-3" />} value={page.name}
                          onChange={(v) => update({ name: v })}
                          placeholder="e.g. Best SEO Tools in 2026" charLimit={{ min: 10, max: 70 }} />
                        <EditableField label="Tagline" icon={<Zap className="w-3 h-3" />} value={page.tagline}
                          onChange={(v) => update({ tagline: v })}
                          placeholder="One sentence describing who this list helps" charLimit={{ min: 40, max: 120 }} />
                        {/* Slug */}
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
                            <span className="text-xs text-slate-400 shrink-0">/{page.category}/</span>
                            <input
                              type="text"
                              value={page.slug}
                              onChange={(e) => {
                                const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                update({ slug: v });
                                if (v && page.category) checkSlugAvailable(v, page.category, page.id);
                              }}
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
                        value={page.intro}
                        onChange={(e) => update({ intro: e.target.value })}
                        placeholder="Opening paragraph…"
                        rows={5}
                        className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300"
                      />
                    </div>

                    {/* Conclusion */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <SectionHeader icon={<FileText className="w-3.5 h-3.5" />} label="Conclusion" />
                      <textarea
                        value={page.outro}
                        onChange={(e) => update({ outro: e.target.value })}
                        placeholder="Closing paragraph with key takeaways…"
                        rows={4}
                        className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300"
                      />
                    </div>

                    {/* FAQs */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <SectionHeader
                        icon={<MessageSquare className="w-3.5 h-3.5" />}
                        label="FAQs"
                        count={page.faqs?.length}
                        action={<button onClick={addFaq} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add</button>}
                      />
                      <div className="space-y-2">
                        {page.faqs?.map((faq, i) => (
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
                    {/* Status */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status</h3>
                      <div className="space-y-2">
                        <Select value={page.status} onValueChange={(v) => update({ status: v })}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                        {page.published_at && (
                          <p className="text-[11px] text-slate-400">Published {format(new Date(page.published_at), 'MMM d, yyyy')}</p>
                        )}
                        <p className="text-[11px] text-slate-400">Updated {format(new Date(page.updated_at), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                    </div>

                    {/* Best For segments */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Best For Segments</h3>
                      <div className="space-y-3">
                        {BEST_FOR_SEGMENTS.map((seg) => {
                          const bf = page.best_for?.find((b) => b.segment === seg.segment);
                          return (
                            <div key={seg.segment} className="space-y-1.5">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{seg.label}</p>
                              <Select
                                value={bf?.tool_id || ''}
                                onValueChange={(v) => upsertBestFor(seg.segment, seg.label, { tool_id: v })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select tool…" /></SelectTrigger>
                                <SelectContent>
                                  {(page.tool_ids || []).map((tid) => {
                                    const t = tools.find((x) => x.id === tid);
                                    return t ? <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem> : null;
                                  })}
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

                    {/* Save CTA */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm"
                        onClick={() => handleSave()} disabled={saving || !hasChanges}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {hasChanges ? 'Save Changes' : 'No Changes'}
                      </Button>
                      {page.status === 'draft' && (
                        <Button variant="outline" className="w-full text-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleSave('published')} disabled={saving}>
                          <Globe className="w-4 h-4 mr-2" /> Save & Publish
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── TOOL ENTRIES TAB ── */}
              {activeTab === 'entries' && (
                <div className="lg:col-span-3 space-y-5">
                  {(!page.entries || page.entries.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center bg-white rounded-xl border border-slate-200">
                      <p className="text-sm font-medium text-slate-400">No tool entries</p>
                      <p className="text-xs text-slate-300 mt-1">Tool entries are generated during page creation</p>
                    </div>
                  ) : (
                    page.entries.map((entry, i) => {
                      const tool = tools.find((t) => t.id === entry.tool_id);
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
                                onChange={(v) => updateEntry(i, { pricing_summary: v })} placeholder="e.g. Free · $29/mo" />
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
                  {(!page.comparison_table || page.comparison_table.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center bg-white rounded-xl border border-slate-200">
                      <p className="text-sm font-medium text-slate-400">No comparison data</p>
                      <p className="text-xs text-slate-300 mt-1">Comparison data is generated during page creation</p>
                    </div>
                  ) : (
                    page.comparison_table.map((row, i) => {
                      const tool = tools.find((t) => t.id === row.tool_id);
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
                        <EditableField label="Meta Title" icon={<Search className="w-3 h-3" />} value={page.meta_title || ''}
                          onChange={(v) => update({ meta_title: v })}
                          placeholder="Best SEO Tools | Top 5 Compared (2026)" charLimit={{ min: 50, max: 60 }} />
                        <EditableField label="Meta Description" icon={<AlignLeft className="w-3 h-3" />} value={page.meta_description || ''}
                          onChange={(v) => update({ meta_description: v })}
                          placeholder="Discover the best tools compared side-by-side…" charLimit={{ min: 120, max: 160 }} multiline />
                        <EditableField label="Focus Keyword" icon={<Tag className="w-3 h-3" />} value={page.focus_keyword || ''}
                          onChange={(v) => update({ focus_keyword: v })} placeholder="best seo tools" />
                      </div>
                      {(page.name || page.meta_title) && (
                        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Search Preview</p>
                          <p className="text-xs text-emerald-700 truncate">yoursite.com/category/{page.category}/{page.slug}</p>
                          <p className="text-sm text-blue-700 hover:underline cursor-pointer mt-0.5 truncate leading-snug">{page.meta_title || page.name}</p>
                          {page.meta_description && <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{page.meta_description}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Classification</h3>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
                        <Select value={page.category} onValueChange={(v) => update({ category: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm"
                        onClick={() => handleSave()} disabled={saving || !hasChanges}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {hasChanges ? 'Save Changes' : 'No Changes'}
                      </Button>
                      {page.status === 'draft' && (
                        <Button variant="outline" className="w-full text-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleSave('published')} disabled={saving}>
                          <Globe className="w-4 h-4 mr-2" /> Save & Publish
                        </Button>
                      )}
                    </div>
                    {page.slug && page.category && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-amber-800 mb-1">Page URL</p>
                        <p className="text-[10px] text-amber-600 font-mono break-all">/category/{page.category}/{page.slug}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
