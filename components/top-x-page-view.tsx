import Link from 'next/link';
import {
  Star,
  Users,
  Check,
  X,
  ChevronRight,
  ArrowUpRight,
  Trophy,
  TrendingUp,
  Sparkles,
  Crown,
  BadgeCheck,
  DollarSign,
  Flame,
} from 'lucide-react';
import { FaqSection } from '@/components/faq-accordion';
import { AuthorBlock, AUTHOR_SCHEMA, buildArticleSchema } from '@/components/author-block';
import { SiteHeader, PageBreadcrumb } from '@/components/site-header';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TopXTool {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  badge: string | null;
  rating: number;
  rating_count: string;
  users: string;
  features: { title: string; description: string }[];
  use_cases: string[];
  pricing: { plan: string; price: string; features: string[]; highlighted?: boolean }[];
}

export interface TopXEntry {
  tool_id: string;
  score: number;
  best_for: string;
  pros: string[];
  cons: string[];
  pricing_summary: string;
  verdict: string;
}

export interface ComparisonRow {
  tool_id: string;
  tool_name: string;
  starting_price: string;
  free_plan: boolean;
  rating: number;
  best_for: string;
  key_feature: string;
}

export interface BestForSegment {
  segment: string;
  label: string;
  tool_id: string;
  reason: string;
}

export interface TopXPageData {
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
  noindex: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  seo: 'SEO & Content',
  analytics: 'Analytics',
  developer: 'Developer Tools',
  marketing: 'Marketing',
  security: 'Security',
  design: 'Design',
  infrastructure: 'Infrastructure',
};

