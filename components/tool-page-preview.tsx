'use client';

import { useState } from 'react';
import {
  Star,
  Users,
  Check,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PreviewData {
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
}

const CATEGORY_LABELS: Record<string, string> = {
  seo: 'SEO & Content',
  analytics: 'Analytics',
  developer: 'Developer',
  marketing: 'Marketing',
  security: 'Security',
  design: 'Design',
  infrastructure: 'Infrastructure',
};

function BadgePill({ badge }: { badge: string }) {
  const styles: Record<string, string> = {
    new: 'bg-sky-100 text-sky-700 border-sky-200',
    popular: 'bg-amber-100 text-amber-700 border-amber-200',
    free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${styles[badge] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {badge}
    </span>
  );
}

function PreviewStarRating({ rating, count }: { rating: number; count: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3 h-3 ${s <= Math.floor(rating) ? 'fill-amber-400 text-amber-400' : s - 0.5 <= rating ? 'fill-amber-200 text-amber-300' : 'text-slate-200 fill-slate-200'}`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-800">{rating}</span>
      <span className="text-xs text-slate-400">({count})</span>
    </div>
  );
}

function PreviewFaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-900 text-xs">{q}</span>
        {open ? <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-3.5 pb-2.5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
          {a}
        </div>
      )}
    </div>
  );
}

export function ToolPagePreview({ data }: { data: PreviewData }) {
  return (
    <div className="bg-slate-50 min-h-full">
      {/* Simulated header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-full px-4 sm:px-5">
          <div className="flex items-center justify-between h-10">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-xs text-slate-900 font-medium truncate max-w-[200px]">{data.name || 'Tool Name'}</span>
            </div>
            <button className="inline-flex items-center gap-1 bg-slate-900 text-white text-[10px] font-medium px-2.5 py-1 rounded-md">
              Get Started
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-5 space-y-5">
        {/* Hero */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-700">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{data.name || 'Tool Name'}</h1>
                  {data.badge && <BadgePill badge={data.badge} />}
                </div>
                <p className="text-sm text-slate-500 mb-2">{data.tagline || 'Tagline goes here'}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <PreviewStarRating rating={data.rating || 0} count={data.ratingCount || '0'} />
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="font-medium text-slate-700">{data.users || '0'}</span> users
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium capitalize">
                    {CATEGORY_LABELS[data.category] || data.category || 'Category'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg">
                <Zap className="w-3 h-3" />
                Try Free
              </button>
              <button className="inline-flex items-center gap-1.5 border border-slate-200 text-slate-700 text-xs font-medium px-3.5 py-2 rounded-lg">
                <ExternalLink className="w-3 h-3" />
                Docs
              </button>
            </div>

            {/* Tags */}
            {data.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {data.tags.filter(Boolean).map((tag, i) => (
                  <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {data.stats?.filter((s) => s.value || s.label).length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {data.stats.filter((s) => s.value || s.label).map((stat, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-base sm:text-lg font-bold text-slate-900">{stat.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">About {data.name || 'this tool'}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{data.longDescription || data.description || 'Description goes here.'}</p>

          {data.useCases?.filter(Boolean).length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Common use cases</p>
              <div className="flex flex-wrap gap-1.5">
                {data.useCases.filter(Boolean).map((uc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-full">
                    <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                    {uc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        {data.features?.filter((f) => f.title || f.description).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-900">Features</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.features.filter((f) => f.title || f.description).map((f, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 transition-all">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-slate-100 text-slate-700">
                      <Check className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs mb-0.5">{f.title}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        {data.pricing?.filter((p) => p.plan || p.price).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-900">Pricing</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className={`grid gap-2 ${data.pricing.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {data.pricing.filter((p) => p.plan || p.price).map((plan, i) => (
                <div
                  key={i}
                  className={`relative bg-white rounded-xl border p-4 flex flex-col transition-all ${
                    plan.highlighted
                      ? 'border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'border-slate-200'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="bg-slate-900 text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                        Most popular
                      </span>
                    </div>
                  )}
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{plan.plan}</p>
                    <p className="text-xl font-bold text-slate-900">{plan.price}</p>
                  </div>
                  <ul className="space-y-1.5 mb-3 flex-1">
                    {plan.features?.filter(Boolean).map((f, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 text-slate-700'
                    }`}
                  >
                    Get {plan.plan}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        {data.faqs?.filter((f) => f.q || f.a).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-900">FAQ</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="space-y-1.5">
              {data.faqs.filter((f) => f.q || f.a).map((faq, i) => (
                <PreviewFaqItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
