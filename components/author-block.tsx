'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Linkedin, ExternalLink, BookOpen, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface Author {
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

interface Props {
  reviewerId?: string | null;
  reviewedOn?: string;
}

// Fallback static author when no reviewer is assigned
const FALLBACK: Author = {
  id: '',
  slug: 'venkat-sundaram',
  name: 'Venkat Sundaram',
  title: 'Lead Reviewer — SEO & Content Tools',
  bio: 'Venkat Sundaram is the lead editor at AstroGTM with 6+ years in AI, SaaS, and go-to-market strategy. Every tool is tested hands-on against real use cases.',
  avatar_initials: 'VS',
  avatar_color: '#0369a1',
  linkedin_url: 'https://linkedin.com/in/srvenkat94',
  categories: ['seo-content', 'lead-generation'],
  stats: [
    { value: '6+', label: 'Years in AI & SaaS' },
    { value: '200+', label: 'Tools reviewed' },
    { value: '40k+', label: 'Monthly readers' },
  ],
};

export function AuthorBlock({ reviewerId, reviewedOn }: Props) {
  const [author, setAuthor] = useState<Author | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!reviewerId) {
      setAuthor(FALLBACK);
      return;
    }
    supabase
      .from('authors')
      .select('id, slug, name, title, bio, avatar_initials, avatar_color, linkedin_url, categories, stats')
      .eq('id', reviewerId)
      .maybeSingle()
      .then(({ data }) => setAuthor(data ?? FALLBACK));
  }, [reviewerId]);

  if (!author) return null;

  const profileUrl = `/author/${author.slug}`;

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      {/* Top label bar */}
      <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reviewed by</span>
        {reviewedOn && (
          <>
            <span className="text-slate-300 text-[11px]">·</span>
            <span className="text-[11px] text-slate-400">{reviewedOn}</span>
          </>
        )}
      </div>

      {/* Author card */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Link href={profileUrl} className="shrink-0 group">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:opacity-90 transition-opacity"
              style={{ background: author.avatar_color }}
            >
              {author.avatar_initials}
            </div>
          </Link>

          {/* Name + title + stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <Link href={profileUrl} className="text-[15px] font-bold text-slate-900 hover:text-sky-700 transition-colors leading-tight block">
                  {author.name}
                </Link>
                <p className="text-[12px] text-slate-500 mt-0.5">{author.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {author.linkedin_url && (
                  <a
                    href={author.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center hover:bg-sky-100 transition-colors"
                    aria-label="LinkedIn profile"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-sky-600" />
                  </a>
                )}
                <Link
                  href={profileUrl}
                  className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                  aria-label="Author profile"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </Link>
              </div>
            </div>

            {/* Stats row */}
            {author.stats.length > 0 && (
              <div className="flex gap-4 mt-3 flex-wrap">
                {author.stats.map((s) => (
                  <div key={s.label}>
                    <span className="text-[13px] font-bold text-slate-800">{s.value}</span>
                    <span className="text-[11px] text-slate-400 ml-1">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio — truncated with expand */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className={`text-[13px] text-slate-600 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
            {author.bio}
          </p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1.5 text-[12px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        </div>

        {/* AstroGTM editorial badge */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-semibold text-sky-700">
            <Star className="w-3 h-3 fill-sky-500 text-sky-500" />
            AstroGTM Editorial
          </span>
          <span className="text-[11px] text-slate-400">Independent · Not sponsored</span>
        </div>
      </div>
    </div>
  );
}

// Re-export from server-safe module so existing imports keep working
export { AUTHOR_SCHEMA, buildArticleSchema } from '@/lib/author-schema';
