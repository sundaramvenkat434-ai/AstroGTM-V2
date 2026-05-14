import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { Linkedin, ArrowLeft, Star, BookOpen } from 'lucide-react';
import { AstroGTMLogo } from '@/components/site-header';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

const CATEGORY_LABELS: Record<string, string> = {
  'seo-content': 'SEO & Content',
  'lead-generation': 'Lead Generation',
  'sales-outreach': 'Sales Outreach',
  'social-media': 'Social Media',
};

interface Author {
  id: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  avatar_initials: string;
  avatar_color: string;
  linkedin_url: string | null;
  categories: string[];
  stats: { value: string; label: string }[];
}

async function getAuthor(slug: string): Promise<Author | null> {
  const { data } = await supabaseServer
    .from('authors')
    .select('id, slug, name, title, bio, avatar_initials, avatar_color, linkedin_url, categories, stats')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  return data ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const author = await getAuthor(params.slug);
  if (!author) return {};
  return {
    title: `${author.name} — ${author.title} | AstroGTM`,
    description: author.bio.slice(0, 160),
    alternates: { canonical: `${SITE_URL}/author/${author.slug}` },
    openGraph: {
      title: `${author.name} — AstroGTM`,
      description: author.title,
      url: `${SITE_URL}/author/${author.slug}`,
      type: 'profile',
    },
  };
}

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const author = await getAuthor(params.slug);
  if (!author) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `${SITE_URL}/author/${author.slug}`,
    jobTitle: author.title,
    ...(author.linkedin_url ? { sameAs: [author.linkedin_url] } : {}),
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" aria-label="AstroGTM home">
            <AstroGTMLogo size={28} />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to tools
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">

        {/* Hero card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Top gradient bar */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${author.avatar_color}, ${author.avatar_color}88)` }} />

          <div className="p-8">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-sm"
                style={{ background: author.avatar_color }}
              >
                {author.avatar_initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">{author.name}</h1>
                    <p className="text-[14px] text-slate-500 mt-1">{author.title}</p>
                  </div>
                  {author.linkedin_url && (
                    <a
                      href={author.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-[12px] font-semibold text-sky-700 hover:bg-sky-100 transition-colors shrink-0"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn
                    </a>
                  )}
                </div>

                {/* Stats */}
                {author.stats.length > 0 && (
                  <div className="flex flex-wrap gap-5 mt-4 pt-4 border-t border-slate-100">
                    {author.stats.map(s => (
                      <div key={s.label}>
                        <p className="text-xl font-bold text-slate-900 leading-none">{s.value}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Categories */}
            {author.categories.length > 0 && (
              <div className="flex items-center gap-2 mt-5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Covers:</span>
                {(author.categories as string[]).map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-[12px] font-medium text-slate-600 border border-slate-200">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">About</h2>
          </div>
          <div className="space-y-4">
            {author.bio.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className="text-[14px] text-slate-600 leading-relaxed">{para}</p>
            ))}
          </div>
        </div>

        {/* Editorial badge */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-sky-500 text-sky-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-800 mb-1">AstroGTM Editorial Standards</p>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                All reviews on AstroGTM are independent and not sponsored. Reviewers test tools hands-on against real use cases before publishing. We never accept payment to influence editorial ratings or recommendations.
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
