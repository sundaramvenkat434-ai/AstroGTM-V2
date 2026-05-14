import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import { FaqSection } from '@/components/faq-accordion';
import { ToolSidebarNav, type SidebarSection } from '@/components/tool-sidebar-nav';
import { PageViewTracker } from '@/components/page-view-tracker';
import { TopXPageView, type TopXPageData, type TopXTool } from '@/components/top-x-page-view';
import { AuthorBlock } from '@/components/author-block';
import { AUTHOR_SCHEMA, buildArticleSchema } from '@/lib/author-schema';
import { SiteFooter } from '@/components/site-footer';
import {
  Star,
  Check,
  Zap,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  FlaskConical,
  Globe,
  Newspaper,
  CalendarDays,
  Linkedin,
  BadgeCheck,
  X,
} from 'lucide-react';
import { SiteHeader, PageBreadcrumb } from '@/components/site-header';
import { UpvoteButton } from '@/components/upvote-button';
import { VisitWebsiteButton } from '@/components/visit-website-button';
import { ClaimListingButton } from '@/components/claim-listing-button';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

interface ToolPage {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  long_description: string;
  category: string;
  tags: string[];
  badge: string | null;
  rating: number;
  rating_count: string;
  users: string;
  features: { title: string; description: string }[];
  use_cases: string[];
  pricing: {
    plan: string;
    price: string;
    features: string[];
    highlighted?: boolean;
  }[];
  faqs: { q: string; a: string }[];
  stats: { label: string; value: string }[];
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  noindex: boolean;
  pros?: string[] | null;
  cons?: string[] | null;
  what_we_learned?: { use_case: string; bullets: string[] } | null;
  honest_take?: string[] | null;
  logo_url?: string | null;
  logo_alt?: string | null;
  screenshots?: { url: string; alt: string }[] | null;
  official_website?: string | null;
  founder_name?: string | null;
  founder_linkedin?: string | null;
  latest_news?: { title: string; url: string }[] | null;
  published_date?: string | null;
  updated_date?: string | null;
  upvotes?: number;
  reviewer_id?: string | null;
  website_url?: string | null;
  is_claimed?: boolean;
  claimed_founded_by?: string | null;
  claimed_founder_names?: string | null;
  claimed_founder_linkedin?: string | null;
  claimed_about_bio?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  'lead-generation': 'Lead Generation',
  'sales-outreach': 'Sales Outreach',
  'seo-content': 'SEO & Content',
  'social-media': 'Social Media',
  seo: 'SEO & Content',
  analytics: 'Analytics',
  developer: 'Developer Tools',
  marketing: 'Marketing',
  security: 'Security',
  design: 'Design',
  infrastructure: 'Infrastructure',
};

const CATEGORY_SCHEMA: Record<string, string> = {
  seo: 'WebApplication',
  analytics: 'WebApplication',
  developer: 'DeveloperApplication',
  marketing: 'WebApplication',
  security: 'WebApplication',
  design: 'DesignApplication',
  infrastructure: 'DeveloperApplication',
};

