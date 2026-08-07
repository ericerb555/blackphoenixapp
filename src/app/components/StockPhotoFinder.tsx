/**
 * Stock photo search backed by GET /make-server-3eae23a6/stock-photos/search.
 *
 * Results come straight from Unsplash — nothing here is sample data. If the
 * UNSPLASH_ACCESS_KEY secret is missing the server answers 503 and we say so
 * plainly rather than showing placeholder tiles.
 *
 * Recently used photos are remembered locally so a URL you picked once is one
 * click away next time.
 */
import { useState, useEffect } from 'react';
import { Search, Image as ImageIcon, Copy, Download, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface StockPhoto {
  id: string;
  description: string;
  thumb: string;
  full: string;
  download: string;
  photographer: string;
  photographerUrl: string;
  link: string;
}

const RECENTS_KEY = 'stock_photo_recents';
const MAX_RECENTS = 12;

function readRecents(): StockPhoto[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface Props {
  /** Called with the full-size URL when a photo is chosen. */
  onSelect?: (url: string, photo: StockPhoto) => void;
}

export default function StockPhotoFinder({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [recents, setRecents] = useState<StockPhoto[]>([]);

  useEffect(() => { setRecents(readRecents()); }, []);

  const persistRecents = (next: StockPhoto[]) => {
    setRecents(next);
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch {}
  };

  const remember = (photo: StockPhoto) => {
    persistRecents([photo, ...recents.filter(p => p.id !== photo.id)].slice(0, MAX_RECENTS));
  };

  const runSearch = async () => {
    const q = query.trim();
    if (!q) { toast.error('Enter something to search for.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/stock-photos/search?q=${encodeURIComponent(q)}&perPage=24`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || `Stock photo search failed (${res.status}).`);
      }
      setPhotos(data.photos || []);
    } catch (err: any) {
      console.error('Stock photo search failed:', err);
      setError(err?.message || 'Stock photo search failed.');
      setPhotos([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const copyUrl = async (photo: StockPhoto) => {
    try {
      await navigator.clipboard.writeText(photo.full);
      remember(photo);
      toast.success('Image URL copied to clipboard.');
    } catch {
      toast.error('Your browser blocked clipboard access. Use the download link instead.');
    }
  };

  const choose = (photo: StockPhoto) => {
    remember(photo);
    onSelect?.(photo.full, photo);
    if (!onSelect) void copyUrl(photo);
  };

  const tile = (photo: StockPhoto) => (
    <div key={photo.id} className="group relative rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#1A1A1A]">
      <img
        src={photo.thumb}
        alt={photo.description}
        className="w-full h-28 object-cover cursor-pointer"
        onClick={() => choose(photo)}
      />
      <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2 py-1 opacity-0 group-hover:opacity-100 transition">
        <div className="flex items-center justify-between gap-1">
          <a
            href={photo.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-300 hover:text-white truncate"
            title={`Photo by ${photo.photographer} on Unsplash`}
          >
            {photo.photographer}
          </a>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => void copyUrl(photo)} title="Copy image URL" className="p-1 text-gray-300 hover:text-white">
              <Copy className="w-3 h-3" />
            </button>
            <a href={photo.download} target="_blank" rel="noopener noreferrer" title="Download" className="p-1 text-gray-300 hover:text-white">
              <Download className="w-3 h-3" />
            </a>
            <a href={photo.link} target="_blank" rel="noopener noreferrer" title="View on Unsplash" className="p-1 text-gray-300 hover:text-white">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }}
            placeholder="Search stock photos — e.g. roof repair, kitchen remodel"
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600"
          />
        </div>
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={loading}
          className="px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white text-sm font-bold rounded-lg transition"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error ? (
        <div className="text-center py-8">
          <ImageIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : loading ? (
        <p className="text-sm text-gray-500 text-center py-8">Searching Unsplash…</p>
      ) : photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">{photos.map(tile)}</div>
      ) : searched ? (
        <p className="text-sm text-gray-500 text-center py-8">No photos matched that search.</p>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">
          Search for imagery to drop into posts and reels. Click a result to copy its URL.
        </p>
      )}

      {recents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Recently used</h5>
            <button
              type="button"
              onClick={() => persistRecents([])}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">{recents.map(tile)}</div>
        </div>
      )}
    </div>
  );
}
