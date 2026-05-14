'use client';

import { useState } from 'react';
import { BadgeCheck, X, Send, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  toolId: string;
  toolName: string;
  prominent?: boolean;
}

export function ClaimListingButton({ toolId, toolName }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', linkedin: '', website: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('listing_claims').insert({
      tool_id: toolId,
      tool_name: toolName,
      name: form.name,
      email: form.email,
      linkedin: form.linkedin || null,
      website: form.website || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (err) { setError('Something went wrong. Please try again.'); return; }
    setDone(true);
  }

  return (
    <>
      <p className="text-xs text-slate-400">
        Are you the founder?{' '}
        <button
          onClick={() => setOpen(true)}
          className="text-slate-500 underline underline-offset-2 hover:text-slate-700 transition-colors"
        >
          Claim this listing
        </button>
      </p>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {done ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <BadgeCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Request Submitted</h3>
                <p className="text-sm text-slate-500">We&apos;ll review your claim and get back to you within 2 business days.</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Claim &ldquo;{toolName}&rdquo;</h3>
                  <p className="text-sm text-slate-500">Get a verified badge, add your founder story, and manage your listing.</p>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Your Name *</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder-slate-300 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jane@yourcompany.com"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder-slate-300 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">LinkedIn <span className="text-slate-400 font-normal">optional</span></label>
                    <input
                      type="url"
                      value={form.linkedin}
                      onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder-slate-300 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Tool Website <span className="text-slate-400 font-normal">optional</span></label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder-slate-300 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 disabled:opacity-60 transition text-sm mt-2"
                  >
                    {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Claim Request
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
