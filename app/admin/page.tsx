'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Eye, Trash2, LogOut, Globe, Loader as Loader2, LayoutDashboard, Sparkles, Zap, Map, MessageSquareCode, Settings2, RefreshCw, Shield, EyeOff, CircleAlert as AlertCircle, TrendingUp, Users as Users2, Pencil, Trophy, Search, ChevronDown, ChevronUp, ChevronsUpDown, ArrowUpDown, FileText, CircleCheck as CheckCircle2, X, ExternalLink, GitCompare, BadgeCheck, MousePointerClick } from 'lucide-react';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToolPage {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  long_description: string;
  category: string;
  badge: string | null;
  status: string;
  noindex: boolean;
  features: { title: string; description: string }[];
  use_cases: string[];
  pricing: { plan: string; price: string; features: string[] }[];
  faqs: { q: string; a: string }[];
  stats: { label: string; value: string }[];
  meta_description: string;
  focus_keyword: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  website_clicks?: number;
  is_claimed?: boolean;
}

interface TopXPage {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  tool_ids: string[];
  intro?: string;
  outro?: string;
  entries?: { tool_id: string; score: number; best_for: string; pros: string[]; cons: string[]; pricing_summary: string; verdict: string }[];
  faqs?: { q: string; a: string }[];
  meta_description?: string;
  focus_keyword?: string;
  status: string;
  noindex: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface ComparisonPage {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  tool_ids: string[];
  intro?: string;
  verdict?: string;
  outro?: string;
  meta_description?: string;
  focus_keyword?: string;
  status: string;
  noindex: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface LighthouseScore {
  page_id: string;
  strategy: string;
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  fetched_at: string;
  raw_report?: {
    categories?: Record<string, { title: string; score: number | null }>;
    key_audits?: Record<string, { title: string; score: number | null; displayValue?: string; description: string }>;
    fetch_time?: string;
    requested_url?: string;
    final_url?: string;
  } | null;
}

interface EeatScore {
  page_id: string;
  overall_score: number;
  experience_score: number;
  expertise_score: number;
  authoritativeness_score: number;
  trustworthiness_score: number;
  strengths?: string[];
  weaknesses?: string[];
  missing_signals?: string[];
  improvements?: string[];
  analyzed_at: string;
}

interface PageViewStats {
  page_id: string;
  total_views: number;
  unique_visitors: number;
}

type SortField = 'name' | 'updated_at' | 'published_at' | 'views';
type SortDir = 'asc' | 'desc';

// Unified row type for the combined table
interface UnifiedRow {
  id: string;
  type: 'tool' | 'top_x' | 'comparison';
  slug: string;
  name: string;
  tagline: string;
  category: string;
  status: string;
  noindex: boolean;
  badge?: string | null;
  tool_count?: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  // raw references
  toolData?: ToolPage;
  topXData?: TopXPage;
  comparisonData?: ComparisonPage;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  seo: 'SEO & Content',
  analytics: 'Analytics',
  developer: 'Developer',
  marketing: 'Marketing',
  security: 'Security',
  design: 'Design',
  infrastructure: 'Infrastructure',
};

const CATEGORY_COLORS: Record<string, string> = {
  seo: 'bg-teal-50 text-teal-700 border-teal-200',
  analytics: 'bg-sky-50 text-sky-700 border-sky-200',
  developer: 'bg-slate-100 text-slate-700 border-slate-200',
  marketing: 'bg-rose-50 text-rose-700 border-rose-200',
  security: 'bg-amber-50 text-amber-700 border-amber-200',
  design: 'bg-pink-50 text-pink-700 border-pink-200',
  infrastructure: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number | null, max: number): string {
  if (score === null) return 'text-slate-300';
  const pct = score / max;
  if (pct >= 0.8) return 'text-emerald-600';
  if (pct >= 0.5) return 'text-amber-600';
  return 'text-red-500';
}

function scoreBgRing(score: number | null, max: number): string {
  if (score === null) return 'border-slate-200 bg-slate-50';
  const pct = score / max;
  if (pct >= 0.8) return 'border-emerald-300 bg-emerald-50';
  if (pct >= 0.5) return 'border-amber-300 bg-amber-50';
  return 'border-red-300 bg-red-50';
}

function MiniScore({ score, max, size = 'sm' }: { score: number | null; max: number; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
  const text = size === 'md' ? 'text-[11px]' : 'text-[9px]';
  return (
    <div className={`${dim} rounded-full border-2 flex items-center justify-center ${scoreBgRing(score, max)}`}>
      <span className={`${text} font-bold ${scoreColor(score, max)}`}>{score ?? '--'}</span>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return format(new Date(dateStr), 'MMM d');
}

// ── Score gauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score, max, label }: { score: number | null; max: number; label: string }) {
  const pct = score != null ? score / max : 0;
  const color = score == null ? 'text-slate-300' : pct >= 0.9 ? 'text-emerald-600' : pct >= 0.5 ? 'text-amber-600' : 'text-red-500';
  const bg = score == null ? 'bg-slate-100' : pct >= 0.9 ? 'bg-emerald-500' : pct >= 0.5 ? 'bg-amber-500' : 'bg-red-500';
  const ring = score == null ? 'border-slate-200 bg-slate-50' : pct >= 0.9 ? 'border-emerald-300 bg-emerald-50' : pct >= 0.5 ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${ring}`}>
        <span className={`text-xl font-bold ${color}`}>{score ?? '--'}</span>
      </div>
      <div className="w-full h-1 rounded-full bg-slate-100">
        <div className={`h-1 rounded-full ${bg} transition-all`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">{label}</span>
    </div>
  );
}

function auditScoreColor(score: number | null): string {
  if (score == null) return 'text-slate-400';
  if (score >= 0.9) return 'text-emerald-600';
  if (score >= 0.5) return 'text-amber-600';
  return 'text-red-500';
}

function AuditDot({ score }: { score: number | null }) {
  if (score == null) return <span className="w-2 h-2 rounded-full bg-slate-200 shrink-0 mt-1" />;
  if (score >= 0.9) return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />;
  if (score >= 0.5) return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />;
  return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />;
}

// ── Lighthouse Cell ───────────────────────────────────────────────────────────

function LighthouseCell({
  pageId,
  pageUrl,
  pageName,
  scores,
  onScanComplete,
}: {
  pageId: string;
  pageUrl: string;
  pageName: string;
  scores: LighthouseScore | null;
  onScanComplete: (score: LighthouseScore) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  async function runScan() {
    setScanning(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-lighthouse`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_id: pageId, slug: pageUrl.replace(/^\//, ''), strategy: 'mobile', base_url: baseUrl }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Error ${res.status}`);
      }
      const data = await res.json();
      onScanComplete({
        page_id: pageId, strategy: 'mobile',
        performance: data.performance, accessibility: data.accessibility,
        best_practices: data.best_practices, seo: data.seo,
        raw_report: data.raw_report || null,
        fetched_at: data.fetched_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  if (!scores && !scanning && !error) {
    return (
      <button onClick={runScan} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-sky-600 transition-colors group">
        <RefreshCw className="w-3 h-3 group-hover:text-sky-500" />
        Scan
      </button>
    );
  }

  if (scanning && !scores) {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
        <span className="text-[10px] text-slate-400">Scanning…</span>
      </div>
    );
  }

  if (error && !scores) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={runScan} className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 transition-colors">
            <AlertCircle className="w-3 h-3" /> Retry
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-xs">{error}</TooltipContent>
      </Tooltip>
    );
  }

  if (!scores) return null;

  const vals = [scores.performance, scores.accessibility, scores.best_practices, scores.seo].filter((s): s is number => s !== null);
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  const keyAudits = scores.raw_report?.key_audits;

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
        <MiniScore score={avg} max={100} size="md" />
        <span className="text-[10px] text-slate-400 leading-tight">{timeAgo(scores.fetched_at)}</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-sky-600" />
                </div>
                <div>
                  <SheetTitle className="text-sm font-semibold text-slate-900">Lighthouse Report</SheetTitle>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[280px]">{pageName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={runScan} disabled={scanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 transition-colors"
                >
                  {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {scanning ? 'Scanning…' : 'Rescan'}
                </button>
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 py-6 space-y-8">
            {/* URL + timestamp */}
            <div className="flex flex-col gap-1">
              {scores.raw_report?.final_url && (
                <a href={scores.raw_report.final_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 transition-colors group">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{scores.raw_report.final_url}</span>
                </a>
              )}
              <p className="text-[10px] text-slate-400">Scanned {format(new Date(scores.fetched_at), 'MMM d, yyyy h:mm a')} · Mobile</p>
            </div>

            {/* Score gauges */}
            <div>
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">Core Scores</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Performance', val: scores.performance },
                  { label: 'Accessibility', val: scores.accessibility },
                  { label: 'Best Practices', val: scores.best_practices },
                  { label: 'SEO', val: scores.seo },
                ].map((item) => (
                  <ScoreGauge key={item.label} score={item.val} max={100} label={item.label} />
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                {[{ color: 'bg-emerald-500', label: '90–100' }, { color: 'bg-amber-500', label: '50–89' }, { color: 'bg-red-500', label: '0–49' }].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                    <span className="text-[10px] text-slate-500">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key audits */}
            {keyAudits && Object.keys(keyAudits).length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Audits</h3>
                <div className="space-y-2">
                  {Object.entries(keyAudits).map(([id, audit]) => (
                    <div key={id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                      <AuditDot score={audit.score} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-800 truncate">{audit.title}</p>
                          {audit.displayValue && (
                            <span className={`text-[10px] font-semibold shrink-0 ${auditScoreColor(audit.score)}`}>{audit.displayValue}</span>
                          )}
                        </div>
                        {audit.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{audit.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!keyAudits && (
              <div className="text-center py-8 text-sm text-slate-400">
                No detailed audit data — rescan to load full report.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── E-E-A-T Cell ──────────────────────────────────────────────────────────────

function EeatCell({
  pageId,
  pageTitle,
  contentText,
  metaDescription,
  focusKeyword,
  scores,
  onScanComplete,
}: {
  pageId: string;
  pageTitle: string;
  contentText: string;
  metaDescription: string;
  focusKeyword: string;
  scores: EeatScore | null;
  onScanComplete: (score: EeatScore) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  async function runAnalysis() {
    setScanning(true);
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-eeat`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_id: pageId, title: pageTitle, content: contentText, meta_description: metaDescription, focus_keyword: focusKeyword }),
        }
      );
      if (res.status === 429) { const d = await res.json(); throw new Error(`Rate limited. Retry in ~${d.retry_after ?? 60}s`); }
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { error?: string }).error || `Error ${res.status}`); }
      const data = await res.json();
      onScanComplete({
        page_id: pageId,
        overall_score: data.overall_score,
        experience_score: data.experience_score,
        expertise_score: data.expertise_score,
        authoritativeness_score: data.authoritativeness_score,
        trustworthiness_score: data.trustworthiness_score,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        missing_signals: data.missing_signals || [],
        improvements: data.improvements || [],
        analyzed_at: data.analyzed_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setScanning(false);
    }
  }

  if (!scores && !scanning && !error) {
    return (
      <button onClick={runAnalysis} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-teal-600 transition-colors group">
        <Shield className="w-3 h-3 group-hover:text-teal-500" /> Analyze
      </button>
    );
  }

  if (scanning && !scores) {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />
        <span className="text-[10px] text-slate-400">Analyzing…</span>
      </div>
    );
  }

  if (error && !scores) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={runAnalysis} className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 transition-colors">
            <AlertCircle className="w-3 h-3" /> Retry
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-xs">{error}</TooltipContent>
      </Tooltip>
    );
  }

  if (!scores) return null;

  const eeatDimensions = [
    { label: 'Experience', val: scores.experience_score, max: 25, description: 'First-hand experience, real use cases, personal examples' },
    { label: 'Expertise', val: scores.expertise_score, max: 25, description: 'Subject matter depth, accurate terminology, comprehensive coverage' },
    { label: 'Authoritativeness', val: scores.authoritativeness_score, max: 25, description: 'External citations, statistics, expert quotes, industry references' },
    { label: 'Trustworthiness', val: scores.trustworthiness_score, max: 25, description: 'Accurate facts, balanced perspective, clear sourcing, transparency' },
  ];

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
        <MiniScore score={scores.overall_score} max={100} size="md" />
        <span className="text-[10px] text-slate-400 leading-tight">{timeAgo(scores.analyzed_at)}</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <SheetTitle className="text-sm font-semibold text-slate-900">E-E-A-T Report</SheetTitle>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[280px]">{pageTitle}</p>
                </div>
              </div>
              <button
                onClick={runAnalysis} disabled={scanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition-colors"
              >
                {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {scanning ? 'Analyzing…' : 'Re-analyze'}
              </button>
            </div>
          </SheetHeader>

          <div className="px-6 py-6 space-y-8">
            {/* Overall score hero */}
            <div className="flex items-center gap-6 bg-slate-50 rounded-xl p-5 border border-slate-100">
              <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shrink-0 ${
                scores.overall_score >= 80 ? 'border-emerald-300 bg-emerald-50'
                : scores.overall_score >= 60 ? 'border-amber-300 bg-amber-50'
                : 'border-red-300 bg-red-50'
              }`}>
                <span className={`text-3xl font-bold ${
                  scores.overall_score >= 80 ? 'text-emerald-600'
                  : scores.overall_score >= 60 ? 'text-amber-600'
                  : 'text-red-500'
                }`}>{scores.overall_score}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Overall E-E-A-T Score</p>
                <p className={`text-2xl font-bold ${
                  scores.overall_score >= 80 ? 'text-emerald-600'
                  : scores.overall_score >= 60 ? 'text-amber-600'
                  : 'text-red-500'
                }`}>
                  {scores.overall_score >= 80 ? 'Excellent' : scores.overall_score >= 60 ? 'Good' : scores.overall_score >= 40 ? 'Fair' : 'Needs Work'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Analyzed {format(new Date(scores.analyzed_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            </div>

            {/* Dimension scores */}
            <div>
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">Score Breakdown</h3>
              <div className="space-y-3">
                {eeatDimensions.map((dim) => {
                  const pct = dim.val / dim.max;
                  const barColor = pct >= 0.8 ? 'bg-emerald-500' : pct >= 0.5 ? 'bg-amber-500' : 'bg-red-500';
                  const textColor = pct >= 0.8 ? 'text-emerald-600' : pct >= 0.5 ? 'text-amber-600' : 'text-red-500';
                  return (
                    <div key={dim.label} className="rounded-lg border border-slate-100 p-3.5 hover:border-slate-200 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{dim.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{dim.description}</p>
                        </div>
                        <span className={`text-lg font-bold ${textColor}`}>{dim.val}<span className="text-[10px] font-normal text-slate-400">/{dim.max}</span></span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100">
                        <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${pct * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths */}
            {scores.strengths && scores.strengths.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Strengths
                </h3>
                <div className="space-y-2">
                  {scores.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-slate-700 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weaknesses */}
            {scores.weaknesses && scores.weaknesses.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5 text-red-400" /> Weaknesses
                </h3>
                <div className="space-y-2">
                  {scores.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                      <span className="w-4 h-4 rounded-full bg-red-400 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-slate-700 leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing signals */}
            {scores.missing_signals && scores.missing_signals.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Missing Signals
                </h3>
                <div className="space-y-2">
                  {scores.missing_signals.map((m, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                      <span className="w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-slate-700 leading-relaxed">{m}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {scores.improvements && scores.improvements.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" /> Recommended Improvements
                </h3>
                <div className="space-y-2">
                  {scores.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2.5">
                      <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-slate-700 leading-relaxed">{imp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!scores.strengths?.length && !scores.weaknesses?.length && !scores.improvements?.length) && (
              <div className="text-center py-8 text-sm text-slate-400">
                No detailed breakdown available — re-analyze to load full report.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="pb-2" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── Content builders ──────────────────────────────────────────────────────────

function buildToolContent(tool: ToolPage): string {
  const parts: string[] = [];
  parts.push(`# ${tool.name}`);
  if (tool.tagline) parts.push(tool.tagline);
  if (tool.description) parts.push(tool.description);
  if (tool.long_description) parts.push(tool.long_description);
  tool.features?.forEach((f) => { parts.push(`## ${f.title}`); parts.push(f.description); });
  tool.use_cases?.forEach((uc) => parts.push(`- ${uc}`));
  tool.pricing?.forEach((tier) => { parts.push(`### ${tier.plan} - ${tier.price}`); tier.features?.forEach((pf) => parts.push(`- ${pf}`)); });
  tool.faqs?.forEach((faq) => { parts.push(`Q: ${faq.q}`); parts.push(`A: ${faq.a}`); });
  tool.stats?.forEach((stat) => parts.push(`${stat.label}: ${stat.value}`));
  return parts.join('\n');
}

function buildTopXContent(page: TopXPage): string {
  const parts: string[] = [];
  parts.push(`# ${page.name}`);
  if (page.tagline) parts.push(page.tagline);
  if (page.intro) parts.push(page.intro);
  page.entries?.forEach((e) => {
    if (e.verdict) parts.push(e.verdict);
    e.pros?.forEach((p) => parts.push(`+ ${p}`));
    e.cons?.forEach((c) => parts.push(`- ${c}`));
  });
  if (page.outro) parts.push(page.outro);
  page.faqs?.forEach((faq) => { parts.push(`Q: ${faq.q}`); parts.push(`A: ${faq.a}`); });
  return parts.join('\n');
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="w-3 h-3 text-slate-300 ml-0.5" />;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-slate-600 ml-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-600 ml-0.5" />;
}

// ── Main dashboard ────────────────────────────────────────────────────────────

function CreatePageDropdown({ router }: { router: ReturnType<typeof useRouter> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" onClick={() => setOpen(o => !o)}
        className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Create Page</span>
        <ChevronDown className="w-3 h-3" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <button onClick={() => { setOpen(false); router.push('/admin/ai-create'); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
              <Sparkles className="w-4 h-4 text-sky-500 shrink-0" /> Tool Page
            </button>
            <button onClick={() => { setOpen(false); router.push('/admin/top-x-create'); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" /> Top X Page
            </button>
            <button onClick={() => { setOpen(false); router.push('/admin/comparison-create'); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100">
              <GitCompare className="w-4 h-4 text-teal-500 shrink-0" /> Tool Comparison
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tools, setTools] = useState<ToolPage[]>([]);
  const [topXPages, setTopXPages] = useState<TopXPage[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonPage[]>([]);
  const [lighthouseMap, setLighthouseMap] = useState<Record<string, LighthouseScore>>({});
  const [eeatMap, setEeatMap] = useState<Record<string, EeatScore>>({});
  const [pageViewMap, setPageViewMap] = useState<Record<string, PageViewStats>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  // Filters & sort
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'tool' | 'top_x' | 'comparison'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchData = useCallback(async () => {
    const [toolsRes, topXRes, compRes, lhRes, eeatRes, pvRes] = await Promise.all([
      supabase.from('tool_pages').select('*').order('updated_at', { ascending: false }),
      supabase.from('top_x_pages').select('id,slug,name,tagline,category,tool_ids,intro,outro,entries,faqs,meta_description,focus_keyword,status,noindex,created_at,updated_at,published_at').order('updated_at', { ascending: false }),
      supabase.from('tool_comparisons').select('id,slug,name,tagline,category,tool_ids,intro,verdict,outro,meta_description,focus_keyword,status,noindex,created_at,updated_at,published_at').order('updated_at', { ascending: false }),
      supabase.from('lighthouse_scores').select('page_id,strategy,performance,accessibility,best_practices,seo,raw_report,fetched_at').eq('strategy', 'mobile'),
      supabase.from('eeat_scores').select('page_id,overall_score,experience_score,expertise_score,authoritativeness_score,trustworthiness_score,strengths,weaknesses,missing_signals,improvements,analyzed_at'),
      supabase.from('page_views').select('page_id,visitor_hash'),
    ]);

    if (toolsRes.data) setTools(toolsRes.data as ToolPage[]);
    if (topXRes.data) setTopXPages(topXRes.data as TopXPage[]);
    if (compRes.data) setComparisons(compRes.data as ComparisonPage[]);

    if (lhRes.data) {
      const map: Record<string, LighthouseScore> = {};
      for (const row of lhRes.data as LighthouseScore[]) map[row.page_id] = row;
      setLighthouseMap(map);
    }

    if (eeatRes.data) {
      const map: Record<string, EeatScore> = {};
      for (const row of eeatRes.data as EeatScore[]) map[row.page_id] = row;
      setEeatMap(map);
    }

    if (pvRes.data) {
      const totalMap: Record<string, PageViewStats> = {};
      const uniqueMap: Record<string, Set<string>> = {};
      for (const row of pvRes.data as { page_id: string; visitor_hash: string }[]) {
        if (!totalMap[row.page_id]) totalMap[row.page_id] = { page_id: row.page_id, total_views: 0, unique_visitors: 0 };
        totalMap[row.page_id].total_views += 1;
        if (!uniqueMap[row.page_id]) uniqueMap[row.page_id] = new Set();
        uniqueMap[row.page_id].add(row.visitor_hash);
      }
      for (const [pid, set] of Object.entries(uniqueMap)) {
        if (totalMap[pid]) totalMap[pid].unique_visitors = set.size;
      }
      setPageViewMap(totalMap);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/admin/login'); return; }
      setUserEmail(session.user.email || '');
      fetchData();
    });
  }, [router, fetchData]);

  async function handleDelete(id: string) {
    await supabase.from('tool_pages').delete().eq('id', id);
    setTools((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleDeleteTopX(id: string) {
    await supabase.from('top_x_pages').delete().eq('id', id);
    setTopXPages((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleDeleteComparison(id: string) {
    await supabase.from('tool_comparisons').delete().eq('id', id);
    setComparisons((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleToggleNoindex(id: string, current: boolean, table: 'tool_pages' | 'top_x_pages' | 'tool_comparisons') {
    const next = !current;
    const { error } = await supabase.from(table).update({ noindex: next, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) {
      if (table === 'tool_pages') setTools((prev) => prev.map((t) => t.id === id ? { ...t, noindex: next } : t));
      else if (table === 'top_x_pages') setTopXPages((prev) => prev.map((t) => t.id === id ? { ...t, noindex: next } : t));
      else setComparisons((prev) => prev.map((c) => c.id === id ? { ...c, noindex: next } : c));
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  function handleLighthouseUpdate(score: LighthouseScore) {
    setLighthouseMap((prev) => ({ ...prev, [score.page_id]: score }));
  }

  function handleEeatUpdate(score: EeatScore) {
    setEeatMap((prev) => ({ ...prev, [score.page_id]: score }));
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  // ── Build unified rows ────────────────────────────────────────────────────

  const allRows: UnifiedRow[] = [
    ...tools.map((t): UnifiedRow => ({
      id: t.id, type: 'tool', slug: t.slug, name: t.name, tagline: t.tagline,
      category: t.category, status: t.status, noindex: t.noindex, badge: t.badge,
      created_at: t.created_at, updated_at: t.updated_at, published_at: t.published_at,
      toolData: t,
    })),
    ...topXPages.map((p): UnifiedRow => ({
      id: p.id, type: 'top_x', slug: p.slug, name: p.name, tagline: p.tagline,
      category: p.category, status: p.status, noindex: p.noindex, tool_count: p.tool_ids?.length || 0,
      created_at: p.created_at, updated_at: p.updated_at, published_at: p.published_at,
      topXData: p,
    })),
    ...comparisons.map((c): UnifiedRow => ({
      id: c.id, type: 'comparison', slug: c.slug, name: c.name, tagline: c.tagline,
      category: c.category, status: c.status, noindex: c.noindex, tool_count: c.tool_ids?.length || 0,
      created_at: c.created_at, updated_at: c.updated_at, published_at: c.published_at,
      comparisonData: c,
    })),
  ];

  // Filter
  const filtered = allRows.filter((row) => {
    if (typeFilter !== 'all' && row.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!row.name.toLowerCase().includes(q) && !row.slug.toLowerCase().includes(q) && !row.tagline?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    if (sortField === 'name') { aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); }
    else if (sortField === 'updated_at') { aVal = a.updated_at; bVal = b.updated_at; }
    else if (sortField === 'published_at') { aVal = a.published_at || ''; bVal = b.published_at || ''; }
    else if (sortField === 'views') { aVal = pageViewMap[a.id]?.total_views || 0; bVal = pageViewMap[b.id]?.total_views || 0; }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Stats
  const publishedCount = allRows.filter((r) => r.status === 'published').length;
  const totalViews = Object.values(pageViewMap).reduce((sum, s) => sum + s.total_views, 0);
  const totalUniqueVisitors = Object.values(pageViewMap).reduce((sum, s) => sum + s.unique_visitors, 0);

  // Active filter count for badge
  const activeFilters = [typeFilter !== 'all', categoryFilter !== 'all', statusFilter !== 'all', search.length > 0].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900">
                  <LayoutDashboard className="w-3.5 h-3.5 text-white" />
                </div>
                <h1 className="text-sm font-semibold text-slate-900">Admin Dashboard</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:block mr-1">{userEmail}</span>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/admin/categories')}>
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Categories</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/admin/prompts')}>
                  <MessageSquareCode className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Prompts</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/admin/authors')}>
                  <Users2 className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                  <span className="hidden sm:inline">Authors</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/admin/claims')}>
                  <BadgeCheck className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                  <span className="hidden sm:inline">Claims</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/admin/sitemap')}>
                  <Map className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Sitemap</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/admin/robots')}>
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Robots</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleSignOut}>
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Pages', value: allRows.length, sub: `${tools.length} Tool · ${topXPages.length} Top X · ${comparisons.length} Comparison`, icon: <FileText className="w-4 h-4 text-slate-500" />, iconBg: 'bg-slate-100', valueColor: 'text-slate-900' },
              { label: 'Published', value: publishedCount, sub: `${allRows.length - publishedCount} draft`, icon: <Globe className="w-4 h-4 text-emerald-600" />, iconBg: 'bg-emerald-50', valueColor: 'text-emerald-600' },
              { label: 'Page Views', value: totalViews.toLocaleString(), sub: 'All time', icon: <TrendingUp className="w-4 h-4 text-sky-600" />, iconBg: 'bg-sky-50', valueColor: 'text-sky-600' },
              { label: 'Unique Visitors', value: totalUniqueVisitors.toLocaleString(), sub: 'All time', icon: <Users2 className="w-4 h-4 text-teal-600" />, iconBg: 'bg-teal-50', valueColor: 'text-teal-600' },
            ].map((stat) => (
              <Card key={stat.label} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500 mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold tabular-nums ${stat.valueColor}`}>{stat.value}</p>
                      {stat.sub && <p className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</p>}
                    </div>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table card */}
          <Card className="border-0 shadow-sm bg-white overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex flex-col gap-3">
                {/* Top row: title + CTA buttons */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-semibold text-slate-900">All Pages</h2>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold tabular-nums">
                      {sorted.length}
                    </span>
                    {activeFilters > 0 && (
                      <button
                        onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); }}
                        className="text-[10px] text-sky-600 hover:text-sky-800 font-medium transition-colors"
                      >
                        Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CreatePageDropdown router={router} />
                    <Button size="sm" onClick={() => router.push('/admin/ai-create')}
                      className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5 hidden">
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">New Tool Page</span>
                    </Button>
                  </div>
                </div>

                {/* Second row: filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search pages…"
                      className="h-8 pl-8 text-xs border-slate-200 focus-visible:ring-slate-300"
                    />
                  </div>

                  <div className="w-px h-5 bg-slate-200 hidden sm:block" />

                  {/* Type filter */}
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                    <SelectTrigger className="h-8 text-xs w-auto min-w-[110px] border-slate-200 gap-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="tool">Tool Pages</SelectItem>
                      <SelectItem value="top_x">Top X Pages</SelectItem>
                      <SelectItem value="comparison">Comparisons</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status filter */}
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                    <SelectTrigger className="h-8 text-xs w-auto min-w-[110px] border-slate-200 gap-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Category filter */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 text-xs w-auto min-w-[130px] border-slate-200 gap-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="w-px h-5 bg-slate-200 hidden sm:block" />

                  {/* Sort */}
                  <Select value={`${sortField}:${sortDir}`} onValueChange={(v) => {
                    const [f, d] = v.split(':');
                    setSortField(f as SortField);
                    setSortDir(d as SortDir);
                  }}>
                    <SelectTrigger className="h-8 text-xs w-auto min-w-[140px] border-slate-200 gap-1.5">
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated_at:desc">Recently updated</SelectItem>
                      <SelectItem value="updated_at:asc">Oldest updated</SelectItem>
                      <SelectItem value="published_at:desc">Recently published</SelectItem>
                      <SelectItem value="name:asc">Name A–Z</SelectItem>
                      <SelectItem value="name:desc">Name Z–A</SelectItem>
                      <SelectItem value="views:desc">Most views</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Table */}
            {sorted.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                  <Sparkles className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  {allRows.length === 0 ? 'No pages yet' : 'No results match your filters'}
                </h3>
                <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                  {allRows.length === 0 ? 'Create your first tool page with AI to get started.' : 'Try adjusting the filters above.'}
                </p>
                {allRows.length === 0 && (
                  <Button onClick={() => router.push('/admin/ai-create')} className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create with AI
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-b border-slate-100">
                      <TableHead className="pl-5 py-2.5">
                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors">
                          Page <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</TableHead>
                      <TableHead className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</TableHead>
                      <TableHead className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <div className="flex items-center gap-1"><Zap className="w-3 h-3" />Lighthouse</div>
                      </TableHead>
                      <TableHead className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <div className="flex items-center gap-1"><Shield className="w-3 h-3" />E-E-A-T</div>
                      </TableHead>
                      <TableHead className="py-2.5">
                        <button onClick={() => toggleSort('views')} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors">
                          <TrendingUp className="w-3 h-3" />Views <SortIcon field="views" sortField={sortField} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <div className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />Clicks</div>
                      </TableHead>
                      <TableHead className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                      <TableHead className="py-2.5">
                        <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors">
                          Updated <SortIcon field="updated_at" sortField={sortField} sortDir={sortDir} />
                        </button>
                      </TableHead>
                      <TableHead className="py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-5">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((row) => {
                      const isTopX = row.type === 'top_x';
                      const isComparison = row.type === 'comparison';
                      const pv = pageViewMap[row.id];

                      return (
                        <TableRow key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">

                          {/* Page name + slug */}
                          <TableCell className="pl-5 py-3">
                            <div className="flex items-center gap-2.5 min-w-[200px]">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isTopX ? 'bg-amber-50' : isComparison ? 'bg-sky-50' : 'bg-slate-100'}`}>
                                {isTopX
                                  ? <Trophy className="w-3 h-3 text-amber-600" />
                                  : isComparison
                                  ? <GitCompare className="w-3 h-3 text-sky-600" />
                                  : <Zap className="w-3 h-3 text-slate-500" />
                                }
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-medium text-slate-900 truncate max-w-[200px] leading-snug">
                                    {row.name || 'Untitled'}
                                  </p>
                                  {!isTopX && !isComparison && row.badge && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide border ${
                                      row.badge === 'popular' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : row.badge === 'new' ? 'bg-sky-50 text-sky-700 border-sky-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>{row.badge}</span>
                                  )}
                                  {(isTopX || isComparison) && row.tool_count && (
                                    <span className="text-[9px] text-slate-400 font-medium">{row.tool_count} tools</span>
                                  )}
                                  {row.noindex && (
                                    <Tooltip>
                                      <TooltipTrigger><EyeOff className="w-3 h-3 text-slate-400" /></TooltipTrigger>
                                      <TooltipContent>Noindex</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] mt-0.5">
                                  {isComparison ? `/compare/${row.category}/${row.slug}` : `/category/${row.category}/${row.slug}`}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Type badge */}
                          <TableCell className="py-3">
                            {isTopX ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                                <Trophy className="w-2.5 h-2.5" />Top X
                              </span>
                            ) : isComparison ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 whitespace-nowrap">
                                <GitCompare className="w-2.5 h-2.5" />Compare
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200 whitespace-nowrap">
                                <Zap className="w-2.5 h-2.5" />Tool
                              </span>
                            )}
                          </TableCell>

                          {/* Category */}
                          <TableCell className="py-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${CATEGORY_COLORS[row.category] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {CATEGORY_LABELS[row.category] || row.category}
                            </span>
                          </TableCell>

                          {/* Lighthouse */}
                          <TableCell className="py-3">
                            {row.status === 'published' ? (
                              <LighthouseCell
                                pageId={row.id}
                                pageUrl={`/category/${row.category}/${row.slug}`}
                                pageName={row.name}
                                scores={lighthouseMap[row.id] || null}
                                onScanComplete={handleLighthouseUpdate}
                              />
                            ) : (
                              <span className="text-[10px] text-slate-300">Draft</span>
                            )}
                          </TableCell>

                          {/* E-E-A-T */}
                          <TableCell className="py-3">
                            <EeatCell
                              pageId={row.id}
                              pageTitle={row.name}
                              contentText={
                                isTopX && row.topXData ? buildTopXContent(row.topXData)
                                : isComparison && row.comparisonData
                                  ? [row.comparisonData.name, row.comparisonData.tagline, row.comparisonData.intro, row.comparisonData.verdict, row.comparisonData.outro].filter(Boolean).join('\n')
                                : !isTopX && !isComparison && row.toolData ? buildToolContent(row.toolData)
                                : row.name
                              }
                              metaDescription={
                                isTopX ? (row.topXData?.meta_description || '')
                                : isComparison ? (row.comparisonData?.meta_description || '')
                                : (row.toolData?.meta_description || '')
                              }
                              focusKeyword={
                                isTopX ? (row.topXData?.focus_keyword || '')
                                : isComparison ? (row.comparisonData?.focus_keyword || '')
                                : (row.toolData?.focus_keyword || '')
                              }
                              scores={eeatMap[row.id] || null}
                              onScanComplete={handleEeatUpdate}
                            />
                          </TableCell>

                          {/* Views */}
                          <TableCell className="py-3">
                            {pv ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-sky-400 shrink-0" />
                                  <span className="text-xs font-semibold text-slate-700 tabular-nums">{pv.total_views.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users2 className="w-3 h-3 text-teal-400 shrink-0" />
                                  <span className="text-[10px] text-slate-400 tabular-nums">{pv.unique_visitors.toLocaleString()} uniq</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300">—</span>
                            )}
                          </TableCell>

                          {/* Website clicks */}
                          <TableCell className="py-3">
                            {row.type === 'tool' && row.toolData?.website_clicks != null && row.toolData.website_clicks > 0 ? (
                              <div className="flex items-center gap-1">
                                <MousePointerClick className="w-3 h-3 text-sky-400 shrink-0" />
                                <span className="text-xs font-semibold text-slate-700 tabular-nums">{row.toolData.website_clicks.toLocaleString()}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300">—</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              row.status === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {row.status === 'published' ? <Globe className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                              {row.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                            {row.published_at && (
                              <p className="text-[9px] text-slate-400 mt-0.5 tabular-nums">{format(new Date(row.published_at), 'MMM d, yy')}</p>
                            )}
                          </TableCell>

                          {/* Updated */}
                          <TableCell className="py-3">
                            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{timeAgo(row.updated_at)}</span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 pr-5">
                            <div className="flex items-center justify-end gap-0.5">
                              {/* Edit */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 transition-opacity"
                                    onClick={() => router.push(
                                      isComparison ? `/admin/comparison-edit/${row.id}`
                                      : isTopX ? `/admin/top-x-edit/${row.id}`
                                      : `/admin/edit/${row.id}`
                                    )}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>

                              {/* View live */}
                              {row.status === 'published' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 transition-opacity"
                                      onClick={() => window.open(
                                        isComparison ? `/compare/${row.category}/${row.slug}` : `/category/${row.category}/${row.slug}`,
                                        '_blank'
                                      )}>
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View live</TooltipContent>
                                </Tooltip>
                              )}

                              {/* Settings */}
                              <Popover>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 transition-opacity">
                                        <Settings2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Settings</TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-56 p-3" align="end">
                                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Page Settings</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                      <div>
                                        <p className="text-xs font-medium text-slate-700">Noindex</p>
                                        <p className="text-[10px] text-slate-400 leading-tight">Hide from search engines</p>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={row.noindex}
                                      onCheckedChange={() => handleToggleNoindex(
                                        row.id, row.noindex,
                                        isComparison ? 'tool_comparisons' : isTopX ? 'top_x_pages' : 'tool_pages'
                                      )}
                                      className="scale-75"
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>

                              {/* Delete */}
                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-opacity">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {isComparison ? 'comparison' : isTopX ? 'Top X' : 'tool'} page?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete &ldquo;{row.name || 'Untitled'}&rdquo;. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => isComparison ? handleDeleteComparison(row.id) : isTopX ? handleDeleteTopX(row.id) : handleDelete(row.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </main>
      </div>
    </TooltipProvider>
  );
}
