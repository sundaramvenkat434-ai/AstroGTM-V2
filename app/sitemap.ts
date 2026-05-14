import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: entries } = await supabase
    .from('sitemap_entries')
    .select('loc, lastmod, changefreq, priority')
    .eq('enabled', true)
    .order('priority', { ascending: false });

  if (!entries || entries.length === 0) return [];

  // Deduplicate by URL
  const seen = new Set<string>();
  const result: MetadataRoute.Sitemap = [];

  for (const e of entries) {
    const url = e.loc.startsWith('http') ? e.loc : `${SITE_URL}${e.loc}`;
    if (seen.has(url)) continue;
    seen.add(url);
    result.push({
      url,
      lastModified: new Date(e.lastmod),
      changeFrequency: e.changefreq as MetadataRoute.Sitemap[number]['changeFrequency'],
      priority: Number(e.priority),
    });
  }

  return result;
}
