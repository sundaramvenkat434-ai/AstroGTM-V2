'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Save, Plus, Trash2, Loader as Loader2,
  Tag, FileText, Zap, CircleHelp as HelpCircle, CircleCheck as CheckCircle2,
} from 'lucide-react';

export interface CategoryData {
  id?: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  hero_headline: string;
  hero_subtext: string;
  why_headline: string;
  why_body: string;
  cta_text: string;
  cta_url: string;
  benefits: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  sort_order: number;
}

const EMPTY: CategoryData = {
  slug: '', name: '', description: '', icon: 'Zap',
  hero_headline: '', hero_subtext: '', why_headline: '', why_body: '',
  cta_text: 'Explore Tools', cta_url: '',
  benefits: [{ title: '', body: '' }],
  faqs: [{ q: '', a: '' }],
  sort_order: 99,
};

const ICONS = ['Zap','Search','BarChart2','Code2','Megaphone','Shield','Palette','Server','Globe','Database','Cpu','Cloud'];

interface Props { initial?: CategoryData; mode: 'new' | 'edit'; }

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-sky-500" />
      </div>
      <span className="text-sm font-semibold text-slate-700">{title}</span>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function CategoryEditor({ initial, mode }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CategoryData>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof CategoryData>(key: K, value: CategoryData[K]) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  function toSlug(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function handleSave() {
    if (!data.slug || !data.name) { setError('Slug and name are required.'); return; }
    setError('');
    setSaving(true);
    const payload = {
      slug: data.slug, name: data.name, description: data.description,
      icon: data.icon, hero_headline: data.hero_headline, hero_subtext: data.hero_subtext,
      why_headline: data.why_headline, why_body: data.why_body,
      cta_text: data.cta_text, cta_url: data.cta_url,
      benefits: data.benefits, faqs: data.faqs, sort_order: data.sort_order,
      updated_at: new Date().toISOString(),
    };
    if (mode === 'edit' && data.id) {
      const { error: err } = await supabase.from('categories').update(payload).eq('id', data.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('categories').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false); setSaved(true);
    setTimeout(() => { setSaved(false); router.push('/admin/categories'); }, 900);
  }

  function addBenefit() { set('benefits', [...data.benefits, { title: '', body: '' }]); }
  function removeBenefit(i: number) { set('benefits', data.benefits.filter((_, idx) => idx !== i)); }
  function setBenefit(i: number, k: 'title' | 'body', v: string) {
    const next = [...data.benefits]; next[i] = { ...next[i], [k]: v }; set('benefits', next);
  }
  function addFaq() { set('faqs', [...data.faqs, { q: '', a: '' }]); }
  function removeFaq(i: number) { set('faqs', data.faqs.filter((_, idx) => idx !== i)); }
  function setFaq(i: number, k: 'q' | 'a', v: string) {
    const next = [...data.faqs]; next[i] = { ...next[i], [k]: v }; set('faqs', next);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/categories" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{mode === 'new' ? 'New Category' : `Edit: ${data.name}`}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Configure slug, name, and page content blocks</p>
          </div>
          <Button onClick={handleSave} disabled={saving || saved} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>

        {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

        {/* Identity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <SectionHeader icon={Tag} title="Identity" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" hint="e.g. SEO & Content">
              <Input value={data.name} onChange={e => { set('name', e.target.value); if (mode === 'new') set('slug', toSlug(e.target.value)); }} placeholder="SEO & Content" />
            </Field>
            <Field label="Slug" hint="Unique URL slug, lowercase">
              <Input value={data.slug} onChange={e => set('slug', toSlug(e.target.value))} placeholder="seo" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Short Description" hint="Shown in meta and category cards">
              <textarea className="w-full min-h-[72px] text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                value={data.description} onChange={e => set('description', e.target.value)} placeholder="Tools to boost your search rankings…" />
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Icon" hint="Lucide icon name">
              <select className="w-full h-10 text-sm border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                value={data.icon} onChange={e => set('icon', e.target.value)}>
                {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </Field>
            <Field label="Sort Order">
              <Input type="number" value={data.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
            </Field>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <SectionHeader icon={Zap} title="Hero Section" />
          <div className="space-y-4">
            <Field label="Headline">
              <Input value={data.hero_headline} onChange={e => set('hero_headline', e.target.value)} placeholder="AI Tools for SEO & Content" />
            </Field>
            <Field label="Sub-text">
              <textarea className="w-full min-h-[72px] text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                value={data.hero_subtext} onChange={e => set('hero_subtext', e.target.value)} placeholder="Discover the best AI-powered tools to…" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="CTA Button Text">
                <Input value={data.cta_text} onChange={e => set('cta_text', e.target.value)} placeholder="Explore Tools" />
              </Field>
              <Field label="CTA URL (optional)">
                <Input value={data.cta_url} onChange={e => set('cta_url', e.target.value)} placeholder="/category/seo" />
              </Field>
            </div>
          </div>
        </div>

        {/* Why */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <SectionHeader icon={FileText} title='"Why" Section' />
          <div className="space-y-4">
            <Field label="Section Headline">
              <Input value={data.why_headline} onChange={e => set('why_headline', e.target.value)} placeholder="Why AI for SEO & Content?" />
            </Field>
            <Field label="Body Copy">
              <textarea className="w-full min-h-[96px] text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                value={data.why_body} onChange={e => set('why_body', e.target.value)} placeholder="AI tools are transforming how teams approach…" />
            </Field>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <SectionHeader icon={CheckCircle2} title="Benefits / Feature Blocks" />
          <div className="space-y-3">
            {data.benefits.map((b, i) => (
              <div key={i} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <div className="flex gap-2 mb-2">
                  <Input className="text-sm font-medium" value={b.title} onChange={e => setBenefit(i, 'title', e.target.value)} placeholder="Benefit title" />
                  <button onClick={() => removeBenefit(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                <textarea className="w-full min-h-[60px] text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-white"
                  value={b.body} onChange={e => setBenefit(i, 'body', e.target.value)} placeholder="Description…" />
              </div>
            ))}
            <button onClick={addBenefit} className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Benefit
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <SectionHeader icon={HelpCircle} title="FAQs" />
          <div className="space-y-3">
            {data.faqs.map((f, i) => (
              <div key={i} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <div className="flex gap-2 mb-2">
                  <Input className="text-sm" value={f.q} onChange={e => setFaq(i, 'q', e.target.value)} placeholder="Question" />
                  <button onClick={() => removeFaq(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                <textarea className="w-full min-h-[72px] text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-white"
                  value={f.a} onChange={e => setFaq(i, 'a', e.target.value)} placeholder="Answer…" />
              </div>
            ))}
            <button onClick={addFaq} className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 pb-8">
          <Button onClick={handleSave} disabled={saving || saved} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Category'}
          </Button>
        </div>
      </div>
    </div>
  );
}