const BADGE_STYLES: Record<string, string> = {
  new: 'bg-sky-100 text-sky-700 border-sky-200',
  popular: 'bg-amber-100 text-amber-700 border-amber-200',
  free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const RANK_MEDAL = [
  { bg: 'bg-amber-400', text: 'text-white', ring: 'ring-amber-300', label: '🥇' },
  { bg: 'bg-slate-400', text: 'text-white', ring: 'ring-slate-300', label: '🥈' },
  { bg: 'bg-orange-400', text: 'text-white', ring: 'ring-orange-300', label: '🥉' },
];

const SEGMENT_ICONS: Record<string, typeof Crown> = {
  beginners: Sparkles,
  free: DollarSign,
  advanced: Flame,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRow({ rating, count }: { rating: number; count: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= Math.floor(rating)
                ? 'fill-amber-400 text-amber-400'
                : s - 0.5 <= rating
                ? 'fill-amber-200 text-amber-300'
                : 'fill-slate-100 text-slate-200'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-slate-800">{rating}</span>
      <span className="text-xs text-slate-400">({count})</span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
    score >= 75 ? 'text-sky-600 bg-sky-50 border-sky-200' :
    score >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-slate-500 bg-slate-50 border-slate-200';
  return (
    <div className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center shrink-0 ${color}`}>
      <span className="text-sm font-bold leading-none">{score}</span>
      <span className="text-[8px] uppercase tracking-wide opacity-70">score</span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  page: TopXPageData;
  tools: TopXTool[];
  categoryLabel: string;
  siteUrl: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TopXPageView({ page, tools, categoryLabel, siteUrl }: Props) {
  const pageUrl = `${siteUrl}/category/${page.category}/${page.slug}`;
  const toolMap = Object.fromEntries(tools.map((t) => [t.id, t]));

  // Ordered entries matched to tools
  const orderedEntries: { tool: TopXTool; entry: TopXEntry }[] = (page.tool_ids || [])
    .map((id) => {
      const tool = toolMap[id];
      const entry = (page.entries || []).find((e) => e.tool_id === id);
      if (!tool) return null;
      return { tool, entry: entry || { tool_id: id, score: Math.round(tool.rating * 20), best_for: '', pros: [], cons: [], pricing_summary: '', verdict: '' } };
    })
    .filter(Boolean) as { tool: TopXTool; entry: TopXEntry }[];

  const topTool = orderedEntries[0]?.tool;

  // ── JSON-LD ──
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: categoryLabel, item: `${siteUrl}/category/${page.category}` },
      { '@type': 'ListItem', position: 3, name: page.name, item: pageUrl },
    ],
  };

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.name,
    description: page.meta_description || page.tagline,
    url: pageUrl,
    numberOfItems: tools.length,
    itemListElement: orderedEntries.map(({ tool }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: tool.name,
      description: tool.tagline,
      url: `${siteUrl}/category/${tool.category}/${tool.slug}`,
    })),
  };

  const faqLd = page.faqs?.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null;

  const articleLd = buildArticleSchema({ headline: page.meta_title || page.name, pageUrl });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(AUTHOR_SCHEMA) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <SiteHeader />
      <PageBreadcrumb
        crumbs={[
          { label: categoryLabel, href: `/category/${page.category}` },
          { label: page.name },
        ]}
      />

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* ── HERO ── */}
        <section>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {categoryLabel}
                </span>
                <span className="text-xs text-slate-400">{tools.length} tools compared</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight mb-3">
                {page.name}
              </h1>
              {page.tagline && (
                <p className="text-base sm:text-lg text-slate-500 leading-relaxed">{page.tagline}</p>
              )}
            </div>
          </div>

          {/* Intro + top pick side by side on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {page.intro && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{page.intro}</p>
              </div>
            )}

            {/* Top pick card */}
            {topTool && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Our Top Pick</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-base mb-0.5">{topTool.name}</p>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{topTool.tagline}</p>
                </div>
                <StarRow rating={topTool.rating} count={topTool.rating_count} />
                <Link
                  href={`/category/${topTool.category}/${topTool.slug}`}
                  className="inline-flex items-center justify-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  View Full Review <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── QUICK NAV ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">Rankings at a Glance</h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
            {orderedEntries.map(({ tool, entry }, i) => {
              const medal = RANK_MEDAL[i];
              return (
                <Link
                  key={tool.id}
                  href={`/category/${tool.category}/${tool.slug}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${medal ? `${medal.bg} ${medal.text}` : 'bg-slate-100 text-slate-600'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-slate-900 text-sm">{tool.name}</span>
                      {tool.badge && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${BADGE_STYLES[tool.badge] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{entry.best_for || tool.tagline}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {entry.score > 0 && (
                      <div className="hidden sm:flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-700">{entry.score}</span>
                        <span className="text-[10px] text-slate-400">/100</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-slate-700">{tool.rating}</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── BEST FOR SEGMENTS ── */}
        {page.best_for?.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">Best For</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {page.best_for.map((seg) => {
                const tool = toolMap[seg.tool_id];
                const Icon = SEGMENT_ICONS[seg.segment] || BadgeCheck;
                if (!tool) return null;
                return (
                  <Link
                    key={seg.segment}
                    href={`/category/${tool.category}/${tool.slug}`}
                    className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{seg.label}</span>
                    </div>
                    <p className="font-bold text-slate-900 mb-1">{tool.name}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{seg.reason}</p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-slate-400 group-hover:text-slate-700 transition-colors font-medium">
                      View tool <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── DETAILED TOOL CARDS ── */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">Detailed Reviews</h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {orderedEntries.map(({ tool, entry }, i) => {
            const medal = RANK_MEDAL[i];
            return (
              <div key={tool.id} id={`tool-${i + 1}`} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all">

                {/* Card header */}
                <div className="p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    {/* Rank badge */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ring-2 ${medal ? `${medal.bg} ${medal.text} ${medal.ring}` : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                      #{i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-slate-900">{tool.name}</h3>
                        {i === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide border border-amber-200">
                            <Crown className="w-2.5 h-2.5" /> Editor's Choice
                          </span>
                        )}
                        {tool.badge && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${BADGE_STYLES[tool.badge] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mb-3 leading-relaxed">{tool.tagline}</p>
                      <div className="flex flex-wrap items-center gap-4">
                        <StarRow rating={tool.rating} count={tool.rating_count} />
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{tool.users}</span> users
                        </div>
                        {entry.best_for && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                            Best for: {entry.best_for}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-center gap-2 shrink-0">
                      {entry.score > 0 && <ScoreRing score={entry.score} />}
                      <Link
                        href={`/category/${tool.category}/${tool.slug}`}
                        className="inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors whitespace-nowrap"
                      >
                        Full Review <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Verdict */}
                  {entry.verdict && (
                    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Our Verdict</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{entry.verdict}</p>
                    </div>
                  )}
                </div>

                {/* Pros / Cons / Pricing */}
                <div className="border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                  {/* Pros */}
                  {entry.pros?.length > 0 && (
                    <div className="px-6 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-3">Pros</p>
                      <ul className="space-y-2">
                        {entry.pros.map((pro, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-600 leading-relaxed">{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cons */}
                  {entry.cons?.length > 0 && (
                    <div className="px-6 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-3">Cons</p>
                      <ul className="space-y-2">
                        {entry.cons.map((con, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-600 leading-relaxed">{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pricing + features */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Pricing</p>
                    {entry.pricing_summary ? (
                      <p className="text-sm font-semibold text-slate-800 mb-2">{entry.pricing_summary}</p>
                    ) : tool.pricing?.length > 0 ? (
                      <p className="text-sm font-semibold text-slate-800 mb-2">{tool.pricing[0].price}</p>
                    ) : null}
                    {tool.features?.slice(0, 3).map((f, j) => (
                      <div key={j} className="flex items-center gap-1.5 mb-1.5">
                        <Check className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-500">{f.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags + mobile CTA */}
                <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {tool.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <Link
                    href={`/category/${tool.category}/${tool.slug}`}
                    className="sm:hidden shrink-0 inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Review <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── COMPARISON TABLE ── */}
        {page.comparison_table?.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">Side-by-Side Comparison</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Tool</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Starting Price</th>
                      <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Free Plan</th>
                      <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Rating</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Best For</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Key Feature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {page.comparison_table.map((row, i) => {
                      const tool = toolMap[row.tool_id];
                      return (
                        <tr key={row.tool_id} className={`group hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-amber-50/40' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                              <div>
                                <Link
                                  href={tool ? `/category/${tool.category}/${tool.slug}` : '#'}
                                  className="font-semibold text-sm text-slate-900 hover:text-slate-600 transition-colors"
                                >
                                  {row.tool_name}
                                </Link>
                                {i === 0 && <span className="ml-1.5 text-[9px] text-amber-600 font-bold uppercase">#1 Pick</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-semibold text-slate-800">{row.starting_price}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {row.free_plan
                              ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                              : <X className="w-4 h-4 text-slate-300 mx-auto" />
                            }
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-sm font-bold text-slate-800">{row.rating}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{row.best_for}</span>
                          </td>
                          <td className="px-4 py-3.5 hidden lg:table-cell">
                            <span className="text-xs text-slate-500">{row.key_feature}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── OUTRO / VERDICT ── */}
        {page.outro && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Final Verdict</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">{page.outro}</p>
            {topTool && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Our #1 recommendation</p>
                  <p className="font-bold text-slate-900">{topTool.name}</p>
                </div>
                <Link
                  href={`/category/${topTool.category}/${topTool.slug}`}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  See Full Review <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </section>
        )}

        {/* ── FAQ ── */}
        {page.faqs?.length > 0 && <FaqSection faqs={page.faqs} />}

        {/* ── AUTHOR ── */}
        <div className="bg-white border border-slate-200 rounded-2xl px-6">
          <AuthorBlock />
        </div>

        {/* ── BACK LINK ── */}
        <div className="text-center pb-4">
          <Link
            href={`/category/${page.category}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            All {categoryLabel} tools
          </Link>
        </div>

      </div>
    </div>
  );
}
