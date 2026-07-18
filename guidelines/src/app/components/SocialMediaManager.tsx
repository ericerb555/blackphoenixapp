/**
 * Social Media Manager
 * - Manual reel uploader (YouTube, Instagram, TikTok, Facebook)
 * - OAuth connect guide for each platform
 * - Manages reels shown on the Black Phoenix landing page
 */

import { useState, useEffect } from 'react';
import {
  Share2, Plus, Video, Instagram, Facebook, Youtube, Link2,
  Trash2, CheckCircle, XCircle, ChevronRight, ExternalLink,
  Play, Eye, EyeOff, Settings, AlertCircle, Copy, RefreshCw,
  Music2, Globe, Lock, Unlock,
} from 'lucide-react';

const API_BASE = (() => {
  try {
    // dynamically get from the same supabase info the rest of the app uses
    const { projectId } = require('../utils/supabase/info');
    return `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
  } catch {
    return 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-57095a78';
  }
})();

interface Reel {
  id: string;
  title: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'custom';
  url: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  approved: boolean;
  featured: boolean;
  addedBy: string;
  createdAt: string;
}

interface OAuthPlatform {
  id: 'instagram' | 'facebook' | 'youtube' | 'tiktok';
  name: string;
  Icon: any;
  color: string;
  connected: boolean;
  secretsNeeded: { key: string; label: string; url: string }[];
}

const PLATFORMS: OAuthPlatform[] = [
  {
    id: 'instagram', name: 'Instagram', Icon: Instagram, color: 'from-pink-500 to-purple-600', connected: false,
    secretsNeeded: [
      { key: 'INSTAGRAM_APP_ID', label: 'App ID', url: 'https://developers.facebook.com/apps/' },
      { key: 'INSTAGRAM_APP_SECRET', label: 'App Secret', url: 'https://developers.facebook.com/apps/' },
    ],
  },
  {
    id: 'facebook', name: 'Facebook', Icon: Facebook, color: 'from-blue-500 to-blue-700', connected: false,
    secretsNeeded: [
      { key: 'FACEBOOK_APP_ID', label: 'App ID', url: 'https://developers.facebook.com/apps/' },
      { key: 'FACEBOOK_APP_SECRET', label: 'App Secret', url: 'https://developers.facebook.com/apps/' },
    ],
  },
  {
    id: 'youtube', name: 'YouTube', Icon: Youtube, color: 'from-red-500 to-red-700', connected: false,
    secretsNeeded: [
      { key: 'YOUTUBE_CLIENT_ID', label: 'Client ID', url: 'https://console.cloud.google.com/apis/credentials' },
      { key: 'YOUTUBE_CLIENT_SECRET', label: 'Client Secret', url: 'https://console.cloud.google.com/apis/credentials' },
    ],
  },
  {
    id: 'tiktok', name: 'TikTok', Icon: Music2, color: 'from-gray-800 to-black', connected: false,
    secretsNeeded: [
      { key: 'TIKTOK_CLIENT_KEY', label: 'Client Key', url: 'https://developers.tiktok.com/' },
      { key: 'TIKTOK_CLIENT_SECRET', label: 'Client Secret', url: 'https://developers.tiktok.com/' },
    ],
  },
];

function detectPlatform(url: string): Reel['platform'] {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('facebook.com')) return 'facebook';
  return 'custom';
}

function toEmbedUrl(url: string, platform: Reel['platform']): string {
  if (platform === 'youtube') {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

function getThumbnail(url: string, platform: Reel['platform']): string {
  if (platform === 'youtube') {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  return '';
}

export default function SocialMediaManager() {
  const [tab, setTab] = useState<'reels' | 'connect'>('reels');
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [oauthTab, setOauthTab] = useState<OAuthPlatform['id']>('instagram');
  const [copied, setCopied] = useState('');

  const [form, setForm] = useState({ url: '', title: '', description: '', featured: true });
  const [formError, setFormError] = useState('');
  const [preview, setPreview] = useState<{ platform: Reel['platform']; thumbnail: string } | null>(null);

  useEffect(() => { loadReels(); }, []);

  async function loadReels() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/reels`);
      const data = await res.json();
      setReels(data.reels || []);
    } catch {
      setReels([]);
    } finally {
      setLoading(false);
    }
  }

  function handleUrlChange(url: string) {
    setForm(f => ({ ...f, url }));
    setFormError('');
    if (!url) { setPreview(null); return; }
    const platform = detectPlatform(url);
    const thumbnail = getThumbnail(url, platform);
    setPreview({ platform, thumbnail });
  }

  async function handleAddReel() {
    if (!form.url.trim()) { setFormError('Please enter a video URL.'); return; }
    if (!form.title.trim()) { setFormError('Please add a title.'); return; }
    setSaving(true);
    try {
      const platform = detectPlatform(form.url);
      const payload: Partial<Reel> = {
        id: `reel_${Date.now()}`,
        title: form.title,
        description: form.description,
        url: form.url,
        embedUrl: toEmbedUrl(form.url, platform),
        thumbnailUrl: getThumbnail(form.url, platform),
        platform,
        approved: true,
        featured: form.featured,
        addedBy: 'owner',
        createdAt: new Date().toISOString(),
      };
      const res = await fetch(`${API_BASE}/public/reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server error');
      await loadReels();
      setShowAddModal(false);
      setForm({ url: '', title: '', description: '', featured: true });
      setPreview(null);
    } catch {
      setFormError('Could not save reel. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeatured(reel: Reel) {
    try {
      await fetch(`${API_BASE}/public/reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reel, featured: !reel.featured }),
      });
      await loadReels();
    } catch {}
  }

  async function deleteReel(id: string) {
    if (!confirm('Remove this reel?')) return;
    try {
      await fetch(`${API_BASE}/public/reels/${id}`, { method: 'DELETE' });
      await loadReels();
    } catch {}
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  const REDIRECT_URI = 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-57095a78/social/callback';
  const platformMeta = PLATFORMS.find(p => p.id === oauthTab)!;

  const PlatformIcon: Record<string, any> = { instagram: Instagram, facebook: Facebook, youtube: Youtube, tiktok: Music2, custom: Globe };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <button onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 mb-6 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-orange-500 text-gray-300 hover:text-white rounded-lg transition-all text-sm">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-1">
              <Share2 className="w-7 h-7 text-orange-500" /> Social Media Manager
            </h1>
            <p className="text-gray-400 text-sm">Upload reels to your landing page or connect accounts via OAuth.</p>
          </div>
          {tab === 'reels' && (
            <button onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-orange-600 to-orange-700 px-5 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Reel
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl mb-8">
          {[
            { id: 'reels', label: 'Featured Reels', icon: Video },
            { id: 'connect', label: 'Connect Accounts (OAuth)', icon: Link2 },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                tab === id ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-[#252525]'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* REELS TAB */}
        {tab === 'reels' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 animate-spin text-orange-500 mr-3" />
                <span className="text-gray-400">Loading reels…</span>
              </div>
            ) : reels.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-[#2A2A2A] rounded-2xl">
                <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2 font-medium">No reels yet</p>
                <p className="text-gray-600 text-sm mb-6">Paste a YouTube, Instagram, TikTok, or Facebook URL — it shows on your landing page instantly.</p>
                <button onClick={() => setShowAddModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 px-6 py-2.5 rounded-lg font-semibold transition-colors inline-flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Add Your First Reel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {reels.map(reel => {
                  const Icon = PlatformIcon[reel.platform] || Globe;
                  const platformColors: Record<string, string> = {
                    instagram: 'from-pink-500 to-purple-600', tiktok: 'from-gray-700 to-gray-900',
                    youtube: 'from-red-500 to-red-700', facebook: 'from-blue-500 to-blue-700', custom: 'from-gray-600 to-gray-800',
                  };
                  return (
                    <div key={reel.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#3A3A3A] transition-all group">
                      <div className="relative h-36 bg-[#0A0A0A]">
                        {reel.thumbnailUrl ? (
                          <img src={reel.thumbnailUrl} alt={reel.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${platformColors[reel.platform]} opacity-30 flex items-center justify-center`}>
                            <Play className="w-10 h-10 text-white opacity-60" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a href={reel.url} target="_blank" rel="noopener noreferrer"
                            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors">
                            <ExternalLink className="w-4 h-4" /> View
                          </a>
                        </div>
                        <div className={`absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r ${platformColors[reel.platform]} rounded-md flex items-center gap-1`}>
                          <Icon className="w-3 h-3 text-white" />
                          <span className="text-[10px] text-white font-medium capitalize">{reel.platform}</span>
                        </div>
                        {reel.featured && <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500 rounded-md text-xs font-semibold text-white">Featured</div>}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-sm mb-1 truncate">{reel.title}</h3>
                        {reel.description && <p className="text-gray-500 text-xs line-clamp-1 mb-2">{reel.description}</p>}
                        <p className="text-gray-600 text-xs mb-3">{new Date(reel.createdAt).toLocaleDateString()}</p>
                        <div className="flex gap-2">
                          <button onClick={() => toggleFeatured(reel)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                              reel.featured ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#353535] hover:text-white'
                            }`}>
                            {reel.featured ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            {reel.featured ? 'Featured' : 'Hidden'}
                          </button>
                          <button onClick={() => deleteReel(reel.id)}
                            className="p-1.5 bg-[#2A2A2A] hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CONNECT TAB */}
        {tab === 'connect' && (
          <div className="space-y-6">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-orange-300 font-semibold mb-1">OAuth requires API keys in Supabase Secrets</p>
                <p className="text-gray-400">Each platform requires an App ID and Secret from their developer portal. Add them to Supabase Secrets, then the Connect button works automatically.</p>
              </div>
            </div>

            {/* Platform selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setOauthTab(p.id)}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                    oauthTab === p.id ? 'border-orange-500 bg-orange-500/10' : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                  }`}>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                    <p.Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.connected ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {p.connected ? 'Connected' : 'Not connected'}
                  </span>
                </button>
              ))}
            </div>

            {/* Platform detail */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platformMeta.color} flex items-center justify-center`}>
                  <platformMeta.Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{platformMeta.name} OAuth Setup</h3>
                  <p className="text-gray-400 text-sm">Connect your {platformMeta.name} account in 4 steps.</p>
                </div>
              </div>

              <ol className="space-y-5">
                <li className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="font-semibold text-sm mb-1">Create a Developer App</p>
                    <a href={platformMeta.secretsNeeded[0].url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-sm underline">
                      Open {platformMeta.name} Developer Portal <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </li>

                <li className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1">Set the OAuth Redirect URI</p>
                    <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs font-mono text-gray-300">
                      <Globe className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="flex-1 truncate">{REDIRECT_URI}</span>
                      <button onClick={() => copyToClipboard(REDIRECT_URI, 'redirect')} className="text-gray-400 hover:text-orange-400 flex-shrink-0">
                        {copied === 'redirect' ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </li>

                <li className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-2">Add secrets to Supabase</p>
                    <p className="text-gray-400 text-sm mb-3">
                      Go to <a href="https://app.supabase.com/project/plzsvzwwcdopnawtiwzm/settings/functions" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline">Supabase → Edge Functions → Secrets</a> and add:
                    </p>
                    <div className="space-y-2">
                      {platformMeta.secretsNeeded.map(s => (
                        <div key={s.key} className="flex items-center gap-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2">
                          <Lock className="w-3.5 h-3.5 text-gray-500" />
                          <code className="text-orange-300 text-xs font-mono flex-1">{s.key}</code>
                          <button onClick={() => copyToClipboard(s.key, s.key)} className="text-gray-400 hover:text-orange-400">
                            {copied === s.key ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </li>

                <li className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                  <div>
                    <p className="font-semibold text-sm mb-3">Click Connect</p>
                    <button
                      onClick={() => {
                        const u = (window as any).__supabaseUser;
                        if (!u) { alert('Please log in first.'); return; }
                        window.location.href = `${API_BASE}/social/connect/${platformMeta.id}?userId=${u.id}`;
                      }}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r ${platformMeta.color} hover:opacity-90 transition-opacity`}>
                      <Unlock className="w-4 h-4" /> Connect {platformMeta.name}
                    </button>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* ADD REEL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Video className="w-5 h-5 text-orange-500" /> Add a Reel
              </h2>
              <button onClick={() => { setShowAddModal(false); setFormError(''); setPreview(null); setForm({ url: '', title: '', description: '', featured: true }); }}>
                <XCircle className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Video URL <span className="text-orange-500">*</span></label>
                <input type="url" value={form.url} onChange={e => handleUrlChange(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or Instagram / TikTok / Facebook link"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-4 py-3 text-white text-sm outline-none transition-colors placeholder-gray-600" />
                <p className="text-gray-600 text-xs mt-1">Supports YouTube, Instagram Reels, TikTok, Facebook Video.</p>
              </div>

              {preview && (
                <div className="rounded-xl overflow-hidden border border-[#2A2A2A] bg-[#0A0A0A]">
                  {preview.thumbnail ? (
                    <div className="relative">
                      <img src={preview.thumbnail} alt="Preview" className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play className="w-10 h-10 text-white opacity-80" />
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs font-medium capitalize text-gray-200">{preview.platform}</div>
                    </div>
                  ) : (
                    <div className="h-16 flex items-center justify-center gap-3 text-gray-400 text-sm">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="capitalize">{preview.platform} link detected</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Title <span className="text-orange-500">*</span></label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Kitchen Remodel Reveal 🔥"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-4 py-3 text-white text-sm outline-none transition-colors placeholder-gray-600" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Caption (optional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description shown under the reel…" rows={2}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-4 py-3 text-white text-sm outline-none resize-none transition-colors placeholder-gray-600" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
                  className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.featured ? 'bg-orange-600' : 'bg-[#2A2A2A]'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.featured ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-gray-300">Show on landing page (Featured Reels)</span>
              </label>

              {formError && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {formError}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddModal(false); setFormError(''); setPreview(null); }}
                  className="flex-1 py-3 bg-[#2A2A2A] hover:bg-[#353535] rounded-lg font-semibold text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddReel} disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Add Reel</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
