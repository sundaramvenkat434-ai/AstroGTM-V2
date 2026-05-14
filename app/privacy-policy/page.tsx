import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

export const metadata: Metadata = {
  title: 'Privacy Policy — ToolKit',
  description: 'How ToolKit collects, uses, and protects your personal information.',
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: January 2025</p>

        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <Section title="Information We Collect">
            <p>We collect information you provide directly, such as when you subscribe to our newsletter or contact us. This includes your email address and any message content you send.</p>
            <p>We also collect usage data automatically, including pages visited, time on site, browser type, and referring URLs, through standard analytics tools.</p>
          </Section>

          <Section title="How We Use Your Information">
            <p>We use collected information to send newsletters you requested, respond to inquiries, improve our content, and understand how readers use the site.</p>
            <p>We do not sell your personal information to third parties.</p>
          </Section>

          <Section title="Cookies">
            <p>We use cookies for analytics purposes (e.g. Google Analytics or similar) to understand page traffic. You can disable cookies in your browser settings at any time.</p>
          </Section>

          <Section title="Third-Party Services">
            <p>Our site may link to third-party tools and services. We are not responsible for the privacy practices of those sites. Links to affiliate products are disclosed where applicable.</p>
          </Section>

          <Section title="Data Retention">
            <p>We retain newsletter subscriber data for as long as you remain subscribed. You may unsubscribe at any time via the link in any email.</p>
          </Section>

          <Section title="Your Rights">
            <p>Depending on your location, you may have rights to access, correct, or delete your personal data. Contact us at the address below to make a request.</p>
          </Section>

          <Section title="Contact">
            <p>
              For privacy-related questions, email us via our{' '}
              <Link href="/contact" className="text-sky-600 hover:text-sky-800 underline">contact page</Link>.
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
