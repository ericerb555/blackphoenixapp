import { useEffect, useState, useCallback, useRef } from 'react';
import { Upload, Trash2, Loader2, Download } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

function auth(session: any) {
  return { Authorization: `Bearer ${session?.access_token}` };
}

// Accent color presets keyed to each portal's theme. Falls back to teal.
const ACCENTS: Record<string, { btn: string; focus: string }> = {
  teal: { btn: 'bg-teal-600 hover:bg-teal-700', focus: 'focus:border-teal-500 focus:ring-teal-500/20' },
  indigo: { btn: 'bg-indigo-600 hover:bg-indigo-700', focus: 'focus:border-indigo-500 focus:ring-indigo-500/20' },
  orange: { btn: 'bg-orange-600 hover:bg-orange-700', focus: 'focus:border-orange-500 focus:ring-orange-500/20' },
  blue: { btn: 'bg-blue-600 hover:bg-blue-700', focus: 'focus:border-blue-500 focus:ring-blue-500/20' },
  emerald: { btn: 'bg-emerald-600 hover:bg-emerald-700', focus: 'focus:border-emerald-500 focus:ring-emerald-500/20' },
  violet: { btn: 'bg-violet-600 hover:bg-violet-700', focus: 'focus:border-violet-500 focus:ring-violet-500/20' },
  rose: { btn: 'bg-rose-600 hover:bg-rose-700', focus: 'focus:border-rose-500 focus:ring-rose-500/20' },
};

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm';
const btnGhost = 'inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-[#2A2A2A] disabled:opacity-50';
const labelCls = 'mb-1 block text-xs font-medium text-gray-400';

export function PortalDocumentVault({
  session,
  accent = 'teal',
  categories = ['Contract', 'Invoice', 'Receipt', 'Report', 'ID', 'General'],
  title = 'Document vault',
  description = 'Securely store and access your important files and records.',
}: {
  session: any;
  accent?: keyof typeof ACCENTS;
  categories?: string[];
  title?: string;
  description?: string;
}) {
  const theme = ACCENTS[accent] || ACCENTS.teal;
  const inputCls = `w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] text-white px-3 py-2 text-sm outline-none focus:ring-2 ${theme.focus}`;
  const btnAccent = `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${theme.btn}`;

  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState(categories[0] || 'General');
  const [relatedTo, setRelatedTo] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/portal/documents`, { headers: auth(session) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load documents');
      setDocs(data.documents || []); setError('');
    } catch (e: any) { setError(e.message || 'Failed to load documents'); }
    finally { setLoading(false); }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    try {
      setUploading(true); setError('');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      fd.append('category', category);
      fd.append('relatedTo', relatedTo);
      const res = await fetch(`${API}/portal/documents`, { method: 'POST', headers: auth(session), body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      setDocs((cur) => [data.document, ...cur]);
    } catch (e: any) { setError(e.message || 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const res = await fetch(`${API}/portal/documents/${id}`, { method: 'DELETE', headers: auth(session) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDocs((cur) => cur.filter((d) => d.id !== id));
    } catch (e: any) { alert(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <div className={`${card} p-4`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={labelCls}>Category</label>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((cat) => <option key={cat}>{cat}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Related to (optional)</label><input className={inputCls} value={relatedTo} onChange={(e) => setRelatedTo(e.target.value)} placeholder="Name / project / reference" /></div>
          <div className="flex items-end">
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            <button className={btnAccent} disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload file</button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Max 25MB per file.</p>
      </div>
      {error && <div className="text-sm text-rose-500">{error}</div>}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : docs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">No documents yet.</div>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{d.name}</div>
                  <div className="text-xs text-gray-400">{d.category}{d.relatedTo ? ` · ${d.relatedTo}` : ''} · {(d.size / 1024).toFixed(0)} KB</div>
                </div>
                <div className="flex items-center gap-2">
                  {d.url && <a href={d.url} target="_blank" rel="noreferrer" className={btnGhost}><Download className="h-4 w-4" /></a>}
                  <button className={btnGhost + ' text-rose-500'} onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default PortalDocumentVault;
