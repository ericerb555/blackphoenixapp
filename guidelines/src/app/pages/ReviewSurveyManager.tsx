import { useState, useMemo } from 'react';
import { Star, Send, MessageSquare, ThumbsUp, ThumbsDown, Copy, CheckCircle, ExternalLink, Search, Filter, Download, Plus, Trash2, Eye, Mail } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SurveyResponse {
  id: string;
  clientName: string;
  clientEmail: string;
  jobType: string;
  jobDate: string;
  rating: number;
  nps: number;
  comments: string;
  wouldRefer: boolean;
  reviewLeft: boolean;
  respondedAt: string;
  sentAt: string;
  status: 'sent' | 'responded' | 'review-left';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load(): SurveyResponse[] {
  try { return JSON.parse(localStorage.getItem('review_surveys') || 'null') || DEFAULT_RESPONSES; } catch { return DEFAULT_RESPONSES; }
}

function persist(r: SurveyResponse[]) {
  localStorage.setItem('review_surveys', JSON.stringify(r));
}

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_RESPONSES: SurveyResponse[] = [
  {
    id: 'sr-1', clientName: 'Sarah Mitchell', clientEmail: 'smitchell@email.com',
    jobType: 'Roof Replacement', jobDate: '2026-06-10', rating: 5, nps: 10,
    comments: "Absolutely phenomenal work. Eric and his crew were professional, on time, and cleaned up completely. My roof looks better than when the house was built. Highly recommend!",
    wouldRefer: true, reviewLeft: true, respondedAt: '2026-06-13', sentAt: '2026-06-13', status: 'review-left',
  },
  {
    id: 'sr-2', clientName: 'Tom Harrington', clientEmail: 'tharrington@gmail.com',
    jobType: 'Deck Build', jobDate: '2026-06-20', rating: 5, nps: 9,
    comments: "Really happy with the deck. Took a few extra days due to weather but they kept me updated throughout. Great quality wood and workmanship.",
    wouldRefer: true, reviewLeft: false, respondedAt: '2026-06-25', sentAt: '2026-06-23', status: 'responded',
  },
  {
    id: 'sr-3', clientName: 'Linda Beaumont', clientEmail: 'linda.b@outlook.com',
    jobType: 'Siding Replacement', jobDate: '2026-07-02', rating: 4, nps: 8,
    comments: "Good work overall. Took a bit longer than quoted but the end result is great. Would use again.",
    wouldRefer: true, reviewLeft: false, respondedAt: '2026-07-05', sentAt: '2026-07-05', status: 'responded',
  },
  {
    id: 'sr-4', clientName: 'James Okafor', clientEmail: 'james.ok@yahoo.com',
    jobType: 'Gutter Installation', jobDate: '2026-07-08', rating: 0, nps: 0,
    comments: '', wouldRefer: false, reviewLeft: false, respondedAt: '', sentAt: '2026-07-11', status: 'sent',
  },
];

const REVIEW_PLATFORMS = [
  { name: 'Google', url: 'https://g.page/r/black-phoenix-builds/review', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { name: 'Facebook', url: 'https://www.facebook.com/BlackPhoenixBuilds/reviews', color: 'text-blue-500', bg: 'bg-blue-600/10 border-blue-600/20' },
  { name: 'BBB', url: 'https://www.bbb.org/search?find_text=black+phoenix+builds', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { name: 'Houzz', url: 'https://www.houzz.com/', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
];

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />
      ))}
    </div>
  );
}

function npsLabel(n: number) {
  if (n >= 9) return { label: 'Promoter', color: 'text-emerald-400' };
  if (n >= 7) return { label: 'Passive', color: 'text-yellow-400' };
  return { label: 'Detractor', color: 'text-red-400' };
}

// ─── Send Survey Modal ────────────────────────────────────────────────────────

