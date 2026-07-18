import { useState, useEffect } from 'react';
import { Image, Facebook, Globe, CheckCircle, AlertCircle, Upload, RefreshCw, ExternalLink, Key, Info, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { seedWebsitePhotos } from '../utils/seedWebsitePhotos';

interface ImportedPhoto {
  id: string;
  url: string;
  name: string;
  source: 'website' | 'facebook';
  folder: string;
  importedAt: string;
}

interface FBPhoto {
  id: string;
  images: { source: string; width: number; height: number }[];
  created_time?: string;
}

export default function PhotoImporter() {
  const [websiteStatus, setWebsiteStatus] = useState<'idle' | 'importing' | 'done' | 'already'>('idle');
  const [websiteCount, setWebsiteCount] = useState(0);
  const [fbToken, setFbToken] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [fbStatus, setFbStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [fbError, setFbError] = useState('');
  const [fbPhotoCount, setFbPhotoCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('media_library_items') || '[]');
      setMediaCount(items.length);
      const webImported = items.filter((i: any) => i.uploadedBy === 'Website Import').length;
      if (webImported > 0) {
        setWebsiteStatus('already');
        setWebsiteCount(webImported);
      }
    } catch {}

    const saved = localStorage.getItem('fb_import_token') || '';
    const savedPage = localStorage.getItem('fb_import_page_id') || '';
    if (saved) setFbToken(saved);
    if (savedPage) setFbPageId(savedPage);
  }, []);

  function handleImportWebsite() {
    setWebsiteStatus('importing');
    setTimeout(() => {
      const count = seedWebsitePhotos();
      if (count === 0) {
        setWebsiteStatus('already');
        const items = JSON.parse(localStorage.getItem('media_library_items') || '[]');
        setWebsiteCount(items.filter((i: any) => i.uploadedBy === 'Website Import').length);
        toast.info('All website photos were already in your Media Library.');
      } else {
        setWebsiteStatus('done');
        setWebsiteCount(count);
        const items = JSON.parse(localStorage.getItem('media_library_items') || '[]');
        setMediaCount(items.length);
        toast.success(`${count} photos imported from blackphoenixbuilds.com!`);
      }
    }, 1200);
  }

  async function handleImportFacebook() {
    if (!fbToken.trim()) {
      toast.error('Paste your Facebook Page Access Token first.');
      return;
    }

    setFbStatus('loading');
    setFbError('');

    const pageId = fbPageId.trim() || 'me';

    try {
      localStorage.setItem('fb_import_token', fbToken.trim());
      if (fbPageId.trim()) localStorage.setItem('fb_import_page_id', fbPageId.trim());

      const res = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/photos?fields=images,created_time&limit=100&access_token=${fbToken.trim()}`
      );
      const data = await res.json();

      if (data.error) {
        setFbStatus('error');
        setFbError(data.error.message || 'Facebook API error. Check your token.');
        return;
      }

      const photos: FBPhoto[] = data.data || [];
      if (photos.length === 0) {
        setFbStatus('error');
        setFbError('No photos found on this page. Make sure the token has "pages_read_engagement" and "pages_media_access" permissions.');
        return;
      }

      const existing: any[] = JSON.parse(localStorage.getItem('media_library_items') || '[]');
      const existingUrls = new Set(existing.map((i: any) => i.url));

      const newItems = photos
        .map((p, idx) => {
          const best = p.images?.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
          if (!best || existingUrls.has(best.source)) return null;
          return {
            id: `MEDIA-FB-${Date.now()}-${idx}`,
            type: 'image' as const,
            name: `Facebook Photo ${idx + 1}`,
            url: best.source,
            thumbnail: best.source,
            size: 600000,
            dimensions: { width: best.width || 1200, height: best.height || 900 },
            uploadedAt: p.created_time || new Date().toISOString(),
            uploadedBy: 'Facebook Import',
            tags: ['facebook', 'social', 'black-phoenix-builds'],
            folder: 'Facebook',
            favorite: false,
            description: 'Imported from Black Phoenix Builds Facebook page',
          };
        })
        .filter(Boolean);

      const merged = [...existing, ...newItems];
      localStorage.setItem('media_library_items', JSON.stringify(merged));
      setFbPhotoCount(newItems.length);
      setMediaCount(merged.length);
      setFbStatus('done');
      toast.success(`${newItems.length} Facebook photos imported!`);
    } catch (e: any) {
      setFbStatus('error');
      setFbError(e.message || 'Network error. Check your connection and token.');
    }
  }

  function clearImported(source: 'Website Import' | 'Facebook Import') {
    try {
      const existing: any[] = JSON.parse(localStorage.getItem('media_library_items') || '[]');
      const filtered = existing.filter((i: any) => i.uploadedBy !== source);
      localStorage.setItem('media_library_items', JSON.stringify(filtered));
      const removed = existing.length - filtered.length;
      setMediaCount(filtered.length);
      if (source === 'Website Import') { setWebsiteStatus('idle'); setWebsiteCount(0); }
      else { setFbStatus('idle'); setFbPhotoCount(0); }
      toast.success(`Removed ${removed} ${source.split(' ')[0].toLowerCase()} photos from Media Library.`);
    } catch {}
  }

  function navigateToMedia() {
    if ((window as any).__navigateApp) {
      (window as any).__navigateApp('media-library');
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Image className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Photo Importer</h1>
            <p className="text-sm text-gray-400">Pull your portfolio photos into the Media Library</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total in Library', value: mediaCount, color: 'text-white' },
          { label: 'Website Photos', value: websiteStatus === 'done' || websiteStatus === 'already' ? websiteCount : 0, color: 'text-emerald-400' },
          { label: 'Facebook Photos', value: fbStatus === 'done' ? fbPhotoCount : 0, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Website Import Card */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Import from Website</h2>
              <p className="text-xs text-gray-500">blackphoenixbuilds.com · 36 photos ready</p>
            </div>
          </div>
          {(websiteStatus === 'done' || websiteStatus === 'already') && (
            <button
              onClick={() => clearImported('Website Import')}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          )}
        </div>

        <div className="grid grid-cols-6 gap-1.5 mb-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-[#1a1a1a] overflow-hidden">
              <img
                src={`https://files.cdn-files-a.com/uploads/10153532/2000_6775a82c7c1f${i.toString(16).padStart(1, '0')}.png`}
                className="w-full h-full object-cover opacity-60"
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                alt=""
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {websiteStatus === 'idle' && (
            <button
              onClick={handleImportWebsite}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
            >
              <Download className="w-4 h-4" />
              Import 36 Photos
            </button>
          )}
          {websiteStatus === 'importing' && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              Importing photos...
            </div>
          )}
          {(websiteStatus === 'done' || websiteStatus === 'already') && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">{websiteCount} photos in your Media Library</span>
              <button onClick={navigateToMedia} className="ml-2 text-xs text-gray-500 hover:text-white flex items-center gap-1 transition">
                View Library <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {websiteStatus === 'idle' && (
          <div className="mt-3 flex items-start gap-2 text-xs text-gray-600">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Completed Projects (12), Recent Projects (23), Logo (1) — all from your public website. No login required.</span>
          </div>
        )}
      </div>

      {/* Facebook Import Card */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Facebook className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Import from Facebook</h2>
              <p className="text-xs text-gray-500">Black Phoenix Builds page · Requires page access token</p>
            </div>
          </div>
          {fbStatus === 'done' && (
            <button
              onClick={() => clearImported('Facebook Import')}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          )}
        </div>

        {fbStatus !== 'done' && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Page Access Token</label>
              <input
                type="password"
                value={fbToken}
                onChange={e => setFbToken(e.target.value)}
                placeholder="EAABwzLixnjYBO..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Page ID <span className="text-gray-600">(optional — leave blank to use "me")</span></label>
              <input
                type="text"
                value={fbPageId}
                onChange={e => setFbPageId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              onClick={() => setShowTokenHelp(v => !v)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
            >
              <Key className="w-3.5 h-3.5" />
              How to get my Facebook Page Access Token?
            </button>

            {showTokenHelp && (
              <div className="bg-[#0d1a2a] border border-blue-900/40 rounded-xl p-4 text-xs text-gray-400 space-y-2">
                <p className="text-blue-300 font-semibold text-sm">Step-by-step:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Go to <span className="text-white font-medium">developers.facebook.com</span> and log in.</li>
                  <li>Create an app or open your existing one.</li>
                  <li>Go to <span className="text-white">Tools → Graph API Explorer</span>.</li>
                  <li>Under "User or Page", select <span className="text-white">your Page</span> (Black Phoenix Builds).</li>
                  <li>Click <span className="text-white">Generate Access Token</span> and grant permissions:<br/>
                    <span className="text-blue-300 font-mono">pages_read_engagement, pages_media_access</span>
                  </li>
                  <li>Copy the token and paste it above.</li>
                  <li>For your Page ID: visit your Facebook Page, click "About" → "Page Info" → copy the ID number.</li>
                </ol>
                <p className="text-yellow-600 mt-2">Note: Tokens expire. For a permanent token, use a System User token from Business Manager.</p>
              </div>
            )}
          </div>
        )}

        {fbStatus === 'error' && (
          <div className="mb-4 flex items-start gap-2.5 bg-red-900/20 border border-red-900/40 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-medium">Import failed</p>
              <p className="text-xs text-red-400 mt-0.5">{fbError}</p>
            </div>
          </div>
        )}

        {fbStatus === 'done' ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">{fbPhotoCount} Facebook photos imported</span>
            <button onClick={navigateToMedia} className="ml-2 text-xs text-gray-500 hover:text-white flex items-center gap-1 transition">
              View Library <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleImportFacebook}
              disabled={fbStatus === 'loading' || !fbToken.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
            >
              {fbStatus === 'loading' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting to Facebook...
                </>
              ) : (
                <>
                  <Facebook className="w-4 h-4" />
                  Import Facebook Photos
                </>
              )}
            </button>
            {fbStatus === 'error' && (
              <button
                onClick={() => setFbStatus('idle')}
                className="text-xs text-gray-500 hover:text-white transition"
              >
                Try again
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Photos are pulled directly from the Facebook Graph API. We never store your access token on a server — it stays in your browser only.</span>
        </div>
      </div>

      {/* Go to Library */}
      {(websiteStatus === 'done' || websiteStatus === 'already' || fbStatus === 'done') && (
        <div className="mt-5 text-center">
          <button
            onClick={navigateToMedia}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition"
          >
            <Image className="w-4 h-4" />
            Open Media Library ({mediaCount} photos)
          </button>
        </div>
      )}
    </div>
  );
}
