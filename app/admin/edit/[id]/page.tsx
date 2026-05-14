'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ToolPagePreview } from '@/components/tool-page-preview';
import { ArrowLeft, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, FileText, AlignLeft, Tag, Search, Link2, Type, Zap, Target, MessageSquare, Globe, Trash2, Plus, GripVertical, Pencil, Eye, Check, Layers, DollarSign, CircleHelp as HelpCircle, ChartBar as BarChart3, Star, Users, Save, Monitor, ThumbsUp, ThumbsDown, FlaskConical, Lightbulb, Image as ImageIcon, Newspaper, CalendarDays, Linkedin, Circle as XCircle, ExternalLink, BadgeCheck } from 'lucide-react';
import { format } from 'date-fns';

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
  upvotes: number;
  features: { title: string; description: string }[];
  use_cases: string[];
  pricing: { plan: string; price: string; features: string[]; highlighted?: boolean }[];
  faqs: { q: string; a: string }[];
  stats: { label: string; value: string }[];
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  status: string;
  noindex: boolean;
  published_at: string | null;
  updated_at: string;
  // E-E-A-T
  pros: string[];
  cons: string[];
  what_we_learned: { use_case: string; bullets: string[] } | null;
  honest_take: string[];
  // Enrichment
  logo_url: string | null;
  logo_alt: string | null;
  screenshots: { url: string; alt: string }[];
  official_website: string | null;
  founder_name: string | null;
  founder_linkedin: string | null;
  latest_news: { title: string; url: string }[];
  published_date: string | null;
  updated_date: string | null;
  // Reviewer
  reviewer_id: string | null;
  // Website & claim
  website_url: string | null;
  is_claimed: boolean;
  claimed_founded_by: string | null;
  claimed_founder_names: string | null;
  claimed_founder_linkedin: string | null;
  claimed_about_bio: string | null;
}

const FALLBACK_CATEGORIES = [
  { value: 'seo', label: 'SEO & Content' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'developer', label: 'Developer' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'security', label: 'Security' },
  { value: 'design', label: 'Design' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const BADGES = [
  { value: '_none', label: 'None' },
  { value: 'new', label: 'New' },
  { value: 'popular', label: 'Popular' },
  { value: 'free', label: 'Free' },
];

function SectionHeader({
  icon,
  label,
  count,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-slate-400">{icon}</span>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</h3>
      {count !== undefined && (
        <span className="text-[11px] text-slate-400 tabular-nums">({count})</span>
      )}
      <div className="h-px flex-1 bg-slate-100" />
      {action}
    </div>
  );
}

function EditableField({
  label,
  icon,
  value,
  onChange,
  charLimit,
  multiline,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  charLimit?: { min: number; max: number };
  multiline?: boolean;
}) {
  const len = value.length;
  const isOver = charLimit && len > charLimit.max;
  const isUnder = charLimit && len < charLimit.min;

  return (
    <div className="rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">{icon}</span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {charLimit && (
            <span className={`text-[10px] font-medium tabular-nums ${isOver ? 'text-red-500' : isUnder ? 'text-amber-500' : 'text-slate-400'}`}>
              {len}/{charLimit.max}
            </span>
          )}
          <Pencil className="w-3 h-3 text-slate-300" />
        </div>
      </div>
      <div className="px-3.5 py-2">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm text-slate-800 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
          />
        )}
      </div>
    </div>
  );
}

