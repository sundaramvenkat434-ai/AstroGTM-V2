import Link from 'next/link';

export default function ComparisonNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900">Comparison not found</h1>
      <p className="text-slate-500 text-sm max-w-sm text-center">
        This comparison page doesn&apos;t exist or hasn&apos;t been published yet.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 mt-2 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
