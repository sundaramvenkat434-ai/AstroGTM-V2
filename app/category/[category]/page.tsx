import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import { Zap, Star, ArrowRight, ArrowUpRight, CircleCheck as CheckCircle2, ChevronDown } from 'lucide-react';
import { SiteHeader, PageBreadcrumb } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

interface CategoryRow {
  slug: string; name: string; description: string; icon: string;
  hero_headline: string; hero_subtext: string;
  why_headline: string; why_body: string;
  cta_text: string; cta_url: string;
  benefits: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
}

interface ToolSummary {
  id: string; slug: string; name: string; tagline: string;
  description: string; tags: string[]; badge: string | null;
  rating: number; rating_count: string; users: string;
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const { data: cat } = await supabaseServer.from('categories').select('name,description').eq('slug', params.category).maybeSingle();
  if (!cat) return { title: 'Category Not Found' };
  const title = `Best ${cat.name} Tools`;
  return {
    title, description: cat.description, robots: { index: true, follow: true },
    openGraph: { title, description: cat.description, url: `${SITE_URL}/category/${params.category}`, type: 'website', siteName: 'AstroGTM', images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description: cat.description, images: [`${SITE_URL}/og-default.png`] },
    alternates: { canonical: `${SITE_URL}/category/${params.category}` },
  };
}

const BADGE_STYLES: Record<string, string> = {
  new: 'bg-sky-100 text-sky-700 border-sky-200',
  popular: 'bg-amber-100 text-amber-700 border-amber-200',
  free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const [{ data: catRow }, { data: tools }] = await Promise.all([
    supabaseServer.from('categories').select('*').eq('slug', params.category).maybeSingle(),
    supabaseServer.from('tool_pages').select('id,slug,name,tagline,description,tags,badge,rating,rating_count,users')
      .eq('status', 'published').eq('category', params.category).order('published_at', { ascending: false }),
  ]);

  if (!catRow) notFound();

  const cat = catRow as CategoryRow;
  const items = (tools || []) as ToolSummary[];

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: cat.name, item: `${SITE_URL}/category/${params.category}` },
    ],
  };

  const collectionLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: `${cat.name} Tools`, description: cat.description,
    url: `${SITE_URL}/category/${params.category}`,
    isPartOf: { '@type': 'WebSite', name: 'AstroGTM', url: SITE_URL },
  };

  const faqLd = cat.faqs?.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: cat.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  } : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <SiteHeader />
      <PageBreadcrumb crumbs={[{ label: cat.name }]} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-sky-100" style={{ background: 'radial-gradient(ellipse 120% 100% at 50% 0%, #e0f2fe 0%, #f0f9ff 40%, #f8fafc 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 45% at 80% 20%, rgba(56,189,248,0.10) 0%, transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold px-3 py-1.5 rounded-full mb-5">
            <Zap className="w-3 h-3" />{items.length} {items.length === 1 ? 'Tool' : 'Tools'}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
            {cat.hero_headline || `Best ${cat.name} Tools`}
          </h1>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto mb-8">
            {cat.hero_subtext || cat.description}
          </p>
          <Link href="#tools"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-150 hover:scale-[1.03] active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', boxShadow: '0 4px 20px rgba(15,23,42,0.3)' }}>
            {cat.cta_text || 'Explore Tools'}<ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Tool Grid */}
      <section id="tools" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-700 font-semibold mb-1">No tools yet</p>
            <p className="text-slate-400 text-sm">Check back soon — new tools are added weekly.</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-6">{cat.name} Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((tool) => (
                <Link key={tool.id} href={`/category/${params.category}/${tool.slug}`}
                  className="group flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100/60 transition-all duration-200">
                  <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-sky-50 border border-sky-100">
                    <Zap className="w-5 h-5 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 text-sm">{tool.name}</span>
                      {tool.badge && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${BADGE_STYLES[tool.badge] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2.5 line-clamp-2">{tool.tagline}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium text-slate-700">{tool.rating}</span>
                        <span className="text-[10px] text-slate-400">({tool.rating_count})</span>
                      </div>
                      <span className="text-xs text-slate-400">{tool.users} users</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Why Section */}
      {cat.why_headline && (
        <section className="bg-white border-y border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-2">Why It Matters</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{cat.why_headline}</h2>
            </div>
            <p className="text-slate-600 text-base leading-relaxed text-center max-w-2xl mx-auto">{cat.why_body}</p>
          </div>
        </section>
      )}

      {/* Benefits Grid */}
      {cat.benefits?.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-2">What You Gain</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Key Benefits</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cat.benefits.map((b, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:shadow-slate-100 transition-shadow">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-4 h-4 text-sky-500" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-2">{b.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQs */}
      {cat.faqs?.length > 0 && (
        <section className="bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-2">FAQ</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Common Questions</h2>
            </div>
            <div className="space-y-3">
              {cat.faqs.map((faq, i) => (
                <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                    <span className="font-semibold text-slate-800 text-sm">{faq.q}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300">
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />Back to all tools
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}
