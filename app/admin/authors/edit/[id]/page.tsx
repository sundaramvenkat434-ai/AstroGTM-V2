'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2, Users } from 'lucide-react';

interface Author {
  id?: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  avatar_initials: string;
  avatar_color: string;
  linkedin_url: string;
  twitter_url: string;
  categories: string[];
  stats: { value: string; label: string }[];
  is_active: boolean;
  sort_order: number;
}

const BLANK: Author = {
  slug: '', name: '', title: '', bio: '',
  avatar_initials: '', avatar_color: '#0369a1',
  linkedin_url: '', twitter_url: '',
  categories: [], stats: [], is_active: true, sort_order: 0,
};

const ALL_CATEGORIES = [
  { value: 'seo-content', label: 'SEO & Content' },
  { value: 'lead-generation', label: 'Lead Generation' },
  { value: 'sales-outreach', label: 'Sales Outreach' },
  { value: 'social-media', label: 'Social Media' },
];

const PRESET_COLORS = ['#0369a1', '#0d9488', '#d97706', '#7c3aed', '#059669', '#dc2626', '#0ea5e9', '#1d4ed8'];

export default function AuthorEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [author, setAuthor] = useState<Author>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isNew = params.id === 'new';

  useEffect(() => {
    if (isNew) { setLoading(false); return; }
    supabase.from('authors').select('*').eq('id', params.id).maybeSingle()
      .then(({ data }) => {
        if (data) setAuthor(data as Author);
        setLoading(false);
      });
  }, [params.id, isNew]);

  function update(patch: Partial<Author>) {
    setAuthor(prev => ({ ...prev, ...patch }));
  }

  function toggleCategory(cat: string) {
    const cats = author.categories.includes(cat)
      ? author.categories.filter(c => c !== cat)
      : [...author.categories, cat];
    update({ categories: cats });
  }

  function addStat() {
    update({ stats: [...author.stats, { value: '', label: '' }] });
  }

  function updateStat(i: number, field: 'value' | 'label', val: string) {
    const stats = author.stats.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    update({ stats });
  }

  function removeStat(i: number) {
    update({ stats: author.stats.filter((_, idx) => idx !== i) });
  }

  async function save() {
    if (!author.name.trim() || !author.slug.trim()) {
      setError('Name and slug are required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      slug: author.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      name: author.name.trim(),
      title: author.title.trim(),
      bio: author.bio.trim(),
      avatar_initials: author.avatar_initials.trim().toUpperCase().slice(0, 2),
      avatar_color: author.avatar_color,
      linkedin_url: author.linkedin_url.trim() || null,
      twitter_url: author.twitter_url.trim() || null,
      categories: author.categories,
      stats: author.stats.filter(s => s.value && s.label),
      is_active: author.is_active,
      sort_order: author.sort_order,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (isNew) {
      ({ error: err } = await supabase.from('authors').insert(payload));
    } else {
      ({ error: err } = await supabase.from('authors').update(payload).eq('id', author.id!));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push('/admin/authors');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/admin/authors">
                <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
              </Link>
              <div className="h-5 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900">{isNew ? 'New Author' : 'Edit Author'}</span>
              </div>
            </div>
            <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Basic info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Full Name *</label>
              <Input value={author.name} onChange={e => update({ name: e.target.value })} placeholder="Jane Smith" className="h-9" />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Slug * (URL)</label>
              <Input value={author.slug} onChange={e => update({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="jane-smith" className="h-9 font-mono text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Title / Role</label>
            <Input value={author.title} onChange={e => update({ title: e.target.value })} placeholder="Lead Reviewer — SEO & Content" className="h-9" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Bio</label>
            <textarea
              value={author.bio}
              onChange={e => update({ bio: e.target.value })}
              rows={5}
              placeholder="2-3 paragraph bio describing experience and editorial focus…"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Avatar</h2>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ background: author.avatar_color }}
            >
              {author.avatar_initials || '??'}
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Initials (2 chars)</label>
                <Input
                  value={author.avatar_initials}
                  onChange={e => update({ avatar_initials: e.target.value.toUpperCase().slice(0, 2) })}
                  maxLength={2}
                  className="h-9 w-24 uppercase"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1.5">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => update({ avatar_color: c })}
                      className={`w-7 h-7 rounded-lg border-2 transition-all ${author.avatar_color === c ? 'border-slate-900 scale-110' : 'border-transparent hover:border-slate-300'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={author.avatar_color}
                    onChange={e => update({ avatar_color: e.target.value })}
                    className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Social Links</h2>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">LinkedIn URL</label>
            <Input value={author.linkedin_url} onChange={e => update({ linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." className="h-9" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Twitter / X URL</label>
            <Input value={author.twitter_url} onChange={e => update({ twitter_url: e.target.value })} placeholder="https://x.com/..." className="h-9" />
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Covers Categories</h2>
          <div className="flex gap-2 flex-wrap">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                  author.categories.includes(cat.value)
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Stats (shown in profile)</h2>
            <Button variant="outline" size="sm" onClick={addStat} className="h-7 text-xs gap-1">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {author.stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={s.value} onChange={e => updateStat(i, 'value', e.target.value)} placeholder="6+" className="h-8 w-24 text-sm" />
                <Input value={s.label} onChange={e => updateStat(i, 'label', e.target.value)} placeholder="Years in AI & SaaS" className="h-8 flex-1 text-sm" />
                <button onClick={() => removeStat(i)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ))}
            {author.stats.length === 0 && (
              <p className="text-[12px] text-slate-400 italic">No stats yet. Add credentials like "6+ Years in SaaS".</p>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Settings</h2>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={author.is_active}
              onChange={e => update({ is_active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-sky-600"
            />
            <label htmlFor="is_active" className="text-[13px] text-slate-700">Active (visible on tool pages)</label>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Sort Order</label>
            <Input
              type="number"
              value={author.sort_order}
              onChange={e => update({ sort_order: parseInt(e.target.value) || 0 })}
              className="h-9 w-24"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
