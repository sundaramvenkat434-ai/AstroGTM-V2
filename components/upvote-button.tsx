'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';

function fingerprint(): string {
  if (typeof window === 'undefined') return '';
  const key = 'ai_scout_fp';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, fp);
  }
  return fp;
}

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

// CSS injected once globally
const STYLE_ID = 'upvote-btn-styles';
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes upvote-burst {
      0%   { transform: scale(1);   opacity: 1; }
      40%  { transform: scale(1.25); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0; }
    }
    @keyframes upvote-ring {
      0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0.7; }
      100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
    }
    @keyframes upvote-spark {
      0%   { opacity: 1; transform: translate(-50%,-50%) translate(var(--sx),var(--sy)) scale(1); }
      100% { opacity: 0; transform: translate(-50%,-50%) translate(calc(var(--sx)*2.8),calc(var(--sy)*2.8)) scale(0); }
    }
    @keyframes upvote-count-pop {
      0%   { transform: translateY(0);   opacity: 1; }
      30%  { transform: translateY(-6px); opacity: 0; }
      31%  { transform: translateY(6px);  opacity: 0; }
      100% { transform: translateY(0);   opacity: 1; }
    }
    @keyframes ghost-flash {
      0%   { opacity: 0; transform: translateY(2px) scale(0.85); }
      20%  { opacity: 1; transform: translateY(-2px) scale(1); }
      70%  { opacity: 1; transform: translateY(-4px) scale(1); }
      100% { opacity: 0; transform: translateY(-10px) scale(0.9); }
    }
  `;
  document.head.appendChild(s);
}

const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function UpvoteButton({
  toolId, initialCount, className = '',
}: {
  toolId: string; initialCount: number; className?: string;
}) {
  const storageKey = `upvoted_${toolId}`;
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState(false);
  const [ghost, setGhost] = useState(false);
  const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countAnimRef = useRef(false);

  useEffect(() => {
    ensureStyles();
    setVoted(localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  // Ghost upvote: random flash every 4–12s, no count change
  useEffect(() => {
    function scheduleNext() {
      const delay = 4000 + Math.random() * 8000;
      ghostTimerRef.current = setTimeout(() => {
        setGhost(true);
        setTimeout(() => setGhost(false), 1600);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => { if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
  }, []);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (voted || loading) return;
    setLoading(true);
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    const fp = fingerprint();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upvote-tool`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ tool_id: toolId, fingerprint: fp }),
        }
      );
      const json = await res.json();
      if (typeof json.upvotes === 'number') setCount(json.upvotes);
      if (!json.already_voted) { setVoted(true); localStorage.setItem(storageKey, '1'); }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  return (
    <div className={`relative inline-flex items-center select-none ${className}`}>
      {/* Ghost upvote flash — just a subtle arrow-up badge */}
      {ghost && (
        <span
          className="absolute -top-7 left-1/2 pointer-events-none z-10"
          style={{ animation: 'ghost-flash 1.6s ease-out forwards' }}
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 border border-sky-300 shadow-sm">
            <ChevronUp className="w-3 h-3 text-sky-600" strokeWidth={2.5} />
          </span>
        </span>
      )}

      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={voted ? 'Upvoted' : 'Upvote this tool'}
        className={`relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all duration-150 overflow-visible ${
          voted
            ? 'border-sky-300 bg-sky-50 text-sky-600 shadow-sm shadow-sky-100'
            : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/60 text-slate-500 hover:text-sky-600 hover:shadow-sm'
        } ${loading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
      >
        {/* Expand ring on burst */}
        {burst && (
          <span
            className="absolute top-1/2 left-1/2 w-full h-full rounded-xl border-2 border-sky-400 pointer-events-none"
            style={{ animation: 'upvote-ring 0.55s ease-out forwards' }}
          />
        )}

        {/* Spark particles on burst */}
        {burst && SPARK_ANGLES.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const dist = 10;
          const sx = `${Math.round(Math.cos(rad) * dist)}px`;
          const sy = `${Math.round(Math.sin(rad) * dist)}px`;
          return (
            <span
              key={deg}
              className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-sky-400 pointer-events-none"
              style={
                {
                  '--sx': sx,
                  '--sy': sy,
                  animation: 'upvote-spark 0.55s ease-out forwards',
                } as React.CSSProperties
              }
            />
          );
        })}

        {/* Arrow icon */}
        <ChevronUp
          strokeWidth={voted ? 3 : 2}
          className={`w-3.5 h-3.5 shrink-0 transition-all duration-200 ${
            burst ? 'scale-125' : voted ? '' : 'group-hover:-translate-y-0.5'
          } ${voted ? 'text-sky-500' : ''}`}
          style={burst ? { animation: 'upvote-burst 0.55s ease-out forwards' } : undefined}
        />

        {/* Count */}
        <span
          className="text-[11px] font-bold tabular-nums leading-none"
          style={burst ? { animation: 'upvote-count-pop 0.4s ease-out forwards' } : undefined}
        >
          {fmt(count)}
        </span>
      </button>
    </div>
  );
}
