/**
 * Job photos — one place for the photographs the business runs on.
 *
 * Photos were scattered: some hotlinked from the old website, some in
 * localStorage, some in a media library reached through a marketing menu and
 * called "Photo Importer". None of it answered the question that matters, which
 * is *which of these can a customer see*.
 *
 * THE ONE RULE THIS SCREEN EXISTS TO MAKE OBVIOUS
 *
 * A photograph is private until it is deliberately published. These are
 * customers' homes, and most site photos are records of work rather than
 * advertisements — a stripped-back bathroom mid-job is a progress note. So
 * everything uploaded here starts hidden and the toggle to publish is the only
 * way onto the public page. The badge says which state each photo is in, on
 * every card, because a mistake here is a customer's house on the internet.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Image as ImageIcon, Upload, Eye, EyeOff, Trash2, Loader2, Globe,
  RefreshCw, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Photo {
  id: string;
  title: string;
  category: string;
  image: string;
  published: boolean;
  order?: number;
  sourceUrl?: string;
  createdAt?: string;
}

const CATEGORIES = ['Completed Projects', 'Recent Projects', 'Kitchens', 'Bathrooms', 'Additions', 'Exterior'];

export default function JobPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/gallery/all`, { headers: await authedHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || `Could not load photos (${res.status}).`);
        setPhotos([]);
        return;
      }
      setPhotos(Array.isArray(data?.projects) ? data.projects : []);
    } catch (err: any) {
      toast.error(err?.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Publishing is the one action with consequences outside this screen. */
  const togglePublished = async (photo: Photo) => {
    setBusy(photo.id);
    try {
      const res = await fetch(`${SERVER}/gallery/${photo.id}`, {
        method: 'PATCH',
        headers: await authedHeaders(),
        body: JSON.stringify({ published: !photo.published }),
      });
      if (!res.ok) { toast.error('Could not change that.'); return; }
      setPhotos(list => list.map(p => p.id === photo.id ? { ...p, published: !p.published } : p));
      toast.success(photo.published
        ? `"${photo.title}" is hidden from the public page.`
        : `"${photo.title}" is now on the public page.`);
    } finally {
      setBusy(null);
    }
  };

  const rename = async (photo: Photo, patch: Partial<Photo>) => {
    setPhotos(list => list.map(p => p.id === photo.id ? { ...p, ...patch } : p));
    try {
      await fetch(`${SERVER}/gallery/${photo.id}`, {
        method: 'PATCH',
        headers: await authedHeaders(),
        body: JSON.stringify(patch),
      });
    } catch { /* the optimistic value stands; a reload shows the truth */ }
  };

  const remove = async (photo: Photo) => {
    if (!confirm(`Delete "${photo.title}"? This removes the file as well and cannot be undone.`)) return;
    setBusy(photo.id);
    try {
      const res = await fetch(`${SERVER}/gallery/${photo.id}`, {
        method: 'DELETE', headers: await authedHeaders(),
      });
      if (!res.ok) { toast.error('Could not delete that.'); return; }
      setPhotos(list => list.filter(p => p.id !== photo.id));
      toast.success('Deleted.');
    } finally {
      setBusy(null);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0, failed = 0;
    for (const file of Array.from(files)) {
      try {
        const body = new FormData();
        body.append('file', file);
        body.append('title', file.name.replace(/\.[^.]+$/, ''));
        // FormData sets its own content type with a boundary, so the JSON
        // header from authedHeaders would corrupt the request.
        const { data } = await supabase.auth.getSession();
        const res = await fetch(`${SERVER}/gallery/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${data?.session?.access_token || ''}` },
          body,
        });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    setUploading(false);
    if (ok) toast.success(`${ok} photo${ok === 1 ? '' : 's'} added — hidden until you publish them.`);
    if (failed) toast.error(`${failed} could not be uploaded.`);
    load();
  };

  const importWebsite = async () => {
    setImporting(true);
    try {
      const res = await fetch(`${SERVER}/gallery/import-website`, {
        method: 'POST', headers: await authedHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.error || `Import failed (${res.status}).`);
        return;
      }
      if (data.imported === 0 && data.skipped > 0) toast.info(`All ${data.skipped} are already here.`);
      else toast.success(`${data.imported} photos copied from blackphoenixbuilds.com.`);
      if (data.failed > 0) toast.error(`${data.failed} could not be fetched.`);
      load();
    } finally {
      setImporting(false);
    }
  };

  const shown = photos.filter(p =>
    filter === 'all' ? true : filter === 'published' ? p.published : !p.published);
  const publishedCount = photos.filter(p => p.published).length;

  const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111]';

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 lg:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-[#ea580c]" /> Job photos
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Everything the business has photographed. {publishedCount} of {photos.length} are on the
              public page — the rest are visible only here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={importWebsite} disabled={importing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-200 disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              title="Copy the photos from blackphoenixbuilds.com into this app">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Import from old website
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Add photos
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={e => { upload(e.target.files); e.target.value = ''; }} />
          </div>
        </div>

        {/* The rule, said once, where it cannot be missed. */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-xs text-gray-400">
          Photos you add start <strong className="text-white">hidden</strong>. Nothing reaches the public
          page until you publish it — these are customers' homes, and a progress shot is not an advert.
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'published', 'hidden'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize ${
                filter === f ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:bg-white/5'}`}>
              {f}{f === 'published' ? ` (${publishedCount})` : f === 'hidden' ? ` (${photos.length - publishedCount})` : ''}
            </button>
          ))}
          <button onClick={load} className="ml-auto text-gray-500 hover:text-white p-2" title="Reload">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className={`${card} p-12 flex items-center justify-center text-gray-500`}>
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : !photos.length ? (
          <div className={`${card} p-12 text-center`}>
            <ImageIcon className="w-8 h-8 text-[#2A2A2A] mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-300">No photos yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Import the ones from blackphoenixbuilds.com, or add photos from a job.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shown.map(p => (
              <div key={p.id} className={`${card} overflow-hidden group`}>
                <div className="relative aspect-[4/3] bg-[#0A0A0A]">
                  <img src={p.image} alt={p.title} loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover" />
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.published ? 'bg-green-500/90 text-white' : 'bg-black/70 text-gray-300'}`}>
                    {p.published ? 'PUBLIC' : 'HIDDEN'}
                  </span>
                </div>
                <div className="p-2.5 space-y-2">
                  <input value={p.title}
                    onChange={e => setPhotos(l => l.map(x => x.id === p.id ? { ...x, title: e.target.value } : x))}
                    onBlur={e => rename(p, { title: e.target.value })}
                    className="w-full bg-transparent text-sm text-white font-semibold focus:outline-none focus:bg-[#0A0A0A] rounded px-1 py-0.5" />
                  <select value={p.category}
                    onChange={e => rename(p, { category: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-[11px] text-gray-300 px-1.5 py-1 focus:outline-none">
                    {[...new Set([...CATEGORIES, p.category])].filter(Boolean).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => togglePublished(p)} disabled={busy === p.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40 ${
                        p.published ? 'text-gray-300 hover:bg-white/5' : 'text-white'}`}
                      style={p.published ? { border: '1px solid rgba(255,255,255,0.12)' } : { background: '#16a34a' }}>
                      {busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" />
                        : p.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {p.published ? 'Hide' : 'Publish'}
                    </button>
                    <button onClick={() => remove(p)} disabled={busy === p.id}
                      className="px-2 py-1.5 rounded-lg text-gray-500 hover:text-red-400 disabled:opacity-40"
                      title="Delete this photo and its file">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && photos.length > 0 && shown.length === 0 && (
          <div className={`${card} p-8 text-center text-sm text-gray-500`}>
            Nothing {filter === 'published' ? 'published' : 'hidden'} yet.
          </div>
        )}

        <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          Published photos appear on the Black Phoenix Builds page and are available to the content
          tools. Hidden ones stay here.
        </p>
      </div>
    </div>
  );
}
