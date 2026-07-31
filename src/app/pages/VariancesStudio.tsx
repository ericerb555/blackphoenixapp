import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, Upload, Loader2, Sparkles, MapPin, User, ScrollText, Scale,
  CheckCircle2, AlertTriangle, Printer, Save, History, ChevronRight, Trash2, Paperclip, X,
  BookOpenCheck,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Field { label: string; value: string; sourceNote?: string }
interface Section { heading: string; fields: Field[] }
interface Criterion { criterion: string; response: string }
interface Filled {
  formTitle?: string;
  jurisdiction?: string;
  boardName?: string;
  varianceType?: string;
  sections?: Section[];
  statutoryCriteria?: Criterion[];
  attachmentsNeeded?: string[];
  missingInfo?: string[];
  filingNotes?: string;
}

export default function VariancesStudio() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileMime, setFileMime] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Applicant + project context
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [address, setAddress] = useState('');
  const [parcelId, setParcelId] = useState('');
  const [currentZoning, setCurrentZoning] = useState('');
  const [varianceType, setVarianceType] = useState('');
  const [reliefRequested, setReliefRequested] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filingId, setFilingId] = useState<string | null>(null);
  const [filled, setFilled] = useState<Filled | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` }),
    [token],
  );

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) setToken(session.access_token);
        let e = session?.user?.email || '';
        if (!e) {
          const stored = localStorage.getItem('currentUserProfile');
          if (stored) { try { e = JSON.parse(stored).email || ''; } catch { /* ignore */ } }
        }
        if (e) setEmail(e.toLowerCase());
      } catch (err) {
        console.error('VariancesStudio: failed to resolve session:', err);
      }
    })();
  }, []);

  const loadHistory = async (e: string, t: string | null) => {
    try {
      const res = await fetch(`${SERVER}/variances/${encodeURIComponent(e)}`, {
        headers: { Authorization: `Bearer ${t || publicAnonKey}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.filings)) setHistory(data.filings);
    } catch (err) {
      console.error('VariancesStudio: failed to load history:', err);
    }
  };

  useEffect(() => {
    if (email) loadHistory(email, token);
  }, [email, token]);

  const readFile = (file: File) => {
    if (!file) return;
    const okTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!okTypes.includes(file.type)) {
      setError('Please upload a PDF or an image (PNG/JPG/WEBP) of the variance form.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File is too large. Please keep it under 15 MB.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
      setFileName(file.name);
      setFileMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const scanAndFill = async () => {
    setError(null);
    if (!fileDataUrl) { setError('Upload the blank variance application first.'); return; }
    setLoading(true);
    setFilled(null);
    setFilingId(null);
    try {
      const res = await fetch(`${SERVER}/variances/scan-fill`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          fileDataUrl,
          fileName,
          email,
          address,
          parcelId,
          currentZoning,
          varianceType,
          reliefRequested,
          projectDescription,
          applicant: { name, email, phone, mailingAddress },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Server returned ${res.status}`);
      setFilled(data.filing.filled);
      setFilingId(data.filing.id);
      if (email) loadHistory(email, token);
    } catch (err: any) {
      console.error('VariancesStudio: scan-fill failed:', err);
      setError(`Couldn't scan the form: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!filingId || !filled) return;
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/variances/${filingId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ filled, status: 'reviewed' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Server returned ${res.status}`);
      if (email) loadHistory(email, token);
    } catch (err: any) {
      console.error('VariancesStudio: save failed:', err);
      setError(`Couldn't save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`${SERVER}/variances/${id}`, { method: 'DELETE', headers: authHeaders });
      if (id === filingId) { setFilled(null); setFilingId(null); }
      if (email) loadHistory(email, token);
    } catch (err) {
      console.error('VariancesStudio: delete failed:', err);
    }
  };

  const openFiling = (f: any) => {
    setFilled(f.filled);
    setFilingId(f.id);
    setFileName(f.file_name || '');
    setAddress(f.address || '');
  };

  // ── Inline editing helpers ────────────────────────────────────────────────
  const updateField = (si: number, fi: number, value: string) => {
    setFilled((prev) => {
      if (!prev?.sections) return prev;
      const sections = prev.sections.map((s, i) =>
        i !== si ? s : { ...s, fields: s.fields.map((f, j) => (j !== fi ? f : { ...f, value })) },
      );
      return { ...prev, sections };
    });
  };
  const updateCriterion = (i: number, response: string) => {
    setFilled((prev) => {
      if (!prev?.statutoryCriteria) return prev;
      return { ...prev, statutoryCriteria: prev.statutoryCriteria.map((c, j) => (j !== i ? c : { ...c, response })) };
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-orange-600/15 to-transparent border-b border-[#2A2A2A] print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium mb-4">
            <Scale className="w-4 h-4" /> Zoning Variance Filing
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Upload your variance form. AI fills it out.</h1>
          <p className="text-gray-400 max-w-2xl">
            Drop in the blank variance application (PDF or photo). Our AI reads every field, then fills it out as the
            applicant — including drafted answers to the statutory variance criteria (NH RSA 674:33 / MA c. 40A §10).
            Review, tweak, and print a ready-to-file draft.
          </p>
          <button
            onClick={() => (window as any).__navigateApp?.('permit-ai')}
            title="Open PermitAI for building code & permit guidance"
            className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-300 hover:text-violet-200 hover:bg-violet-500/10 text-sm transition-colors"
          >
            <BookOpenCheck className="w-4 h-4" /> Check building codes & permits in PermitAI
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        {/* Input column */}
        <div className="lg:col-span-1 space-y-4 print:hidden">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 lg:sticky lg:top-6">
            {/* Upload */}
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2"><Upload className="w-4 h-4" /> Variance application form</label>
            {!fileDataUrl ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors mb-4 ${dragOver ? 'border-orange-500 bg-orange-500/10' : 'border-[#2A2A2A] hover:border-orange-500/50'}`}
              >
                <Paperclip className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-300">Drop the form here or click to browse</p>
                <p className="text-xs text-gray-600 mt-1">PDF, PNG, JPG or WEBP · up to 15 MB</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 mb-4">
                <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span className="text-sm text-gray-300 truncate flex-1">{fileName}</span>
                <button onClick={() => { setFileDataUrl(null); setFileName(''); setFileMime(''); }} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
            />

            {/* Applicant */}
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 mt-2 mb-2"><User className="w-3.5 h-3.5" /> Applicant</p>
            <Input value={name} onChange={setName} placeholder="Full name" />
            <Input value={phone} onChange={setPhone} placeholder="Phone" />
            <Input value={mailingAddress} onChange={setMailingAddress} placeholder="Mailing address" />

            {/* Property + relief */}
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 mt-3 mb-2"><MapPin className="w-3.5 h-3.5" /> Property & relief sought</p>
            <Input value={address} onChange={setAddress} placeholder="Property address" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={parcelId} onChange={setParcelId} placeholder="Map & lot" />
              <Input value={currentZoning} onChange={setCurrentZoning} placeholder="Zoning district" />
            </div>
            <select
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm mb-2 focus:outline-none focus:border-orange-500/60"
              value={varianceType}
              onChange={(e) => setVarianceType(e.target.value)}
            >
              <option value="">Variance type — let AI infer</option>
              <option value="area/dimensional">Area / dimensional (setbacks, height, lot coverage…)</option>
              <option value="use">Use variance</option>
              <option value="special-exception">Special exception</option>
            </select>
            <textarea
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 min-h-[70px] mb-2 focus:outline-none focus:border-orange-500/60"
              placeholder="What relief do you want? (e.g. reduce the rear setback from 30ft to 12ft to add a two-car garage)"
              value={reliefRequested}
              onChange={(e) => setReliefRequested(e.target.value)}
            />
            <textarea
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 min-h-[70px] mb-4 focus:outline-none focus:border-orange-500/60"
              placeholder="Project details & why (hardship, lot shape, existing conditions, goals…)"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />

            {error && <div className="mb-3 bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">{error}</div>}
            <button
              onClick={scanAndFill}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Reading & filling…</> : <><Sparkles className="w-5 h-5" /> Scan & fill the form</>}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><History className="w-4 h-4" /> Saved filings</p>
              <div className="space-y-1">
                {history.slice(0, 10).map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#1A1A1A] transition-colors group">
                    <button onClick={() => openFiling(f)} className="flex items-center gap-2 text-left flex-1 min-w-0">
                      <ScrollText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-300 truncate">{f.address || f.filled?.formTitle || f.file_name || 'Variance draft'}</span>
                    </button>
                    <button onClick={() => remove(f.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                    <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filled form */}
        <div className="lg:col-span-2">
          {!filled && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-[#2A2A2A] rounded-2xl py-20 px-6 print:hidden">
              <ScrollText className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-400 font-medium">Your completed variance application will appear here.</p>
              <p className="text-sm text-gray-600 mt-1 max-w-sm">Upload the blank form, add your details, and the AI will fill in every field plus the statutory criteria.</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center border border-[#2A2A2A] rounded-2xl py-20 print:hidden">
              <Loader2 className="w-10 h-10 text-orange-400 animate-spin mb-4" />
              <p className="text-gray-300 font-medium">Reading the form and drafting your answers…</p>
              <p className="text-sm text-gray-600 mt-1">This usually takes 15–40 seconds.</p>
            </div>
          )}

          {filled && (
            <div className="space-y-6">
              {/* Header + actions */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{filled.formTitle || 'Variance Application'}</h2>
                  <p className="text-sm text-gray-500">
                    {[filled.boardName, filled.jurisdiction].filter(Boolean).join(' · ')}
                    {filled.varianceType ? ` · ${filled.varianceType}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 print:hidden">
                  <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A2A2A] text-white text-sm hover:bg-[#3A3A3A] disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white text-sm hover:opacity-90">
                    <Printer className="w-4 h-4" /> Print / PDF
                  </button>
                </div>
              </div>

              {/* Missing info */}
              {Array.isArray(filled.missingInfo) && filled.missingInfo.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 print:hidden">
                  <p className="flex items-center gap-2 font-semibold text-orange-300 mb-2"><AlertTriangle className="w-4 h-4" /> Confirm before filing</p>
                  <ul className="space-y-1">
                    {filled.missingInfo.map((m, i) => <li key={i} className="text-sm text-orange-200/90">• {m}</li>)}
                  </ul>
                </div>
              )}

              {/* Sections */}
              {Array.isArray(filled.sections) && filled.sections.map((section, si) => (
                <section key={si} className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 print:bg-white print:border-gray-300">
                  <h3 className="font-semibold text-white mb-4 print:text-black flex items-center gap-2"><FileText className="w-4 h-4 text-orange-400 print:hidden" /> {section.heading}</h3>
                  <div className="space-y-4">
                    {section.fields?.map((field, fi) => (
                      <div key={fi}>
                        <label className="text-xs uppercase tracking-wide text-gray-500 print:text-gray-700">{field.label}</label>
                        <textarea
                          value={field.value || ''}
                          onChange={(e) => updateField(si, fi, e.target.value)}
                          rows={Math.min(6, Math.max(1, Math.ceil((field.value || '').length / 70)))}
                          className="w-full mt-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm resize-y focus:outline-none focus:border-orange-500/60 print:bg-white print:text-black print:border-gray-300"
                        />
                        {field.sourceNote && <p className="text-[11px] text-gray-600 mt-0.5 print:hidden">{field.sourceNote}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {/* Statutory criteria */}
              {Array.isArray(filled.statutoryCriteria) && filled.statutoryCriteria.length > 0 && (
                <section className="bg-[#141414] border border-emerald-500/30 rounded-2xl p-6 print:bg-white print:border-gray-300">
                  <h3 className="flex items-center gap-2 font-semibold text-white mb-4 print:text-black"><Scale className="w-5 h-5 text-emerald-400 print:hidden" /> Statutory variance criteria</h3>
                  <div className="space-y-5">
                    {filled.statutoryCriteria.map((crit, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium text-emerald-300 mb-1 print:text-black flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0 print:hidden">{i + 1}</span>
                          {crit.criterion}
                        </p>
                        <textarea
                          value={crit.response || ''}
                          onChange={(e) => updateCriterion(i, e.target.value)}
                          rows={Math.min(10, Math.max(3, Math.ceil((crit.response || '').length / 70)))}
                          className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm resize-y focus:outline-none focus:border-orange-500/60 print:bg-white print:text-black print:border-gray-300"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Attachments + notes */}
              <div className="grid md:grid-cols-2 gap-6">
                {Array.isArray(filled.attachmentsNeeded) && filled.attachmentsNeeded.length > 0 && (
                  <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 print:bg-white print:border-gray-300">
                    <h3 className="flex items-center gap-2 font-semibold text-white mb-3 print:text-black"><Paperclip className="w-4 h-4 text-orange-400 print:hidden" /> Attachments to include</h3>
                    <ul className="space-y-1.5">
                      {filled.attachmentsNeeded.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300 print:text-black"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 print:hidden" /> {a}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {filled.filingNotes && (
                  <section className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 print:bg-white print:border-gray-300">
                    <h3 className="font-semibold text-white mb-3 print:text-black">Filing notes</h3>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap print:text-black">{filled.filingNotes}</p>
                  </section>
                )}
              </div>

              <p className="text-xs text-gray-600 border-t border-[#2A2A2A] pt-4">
                This AI-generated draft is a starting point, not legal advice. Verify every field against the official
                application and your municipality's requirements before submitting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 mb-2 focus:outline-none focus:border-orange-500/60"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
