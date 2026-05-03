import { useState, useEffect } from 'react';
import {
  Share2,
  Calendar,
  BarChart3,
  Plus,
  Image as ImageIcon,
  Video,
  FileText,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Clock,
  Send,
  Edit2,
  Trash2,
  Eye,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Repeat2,
  Target,
  Settings,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

interface SocialPost {
  id: string;
  content: string;
  media_urls: string[];
  media_type: 'image' | 'video' | 'carousel' | 'text';
  platforms: ('facebook' | 'instagram' | 'linkedin' | 'twitter')[];
  scheduled_date: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
  };
  created_at: string;
}

interface PlatformStats {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  connected: boolean;
  followers: number;
  engagement_rate: number;
  posts_this_month: number;
}

const PLATFORM_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
};

const PLATFORM_COLORS = {
  facebook: 'from-blue-500 to-blue-700',
  instagram: 'from-pink-500 to-purple-700',
  linkedin: 'from-blue-600 to-blue-800',
  twitter: 'from-blue-400 to-blue-600',
};

export default function SocialMediaManager() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'posts' | 'analytics' | 'settings'>('calendar');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      // Load from localStorage
      const storedPosts = localStorage.getItem('social_media_posts');
      const storedPlatforms = localStorage.getItem('social_media_platforms');

      if (storedPosts) {
        setPosts(JSON.parse(storedPosts));
      } else {
        // Initialize with demo data
        const demoPosts: SocialPost[] = [
          {
            id: '1',
            content: 'Check out our latest kitchen remodel! Modern design meets functionality. 🏠✨',
            media_urls: ['https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800'],
            media_type: 'image',
            platforms: ['facebook', 'instagram'],
            scheduled_date: new Date(Date.now() + 86400000).toISOString(),
            status: 'scheduled',
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            content: 'Transform your space with our expert craftsmanship. Book a consultation today!',
            media_urls: [],
            media_type: 'text',
            platforms: ['linkedin', 'twitter'],
            scheduled_date: new Date(Date.now() + 172800000).toISOString(),
            status: 'scheduled',
            created_at: new Date().toISOString(),
          },
        ];
        setPosts(demoPosts);
        localStorage.setItem('social_media_posts', JSON.stringify(demoPosts));
      }

      if (storedPlatforms) {
        setPlatforms(JSON.parse(storedPlatforms));
      } else {
        // Initialize with demo platform stats
        const demoPlatforms: PlatformStats[] = [
          {
            platform: 'facebook',
            connected: true,
            followers: 2450,
            engagement_rate: 4.2,
            posts_this_month: 12,
          },
          {
            platform: 'instagram',
            connected: true,
            followers: 3820,
            engagement_rate: 6.8,
            posts_this_month: 18,
          },
          {
            platform: 'linkedin',
            connected: false,
            followers: 0,
            engagement_rate: 0,
            posts_this_month: 0,
          },
          {
            platform: 'twitter',
            connected: false,
            followers: 0,
            engagement_rate: 0,
            posts_this_month: 0,
          },
        ];
        setPlatforms(demoPlatforms);
        localStorage.setItem('social_media_platforms', JSON.stringify(demoPlatforms));
      }
    } catch (error) {
      console.error('Error loading social media data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = (postData: Partial<SocialPost>) => {
    const newPost: SocialPost = {
      id: Date.now().toString(),
      content: postData.content || '',
      media_urls: postData.media_urls || [],
      media_type: postData.media_type || 'text',
      platforms: postData.platforms || [],
      scheduled_date: postData.scheduled_date || new Date().toISOString(),
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    const updatedPosts = [...posts, newPost];
    setPosts(updatedPosts);
    localStorage.setItem('social_media_posts', JSON.stringify(updatedPosts));
  };

  const deletePost = (postId: string) => {
    const updatedPosts = posts.filter((p) => p.id !== postId);
    setPosts(updatedPosts);
    localStorage.setItem('social_media_posts', JSON.stringify(updatedPosts));
  };

  const getStatusColor = (status: SocialPost['status']) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/20 text-green-400';
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400';
      case 'draft':
        return 'bg-gray-500/20 text-gray-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <Share2 className="w-8 h-8 animate-pulse text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading Social Media Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Unified Back Button */}
        <button
          onClick={() => window.location.href = '/unified-dashboard'}
          className="flex items-center gap-2 px-4 py-2 mb-6 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-gray-300 hover:text-white rounded-lg transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Unified Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Share2 className="w-8 h-8 text-orange-500" />
              Social Media Manager
            </h1>
            <p className="text-gray-400">
              Schedule, publish, and track your social media content across all platforms
            </p>
          </div>
          <button
            onClick={() => setShowCreatePost(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Post
          </button>
        </div>

        {/* Platform Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {platforms.map((platform) => {
            const Icon = PLATFORM_ICONS[platform.platform];
            const color = PLATFORM_COLORS[platform.platform];

            return (
              <div
                key={platform.platform}
                className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 blur-3xl`} />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {platform.connected ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <button className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full font-semibold hover:bg-orange-500/30 transition-colors">
                        Connect
                      </button>
                    )}
                  </div>

                  <h3 className="text-lg font-bold mb-4 capitalize">{platform.platform}</h3>

                  {platform.connected ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Followers</span>
                        <span className="font-semibold">{platform.followers.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Engagement Rate</span>
                        <span className="font-semibold text-green-400">{platform.engagement_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Posts This Month</span>
                        <span className="font-semibold">{platform.posts_this_month}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Connect your {platform.platform} account to start posting
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] mb-6">
          <div className="flex gap-1 p-1">
            {[
              { id: 'calendar', label: 'Content Calendar', icon: Calendar },
              { id: 'posts', label: 'All Posts', icon: FileText },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Content Calendar</h2>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-[#2A2A2A] rounded-lg hover:bg-[#353535] transition-colors">
                  Today
                </button>
                <button className="px-4 py-2 bg-[#2A2A2A] rounded-lg hover:bg-[#353535] transition-colors">
                  This Week
                </button>
                <button className="px-4 py-2 bg-[#2A2A2A] rounded-lg hover:bg-[#353535] transition-colors">
                  This Month
                </button>
              </div>
            </div>

            {/* Upcoming Posts */}
            <div className="space-y-4">
              {posts
                .filter((post) => post.status === 'scheduled')
                .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                .map((post) => (
                  <div
                    key={post.id}
                    className="bg-[#0A0A0A] rounded-lg p-4 border border-[#2A2A2A] hover:border-orange-600/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-orange-400" />
                          <span className="text-sm text-gray-400">
                            {new Date(post.scheduled_date).toLocaleString()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(post.status)}`}>
                            {post.status}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-3">{post.content}</p>
                        <div className="flex items-center gap-2">
                          {post.platforms.map((platform) => {
                            const Icon = PLATFORM_ICONS[platform];
                            return (
                              <div
                                key={platform}
                                className="px-2 py-1 bg-[#1A1A1A] rounded-lg flex items-center gap-1"
                              >
                                <Icon className="w-4 h-4" />
                                <span className="text-xs capitalize">{platform}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>

                    {post.media_urls.length > 0 && (
                      <div className="flex gap-2">
                        {post.media_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Post media"
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {posts.filter((p) => p.status === 'scheduled').length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No scheduled posts yet</p>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Post
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-xs text-green-400">+12.5%</span>
                </div>
                <div className="text-2xl font-bold mb-1">14.2K</div>
                <div className="text-sm text-gray-400">Total Reach</div>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-green-400">+8.3%</span>
                </div>
                <div className="text-2xl font-bold mb-1">6,270</div>
                <div className="text-sm text-gray-400">Total Followers</div>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <span className="text-xs text-green-400">+15.7%</span>
                </div>
                <div className="text-2xl font-bold mb-1">5.8%</div>
                <div className="text-sm text-gray-400">Engagement Rate</div>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-orange-400" />
                  <span className="text-xs text-gray-400">This month</span>
                </div>
                <div className="text-2xl font-bold mb-1">30</div>
                <div className="text-sm text-gray-400">Posts Published</div>
              </div>
            </div>

            {/* Engagement Chart Placeholder */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-xl font-bold mb-6">Engagement Over Time</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Chart visualization would go here</p>
                  <p className="text-sm">(Recharts integration)</p>
                </div>
              </div>
            </div>

            {/* Top Performing Posts */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-xl font-bold mb-6">Top Performing Posts</h3>
              <div className="space-y-4">
                {posts
                  .filter((p) => p.status === 'published' && p.engagement)
                  .sort((a, b) => 
                    (b.engagement?.likes || 0) - (a.engagement?.likes || 0)
                  )
                  .slice(0, 5)
                  .map((post) => (
                    <div
                      key={post.id}
                      className="bg-[#0A0A0A] rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-sm mb-2 text-gray-300">{post.content.slice(0, 100)}...</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {post.engagement?.likes || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {post.engagement?.comments || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Repeat2 className="w-4 h-4" />
                            {post.engagement?.shares || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {posts.filter((p) => p.status === 'published').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No published posts yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Banner */}
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 text-center">
          <Sparkles className="w-12 h-12 text-white mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Need Content Ideas?</h3>
          <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
            Use our AI Ad Creator to generate engaging social media posts automatically. 
            Let AI write compelling copy and suggest the best times to post.
          </p>
          <button
            onClick={() => (window.location.href = '/ai-content-studio')}
            className="bg-white text-purple-600 px-8 py-3 rounded-lg font-bold hover:bg-purple-50 transition-colors inline-flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Try AI Content Creator
          </button>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Create New Post</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Post Content</label>
                <textarea
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 text-white resize-none focus:outline-none focus:border-orange-600"
                  rows={5}
                  placeholder="What do you want to share?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Select Platforms</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(PLATFORM_ICONS).map(([platform, Icon]) => (
                    <button
                      key={platform}
                      className="flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:border-orange-600/50 transition-all"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="capitalize">{platform}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Schedule Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 text-white focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="flex-1 px-6 py-3 bg-[#2A2A2A] rounded-lg font-semibold hover:bg-[#353535] transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" />
                  Schedule Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}