export default function EditToolPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tool, setTool] = useState<ToolPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [authors, setAuthors] = useState<{ id: string; name: string; title: string }[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const loadTool = useCallback(async () => {
    const { data, error } = await supabase
      .from('tool_pages')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      router.push('/admin');
      return;
    }
    setTool(data as ToolPage);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/admin/login'); return; }
      loadTool();
      supabase.from('categories').select('slug,name').order('sort_order').then(({ data }) => {
        if (data && data.length > 0) setCategories(data.map(c => ({ value: c.slug, label: c.name })));
      });
      supabase.from('authors').select('id,name,title').eq('is_active', true).order('sort_order').then(({ data }) => {
        if (data) setAuthors(data);
      });
    });
  }, [router, loadTool]);

  function update(patch: Partial<ToolPage>) {
    if (!tool) return;
    setTool({ ...tool, ...patch });
    setHasChanges(true);
    setSaveSuccess('');
  }

  function updateFeature(index: number, field: 'title' | 'description', value: string) {
    if (!tool) return;
    const features = [...tool.features];
    features[index] = { ...features[index], [field]: value };
    update({ features });
  }

  function removeFeature(index: number) {
    if (!tool) return;
    update({ features: tool.features.filter((_, i) => i !== index) });
  }

  function addFeature() {
    if (!tool) return;
    update({ features: [...tool.features, { title: '', description: '' }] });
  }

  function updateUseCase(index: number, value: string) {
    if (!tool) return;
    const use_cases = [...tool.use_cases];
    use_cases[index] = value;
    update({ use_cases });
  }

  function removeUseCase(index: number) {
    if (!tool) return;
    update({ use_cases: tool.use_cases.filter((_, i) => i !== index) });
  }

  function addUseCase() {
    if (!tool) return;
    update({ use_cases: [...tool.use_cases, ''] });
  }

  function updatePricing(index: number, field: 'plan' | 'price', value: string) {
    if (!tool) return;
    const pricing = [...tool.pricing];
    pricing[index] = { ...pricing[index], [field]: value };
    update({ pricing });
  }

  function updatePricingFeature(tierIndex: number, featureIndex: number, value: string) {
    if (!tool) return;
    const pricing = [...tool.pricing];
    const features = [...pricing[tierIndex].features];
    features[featureIndex] = value;
    pricing[tierIndex] = { ...pricing[tierIndex], features };
    update({ pricing });
  }

  function removePricingFeature(tierIndex: number, featureIndex: number) {
    if (!tool) return;
    const pricing = [...tool.pricing];
    pricing[tierIndex] = {
      ...pricing[tierIndex],
      features: pricing[tierIndex].features.filter((_, i) => i !== featureIndex),
    };
    update({ pricing });
  }

  function addPricingFeature(tierIndex: number) {
    if (!tool) return;
    const pricing = [...tool.pricing];
    pricing[tierIndex] = {
      ...pricing[tierIndex],
      features: [...pricing[tierIndex].features, ''],
    };
    update({ pricing });
  }

  function togglePricingHighlight(tierIndex: number) {
    if (!tool) return;
    const pricing = tool.pricing.map((p, i) => ({
      ...p,
      highlighted: i === tierIndex ? !p.highlighted : false,
    }));
    update({ pricing });
  }

  function removePricingTier(index: number) {
    if (!tool) return;
    update({ pricing: tool.pricing.filter((_, i) => i !== index) });
  }

  function addPricingTier() {
    if (!tool) return;
    update({ pricing: [...tool.pricing, { plan: '', price: '', features: [], highlighted: false }] });
  }

  function updateFaq(index: number, field: 'q' | 'a', value: string) {
    if (!tool) return;
    const faqs = [...tool.faqs];
    faqs[index] = { ...faqs[index], [field]: value };
    update({ faqs });
  }

  function removeFaq(index: number) {
    if (!tool) return;
    update({ faqs: tool.faqs.filter((_, i) => i !== index) });
  }

  function addFaq() {
    if (!tool) return;
    update({ faqs: [...tool.faqs, { q: '', a: '' }] });
  }

  function updateStat(index: number, field: 'label' | 'value', value: string) {
    if (!tool) return;
    const stats = [...tool.stats];
    stats[index] = { ...stats[index], [field]: value };
    update({ stats });
  }

  function removeStat(index: number) {
    if (!tool) return;
    update({ stats: tool.stats.filter((_, i) => i !== index) });
  }

  function addStat() {
    if (!tool) return;
    update({ stats: [...tool.stats, { label: '', value: '' }] });
  }

  function updateTag(index: number, value: string) {
    if (!tool) return;
    const tags = [...tool.tags];
    tags[index] = value;
    update({ tags });
  }

  function removeTag(index: number) {
    if (!tool) return;
    update({ tags: tool.tags.filter((_, i) => i !== index) });
  }

  function addTag() {
    if (!tool) return;
    update({ tags: [...tool.tags, ''] });
  }

  async function handleSave(newStatus?: string) {
    if (!tool) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const slug = tool.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 80);
    const status = newStatus || tool.status;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('tool_pages')
      .update({
        slug,
        name: tool.name,
        tagline: tool.tagline,
        description: tool.description,
        long_description: tool.long_description,
        category: tool.category,
        tags: tool.tags,
        badge: tool.badge,
        rating: tool.rating,
        rating_count: tool.rating_count,
        users: tool.users,
        upvotes: Math.max(0, Math.min(25, tool.upvotes ?? 0)),
        reviewer_id: tool.reviewer_id || null,
        features: tool.features,
        use_cases: tool.use_cases,
        pricing: tool.pricing,
        faqs: tool.faqs,
        stats: tool.stats,
        meta_title: tool.meta_title,
        meta_description: tool.meta_description,
        focus_keyword: tool.focus_keyword,
        status,
        noindex: tool.noindex,
        pros: tool.pros || [],
        cons: tool.cons || [],
        what_we_learned: tool.what_we_learned || null,
        honest_take: tool.honest_take || [],
        logo_url: tool.logo_url || null,
        logo_alt: tool.logo_alt || null,
        screenshots: tool.screenshots || [],
        official_website: tool.official_website || null,
        founder_name: tool.founder_name || null,
        founder_linkedin: tool.founder_linkedin || null,
        latest_news: tool.latest_news || [],
        published_date: tool.published_date || null,
        updated_date: tool.updated_date || null,
        website_url: tool.website_url || null,
        is_claimed: tool.is_claimed || false,
        claimed_founded_by: tool.claimed_founded_by || null,
        claimed_founder_names: tool.claimed_founder_names || null,
        claimed_founder_linkedin: tool.claimed_founder_linkedin || null,
        claimed_about_bio: tool.claimed_about_bio || null,
        updated_at: now,
        ...(status === 'published' && !tool.published_at ? { published_at: now } : {}),
      })
      .eq('id', tool.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    setTool({ ...tool, slug, status, updated_at: now });
    setHasChanges(false);
    setSaveSuccess(newStatus === 'published' ? 'Published successfully!' : 'Changes saved.');
  }

  // Build a preview-compatible object from tool data
  const previewData = tool
    ? {
        name: tool.name,
        tagline: tool.tagline,
        description: tool.description,
        longDescription: tool.long_description,
        category: tool.category,
        tags: tool.tags,
        badge: tool.badge,
        rating: tool.rating,
        ratingCount: tool.rating_count,
        users: tool.users,
        features: tool.features,
        useCases: tool.use_cases,
        pricing: tool.pricing,
        faqs: tool.faqs,
        stats: tool.stats,
        meta_title: tool.meta_title,
        meta_description: tool.meta_description,
        slug: tool.slug,
        focus_keyword: tool.focus_keyword,
      }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!tool) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-[300px]">
                    {tool.name || 'Untitled'}
                  </p>
                  <p className="text-[11px] text-slate-400">/category/{tool.category}/{tool.slug}</p>
                </div>
                <span
                  className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${
                    tool.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {tool.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit/Preview toggle */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'edit'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'preview'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    Preview
                  </button>
                </div>

                {tool.status === 'published' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => window.open(`/category/${tool.category}/${tool.slug}`, '_blank')}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Live
                  </Button>
                )}

                {tool.status === 'draft' && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleSave('published')}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Publish
                  </Button>
                )}

                <Button
                  size="sm"
                  className={`h-8 text-xs ${
                    hasChanges
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-500 cursor-default'
                  }`}
                  onClick={() => handleSave()}
                  disabled={saving || !hasChanges}
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Save feedback */}
        {(saveError || saveSuccess) && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 ${
              saveError
                ? 'bg-red-50 text-red-700 border-b border-red-100'
                : 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'
            }`}
          >
            {saveError ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            {saveError || saveSuccess}
          </div>
        )}

        <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {viewMode === 'preview' && previewData ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <ToolPagePreview data={previewData} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main editing area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Identity */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader icon={<Type className="w-3.5 h-3.5" />} label="Identity" />
                  <div className="space-y-2">
                    <EditableField label="Name" icon={<Type className="w-3 h-3" />} value={tool.name} onChange={(v) => update({ name: v })} charLimit={{ min: 1, max: 40 }} />
                    <EditableField label="Tagline" icon={<Zap className="w-3 h-3" />} value={tool.tagline} onChange={(v) => update({ tagline: v })} charLimit={{ min: 40, max: 80 }} />
                    <EditableField label="Description" icon={<AlignLeft className="w-3 h-3" />} value={tool.description} onChange={(v) => update({ description: v })} charLimit={{ min: 80, max: 160 }} />
                    <EditableField label="Long Description" icon={<FileText className="w-3 h-3" />} value={tool.long_description} onChange={(v) => update({ long_description: v })} charLimit={{ min: 200, max: 500 }} multiline />
                  </div>
                </div>

                {/* Features */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    label="Features"
                    count={tool.features?.length}
                    action={
                      <button onClick={addFeature} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  />
                  <div className="grid grid-cols-1 gap-2">
                    {tool.features?.map((f, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 p-3.5 hover:border-slate-300 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-sky-50 flex items-center justify-center shrink-0 mt-1">
                            <GripVertical className="w-3 h-3 text-slate-300" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <input
                              type="text"
                              value={f.title}
                              onChange={(e) => updateFeature(i, 'title', e.target.value)}
                              placeholder="Feature title"
                              className="w-full text-sm font-semibold text-slate-800 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                            />
                            <textarea
                              value={f.description}
                              onChange={(e) => updateFeature(i, 'description', e.target.value)}
                              placeholder="Feature description"
                              rows={2}
                              className="w-full text-xs text-slate-500 leading-relaxed bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-none placeholder:text-slate-300"
                            />
                          </div>
                          <button onClick={() => removeFeature(i)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Use Cases */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader
                    icon={<Target className="w-3.5 h-3.5" />}
                    label="Use Cases"
                    count={tool.use_cases?.length}
                    action={
                      <button onClick={addUseCase} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {tool.use_cases?.map((uc, i) => (
                      <div key={i} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1 py-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={uc}
                          onChange={(e) => updateUseCase(i, e.target.value)}
                          className="text-xs text-slate-700 bg-transparent border-0 p-0 w-36 focus:outline-none focus:ring-0"
                          placeholder="Use case"
                        />
                        <button onClick={() => removeUseCase(i)} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader
                    icon={<DollarSign className="w-3.5 h-3.5" />}
                    label="Pricing Tiers"
                    count={tool.pricing?.length}
                    action={
                      <button onClick={addPricingTier} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add Tier
                      </button>
                    }
                  />
                  <div className="grid grid-cols-1 gap-2">
                    {tool.pricing?.map((tier, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-3.5 transition-colors ${
                          tier.highlighted
                            ? 'border-sky-300 ring-1 ring-sky-200 bg-sky-50/30'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={tier.plan}
                              onChange={(e) => updatePricing(i, 'plan', e.target.value)}
                              placeholder="Plan name"
                              className="text-sm font-semibold text-slate-800 bg-transparent border-0 p-0 w-24 focus:outline-none focus:ring-0"
                            />
                            <button
                              onClick={() => togglePricingHighlight(i)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                tier.highlighted
                                  ? 'bg-sky-100 text-sky-700 border-sky-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-sky-600'
                              }`}
                            >
                              {tier.highlighted ? 'Highlighted' : 'Highlight'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tier.price}
                              onChange={(e) => updatePricing(i, 'price', e.target.value)}
                              placeholder="$0/mo"
                              className="text-lg font-bold text-slate-900 bg-transparent border-0 p-0 w-24 text-right focus:outline-none focus:ring-0"
                            />
                            <button onClick={() => removePricingTier(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <ul className="space-y-1">
                          {tier.features?.map((f, j) => (
                            <li key={j} className="flex items-start gap-1.5">
                              <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                              <input
                                type="text"
                                value={f}
                                onChange={(e) => updatePricingFeature(i, j, e.target.value)}
                                className="flex-1 text-xs text-slate-600 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                                placeholder="Feature"
                              />
                              <button onClick={() => removePricingFeature(i, j)} className="text-slate-300 hover:text-red-500 shrink-0">
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button onClick={() => addPricingFeature(i)} className="mt-1.5 text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Add feature
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQs */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader
                    icon={<HelpCircle className="w-3.5 h-3.5" />}
                    label="FAQs"
                    count={tool.faqs?.length}
                    action={
                      <button onClick={addFaq} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  />
                  <div className="space-y-2">
                    {tool.faqs?.map((faq, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 p-3.5 hover:border-slate-300 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-start gap-1.5">
                              <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                              <input
                                type="text"
                                value={faq.q}
                                onChange={(e) => updateFaq(i, 'q', e.target.value)}
                                placeholder="Question"
                                className="w-full text-sm font-semibold text-slate-800 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                              />
                            </div>
                            <textarea
                              value={faq.a}
                              onChange={(e) => updateFaq(i, 'a', e.target.value)}
                              placeholder="Answer"
                              rows={2}
                              className="w-full text-xs text-slate-500 leading-relaxed bg-transparent border-0 p-0 pl-[18px] focus:outline-none focus:ring-0 resize-none"
                            />
                          </div>
                          <button onClick={() => removeFaq(i)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader
                    icon={<BarChart3 className="w-3.5 h-3.5" />}
                    label="Stats"
                    count={tool.stats?.length}
                    action={
                      <button onClick={addStat} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {tool.stats?.map((stat, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 p-3 text-center hover:border-slate-300 transition-colors relative group">
                        <button
                          onClick={() => removeStat(i)}
                          className="absolute top-1.5 right-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                        <input
                          type="text"
                          value={stat.value}
                          onChange={(e) => updateStat(i, 'value', e.target.value)}
                          className="text-lg font-bold text-slate-900 bg-transparent border-0 p-0 w-full text-center focus:outline-none focus:ring-0"
                        />
                        <input
                          type="text"
                          value={stat.label}
                          onChange={(e) => updateStat(i, 'label', e.target.value)}
                          className="text-[11px] text-slate-500 mt-0.5 bg-transparent border-0 p-0 w-full text-center focus:outline-none focus:ring-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Pros & Cons */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> Pros
                        </span>
                        <button onClick={() => update({ pros: [...(tool.pros || []), ''] })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(tool.pros || []).map((pro, i) => (
                          <div key={i} className="flex items-start gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                            <textarea
                              value={pro}
                              onChange={(e) => { const next = [...(tool.pros || [])]; next[i] = e.target.value; update({ pros: next }); }}
                              rows={2}
                              className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none resize-none"
                            />
                            <button onClick={() => update({ pros: (tool.pros || []).filter((_, j) => j !== i) })} className="text-emerald-300 hover:text-red-500 shrink-0">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1">
                          <ThumbsDown className="w-3 h-3" /> Cons
                        </span>
                        <button onClick={() => update({ cons: [...(tool.cons || []), ''] })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(tool.cons || []).map((con, i) => (
                          <div key={i} className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5">
                            <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                            <textarea
                              value={con}
                              onChange={(e) => { const next = [...(tool.cons || [])]; next[i] = e.target.value; update({ cons: next }); }}
                              rows={2}
                              className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none resize-none"
                            />
                            <button onClick={() => update({ cons: (tool.cons || []).filter((_, j) => j !== i) })} className="text-red-200 hover:text-red-500 shrink-0">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* What We Learned */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader icon={<FlaskConical className="w-3.5 h-3.5" />} label="Case Study: What We Learned After Testing" />
                    {!tool.what_we_learned && (
                      <button onClick={() => update({ what_we_learned: { use_case: '', bullets: ['', '', ''] } })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5 -mt-3">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                  {tool.what_we_learned ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={tool.what_we_learned.use_case}
                        onChange={(e) => update({ what_we_learned: { ...tool.what_we_learned!, use_case: e.target.value } })}
                        placeholder="Use case tested (e.g. SEO content for startups)"
                        className="w-full text-xs text-slate-700 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                      <div className="space-y-1.5">
                        {tool.what_we_learned.bullets.map((b, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2">
                            <span className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-[9px] font-bold text-teal-700 mt-0.5">{i + 1}</span>
                            <textarea
                              value={b}
                              onChange={(e) => { const next = [...tool.what_we_learned!.bullets]; next[i] = e.target.value; update({ what_we_learned: { ...tool.what_we_learned!, bullets: next } }); }}
                              rows={2}
                              className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none resize-none"
                              placeholder="Insight from testing..."
                            />
                            <button onClick={() => update({ what_we_learned: { ...tool.what_we_learned!, bullets: tool.what_we_learned!.bullets.filter((_, j) => j !== i) } })} className="text-teal-300 hover:text-red-500 shrink-0">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => update({ what_we_learned: { ...tool.what_we_learned!, bullets: [...tool.what_we_learned!.bullets, ''] } })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Add bullet
                        </button>
                      </div>
                      <button onClick={() => update({ what_we_learned: null })} className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-0.5">
                        <Trash2 className="w-3 h-3" /> Remove section
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Not added. Click Add to create.</p>
                  )}
                </div>

                {/* Honest Take */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader
                    icon={<Lightbulb className="w-3.5 h-3.5" />}
                    label="Our Honest Take"
                    count={tool.honest_take?.length}
                    action={
                      <button onClick={() => update({ honest_take: [...(tool.honest_take || []), ''] })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  />
                  <div className="space-y-2">
                    {(tool.honest_take || []).map((bullet, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2.5">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <textarea
                          value={bullet}
                          onChange={(e) => { const next = [...(tool.honest_take || [])]; next[i] = e.target.value; update({ honest_take: next }); }}
                          rows={2}
                          className="flex-1 text-xs text-slate-700 bg-transparent border-0 p-0 focus:outline-none resize-none leading-relaxed"
                          placeholder='Start with "In our experience,", "We found that", "Honestly,"...'
                        />
                        <button onClick={() => update({ honest_take: (tool.honest_take || []).filter((_, j) => j !== i) })} className="text-amber-300 hover:text-red-500 shrink-0">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Screenshots */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader
                    icon={<ImageIcon className="w-3.5 h-3.5" />}
                    label="Screenshots (up to 5)"
                    count={tool.screenshots?.length}
                    action={
                      (tool.screenshots?.length ?? 0) < 5
                        ? <button onClick={() => update({ screenshots: [...(tool.screenshots || []), { url: '', alt: '' }] })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        : undefined
                    }
                  />
                  <div className="space-y-2">
                    {(tool.screenshots || []).map((s, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={s.url}
                            onChange={(e) => { const next = [...(tool.screenshots || [])]; next[i] = { ...next[i], url: e.target.value }; update({ screenshots: next }); }}
                            placeholder="https://..."
                            className="flex-1 text-xs text-slate-700 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
                          <button onClick={() => update({ screenshots: (tool.screenshots || []).filter((_, j) => j !== i) })} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={s.alt}
                          onChange={(e) => { const next = [...(tool.screenshots || [])]; next[i] = { ...next[i], alt: e.target.value }; update({ screenshots: next }); }}
                          placeholder={`${tool.name || 'Tool'} - screen description`}
                          className="w-full text-xs text-slate-500 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latest News */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <SectionHeader
                    icon={<Newspaper className="w-3.5 h-3.5" />}
                    label="Latest News"
                    count={tool.latest_news?.length}
                    action={
                      <button onClick={() => update({ latest_news: [...(tool.latest_news || []), { title: '', url: '' }] })} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    }
                  />
                  <div className="space-y-2">
                    {(tool.latest_news || []).map((item, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => { const next = [...(tool.latest_news || [])]; next[i] = { ...next[i], title: e.target.value }; update({ latest_news: next }); }}
                            placeholder="Article title"
                            className="flex-1 text-xs text-slate-700 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 focus:outline-none"
                          />
                          <button onClick={() => update({ latest_news: (tool.latest_news || []).filter((_, j) => j !== i) })} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="url"
                          value={item.url}
                          onChange={(e) => { const next = [...(tool.latest_news || [])]; next[i] = { ...next[i], url: e.target.value }; update({ latest_news: next }); }}
                          placeholder="https://..."
                          className="w-full text-xs text-slate-500 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Page status */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status</h3>
                  <div className="space-y-2">
                    <Select value={tool.status} onValueChange={(v) => update({ status: v })}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    {tool.published_at && (
                      <p className="text-[11px] text-slate-400">
                        Published {format(new Date(tool.published_at), 'MMM d, yyyy')}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Updated {format(new Date(tool.updated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

                {/* Classification */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Classification</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
                      <Select value={tool.category} onValueChange={(v) => update({ category: v })}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Badge</label>
                      <Select value={tool.badge || '_none'} onValueChange={(v) => update({ badge: v === '_none' ? null : v })}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BADGES.map((b) => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">Tags</label>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {tool.tags?.map((tag, i) => (
                          <div key={i} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full pl-2.5 pr-1 py-0.5">
                            <input
                              type="text"
                              value={tag}
                              onChange={(e) => updateTag(i, e.target.value)}
                              className="text-xs text-slate-700 bg-transparent border-0 p-0 w-16 focus:outline-none focus:ring-0"
                            />
                            <button onClick={() => removeTag(i)} className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 hover:text-red-500">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <button onClick={addTag} className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed border-sky-200 hover:border-sky-400 transition-colors">
                          <Plus className="w-2.5 h-2.5" /> Tag
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reviewer */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Reviewer</h3>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Assigned Reviewer
                    </label>
                    <select
                      value={tool.reviewer_id || ''}
                      onChange={e => update({ reviewer_id: e.target.value || null })}
                      className="w-full h-8 text-sm border border-slate-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                    >
                      <option value="">— Default (Venkat Sundaram) —</option>
                      {authors.map(a => (
                        <option key={a.id} value={a.id}>{a.name} · {a.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Social proof */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Social Proof</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1">
                        <Star className="w-3 h-3" /> Rating
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={tool.rating}
                        onChange={(e) => update({ rating: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Review Count</label>
                      <Input
                        value={tool.rating_count}
                        onChange={(e) => update({ rating_count: e.target.value })}
                        className="h-8 text-sm"
                        placeholder="e.g. 1.2k"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Users
                      </label>
                      <Input
                        value={tool.users}
                        onChange={(e) => update({ users: e.target.value })}
                        className="h-8 text-sm"
                        placeholder="e.g. 50k+"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> Upvotes <span className="text-slate-400 font-normal">(1–25)</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="25"
                        value={tool.upvotes ?? 0}
                        onChange={(e) => update({ upvotes: Math.max(0, Math.min(25, parseInt(e.target.value) || 0)) })}
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Enrichment */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrichment</h3>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Website URL (Visit Website button)</label>
                    <Input value={tool.website_url || ''} onChange={(e) => update({ website_url: e.target.value || null })} className="h-8 text-sm" placeholder="https://froglead.io/" />
                    {tool.website_url && (
                      <p className="text-[10px] text-slate-400 mt-1 font-mono break-all">
                        UTM: {(() => { try { const u = new URL(tool.website_url.startsWith('http') ? tool.website_url : `https://${tool.website_url}`); u.searchParams.set('utm_source','astrogtm'); u.searchParams.set('utm_medium','tools'); u.searchParams.set('utm_campaign','claim'); return u.toString(); } catch { return tool.website_url; } })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Official Website</label>
                    <Input value={tool.official_website || ''} onChange={(e) => update({ official_website: e.target.value || null })} className="h-8 text-sm" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Logo URL</label>
                    <Input value={tool.logo_url || ''} onChange={(e) => update({ logo_url: e.target.value || null })} className="h-8 text-sm" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Logo Alt Text</label>
                    <Input value={tool.logo_alt || ''} onChange={(e) => update({ logo_alt: e.target.value || null })} className="h-8 text-sm" placeholder={`${tool.name || 'Tool'} logo`} />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Founder Name</label>
                    <Input value={tool.founder_name || ''} onChange={(e) => update({ founder_name: e.target.value || null })} className="h-8 text-sm" placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1"><Linkedin className="w-3 h-3" /> Founder LinkedIn</label>
                    <Input value={tool.founder_linkedin || ''} onChange={(e) => update({ founder_linkedin: e.target.value || null })} className="h-8 text-sm" placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Published Date</label>
                    <Input type="date" value={tool.published_date ? tool.published_date.slice(0, 10) : ''} onChange={(e) => update({ published_date: e.target.value || null })} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Updated Date</label>
                    <Input type="date" value={tool.updated_date ? tool.updated_date.slice(0, 10) : ''} onChange={(e) => update({ updated_date: e.target.value || null })} className="h-8 text-sm" />
                  </div>
                </div>

                {/* Claimed listing */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-sky-500" /> Claimed Listing</h3>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={tool.is_claimed || false} onChange={e => update({ is_claimed: e.target.checked })} className="rounded accent-sky-600" />
                      <span className="text-[11px] text-slate-600 font-medium">Claimed</span>
                    </label>
                  </div>
                  {tool.is_claimed && (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Founded By (label)</label>
                        <Input value={tool.claimed_founded_by || ''} onChange={e => update({ claimed_founded_by: e.target.value || null })} className="h-8 text-sm" placeholder="Founded by" />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Founder Names</label>
                        <Input value={tool.claimed_founder_names || ''} onChange={e => update({ claimed_founder_names: e.target.value || null })} className="h-8 text-sm" placeholder="Jane Smith, John Doe" />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1"><Linkedin className="w-3 h-3" /> Founder LinkedIn</label>
                        <Input value={tool.claimed_founder_linkedin || ''} onChange={e => update({ claimed_founder_linkedin: e.target.value || null })} className="h-8 text-sm" placeholder="https://linkedin.com/in/..." />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">About Bio</label>
                        <textarea value={tool.claimed_about_bio || ''} onChange={e => update({ claimed_about_bio: e.target.value || null })} rows={3} className="w-full text-xs text-slate-700 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none" placeholder="Brief bio about the founders and their mission..." />
                      </div>
                    </>
                  )}
                </div>

                {/* SEO */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SEO Metadata</h3>
                  <div className="space-y-2">
                    <EditableField label="Meta Title" icon={<Search className="w-3 h-3" />} value={tool.meta_title} onChange={(v) => update({ meta_title: v })} charLimit={{ min: 50, max: 60 }} />
                    <EditableField label="Meta Description" icon={<Search className="w-3 h-3" />} value={tool.meta_description} onChange={(v) => update({ meta_description: v })} charLimit={{ min: 120, max: 160 }} multiline />
                    <EditableField label="Slug" icon={<Link2 className="w-3 h-3" />} value={tool.slug} onChange={(v) => update({ slug: v })} charLimit={{ min: 5, max: 40 }} />
                    <EditableField label="Focus Keyword" icon={<Tag className="w-3 h-3" />} value={tool.focus_keyword} onChange={(v) => update({ focus_keyword: v })} />
                  </div>

                  {/* SERP preview */}
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Search Preview</p>
                    <p className="text-xs text-emerald-700 truncate">yoursite.com/category/{tool.category}/{tool.slug}</p>
                    <p className="text-sm text-blue-700 hover:underline cursor-pointer mt-0.5 truncate leading-snug">
                      {tool.meta_title || tool.name}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {tool.meta_description}
                    </p>
                  </div>
                </div>

                {/* Save CTA */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <Button
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm"
                    onClick={() => handleSave()}
                    disabled={saving || !hasChanges}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {hasChanges ? 'Save Changes' : 'No Changes'}
                  </Button>
                  {tool.status === 'draft' && (
                    <Button
                      variant="outline"
                      className="w-full text-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => handleSave('published')}
                      disabled={saving}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Save & Publish
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
