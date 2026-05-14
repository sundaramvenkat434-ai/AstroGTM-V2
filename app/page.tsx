'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { SiteHeader } from '@/components/site-header';
import { UpvoteButton } from '@/components/upvote-button';
import { SiteFooter } from '@/components/site-footer';
import {
  Search, TrendingUp, Users, Megaphone, Star, ArrowRight, Sparkles,
  LayoutGrid, Gift, Check, ExternalLink,
  Zap, Share2, ChevronRight, ChevronLeft,
} from 'lucide-react';

/* ─── types ─────────────────────────────────────────────────── */
interface ToolPage {
  id: string; slug: string; name: string; tagline: string;
  description: string; category: string; tags: string[];
  badge: string | null; rating: number; rating_count: string;
  users: string; upvotes: number; use_cases: string[];
}

/* ─── tokens ─────────────────────────────────────────────────── */
const SECTION_ORDER = ['lead-generation', 'sales-outreach', 'seo-content', 'social-media'];
const SECTION_LABELS: Record<string, string> = {
  'lead-generation': 'Lead Generation',
  'sales-outreach': 'Sales Outreach',
  'seo-content': 'SEO & Content',
  'social-media': 'Social Media',
};
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'lead-generation': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' },
  'sales-outreach':  { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  'seo-content':     { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'social-media':    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <LayoutGrid className="w-4 h-4" />,
  'lead-generation': <Users className="w-4 h-4" />,
  'sales-outreach': <Megaphone className="w-4 h-4" />,
  'seo-content': <TrendingUp className="w-4 h-4" />,
  'social-media': <Share2 className="w-4 h-4" />,
};
const BADGE_STYLES: Record<string, string> = {
  new:     'bg-sky-50 text-sky-700 border-sky-200',
  popular: 'bg-amber-50 text-amber-700 border-amber-200',
  free:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  hot:     'bg-rose-50 text-rose-700 border-rose-200',
};
const CARD_COLORS = ['#0284c7', '#0d9488', '#f59e0b', '#ef4444', '#10b981', '#0ea5e9', '#8b5cf6', '#f97316'];

/* ─── category pill ─────────────────────────────────────────── */
function CategoryPill({ category, linked = false }: { category: string; linked?: boolean }) {
  const c = CATEGORY_COLORS[category];
  if (!c) return null;
  const pill = (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-opacity ${c.bg} ${c.text} ${c.border} ${linked ? 'hover:opacity-75' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {SECTION_LABELS[category] ?? category}
    </span>
  );
  if (linked) return <Link href={`/category/${category}`}>{pill}</Link>;
  return pill;
}

/* ─── top picks card (compact horizontal) ───────────────────── */
function TopPickCard({ tool }: { tool: ToolPage }) {
  return (
    <Link
      href={`/category/${tool.category}/${tool.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 w-60 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/50 transition-all duration-200"
    >
      {/* Top: avatar + name + badge + category */}
      <div className="px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-xs bg-slate-800">{tool.name.charAt(0)}</div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-bold text-slate-900 group-hover:text-sky-700 transition-colors leading-tight truncate">
              {tool.name}
            </span>
            {tool.badge && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${BADGE_STYLES[tool.badge] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {tool.badge}
              </span>
            )}
          </div>
        </div>
        <CategoryPill category={tool.category} />
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mt-2">{tool.tagline || tool.description}</p>
      </div>

      {/* Tags */}
      {(tool.tags as string[])?.length > 0 && (
        <div className="px-3.5 pb-2.5 flex flex-wrap gap-1">
          {(tool.tags as string[]).slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-3.5 py-2.5 mt-auto border-t border-slate-100 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          Our Rating · <span className="font-bold text-slate-800">{tool.rating}</span>
        </span>
        <UpvoteButton toolId={tool.id} initialCount={tool.upvotes ?? 0} />
      </div>
    </Link>
  );
}

/* ─── top picks carousel ─────────────────────────────────────── */
function TopPicksCarousel({ tools, topPicks }: { tools: ToolPage[]; topPicks: ToolPage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' });
  }
  return (
    <div className="relative">
      <button onClick={() => scroll('left')} aria-label="Scroll left"
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:border-sky-300 hover:shadow-md transition-all">
        <ChevronLeft className="w-4 h-4 text-slate-600" />
      </button>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-none px-1 py-1 scroll-smooth">
        {/* Promote card */}
        <a href="mailto:hello@aiscout.dev?subject=Feature my tool"
          className="group shrink-0 w-52 flex flex-col rounded-xl overflow-hidden relative hover:shadow-lg hover:shadow-sky-900/25 transition-all duration-200"
          style={{ background: 'linear-gradient(160deg, #07142e 0%, #0b2a56 55%, #0c4a7a 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(56,189,248,0.5),transparent)' }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'linear-gradient(135deg,rgba(56,189,248,0.07) 0%,transparent 60%)' }} />
          <div className="relative flex-1 px-4 pt-4 pb-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)' }}>
                <Megaphone className="w-4 h-4 text-sky-300" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-sky-400" style={{ letterSpacing: '0.1em' }}>Sponsor</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-snug mb-1">Promote Your Tool</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(186,230,253,0.6)' }}>
                Reach <strong className="text-sky-200">30K+</strong> GTM &amp; growth visitors/mo.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 group-hover:text-sky-200 transition-colors mt-auto">
              <Sparkles className="w-3 h-3 shrink-0" />
              Get featured →
            </div>
          </div>
        </a>

        {/* Pick cards */}
        {topPicks.map((tool) => (
          <TopPickCard key={tool.id} tool={tool} />
        ))}
      </div>
      <button onClick={() => scroll('right')} aria-label="Scroll right"
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:border-sky-300 hover:shadow-md transition-all">
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </button>
    </div>
  );
}

/* ─── directory tool card ────────────────────────────────────── */
function ToolCard({ tool }: { tool: ToolPage }) {
  return (
    <div className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/60 transition-all duration-200">
      <div className="flex gap-3.5 p-4">
        {/* Avatar */}
        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-slate-800">
          {tool.name.charAt(0)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link href={`/category/${tool.category}/${tool.slug}`} className="block">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="font-semibold text-slate-900 text-[13px] leading-tight hover:text-sky-700 transition-colors">{tool.name}</span>
              {tool.badge && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${BADGE_STYLES[tool.badge] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {tool.badge}
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2 mb-2">{tool.tagline || tool.description}</p>
          </Link>

          {/* Category + tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <CategoryPill category={tool.category} />
            {(tool.tags as string[])?.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>

        {/* Right: rating + upvote */}
        <div className="shrink-0 flex flex-col items-end justify-between gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-700">{tool.rating}</span>
          </div>
          <UpvoteButton toolId={tool.id} initialCount={tool.upvotes ?? 0} />
        </div>
      </div>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────── */
export default function HomePage() {
  const [tools, setTools] = useState<ToolPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    let t = 0;

    const STARS = Array.from({ length: 300 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.3 + Math.random() * 1.6,
      twinkleSpeed: 0.012 + Math.random() * 0.05,
      twinkleOffset: Math.random() * Math.PI * 2,
      baseOpacity: 0.2 + Math.random() * 0.5,
      hue: Math.random() < 0.5 ? '14,165,233' : Math.random() < 0.5 ? '20,184,166' : '100,116,139',
    }));

    const ORBS = [
      { x: 0.75, y: 0.22, r: 0.34, color: '56,189,248', vx: 0.00010, vy: 0.00007 },
      { x: 0.15, y: 0.58, r: 0.28, color: '20,184,166', vx: -0.00008, vy: -0.00005 },
      { x: 0.50, y: 0.88, r: 0.24, color: '125,211,252', vx: 0.00006, vy: 0.00009 },
      { x: 0.92, y: 0.70, r: 0.20, color: '56,189,248', vx: -0.00010, vy: 0.00004 },
    ];

    const DUST = Array.from({ length: 50 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00022,
      vy: -0.00018 - Math.random() * 0.00028,
      r: 1.2 + Math.random() * 2.2,
      opacity: 0.07 + Math.random() * 0.12,
    }));

    type Shooter = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; active: boolean };
    const SHOOTERS: Shooter[] = Array.from({ length: 5 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, active: false }));
    function spawnShooter(s: Shooter) {
      s.x = 0.05 + Math.random() * 0.55; s.y = 0.02 + Math.random() * 0.4;
      const angle = Math.PI / 6 + (Math.random() - 0.5) * 0.4;
      const speed = 0.004 + Math.random() * 0.004;
      s.vx = Math.cos(angle) * speed; s.vy = Math.sin(angle) * speed;
      s.maxLife = 50 + Math.random() * 50; s.life = 0; s.active = true;
    }
    spawnShooter(SHOOTERS[0]);
    setTimeout(() => spawnShooter(SHOOTERS[1]), 1800);

    const RINGS = [
      { cx: 0.85, cy: 0.15, rx: 0.09, ry: 0.035, angle: 0, speed: 0.003, opacity: 0.12 },
      { cx: 0.12, cy: 0.2,  rx: 0.07, ry: 0.025, angle: 1.2, speed: -0.002, opacity: 0.09 },
    ];

    function draw() {
      if (!ctx || !canvas) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t++;

      for (const o of ORBS) {
        o.x += o.vx; o.y += o.vy;
        if (o.x < -0.1) o.x = 1.1; if (o.x > 1.1) o.x = -0.1;
        if (o.y < -0.1) o.y = 1.1; if (o.y > 1.1) o.y = -0.1;
        const grad = ctx.createRadialGradient(o.x * W, o.y * H, 0, o.x * W, o.y * H, o.r * W);
        grad.addColorStop(0, `rgba(${o.color},0.18)`);
        grad.addColorStop(0.5, `rgba(${o.color},0.07)`);
        grad.addColorStop(1, `rgba(${o.color},0)`);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      }

      for (const s of STARS) {
        const flicker = Math.sin(t * s.twinkleSpeed + s.twinkleOffset) * 0.45 + 0.55;
        ctx.globalAlpha = s.baseOpacity * flicker;
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${s.hue})`; ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const d of DUST) {
        d.x += d.vx; d.y += d.vy;
        if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0;
        ctx.globalAlpha = d.opacity;
        const dg = ctx.createRadialGradient(d.x * W, d.y * H, 0, d.x * W, d.y * H, d.r);
        dg.addColorStop(0, 'rgba(14,165,233,0.9)');
        dg.addColorStop(1, 'rgba(14,165,233,0)');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const ring of RINGS) {
        ring.angle += ring.speed;
        ctx.save();
        ctx.translate(ring.cx * W, ring.cy * H);
        ctx.rotate(ring.angle);
        ctx.scale(1, ring.ry / ring.rx);
        ctx.beginPath();
        ctx.arc(0, 0, ring.rx * W, 0, Math.PI * 2);
        ctx.restore();
        ctx.strokeStyle = `rgba(14,165,233,${ring.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (t % 90 === 0) {
        const idle = SHOOTERS.find(s => !s.active);
        if (idle) spawnShooter(idle);
      }
      for (const s of SHOOTERS) {
        if (!s.active) continue;
        s.x += s.vx; s.y += s.vy; s.life++;
        if (s.life > s.maxLife || s.x > 1.2 || s.y > 1.2) { s.active = false; continue; }
        const prog = s.life / s.maxLife;
        const alpha = prog < 0.15 ? prog / 0.15 : prog > 0.75 ? (1 - prog) / 0.25 : 1;
        const tailLen = 100 + prog * 60;
        const nx = s.vx / Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const ny = s.vy / Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const grd = ctx.createLinearGradient(
          s.x * W - nx * tailLen, s.y * H - ny * tailLen,
          s.x * W, s.y * H
        );
        grd.addColorStop(0, 'rgba(14,165,233,0)');
        grd.addColorStop(0.7, `rgba(56,189,248,${alpha * 0.5})`);
        grd.addColorStop(1, `rgba(255,255,255,${alpha * 0.95})`);
        ctx.strokeStyle = grd; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(s.x * W - nx * tailLen, s.y * H - ny * tailLen);
        ctx.lineTo(s.x * W, s.y * H);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`; ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    supabase.from('tool_pages')
      .select('id, slug, name, tagline, description, category, tags, badge, rating, rating_count, users, upvotes, use_cases')
      .eq('status', 'published')
      .order('upvotes', { ascending: false })
      .then(({ data }) => { if (data) setTools(data as ToolPage[]); setLoading(false); });
  }, []);

  const filtered = tools.filter(t => {
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    const q = query.toLowerCase();
    const matchQ = !q || t.name.toLowerCase().includes(q) || (t.tagline || t.description).toLowerCase().includes(q) ||
      (t.tags as string[])?.some(tag => tag.toLowerCase().includes(q)) ||
      (t.use_cases as string[])?.some(uc => uc.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  const categoryCounts = tools.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1; return acc;
  }, {});

  const categories = [
    { id: 'all', label: 'All Tools', count: tools.length },
    ...SECTION_ORDER.filter(c => categoryCounts[c]).map(c => ({ id: c, label: SECTION_LABELS[c], count: categoryCounts[c] })),
  ];

  const sections = activeCategory === 'all'
    ? SECTION_ORDER.filter(c => filtered.some(t => t.category === c))
    : [activeCategory];

  // Top picks: up to 5 highest-upvoted, one per category if possible
  const topPicks = (() => {
    const seen = new Set<string>();
    const picks: ToolPage[] = [];
    // First pass: one from each category
    for (const cat of SECTION_ORDER) {
      const t = tools.find(x => x.category === cat && !seen.has(x.id));
      if (t) { picks.push(t); seen.add(t.id); }
    }
    // Fill to 5 from remaining
    for (const t of tools) {
      if (picks.length >= 5) break;
      if (!seen.has(t.id)) { picks.push(t); seen.add(t.id); }
    }
    return picks.slice(0, 5);
  })();

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      <SiteHeader />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden border-b border-slate-800/50"
        style={{ background: 'linear-gradient(160deg, #060d1f 0%, #0a1628 45%, #071820 75%, #040d18 100%)' }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" aria-hidden />
        <div className="absolute left-0 right-0 top-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(14,165,233,0.5) 40%, rgba(20,184,166,0.5) 60%, transparent 90%)' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(14,165,233,0.13) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(4,13,24,0.9) 0%, transparent 100%)' }} />

        <div className={`relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16 sm:pt-24 sm:pb-24 text-center transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">15+ New Tools Added</span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] font-extrabold text-white leading-[1.08] tracking-[-0.03em] mb-5">
            Don&apos;t Just Build.
            <br />
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, #93c5fd 0%, #38bdf8 40%, #2dd4bf 80%, #34d399 100%)' }}>
              Accelerate Growth.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-[15px] sm:text-[16px] font-normal text-slate-400 leading-[1.65] max-w-xl mx-auto mb-9 tracking-[0.01em]">
            Find trending, expert-reviewed <span className="text-white font-medium">AI GTM and growth tools</span> across SEO, social media, sales, marketing, and more, with exclusive{' '}
            <span className="text-emerald-400 font-medium">FREE Plans</span>.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-9">
            <button
              onClick={() => document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[14px] text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 60%, #0ea5e9 100%)', boxShadow: '0 0 0 1px rgba(56,189,248,0.25), 0 6px 24px rgba(14,165,233,0.3)' }}
            >
              <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
              <Zap className="w-3.5 h-3.5 shrink-0 relative" />
              <span className="relative">Browse Top Tools</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0 relative" />
            </button>
            <button
              onClick={() => document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
            >
              <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              FREE <span className="text-amber-400 font-bold ml-1">$50 Credits</span>
            </button>
          </div>

          {/* Trust strip */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
            {['No login required', 'Zero ads', 'Weekly updates'].map((item, i, arr) => (
              <span key={item} className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                  <Check className="w-3 h-3 text-emerald-500/80 shrink-0" />
                  {item}
                </span>
                {i < arr.length - 1 && <span className="w-px h-3 bg-slate-700/80 ml-4 sm:ml-6" />}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Monthly Top Picks ── */}
      {!loading && topPicks.length > 0 && (
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">

            {/* Section header */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    Editor&apos;s Top Picks
                  </span>
                  <span className="text-[11px] text-slate-400">May 2026</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Curated AI Tools</h2>
                <p className="text-sm text-slate-500 mt-1.5">Hand-picked tools our team tried and loved this month</p>
              </div>
              <button
                onClick={() => document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
              >
                View all <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Horizontal scroll carousel */}
            <TopPicksCarousel tools={tools} topPicks={topPicks} />

          </div>
        </section>
      )}

      {/* ── All Tools Directory ── */}
      <section id="tools-section" className="bg-[#f8f9fb] flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">Directory</p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">All Tools</h2>
              <p className="text-sm text-slate-500 mt-1">
                {loading ? 'Loading…' : `${filtered.length} tool${filtered.length !== 1 ? 's' : ''}${activeCategory !== 'all' ? ` in ${SECTION_LABELS[activeCategory]}` : ''}`}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search by name, use case, tag…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 placeholder-slate-400 transition shadow-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-24 gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
              <p className="text-sm text-slate-400">Loading tools…</p>
            </div>
          ) : (
            <div className="flex gap-6 items-start">
              {/* Desktop sidebar */}
              {categories.length > 1 && (
                <aside className="hidden lg:block w-52 shrink-0 self-start sticky top-20">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filter by Category</p>
                    </div>
                    <nav className="p-2 space-y-0.5">
                      {categories.map(cat => {
                        const active = activeCategory === cat.id;
                        const cc = CATEGORY_COLORS[cat.id];
                        return (
                          <button
                            key={cat.id}
                            onClick={() => { setActiveCategory(cat.id); setQuery(''); }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                              active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {cc && !active && (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${cc.dot}`} />
                              )}
                              {(!cc || active) && (
                                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                              )}
                              {cat.label}
                            </span>
                            <span className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                              active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>{cat.count}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Quick stats */}
                  <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Stats</p>
                    {[
                      { label: 'Total Tools', value: tools.length },
                      { label: 'Categories', value: SECTION_ORDER.filter(c => categoryCounts[c]).length },
                      { label: 'Free Tiers', value: tools.filter(t => t.badge === 'free').length },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-[12px] text-slate-500">{s.label}</span>
                        <span className="text-[13px] font-bold text-slate-800">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </aside>
              )}

              <main className="flex-1 min-w-0">
                {/* Mobile category pills */}
                {categories.length > 1 && (
                  <div className="flex lg:hidden gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
                    {categories.map(cat => {
                      const cc = CATEGORY_COLORS[cat.id];
                      const active = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => { setActiveCategory(cat.id); setQuery(''); }}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {cc && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-white' : cc.dot}`} />}
                          {cat.label}
                          <span className={`text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{cat.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-24 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4">
                      <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-700 font-semibold mb-1">No tools found</p>
                    <p className="text-slate-400 text-sm">Try a different search or category.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {sections.map(cat => {
                      const sectionTools = filtered.filter(t => t.category === cat);
                      if (!sectionTools.length) return null;
                      const cc = CATEGORY_COLORS[cat];
                      return (
                        <section key={cat} id={`section-${cat}`}>
                          {/* Section header */}
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${cc?.bg ?? 'bg-slate-100'} ${cc?.text ?? 'text-slate-600'} border ${cc?.border ?? 'border-slate-200'}`}>
                              {CATEGORY_ICONS[cat]}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[14px] font-bold text-slate-900">{SECTION_LABELS[cat]}</h3>
                              <p className="text-[11px] text-slate-400">{sectionTools.length} tool{sectionTools.length !== 1 ? 's' : ''}</p>
                            </div>
                            <Link
                              href={`/category/${cat}`}
                              className="hidden sm:inline-flex items-center gap-1 text-[12px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
                            >
                              Browse all <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sectionTools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
