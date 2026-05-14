import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import { FaqSection } from '@/components/faq-accordion';
import { AuthorBlock, AUTHOR_SCHEMA, buildArticleSchema } from '@/components/author-block';
import { InnerHeader } from '@/components/site-header';
import {
  Star,
  Check,
  X,
  ChevronRight,
  Crown,
  ArrowUpRight,
  Minus,
} from 'lucide-react';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComparisonSection {
  title: string;
  dimension: string;
  tool_a_value: string;
  tool_b_value: string;
  winner_id: string | null;
  notes: string;
}

interface FeatureMatrixRow {
  feature: string;
  tool_a: string;
  tool_b: string;
  winner_id: string | null;
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

interface UseCaseWinner {
  use_case: string;
  winner_id: string;
  reason: string;
}

interface ComparisonPage {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  tool_ids: string[];
  intro: string;
  verdict: string;
  outro: string;
  sections: ComparisonSection[];
  feature_matrix: FeatureMatrixRow[];
  tool_a_entry: ToolEntry;
  tool_b_entry: ToolEntry;
  use_case_winners: UseCaseWinner[];
  faqs: { q: string; a: string }[];
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  noindex: boolean;
  published_at: string | null;
  updated_at: string;
}

interface ToolData {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  badge: string | null;
  rating: number;
  rating_count: string;
  users: string;
  pricing: { plan: string; price: string; features: string[] }[];
  official_website?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  seo: 'SEO & Content',
  analytics: 'Analytics',
  developer: 'Developer Tools',
  marketing: 'Marketing',
  security: 'Security',
  design: 'Design',
  infrastructure: 'Infrastructure',
};

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function getComparison(slug: string, category: string): Promise<ComparisonPage | null> {
  const { data } = await supabaseServer
    .from('tool_comparisons')
    .select('*')
    .eq('slug', slug)
    .eq('category', category)
    .eq('status', 'published')
    .maybeSingle();
  if (data) return data as ComparisonPage;
  // Fallback: slug only (category may differ)
  const { data: fallback } = await supabaseServer
    .from('tool_comparisons')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return (fallback as ComparisonPage) ?? null;
}

async function getTools(ids: string[]): Promise<ToolData[]> {
  if (!ids.length) return [];
  const { data } = await supabaseServer
    .from('tool_pages')
    .select('id, slug, name, tagline, category, badge, rating, rating_count, users, pricing, official_website')
    .in('id', ids);
  if (!data) return [];
  return ids
    .map((id) => (data as ToolData[]).find((t) => t.id === id))
    .filter(Boolean) as ToolData[];
}

// ── JSON-LD ───────────────────────────────────────────────────────────────────

function buildComparisonJsonLd(comp: ComparisonPage, toolA: ToolData, toolB: ToolData) {
  const pageUrl = `${SITE_URL}/compare/${comp.category}/${comp.slug}`;
  const categoryLabel = CATEGORY_LABELS[comp.category] || comp.category;

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: comp.meta_title || comp.name,
    description: comp.meta_description || comp.tagline,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'ToolKit', url: SITE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: categoryLabel, item: `${SITE_URL}/category/${comp.category}` },
        { '@type': 'ListItem', position: 3, name: comp.name, item: pageUrl },
      ],
    },
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: comp.name,
    description: comp.tagline,
    url: pageUrl,
    numberOfItems: 2,
    itemListElement: [toolA, toolB].map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      url: `${SITE_URL}/category/${t.category}/${t.slug}`,
    })),
  };

  const items: object[] = [webPage, itemList];

  if (comp.faqs.length > 0) {
    items.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: comp.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    });
  }

  items.push(
    buildArticleSchema({ headline: comp.meta_title || comp.name, pageUrl }),
    AUTHOR_SCHEMA,
  );

  return items;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string };
}): Promise<Metadata> {
  const comp = await getComparison(params.slug, params.category);
  if (!comp) return { title: 'Not Found' };

  const pageUrl = `${SITE_URL}/compare/${comp.category}/${comp.slug}`;
  const title = comp.meta_title || comp.name;
  const description = comp.meta_description || comp.tagline;

  return {
    title,
    description,
    robots: { index: !comp.noindex, follow: true },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      siteName: 'ToolKit',
      images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [`${SITE_URL}/og-default.png`] },
    alternates: { canonical: pageUrl },
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function JsonLdScripts({ items }: { items: object[] }) {
  return (
    <>
      {items.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${
            s <= Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : s - 0.5 <= rating
              ? 'fill-amber-200 text-amber-300'
              : 'text-slate-200 fill-slate-200'
          }`}
        />
      ))}
      <span className="text-sm font-semibold text-slate-800 ml-1">{rating}</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
    : score >= 70 ? 'border-amber-300 bg-amber-50 text-amber-700'
    : 'border-red-300 bg-red-50 text-red-600';
  return (
    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shrink-0 ${color}`}>
      <span className="text-xl font-bold">{score}</span>
    </div>
  );
}

function WinnerBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Crown className="w-2.5 h-2.5" />
      {name} wins
    </span>
  );
}

function TieBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
      <Minus className="w-2.5 h-2.5" />
      Tie
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ComparisonPage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const comp = await getComparison(params.slug, params.category);
  if (!comp) notFound();

  const categoryLabel = CATEGORY_LABELS[comp.category] || comp.category;
  const toolIds: string[] = Array.isArray(comp.tool_ids) ? comp.tool_ids : [];
  const tools = await getTools(toolIds);

  const toolA = tools[0];
  const toolB = tools[1];

  if (!toolA || !toolB) notFound();

  const entryA = comp.tool_a_entry;
  const entryB = comp.tool_b_entry;

  const jsonLdItems = buildComparisonJsonLd(comp, toolA, toolB);

  const reviewedDate = comp.published_at
    ? new Date(comp.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : undefined;

  return (
    <>
      <JsonLdScripts items={jsonLdItems} />
      <InnerHeader
        crumbs={[
          { label: 'Home', href: '/' },
          { label: categoryLabel, href: `/category/${comp.category}` },
          { label: comp.name },
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* Hero */}
        <section>
          <div className="text-center space-y-3 mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Link href={`/category/${comp.category}`} className="hover:text-slate-800 transition-colors">
                {categoryLabel}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span>Comparison</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">{comp.name}</h1>
            {comp.tagline && <p className="text-lg text-slate-500 max-w-2xl mx-auto">{comp.tagline}</p>}
          </div>

          {/* Tool vs. cards */}
          <div className="grid grid-cols-2 gap-4 sm:gap-8 max-w-2xl mx-auto">
            {[
              { tool: toolA, entry: entryA },
              { tool: toolB, entry: entryB },
            ].map(({ tool, entry }) => (
              <div key={tool.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-600">{tool.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{tool.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{tool.tagline}</p>
                </div>
                <StarRating rating={tool.rating} />
                {entry?.score != null && <ScoreBadge score={entry.score} />}
                {entry?.best_for && (
                  <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                    Best for: {entry.best_for}
                  </span>
                )}
                <Link
                  href={`/category/${tool.category}/${tool.slug}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 transition-colors"
                >
                  View {tool.name} <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Introduction */}
        {comp.intro && (
          <section id="intro">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-slate-900">Overview</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <p className="text-slate-600 leading-relaxed text-base">{comp.intro}</p>
          </section>
        )}

        {/* Tool analysis cards */}
        {(entryA || entryB) && (
          <section id="tool-analysis">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-900">Tool Breakdown</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { tool: toolA, entry: entryA },
                { tool: toolB, entry: entryB },
              ].map(({ tool, entry }) => {
                if (!entry) return null;
                return (
                  <div key={tool.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 text-lg">{tool.name}</p>
                        {entry.best_for && (
                          <p className="text-xs text-slate-500 mt-0.5">Best for: {entry.best_for}</p>
                        )}
                      </div>
                      {entry.score != null && <ScoreBadge score={entry.score} />}
                    </div>

                    {entry.pricing_summary && (
                      <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        {entry.pricing_summary}
                      </p>
                    )}

                    {entry.pros && entry.pros.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Pros</p>
                        <ul className="space-y-1.5">
                          {entry.pros.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entry.cons && entry.cons.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Cons</p>
                        <ul className="space-y-1.5">
                          {entry.cons.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entry.verdict && (
                      <p className="text-sm text-slate-600 italic border-t border-slate-100 pt-3">{entry.verdict}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Head-to-head sections */}
        {comp.sections && comp.sections.length > 0 && (
          <section id="head-to-head">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-900">Head-to-Head</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="space-y-4">
              {comp.sections.map((section, i) => {
                const winnerTool =
                  section.winner_id === toolA.id ? toolA
                  : section.winner_id === toolB.id ? toolB
                  : null;
                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-semibold text-slate-900 text-sm">{section.title}</h3>
                      {winnerTool ? <WinnerBadge name={winnerTool.name} /> : <TieBadge />}
                    </div>
                    <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                      {[
                        { tool: toolA, value: section.tool_a_value },
                        { tool: toolB, value: section.tool_b_value },
                      ].map(({ tool, value }) => (
                        <div key={tool.id} className="p-5">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{tool.name}</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
                        </div>
                      ))}
                    </div>
                    {section.notes && (
                      <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                        <p className="text-xs text-amber-800">{section.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Feature matrix */}
        {comp.feature_matrix && comp.feature_matrix.length > 0 && (
          <section id="feature-matrix">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-900">Feature Comparison</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 w-1/4">Feature</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 w-[30%]">{toolA.name}</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 w-[30%]">{toolB.name}</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comp.feature_matrix.map((row, i) => {
                      const winnerTool =
                        row.winner_id === toolA.id ? toolA
                        : row.winner_id === toolB.id ? toolB
                        : null;
                      return (
                        <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{row.feature}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{row.tool_a}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{row.tool_b}</td>
                          <td className="px-5 py-3.5 text-center">
                            {winnerTool ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Crown className="w-2.5 h-2.5" />
                                {winnerTool.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <Minus className="w-2.5 h-2.5" />
                                Tie
                              </span>
                            )}
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

        {/* Use-case winners */}
        {comp.use_case_winners && comp.use_case_winners.length > 0 && (
          <section id="use-cases">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-slate-900">Best For</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {comp.use_case_winners.map((uc, i) => {
                const winnerTool =
                  uc.winner_id === toolA.id ? toolA
                  : uc.winner_id === toolB.id ? toolB
                  : null;
                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                      <Crown className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{uc.use_case}</p>
                      {winnerTool && (
                        <p className="text-xs text-sky-700 font-medium mt-0.5">{winnerTool.name}</p>
                      )}
                      {uc.reason && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{uc.reason}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Verdict */}
        {comp.verdict && (
          <section id="verdict">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-slate-900">Our Verdict</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
              <p className="text-base leading-relaxed text-slate-200">{comp.verdict}</p>
            </div>
          </section>
        )}

        {/* FAQ */}
        {comp.faqs && comp.faqs.length > 0 && (
          <FaqSection faqs={comp.faqs} />
        )}

        {/* Outro */}
        {comp.outro && (
          <section id="outro">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-slate-900">Conclusion</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <p className="text-slate-600 leading-relaxed text-base">{comp.outro}</p>
          </section>
        )}

        {/* CTA: view both tool pages */}
        <section className="grid sm:grid-cols-2 gap-4">
          {[toolA, toolB].map((tool) => (
            <Link
              key={tool.id}
              href={`/category/${tool.category}/${tool.slug}`}
              className="group flex items-center justify-between gap-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl px-5 py-4 transition-all hover:shadow-md"
            >
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Explore tool</p>
                <p className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">{tool.name}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors shrink-0" />
            </Link>
          ))}
        </section>

        {/* Author */}
        <AuthorBlock reviewedOn={reviewedDate ? `Reviewed on ${reviewedDate}` : undefined} />
      </main>
    </>
  );
}
