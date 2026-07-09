/**
 * Social Media Hub — Pull content from Facebook/Instagram/TikTok + any custom platform,
 * learn your style, AI-repurpose, and cross-post.
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Facebook, Instagram, Video, RefreshCw, Download, Sparkles,
  ArrowRight, CheckCircle, AlertCircle, ExternalLink, Copy,
  TrendingUp, Heart, MessageCircle, Share2, Play,
  Zap, Brain, Upload, ChevronRight, X, BarChart3, Plus,
  Link, Twitter, Youtube, Linkedin, Globe,
} from 'lucide-react';
import { motion } from 'motion/react';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// ── Types ──────────────────────────────────────────────────────────────────────

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  postedAt: string;
  likes: number;
  comments: number;
  shares: number;
  permalink?: string;
}

interface ConnectedAccount {
  connected: boolean;
  name?: string;
  avatar?: string;
  connectedAt?: string;
  profileUrl?: string;
  isCustom?: boolean;
  platform?: string;
}

interface CustomAccount {
  id: string;
  platform: string;
  label: string;
  profileUrl: string;
  handle: string;
  color: string;
  addedAt: string;
}

type Tab = 'library' | 'create' | 'publish' | 'insights';
type CorePlatform = 'facebook' | 'instagram' | 'tiktok';

const CORE_PLATFORM_CONFIG: Record<CorePlatform, { label: string; color: string; bg: string; border: string; Icon: any }> = {
  facebook:  { label: 'Facebook',  color: '#1877F2', bg: 'rgba(24,119,242,0.1)',  border: 'rgba(24,119,242,0.3)',  Icon: Facebook },
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.1)',  border: 'rgba(225,48,108,0.3)',  Icon: Instagram },
  tiktok:    { label: 'TikTok',    color: '#ff0050', bg: 'rgba(255,0,80,0.1)',    border: 'rgba(255,0,80,0.3)',    Icon: Video },
};

const PLATFORM_PRESETS = [
  { id: 'youtube',   label: 'YouTube',         color: '#FF0000', Icon: Youtube },
  { id: 'twitter',   label: 'X (Twitter)',      color: '#000000', Icon: Twitter },
  { id: 'linkedin',  label: 'LinkedIn',         color: '#0A66C2', Icon: Linkedin },
  { id: 'pinterest', label: 'Pinterest',        color: '#E60023', Icon: Globe },
  { id: 'snapchat',  label: 'Snapchat',         color: '#FFFC00', Icon: Globe },
  { id: 'threads',   label: 'Threads',          color: '#000000', Icon: Globe },
  { id: 'nextdoor',  label: 'Nextdoor',         color: '#00B246', Icon: Globe },
  { id: 'yelp',      label: 'Yelp',             color: '#D32323', Icon: Globe },
  { id: 'google',    label: 'Google Business',  color: '#4285F4', Icon: Globe },
  { id: 'houzz',     label: 'Houzz',            color: '#7CC04B', Icon: Globe },
  { id: 'thumbtack', label: 'Thumbtack',        color: '#009FD9', Icon: Globe },
  { id: 'other',     label: 'Other / Custom',   color: '#6b7280', Icon: Globe },
];

const STORAGE_KEY = 'bp_custom_social_accounts';

function loadCustomAccounts(): CustomAccount[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveCustomAccounts(accounts: CustomAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || publicAnonKey;
}

// ── Add Account Modal ──────────────────────────────────────────────────────────

function AddAccountModal({ onClose, onAdd }: { onClose: () => void; onAdd: (acct: CustomAccount) => void }) {
  const [step, setStep] = useState<'pick' | 'details'>('pick');
  const [selected, setSelected] = useState<typeof PLATFORM_PRESETS[0] | null>(null);
  const [handle, setHandle] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  function handleAdd() {
    if (!selected) return;
    if (!handle.trim()) { toast.error('Enter your handle or page name'); return; }
    const acct: CustomAccount = {
      id: `custom_${Date.now()}`,
      platform: selected.id,
      label: selected.id === 'other' ? (customLabel || 'Custom Account') : selected.label,
      profileUrl: profileUrl.trim(),
      handle: handle.trim(),
      color: selected.color,
      addedAt: new Date().toISOString(),
    };
    onAdd(acct);
    toast.success(`${acct.label} added to your Social Hub`);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#111] border border-[#2A2A2A] rounded-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-pink-600 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Add Social Account</h3>
              <p className="text-xs text-gray-500">{step === 'pick' ? 'Choose your platform' : `Setting up ${selected?.label}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2A2A2A] rounded-xl transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {step === 'pick' && (
          <div className="p-5">
            <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest font-semibold">Select a platform</p>
            <div className="grid grid-cols-3 gap-2.5 max-h-80 overflow-y-auto">
              {PLATFORM_PRESETS.map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setStep('details'); }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#2A2A2A] hover:border-[#3A3A3A] bg-[#1A1A1A] hover:bg-[#222] transition group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}>
                    <p.Icon className="w-5 h-5" style={{ color: p.color }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-300 text-center leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'details' && selected && (
          <div className="p-5 space-y-4">
            <button onClick={() => setStep('pick')} className="text-xs text-gray-500 hover:text-white transition flex items-center gap-1">
              ← Back
            </button>

            <div className="flex items-center gap-3 p-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${selected.color}20`, border: `1px solid ${selected.color}40` }}>
                <selected.Icon className="w-5 h-5" style={{ color: selected.color }} />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{selected.label}</p>
                <p className="text-xs text-gray-500">Enter your account details below</p>
              </div>
            </div>

            {selected.id === 'other' && (
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">Platform Name</label>
                <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                  placeholder="e.g. Angi, HomeAdvisor, Alignable…"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-400 mb-1.5 block">Handle / Page Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                <input value={handle} onChange={e => setHandle(e.target.value)}
                  placeholder="BlackPhoenixCompany"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 mb-1.5 block">Profile URL <span className="text-gray-600 font-normal">(optional)</span></label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={profileUrl} onChange={e => setProfileUrl(e.target.value)}
                  placeholder="https://youtube.com/@BlackPhoenix"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>

            <button onClick={handleAdd}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition"
              style={{ background: `linear-gradient(135deg, ${selected.color}cc, ${selected.color})` }}>
              Add {selected.id === 'other' ? (customLabel || 'Account') : selected.label}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function SocialMediaHub() {
  const [tab, setTab] = useState<Tab>('library');
  const [accounts, setAccounts] = useState<Record<CorePlatform, ConnectedAccount>>({
    facebook:  { connected: false },
    instagram: { connected: false },
    tiktok:    { connected: false },
  });
  const [customAccounts, setCustomAccounts] = useState<CustomAccount[]>(loadCustomAccounts);
  const [showAddModal, setShowAddModal] = useState(false);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchingPlatform, setFetchingPlatform] = useState<string | null>(null);
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [repurposedContent, setRepurposedContent] = useState<Record<CorePlatform, string>>({ facebook: '', instagram: '', tiktok: '' });
  const [publishTargets, setPublishTargets] = useState<Record<CorePlatform, boolean>>({ facebook: false, instagram: false, tiktok: false });
  const [isPublishing, setIsPublishing] = useState(false);
  const [composeContent, setComposeContent] = useState('');
  const [styleProfile, setStyleProfile] = useState<{ tone: string; avgLength: number; topTopics: string[]; bestTime: string } | null>(null);
  const [filter, setFilter] = useState<'all' | string>('all');

  function addCustomAccount(acct: CustomAccount) {
    const updated = [acct, ...customAccounts];
    setCustomAccounts(updated);
    saveCustomAccounts(updated);
  }

  function removeCustomAccount(id: string) {
    const updated = customAccounts.filter(a => a.id !== id);
    setCustomAccounts(updated);
    saveCustomAccounts(updated);
    toast.info('Account removed');
  }

  // Load connected accounts
  const loadAccounts = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${SERVER}/social/accounts`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAccounts(prev => ({ ...prev, ...data.accounts }));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === 'social_connected') {
        toast.success(`${e.data.platform} connected!`);
        await loadAccounts();
        fetchPosts(e.data.platform as CorePlatform);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadAccounts]);

  async function connectPlatform(platform: CorePlatform) {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${SERVER}/social/connect/${platform}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.authUrl) {
        window.open(data.authUrl, 'social_oauth', 'width=600,height=700,left=300,top=100');
      } else {
        toast.error(data.error || 'Could not start connection');
      }
    } catch (e: any) {
      toast.error('Connection failed: ' + e.message);
    }
  }

  async function disconnectPlatform(platform: CorePlatform) {
    try {
      const token = await getAuthToken();
      await fetch(`${SERVER}/social/disconnect/${platform}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setAccounts(prev => ({ ...prev, [platform]: { connected: false } }));
      setPosts(prev => prev.filter(p => p.platform !== platform));
      toast.info(`${CORE_PLATFORM_CONFIG[platform].label} disconnected`);
    } catch { toast.error('Disconnect failed'); }
  }

  async function fetchPosts(platform?: CorePlatform) {
    setIsFetching(true);
    const platforms: CorePlatform[] = platform ? [platform] : (Object.keys(accounts) as CorePlatform[]).filter(p => accounts[p].connected);

    for (const p of platforms) {
      setFetchingPlatform(p);
      try {
        const token = await getAuthToken();
        const res = await fetch(`${SERVER}/social/fetch/${p}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.posts?.length) {
          setPosts(prev => {
            const existingIds = new Set(prev.map(x => x.id));
            const newPosts = data.posts.filter((x: SocialPost) => !existingIds.has(x.id));
            const merged = [...newPosts, ...prev];
            analyzeStyle(merged);
            return merged;
          });
          toast.success(`Imported ${data.posts.length} posts from ${CORE_PLATFORM_CONFIG[p].label}`);
        } else {
          toast.info(`No new posts found on ${CORE_PLATFORM_CONFIG[p].label}`);
        }
      } catch { toast.error(`Failed to fetch from ${CORE_PLATFORM_CONFIG[p].label}`); }
    }
    setFetchingPlatform(null);
    setIsFetching(false);
  }

  function analyzeStyle(allPosts: SocialPost[]) {
    if (allPosts.length === 0) return;
    const avgLength = Math.round(allPosts.reduce((s, p) => s + (p.content?.length || 0), 0) / allPosts.length);
    const words = allPosts.flatMap(p => (p.content || '').toLowerCase().split(/\s+/));
    const freq: Record<string, number> = {};
    words.forEach(w => { if (w.length > 4) freq[w] = (freq[w] || 0) + 1; });
    const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
    const tone = avgLength < 100 ? 'Short & punchy' : avgLength < 250 ? 'Conversational' : 'Detailed storytelling';
    setStyleProfile({ tone, avgLength, topTopics: topWords, bestTime: 'Tue–Thu 7–9 PM' });
  }

  async function importToLibrary(post: SocialPost) {
    try {
      const token = await getAuthToken();
      await fetch(`${SERVER}/social/import-to-library`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ post }),
      });
      toast.success('Saved to Content Library');
    } catch { toast.error('Import failed'); }
  }

  async function repurposePost(post: SocialPost) {
    setIsRepurposing(true);
    setSelectedPost(post);
    setRepurposedContent({ facebook: '', instagram: '', tiktok: '' });
    const targets: CorePlatform[] = (['facebook', 'instagram', 'tiktok'] as CorePlatform[]).filter(p => p !== post.platform);
    for (const target of targets) {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${SERVER}/social/ai-repurpose`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalContent: post.content, sourcePlatform: post.platform, targetPlatform: target }),
        });
        const data = await res.json();
        setRepurposedContent(prev => ({ ...prev, [target]: data.caption || post.content }));
      } catch { /* silent */ }
    }
    setIsRepurposing(false);
    setTab('create');
  }

  async function publishContent() {
    const targets = (Object.keys(publishTargets) as CorePlatform[]).filter(p => publishTargets[p]);
    if (!targets.length) { toast.error('Select at least one platform to publish to'); return; }
    if (!composeContent.trim()) { toast.error('Add your caption first'); return; }
    setIsPublishing(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${SERVER}/social/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: composeContent, platforms: targets }),
      });
      const data = await res.json();
      const successes = targets.filter(p => data.results?.[p]?.success);
      const failures = targets.filter(p => data.results?.[p]?.error);
      if (successes.length) toast.success(`Published to ${successes.map(p => CORE_PLATFORM_CONFIG[p].label).join(', ')}!`);
      if (failures.length) toast.error(`Failed on ${failures.map(p => CORE_PLATFORM_CONFIG[p].label).join(', ')}`);
      if (successes.length) { setComposeContent(''); setPublishTargets({ facebook: false, instagram: false, tiktok: false }); }
    } catch (e: any) { toast.error('Publish failed: ' + e.message); }
    setIsPublishing(false);
  }

  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.platform === filter);
  const connectedCount = Object.values(accounts).filter(a => a.connected).length;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'library', label: '📚 Content Library' },
    { id: 'create', label: '✨ AI Create & Repurpose' },
    { id: 'publish', label: '🚀 Publish' },
    { id: 'insights', label: '📊 Style Insights' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Social Media Hub</h1>
            <p className="text-gray-400 text-sm">Pull your content, learn your style, create more — automatically</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connectedCount > 0 && (
            <button onClick={() => fetchPosts()} disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-blue-500/40 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-blue-400' : ''}`} />
              {isFetching ? `Fetching ${fetchingPlatform || ''}…` : 'Sync All'}
            </button>
          )}
        </div>
      </div>

      {/* Platform Connection Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Connected Platforms</p>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 transition">
            <Plus className="w-3.5 h-3.5" /> Add Account
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Core OAuth platforms */}
          {(Object.keys(CORE_PLATFORM_CONFIG) as CorePlatform[]).map(platform => {
            const cfg = CORE_PLATFORM_CONFIG[platform];
            const acct = accounts[platform];
            return (
              <div key={platform} className="rounded-2xl p-5 transition"
                style={{ background: acct.connected ? cfg.bg : '#1A1A1A', border: `1px solid ${acct.connected ? cfg.border : '#2A2A2A'}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <cfg.Icon className="w-6 h-6" style={{ color: acct.connected ? cfg.color : '#6b7280' }} />
                    <div>
                      <p className="font-bold text-white text-sm">{cfg.label}</p>
                      {acct.connected && acct.name && <p className="text-xs text-gray-400">{acct.name}</p>}
                    </div>
                  </div>
                  {acct.connected
                    ? <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Live
                      </span>
                    : <span className="text-[10px] font-bold text-gray-500 bg-[#2A2A2A] px-2 py-0.5 rounded-full">Not connected</span>
                  }
                </div>
                <div className="flex gap-2">
                  {acct.connected ? (
                    <>
                      <button onClick={() => fetchPosts(platform)} disabled={isFetching}
                        className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-1 disabled:opacity-50"
                        style={{ background: cfg.color }}>
                        <Download className="w-3.5 h-3.5" /> Import Posts
                      </button>
                      <button onClick={() => disconnectPlatform(platform)}
                        className="px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 bg-[#2A2A2A] hover:bg-red-500/10 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => connectPlatform(platform)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition"
                      style={{ background: `linear-gradient(135deg, ${cfg.color}aa, ${cfg.color})` }}>
                      Connect {cfg.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Custom / manually-linked accounts */}
          {customAccounts.map(acct => {
            const preset = PLATFORM_PRESETS.find(p => p.id === acct.platform);
            const Icon = preset?.Icon || Globe;
            return (
              <div key={acct.id} className="rounded-2xl p-5 transition"
                style={{ background: `${acct.color}10`, border: `1px solid ${acct.color}30` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6" style={{ color: acct.color }} />
                    <div>
                      <p className="font-bold text-white text-sm">{acct.label}</p>
                      <p className="text-xs text-gray-400">@{acct.handle}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
                    Linked
                  </span>
                </div>
                <div className="flex gap-2">
                  {acct.profileUrl ? (
                    <a href={acct.profileUrl} target="_blank" rel="noreferrer"
                      className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-1"
                      style={{ background: acct.color }}>
                      <ExternalLink className="w-3.5 h-3.5" /> Open Profile
                    </a>
                  ) : (
                    <div className="flex-1 py-2 rounded-lg text-xs font-bold text-gray-500 text-center"
                      style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                      @{acct.handle}
                    </div>
                  )}
                  <button onClick={() => removeCustomAccount(acct.id)}
                    className="px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 bg-[#2A2A2A] hover:bg-red-500/10 transition">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Account CTA card */}
          <button onClick={() => setShowAddModal(true)}
            className="rounded-2xl p-5 border border-dashed border-[#2A2A2A] hover:border-blue-500/40 bg-transparent hover:bg-blue-500/5 transition flex flex-col items-center justify-center gap-2 group min-h-[120px]">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] group-hover:bg-blue-600/20 border border-[#2A2A2A] group-hover:border-blue-500/40 flex items-center justify-center transition">
              <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition" />
            </div>
            <span className="text-xs font-bold text-gray-600 group-hover:text-gray-400 transition">Add Platform</span>
          </button>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <AddAccountModal onClose={() => setShowAddModal(false)} onAdd={addCustomAccount} />
      )}

      {/* No connections state */}
      {connectedCount === 0 && customAccounts.length === 0 && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-10 text-center">
          <Brain className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-white font-bold mb-1">Connect your social accounts above</p>
          <p className="text-gray-500 text-sm">Once connected, the AI will pull your posts, learn your content style, and help you create more like your best-performing content.</p>
        </div>
      )}

      {(connectedCount > 0 || customAccounts.length > 0) && (
        <>
          {/* Tab bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-bold transition flex-shrink-0 ${
                  tab === t.id
                    ? 'bg-gradient-to-r from-blue-600 to-pink-600 text-white shadow-md'
                    : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── LIBRARY TAB ─────────────────────────────────────────────────────── */}
          {tab === 'library' && (
            <div className="space-y-4">
              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {(['all', 'facebook', 'instagram', 'tiktok'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition ${
                      filter === f ? 'bg-white text-black' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
                    }`}>
                    {f === 'all' ? `All (${posts.length})` : `${CORE_PLATFORM_CONFIG[f as CorePlatform].label} (${posts.filter(p => p.platform === f).length})`}
                  </button>
                ))}
              </div>

              {filteredPosts.length === 0 ? (
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
                  <Download className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">No posts imported yet — click <strong className="text-gray-300">Import Posts</strong> on any connected account</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPosts.map(post => {
                    const cfg = CORE_PLATFORM_CONFIG[post.platform as CorePlatform] ?? { color: '#6b7280', label: post.platform, bg: '#1A1A1A', border: '#2A2A2A', Icon: Globe };
                    return (
                      <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-2xl overflow-hidden group transition">
                        {/* Media */}
                        {post.imageUrl && (
                          <div className="relative h-44 overflow-hidden">
                            <img src={post.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                              style={{ background: cfg.color }}>
                              {cfg.label}
                            </div>
                            {post.videoUrl && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                  <Play className="w-6 h-6 text-white" fill="white" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {!post.imageUrl && (
                          <div className="h-12 flex items-center px-4 gap-2" style={{ background: cfg.bg }}>
                            <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
                            <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                          </div>
                        )}

                        {/* Content */}
                        <div className="p-4 space-y-3">
                          <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{post.content || '(No caption)'}</p>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-400" /> {post.likes}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-blue-400" /> {post.comments}</span>
                            <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-green-400" /> {post.shares}</span>
                            <span className="ml-auto">{new Date(post.postedAt).toLocaleDateString()}</span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => repurposePost(post)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 transition">
                              <Sparkles className="w-3.5 h-3.5" /> AI Repurpose
                            </button>
                            <button onClick={() => importToLibrary(post)}
                              className="px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white bg-[#2A2A2A] hover:bg-[#3A3A3A] transition" title="Save to Content Library">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {post.permalink && (
                              <a href={post.permalink} target="_blank" rel="noreferrer"
                                className="px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white bg-[#2A2A2A] hover:bg-[#3A3A3A] transition">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CREATE & REPURPOSE TAB ────────────────────────────────────────── */}
          {tab === 'create' && (
            <div className="space-y-5 max-w-3xl">
              {selectedPost ? (
                <div className="space-y-4">
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Original Post</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedPost.content}</p>
                    <div className="flex gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> {selectedPost.likes}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" /> {selectedPost.comments}</span>
                    </div>
                  </div>

                  {isRepurposing && (
                    <div className="flex items-center gap-3 px-5 py-4 bg-[#1A1A1A] border border-blue-500/30 rounded-2xl">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />
                      <p className="text-sm text-blue-300">AI is learning your style and repurposing for each platform…</p>
                    </div>
                  )}

                  {(Object.keys(CORE_PLATFORM_CONFIG) as CorePlatform[]).filter(p => p !== selectedPost.platform).map(target => {
                    const cfg = CORE_PLATFORM_CONFIG[target];
                    const text = repurposedContent[target];
                    return (
                      <div key={target} className="rounded-2xl p-5 space-y-3"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
                            <span className="font-bold text-white text-sm">{cfg.label} Version</span>
                          </div>
                          {text && (
                            <button onClick={() => { navigator.clipboard.writeText(text); toast.success('Copied!'); }}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                              <Copy className="w-3.5 h-3.5" /> Copy
                            </button>
                          )}
                        </div>
                        {text ? (
                          <>
                            <textarea value={text} onChange={e => setRepurposedContent(prev => ({ ...prev, [target]: e.target.value }))}
                              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-sm text-gray-300 leading-relaxed resize-none focus:outline-none focus:border-blue-500/50"
                              rows={4} />
                            <button onClick={() => { setComposeContent(text); setPublishTargets(prev => ({ ...prev, [target]: true })); setTab('publish'); }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition"
                              style={{ background: cfg.color }}>
                              Use for Publishing <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="h-20 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button onClick={() => setSelectedPost(null)}
                    className="text-sm text-gray-500 hover:text-white transition">← Back to library</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-400" /> Write New Content with AI
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">The AI has studied your imported posts and knows your tone, topics, and style.</p>
                    <textarea value={composeContent} onChange={e => setComposeContent(e.target.value)}
                      placeholder="Start writing or paste a topic (e.g. 'New kitchen renovation project in Boston')…"
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500/50"
                      rows={5} />
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => setTab('publish')} disabled={!composeContent.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-40">
                        <Upload className="w-4 h-4" /> Publish This
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 text-center">Or go to the <button onClick={() => setTab('library')} className="text-blue-400 hover:underline">Content Library</button> and click <strong className="text-white">AI Repurpose</strong> on any post</p>
                </div>
              )}
            </div>
          )}

          {/* ── PUBLISH TAB ──────────────────────────────────────────────────── */}
          {tab === 'publish' && (
            <div className="space-y-5 max-w-2xl">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green-400" /> Publish to Your Pages
                </h3>

                <textarea value={composeContent} onChange={e => setComposeContent(e.target.value)}
                  placeholder="Your caption / post content…"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-green-500/50"
                  rows={5} />

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Publish to:</p>
                  {(Object.keys(CORE_PLATFORM_CONFIG) as CorePlatform[]).map(platform => {
                    const cfg = CORE_PLATFORM_CONFIG[platform];
                    const acct = accounts[platform];
                    return (
                      <button key={platform} disabled={!acct.connected}
                        onClick={() => setPublishTargets(prev => ({ ...prev, [platform]: !prev[platform] }))}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition ${
                          !acct.connected ? 'opacity-40 cursor-not-allowed border-[#2A2A2A] bg-[#0A0A0A]' :
                          publishTargets[platform] ? 'border-green-500/50 bg-green-500/5' : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                        }`}>
                        <div className="flex items-center gap-3">
                          <cfg.Icon className="w-5 h-5" style={{ color: acct.connected ? cfg.color : '#6b7280' }} />
                          <div className="text-left">
                            <p className="text-sm font-semibold text-white">{cfg.label}</p>
                            <p className="text-xs text-gray-500">{acct.connected ? (acct.name || 'Connected') : 'Not connected'}</p>
                          </div>
                        </div>
                        {publishTargets[platform] && <CheckCircle className="w-5 h-5 text-green-400" />}
                        {!publishTargets[platform] && acct.connected && <div className="w-5 h-5 rounded-full border-2 border-[#3A3A3A]" />}
                        {!acct.connected && <AlertCircle className="w-4 h-4 text-gray-600" />}
                      </button>
                    );
                  })}
                </div>

                <button onClick={publishContent} disabled={isPublishing || !composeContent.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {isPublishing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Publishing…</> : <><Zap className="w-4 h-4" /> Publish Now</>}
                </button>
              </div>
            </div>
          )}

          {/* ── INSIGHTS TAB ─────────────────────────────────────────────────── */}
          {tab === 'insights' && (
            <div className="space-y-5 max-w-2xl">
              {styleProfile ? (
                <>
                  <div className="bg-gradient-to-br from-blue-600/10 to-pink-600/10 border border-blue-500/30 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-400" /> Your Content Style Profile
                    </h3>
                    <p className="text-xs text-gray-400">Learned from {posts.length} imported posts across {connectedCount} platform{connectedCount > 1 ? 's' : ''}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Tone', value: styleProfile.tone },
                        { label: 'Avg Post Length', value: `${styleProfile.avgLength} chars` },
                        { label: 'Best Posting Time', value: styleProfile.bestTime },
                        { label: 'Total Posts Analyzed', value: posts.length.toString() },
                      ].map(s => (
                        <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                          <p className="text-base font-black text-white">{s.value}</p>
                        </div>
                      ))}
                    </div>
                    {styleProfile.topTopics.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Top Keywords in Your Content</p>
                        <div className="flex flex-wrap gap-2">
                          {styleProfile.topTopics.map(w => (
                            <span key={w} className="px-3 py-1 rounded-full text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 capitalize">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-400" /> Top Performing Posts
                    </h3>
                    <div className="space-y-3">
                      {[...posts].sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)).slice(0, 3).map(post => {
                        const cfg = CORE_PLATFORM_CONFIG[post.platform as CorePlatform] ?? { color: '#6b7280', label: post.platform };
                        return (
                          <div key={post.id} className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-xl">
                            {post.imageUrl && <img src={post.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white line-clamp-1 font-medium">{post.content || '(No caption)'}</p>
                              <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-0.5" style={{ color: cfg.color }}>{cfg.label}</span>
                                <span>❤️ {post.likes}</span>
                                <span>💬 {post.comments}</span>
                                <span>🔁 {post.shares}</span>
                              </div>
                            </div>
                            <button onClick={() => repurposePost(post)}
                              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-pink-600">
                              Repurpose
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
                  <BarChart3 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">Import posts first — the AI will analyze your style and show insights here</p>
                  <button onClick={() => fetchPosts()} className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition">
                    Import Posts Now
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
