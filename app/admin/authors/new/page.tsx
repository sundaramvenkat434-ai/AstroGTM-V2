'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewAuthorPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/authors/edit/new'); }, [router]);
  return null;
}
