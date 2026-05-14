'use client';

import { ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  toolId: string;
  websiteUrl: string;
}

function buildUtmUrl(base: string): string {
  try {
    const url = new URL(base.startsWith('http') ? base : `https://${base}`);
    url.searchParams.set('utm_source', 'astrogtm');
    url.searchParams.set('utm_medium', 'tools');
    url.searchParams.set('utm_campaign', 'claim');
    return url.toString();
  } catch {
    return base;
  }
}

export function VisitWebsiteButton({ toolId, websiteUrl }: Props) {
  const utmUrl = buildUtmUrl(websiteUrl);

  async function handleClick() {
    await supabase.rpc('increment_website_clicks', { tool_id: toolId });
    window.open(utmUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <button
      onClick={handleClick}
      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-sky-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-sky-500 active:scale-[0.97] transition-all shadow-sm shadow-sky-200"
    >
      <ExternalLink className="w-4 h-4" />
      Visit Website
    </button>
  );
}
