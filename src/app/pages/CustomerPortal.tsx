import { useState, useMemo, useEffect } from 'react';
import { User, FileText, DollarSign, Image, MessageSquare, CheckCircle, Clock, AlertCircle, ChevronRight, Search, Download, Eye, Star, Bell, Upload, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveDual, loadDual } from '../lib/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  jobs: PortalJob[];
  invoices: PortalInvoice[];
  messages: PortalMessage[];
  portalCode: string;
  joinedAt: string;
}

interface PortalJob {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  progress: number;
  description: string;
  photos: string[];
  updates: { date: string; text: string }[];
}

interface PortalInvoice {
  id: string;
  amount: number;
  status: 'paid' | 'due' | 'overdue';
  dueDate: string;
  description: string;
}

interface PortalMessage {
  id: string;
  from: 'client' | 'team';
  text: string;
  ts: string;
  read: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load(): PortalClient[] {
  try { return JSON.parse(localStorage.getItem('customer_portal_clients') || 'null') || DEFAULT_CLIENTS; } catch { return DEFAULT_CLIENTS; }
}

function persist(c: PortalClient[]) { saveDual('customer_portal_clients', c); }

function genCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

const JOB_STATUS_COLORS: Record<PortalJob['status'], string> = {
  pending: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  'in-progress': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'on-hold': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

const INV_STATUS_COLORS: Record<PortalInvoice['status'], string> = {
  paid: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  due: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  overdue: 'text-red-400 bg-red-500/10 border-red-500/20',
};

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_CLIENTS: PortalClient[] = [
  {
    id: 'cp-1', name: 'Sarah Mitchell', email: 'smitchell@email.com', phone: '(603) 555-0201',
    address: '14 Maple St, Concord, NH 03301', portalCode: 'SARAH7', joinedAt: '2026-06-10',
    jobs: [
      {
        id: 'j-1', title: 'Full Roof Replacement', status: 'completed', startDate: '2026-06-08', endDate: '2026-06-10',
        progress: 100, description: '30-year architectural shingles, full tear-off, ice & water shield at eaves.',
        photos: ['https://files.cdn-files-a.com/uploads/10153532/2000_6775a82c7c1f9.png', 'https://files.cdn-files-a.com/uploads/10153532/2000_6920d15d350aa.jpg'],
        updates: [{ date: '2026-06-08', text: 'Crew arrived, tear-off started.' }, { date: '2026-06-09', text: 'Sheathing repaired, new underlayment down.' }, { date: '2026-06-10', text: 'Shingles complete. Project finished!' }],
      },
    ],
    invoices: [{ id: 'inv-1', amount: 12400, status: 'paid', dueDate: '2026-06-20', description: 'Roof Replacement — Full Payment' }],
    messages: [
      { id: 'msg-1', from: 'team', text: 'Hi Sarah! Your project has been completed. Please let us know if you have any questions.', ts: '2026-06-10', read: true },
      { id: 'msg-2', from: 'client', text: 'Everything looks amazing! Thank you so much.', ts: '2026-06-11', read: true },
    ],
  },
  {
    id: 'cp-2', name: 'Tom Harrington', email: 'tharrington@gmail.com', phone: '(603) 555-0302',
    address: '82 Oak Lane, Nashua, NH 03060', portalCode: 'TOM4KX', joinedAt: '2026-06-20',
    jobs: [
      {
        id: 'j-2', title: 'Composite Deck Build (400 sqft)', status: 'completed', startDate: '2026-06-18', endDate: '2026-06-25',
        progress: 100, description: 'Trex Transcend composite decking, black aluminum rail, 2 steps.',
        photos: ['https://files.cdn-files-a.com/uploads/10153532/2000_691e63a256d83.jpg'],
        updates: [{ date: '2026-06-18', text: 'Footings poured.' }, { date: '2026-06-20', text: 'Frame complete.' }, { date: '2026-06-25', text: 'Decking and rail installed. Done!' }],
      },
    ],
    invoices: [
      { id: 'inv-2', amount: 8000, status: 'paid', dueDate: '2026-06-18', description: 'Deposit — 50%' },
      { id: 'inv-3', amount: 8000, status: 'due', dueDate: '2026-07-25', description: 'Final Payment — 50%' },
    ],
    messages: [{ id: 'msg-3', from: 'team', text: 'Tom! Your deck is all done. Final invoice has been sent.', ts: '2026-06-25', read: true }],
  },
  {
    id: 'cp-3', name: 'Linda Beaumont', email: 'linda.b@outlook.com', phone: '(603) 555-0403',
    address: '331 Elm Ave, Manchester, NH 03101', portalCode: 'LINDA9', joinedAt: '2026-07-01',
    jobs: [
      {
        id: 'j-3', title: 'Vinyl Siding Replacement', status: 'in-progress', startDate: '2026-07-14', endDate: '2026-07-18',
        progress: 60, description: 'Certainteed Monogram vinyl siding, Midnight Surf color, J-channel trim.',
        photos: [],
        updates: [{ date: '2026-07-14', text: 'Demo started, old siding removed from south and east walls.' }, { date: '2026-07-15', text: 'New siding installed on south wall, 60% complete.' }],
      },
    ],
    invoices: [{ id: 'inv-4', amount: 3800, status: 'due', dueDate: '2026-07-20', description: 'Siding Project — Deposit' }],
    messages: [],
  },
];

// ─── Client Portal View ───────────────────────────────────────────────────────

function ClientPortalView({ client, onBack, onMessage }: { client: PortalClient; onBack: () => void; onMessage: (cid: string, text: string) => void }) {
  const [tab, setTab] = useState<'jobs' | 'invoices' | 'messages' | 'photos'>('jobs');
  const [msgInput, setMsgInput] = useState('');

  const allPhotos = client.jobs.flatMap(j => j.photos);
  const unread = client.messages.filter(m => m.from === 'client' && !m.read).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition mb-4 flex items-center gap-1">
        ← All Clients
      </button>

      {/* Client header */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-bold text-white">
              {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 className="font-bold text-white">{client.name}</h2>
              <p className="text-sm text-gray-400">{client.email} · {client.phone}</p>
              <p className="text-xs text-gray-600">{client.address}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Portal Access Code</p>
            <code className="text-sm font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-lg">{client.portalCode}</code>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Jobs', value: client.jobs.length, icon: CheckCircle, color: 'text-blue-400' },
          { label: 'Invoices', value: client.invoices.length, icon: DollarSign, color: 'text-yellow-400' },
          { label: 'Photos', value: allPhotos.length, icon: Image, color: 'text-pink-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1 w-fit">
        {([
          { key: 'jobs', label: 'Jobs' },
          { key: 'invoices', label: 'Invoices' },
          { key: 'messages', label: `Messages${unread > 0 ? ` (${unread})` : ''}` },
          { key: 'photos', label: 'Photos' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-[#1e1e1e] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Jobs */}
      {tab === 'jobs' && (
        <div className="space-y-4">
          {client.jobs.map(job => (
            <div key={job.id} className="bg-[#111] border border-[#222] rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{job.title}</h3>
                  <p className="text-xs text-gray-500">{job.startDate} → {job.endDate || 'In progress'}</p>
                </div>
                <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full capitalize ${JOB_STATUS_COLORS[job.status]}`}>
                  {job.status.replace('-', ' ')}
                </span>
              </div>
              {job.status === 'in-progress' && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{job.progress}%</span></div>
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400 mb-3">{job.description}</p>
              {job.updates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-500 font-semibold">UPDATES</p>
                  {job.updates.map((u, i) => (
                    <div key={i} className="flex gap-2 text-xs text-gray-400">
                      <span className="text-gray-600 flex-shrink-0">{u.date}</span>
                      <span>{u.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <div className="space-y-3">
          {client.invoices.map(inv => (
            <div key={inv.id} className="bg-[#111] border border-[#222] rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">{inv.description}</p>
                <p className="text-xs text-gray-500">Due: {inv.dueDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full capitalize ${INV_STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                <span className="font-bold text-white">${inv.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-600 text-right">
            Total: <span className="text-white font-semibold">${client.invoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
          </p>
        </div>
      )}

      {/* Messages */}
      {tab === 'messages' && (
        <div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-3 space-y-3 max-h-80 overflow-y-auto">
            {client.messages.length === 0 && <p className="text-sm text-gray-600 text-center py-4">No messages yet.</p>}
            {client.messages.map(m => (
              <div key={m.id} className={`flex ${m.from === 'team' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${m.from === 'team' ? 'bg-[#1a1a1a] text-gray-300 rounded-tl-sm' : 'bg-orange-600 text-white rounded-tr-sm'}`}>
                  <p className="text-[9px] opacity-60 mb-0.5">{m.from === 'team' ? 'Black Phoenix Builds' : client.name} · {m.ts}</p>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && msgInput.trim() && (onMessage(client.id, msgInput), setMsgInput(''))}
              placeholder={`Send a message to ${client.name}...`}
              className="flex-1 bg-[#111] border border-[#222] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
            <button onClick={() => { if (msgInput.trim()) { onMessage(client.id, msgInput); setMsgInput(''); } }}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
              Send
            </button>
          </div>
        </div>
      )}

      {/* Photos */}
      {tab === 'photos' && (
        allPhotos.length === 0
          ? <div className="text-center py-12 text-gray-600 text-sm">No project photos yet.</div>
          : (
            <div className="grid grid-cols-3 gap-2">
              {allPhotos.map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#1a1a1a]">
                  <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerPortal() {
  const [clients, setClients] = useState<PortalClient[]>(load);
  const [viewing, setViewing] = useState<PortalClient | null>(null);
  const [search, setSearch] = useState('');

  // Hydrate from the server on mount (falls back to the localStorage-seeded
  // initial state if nothing is stored server-side yet).
  useEffect(() => {
    (async () => {
      const saved = await loadDual('customer_portal_clients');
      if (Array.isArray(saved) && saved.length) setClients(saved);
    })();
  }, []);

  function save(c: PortalClient[]) { setClients(c); persist(c); }

  function addClient() {
    const client: PortalClient = {
      id: `cp-${Date.now()}`, name: 'New Client', email: '', phone: '', address: '',
      portalCode: genCode(), joinedAt: new Date().toISOString().split('T')[0],
      jobs: [], invoices: [], messages: [],
    };
    save([...clients, client]);
    toast.success('Client portal created! Edit their details.');
  }

  function sendMessage(cid: string, text: string) {
    const now = new Date().toISOString().split('T')[0];
    const msg: PortalMessage = { id: `msg-${Date.now()}`, from: 'team', text, ts: now, read: false };
    const updated = clients.map(c => c.id === cid ? { ...c, messages: [...c.messages, msg] } : c);
    save(updated);
    if (viewing?.id === cid) setViewing(updated.find(c => c.id === cid) || null);
    toast.success('Message sent!');
  }

  function exportPortalLink(client: PortalClient) {
    const link = `${window.location.origin}?portal=${client.portalCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Portal link copied to clipboard!');
  }

  const filtered = useMemo(() => clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())), [clients, search]);

  if (viewing) {
    const fresh = clients.find(c => c.id === viewing.id) || viewing;
    return <ClientPortalView client={fresh} onBack={() => setViewing(null)} onMessage={sendMessage} />;
  }

  const activeJobs = clients.flatMap(c => c.jobs).filter(j => j.status === 'in-progress').length;
  const overdueInvoices = clients.flatMap(c => c.invoices).filter(i => i.status === 'overdue').length;
  const unreadMessages = clients.flatMap(c => c.messages).filter(m => m.from === 'client' && !m.read).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <User className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Customer Portal</h1>
            <p className="text-sm text-gray-400">Job updates, invoices, and messages for each client</p>
          </div>
        </div>
        <button onClick={addClient}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
          <User className="w-4 h-4" /> Add Client Portal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Clients', value: clients.length },
          { label: 'Active Jobs', value: activeJobs, color: 'text-blue-400' },
          { label: 'Overdue Invoices', value: overdueInvoices, color: overdueInvoices > 0 ? 'text-red-400' : 'text-gray-500' },
          { label: 'Unread Messages', value: unreadMessages, color: unreadMessages > 0 ? 'text-yellow-400' : 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-[#0d1a0d] border border-emerald-900/30 rounded-xl p-4 mb-5 flex gap-2.5">
        <Link2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          <span className="text-emerald-300 font-semibold">How the Client Portal works: </span>
          Each client gets a unique access code. Share their portal link and code — they can view job status, photos, invoices, and message your team. Click on any client below to manage their portal.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          className="w-full bg-[#111] border border-[#222] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
      </div>

      {/* Client list */}
      <div className="space-y-3">
        {filtered.map(c => {
          const activeJob = c.jobs.find(j => j.status === 'in-progress');
          const overdueInv = c.invoices.filter(i => i.status === 'overdue').length;
          const unread = c.messages.filter(m => m.from === 'client' && !m.read).length;

          return (
            <div key={c.id} className="bg-[#111] border border-[#222] rounded-xl p-4 hover:border-cyan-500/20 transition">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                  {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white text-sm">{c.name}</p>
                    {activeJob && <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Job Active</span>}
                    {overdueInv > 0 && <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">{overdueInv} Overdue</span>}
                    {unread > 0 && <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">{unread} Unread</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{c.email} · {c.jobs.length} job{c.jobs.length !== 1 ? 's' : ''} · {c.invoices.length} invoice{c.invoices.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <code className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg font-mono">{c.portalCode}</code>
                  <button onClick={() => exportPortalLink(c)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-white transition">
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewing(c)} className="p-2 hover:bg-[#1a1a1a] rounded-lg text-gray-500 hover:text-white transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-600 text-sm">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No clients found. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
