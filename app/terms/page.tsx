import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

export const metadata: Metadata = {
  title: 'Terms of Service — ToolKit',
  description: 'Terms and conditions for using ToolKit.',
  alternates: { canonical: `${SITE_URL}/terms` },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function TermsPage() {
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
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Legal</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: January 2025</p>

        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <Section title="Acceptance of Terms">
            <p>By accessing or using ToolKit, you agree to be bound by these Terms of Service. If you do not agree, please do not use the site.</p>
          </Section>

          <Section title="Use of Content">
            <p>All content on ToolKit — including reviews, ratings, comparisons, and editorial commentary — is for informational purposes only. You may not reproduce, distribute, or republish our content without written permission.</p>
            <p>Short quotes with attribution and a link back are permitted under fair use.</p>
          </Section>

          <Section title="Accuracy of Information">
            <p>We strive to keep reviews accurate and up to date. However, software products change frequently. We make no warranty that any information on this site is complete, current, or error-free.</p>
            <p>Tool ratings, pricing, and feature details should be verified directly with the vendor before making purchasing decisions.</p>
          </Section>

          <Section title="Affiliate Disclosure">
            <p>Some links on ToolKit may be affiliate links. If you purchase a product through such a link, we may earn a commission at no additional cost to you. Affiliate relationships do not influence our editorial ratings or recommendations.</p>
          </Section>

          <Section title="Third-Party Links">
            <p>Our site links to external tools and services. We are not responsible for the content, accuracy, or practices of any third-party sites.</p>
          </Section>

          <Section title="Limitation of Liability">
            <p>ToolKit is provided "as is." We are not liable for any decisions made based on information published on this site, including purchasing decisions, implementation choices, or investment decisions.</p>
          </Section>

          <Section title="Changes to Terms">
            <p>We may update these terms at any time. Continued use of the site after changes constitutes acceptance of the updated terms.</p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms?{' '}
              <Link href="/contact" className="text-sky-600 hover:text-sky-800 underline">Contact us</Link>.
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
