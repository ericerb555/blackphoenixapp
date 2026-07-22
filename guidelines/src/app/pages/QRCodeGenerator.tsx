/**
 * QRCodeGenerator — Branded QR codes for trucks, cards, flyers, yard signs.
 * Generates downloadable PNG/SVG QR codes with Black Phoenix branding.
 */
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Plus, Trash2, ExternalLink, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const QR_SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const qrAuthHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

const BASE_URL = 'https://theblackphoenixcompany.com';

const PRESET_LINKS = [
  { id: 'store',    label: '🛍️ Main Store',          url: `${BASE_URL}/shop`,         description: 'Send people directly to your shop' },
  { id: 'local',   label: '📍 Local Offer Page',     url: `${BASE_URL}/local`,        description: '15% off opt-in for ad campaigns' },
  { id: 'loyalty', label: '🔥 Rewards Program',      url: `${BASE_URL}/loyalty`,      description: 'Let customers check/join rewards' },
  { id: 'quote',   label: '📋 Request a Quote',      url: `${BASE_URL}/get-quote`,    description: 'Service leads from flyers & signs' },
  { id: 'reviews', label: '⭐ Leave a Review',       url: `https://g.page/r/your-google-review-link/review`, description: 'Boost Google reviews from physical ads' },
  { id: 'social',  label: '📱 Follow on Social',     url: `${BASE_URL}/social`,       description: 'Grow your social following' },
];

const COLORS = [
  { fg: '#ea580c', bg: '#ffffff', label: 'Brand Orange' },
  { fg: '#000000', bg: '#ffffff', label: 'Classic Black' },
  { fg: '#ffffff', bg: '#080808', label: 'Dark Mode' },
  { fg: '#1877F2', bg: '#ffffff', label: 'Electric Blue' },
  { fg: '#10b981', bg: '#ffffff', label: 'Forest Green' },
];

interface QREntry {
  id: string;
  label: string;
  url: string;
  fgColor: string;
  bgColor: string;
  dataUrl: string;
  createdAt: string;
}

const STORAGE_KEY = 'bp_qr_codes';

function loadSaved(): QREntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function persistCodes(codes: QREntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  // Mirror to server so generated QR codes are durable and feed Revenue Analytics.
  fetch(`${QR_SERVER}/qr-codes`, {
    method: 'POST',
    headers: qrAuthHeaders,
    body: JSON.stringify({ codes }),
  }).catch((err) => console.error('[QRCodeGenerator] server save failed:', err));
}

