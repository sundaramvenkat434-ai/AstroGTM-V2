'use client';

import { useEffect, useRef } from 'react';

export function PageViewTracker({ pageId }: { pageId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/track-pageview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ page_id: pageId }),
      }
    ).catch(() => {});
  }, [pageId]);

  return null;
}
