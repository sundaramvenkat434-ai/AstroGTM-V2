'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CategoryEditor, { type CategoryData } from '../../CategoryEditor';

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CategoryData | null>(null);

  useEffect(() => {
    supabase.from('categories').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (data) setData(data as CategoryData);
    });
  }, [id]);

  if (!data) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Loading…</div>;

  return <CategoryEditor mode="edit" initial={data} />;
}
