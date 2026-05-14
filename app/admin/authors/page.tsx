'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Pencil, Users, Linkedin, ToggleLeft, ToggleRight } from 'lucide-react';

interface Author {
  id: string;
  slug: string;
  name: string;
  title: string;
  avatar_initials: string;
  avatar_color: string;
  linkedin_url: string | null;
  categories: string[];
  stats: { value: string; label: string }[];
  is_active: boolean;
  sort_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'seo-content': 'SEO & Content',
  'lead-generation': 'Lead Generation',
  'sales-outreach': 'Sales Outreach',
  'social-media': 'Social Media',
};

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('authors')
      .select('id, slug, name, title, avatar_initials, avatar_color, linkedin_url, categories, stats, is_active, sort_order')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setAuthors(data as Author[]);
        setLoading(false);
      });
  }, []);

  async function toggleActive(author: Author) {
    const next = !author.is_active;
    await supabase.from('authors').update({ is_active: next }).eq('id', author.id);
    setAuthors(prev => prev.map(a => a.id === author.id ? { ...a, is_active: next } : a));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="h-5 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900">Authors</span>
              </div>
            </div>
            <Link href="/admin/authors/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                New Author
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Editorial Authors</h1>
          <p className="text-sm text-slate-500 mt-1">Manage reviewer profiles shown on tool pages and author bios.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {authors.map(author => (
              <div
                key={author.id}
                className={`bg-white rounded-xl border p-5 flex items-center gap-4 transition-all ${author.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: author.avatar_color }}
                >
                  {author.avatar_initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-[14px]">{author.name}</span>
                    {!author.is_active && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">Inactive</span>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">{author.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {(author.categories as string[]).map(cat => (
                      <span key={cat} className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full font-medium">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    ))}
                    {author.stats.slice(0, 2).map(s => (
                      <span key={s.label} className="text-[11px] text-slate-500">
                        <strong className="text-slate-700">{s.value}</strong> {s.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {author.linkedin_url && (
                    <a
                      href={author.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center hover:bg-sky-100 transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5 text-sky-600" />
                    </a>
                  )}
                  <button
                    onClick={() => toggleActive(author)}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:bg-slate-50"
                    title={author.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {author.is_active
                      ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                      : <ToggleLeft className="w-4 h-4 text-slate-400" />
                    }
                  </button>
                  <Link href={`/admin/authors/edit/${author.id}`}>
                    <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}

            {authors.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-700 font-medium mb-1">No authors yet</p>
                <p className="text-slate-400 text-sm mb-4">Add your first editorial reviewer.</p>
                <Link href="/admin/authors/new">
                  <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Author</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
