import { useState } from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface SubQuote {
  id: string; subName: string; subEmail: string; jobTitle: string;
  amount: number; laborHours: number; materials: number; timeline: string;
  notes: string; status: 'pending' | 'approved' | 'rejected'; submittedAt: string;
}

const SAMPLE: SubQuote[] = [
  { id: '1', subName: 'Mike Johnson Electrical', subEmail: 'mike@mjelectric.com', jobTitle: '47 Maple St — Electrical Rough-In', amount: 4200, laborHours: 24, materials: 800, timeline: '3 days', notes: 'Includes panel upgrade to 200A. Permit pulled by sub.', status: 'pending', submittedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', subName: 'Granite State Plumbing', subEmail: 'bids@granitestateplumbing.com', jobTitle: '47 Maple St — Bathroom Rough-In', amount: 3100, laborHours: 16, materials: 600, timeline: '2 days', notes: 'PEX supply lines. Drain work included.', status: 'pending', submittedAt: new Date(Date.now() - 172800000).toISOString() },
];

export default function SubcontractorQuoteReview() {
  const [quotes, setQuotes] = useState<SubQuote[]>(() => {
    try { return JSON.parse(localStorage.getItem('sub_quotes') || 'null') || SAMPLE; } catch { return SAMPLE; }
  });
  const [selected, setSelected] = useState<SubQuote | null>(null);
  const [note, setNote] = useState('');

  function updateStatus(id: string, status: SubQuote['status']) {
    const updated = quotes.map(q => q.id === id ? { ...q, status } : q);
    setQuotes(updated);
    localStorage.setItem('sub_quotes', JSON.stringify(updated));
    toast.success(`Quote ${status}`);
    setSelected(null);
  }

  const STATUS_COLORS = { pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', approved: 'text-green-400 bg-green-500/10 border-green-500/20', rejected: 'text-red-400 bg-red-500/10 border-red-500/20' };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-orange-600/20 flex items-center justify-center"><FileText className="w-4 h-4 text-orange-400" /></div>
        <div>
          <h3 className="text-base font-bold text-white">Subcontractor Quote Review</h3>
          <p className="text-xs text-gray-500">{quotes.filter(q => q.status === 'pending').length} pending review</p>
        </div>
      </div>

      {quotes.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">No quotes submitted yet</p>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <div key={q.id} className="p-4 bg-[#111] border border-[#2A2A2A] rounded-xl cursor-pointer hover:border-[#3A3A3A] transition" onClick={() => setSelected(selected?.id === q.id ? null : q)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{q.subName}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{q.jobTitle}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-white">${q.amount.toLocaleString()}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[q.status]}`}>{q.status}</span>
                </div>
              </div>
              {selected?.id === q.id && (
                <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><p className="text-gray-500">Labor</p><p className="text-white font-semibold">{q.laborHours}h</p></div>
                    <div><p className="text-gray-500">Materials</p><p className="text-white font-semibold">${q.materials}</p></div>
                    <div><p className="text-gray-500">Timeline</p><p className="text-white font-semibold">{q.timeline}</p></div>
                  </div>
                  {q.notes && <p className="text-xs text-gray-400 bg-[#0A0A0A] rounded-lg p-3">{q.notes}</p>}
                  <div className="text-xs text-gray-500">Contact: <a href={`mailto:${q.subEmail}`} className="text-orange-400 hover:underline">{q.subEmail}</a></div>
                  {q.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={e => { e.stopPropagation(); updateStatus(q.id, 'approved'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-semibold rounded-xl transition">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={e => { e.stopPropagation(); updateStatus(q.id, 'rejected'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl transition">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