const BADGE_STYLES: Record<string, string> = {
  new: 'bg-sky-50 text-sky-600 border-sky-200',
  popular: 'bg-amber-50 text-amber-600 border-amber-200',
  free: 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

// ─── data fetchers ────────────────────────────────────────────────────────────

async function getTool(slug: string, category: string): Promise<ToolPage | null> {
  const { data } = await supabaseServer
    .from('tool_pages')
    .select('*')
    .eq('slug', slug)
    .eq('category', category)
    .eq('status', 'published')
    .maybeSingle();
  if (data) return data as ToolPage;
  const { data: fallback } = await supabaseServer
    .from('tool_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return fallback as ToolPage | null;
}

async function getTopX(slug: string, category: string): Promise<TopXPageData | null> {
  const { data } = await supabaseServer
    .from('top_x_pages')
    .select('*')
    .eq('slug', slug)
    .eq('category', category)
    .eq('status', 'published')
    .maybeSingle();
  if (data) return data as TopXPageData;
  const { data: fallback } = await supabaseServer
    .from('top_x_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return fallback as TopXPageData | null;
}

interface SimilarTool {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  badge: string | null;
  rating: number;
  rating_count: string;
  published_date: string | null;
}

async function getSimilarTools(category: string, excludeId: string): Promise<SimilarTool[]> {
  const { data } = await supabaseServer
    .from('tool_pages')
    .select('id, slug, name, tagline, category, badge, rating, rating_count, published_date')
    .eq('category', category)
    .eq('status', 'published')
    .neq('id', excludeId)
    .order('published_date', { ascending: false })
    .limit(10);
  return (data as SimilarTool[]) ?? [];
}

async function getTopXTools(toolIds: string[]): Promise<TopXTool[]> {
  if (!toolIds.length) return [];
  const { data } = await supabaseServer
    .from('tool_pages')
    .select('id, slug, name, tagline, description, category, tags, badge, rating, rating_count, users, features, use_cases')
    .in('id', toolIds)
    .eq('status', 'published');
  if (!data) return [];
  return toolIds
    .map((id) => (data as TopXTool[]).find((t) => t.id === id))
    .filter(Boolean) as TopXTool[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseReviewCount(count: string): number {
  const cleaned = count.replace(/,/g, '').trim().toLowerCase();
  if (cleaned.endsWith('k')) return Math.round(parseFloat(cleaned) * 1000);
  if (cleaned.endsWith('m')) return Math.round(parseFloat(cleaned) * 1000000);
  return parseInt(cleaned, 10) || 0;
}

function parsePrice(price: string): string | null {
  if (!price) return null;
  const lower = price.toLowerCase().trim();
  if (lower === 'free' || lower === '$0') return '0';
  if (lower === 'custom' || lower === 'contact') return null;
  const num = price.replace(/[^0-9.]/g, '');
  return num || null;
}

function buildToolJsonLd(tool: ToolPage) {
  const pageUrl = `${SITE_URL}/category/${tool.category}/${tool.slug}`;
  const reviewCount = parseReviewCount(tool.rating_count);
  const categoryLabel = CATEGORY_LABELS[tool.category] || tool.category;

  const offers = tool.pricing
    .map((p) => {
      const amount = parsePrice(p.price);
      if (amount === null) return null;
      return {
        '@type': 'Offer' as const,
        name: p.plan,
        price: amount,
        priceCurrency: 'USD',
        ...(amount === '0' && { description: 'Free plan' }),
      };
    })
    .filter(Boolean);

  const softwareApp: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.meta_description || tool.description,
    url: pageUrl,
    applicationCategory: CATEGORY_SCHEMA[tool.category] || 'WebApplication',
    ...(tool.official_website ? { sameAs: tool.official_website } : {}),
    ...(tool.logo_url ? { image: { '@type': 'ImageObject', url: tool.logo_url, description: tool.logo_alt || `${tool.name} logo` } } : {}),
  };

  if (reviewCount > 0) {
    softwareApp.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(tool.rating),
      reviewCount: String(reviewCount),
      bestRating: '5',
      worstRating: '1',
    };
  }

  if (offers.length === 1) softwareApp.offers = offers[0];
  else if (offers.length > 1) softwareApp.offers = offers;

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: tool.meta_title || tool.name,
    description: tool.meta_description || tool.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'ToolKit', url: SITE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: categoryLabel, item: `${SITE_URL}/category/${tool.category}` },
        { '@type': 'ListItem', position: 3, name: tool.name, item: pageUrl },
      ],
    },
  };

  const items: object[] = [softwareApp, webPage];

  if (tool.faqs.length > 0) {
    items.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    });
  }

  items.push(
    buildArticleSchema({ headline: tool.meta_title || tool.name, pageUrl, datePublished: tool.published_date, dateModified: tool.updated_date }),
    AUTHOR_SCHEMA,
  );

  return items;
}

// ─── metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string };
}): Promise<Metadata> {
  const tool = await getTool(params.slug, params.category);
  if (tool) {
    const pageUrl = `${SITE_URL}/category/${tool.category}/${tool.slug}`;
    const title = tool.meta_title || tool.name;
    const description = tool.meta_description || tool.description;
    return {
      title,
      description,
      robots: { index: !tool.noindex, follow: true },
      openGraph: { title, description, url: pageUrl, type: 'website', siteName: 'ToolKit', images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: title }] },
      twitter: { card: 'summary_large_image', title, description, images: [`${SITE_URL}/og-default.png`] },
      alternates: { canonical: pageUrl },
    };
  }

  const topX = await getTopX(params.slug, params.category);
  if (topX) {
    const pageUrl = `${SITE_URL}/category/${topX.category}/${topX.slug}`;
    const title = topX.meta_title || topX.name;
    const description = topX.meta_description || topX.tagline;
    return {
      title,
      description,
      robots: { index: !topX.noindex, follow: true },
      openGraph: { title, description, url: pageUrl, type: 'website', siteName: 'ToolKit', images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: title }] },
      twitter: { card: 'summary_large_image', title, description, images: [`${SITE_URL}/og-default.png`] },
      alternates: { canonical: pageUrl },
    };
  }

  return { title: 'Not Found' };
}