function SendSurveyModal({ onSend, onClose }: { onSend: (r: SurveyResponse) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', jobType: 'Roof Replacement', jobDate: new Date().toISOString().split('T')[0] });

  function handleSend() {
    if (!form.name || !form.email) { toast.error('Name and email are required.'); return; }
    const r: SurveyResponse = {
      id: `sr-${Date.now()}`, clientName: form.name, clientEmail: form.email,
      jobType: form.jobType, jobDate: form.jobDate, rating: 0, nps: 0,
      comments: '', wouldRefer: false, reviewLeft: false, respondedAt: '', sentAt: new Date().toISOString().split('T')[0], status: 'sent',
    };
    onSend(r);
    toast.success(`Survey sent to ${form.name}!`);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0e0e0e] border border-[#222] rounded-2xl p-6 shadow-2xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Send className="w-4 h-4 text-orange-400" /> Send Survey</h3>
        <div className="space-y-3">
          {[
            { label: 'Client Name', key: 'name', type: 'text', placeholder: 'e.g. Sarah Mitchell' },
            { label: 'Client Email', key: 'email', type: 'email', placeholder: 'client@email.com' },
            { label: 'Job Date', key: 'jobDate', type: 'date', placeholder: '' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Job Type</label>
            <select value={form.jobType} onChange={e => setForm(x => ({ ...x, jobType: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
              {['Roof Replacement', 'Roof Repair', 'Siding', 'Gutters', 'Deck', 'Windows', 'Doors', 'Remodeling', 'Other'].map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition">Cancel</button>
          <button onClick={handleSend} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white transition flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Send Survey
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Response Detail Modal ────────────────────────────────────────────────────

function ResponseDetail({ r, onMarkReviewLeft, onClose }: { r: SurveyResponse; onMarkReviewLeft: () => void; onClose: () => void }) {
  const nps = r.nps > 0 ? npsLabel(r.nps) : null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0e0e0e] border border-[#222] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">{r.clientName}'s Survey Response</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-sm">Close</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Client', value: r.clientName },
              { label: 'Email', value: r.clientEmail },
              { label: 'Job Type', value: r.jobType },
              { label: 'Job Date', value: r.jobDate },
              { label: 'Survey Sent', value: r.sentAt },
              { label: 'Responded', value: r.respondedAt || '—' },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] text-gray-500">{f.label}</p>
                <p className="text-sm text-white">{f.value}</p>
              </div>
            ))}
          </div>

          {r.rating > 0 && (
            <div className="grid grid-cols-3 gap-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Rating</p>
                <StarRating value={r.rating} />
                <p className="text-lg font-bold text-white mt-1">{r.rating}/5</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">NPS Score</p>
                <p className="text-2xl font-bold text-white">{r.nps}</p>
                {nps && <p className={`text-[10px] font-semibold ${nps.color}`}>{nps.label}</p>}
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Would Refer</p>
                {r.wouldRefer
                  ? <ThumbsUp className="w-6 h-6 text-emerald-400 mx-auto mt-1" />
                  : <ThumbsDown className="w-6 h-6 text-red-400 mx-auto mt-1" />
                }
              </div>
            </div>
          )}

          {r.comments && (
            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Comments</p>
              <p className="text-sm text-gray-300 italic">"{r.comments}"</p>
            </div>
          )}

          {r.rating >= 4 && !r.reviewLeft && (
            <div className="bg-[#0d1a0d] border border-emerald-900/40 rounded-xl p-4">
              <p className="text-xs text-emerald-300 font-semibold mb-2">This client gave a high rating — encourage a Google review!</p>
              <div className="flex gap-2 flex-wrap">
                {REVIEW_PLATFORMS.map(p => (
                  <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                    className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1 transition hover:opacity-80 ${p.bg} ${p.color}`}>
                    {p.name} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
              <button onClick={onMarkReviewLeft} className="mt-3 text-xs text-gray-500 hover:text-emerald-400 transition flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Mark as review left
              </button>
            </div>
          )}

          {r.reviewLeft && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              Review confirmed left on platform
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReviewSurveyManager() {
  const [responses, setResponses] = useState<SurveyResponse[]>(load);
  const [showSend, setShowSend] = useState(false);
  const [viewing, setViewing] = useState<SurveyResponse | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SurveyResponse['status']>('all');
  const [tab, setTab] = useState<'responses' | 'templates' | 'platforms'>('responses');
  const [copied, setCopied] = useState('');

  function save(r: SurveyResponse[]) { setResponses(r); persist(r); }

  function handleSend(r: SurveyResponse) { save([...responses, r]); }

  function markReviewLeft(id: string) {
    save(responses.map(r => r.id === id ? { ...r, reviewLeft: true, status: 'review-left' as const } : r));
    setViewing(v => v?.id === id ? { ...v, reviewLeft: true, status: 'review-left' } : v);
    toast.success('Marked as review left!');
  }

  function del(id: string) { save(responses.filter(r => r.id !== id)); toast.success('Removed.'); }

  function exportCSV() {
    const rows = [['Name', 'Email', 'Job Type', 'Date', 'Rating', 'NPS', 'Comments', 'Would Refer', 'Review Left', 'Status']];
    responses.forEach(r => rows.push([r.clientName, r.clientEmail, r.jobType, r.jobDate, String(r.rating), String(r.nps), r.comments, String(r.wouldRefer), String(r.reviewLeft), r.status]));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'survey-responses.csv';
    a.click();
    toast.success('Exported!');
  }

  function copyTemplate(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
      toast.success('Template copied!');
    });
  }

  const filtered = useMemo(() => responses.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.clientName.toLowerCase().includes(search.toLowerCase()) && !r.jobType.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [responses, search, filterStatus]);

  const responded = responses.filter(r => r.status !== 'sent');
  const avgRating = responded.length ? (responded.filter(r => r.rating > 0).reduce((s, r) => s + r.rating, 0) / (responded.filter(r => r.rating > 0).length || 1)).toFixed(1) : '—';
  const reviewsLeft = responses.filter(r => r.reviewLeft).length;
  const promoters = responded.filter(r => r.nps >= 9).length;

  const EMAIL_TEMPLATES = [
    {
      key: 'initial',
      name: '3-Day Post-Job Survey',
      subject: 'How did we do, {{name}}? (Quick 2-min survey)',
      body: `Hi {{name}},

We just wrapped up your {{job_type}} project and we hope you're thrilled with the results!

We'd love to hear your thoughts — it only takes 2 minutes and helps us keep improving.

👉 [Take the Survey] {{survey_link}}

Thank you for choosing Black Phoenix Builds. We appreciate your business!

— Eric & the Black Phoenix team
(603) 555-0100 | blackphoenixbuilds.com`,
    },
    {
      key: 'followup',
      name: 'Review Request (Happy Customer)',
      subject: 'Would you mind leaving us a quick review, {{name}}?',
      body: `Hi {{name}},

Thank you so much for the kind words about your recent {{job_type}} — it means a lot to our team!

If you have a moment, we'd be incredibly grateful if you could leave us a Google review. It takes less than 2 minutes and helps other homeowners in NH find trustworthy contractors:

⭐ Leave a Review: {{google_review_link}}

Thank you again — we hope to work with you again in the future!

— Eric Erb
Black Phoenix Builds`,
    },
    {
      key: 'winback',
      name: 'Re-engagement (Neutral Feedback)',
      subject: 'We\'d love to make it right, {{name}}',
      body: `Hi {{name}},

Thank you for completing our survey after your recent {{job_type}} project.

We noticed your experience wasn't perfect, and we genuinely want to make it right. Could you share a bit more about what we could have done better?

I'd love to jump on a quick call to hear your thoughts directly.

— Eric Erb
Owner, Black Phoenix Builds
(603) 555-0100`,
    },
  ];

  const statusColors = {
    sent: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    responded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'review-left': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showSend && <SendSurveyModal onSend={handleSend} onClose={() => setShowSend(false)} />}
      {viewing && <ResponseDetail r={viewing} onMarkReviewLeft={() => markReviewLeft(viewing.id)} onClose={() => setViewing(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Reviews & Surveys</h1>
            <p className="text-sm text-gray-400">Collect feedback and drive Google reviews</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#222] text-gray-400 hover:text-white text-sm transition">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowSend(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
            <Send className="w-4 h-4" /> Send Survey
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Surveys Sent', value: responses.length },
          { label: 'Avg Rating', value: avgRating, color: 'text-yellow-400' },
          { label: 'Reviews Left', value: reviewsLeft, color: 'text-emerald-400' },
          { label: 'Promoters (NPS 9-10)', value: promoters, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1 w-fit">
        {(['responses', 'templates', 'platforms'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-[#1e1e1e] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Responses Tab */}
      {tab === 'responses' && (
        <>
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
                className="w-full bg-[#111] border border-[#222] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="bg-[#111] border border-[#222] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
              <option value="all">All</option>
              <option value="sent">Sent — Awaiting</option>
              <option value="responded">Responded</option>
              <option value="review-left">Review Left</option>
            </select>
          </div>

          <div className="space-y-2">
            {filtered.map(r => (
              <div key={r.id} className="bg-[#111] border border-[#222] rounded-xl px-4 py-3 flex items-center gap-4 hover:border-orange-500/20 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white text-sm">{r.clientName}</p>
                    <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>{r.status}</span>
                    {r.rating > 0 && <StarRating value={r.rating} />}
                    {r.reviewLeft && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{r.jobType} · {r.jobDate} · {r.clientEmail}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {r.status !== 'sent' && (
                    <button onClick={() => setViewing(r)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-white transition">
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => del(r.id)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-red-400 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-600 text-sm">No survey responses match your filters.</div>
            )}
          </div>
        </>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className="space-y-4">
          {EMAIL_TEMPLATES.map(t => (
            <div key={t.key} className="bg-[#111] border border-[#222] rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Subject: {t.subject}</p>
                </div>
                <button onClick={() => copyTemplate(`Subject: ${t.subject}\n\n${t.body}`, t.key)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
                  {copied === t.key ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied === t.key ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
                {t.body}
              </pre>
              <p className="text-[10px] text-gray-600 mt-2">Variables: {'{{name}}'}, {'{{job_type}}'}, {'{{survey_link}}'}, {'{{google_review_link}}'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Platforms Tab */}
      {tab === 'platforms' && (
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Review Platform Links</h3>
            <div className="space-y-3">
              {REVIEW_PLATFORMS.map(p => (
                <div key={p.name} className={`flex items-center justify-between border rounded-xl px-4 py-3 ${p.bg}`}>
                  <div>
                    <p className={`font-semibold text-sm ${p.color}`}>{p.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5 font-mono truncate max-w-xs">{p.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(p.url); toast.success('Link copied!'); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Best Practices</h3>
            <ul className="text-xs text-gray-400 space-y-2">
              {[
                'Send surveys within 3 days of job completion — response rates drop sharply after 7 days.',
                'For clients with ratings of 4-5 stars, send a direct Google review link. For 1-3 stars, ask for a private call first.',
                'Google reviews carry the most weight for local SEO. Prioritize them over other platforms.',
                'Personalize emails with the client name and job type — templates that say "Sarah" beat "Valued Customer" by 40%.',
                'Follow up once if no response — a gentle nudge sent 5 days later doubles response rates.',
                'Never offer discounts for reviews. It violates Google policy and can lead to removal.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold flex-shrink-0">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
