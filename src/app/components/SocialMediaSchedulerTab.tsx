import { useState, useEffect } from 'react';
import {
  Plus, Clock, Edit, Trash2, CheckCircle2, Calendar, Send, X,
  Facebook, Instagram, Linkedin, Twitter, FileText, Layers,
  Image as ImageIcon, Video, Library, Zap, Eye,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { consumeContentProduct, consumeSchedulerDraft, consumeSchedulerDraftQueue } from '../lib/contentHandoff';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** Auth header carrying the signed-in owner's token (falls back to anon). */
async function authHeaders(json = false): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

/** Platforms the backend can publish to (given the owner connects them). */
const PUBLISHABLE = new Set(['facebook', 'instagram', 'linkedin', 'twitter']);

interface AccountState {
  connected: boolean;
  name?: string | null;
  followers?: number | null;
}

interface SocialPost {
  id: string;
  content: string;
  media_urls: string[];
  media_type: 'image' | 'video' | 'carousel' | 'text';
  platforms: ('facebook' | 'instagram' | 'linkedin' | 'twitter')[];
  scheduled_date: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  created_at: string;
}

interface LibraryItem {
  id: string;
  title: string;
  content: string;
  content_format: string;
  platform?: string;
  created_at: string;
  tags?: string[];
}

// Load scheduled posts from localStorage
function loadScheduledPosts(): SocialPost[] {
  try {
    const saved = localStorage.getItem('social_scheduled_posts');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveScheduledPosts(posts: SocialPost[]) {
  localStorage.setItem('social_scheduled_posts', JSON.stringify(posts));
}

// Load content library items
function loadLibraryItems(): LibraryItem[] {
  const items: LibraryItem[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.includes('content-center-pieces') && key !== 'content_library_pieces') continue;
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            items.push(item);
          }
        });
      }
    } catch {}
  }
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function SocialMediaSchedulerTab() {
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>(loadScheduledPosts);
  const [showCreateSocialPost, setShowCreateSocialPost] = useState(false);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [newSocialPost, setNewSocialPost] = useState({
    content: '',
    platforms: [] as ('facebook' | 'instagram' | 'linkedin' | 'twitter')[],
    scheduled_date: '',
    media_type: 'text' as 'image' | 'video' | 'carousel' | 'text',
    media_url: '',
  });
  const [accounts, setAccounts] = useState<Record<string, AccountState>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [autoPublish, setAutoPublish] = useState<boolean>(() => localStorage.getItem('social_auto_publish') === '1');

  // Pull the REAL connection status for each platform from the server.
  async function loadAccounts() {
    try {
      const res = await fetch(`${API}/social/accounts`, { headers: await authHeaders() });
      const data = await res.json();
      if (data?.accounts) setAccounts(data.accounts);
    } catch (err) {
      console.error('Failed to load social accounts:', err);
    }
  }

  useEffect(() => {
    setLibraryItems(loadLibraryItems());
  }, [showLibraryPicker]);

  useEffect(() => {
    loadAccounts();
  }, []);

  // A product was routed here from the Content Center product picker — open the
  // composer prefilled with a ready-to-edit caption for that product.
  useEffect(() => {
    const p = consumeContentProduct('social-scheduler');
    if (!p) return;
    const priceLine = p.price > 0 ? ` — $${p.price.toFixed(2)}` : '';
    const caption = `${p.name}${priceLine}\n\n${(p.description || '').slice(0, 180)}\n\nShop now 👉 theblackphoenixcompany.com`;
    setNewSocialPost(prev => ({
      ...prev,
      content: caption,
      media_type: p.image ? 'image' : 'text',
      media_url: p.image || '',
    }));
    setShowCreateSocialPost(true);
    toast.success(`"${p.name}" loaded into a new post`);
  }, []);

  // Text drafts routed here from Content Studio (a single repurposed post / a
  // planned calendar item, OR a whole pack queued at once). A single draft opens
  // the composer prefilled; a queued batch lands each as its own draft post.
  useEffect(() => {
    function loadDrafts() {
      // Whole-pack queue first: create a draft SocialPost per item.
      const queue = consumeSchedulerDraftQueue();
      if (queue.length) {
        const now = Date.now();
        const drafts: SocialPost[] = queue.map((d, i) => ({
          id: `post-${now}-${i}`,
          content: d.content,
          media_urls: d.media_url ? [d.media_url] : [],
          media_type: d.media_url ? 'image' : 'text',
          platforms: (d.platforms || []).filter((p) => PUBLISHABLE.has(p)) as SocialPost['platforms'],
          scheduled_date: d.scheduled_date || '',
          status: 'draft',
          created_at: new Date().toISOString(),
        }));
        setSocialPosts((prev) => {
          const next = [...prev, ...drafts];
          saveScheduledPosts(next);
          return next;
        });
        toast.success(`${drafts.length} posts added as drafts from ${queue[0].source || 'Content Studio'}`);
      }

      // Single draft opens the composer prefilled.
      const d = consumeSchedulerDraft();
      if (d) {
        const platforms = (d.platforms || []).filter((p) => PUBLISHABLE.has(p)) as ('facebook' | 'instagram' | 'linkedin' | 'twitter')[];
        setNewSocialPost((prev) => ({
          ...prev,
          content: d.content || prev.content,
          platforms: platforms.length ? platforms : prev.platforms,
          scheduled_date: d.scheduled_date || prev.scheduled_date,
          media_type: d.media_url ? 'image' : prev.media_type,
          media_url: d.media_url || prev.media_url,
        }));
        setShowCreateSocialPost(true);
        toast.success(d.source ? `Loaded from ${d.source}` : 'Draft loaded into a new post');
      }
    }
    loadDrafts();
    const handler = () => loadDrafts();
    window.addEventListener('content:open', handler as EventListener);
    return () => window.removeEventListener('content:open', handler as EventListener);
  }, []);

  function updatePosts(posts: SocialPost[]) {
    setSocialPosts(posts);
    saveScheduledPosts(posts);
  }

  function pickFromLibrary(item: LibraryItem) {
    setNewSocialPost(prev => ({ ...prev, content: item.content || item.title }));
    setShowLibraryPicker(false);
    setShowCreateSocialPost(true);
    toast.success(`"${item.title}" loaded into post editor`);
  }

  // Kick off the real OAuth flow in a popup; refresh accounts when it succeeds.
  async function connectPlatform(platform: string) {
    if (!PUBLISHABLE.has(platform)) {
      toast.error(`${platform} publishing isn't supported yet.`);
      return;
    }
    setConnecting(platform);
    try {
      const res = await fetch(`${API}/social/connect/${platform}`, {
        method: 'POST',
        headers: await authHeaders(true),
      });
      const data = await res.json();
      if (!res.ok || !data.authUrl) {
        throw new Error(data.error || `Couldn't start ${platform} connection`);
      }
      const popup = window.open(data.authUrl, 'social_oauth', 'width=600,height=720');
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'social_connected') {
          window.removeEventListener('message', onMessage);
          popup?.close();
          setConnecting(null);
          toast.success(`${e.data.platform} connected!`);
          loadAccounts();
        } else if (e.data?.type === 'social_error') {
          window.removeEventListener('message', onMessage);
          popup?.close();
          setConnecting(null);
          toast.error(e.data.message || `${platform} connection failed`);
        }
      };
      window.addEventListener('message', onMessage);
    } catch (err: any) {
      console.error(`Social connect error for ${platform}:`, err);
      toast.error(err.message || `Couldn't connect ${platform}`);
      setConnecting(null);
    }
  }

  // Publish a post for real through the backend Graph/LinkedIn/X APIs. Returns
  // true if at least one platform succeeded. `silent` suppresses the "nothing
  // connected" error toast (used by the auto-publish tick).
  async function publishNow(post: SocialPost, silent = false): Promise<boolean> {
    const targets = post.platforms.filter(p => PUBLISHABLE.has(p) && accounts[p]?.connected);
    const skipped = post.platforms.filter(p => !targets.includes(p));

    if (targets.length === 0) {
      if (!silent) {
        toast.error(
          `Connect ${post.platforms.join(' / ') || 'a supported account'} before publishing.`,
          { duration: 8000 },
        );
      }
      return false;
    }

    setPublishingId(post.id);
    try {
      const res = await fetch(`${API}/social/publish`, {
        method: 'POST',
        headers: await authHeaders(true),
        body: JSON.stringify({
          content: post.content,
          imageUrl: post.media_type === 'image' ? post.media_urls?.[0] : undefined,
          videoUrl: post.media_type === 'video' ? post.media_urls?.[0] : undefined,
          platforms: targets,
        }),
      });

      if (res.status === 401) {
        if (!silent) toast.error('Sign in as the store owner to publish to your connected accounts.');
        return false;
      }
      if (res.status === 404) {
        if (!silent) toast.error('The publish endpoint isn\'t live yet — click Publish to deploy the backend, then retry.');
        return false;
      }

      const data = await res.json();
      const results: Record<string, any> = data?.results || {};
      const ok = targets.filter(p => results[p]?.success);
      const failed = targets.filter(p => results[p] && !results[p].success);

      const updated = socialPosts.map(p =>
        p.id === post.id
          ? { ...p, status: (ok.length > 0 ? 'published' : 'failed') as SocialPost['status'] }
          : p
      );
      updatePosts(updated);

      if (ok.length) {
        toast.success(`✅ Published to ${ok.join(', ')}${skipped.length ? ` (skipped ${skipped.join(', ')})` : ''}`);
      }
      if (failed.length) {
        const firstErr = results[failed[0]]?.error || 'unknown error';
        toast.error(`Failed on ${failed.join(', ')}: ${firstErr}`, { duration: 9000 });
      }
      return ok.length > 0;
    } catch (err: any) {
      console.error('Publish error:', err);
      if (!silent) toast.error(`Couldn't reach the publish endpoint: ${err.message}`);
      updatePosts(socialPosts.map(p => p.id === post.id ? { ...p, status: 'failed' as SocialPost['status'] } : p));
      return false;
    } finally {
      setPublishingId(null);
    }
  }

  // Auto-publish: while enabled and this tab is open, fire any scheduled post
  // whose time has arrived. Runs on a 60s tick.
  useEffect(() => {
    localStorage.setItem('social_auto_publish', autoPublish ? '1' : '0');
    if (!autoPublish) return;

    let running = false;
    const sweep = async () => {
      if (running) return;
      running = true;
      try {
        const now = Date.now();
        const due = loadScheduledPosts().filter(
          p => p.status === 'scheduled' && new Date(p.scheduled_date).getTime() <= now,
        );
        for (const post of due) {
          // Only auto-fire posts that have a connected, supported target.
          if (post.platforms.some(pl => PUBLISHABLE.has(pl) && accounts[pl]?.connected)) {
            await publishNow(post, true);
          }
        }
      } finally {
        running = false;
      }
    };
    sweep();
    const id = setInterval(sweep, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPublish, accounts, socialPosts]);

  function deletePost(id: string) {
    const updated = socialPosts.filter(p => p.id !== id);
    updatePosts(updated);
    toast.success('Post deleted');
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Social Media Scheduler</h2>
          <p className="text-gray-400">Schedule and manage posts across all your social media platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoPublish(v => !v)}
            title="When on, scheduled posts auto-publish at their time while this tab is open"
            className={`px-4 py-2 rounded-lg transition-all font-medium flex items-center gap-2 border ${
              autoPublish
                ? 'bg-green-600/20 border-green-500/40 text-green-400'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" /> Auto-publish {autoPublish ? 'On' : 'Off'}
          </button>
          <button onClick={() => setShowLibraryPicker(true)}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-orange-500/40 text-gray-300 hover:text-white rounded-lg transition-all font-medium flex items-center gap-2">
            <Library className="w-4 h-4" /> From Library
          </button>
          <button onClick={() => setShowCreateSocialPost(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-lg hover:from-[#c2410c] hover:to-[#9a3412] transition-all font-medium flex items-center gap-2">
            <Plus className="w-5 h-5" /> Create Post
          </button>
        </div>
      </div>

      {autoPublish && (
        <div className="bg-green-600/10 border border-green-500/30 rounded-xl px-4 py-2.5 text-sm text-green-300 flex items-center gap-2 -mt-2">
          <Clock className="w-4 h-4" /> Auto-publish is on — scheduled posts fire at their time while this tab stays open.
        </div>
      )}

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { platform: 'facebook', label: 'Facebook', icon: Facebook, color: 'from-blue-500 to-blue-700' },
          { platform: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-700' },
          { platform: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'from-blue-600 to-blue-800' },
          { platform: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'from-blue-400 to-blue-600' },
        ].map((platform) => {
          const Icon = platform.icon;
          const supported = PUBLISHABLE.has(platform.platform);
          const acct = accounts[platform.platform];
          const isConnected = !!acct?.connected;
          const scheduledCount = socialPosts.filter(
            p => p.status === 'scheduled' && p.platforms.includes(platform.platform as any),
          ).length;
          return (
            <div
              key={platform.platform}
              className="bg-[#0f0f0f] rounded-xl border border-[#2a2a2a] p-4 relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${platform.color} opacity-10 blur-2xl`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {!supported ? (
                    <span className="px-2 py-1 bg-[#2a2a2a] text-gray-500 text-xs rounded-full font-semibold">
                      Coming soon
                    </span>
                  ) : isConnected ? (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => connectPlatform(platform.platform)}
                      disabled={connecting === platform.platform}
                      className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full font-semibold hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                    >
                      {connecting === platform.platform ? 'Connecting…' : 'Connect'}
                    </button>
                  )}
                </div>
                <h3 className="font-semibold text-white mb-1">{platform.label}</h3>
                <p className="text-sm text-gray-400">
                  {isConnected && acct?.name ? acct.name : `${scheduledCount} scheduled post${scheduledCount === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scheduled Posts List */}
      <div className="bg-[#0f0f0f] rounded-xl border border-[#2a2a2a] p-6">
        <h3 className="text-lg font-bold text-white mb-4">Scheduled Posts</h3>
        
        {socialPosts.filter(p => p.status === 'scheduled' || p.status === 'failed').length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No scheduled posts yet</p>
            <p className="text-sm text-gray-500">Create your first social media post to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {socialPosts
              .filter(p => p.status === 'scheduled' || p.status === 'failed')
              .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
              .map((post) => (
                <div
                  key={post.id}
                  className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a] hover:border-[#ea580c]/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-gray-400">
                          {new Date(post.scheduled_date).toLocaleString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          post.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {post.status === 'failed' ? 'failed — retry' : post.status}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">{post.content}</p>
                      <div className="flex items-center gap-2">
                        {post.platforms.map((platform) => {
                          const icons = {
                            facebook: Facebook,
                            instagram: Instagram,
                            linkedin: Linkedin,
                            twitter: Twitter,
                          };
                          const Icon = icons[platform];
                          return (
                            <div
                              key={platform}
                              className="px-2 py-1 bg-[#0f0f0f] rounded-lg flex items-center gap-1 text-xs"
                            >
                              <Icon className="w-3 h-3" />
                              <span className="capitalize">{platform}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => publishNow(post)}
                        disabled={publishingId === post.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 rounded-lg text-xs font-bold transition disabled:opacity-50">
                        <Zap className="w-3.5 h-3.5" /> {publishingId === post.id ? 'Publishing…' : 'Publish Now'}
                      </button>
                      <button onClick={() => deletePost(post.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Published Posts */}
      <div className="bg-[#0f0f0f] rounded-xl border border-[#2a2a2a] p-6">
        <h3 className="text-lg font-bold text-white mb-4">Published Posts</h3>
        
        {socialPosts.filter(p => p.status === 'published').length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No published posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {socialPosts
              .filter(p => p.status === 'published')
              .map((post) => (
                <div
                  key={post.id}
                  className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]"
                >
                  <p className="text-gray-300 text-sm mb-2 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    Published {new Date(post.scheduled_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Create Social Post Modal */}
      {showCreateSocialPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Create Social Media Post</h2>
                <button
                  onClick={() => setShowCreateSocialPost(false)}
                  className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Post Content
                </label>
                <textarea
                  value={newSocialPost.content}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, content: e.target.value })}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">{newSocialPost.content.length} characters</p>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Platforms
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'from-blue-500 to-blue-700' },
                    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-700' },
                    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'from-blue-600 to-blue-800' },
                    { id: 'twitter', label: 'Twitter', icon: Twitter, color: 'from-blue-400 to-blue-600' },
                  ].map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = newSocialPost.platforms.includes(platform.id as any);
                    return (
                      <button
                        key={platform.id}
                        onClick={() => {
                          if (isSelected) {
                            setNewSocialPost({
                              ...newSocialPost,
                              platforms: newSocialPost.platforms.filter(p => p !== platform.id)
                            });
                          } else {
                            setNewSocialPost({
                              ...newSocialPost,
                              platforms: [...newSocialPost.platforms, platform.id as any]
                            });
                          }
                        }}
                        className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-[#ea580c] bg-[#ea580c]/10'
                            : 'border-[#2a2a2a] bg-[#0f0f0f] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-white">{platform.label}</span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-[#ea580c] ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Schedule Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newSocialPost.scheduled_date}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, scheduled_date: e.target.value })}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 text-white focus:outline-none focus:border-[#ea580c] transition-colors"
                />
              </div>

              {/* Media Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Media Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'text', label: 'Text Only', icon: FileText },
                    { id: 'image', label: 'Image', icon: ImageIcon },
                    { id: 'video', label: 'Video', icon: Video },
                    { id: 'carousel', label: 'Carousel', icon: Layers },
                  ].map((type) => {
                    const Icon = type.icon;
                    const isSelected = newSocialPost.media_type === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setNewSocialPost({ ...newSocialPost, media_type: type.id as any })}
                        className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                          isSelected
                            ? 'border-[#ea580c] bg-[#ea580c]/10'
                            : 'border-[#2a2a2a] bg-[#0f0f0f] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Media URL (required for Instagram) */}
              {newSocialPost.media_type !== 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {newSocialPost.media_type === 'video' ? 'Video URL' : 'Image URL'}
                  </label>
                  <input
                    type="url"
                    value={newSocialPost.media_url}
                    onChange={(e) => setNewSocialPost({ ...newSocialPost, media_url: e.target.value })}
                    placeholder="https://…"
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Instagram requires a public image or video URL. Facebook & LinkedIn post text; X posts text only.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[#2a2a2a]">
                <button
                  onClick={() => {
                    setShowCreateSocialPost(false);
                    setNewSocialPost({
                      content: '',
                      platforms: [],
                      scheduled_date: '',
                      media_type: 'text',
                      media_url: '',
                    });
                  }}
                  className="flex-1 px-6 py-3 bg-[#2a2a2a] rounded-lg font-semibold hover:bg-[#3a3a3a] transition-colors text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newSocialPost.content || !newSocialPost.scheduled_date || newSocialPost.platforms.length === 0) {
                      toast.error('Please fill in all required fields');
                      return;
                    }
                    if (newSocialPost.media_type !== 'text' && !newSocialPost.media_url.trim()) {
                      toast.error('Add a public image or video URL for this media type.');
                      return;
                    }

                    const newPost: SocialPost = {
                      id: `post-${Date.now()}`,
                      content: newSocialPost.content,
                      media_urls: newSocialPost.media_url.trim() ? [newSocialPost.media_url.trim()] : [],
                      media_type: newSocialPost.media_type,
                      platforms: newSocialPost.platforms,
                      scheduled_date: newSocialPost.scheduled_date,
                      status: 'scheduled',
                      created_at: new Date().toISOString(),
                    };

                    updatePosts([...socialPosts, newPost]);
                    setShowCreateSocialPost(false);
                    setNewSocialPost({
                      content: '',
                      platforms: [],
                      scheduled_date: '',
                      media_type: 'text',
                      media_url: '',
                    });
                    toast.success('✅ Post scheduled! Click "Publish Now" or enable Auto-publish.');
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all text-white flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Schedule Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Library Picker Modal */}
      {showLibraryPicker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Library className="w-5 h-5 text-orange-400" /> Pick from Content Library
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Select content to post — ads, reels, captions, scripts</p>
              </div>
              <button onClick={() => setShowLibraryPicker(false)} className="p-1.5 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {libraryItems.length === 0 ? (
                <div className="text-center py-12">
                  <Library className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No content in library yet</p>
                  <p className="text-gray-600 text-sm mt-1">Create content in the AI Generator or import from social media first</p>
                </div>
              ) : libraryItems.map(item => (
                <button key={item.id} onClick={() => pickFromLibrary(item)}
                  className="w-full flex items-start gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/40 rounded-xl text-left transition group">
                  <div className="w-9 h-9 rounded-lg bg-orange-600/20 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-orange-300 transition truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.content?.slice(0, 120)}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.content_format && <span className="px-2 py-0.5 bg-[#2A2A2A] rounded text-xs text-gray-400">{item.content_format}</span>}
                      {item.platform && <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-400">{item.platform}</span>}
                      <span className="text-xs text-gray-600">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                    <span className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg">Use This</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
