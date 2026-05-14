'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        <span className="font-medium text-[13px] text-slate-900">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-4 text-[13px] text-slate-500 leading-relaxed">
            {a}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqSection({ faqs }: { faqs: { q: string; a: string }[] }) {
  if (faqs.length === 0) return null;
  return (
    <section id="section-faq">
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full shrink-0 bg-slate-400" />
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Frequently Asked Questions</h2>
        </div>
        <p className="text-[12px] text-slate-400 mt-1 ml-[14px]">Common questions about this tool</p>
      </div>
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
        {faqs.map((faq, i) => (
          <FaqItem key={i} q={faq.q} a={faq.a} />
        ))}
      </div>
    </section>
  );
}
