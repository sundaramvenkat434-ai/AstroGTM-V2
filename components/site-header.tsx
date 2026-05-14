'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Mail, Send, Check, MailCheck, ArrowRight, Sparkles, Users, Zap } from 'lucide-react';

/* ── AstroGTM logo ──────────────────────────────────────────── */
export function AstroGTMLogo({ size = 32 }: { size?: number }) {
  const h = size;
  const w = Math.round(size * 3.9);
  return (
    <svg width={w} height={h} viewBox="0 0 125 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="agtm-pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e6fa8" />
          <stop offset="100%" stopColor="#0c4a7a" />
        </linearGradient>
        <linearGradient id="agtm-og" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
          <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="agtm-shine" cx="35%" cy="30%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Planet body */}
      <circle cx="16" cy="16" r="11" fill="url(#agtm-pg)" />
      {/* Surface bands */}
      <ellipse cx="16" cy="19" rx="11" ry="3.5" fill="#0b3d63" fillOpacity="0.4" />
      <ellipse cx="16" cy="12" rx="9" ry="2.5" fill="#1a5a8a" fillOpacity="0.3" />
      {/* Shine */}
      <circle cx="16" cy="16" r="11" fill="url(#agtm-shine)" />
      {/* Pole highlight */}
      <circle cx="11" cy="11" r="2.5" fill="white" fillOpacity="0.18" />

      {/* Orbit ring */}
      <ellipse cx="16" cy="16" rx="16" ry="6" stroke="url(#agtm-og)" strokeWidth="1.5" fill="none" />

      {/* Orbiting moon */}
      <circle cx="32" cy="13" r="2.6" fill="#bae6fd" />
      <circle cx="31.2" cy="12.2" r="0.9" fill="white" fillOpacity="0.6" />

      {/* Growth arc above */}
      <path d="M4 8.5 Q16 0.5 28 8.5" stroke="#38bdf8" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeOpacity="0.55" />
      <path d="M25.5 6 L28 8.5 L25.3 9" stroke="#38bdf8" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" />

      {/* Wordmark: AstroGTM as one word, Astro near-black, GTM dark blue */}
      <text
        x="38" y="22"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="800"
        fontSize="18"
        fill="#0f172a"
        letterSpacing="-0.6"
      ><tspan fill="#0f172a">Astro</tspan><tspan fill="#0369a1" fontWeight="900">GTM</tspan></text>
    </svg>
  );
}

/* ── Newsletter modal ───────────────────────────────────────── */
function NewsletterModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 transition-all duration-200"
      style={{ background: visible ? 'rgba(15,23,42,0.55)' : 'rgba(15,23,42,0)', backdropFilter: visible ? 'blur(4px)' : 'blur(0px)' }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden transition-all duration-200"
        style={{ transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)', opacity: visible ? 1 : 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top gradient bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #0ea5e9, #38bdf8, #0ea5e9)' }} />

        {/* Close */}
        <button onClick={handleClose} className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-base leading-none">×</button>

        {done ? (
          <div className="px-8 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <MailCheck className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">You&apos;re in!</h3>
            <p className="text-sm text-slate-500 leading-relaxed">First issue drops weekly. We&apos;ll surface tools before they go mainstream.</p>
          </div>
        ) : (
          <div className="px-6 pt-6 pb-7">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full mb-4">
              <Sparkles className="w-3 h-3" /> Weekly Newsletter
            </span>

            <h3 className="text-[18px] font-extrabold text-slate-900 leading-snug mb-1.5 tracking-tight">
              Find emerging AI tools first
            </h3>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-5">
              Weekly digest for GTM, SEO &amp; growth teams — curated picks, free tiers, and early-access deals.
            </p>

            {/* Social proof row */}
            <div className="flex items-center gap-4 mb-5 text-[12px] text-slate-500">
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-sky-500" /><strong className="text-slate-700 font-semibold">2,400+</strong> subscribers</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /><strong className="text-slate-700 font-semibold">Weekly</strong> drops</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />No spam</span>
            </div>

            <form onSubmit={e => { e.preventDefault(); if (email.trim()) setDone(true); }} className="space-y-2.5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 placeholder-slate-400 transition"
                />
              </div>
              <button type="submit"
                className="group w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                Join the newsletter
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-400 mt-3">Unsubscribe anytime · No credit card needed</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Site header ────────────────────────────────────────────── */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 py-3">
            <Link href="/" className="flex items-center group">
              <AstroGTMLogo size={36} />
            </Link>
            <button onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 active:scale-95 transition-all">
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Join Newsletter</span>
              <span className="sm:hidden">Subscribe</span>
            </button>
          </div>
        </div>
      </header>
      {open && <NewsletterModal onClose={() => setOpen(false)} />}
    </>
  );
}

/* ── Inner page header (breadcrumb) ─────────────────────────── */
interface BreadcrumbItem { label: string; href?: string }

export function InnerHeader({ crumbs }: { crumbs: BreadcrumbItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
              <Link href="/" className="flex items-center text-slate-900 hover:text-sky-600 transition-colors shrink-0">
                <AstroGTMLogo size={28} />
              </Link>
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-300">/</span>
                  {c.href ? (
                    <Link href={c.href} className="text-slate-500 hover:text-slate-900 transition-colors truncate">{c.label}</Link>
                  ) : (
                    <span className="text-slate-900 font-medium truncate max-w-[180px]">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                <Mail className="w-3.5 h-3.5" />
                Newsletter
              </button>
            </div>
          </div>
        </div>
      </header>
      {open && <NewsletterModal onClose={() => setOpen(false)} />}
    </>
  );
}

/* ── Page-level breadcrumb bar (below header, inside page body) ── */
export function PageBreadcrumb({ crumbs }: { crumbs: BreadcrumbItem[] }) {
  return (
    <div className="bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 py-2.5 text-[13px] min-w-0 overflow-x-auto scrollbar-none">
          <Link href="/" className="text-slate-500 hover:text-slate-900 transition-colors shrink-0 whitespace-nowrap">
            Home
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0 shrink-0">
              <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {c.href ? (
                <Link href={c.href} className="text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap truncate max-w-[200px]">{c.label}</Link>
              ) : (
                <span className="text-slate-800 font-semibold whitespace-nowrap truncate max-w-[200px]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
