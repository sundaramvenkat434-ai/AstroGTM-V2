'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToolPagePreview } from '@/components/tool-page-preview';
import {
  ArrowLeft,
  Sparkles,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle2,
  Clock,
  Copy,
  Check,
  FileText,
  AlignLeft,
  ArrowRight,
  RotateCcw,
  Tag,
  Search,
  Link2,
  Type,
  Braces,
  PanelLeftClose,
  PanelLeft,
  Star,
  Users,
  DollarSign,
  CircleHelp as HelpCircle,
  ChartBar as BarChart3,
  Layers,
  Zap,
  Target,
  MessageSquare,
  Globe,
  Trash2,
  Plus,
  GripVertical,
  Pencil,
  Eye,
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Circle as XCircle,
  CircleArrowUp as ArrowUpCircle,
  WrapText,
  Monitor,
  Lock,
  GitCompare,
  Trophy,
  FlaskConical,
} from 'lucide-react';

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  preview: string;
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'tool-listing',
    name: 'Tool Listing',
    description: 'A comprehensive tool page with hero, features, pricing tiers, FAQs, stats, and SEO metadata. Perfect for showcasing individual tools or products.',
    icon: <Zap className="w-5 h-5" />,
    available: true,
    preview: 'Hero section with ratings, feature cards, pricing comparison, FAQ accordion, stats grid, use cases, and full SEO metadata.',
  },
  {
    id: 'tool-listing-v2',
    name: 'Tool Page 2.0',
    description: 'Same schema as Tool Listing but uses the experimental V2 AI prompt — great for A/B testing content quality and tone.',
    icon: <Sparkles className="w-5 h-5" />,
    available: true,
    preview: 'Identical output structure to Tool Listing. Driven by the editable V2 prompt in Admin → Prompts.',
  },
  {
    id: 'tool-comparison',
    name: 'Tool Comparison',
    description: 'Side-by-side comparison of multiple tools with feature matrices, pricing tables, and verdict sections.',
    icon: <GitCompare className="w-5 h-5" />,
    available: false,
    preview: 'Comparison table, feature-by-feature breakdown, pricing side-by-side, pros/cons for each tool, and a final recommendation.',
  },
  {
    id: 'top-x-tools',
    name: 'Top X Tools',
    description: 'Ranked listicle format showcasing the best tools in a category with mini-reviews, scores, and a comparison table.',
    icon: <Trophy className="w-5 h-5" />,
    available: true,
    preview: 'Ranked list with scores, pros/cons, comparison table, best-for segments, FAQ, and full SEO metadata.',
  },
];

interface StructuredResult {
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  category: string;
  tags: string[];
  badge: string | null;
  rating: number;
  ratingCount: string;
  users: string;
  features: { title: string; description: string }[];
  useCases: string[];
  pricing: { plan: string; price: string; features: string[]; highlighted?: boolean }[];
  faqs: { q: string; a: string }[];
  stats: { label: string; value: string }[];
  meta_title: string;
  meta_description: string;
  slug: string;
  focus_keyword: string;
  pros: string[];
  cons: string[];
  what_we_learned: { use_case: string; bullets: string[] } | null;
  honest_take: string[];
}

