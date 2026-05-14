import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap, Mail, MessageSquare } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

export const metadata: Metadata = {
  title: 'Contact — ToolKit',
  description: 'Get in touch with the ToolKit team for review requests, corrections, or partnership inquiries.',
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900">
              <Zap className="w-3.5 h-3.5 text-white" />
            </span>
            ToolKit
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Get in touch</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-4">Contact Us</h1>
        <p className="text-base text-slate-600 mb-10">
          We welcome corrections, review requests, and partnership inquiries. We read every message but may not be able to reply to all.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Editorial &amp; Corrections</h2>
            <p className="text-xs text-slate-500 mb-3">Found an error? Want to suggest a tool for review?</p>
            <a href="mailto:editorial@toolkit.io" className="text-sm text-sky-600 hover:text-sky-800 transition-colors">
              editorial@toolkit.io
            </a>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Partnerships</h2>
            <p className="text-xs text-slate-500 mb-3">Sponsorship, content partnerships, or vendor inquiries.</p>
            <a href="mailto:partners@toolkit.io" className="text-sm text-sky-600 hover:text-sky-800 transition-colors">
              partners@toolkit.io
            </a>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          <strong className="font-semibold">Vendor note:</strong> We do not accept payment for reviews or ratings. Sponsored content is clearly labelled and kept separate from editorial.
        </div>
      </main>
    </div>
  );
}
