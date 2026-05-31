/**
 * External Review Site Integration Component
 * 
 * Manage connections and sync reviews with external platforms:
 * - Google Business Profile
 * - Yelp
 * - Facebook Reviews
 * - Trustpilot
 * - BBB (Better Business Bureau)
 * - Angi (formerly Angie's List)
 * 
 * Features:
 * - API credential management
 * - Auto-sync approved reviews
 * - Import external reviews
 * - Unified review dashboard
 * - Response management
 */

import { useState } from 'react';
import {
  Chrome, Star, Facebook, Award, Shield, Link2, CheckCircle,
  XCircle, RefreshCw, Settings, Eye, Download, Upload, Zap,
  TrendingUp, AlertCircle, ExternalLink, Key, Globe, BarChart3
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ExternalPlatform {
  id: string;
  name: string;
  icon: any;
  color: string;
  connected: boolean;
  apiKey?: string;
  businessId?: string;
  lastSync?: Date;
  reviewCount: number;
  avgRating: number;
  autoSync: boolean;
  syncDirection: 'push' | 'pull' | 'both';
  features: {
    pushReviews: boolean;
    pullReviews: boolean;
    respondToReviews: boolean;
    analytics: boolean;
  };
}

// Mock data
const mockPlatforms: ExternalPlatform[] = [
  {
    id: 'google',
    name: 'Google Business',
    icon: Chrome,
    color: 'blue',
    connected: true,
    apiKey: '**********************',
    businessId: 'ChIJ...',
    lastSync: new Date('2026-01-25T08:30:00'),
    reviewCount: 247,
    avgRating: 4.6,
    autoSync: true,
    syncDirection: 'both',
    features: {
      pushReviews: true,
      pullReviews: true,
      respondToReviews: true,
      analytics: true
    }
  },
  {
    id: 'yelp',
    name: 'Yelp',
    icon: Star,
    color: 'red',
    connected: true,
    apiKey: '**********************',
    businessId: 'yelp-business-id',
    lastSync: new Date('2026-01-25T07:15:00'),
    reviewCount: 183,
    avgRating: 4.4,
    autoSync: true,
    syncDirection: 'pull',
    features: {
      pushReviews: false,
      pullReviews: true,
      respondToReviews: true,
      analytics: false
    }
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'blue',
    connected: false,
    reviewCount: 0,
    avgRating: 0,
    autoSync: false,
    syncDirection: 'both',
    features: {
      pushReviews: true,
      pullReviews: true,
      respondToReviews: true,
      analytics: true
    }
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot',
    icon: Award,
    color: 'green',
    connected: false,
    reviewCount: 0,
    avgRating: 0,
    autoSync: false,
    syncDirection: 'both',
    features: {
      pushReviews: true,
      pullReviews: true,
      respondToReviews: true,
      analytics: true
    }
  },
  {
    id: 'bbb',
    name: 'BBB',
    icon: Shield,
    color: 'blue',
    connected: false,
    reviewCount: 0,
    avgRating: 0,
    autoSync: false,
    syncDirection: 'pull',
    features: {
      pushReviews: false,
      pullReviews: true,
      respondToReviews: true,
      analytics: false
    }
  },
  {
    id: 'angi',
    name: 'Angi',
    icon: Star,
    color: 'orange',
    connected: false,
    reviewCount: 0,
    avgRating: 0,
    autoSync: false,
    syncDirection: 'both',
    features: {
      pushReviews: true,
      pullReviews: true,
      respondToReviews: true,
      analytics: true
    }
  }
];

export default function ExternalReviewIntegration() {
  const [platforms, setPlatforms] = useState<ExternalPlatform[]>(mockPlatforms);
  const [selectedPlatform, setSelectedPlatform] = useState<ExternalPlatform | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleConnect = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (platform) {
      setSelectedPlatform(platform);
      setShowSetupModal(true);
    }
  };

  const handleSaveConnection = () => {
    if (!selectedPlatform) return;

    setPlatforms(platforms.map(p => 
      p.id === selectedPlatform.id 
        ? { ...p, connected: true, apiKey, businessId }
        : p
    ));

    setShowSetupModal(false);
    setApiKey('');
    setBusinessId('');
    setSelectedPlatform(null);
    toast.success(`Connected to ${selectedPlatform.name}`);
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms(platforms.map(p => 
      p.id === platformId 
        ? { ...p, connected: false, apiKey: undefined, businessId: undefined }
        : p
    ));
    toast.success('Platform disconnected');
  };

  const handleSync = async (platformId: string) => {
    setSyncing(platformId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setPlatforms(platforms.map(p => 
      p.id === platformId 
        ? { ...p, lastSync: new Date() }
        : p
    ));
    
    setSyncing(null);
    toast.success('Reviews synced successfully');
  };

  const handleToggleAutoSync = (platformId: string) => {
    setPlatforms(platforms.map(p => 
      p.id === platformId 
        ? { ...p, autoSync: !p.autoSync }
        : p
    ));
    const platform = platforms.find(p => p.id === platformId);
    toast.success(`Auto-sync ${platform?.autoSync ? 'disabled' : 'enabled'} for ${platform?.name}`);
  };

  const connectedPlatforms = platforms.filter(p => p.connected).length;
  const totalReviews = platforms.reduce((sum, p) => sum + p.reviewCount, 0);
  const avgRatingAcrossPlatforms = platforms.reduce((sum, p) => sum + p.avgRating * p.reviewCount, 0) / totalReviews || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-orange-400" />
              External Review Integrations
            </h2>
            <p className="text-gray-400 text-sm">Connect and sync with external review platforms</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Connected</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{connectedPlatforms}</p>
            <p className="text-xs text-gray-500">of {platforms.length} platforms</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Total Reviews</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{totalReviews}</p>
            <p className="text-xs text-gray-500">across all platforms</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{avgRatingAcrossPlatforms.toFixed(1)}</p>
            <p className="text-xs text-gray-500">combined average</p>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Auto-Sync</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">
              {platforms.filter(p => p.autoSync).length}
            </p>
            <p className="text-xs text-gray-500">active syncs</p>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map(platform => (
          <div key={platform.id} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            {/* Platform Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-${platform.color}-600/20 border border-${platform.color}-500/30 flex items-center justify-center`}>
                  <platform.icon className={`w-6 h-6 text-${platform.color}-400`} />
                </div>
                <div>
                  <h3 className="font-bold text-white">{platform.name}</h3>
                  <div className="flex items-center gap-2">
                    {platform.connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <XCircle className="w-3 h-3" />
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            {platform.connected && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                  <p className="text-xs text-gray-400 mb-1">Reviews</p>
                  <p className="text-xl font-bold text-white">{platform.reviewCount}</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                  <p className="text-xs text-gray-400 mb-1">Avg Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <p className="text-xl font-bold text-white">{platform.avgRating.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            {platform.connected && (
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3 mb-4">
                <p className="text-xs text-gray-400 mb-2">Features</p>
                <div className="space-y-1">
                  {platform.features.pushReviews && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Upload className="w-3 h-3 text-green-400" />
                      <span>Push reviews to platform</span>
                    </div>
                  )}
                  {platform.features.pullReviews && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Download className="w-3 h-3 text-blue-400" />
                      <span>Import reviews from platform</span>
                    </div>
                  )}
                  {platform.features.respondToReviews && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Eye className="w-3 h-3 text-purple-400" />
                      <span>Respond to reviews</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Sync */}
            {platform.connected && platform.lastSync && (
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3 mb-4">
                <p className="text-xs text-gray-400">Last synced: {platform.lastSync.toLocaleString()}</p>
              </div>
            )}

            {/* Auto-Sync Toggle */}
            {platform.connected && (
              <div className="flex items-center justify-between mb-4 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white">Auto-sync</span>
                </div>
                <button
                  onClick={() => handleToggleAutoSync(platform.id)}
                  className={`relative w-12 h-6 rounded-full transition ${
                    platform.autoSync ? 'bg-orange-600' : 'bg-[#2A2A2A]'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    platform.autoSync ? 'transform translate-x-6' : ''
                  }`}></div>
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {platform.connected ? (
                <>
                  <button
                    onClick={() => handleSync(platform.id)}
                    disabled={syncing === platform.id}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing === platform.id ? 'animate-spin' : ''}`} />
                    {syncing === platform.id ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    onClick={() => handleDisconnect(platform.id)}
                    className="px-4 py-2 bg-[#0A0A0A] border border-red-500/30 text-red-400 rounded-xl hover:bg-red-600/20 transition font-medium"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect(platform.id)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Setup Modal */}
      {showSetupModal && selectedPlatform && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-xl bg-${selectedPlatform.color}-600/20 border border-${selectedPlatform.color}-500/30 flex items-center justify-center`}>
                <selectedPlatform.icon className={`w-6 h-6 text-${selectedPlatform.color}-400`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Connect to {selectedPlatform.name}</h3>
                <p className="text-sm text-gray-400">Enter your API credentials</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Enter your API key"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Business ID / Location ID
                </label>
                <input
                  type="text"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Enter your business ID"
                />
              </div>

              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-400 font-semibold mb-1">Where to find your credentials:</p>
                    <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Log in to your {selectedPlatform.name} business account</li>
                      <li>Navigate to Settings → API Access</li>
                      <li>Generate a new API key if needed</li>
                      <li>Copy your Business/Location ID from the dashboard</li>
                    </ol>
                    <a
                      href="#"
                      className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 mt-2"
                    >
                      View setup guide
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveConnection}
                disabled={!apiKey || !businessId}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Connect Platform
              </button>
              <button
                onClick={() => {
                  setShowSetupModal(false);
                  setApiKey('');
                  setBusinessId('');
                  setSelectedPlatform(null);
                }}
                className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-400" />
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-10 h-10 rounded-lg bg-green-600/20 border border-green-500/30 flex items-center justify-center mb-3">
              <Link2 className="w-5 h-5 text-green-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">1. Connect Platforms</h4>
            <p className="text-sm text-gray-400">
              Enter API credentials for each review platform you want to integrate with your system.
            </p>
          </div>

          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">2. Auto-Sync Reviews</h4>
            <p className="text-sm text-gray-400">
              Enable auto-sync to automatically push approved reviews and pull external reviews daily.
            </p>
          </div>

          <div>
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-3">
              <Eye className="w-5 h-5 text-purple-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">3. Manage & Respond</h4>
            <p className="text-sm text-gray-400">
              View all reviews in one place and respond to them directly from your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
