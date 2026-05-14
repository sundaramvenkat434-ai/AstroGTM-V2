'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ArrowLeft,
  Loader as Loader2,
  Save,
  RotateCcw,
  MessageSquareCode,
  Sparkles,
  Shield,
  Zap,
  CircleCheck as CheckCircle2,
  TriangleAlert as AlertTriangle,
} from 'lucide-react';

interface PromptSetting {
  key: string;
  value: string;
  updated_at: string;
}

const PROMPT_KEYS = [
  {
    key: 'ai_content_cleanup_prompt',
    label: 'Tool Page V1 — Content Clean-Up',
    description:
      'Used by the structure-page function (Tool Listing flow) to transform raw text into a structured tool-page JSON. Edit to tune V1 output quality.',
    icon: Sparkles,
    usedBy: 'structure-page',
  },
  {
    key: 'ai_content_cleanup_prompt_v2',
    label: 'Tool Page V2 — Content Clean-Up (A/B Test)',
    description:
      'Used by the structure-page function when "Tool Page 2.0" is selected in Create Page. Same JSON schema as V1 — edit to A/B test a different prompt style.',
    icon: Sparkles,
    usedBy: 'structure-page',
  },
  {
    key: 'eeat_analysis_prompt',
    label: 'E-E-A-T Analysis',
    description:
      "Used by the run-eeat function to score page content against Google's Experience, Expertise, Authoritativeness, and Trustworthiness framework.",
    icon: Shield,
    usedBy: 'run-eeat',
  },
  {
    key: 'top_x_slug_system_prompt',
    label: 'Top X — Slug & Metadata Generation',
    description:
      'System prompt used by the generate-top-x function (slug mode) to generate an SEO-optimised slug, page name, tagline, and focus keyword from the selected tools.',
    icon: Zap,
    usedBy: 'generate-top-x',
  },
  {
    key: 'top_x_content_system_prompt',
    label: 'Top X — Full Content Generation',
    description:
      'System prompt used by the generate-top-x function (content mode) to generate the complete comparison page: entries, comparison table, best-for segments, FAQs, intro, outro, and SEO metadata.',
    icon: Sparkles,
    usedBy: 'generate-top-x',
  },
  {
    key: 'pagespeed_api_key',
    label: 'PageSpeed API Key',
    description:
      'Google PageSpeed Insights API key used by the run-lighthouse edge function. Required for Lighthouse scoring in the dashboard.',
    icon: Zap,
    usedBy: 'run-lighthouse',
  },
];

export default function PromptsAdmin() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Record<string, PromptSetting>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const fetchPrompts = useCallback(async () => {
    const keys = PROMPT_KEYS.map((p) => p.key);
    const { data } = await supabase
      .from('admin_settings')
      .select('key, value, updated_at')
      .in('key', keys);

    if (data) {
      const map: Record<string, PromptSetting> = {};
      const draftMap: Record<string, string> = {};
      for (const row of data as PromptSetting[]) {
        map[row.key] = row;
        draftMap[row.key] = row.value;
      }
      setPrompts(map);
      setDrafts(draftMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/admin/login');
        return;
      }
      fetchPrompts();
    });
  }, [router, fetchPrompts]);

  async function handleSave(key: string) {
    const value = drafts[key];
    if (value === undefined) return;

    setSaving((prev) => ({ ...prev, [key]: true }));
    setSaved((prev) => ({ ...prev, [key]: false }));

    const { error } = await supabase
      .from('admin_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    setSaving((prev) => ({ ...prev, [key]: false }));

    if (!error) {
      setPrompts((prev) => ({
        ...prev,
        [key]: { ...prev[key], value, updated_at: new Date().toISOString() },
      }));
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 3000);
    }
  }

  function handleReset(key: string) {
    if (prompts[key]) {
      setDrafts((prev) => ({ ...prev, [key]: prompts[key].value }));
    }
  }

  function hasChanges(key: string): boolean {
    return prompts[key] !== undefined && drafts[key] !== prompts[key].value;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-5 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900">
                  <MessageSquareCode className="w-3.5 h-3.5 text-white" />
                </div>
                <h1 className="text-sm font-semibold text-slate-900">
                  AI Prompts
                </h1>
              </div>
            </div>
            <Badge variant="secondary" className="text-[11px]">
              {PROMPT_KEYS.length} prompts
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-sm text-slate-500 max-w-2xl">
            These prompts are sent to the AI model as system instructions in
            each edge function. Changes take effect immediately on the next
            function call.
          </p>
        </div>

        <div className="space-y-6">
          {PROMPT_KEYS.map((config) => {
            const Icon = config.icon;
            const draft = drafts[config.key] ?? '';
            const isSaving = saving[config.key] ?? false;
            const isSaved = saved[config.key] ?? false;
            const changed = hasChanges(config.key);
            const missing = !prompts[config.key];

            return (
              <Card key={config.key} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {config.label}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs leading-relaxed">
                          {config.description}
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Edge Function: {config.usedBy}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Key: {config.key}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {missing && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Not found
                        </Badge>
                      )}
                      {isSaved && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Saved
                        </Badge>
                      )}
                      {changed && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                        >
                          Unsaved changes
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={draft}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [config.key]: e.target.value,
                      }))
                    }
                    rows={12}
                    className="text-xs leading-relaxed font-mono border-slate-200 focus-visible:ring-sky-500/20 focus-visible:border-sky-400 resize-y"
                    placeholder="Prompt content..."
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {draft.length.toLocaleString()} characters
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReset(config.key)}
                        disabled={!changed || isSaving}
                        className="h-8 text-xs"
                      >
                        <RotateCcw className="w-3 h-3 mr-1.5" />
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(config.key)}
                        disabled={!draft.trim() || isSaving}
                        className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3 mr-1.5" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