const FALLBACK_CATEGORIES = [
  { value: 'seo', label: 'SEO & Content' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'developer', label: 'Developer' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'security', label: 'Security' },
  { value: 'design', label: 'Design' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const BADGES = [
  { value: '_none', label: 'None' },
  { value: 'new', label: 'New' },
  { value: 'popular', label: 'Popular' },
  { value: 'free', label: 'Free' },
];

const PROGRESS_STEPS = [
  { label: 'Reading input...', pct: 10 },
  { label: 'Analyzing content structure...', pct: 25 },
  { label: 'Generating tool profile...', pct: 40 },
  { label: 'Writing features & descriptions...', pct: 55 },
  { label: 'Building pricing tiers...', pct: 70 },
  { label: 'Composing FAQs & stats...', pct: 82 },
  { label: 'Optimizing SEO metadata...', pct: 92 },
  { label: 'Finalizing output...', pct: 98 },
];

function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

function formatRawText(text: string): string {
  let out = text;

  // Strip HTML tags but keep their text content
  out = out.replace(/<br\s*\/?>/gi, '\n');
  out = out.replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n');
  out = out.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  out = out.replace(/&nbsp;/gi, ' ');
  out = out.replace(/&amp;/gi, '&');
  out = out.replace(/&lt;/gi, '<');
  out = out.replace(/&gt;/gi, '>');
  out = out.replace(/&quot;/gi, '"');
  out = out.replace(/&#39;/g, "'");

  // Normalize unicode whitespace (zero-width, non-breaking, etc.)
  out = out.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  out = out.replace(/\u00A0/g, ' ');

  // Collapse multiple spaces/tabs on each line into single space
  out = out.replace(/[^\S\n]+/g, ' ');

  // Trim each line
  out = out
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // Collapse 3+ blank lines into 2 (one empty line between paragraphs)
  out = out.replace(/\n{3,}/g, '\n\n');

  // Remove duplicate consecutive lines
  const lines = out.split('\n');
  const deduped: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (i > 0 && trimmed === lines[i - 1].trim() && trimmed !== '') continue;
    deduped.push(lines[i]);
  }
  out = deduped.join('\n');

  // Strip leading/trailing whitespace
  out = out.trim();

  return out;
}

function SectionHeader({ icon, label, count, action }: { icon: React.ReactNode; label: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-slate-400">{icon}</span>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</h3>
      {count !== undefined && (
        <span className="text-[11px] text-slate-400 tabular-nums">({count})</span>
      )}
      <div className="h-px flex-1 bg-slate-100" />
      {action}
    </div>
  );
}

function EditableField({ label, icon, value, onChange, charLimit, multiline }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  charLimit?: { min: number; max: number };
  multiline?: boolean;
}) {
  const len = value.length;
  const isOver = charLimit && len > charLimit.max;
  const isUnder = charLimit && len < charLimit.min;

  return (
    <div className="rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">{icon}</span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {charLimit && (
            <span className={`text-[10px] font-medium tabular-nums ${isOver ? 'text-red-500' : isUnder ? 'text-amber-500' : 'text-slate-400'}`}>
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
            className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
          />
        )}
      </div>
    </div>
  );
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

function EeatScorePanel({
  result,
  onRefresh,
}: {
  result: StructuredResult;
  onRefresh: () => void;
}) {
  const [eeat, setEeat] = useState<EeatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  function buildContentString(r: StructuredResult): string {
    const parts: string[] = [];
    parts.push(`# ${r.name}`);
    parts.push(r.tagline);
    parts.push(r.description);
    parts.push(r.longDescription);
    r.features?.forEach((f) => {
      parts.push(`## ${f.title}`);
      parts.push(f.description);
    });
    r.useCases?.forEach((uc) => parts.push(`- ${uc}`));
    r.pricing?.forEach((tier) => {
      parts.push(`### ${tier.plan} - ${tier.price}`);
      tier.features?.forEach((pf) => parts.push(`- ${pf}`));
    });
    r.faqs?.forEach((faq) => {
      parts.push(`Q: ${faq.q}`);
      parts.push(`A: ${faq.a}`);
    });
    r.stats?.forEach((stat) => parts.push(`${stat.label}: ${stat.value}`));
    return parts.join('\n');
  }

  async function runEeat() {
    setLoading(true);
    setError('');

    try {
      const content = buildContentString(result);
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-eeat`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: result.name,
          content,
          meta_description: result.meta_description,
          focus_keyword: result.focus_keyword,
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(`Rate limited. Retry in ~${data.retry_after ?? 60}s`);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await res.json();
      setEeat({
        overall_score: data.overall_score,
        experience_score: data.experience_score,
        expertise_score: data.expertise_score,
        authoritativeness_score: data.authoritativeness_score,
        trustworthiness_score: data.trustworthiness_score,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        missing_signals: data.missing_signals || [],
        improvements: data.improvements || [],
        analyzed_at: data.analyzed_at || new Date().toISOString(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  }

  const overallInfo = eeat ? eeatOverallLabel(eeat.overall_score) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header bar */}
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
            onClick={() => { runEeat(); onRefresh(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
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

      {/* Loading state */}
      {loading && !eeat && (
        <div className="px-4 py-6 text-center">
          <Loader2 className="w-5 h-5 text-teal-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Analyzing content for E-E-A-T signals...</p>
          <p className="text-[10px] text-slate-400 mt-1">This typically takes 10-20 seconds</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2.5 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </p>
        </div>
      )}

      {/* Score summary (always visible when we have results) */}
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

      {/* Expanded details */}
      {eeat && expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
          {/* Strengths */}
          {eeat.strengths?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {eeat.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-xs text-slate-600 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {eeat.weaknesses?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" />
                Weaknesses
              </h4>
              <ul className="space-y-1">
                {eeat.weaknesses.slice(0, 3).map((w, i) => (
                  <li key={i} className="text-xs text-slate-600 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
                    <span className="text-red-500 font-bold shrink-0">{i + 1}.</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Signals */}
          {eeat.missing_signals?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500" />
                Missing Signals
              </h4>
              <ul className="space-y-1">
                {eeat.missing_signals.map((s, i) => (
                  <li key={i} className="text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {eeat.improvements?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ArrowUpCircle className="w-3 h-3 text-blue-500" />
                Recommended Improvements
              </h4>
              <ul className="space-y-1">
                {eeat.improvements.slice(0, 3).map((imp, i) => (
                  <li key={i} className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                    {imp}
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

      {/* Initial empty state */}
      {!eeat && !loading && !error && (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-slate-400">Click "Analyze" to check your content's E-E-A-T score.</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Edit content to improve scores, then refresh.</p>
        </div>
      )}
    </div>
  );
}

export default function AIPageCreator() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('tool-listing');
  const [templateConfirmed, setTemplateConfirmed] = useState(false);
  const [rawText, setRawText] = useState('');
  const [structuring, setStructuring] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');
  const [rateLimit, setRateLimit] = useState<number | null>(null);
  const [result, setResult] = useState<StructuredResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formatSaved, setFormatSaved] = useState<number | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [userId, setUserId] = useState('');
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  const [progressStep, setProgressStep] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/admin/login');
      } else {
        setUserId(session.user.id);
        supabase.from('categories').select('slug,name').order('sort_order').then(({ data }) => {
          if (data && data.length > 0) setCategories(data.map(c => ({ value: c.slug, label: c.name })));
        });
      }
    });
  }, [router]);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  function startProgress() {
    setProgressStep(0);
    setProgressValue(0);
    let step = 0;
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) {
        setProgressStep(step);
        setProgressValue(PROGRESS_STEPS[step].pct);
      } else {
        setProgressValue(99);
      }
    }, 3500);
  }

  function stopProgress() {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = null;
    setProgressValue(100);
    setTimeout(() => {
      setProgressStep(0);
      setProgressValue(0);
    }, 600);
  }

  function handleCopy(field: string, value: string) {
    copyText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function updateResult(patch: Partial<StructuredResult>) {
    if (!result) return;
    setResult({ ...result, ...patch });
  }

  function updateFeature(index: number, field: 'title' | 'description', value: string) {
    if (!result) return;
    const features = [...result.features];
    features[index] = { ...features[index], [field]: value };
    setResult({ ...result, features });
  }

  function removeFeature(index: number) {
    if (!result) return;
    setResult({ ...result, features: result.features.filter((_, i) => i !== index) });
  }

  function addFeature() {
    if (!result) return;
    setResult({ ...result, features: [...result.features, { title: '', description: '' }] });
  }

  function updateUseCase(index: number, value: string) {
    if (!result) return;
    const useCases = [...result.useCases];
    useCases[index] = value;
    setResult({ ...result, useCases });
  }

  function removeUseCase(index: number) {
    if (!result) return;
    setResult({ ...result, useCases: result.useCases.filter((_, i) => i !== index) });
  }

  function addUseCase() {
    if (!result) return;
    setResult({ ...result, useCases: [...result.useCases, ''] });
  }

  function updatePricing(index: number, field: 'plan' | 'price', value: string) {
    if (!result) return;
    const pricing = [...result.pricing];
    pricing[index] = { ...pricing[index], [field]: value };
    setResult({ ...result, pricing });
  }

  function updatePricingFeature(tierIndex: number, featureIndex: number, value: string) {
    if (!result) return;
    const pricing = [...result.pricing];
    const features = [...pricing[tierIndex].features];
    features[featureIndex] = value;
    pricing[tierIndex] = { ...pricing[tierIndex], features };
    setResult({ ...result, pricing });
  }

  function removePricingFeature(tierIndex: number, featureIndex: number) {
    if (!result) return;
    const pricing = [...result.pricing];
    pricing[tierIndex] = {
      ...pricing[tierIndex],
      features: pricing[tierIndex].features.filter((_, i) => i !== featureIndex),
    };
    setResult({ ...result, pricing });
  }

  function addPricingFeature(tierIndex: number) {
    if (!result) return;
    const pricing = [...result.pricing];
    pricing[tierIndex] = {
      ...pricing[tierIndex],
      features: [...pricing[tierIndex].features, ''],
    };
    setResult({ ...result, pricing });
  }

  function togglePricingHighlight(tierIndex: number) {
    if (!result) return;
    const pricing = result.pricing.map((p, i) => ({
      ...p,
      highlighted: i === tierIndex ? !p.highlighted : false,
    }));
    setResult({ ...result, pricing });
  }

  function removePricingTier(index: number) {
    if (!result) return;
    setResult({ ...result, pricing: result.pricing.filter((_, i) => i !== index) });
  }

  function addPricingTier() {
    if (!result) return;
    setResult({ ...result, pricing: [...result.pricing, { plan: '', price: '', features: [], highlighted: false }] });
  }

  function updateFaq(index: number, field: 'q' | 'a', value: string) {
    if (!result) return;
    const faqs = [...result.faqs];
    faqs[index] = { ...faqs[index], [field]: value };
    setResult({ ...result, faqs });
  }

  function removeFaq(index: number) {
    if (!result) return;
    setResult({ ...result, faqs: result.faqs.filter((_, i) => i !== index) });
  }

  function addFaq() {
    if (!result) return;
    setResult({ ...result, faqs: [...result.faqs, { q: '', a: '' }] });
  }

  function updateStat(index: number, field: 'label' | 'value', value: string) {
    if (!result) return;
    const stats = [...result.stats];
    stats[index] = { ...stats[index], [field]: value };
    setResult({ ...result, stats });
  }

  function removeStat(index: number) {
    if (!result) return;
    setResult({ ...result, stats: result.stats.filter((_, i) => i !== index) });
  }

  function addStat() {
    if (!result) return;
    setResult({ ...result, stats: [...result.stats, { label: '', value: '' }] });
  }

  function updateTag(index: number, value: string) {
    if (!result) return;
    const tags = [...result.tags];
    tags[index] = value;
    setResult({ ...result, tags });
  }

  function removeTag(index: number) {
    if (!result) return;
    setResult({ ...result, tags: result.tags.filter((_, i) => i !== index) });
  }

  function addTag() {
    if (!result) return;
    setResult({ ...result, tags: [...result.tags, ''] });
  }

  async function handleStructure() {
    if (!rawText.trim()) return;
    setStructuring(true);
    setError('');
    setRateLimit(null);
    setResult(null);
    setPublishError('');
    setPublishSuccess('');
    startProgress();

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/structure-page`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw_text: rawText, prompt_variant: selectedTemplate === 'tool-listing-v2' ? 'v2' : 'v1' }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setRateLimit(data.retry_after ?? 60);
        setError(data.message || 'Rate limit reached. Please wait and try again.');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to structure content');
      }

      const d = data as StructuredResult;
      setResult({
        ...d,
        pros: Array.isArray(d.pros) ? d.pros : [],
        cons: Array.isArray(d.cons) ? d.cons : [],
        what_we_learned: d.what_we_learned ?? null,
        honest_take: Array.isArray(d.honest_take) ? d.honest_take : [],
      });
      setLeftCollapsed(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to structure content');
    } finally {
      stopProgress();
      setStructuring(false);
    }
  }

  function handleClear() {
    setRawText('');
    setResult(null);
    setError('');
    setRateLimit(null);
    setLeftCollapsed(false);
    setViewMode('edit');
    setPublishError('');
    setPublishSuccess('');
    setTemplateConfirmed(false);
    setSelectedTemplate('tool-listing');
  }

  function handleCopyAll() {
    if (!result) return;
    const allText = JSON.stringify(result, null, 2);
    copyText(allText);
    setCopiedField('__all__');
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handlePublish() {
    if (!result || !userId) return;
    setPublishing(true);
    setPublishError('');
    setPublishSuccess('');

    const slug = result.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 80);

    const { error: err } = await supabase.from('tool_pages').insert({
      slug,
      name: result.name,
      tagline: result.tagline,
      description: result.description,
      long_description: result.longDescription,
      category: result.category,
      tags: result.tags,
      badge: result.badge,
      rating: result.rating,
      rating_count: result.ratingCount,
      users: result.users,
      features: result.features,
      use_cases: result.useCases,
      pricing: result.pricing,
      faqs: result.faqs,
      stats: result.stats,
      meta_title: result.meta_title,
      meta_description: result.meta_description,
      focus_keyword: result.focus_keyword,
      pros: result.pros || [],
      cons: result.cons || [],
      what_we_learned: result.what_we_learned || null,
      honest_take: result.honest_take || [],
      status: 'published',
      author_id: userId,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setPublishing(false);

    if (err) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        setPublishError(`A tool page with slug "${slug}" already exists. Change the slug and try again.`);
      } else {
        setPublishError(err.message);
      }
      return;
    }

    setPublishSuccess(`Published! Your tool page is now live.`);
  }

  const wordCount = rawText.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const charCount = rawText.length;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h1 className="text-sm font-semibold text-slate-900">AI Content Clean-Up</h1>
                  {selectedTemplate === 'tool-listing-v2' && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">V2 Prompt</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCopyAll} className="h-8 text-xs text-slate-600">
                      {copiedField === '__all__' ? (
                        <><Check className="w-3 h-3 mr-1.5 text-emerald-500" />Copied JSON</>
                      ) : (
                        <><Braces className="w-3 h-3 mr-1.5" />Copy All as JSON</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStructure}
                      disabled={structuring}
                      className="h-8 text-xs text-sky-600 border-sky-200 hover:bg-sky-50"
                    >
                      {structuring ? (
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3 mr-1.5" />
                      )}
                      Regenerate
                    </Button>
                    {publishSuccess ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => window.open(`/category/${result.category}/${result.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')}`, '_blank')}
                      >
                        <Eye className="w-3 h-3 mr-1.5" />
                        View Live Page
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handlePublish}
                        disabled={publishing || !result.name || !result.slug}
                        className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        {publishing ? (
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        ) : (
                          <Globe className="w-3 h-3 mr-1.5" />
                        )}
                        Publish Tool Page
                      </Button>
                    )}
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-xs text-slate-500">
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Template selection step */}
        {!templateConfirmed && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-3xl w-full">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Choose a page template</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Select a template to get started. Your page will be published at <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">/category/[category]/your-slug</code> and appear on the home page.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {PAGE_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id;
                  const isDisabled = !tpl.available;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        if (tpl.available) setSelectedTemplate(tpl.id);
                      }}
                      disabled={isDisabled}
                      className={`relative flex flex-col text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                        isDisabled
                          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-slate-900 bg-white shadow-lg shadow-slate-200/50 ring-1 ring-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      {isDisabled && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" />
                            Coming Soon
                          </span>
                        </div>
                      )}
                      {isSelected && tpl.available && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                        isSelected && tpl.available
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tpl.icon}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">{tpl.name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">{tpl.description}</p>
                      <div className="mt-auto pt-3 border-t border-slate-100">
                        <p className="text-[11px] text-slate-400 leading-relaxed">{tpl.preview}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    if (selectedTemplate === 'top-x-tools') {
                      router.push('/admin/top-x-create');
                    } else if (selectedTemplate === 'tool-comparison') {
                      router.push('/admin/comparison-create');
                    } else {
                      setTemplateConfirmed(true);
                    }
                  }}
                  disabled={!selectedTemplate || !PAGE_TEMPLATES.find(t => t.id === selectedTemplate)?.available}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8"
                  size="lg"
                >
                  Continue with {PAGE_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Template'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main split layout */}
        {templateConfirmed && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Raw text input */}
          <div
            className={`border-r border-slate-200 bg-white flex flex-col transition-all duration-300 ease-in-out ${
              leftCollapsed ? 'w-12' : 'w-1/2'
            }`}
          >
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
                  <TooltipContent side="right">Show input panel</TooltipContent>
                </Tooltip>
                <div className="w-6 h-px bg-slate-200" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <AlignLeft className="w-4 h-4 text-slate-300" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{wordCount} words pasted</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-700">Raw Input</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {wordCount} words / {charCount} chars
                    </span>
                    {result && (
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
                </div>
                <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Paste your unstructured text here...

Examples of what you can paste:
  - Product descriptions or feature lists
  - Blog post drafts or rough outlines
  - Competitor page content
  - Meeting notes about a new tool
  - Bullet points of key information
  - Raw scraped content from websites

The AI will clean this up and produce a complete, structured tool page with name, tagline, features, pricing, FAQs, stats, SEO metadata, and more.`}
                    className="flex-1 resize-none text-sm leading-relaxed font-normal border-slate-200 focus-visible:ring-sky-500/20 focus-visible:border-sky-400 min-h-0"
                  />

                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (!rawText.trim()) return;
                            const before = rawText.length;
                            const formatted = formatRawText(rawText);
                            setRawText(formatted);
                            const saved = before - formatted.length;
                            if (saved > 0) {
                              setFormatSaved(saved);
                              setTimeout(() => setFormatSaved(null), 3000);
                            }
                          }}
                          disabled={!rawText.trim() || structuring}
                          className="h-10 px-3 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 shrink-0"
                        >
                          <WrapText className="w-4 h-4 mr-1.5" />
                          Format
                          {formatSaved !== null && (
                            <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 tabular-nums">
                              -{formatSaved} chars
                            </span>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-center">
                        Strip HTML, collapse whitespace, remove duplicates, trim lines -- no AI
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      onClick={handleStructure}
                      disabled={!rawText.trim() || structuring}
                      className="flex-1 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white shadow-sm h-10"
                    >
                      {structuring ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Clean Up with AI<ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p>{error}</p>
                        {rateLimit && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Retry available in ~{rateLimit} seconds
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right panel - Structured output */}
          <div
            className={`flex flex-col overflow-hidden bg-slate-50 transition-all duration-300 ease-in-out ${
              leftCollapsed ? 'flex-1' : 'w-1/2'
            }`}
          >
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">Structured Output</h2>
              </div>
              <div className="flex items-center gap-2">
                {result && (
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'edit'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'preview'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Monitor className="w-3 h-3" />
                      Preview
                    </button>
                  </div>
                )}
                {result && viewMode === 'edit' && (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Empty state */}
              {!result && !structuring && (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-400 mb-2">AI Content Clean-Up</h3>
                  <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                    Paste unstructured text on the left and click &ldquo;Clean Up with AI&rdquo;
                    to generate a complete tool page with name, tagline, features, pricing tiers,
                    FAQs, stats, and SEO metadata.
                  </p>
                </div>
              )}

              {/* Progress loader */}
              {structuring && (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="w-full max-w-md space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-50 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-7 h-7 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-700 mb-1">
                        {PROGRESS_STEPS[progressStep]?.label || 'Processing...'}
                      </h3>
                      <p className="text-xs text-slate-400">This typically takes 15-40 seconds</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${progressValue}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 tabular-nums">{progressValue}%</p>
                    </div>
                    <div className="space-y-1.5 text-left bg-white rounded-xl border border-slate-200 p-4">
                      {PROGRESS_STEPS.map((step, i) => {
                        const isDone = i < progressStep;
                        const isActive = i === progressStep;
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-2.5 py-1 text-xs transition-all duration-300 ${
                              isDone ? 'text-emerald-600' : isActive ? 'text-sky-700 font-medium' : 'text-slate-300'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : isActive ? (
                              <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0" />
                            )}
                            {step.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Result - preview mode */}
              {result && viewMode === 'preview' && (
                <ToolPagePreview data={result} />
              )}

              {/* Result - editable */}
              {result && viewMode === 'edit' && (
                <div className="p-5">
                  {/* Publish feedback */}
                  {(publishError || publishSuccess) && (
                    <div className="mb-5">
                      {publishError && (
                        <div className="flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          {publishError}
                        </div>
                      )}
                      {publishSuccess && (
                        <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{publishSuccess}</span>
                          <button
                            onClick={() => window.open(`/category/${result.category}/${result.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')}`, '_blank')}
                            className="ml-auto text-xs font-medium text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View page
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Main content column */}
                    <div className="lg:col-span-2 space-y-5">
                      {/* E-E-A-T Score Panel */}
                      <EeatScorePanel result={result} onRefresh={() => {}} />

                      {/* Identity */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader icon={<Type className="w-3.5 h-3.5" />} label="Identity" />
                        <div className="space-y-2">
                          <EditableField label="Name" icon={<Type className="w-3 h-3" />} value={result.name} onChange={(v) => updateResult({ name: v })} charLimit={{ min: 1, max: 40 }} />
                          <EditableField label="Tagline" icon={<Zap className="w-3 h-3" />} value={result.tagline} onChange={(v) => updateResult({ tagline: v })} charLimit={{ min: 40, max: 80 }} />
                          <EditableField label="Description" icon={<AlignLeft className="w-3 h-3" />} value={result.description} onChange={(v) => updateResult({ description: v })} charLimit={{ min: 80, max: 160 }} />
                          <EditableField label="Long Description" icon={<FileText className="w-3 h-3" />} value={result.longDescription} onChange={(v) => updateResult({ longDescription: v })} charLimit={{ min: 200, max: 500 }} multiline />
                        </div>
                      </div>

                      {/* Features */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          label="Features"
                          count={result.features?.length}
                          action={
                            <button onClick={addFeature} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          }
                        />
                        <div className="grid grid-cols-1 gap-2">
                          {result.features?.map((f, i) => (
                            <div key={i} className="rounded-lg border border-slate-200 p-3.5 hover:border-slate-300 transition-colors">
                              <div className="flex items-start gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-sky-50 flex items-center justify-center shrink-0 mt-1">
                                  <GripVertical className="w-3 h-3 text-slate-300" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <input
                                    type="text"
                                    value={f.title}
                                    onChange={(e) => updateFeature(i, 'title', e.target.value)}
                                    placeholder="Feature title"
                                    className="w-full text-sm font-semibold text-slate-800 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                                  />
                                  <textarea
                                    value={f.description}
                                    onChange={(e) => updateFeature(i, 'description', e.target.value)}
                                    placeholder="Feature description"
                                    rows={2}
                                    className="w-full text-xs text-slate-500 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300"
                                  />
                                </div>
                                <button onClick={() => removeFeature(i)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Use Cases */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader
                          icon={<Target className="w-3.5 h-3.5" />}
                          label="Use Cases"
                          count={result.useCases?.length}
                          action={
                            <button onClick={addUseCase} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          {result.useCases?.map((uc, i) => (
                            <div key={i} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1 py-1">
                              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                              <input
                                type="text"
                                value={uc}
                                onChange={(e) => updateUseCase(i, e.target.value)}
                                className="text-xs text-slate-700 bg-transparent border-0 p-0 w-36 focus:outline-none focus:ring-0"
                                placeholder="Use case"
                              />
                              <button onClick={() => removeUseCase(i)} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500">
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader
                          icon={<DollarSign className="w-3.5 h-3.5" />}
                          label="Pricing Tiers"
                          count={result.pricing?.length}
                          action={
                            <button onClick={addPricingTier} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                              <Plus className="w-3 h-3" /> Add Tier
                            </button>
                          }
                        />
                        <div className="grid grid-cols-1 gap-2">
                          {result.pricing?.map((tier, i) => (
                            <div
                              key={i}
                              className={`rounded-lg border p-3.5 transition-colors ${
                                tier.highlighted
                                  ? 'border-sky-300 ring-1 ring-sky-200 bg-sky-50/30'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={tier.plan}
                                    onChange={(e) => updatePricing(i, 'plan', e.target.value)}
                                    placeholder="Plan name"
                                    className="text-sm font-semibold text-slate-800 bg-transparent border-0 p-0 w-24 focus:outline-none focus:ring-0"
                                  />
                                  <button
                                    onClick={() => togglePricingHighlight(i)}
                                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                      tier.highlighted
                                        ? 'bg-sky-100 text-sky-700 border-sky-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-sky-600'
                                    }`}
                                  >
                                    {tier.highlighted ? 'Highlighted' : 'Highlight'}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={tier.price}
                                    onChange={(e) => updatePricing(i, 'price', e.target.value)}
                                    placeholder="$0/mo"
                                    className="text-lg font-bold text-slate-900 bg-transparent border-0 p-0 w-24 text-right focus:outline-none focus:ring-0"
                                  />
                                  <button onClick={() => removePricingTier(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <ul className="space-y-1">
                                {tier.features?.map((f, j) => (
                                  <li key={j} className="flex items-start gap-1.5">
                                    <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                    <input
                                      type="text"
                                      value={f}
                                      onChange={(e) => updatePricingFeature(i, j, e.target.value)}
                                      className="flex-1 text-xs text-slate-600 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                                      placeholder="Feature"
                                    />
                                    <button onClick={() => removePricingFeature(i, j)} className="text-slate-300 hover:text-red-500 shrink-0">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <button onClick={() => addPricingFeature(i)} className="mt-1.5 text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                                <Plus className="w-3 h-3" /> Add feature
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* FAQs */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader
                          icon={<HelpCircle className="w-3.5 h-3.5" />}
                          label="FAQs"
                          count={result.faqs?.length}
                          action={
                            <button onClick={addFaq} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          }
                        />
                        <div className="space-y-2">
                          {result.faqs?.map((faq, i) => (
                            <div key={i} className="rounded-lg border border-slate-200 p-3.5 hover:border-slate-300 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex items-start gap-1.5">
                                    <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                                    <input
                                      type="text"
                                      value={faq.q}
                                      onChange={(e) => updateFaq(i, 'q', e.target.value)}
                                      placeholder="Question"
                                      className="w-full text-sm font-semibold text-slate-800 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                                    />
                                  </div>
                                  <textarea
                                    value={faq.a}
                                    onChange={(e) => updateFaq(i, 'a', e.target.value)}
                                    placeholder="Answer"
                                    rows={2}
                                    className="w-full text-xs text-slate-500 leading-relaxed bg-transparent border-0 p-0 pl-[18px] focus:outline-none focus:ring-0 resize-none"
                                  />
                                </div>
                                <button onClick={() => removeFaq(i)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader
                          icon={<BarChart3 className="w-3.5 h-3.5" />}
                          label="Stats"
                          count={result.stats?.length}
                          action={
                            <button onClick={addStat} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          }
                        />
                        <div className="grid grid-cols-3 gap-2">
                          {result.stats?.map((stat, i) => (
                            <div key={i} className="rounded-lg border border-slate-200 p-3 text-center hover:border-slate-300 transition-colors relative group">
                              <button
                                onClick={() => removeStat(i)}
                                className="absolute top-1.5 right-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                              <input
                                type="text"
                                value={stat.value}
                                onChange={(e) => updateStat(i, 'value', e.target.value)}
                                className="text-lg font-bold text-slate-900 bg-transparent border-0 p-0 w-full text-center focus:outline-none focus:ring-0"
                              />
                              <input
                                type="text"
                                value={stat.label}
                                onChange={(e) => updateStat(i, 'label', e.target.value)}
                                className="text-[11px] text-slate-500 mt-0.5 bg-transparent border-0 p-0 w-full text-center focus:outline-none focus:ring-0"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pros & Cons */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                <Check className="w-3 h-3" /> Pros (top 3)
                              </span>
                              <button onClick={() => updateResult({ pros: [...(result.pros || []), ''] })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {(result.pros || []).map((pro, i) => (
                                <div key={i} className="flex items-start gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
                                  <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                  <textarea
                                    value={pro}
                                    onChange={(e) => {
                                      const next = [...(result.pros || [])];
                                      next[i] = e.target.value;
                                      updateResult({ pros: next });
                                    }}
                                    rows={2}
                                    className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none resize-none"
                                  />
                                  <button onClick={() => updateResult({ pros: (result.pros || []).filter((_, j) => j !== i) })} className="text-emerald-300 hover:text-red-500 shrink-0">
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Cons (top 3)
                              </span>
                              <button onClick={() => updateResult({ cons: [...(result.cons || []), ''] })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {(result.cons || []).map((con, i) => (
                                <div key={i} className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5">
                                  <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                  <textarea
                                    value={con}
                                    onChange={(e) => {
                                      const next = [...(result.cons || [])];
                                      next[i] = e.target.value;
                                      updateResult({ cons: next });
                                    }}
                                    rows={2}
                                    className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none resize-none"
                                  />
                                  <button onClick={() => updateResult({ cons: (result.cons || []).filter((_, j) => j !== i) })} className="text-red-200 hover:text-red-500 shrink-0">
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* What We Learned After Testing */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-1">
                          <SectionHeader icon={<FlaskConical className="w-3.5 h-3.5" />} label="What We Learned After Testing" />
                          {!result.what_we_learned && (
                            <button
                              onClick={() => updateResult({ what_we_learned: { use_case: '', bullets: ['', '', ''] } })}
                              className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5 -mt-3"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                        {result.what_we_learned ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Use Case Tested</label>
                              <input
                                type="text"
                                value={result.what_we_learned.use_case}
                                onChange={(e) => updateResult({ what_we_learned: { ...result.what_we_learned!, use_case: e.target.value } })}
                                placeholder="e.g. SEO content generation for startups"
                                className="w-full text-xs text-slate-700 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-400"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Insights (3 bullets)</label>
                                <button onClick={() => updateResult({ what_we_learned: { ...result.what_we_learned!, bullets: [...result.what_we_learned!.bullets, ''] } })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                                  <Plus className="w-3 h-3" /> Add
                                </button>
                              </div>
                              <div className="space-y-2">
                                {result.what_we_learned.bullets.map((b, i) => (
                                  <div key={i} className="flex items-start gap-2 rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2">
                                    <span className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-[9px] font-bold text-teal-700 mt-0.5">{i + 1}</span>
                                    <textarea
                                      value={b}
                                      onChange={(e) => {
                                        const next = [...result.what_we_learned!.bullets];
                                        next[i] = e.target.value;
                                        updateResult({ what_we_learned: { ...result.what_we_learned!, bullets: next } });
                                      }}
                                      rows={2}
                                      className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none resize-none"
                                      placeholder="A specific insight from testing..."
                                    />
                                    <button onClick={() => updateResult({ what_we_learned: { ...result.what_we_learned!, bullets: result.what_we_learned!.bullets.filter((_, j) => j !== i) } })} className="text-teal-300 hover:text-red-500 shrink-0">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <button onClick={() => updateResult({ what_we_learned: null })} className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-0.5">
                              <Trash2 className="w-3 h-3" /> Remove section
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 -mt-1">Not generated. Click Add or re-run AI.</p>
                        )}
                      </div>

                      {/* Our Honest Take */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <SectionHeader
                          icon={<MessageSquare className="w-3.5 h-3.5" />}
                          label="Our Honest Take"
                          count={result.honest_take?.length}
                          action={
                            <button onClick={() => updateResult({ honest_take: [...(result.honest_take || []), ''] })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          }
                        />
                        <p className="text-[11px] text-slate-400 -mt-1 mb-3">3 first-person bullets. Start with &quot;In our experience,&quot;, &quot;We found that&quot;, &quot;Honestly,&quot; etc.</p>
                        <div className="space-y-2">
                          {(result.honest_take || []).map((bullet, i) => (
                            <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2.5">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <textarea
                                value={bullet}
                                onChange={(e) => {
                                  const next = [...(result.honest_take || [])];
                                  next[i] = e.target.value;
                                  updateResult({ honest_take: next });
                                }}
                                rows={2}
                                className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none resize-none leading-relaxed"
                                placeholder='e.g. "In our experience, the onboarding is fast but real value shows after connecting your data sources."'
                              />
                              <button onClick={() => updateResult({ honest_take: (result.honest_take || []).filter((_, j) => j !== i) })} className="text-amber-300 hover:text-red-500 shrink-0">
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                      {/* Classification */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Classification</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
                            <Select value={result.category} onValueChange={(v) => updateResult({ category: v })}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Badge</label>
                            <Select value={result.badge || '_none'} onValueChange={(v) => updateResult({ badge: v === '_none' ? null : v })}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BADGES.map((b) => (
                                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">Tags</label>
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {result.tags?.map((tag, i) => (
                                <div key={i} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full pl-2.5 pr-1 py-0.5">
                                  <input
                                    type="text"
                                    value={tag}
                                    onChange={(e) => updateTag(i, e.target.value)}
                                    className="text-xs text-slate-700 bg-transparent border-0 p-0 w-16 focus:outline-none focus:ring-0"
                                  />
                                  <button onClick={() => removeTag(i)} className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 hover:text-red-500">
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                              <button onClick={addTag} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed border-sky-200 hover:border-sky-400 transition-colors">
                                <Plus className="w-2.5 h-2.5" /> Tag
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Social Proof */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Social Proof</h3>
                        <div className="space-y-2">
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1">
                              <Star className="w-3 h-3" /> Rating
                            </label>
                            <Input type="number" step="0.1" min="0" max="5" value={result.rating} onChange={(e) => updateResult({ rating: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1">Review Count</label>
                            <Input value={result.ratingCount} onChange={(e) => updateResult({ ratingCount: e.target.value })} className="h-8 text-sm" placeholder="e.g. 1.2k" />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1">
                              <Users className="w-3 h-3" /> Users
                            </label>
                            <Input value={result.users} onChange={(e) => updateResult({ users: e.target.value })} className="h-8 text-sm" placeholder="e.g. 50k+" />
                          </div>
                        </div>
                      </div>

                      {/* SEO Metadata */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SEO Metadata</h3>
                        <div className="space-y-2">
                          <EditableField label="Meta Title" icon={<Search className="w-3 h-3" />} value={result.meta_title} onChange={(v) => updateResult({ meta_title: v })} charLimit={{ min: 50, max: 60 }} />
                          <EditableField label="Meta Description" icon={<Search className="w-3 h-3" />} value={result.meta_description} onChange={(v) => updateResult({ meta_description: v })} charLimit={{ min: 120, max: 160 }} multiline />
                          <EditableField label="Slug" icon={<Link2 className="w-3 h-3" />} value={result.slug} onChange={(v) => updateResult({ slug: v })} charLimit={{ min: 5, max: 40 }} />
                          <EditableField label="Focus Keyword" icon={<Tag className="w-3 h-3" />} value={result.focus_keyword} onChange={(v) => updateResult({ focus_keyword: v })} />
                        </div>
                        {/* SERP preview */}
                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Search Preview</p>
                          <p className="text-xs text-emerald-700 truncate">yoursite.com/category/{result.category}/{result.slug}</p>
                          <p className="text-sm text-blue-700 hover:underline cursor-pointer mt-0.5 truncate leading-snug">
                            {result.meta_title || result.name}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {result.meta_description}
                          </p>
                        </div>
                      </div>

                      {/* Publish CTA */}
                      {!publishSuccess ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                          <Button
                            onClick={handlePublish}
                            disabled={publishing || !result.name || !result.slug}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm"
                          >
                            {publishing ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Globe className="w-4 h-4 mr-2" />
                            )}
                            Publish Tool Page
                          </Button>
                          <p className="text-[11px] text-slate-400 text-center">
                            Review all fields, then publish as a live page.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-emerald-800 mb-1">Published!</p>
                          <button
                            onClick={() => window.open(`/category/${result.category}/${result.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')}`, '_blank')}
                            className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 mx-auto"
                          >
                            <Eye className="w-3 h-3" /> View live page
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-6" />
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </TooltipProvider>
  );
}