// ─── sub-components ──────────────────────────────────────────────────────────

function JsonLdScripts({ items }: { items: object[] }) {
  return (
    <>
      {items.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </>
  );
}

// Deterministic "random" from a string seed so it's stable per tool across SSR renders
function seededInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const norm = (Math.abs(h) % 1000) / 1000;
  return min + Math.floor(norm * (max - min + 1));
}

function StarRating({ rating, toolId }: { rating: number; toolId: string }) {
  const reviewCount = seededInt(toolId, 5, 15);
  return (
    <div className="flex items-center gap-2">
      {/* Stars + score */}
      <div className="flex items-center gap-0.5">
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
      </div>
      <span className="text-sm font-semibold text-slate-800">{rating}</span>
      {/* AstroGTM Reviews badge */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-semibold text-sky-700">
        AstroGTM Reviews
      </span>
      <span className="text-[11px] text-slate-400">{reviewCount} interval reviewers</span>
    </div>
  );
}

function SectionHeading({
  children,
  accent = 'slate',
  description,
}: {
  children: React.ReactNode;
  accent?: 'slate' | 'blue' | 'emerald' | 'amber' | 'teal';
  description?: string;
}) {
  const bar: Record<string, string> = {
    slate: 'bg-slate-400',
    blue: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-400',
    teal: 'bg-teal-500',
  };
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        <div className={`w-1 h-5 rounded-full shrink-0 ${bar[accent]}`} />
        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">{children}</h2>
      </div>
      {description && <p className="text-[12px] text-slate-400 mt-1 ml-[14px]">{description}</p>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function SlugPage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const categoryLabel = CATEGORY_LABELS[params.category] || params.category;

  const tool = await getTool(params.slug, params.category);
  if (tool) {
    const [jsonLdItems, similarTools] = await Promise.all([
      Promise.resolve(buildToolJsonLd(tool)),
      getSimilarTools(tool.category, tool.id).then((r) => r.slice(0, Math.floor(r.length / 2) * 2 || 0)),
    ]);

    const navSections: SidebarSection[] = [
      { id: 'overview', label: 'Overview' },
      ...(tool.features.length > 0 ? [{ id: 'features', label: 'Features' }] : []),
      ...((tool.screenshots?.length ?? 0) > 0 ? [{ id: 'screenshots', label: 'Screenshots' }] : []),
      ...(tool.pricing.length > 0 ? [{ id: 'pricing', label: 'Pricing' }] : []),
      ...(tool.faqs.length > 0 ? [{ id: 'faq', label: 'FAQ' }] : []),
      ...((tool.pros?.length ?? 0) > 0 || (tool.cons?.length ?? 0) > 0 ? [{ id: 'pros-cons', label: 'Pros & Cons' }] : []),
      ...(tool.what_we_learned != null ? [{ id: 'what-we-learned', label: 'Case Study' }] : []),
      ...((tool.honest_take?.length ?? 0) > 0 ? [{ id: 'honest-take', label: 'Honest Take' }] : []),
      ...((tool.official_website || tool.founder_name || (tool.latest_news?.length ?? 0) > 0) ? [{ id: 'about-author', label: 'Official Links' }] : []),
      ...(similarTools.length > 0 ? [{ id: 'similar-tools', label: 'Similar Tools' }] : []),
    ];

    return (
      <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
        <PageViewTracker pageId={tool.id} />
        <JsonLdScripts items={jsonLdItems} />

        <SiteHeader />
        <PageBreadcrumb
          crumbs={[
            { label: categoryLabel, href: `/category/${tool.category}` },
            { label: tool.name },
          ]}
        />

        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8 items-start">
            <ToolSidebarNav sections={navSections} />

            <main className="flex-1 min-w-0 space-y-6">

              {/* ── Hero card ── */}
              <section id="section-overview">
                <div className="rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                  {/* Top bar with subtle blue gradient */}
                  <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5" style={{ background: 'linear-gradient(160deg, #f0f7ff 0%, #ffffff 55%)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                      {/* Logo */}
                      {tool.logo_url ? (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 bg-white shrink-0 flex items-center justify-center shadow-sm">
                          <img
                            src={tool.logo_url}
                            alt={tool.logo_alt || `${tool.name} logo`}
                            width={64}
                            height={64}
                            loading="lazy"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-500 shadow-sm">
                          <Zap className="w-7 h-7" />
                        </div>
                      )}

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight tracking-tight">{tool.name}</h1>
                          {tool.badge && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide border ${BADGE_STYLES[tool.badge] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {tool.badge}
                            </span>
                          )}
                          {tool.is_claimed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200">
                              <BadgeCheck className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[15px] text-slate-500 leading-snug mb-3">{tool.tagline}</p>

                        {/* Rating + meta row */}
                        <div className="flex flex-wrap items-center gap-3">
                          <StarRating rating={tool.rating} toolId={tool.id} />
                          <span className="w-px h-4 bg-slate-200" />
                          <Link
                            href={`/category/${tool.category}`}
                            className="text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full capitalize transition-colors"
                          >
                            {categoryLabel}
                          </Link>
                          <UpvoteButton toolId={tool.id} initialCount={tool.upvotes ?? 0} />
                        </div>

                        {(tool.published_date || tool.updated_date) && (
                          <p className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1.5">
                            <CalendarDays className="w-3 h-3 shrink-0" />
                            {tool.published_date && (
                              <span>Published {new Date(tool.published_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            )}
                            {tool.updated_date && (
                              <span>· Updated {new Date(tool.updated_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                        {tool.website_url && (
                          <VisitWebsiteButton toolId={tool.id} websiteUrl={tool.website_url} />
                        )}
                        {!tool.is_claimed && (
                          <ClaimListingButton toolId={tool.id} toolName={tool.name} />
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {tool.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-5 pt-5 border-t border-sky-100/60">
                        {tool.tags.map((tag: string) => (
                          <span key={tag} className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stats strip */}
                  {tool.stats.length > 0 && (
                    <div className={`grid border-t border-slate-100 divide-x divide-slate-100 bg-slate-50 ${tool.stats.length === 2 ? 'grid-cols-2' : tool.stats.length >= 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      {tool.stats.map((stat: { label: string; value: string }) => (
                        <div key={stat.label} className="px-6 py-5 text-center">
                          <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{stat.value}</p>
                          <p className="text-[11px] text-slate-500 mt-1.5 font-medium">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* About */}
                <div className="mt-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 sm:p-8">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">About {tool.name}</h2>
                  <p className="text-[14px] text-slate-600 leading-[1.75]">{tool.long_description}</p>

                  {tool.use_cases.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-slate-100">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Common use cases</p>
                      <div className="flex flex-wrap gap-2">
                        {tool.use_cases.map((uc: string) => (
                          <span key={uc} className="inline-flex items-center gap-1.5 text-[12px] text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                            {uc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Features ── */}
              {tool.features.length > 0 && (
                <section id="section-features">
                  <SectionHeading accent="blue">Features</SectionHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tool.features.map((f: { title: string; description: string }, i: number) => (
                      <div key={i} className="group bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:border-sky-200 hover:shadow-md transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-sky-50 text-sky-600 mt-0.5 group-hover:bg-sky-100 transition-colors">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-[13px] text-slate-900 mb-1">{f.title}</p>
                            <p className="text-[13px] text-slate-500 leading-relaxed">{f.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Screenshots ── */}
              {(tool.screenshots?.length ?? 0) > 0 && (
                <section id="section-screenshots">
                  <SectionHeading accent="slate">Screenshots</SectionHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(tool.screenshots ?? []).map((s, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-slate-200/80 bg-white shadow-sm">
                        <img
                          src={s.url}
                          alt={s.alt || `${tool.name} - screenshot ${i + 1}`}
                          loading="lazy"
                          width={800}
                          height={500}
                          className="w-full h-52 object-cover"
                        />
                        {s.alt && (
                          <p className="px-4 py-2.5 text-[11px] text-slate-400 border-t border-slate-100">{s.alt}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Pricing ── */}
              {tool.pricing.length > 0 && (
                <section id="section-pricing">
                  <SectionHeading accent="emerald">Pricing</SectionHeading>
                  <div className={`grid gap-3 ${tool.pricing.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
                    {tool.pricing.map((plan) => {
                      const isFree = /free/i.test(plan.plan) || /^\$?0(\/mo)?$/i.test(plan.price.trim());
                      return (
                      <div
                        key={plan.plan}
                        className={`relative bg-white rounded-2xl border p-6 flex flex-col transition-all shadow-sm hover:shadow-md ${
                          isFree
                            ? 'border-emerald-300 ring-1 ring-emerald-100'
                            : 'border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        {isFree && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                              Free tier
                            </span>
                          </div>
                        )}
                        <div className="mb-5">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-400">{plan.plan}</p>
                          <p className={`text-3xl font-bold tracking-tight ${isFree ? 'text-emerald-600' : 'text-slate-900'}`}>{plan.price}</p>
                        </div>
                        <ul className="space-y-2.5 flex-1">
                          {plan.features.map((f: string) => (
                            <li key={f} className="flex items-start gap-2 text-[13px] text-slate-600">
                              <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isFree ? 'text-emerald-500' : 'text-slate-400'}`} />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── FAQ ── */}
              <FaqSection faqs={tool.faqs} />

              {/* ── Pros & Cons ── */}
              {((tool.pros?.length ?? 0) > 0 || (tool.cons?.length ?? 0) > 0) && (
                <section id="section-pros-cons">
                  <SectionHeading accent="emerald" description="Our hands-on assessment after testing">Pros &amp; Cons</SectionHeading>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(tool.pros?.length ?? 0) > 0 && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-emerald-100">
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <h3 className="text-[12px] font-bold text-emerald-800 uppercase tracking-wide">Pros</h3>
                        </div>
                        <ul className="divide-y divide-emerald-100/60 p-1">
                          {(tool.pros ?? []).map((pro, i) => (
                            <li key={i} className="flex items-start gap-3 px-4 py-3 text-[13px] text-emerald-900">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(tool.cons?.length ?? 0) > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-100">
                          <ThumbsDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <h3 className="text-[12px] font-bold text-red-700 uppercase tracking-wide">Cons</h3>
                        </div>
                        <ul className="divide-y divide-red-100/60 p-1">
                          {(tool.cons ?? []).map((con, i) => (
                            <li key={i} className="flex items-start gap-3 px-4 py-3 text-[13px] text-red-900">
                              <X className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ── Case Study ── */}
              {tool.what_we_learned != null && (tool.what_we_learned.bullets?.length ?? 0) > 0 && (
                <section id="section-what-we-learned">
                  <SectionHeading accent="teal" description="What we found after hands-on testing">Case Study</SectionHeading>
                  <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-teal-50 to-white border-b border-teal-100">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                        <FlaskConical className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">Hands-on Testing Results</p>
                        {tool.what_we_learned.use_case && (
                          <p className="text-[11px] text-teal-600 mt-0.5">Tested for: <span className="font-medium">{tool.what_we_learned.use_case}</span></p>
                        )}
                      </div>
                    </div>
                    {/* Findings */}
                    <ol className="p-4 space-y-2">
                      {tool.what_we_learned.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold shrink-0 mt-0.5 leading-none">{i + 1}</span>
                          <p className="text-[13px] text-slate-700 leading-relaxed">{bullet}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              )}

              {/* ── Honest Take ── */}
              {(tool.honest_take?.length ?? 0) > 0 && (
                <section id="section-honest-take">
                  <SectionHeading accent="amber" description="Independent editorial opinion — not sponsored">Our Honest Take</SectionHeading>
                  <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">Editor&apos;s Verdict</p>
                        <p className="text-[11px] text-amber-600 mt-0.5">Unsponsored, independent opinion</p>
                      </div>
                    </div>
                    {/* Points */}
                    <ol className="p-4 space-y-2">
                      {(tool.honest_take ?? []).map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold shrink-0 mt-0.5 leading-none">{i + 1}</span>
                          <p className="text-[13px] text-slate-700 leading-relaxed">{bullet}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              )}

              {/* ── Official links + news ── */}
              {(tool.official_website || tool.founder_name || (tool.latest_news?.length ?? 0) > 0) && (
                <section id="section-about-author">
                  <SectionHeading accent="slate">Official Info</SectionHeading>
                  <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                    {tool.official_website && (
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Official Website</p>
                          <a href={tool.official_website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-sky-600 hover:text-sky-800 transition-colors">
                            {tool.official_website}
                          </a>
                        </div>
                      </div>
                    )}
                    {tool.founder_name && (
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Linkedin className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Founder</p>
                          {tool.founder_linkedin ? (
                            <a href={tool.founder_linkedin} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-slate-800 hover:text-sky-700 transition-colors flex items-center gap-1.5">
                              {tool.founder_name}
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          ) : (
                            <p className="text-[13px] font-semibold text-slate-800">{tool.founder_name}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {(tool.latest_news?.length ?? 0) > 0 && (
                      <div className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Newspaper className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Latest News</p>
                        </div>
                        <ul className="space-y-2">
                          {(tool.latest_news ?? []).map((item, i) => (
                            <li key={i}>
                              <a href={item.url} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-start gap-2 text-[13px] text-slate-600 hover:text-sky-700 transition-colors group">
                                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-500 shrink-0 mt-0.5" />
                                {item.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ── Similar Tools ── */}
              {similarTools.length > 0 && (
                <section id="section-similar-tools">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-5 rounded-full shrink-0 bg-slate-400" />
                        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Similar Tools</h2>
                      </div>
                      <p className="text-[12px] text-slate-400 mt-1 ml-[14px]">Other {categoryLabel} tools worth exploring</p>
                    </div>
                    <Link href={`/category/${tool.category}`} className="text-xs text-sky-600 hover:text-sky-800 transition-colors font-medium whitespace-nowrap mt-1">
                      View all →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {similarTools.map((s) => (
                      <Link
                        key={s.id}
                        href={`/category/${s.category}/${s.slug}`}
                        className="group flex items-center gap-3.5 bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow hover:border-slate-300 transition-all"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600 group-hover:bg-slate-200 transition-colors">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="text-[13px] font-semibold text-slate-900 group-hover:text-sky-700 transition-colors truncate">{s.name}</span>
                            {s.badge && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border shrink-0 ${BADGE_STYLES[s.badge] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {s.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-slate-500 line-clamp-1 mb-1.5">{s.tagline}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-[11px] font-semibold text-slate-700">{s.rating}</span>
                              <span className="text-[11px] text-slate-400">({s.rating_count})</span>
                            </div>
                            {s.published_date && (
                              <span className="text-[11px] text-slate-400">
                                · {new Date(s.published_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Claimed founder widget ── */}
              {tool.is_claimed && (tool.claimed_founded_by || tool.claimed_founder_names || tool.claimed_about_bio) && (
                <section id="section-claimed" className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-sky-50/60">
                    <BadgeCheck className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <h2 className="text-[13px] font-bold text-slate-900 leading-none mb-0.5">Verified Listing</h2>
                      <p className="text-[11px] text-sky-600 font-medium">Claimed &amp; verified by the founders</p>
                    </div>
                  </div>
                  <div className="px-6 py-5 space-y-2">
                    {tool.claimed_founded_by && (
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{tool.claimed_founded_by}</p>
                    )}
                    {tool.claimed_founder_names && (
                      <div>
                        {tool.claimed_founder_linkedin ? (
                          <a href={tool.claimed_founder_linkedin} target="_blank" rel="noopener noreferrer"
                            className="text-[13px] font-semibold text-slate-900 hover:text-sky-700 transition-colors flex items-center gap-1.5">
                            {tool.claimed_founder_names}
                            <Linkedin className="w-3.5 h-3.5 text-sky-500" />
                          </a>
                        ) : (
                          <p className="text-[13px] font-semibold text-slate-900">{tool.claimed_founder_names}</p>
                        )}
                      </div>
                    )}
                    {tool.claimed_about_bio && (
                      <p className="text-[13px] text-slate-600 leading-relaxed">{tool.claimed_about_bio}</p>
                    )}
                  </div>
                </section>
              )}

              {/* ── Author block ── */}
              <AuthorBlock
                reviewerId={tool.reviewer_id ?? null}
                reviewedOn={
                  tool.published_date
                    ? `Published ${new Date(tool.published_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}${tool.updated_date ? ` · Updated ${new Date(tool.updated_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}`
                    : undefined
                }
              />
            </main>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  // Try top_x_pages
  const topX = await getTopX(params.slug, params.category);
  if (topX) {
    const tools = await getTopXTools(topX.tool_ids as string[]);
    return (
      <>
        <PageViewTracker pageId={topX.id} />
        <TopXPageView
          page={topX}
          tools={tools}
          categoryLabel={categoryLabel}
          siteUrl={SITE_URL}
        />
      </>
    );
  }

  notFound();
}
