'use client';

import { useState, useEffect } from 'react';

export interface SidebarSection {
  id: string;
  label: string;
}

const DEFAULT_SECTIONS: SidebarSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

const SECTION_DOTS: Record<string, string> = {
  overview: 'bg-slate-400',
  features: 'bg-sky-500',
  screenshots: 'bg-slate-300',
  pricing: 'bg-emerald-500',
  faq: 'bg-slate-300',
  'pros-cons': 'bg-emerald-400',
  'what-we-learned': 'bg-teal-500',
  'honest-take': 'bg-amber-400',
  'about-author': 'bg-slate-300',
  'similar-tools': 'bg-slate-300',
};

interface Props {
  sections?: SidebarSection[];
}

export function ToolSidebarNav({ sections = DEFAULT_SECTIONS }: Props) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(`section-${s.id}`))
      .filter(Boolean) as HTMLElement[];

    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id.replace('section-', ''));
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <aside className="hidden xl:block w-52 shrink-0 self-start sticky top-8">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">On this page</p>
        </div>
        <nav className="max-h-[calc(100vh-8rem)] overflow-y-auto p-2 space-y-0.5 scrollbar-none">
          {sections.map((section) => {
            const isActive = activeId === section.id;
            const dot = SECTION_DOTS[section.id] ?? 'bg-slate-300';
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveId(section.id);
                  document
                    .getElementById(`section-${section.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                    isActive ? 'bg-white/70' : dot
                  }`}
                />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