export default function QRCodeGenerator() {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_LINKS[0]);
  const [customUrl, setCustomUrl] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [fgColor, setFgColor] = useState(COLORS[0].fg);
  const [bgColor, setBgColor] = useState(COLORS[0].bg);
  const [previewUrl, setPreviewUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState<QREntry[]>(loadSaved);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load saved QR codes from the server (falls back to the localStorage cache).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${QR_SERVER}/qr-codes`, { headers: qrAuthHeaders });
        const json = await res.json();
        if (json.success && Array.isArray(json.codes)) {
          setSaved(json.codes);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.codes));
        }
      } catch (err) {
        console.error('[QRCodeGenerator] Error loading QR codes from server:', err);
      }
    })();
  }, []);

  const activeUrl = useCustom ? customUrl : selectedPreset.url;
  const activeLabel = useCustom ? (customLabel || 'Custom QR') : selectedPreset.label;

  useEffect(() => {
    if (!activeUrl) return;
    const timeout = setTimeout(() => generatePreview(), 300);
    return () => clearTimeout(timeout);
  }, [activeUrl, fgColor, bgColor]);

  async function generatePreview() {
    if (!activeUrl) return;
    try {
      const url = await QRCode.toDataURL(activeUrl, {
        width: 300, margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: 'H',
      });
      setPreviewUrl(url);
    } catch { /* silent */ }
  }

  async function handleGenerate() {
    if (!activeUrl) { toast.error('Enter a URL first'); return; }
    setGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(activeUrl, {
        width: 600, margin: 3,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: 'H',
      });
      const entry: QREntry = {
        id: `qr_${Date.now()}`,
        label: activeLabel,
        url: activeUrl,
        fgColor, bgColor, dataUrl,
        createdAt: new Date().toISOString(),
      };
      const updated = [entry, ...saved];
      setSaved(updated);
      persistCodes(updated);
      toast.success('QR code saved! Download it below.');
    } catch (e: any) {
      toast.error('Failed to generate: ' + e.message);
    }
    setGenerating(false);
  }

  function download(entry: QREntry) {
    const a = document.createElement('a');
    a.href = entry.dataUrl;
    a.download = `BP-QR-${entry.label.replace(/[^a-z0-9]/gi, '-')}.png`;
    a.click();
    toast.success('Downloaded!');
  }

  function deleteSaved(id: string) {
    const updated = saved.filter(e => e.id !== id);
    setSaved(updated);
    persistCodes(updated);
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    toast.success('URL copied!');
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.3)' }}>
            📱
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">QR Code Generator</h1>
            <p className="text-gray-400 text-sm">Branded codes for your truck, cards, flyers &amp; yard signs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Builder */}
          <div className="space-y-4">

            {/* Preset links */}
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Quick Links</p>
              <div className="space-y-2">
                {PRESET_LINKS.map(p => (
                  <button key={p.id}
                    onClick={() => { setSelectedPreset(p); setUseCustom(false); }}
                    className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: !useCustom && selectedPreset.id === p.id ? 'rgba(234,88,12,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${!useCustom && selectedPreset.id === p.id ? 'rgba(234,88,12,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    <span className="text-base flex-shrink-0">{p.label.split(' ')[0]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{p.label.substring(2)}</p>
                      <p className="text-[11px] text-gray-500 truncate">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom URL toggle */}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setUseCustom(v => !v)}
                  className="flex items-center gap-2 text-xs font-bold transition"
                  style={{ color: useCustom ? '#ea580c' : '#6b7280' }}>
                  <Plus className={`w-3.5 h-3.5 transition-transform ${useCustom ? 'rotate-45' : ''}`} />
                  {useCustom ? 'Hide custom URL' : 'Use a custom URL'}
                </button>
                {useCustom && (
                  <div className="mt-3 space-y-2">
                    <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                      placeholder="Label (e.g. Business Card)"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <input value={customUrl} onChange={e => setCustomUrl(e.target.value)}
                      placeholder="https://yourlink.com"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Color picker */}
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Color Style</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c.label}
                    onClick={() => { setFgColor(c.fg); setBgColor(c.bg); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition"
                    style={{
                      background: fgColor === c.fg ? 'rgba(234,88,12,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${fgColor === c.fg ? 'rgba(234,88,12,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <div className="w-4 h-4 rounded-md flex-shrink-0" style={{ background: c.fg, border: `2px solid ${c.bg === '#ffffff' ? '#e5e7eb' : '#333'}` }} />
                    <span className="text-gray-300">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={generating || !activeUrl}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition hover:brightness-110 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 8px 32px rgba(234,88,12,0.3)' }}>
              {generating ? '⏳ Generating…' : <><Smartphone className="w-5 h-5" /> Generate &amp; Save QR Code</>}
            </button>
          </div>

          {/* Right — Preview */}
          <div className="space-y-4">
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 self-start">Live Preview</p>

              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  {/* Branded frame */}
                  <div className="rounded-2xl p-4 flex flex-col items-center gap-3"
                    style={{ background: bgColor, border: '4px solid rgba(234,88,12,0.3)' }}>
                    <img src={companyLogo} style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
                    <img src={previewUrl} alt="QR Code" className="rounded-xl" style={{ width: 180, height: 180 }} />
                    <p className="text-[10px] font-black tracking-widest uppercase"
                      style={{ color: fgColor === '#ffffff' ? '#ffffff' : '#080808' }}>
                      Scan Me
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{activeLabel}</p>
                    <p className="text-[11px] text-gray-600 truncate max-w-[240px]">{activeUrl}</p>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                  <p className="text-xs text-gray-600 text-center">Select a link to<br />preview your QR</p>
                </div>
              )}

              {/* Usage tips */}
              <div className="w-full rounded-xl p-3" style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.15)' }}>
                <p className="text-[11px] font-black text-orange-300 mb-1">💡 Where to use this</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {selectedPreset.id === 'store' && 'Truck wrap, business cards, storefront window'}
                  {selectedPreset.id === 'local' && 'Flyers in neighborhood, door hangers, mailers'}
                  {selectedPreset.id === 'loyalty' && 'Receipts, packaging inserts, business cards'}
                  {selectedPreset.id === 'quote' && 'Yard signs, job site signs, truck magnets'}
                  {selectedPreset.id === 'reviews' && 'Invoices, thank-you cards, email signatures'}
                  {selectedPreset.id === 'social' && 'Event booths, shirts, packaging'}
                  {useCustom && 'Any physical or digital marketing material'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Saved QR codes */}
        {saved.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Saved QR Codes ({saved.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {saved.map(entry => (
                <div key={entry.id} className="flex flex-col items-center gap-2 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <img src={entry.dataUrl} alt={entry.label} className="rounded-lg"
                    style={{ width: 80, height: 80, background: entry.bgColor }} />
                  <p className="text-xs font-bold text-white text-center leading-tight">{entry.label}</p>
                  <p className="text-[9px] text-gray-600">{new Date(entry.createdAt).toLocaleDateString()}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => download(entry)} title="Download"
                      className="p-1.5 rounded-lg transition hover:bg-white/10">
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => copyUrl(entry.url)} title="Copy URL"
                      className="p-1.5 rounded-lg transition hover:bg-white/10">
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => deleteSaved(entry.id)} title="Delete"
                      className="p-1.5 rounded-lg transition hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
