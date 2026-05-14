import Link from 'next/link';
import { AstroGTMLogo } from '@/components/site-header';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <AstroGTMLogo size={28} />
          </div>
          <nav className="flex items-center gap-5 text-xs text-slate-400">
            <Link href="/about" className="hover:text-slate-700 transition-colors">About</Link>
            <Link href="/privacy-policy" className="hover:text-slate-700 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-slate-700 transition-colors">Contact</Link>
            <span className="text-slate-300">© {new Date().getFullYear()} AstroGTM</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
