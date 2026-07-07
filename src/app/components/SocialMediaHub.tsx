/**
 * SocialMediaHub — connect Facebook, Instagram, TikTok accounts,
 * pull content into the Content Library, and cross-post from it.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle, AlertCircle, RefreshCw, ExternalLink, Unlink,
  Download, Upload, Sparkles, Eye, Heart, Share2, Clock, X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface SocialAccount {
  platform: 'facebook' | 'instagram' | 'tiktok';
  connected: boolean;
  name?: string;
  avatar?: string;
  followers?: number;
  connectedAt?: string;
}

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  shares: number;
  postedAt: string;
  permalink: string;
}

const PLATFORMS = [
  {
    id: 'facebook' as const,
    name: 'Facebook',
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-400',
    icon: '📘',
    description: 'Pages, posts, photos & videos',
    authUrl: `${API}/social/connect/facebook`,
  },
  {
    id: 'instagram' as const,
    name: 'Instagram',
    color: 'from-pink-600 to-purple-600',
    borderColor: 'border-pink-500/40',
    textColor: 'text-pink-400',
    icon: '📸',
    description: 'Feed posts, Reels & Stories',
    authUrl: `${API}/social/connect/instagram`,
  },
  {
    id: 'tiktok' as const,
    name: 'TikTok',
    color: 'from-gray-900 to-gray-800',
    borderColor: 'border-gray-500/40',
    textColor: 'text-white',
    icon: '🎵',
    description: 'Videos & TikTok posts',
    authUrl: `${API}/social/connect/tiktok`,
  },
];

export default function SocialMediaHub() {
  const [accounts, setAccounts] = useState<Record<string, SocialAccount>>({});
  const [pulledPosts, setPulledPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [publishTargets, setPublishTargets] = useState<string[]>([]);
  const [aiCaption, setAiCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [view, setView] = useState<'accounts' | 'feed'>('accounts');

  useEffect(() => {
    loadConnectedAccounts();
  }, []);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || publicAnonKey;
  };

  const loadConnectedAccounts = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/social/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || {});
      }
    } catch {}
  };

  const connectPlatform = async (platform: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/social/connect/${platform}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.authUrl) {
        // Open OAuth popup
        const popup = window.open(data.authUrl, `Connect ${platform}`, 'width=600,height=700,scrollbars=yes');
        // Listen for callback
        const listener = (e: MessageEvent) => {
          if (e.data?.type === 'social_connected' && e.data?.platform === platform) {
            window.removeEventListener('message', listener);
            popup?.close();
            toast.success(`${platform} connected!`);
            loadConnectedAccounts();
          }
        };
        window.addEventListener('message', listener);
      } else if (data.connected) {
        toast.success(`${platform} connected!`);
        loadConnectedAccounts();
      } else {
        toast.error(data.error || `Failed to connect ${platform}`);
      }
    } catch (err: any) {
      toast.error(`Connection error: ${err.message}`);
    }
  };

  const disconnectPlatform = async (platform: string) => {
    if (!confirm(`Disconnect ${platform}? You can reconnect anytime.`)) return;
    try {
      const token = await getToken();
      await fetch(`${API}/social/disconnect/${platform}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`${platform} disconnected`);
      loadConnectedAccounts();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const pullContent = async (platform: string) => {
    setSyncing(platform);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/social/fetch/${platform}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPulledPosts(prev => {
          const existing = new Set(prev.map(p => p.id));
          const newPosts = (data.posts || []).filter((p: SocialPost) => !existing.has(p.id));
          return [...newPosts, ...prev];
        });
        setView('feed');
        toast.success(`Pulled ${data.posts?.length || 0} posts from ${platform}`);
      } else {
        toast.error(data.error || 'Failed to pull content');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(null);
    }
  };

  const importToContentLibrary = async (post: SocialPost) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/social/import-to-library`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ post }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Added to Content Library!');
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const generateAICaption = async (post: SocialPost, targetPlatform: string) => {
    setGeneratingCaption(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/social/ai-repurpose`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalContent: post.content,
          sourcePlatform: post.platform,
          targetPlatform,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiCaption(data.caption);
      } else {
        toast.error(data.error || 'AI generation failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGeneratingCaption(false);
    }
  };

  const crossPost = async (post: SocialPost) => {
    if (publishTargets.length === 0) {
      toast.error('Select at least one platform to post to');
      return;
    }
    setPublishing(post.id);
    try {
      const token = await getToken();
      const caption = aiCaption || post.content;
      const res = await fetch(`${API}/social/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: caption,
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          platforms: publishTargets,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Posted to ${publishTargets.join(', ')}!`);
        setSelectedPost(null);
        setPublishTargets([]);
        setAiCaption('');
      } else {
        toast.error(data.error || 'Publishing failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPublishing(null);
    }
  };

  const connectedCount = Object.values(accounts).filter(a => a.connected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Social Media Accounts</h2>
          <p className="text-sm text-gray-400 mt-1">
            Connect your accounts to pull content in and publish content out — all from one place.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('accounts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'accounts' ? 'bg-orange-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            Accounts
          </button>
          <button
            onClick={() => setView('feed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'feed' ? 'bg-orange-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            Pulled Feed {pulledPosts.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">{pulledPosts.length}</span>}
          </button>
        </div>
      </div>

      {view === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLATFORMS.map(platform => {
            const account = accounts[platform.id];
            const isConnected = account?.connected;

            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#1A1A1A] border ${isConnected ? platform.borderColor : 'border-[#2A2A2A]'} rounded-2xl p-5 flex flex-col gap-4`}
              >
                {/* Platform header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-lg`}>
                      {platform.icon}
                    </div>
                    <div>
                      <p className="font-bold text-white">{platform.name}</p>
                      <p className="text-xs text-gray-500">{platform.description}</p>
                    </div>
                  </div>
                  {isConnected
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <AlertCircle className="w-5 h-5 text-gray-600" />
                  }
                </div>

                {/* Connected account info */}
                {isConnected && account?.name && (
                  <div className="bg-black/30 rounded-xl px-3 py-2 flex items-center gap-2">
                    {account.avatar && <img src={account.avatar} alt="" className="w-6 h-6 rounded-full" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{account.name}</p>
                      {account.followers !== undefined && (
                        <p className="text-xs text-gray-500">{account.followers.toLocaleString()} followers</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isConnected ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => pullContent(platform.id)}
                      disabled={syncing === platform.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-sm font-medium rounded-xl transition disabled:opacity-50"
                    >
                      {syncing === platform.id
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Pulling...</>
                        : <><Download className="w-4 h-4" /> Pull Content</>
                      }
                    </button>
                    <button
                      onClick={() => disconnectPlatform(platform.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-gray-500 hover:text-red-400 text-xs font-medium rounded-xl transition"
                    >
                      <Unlink className="w-3.5 h-3.5" /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => connectPlatform(platform.id)}
                    className={`w-full px-4 py-3 bg-gradient-to-r ${platform.color} text-white text-sm font-bold rounded-xl transition hover:opacity-90 flex items-center justify-center gap-2`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect {platform.name}
                  </button>
                )}

                {/* Setup note for unconnected */}
                {!isConnected && (
                  <p className="text-xs text-gray-600 text-center">
                    Requires a {platform.name} {platform.id === 'tiktok' ? 'Business/Creator' : 'Business'} account
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Setup instructions when nothing connected */}
      {view === 'accounts' && connectedCount === 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
          <p className="text-sm font-semibold text-blue-300 mb-2">📋 First-time setup — takes about 10 minutes</p>
          <ol className="text-xs text-blue-400/80 space-y-1.5 list-decimal list-inside">
            <li>Go to <strong>developers.facebook.com</strong> → Create App → Add your App ID & Secret in Supabase secrets as <code>FACEBOOK_APP_ID</code> and <code>FACEBOOK_APP_SECRET</code></li>
            <li>For Instagram: Enable "Instagram Graph API" in the same Meta app</li>
            <li>Go to <strong>developers.tiktok.com</strong> → Create App → Add as <code>TIKTOK_CLIENT_KEY</code> and <code>TIKTOK_CLIENT_SECRET</code></li>
            <li>Once secrets are added, come back here and click Connect</li>
          </ol>
        </div>
      )}

      {/* Pulled Feed */}
      {view === 'feed' && (
        <div className="space-y-4">
          {pulledPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Download className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No content pulled yet</p>
              <p className="text-sm mt-1">Connect an account and click "Pull Content" to import your posts</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pulledPosts.map(post => (
                <div key={post.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-orange-500/30 transition">
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt="" className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">{post.platform}</span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-600">{new Date(post.postedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3 mb-3">{post.content}</p>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.comments.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{post.shares.toLocaleString()}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => importToContentLibrary(post)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white/5 hover:bg-orange-500/10 border border-[#2A2A2A] hover:border-orange-500/30 text-gray-400 hover:text-orange-300 text-xs rounded-lg transition"
                      >
                        <Download className="w-3 h-3" /> Import
                      </button>
                      <button
                        onClick={() => { setSelectedPost(post); setAiCaption(''); setPublishTargets([]); }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-xs rounded-lg transition"
                      >
                        <Upload className="w-3 h-3" /> Cross-Post
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cross-Post Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-lg p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Cross-Post Content</h3>
              <button onClick={() => setSelectedPost(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Original post preview */}
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Original from {selectedPost.platform}</p>
              <p className="text-sm text-gray-300 line-clamp-3">{selectedPost.content}</p>
            </div>

            {/* AI Repurpose */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-white">Caption</label>
                <div className="flex gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => generateAICaption(selectedPost, p.id)}
                      disabled={generatingCaption}
                      className="text-xs px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
                    >
                      {generatingCaption ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI for {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={aiCaption || selectedPost.content}
                onChange={e => setAiCaption(e.target.value)}
                rows={4}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none resize-none"
              />
            </div>

            {/* Target platforms */}
            <div>
              <p className="text-sm font-medium text-white mb-2">Post to:</p>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.filter(p => accounts[p.id]?.connected && p.id !== selectedPost.platform).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPublishTargets(prev =>
                      prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                    )}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition ${
                      publishTargets.includes(p.id)
                        ? `bg-gradient-to-r ${p.color} border-transparent text-white`
                        : 'bg-white/5 border-[#2A2A2A] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
                {Object.values(accounts).filter(a => a.connected).length === 0 && (
                  <p className="text-xs text-gray-500">Connect platforms above to enable cross-posting</p>
                )}
              </div>
            </div>

            <button
              onClick={() => crossPost(selectedPost)}
              disabled={!!publishing || publishTargets.length === 0}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {publishing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Publishing...</> : <><Upload className="w-4 h-4" /> Publish Now</>}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
