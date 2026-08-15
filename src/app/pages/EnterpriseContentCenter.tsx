/**
 * Enterprise Content Center - Upgraded Professional Edition
 * 
 * Features:
 * - AI-Powered Content Generation with real content creation
 * - Multi-Channel Distribution (Social Media Integration)
 * - Approval Workflows
 * - Content Calendar & Scheduling
 * - Advanced Analytics
 * - Template Library
 * - Company Branding Integration
 */

import { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Calendar, BarChart3, Settings, Sparkles,
  Clock, CheckCircle2, XCircle, Archive, TrendingUp, Eye,
  MousePointerClick, Heart, Filter, Wand2, Image as ImageIcon,
  Video, Globe, Share2, Mail, Instagram, Facebook, Twitter,
  Linkedin, Layout, Download, Maximize2, Check, Trash2, Edit,
  Upload, Copy, Send, X, Play, Pause, ChevronRight, Brain,
  Target, Users, Zap, Layers, Grid3x3, RefreshCw, PenTool,
  Monitor, Smartphone, Tablet, MessageSquare, Building2, Music,
  Volume2, VolumeX, Headphones, Disc, List, Film, FolderOpen,
  HardDrive, Tag, Star, BookMarked, FileImage, FileVideo, 
  FileAudio, File, Crown, Zap as ZapIcon, AlertTriangle, 
  TrendingUp as TrendingUpIcon, Package as PackageIcon, Shield,
  AlertCircle, Briefcase, Link as LinkIcon, Unlink, ExternalLink,
  CheckCircle, AlertCircle as AlertCircleIcon, Youtube, Save, User, Megaphone, Flame, Link2,
  Store, Repeat
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { companyInfo } from '../lib/config/companyInfo';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
import AIContentStudio from '../components/AIContentStudio';
import { ContentApprovalWorkflow } from '../components/ContentApprovalWorkflow';
import { ContentDistributionManager } from '../components/ContentDistributionManager';
import UserContextSelector from '../components/UserContextSelector';
import MusicTimelineEditor from '../components/MusicTimelineEditor';
import { useNavigate } from '../hooks/useNavigate';
import AdStudio from '../components/adstudio/AdStudio';
import CreativeStudio from '../components/creativestudio/CreativeStudio';
import ContentStudio from '../components/contentstudio/ContentStudio';
import MarketingCommandCenter from '../components/adstudio/MarketingCommandCenter';
import EcommerceStoreHub from '../components/adstudio/EcommerceStoreHub';
import MarketplaceAdmin from './MarketplaceAdmin';
import { AD_STUDIO_OPEN_EVENT } from '../lib/adStudioHandoff';
import { CONTENT_OPEN_EVENT, type ContentHandoffPayload } from '../lib/contentHandoff';
import ProductPicker from '../components/ProductPicker';
import {
  UserContext,
  getMockUserContext,
  saveToUserStorage,
  loadFromUserStorage,
  exportUserData,
  CONTENT_CENTER_KEYS
} from '../lib/userStorageManager';
import DraggablePlaylistManager from '../components/DraggablePlaylistManager';
import LiveMusicPreviewPlayer from '../components/LiveMusicPreviewPlayer';
import VideoTimelineEditor from '../components/VideoTimelineEditor';
import VideoRecreationEngine from '../components/VideoRecreationEngine';
import ShopIntelligenceSuite from '../components/ShopIntelligenceSuite';
import StoreAnalyticsDashboard from '../components/StoreAnalyticsDashboard';
import LiveVideoPreviewPlayer from '../components/LiveVideoPreviewPlayer';
import DraggableVideoLibrary from '../components/DraggableVideoLibrary';
import PhotoToVideoConverter from '../components/PhotoToVideoConverter';
import SocialMediaSchedulerTab from '../components/SocialMediaSchedulerTab';
import MediaLibraryManager from '../components/MediaLibraryManager';
import SocialMediaHub from '../components/SocialMediaHub';
import StoreBoostersManager from '../components/StoreBoostersManager';
import PromotionsEngineManager from '../components/PromotionsEngineManager';
import FulfillmentManager from '../components/FulfillmentManager';
import HotProductsRadar from '../components/HotProductsRadar';
import StoreContentStudio from '../components/StoreContentStudio';
import DropshipperAdminPanel from '../components/DropshipperAdminPanel';
import {
  useContentManagement,
  ContentPiece,
  ContentTemplate,
  ContentChannel,
} from '../lib/useContentManagement';
import { createDemoAdsSection1, createDemoAdsSection2, DemoAd } from '../lib/demoAdCreator';
import { createDemoAdsSection3 } from '../lib/demoAdCreatorSection3';
import { createDemoAdsSection4 } from '../lib/demoAdCreatorSection4';
import createDemoProfessionalReels from '../lib/demoProfessionalReels';
import { saveVideoAsset, VideoAsset } from '../lib/videoAssetManager';
import { useCompany } from '../contexts/CompanyContext';
import {
  getMusicAssets,
  saveMusicAsset,
  suggestMusicForVideo,
  searchMusicAssets,
  MusicAsset,
  MusicSuggestion,
  AudioSettings,
  getDefaultAudioSettings,
  saveDefaultAudioSettings,
  getMusicAssetsByMood,
  MusicMood
} from '../lib/musicAssetManager';
import {
  getPlaylists,
  savePlaylist,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  getPlaylistTracks,
  getPlaylistDuration,
  MusicPlaylist
} from '../lib/musicPlaylistManager';
import {
  generateBeatMarkers,
  trimAudioToVideo,
  generateBeatGrid,
  suggestTransitionPoints,
  getBeatStrengthWaveform,
  BeatMarker,
  TrimmedAudio
} from '../lib/audioBeatSync';

interface ContentAsset {
  id: string;
  title: string;
  type: 'blog' | 'social' | 'email' | 'video' | 'image' | 'ad';
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';
  content: string;
  preview?: string;
  channels: string[];
  scheduledDate?: string;
  publishedDate?: string;
  aiGenerated: boolean;
  metrics?: {
    views: number;
    clicks: number;
    engagement: number;
    shares: number;
  };
  createdAt: string;
  updatedAt: string;
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

export default function EnterpriseContentCenter() {
  console.log('🎬 EnterpriseContentCenter component rendering');
  
  const navigate = useNavigate();
  const {
    fetchContentPieces,
    fetchContentPiece,
    fetchTemplates,
    fetchChannels,
    createContentPiece,
    updateContentPiece,
  } = useContentManagement();
  const companyContext = useCompany();
  const currentCompany = companyContext?.activeCompany || null;

  const [activeTab, setActiveTab] = useState<'command' | 'ad-studio' | 'library' | 'create' | 'templates' | 'calendar' | 'analytics' | 'settings' | 'photo-video' | 'storage' | 'social-scheduler' | 'social-accounts' | 'creator-vetting' | 'creator-studio' | 'shop-intelligence' | 'store-boosters' | 'promotions-engine' | 'fulfillment' | 'hot-products' | 'store-content' | 'store' | 'ecommerce' | 'digital-products' | 'creative-studio' | 'content-studio'>('command');

  // Which sub-tab the embedded Online Store panel should open on (deep-linkable).
  const [storeSubTab, setStoreSubTab] = useState<import('../components/DropshipperAdminPanel').StoreTab>('overview');

  // Open the Online Store tab, optionally jumping to a specific sub-area.
  const openStoreTab = (sub?: import('../components/DropshipperAdminPanel').StoreTab) => {
    if (sub) setStoreSubTab(sub);
    setActiveTab('store');
  };

  // Shared tab-open handler used by the hub surfaces (Command Center + eCommerce
  // Store). Routes the Online Store sub-tabs into the embedded store panel.
  const handleOpenTab = (t: string) => {
    if (t.startsWith('store-')) openStoreTab(t.replace('store-', '') as any);
    else setActiveTab(t as any);
  };

  // Deep-link support: open a specific tab via ?tab=ad-studio etc.
  useEffect(() => {
    try {
      const valid = ['command', 'ad-studio', 'library', 'create', 'templates', 'calendar', 'analytics', 'settings', 'photo-video', 'storage', 'social-scheduler', 'social-accounts', 'creator-vetting', 'creator-studio', 'shop-intelligence', 'store', 'ecommerce', 'digital-products', 'creative-studio', 'content-studio'];
      const storeSubTabs = ['overview', 'providers', 'catalog', 'pricing', 'inventory', 'orders', 'errors'];
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab && tab.startsWith('store-') && storeSubTabs.includes(tab.replace('store-', ''))) {
        // Deep-link into a specific Online Store sub-area, e.g. ?tab=store-orders
        openStoreTab(tab.replace('store-', '') as any);
      } else if (tab && valid.includes(tab)) {
        setActiveTab(tab as any);
      } else if (window.location.pathname.includes('ad-studio')) {
        setActiveTab('ad-studio');
      } else if (window.location.pathname.includes('marketing-command')) {
        setActiveTab('command');
      }
    } catch { /* ignore */ }
  }, []);

  // A product list fired "Create Ad" — jump to the Ad Studio tab. Ad Studio
  // itself consumes the handed-off product from storage on mount.
  useEffect(() => {
    const open = () => setActiveTab('ad-studio');
    window.addEventListener(AD_STUDIO_OPEN_EVENT, open);
    return () => window.removeEventListener(AD_STUDIO_OPEN_EVENT, open);
  }, []);

  // Navigation that also handles self-links back into this hub's tabs.
  const hubNavigate = (page: string) => {
    if (page.startsWith('enterprise-content-center')) {
      const q = page.split('?')[1] || '';
      const tab = new URLSearchParams(q).get('tab');
      if (tab) { setActiveTab(tab as any); return; }
    }
    navigate(page);
  };
  const [studioPreloadedProduct, setStudioPreloadedProduct] = useState<any>(null);

  // Generic product handoff: any tool/picker can route a product into a Content
  // Center app. Ad Studio keeps its own bridge; here we handle the other tools.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ContentHandoffPayload>).detail;
      if (!detail?.target) return;
      if (detail.target === 'creator-studio') {
        // VideoRecreationEngine reads `preloadedProduct` to seed its draft.
        const p = detail.product;
        setStudioPreloadedProduct({
          id: p.id, name: p.name, description: p.description,
          price: p.price, originalPrice: p.originalPrice,
          category: p.category, image: p.image, badge: p.badge,
        });
      }
      setActiveTab(detail.target as any);
    };
    window.addEventListener(CONTENT_OPEN_EVENT, handler as EventListener);
    return () => window.removeEventListener(CONTENT_OPEN_EVENT, handler as EventListener);
  }, []);

  const [contentPieces, setContentPieces] = useState<ContentPiece[]>([]);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [channels, setChannels] = useState<ContentChannel[]>([]);

  // Distribution-channel on/off preferences (Settings tab). Persisted locally so
  // toggles are real and survive reloads.
  const CHANNEL_PREFS_KEY = 'ecc_channel_prefs';
  const DEFAULT_CHANNEL_PREFS: Record<string, boolean> = {
    'Website/Blog': true,
    'Email': true,
    'Facebook': true,
    'Instagram': false,
    'Twitter/X': true,
    'LinkedIn': false,
  };
  const [channelPrefs, setChannelPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(CHANNEL_PREFS_KEY);
      return saved ? { ...DEFAULT_CHANNEL_PREFS, ...JSON.parse(saved) } : DEFAULT_CHANNEL_PREFS;
    } catch {
      return DEFAULT_CHANNEL_PREFS;
    }
  });
  const toggleChannelPref = (name: string) => {
    setChannelPrefs((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      try {
        localStorage.setItem(CHANNEL_PREFS_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to persist channel preferences:', err);
      }
      return next;
    });
  };
  const [selectedContent, setSelectedContent] = useState<ContentPiece | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [demoAdsCreated, setDemoAdsCreated] = useState(false);

  // Storage state
  const [storageView, setStorageView] = useState<'grid' | 'list'>('grid');
  const [storageFilter, setStorageFilter] = useState<'all' | 'images' | 'videos' | 'audio' | 'documents'>('all');
  const [storageSortBy, setStorageSortBy] = useState<'date' | 'name' | 'size' | 'type'>('date');
  const [storageSearchQuery, setStorageSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // User Context & Folder Isolation
  const [userContext, setUserContext] = useState<UserContext>(getMockUserContext());
  const [showUserContextSelector, setShowUserContextSelector] = useState(false);

  // User Storage Package & Limits (would come from user profile/subscription in real app)
  const [currentPackage, setCurrentPackage] = useState<'free' | 'starter' | 'professional' | 'enterprise'>('starter');
  const [usedStorage, setUsedStorage] = useState(10.3); // GB used
  
  // Package definitions with storage limits
  const storagePackages = {
    free: {
      name: 'Free',
      storage: 5, // GB
      price: 0,
      features: ['5 GB Storage', 'Basic file types', 'Web upload only', 'Community support']
    },
    starter: {
      name: 'Starter',
      storage: 50, // GB
      price: 19,
      features: ['50 GB Storage', 'All file types', 'Bulk upload', 'Email support', 'Version history (30 days)']
    },
    professional: {
      name: 'Professional',
      storage: 250, // GB
      price: 49,
      features: ['250 GB Storage', 'All file types', 'Advanced upload options', 'Priority support', 'Version history (90 days)', 'Team collaboration']
    },
    enterprise: {
      name: 'Enterprise',
      storage: 1000, // GB (1 TB)
      price: 149,
      features: ['1 TB Storage', 'Unlimited file types', 'Advanced upload options', 'Dedicated support', 'Unlimited version history', 'Advanced team features', 'Custom integrations', 'SLA guarantee']
    }
  };

  const currentLimit = storagePackages[currentPackage].storage;

  // Social Media accounts are managed by the real SocialMediaHub component
  // (rendered in the "Social Accounts" tab) — it connects via Facebook/Instagram
  // OAuth and stores accounts server-side. No demo/placeholder state here.
  const usagePercentage = (usedStorage / currentLimit) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 95;

  // Advanced generation settings
  const [generationSettings, setGenerationSettings] = useState({
    tone: 'professional',
    audience: 'general',
    length: 'medium',
    aiModel: 'gpt-4'
  });

  // AI Video Editing State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [aiVideoSuggestions, setAiVideoSuggestions] = useState<any>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  
  // Photo to Video State
  const [showPhotoToVideo, setShowPhotoToVideo] = useState(false);

  // Music & Audio State
  const [musicAssets, setMusicAssets] = useState<MusicAsset[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicAsset | null>(null);
  const [musicSuggestions, setMusicSuggestions] = useState<MusicSuggestion[]>([]);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [musicMoodFilter, setMusicMoodFilter] = useState<MusicMood | 'all'>('all');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(getDefaultAudioSettings());
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  
  // Playlist State
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<MusicPlaylist | null>(null);
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [activePlaylistView, setActivePlaylistView] = useState<'library' | 'playlists'>('library');
  
  // Beat Sync State
  const [beatMarkers, setBeatMarkers] = useState<BeatMarker[]>([]);
  const [showBeatSync, setShowBeatSync] = useState(false);
  const [beatSyncEnabled, setBeatSyncEnabled] = useState(false);
  const [trimmedAudio, setTrimmedAudio] = useState<TrimmedAudio | null>(null);
  const [transitionPoints, setTransitionPoints] = useState<number[]>([]);
  
  // Live Preview State
  const [showTimeline, setShowTimeline] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewingTrack, setPreviewingTrack] = useState<MusicAsset | null>(null);
  const [managingPlaylist, setManagingPlaylist] = useState<MusicPlaylist | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Separate effect for creating demo ads when company is available
  useEffect(() => {
    console.log('🔵 useEffect triggered. currentCompany:', currentCompany);
    console.log('🔵 currentCompany?.id:', currentCompany?.id);
    const companyId = currentCompany?.id || 'demo-company-001';
    console.log('✅ Using company ID:', companyId, '- calling createDemoAds()');
    createDemoAds(companyId);
  }, [currentCompany?.id]);


  const createDemoAds = async (companyId: string) => {
    // Only create demo ads once per session
    if (demoAdsCreated) {
      console.log('Demo ads already created this session, skipping...');
      return;
    }
    
    console.log('Starting demo ad creation for company:', companyId);
    console.log('Using LOCAL STORAGE (server-free mode)');
    
    try {
      const section1Ads = createDemoAdsSection1();
      const section2Ads = createDemoAdsSection2();
      const section3Ads = createDemoAdsSection3();
      const section4Ads = createDemoAdsSection4();
      const professionalReels = createDemoProfessionalReels();
      const demoAds = [...section1Ads, ...section2Ads, ...section3Ads, ...section4Ads, ...professionalReels];
      console.log(`Generated ${demoAds.length} demo ads to create (S1: ${section1Ads.length}, S2: ${section2Ads.length}, S3: ${section3Ads.length}, S4: ${section4Ads.length}, Reels: ${professionalReels.length})`);
      
      // Get existing content from user-specific storage
      const existingPieces = loadFromUserStorage<any[]>(
        userContext,
        CONTENT_CENTER_KEYS.CONTENT_PIECES,
        []
      );
      
      // Check if demo ads already exist by looking for matching titles
      const existingTitles = new Set(existingPieces.map((p: any) => p.title));
      const adsToCreate = demoAds.filter(ad => !existingTitles.has(ad.title));
      
      if (adsToCreate.length === 0) {
        console.log('All demo ads already exist in localStorage, skipping creation');
        setDemoAdsCreated(true);
        return;
      }
      
      console.log(`Creating ${adsToCreate.length} new ads (${demoAds.length - adsToCreate.length} already exist)`);
      
      // Create each ad and add to localStorage
      const newPieces = [];
      for (let i = 0; i < adsToCreate.length; i++) {
        const ad = adsToCreate[i];
        console.log(`Creating ad ${i + 1}/${adsToCreate.length}: ${ad.title}`);
        
        const contentPiece = {
          id: `content_${companyId}_${Date.now()}_${i}`,
          company_id: companyId,
          title: ad.title,
          content_body: ad.content_body,
          content_format: ad.content_format,
          excerpt: ad.excerpt,
          status: ad.status,
          featured_image_url: ad.featured_image_url,
          is_ai_generated: ad.is_ai_generated,
          ai_generation_metadata: ad.ai_generation_metadata,
          current_workflow_stage: 1,
          total_impressions: 0,
          total_clicks: 0,
          total_engagement: 0,
          total_conversions: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        newPieces.push(contentPiece);
        console.log(`✓ Created ad ${i + 1}`);
      }
      
      // Remove any duplicates from existing pieces (defensive cleanup)
      const uniqueExisting = existingPieces.reduce((acc: any[], piece: any) => {
        if (!acc.some(p => p.title === piece.title)) {
          acc.push(piece);
        }
        return acc;
      }, []);
      
      // Save all pieces to user-specific storage
      const allPieces = [...uniqueExisting, ...newPieces];
      saveToUserStorage(
        userContext,
        CONTENT_CENTER_KEYS.CONTENT_PIECES,
        allPieces
      );
      console.log(`Saved ${newPieces.length} new ads to ${userContext.userType} folder (total: ${allPieces.length})`);
      
      setDemoAdsCreated(true);
      console.log('All demo ads created successfully!');
      
      if (newPieces.length > 0) {
        const reelsCount = newPieces.filter((p: any) => p.content_format === 'video_reel').length;
        const adsCount = newPieces.length - reelsCount;
        toast.success('Professional Content Created! 🎬', {
          description: `Added ${reelsCount} professional reels & ${adsCount} marketing ads to your library`
        });
      }
      
      // Reload data to show new ads
      console.log('Reloading content pieces...');
      await loadData();
    } catch (error) {
      console.error('❌ Error creating demo ads:', error);
      toast.error('Failed to create demo ads. Check console for details.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load content pieces from user-specific storage
      const pieces = loadFromUserStorage<any[]>(
        userContext,
        CONTENT_CENTER_KEYS.CONTENT_PIECES,
        []
      );
      
      console.log(`Loaded ${pieces.length} content pieces from ${userContext.userType} folder`);
      
      // Deduplicate based on title (remove any duplicates)
      const uniquePieces = pieces.reduce((acc: any[], piece: any) => {
        if (!acc.some(p => p.title === piece.title)) {
          acc.push(piece);
        } else {
          console.log(`🗑️ Removing duplicate: ${piece.title}`);
        }
        return acc;
      }, []);
      
      // If we removed duplicates, save the cleaned data back to user storage
      if (uniquePieces.length < pieces.length) {
        console.log(`✨ Cleaned up ${pieces.length - uniquePieces.length} duplicates`);
        saveToUserStorage(
          userContext,
          CONTENT_CENTER_KEYS.CONTENT_PIECES,
          uniquePieces
        );
        toast.success('Duplicates Removed', {
          description: `Cleaned up ${pieces.length - uniquePieces.length} duplicate content items`
        });
      }
      
      console.log(`Showing ${uniquePieces.length} unique content pieces`);
      console.log('Content pieces:', uniquePieces.map((p: any) => ({ id: p.id, title: p.title, format: p.content_format })));
      setContentPieces(uniquePieces);

      // Hydrate from the KV-backed server (best effort). Server pieces take
      // precedence; anything only in localStorage is preserved so offline-created
      // content is never lost. Requires an active company for the server query.
      try {
        const serverPieces = await fetchContentPieces();
        if (Array.isArray(serverPieces) && serverPieces.length > 0) {
          const byKey = new Map<string, any>();
          // Key by title (consistent with the local dedup above) so a piece created
          // offline and later synced doesn't appear twice under different ids. Seed
          // with local pieces first, then overwrite with the server versions.
          for (const p of uniquePieces) byKey.set(p.title || p.id, p);
          for (const p of serverPieces) byKey.set(p.title || p.id, p);
          const merged = Array.from(byKey.values()).sort(
            (a, b) => (b.created_at || '').localeCompare(a.created_at || '')
          );
          setContentPieces(merged);
          saveToUserStorage(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, merged);
          console.log(`✅ Hydrated ${serverPieces.length} pieces from server; ${merged.length} total after merge`);
        }
      } catch (hydrateErr) {
        console.error('Server hydration of content pieces failed (using localStorage):', hydrateErr);
      }
      
      // Use empty arrays for templates and channels to avoid database errors
      const templatesData: ContentTemplate[] = [];
      const channelsData: ContentChannel[] = [];
      
      // If no templates exist, add default top-rated templates
      if (templatesData.length === 0) {
        const defaultTemplates: ContentTemplate[] = [
          {
            id: 'template-1',
            company_id: companyInfo.id,
            name: 'Product Launch Announcement',
            description: 'Professional template for announcing new products or services with compelling CTAs',
            content_type: 'social_media',
            template_body: '🚀 Exciting News! We\'re thrilled to announce [PRODUCT_NAME]!\n\n✨ [KEY_FEATURE_1]\n✨ [KEY_FEATURE_2]\n✨ [KEY_FEATURE_3]\n\n[CALL_TO_ACTION]\n\n#ProductLaunch #Innovation #NewRelease',
            variables: ['PRODUCT_NAME', 'KEY_FEATURE_1', 'KEY_FEATURE_2', 'KEY_FEATURE_3', 'CALL_TO_ACTION'],
            ai_prompt: 'Generate an engaging product launch announcement highlighting key features and benefits',
            suggested_channels: ['facebook', 'linkedin', 'twitter', 'instagram'],
            target_word_count_min: 50,
            target_word_count_max: 150,
            brand_guideline_ids: [],
            usage_count: 847,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-2',
            company_id: companyInfo.id,
            name: 'Customer Success Story',
            description: 'Showcase real customer testimonials and results to build trust and credibility',
            content_type: 'blog',
            template_body: '# How [CUSTOMER_NAME] Achieved [RESULT]\n\n## The Challenge\n[CHALLENGE_DESCRIPTION]\n\n## The Solution\n[SOLUTION_DESCRIPTION]\n\n## The Results\n✅ [RESULT_1]\n✅ [RESULT_2]\n✅ [RESULT_3]\n\n> "[CUSTOMER_QUOTE]" - [CUSTOMER_NAME], [CUSTOMER_TITLE]\n\n## Conclusion\n[CONCLUSION]',
            variables: ['CUSTOMER_NAME', 'RESULT', 'CHALLENGE_DESCRIPTION', 'SOLUTION_DESCRIPTION', 'RESULT_1', 'RESULT_2', 'RESULT_3', 'CUSTOMER_QUOTE', 'CUSTOMER_TITLE', 'CONCLUSION'],
            ai_prompt: 'Write a compelling customer success story highlighting challenges, solutions, and measurable results',
            suggested_channels: ['blog', 'linkedin', 'email'],
            target_word_count_min: 500,
            target_word_count_max: 1000,
            brand_guideline_ids: [],
            usage_count: 623,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-3',
            company_id: companyInfo.id,
            name: 'Weekly Newsletter',
            description: 'Engaging weekly digest template with curated content, updates, and CTAs',
            content_type: 'email',
            template_body: 'Subject: [WEEK_THEME] - Your Weekly Update from [COMPANY_NAME]\n\nHi [FIRST_NAME],\n\nHere\'s what\'s new this week:\n\n📰 **Top Story**\n[TOP_STORY_HEADLINE]\n[TOP_STORY_SUMMARY]\n[READ_MORE_LINK]\n\n💡 **Quick Tips**\n• [TIP_1]\n• [TIP_2]\n• [TIP_3]\n\n📅 **Upcoming Events**\n[EVENT_DETAILS]\n\n🎯 **Featured Resource**\n[RESOURCE_DESCRIPTION]\n[RESOURCE_LINK]\n\nBest regards,\n[SENDER_NAME]\n[COMPANY_NAME]',
            variables: ['WEEK_THEME', 'COMPANY_NAME', 'FIRST_NAME', 'TOP_STORY_HEADLINE', 'TOP_STORY_SUMMARY', 'READ_MORE_LINK', 'TIP_1', 'TIP_2', 'TIP_3', 'EVENT_DETAILS', 'RESOURCE_DESCRIPTION', 'RESOURCE_LINK', 'SENDER_NAME'],
            ai_prompt: 'Create an engaging weekly newsletter with valuable content and clear CTAs',
            suggested_channels: ['email'],
            target_word_count_min: 200,
            target_word_count_max: 400,
            brand_guideline_ids: [],
            usage_count: 1203,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-4',
            company_id: companyInfo.id,
            name: 'SEO Blog Post',
            description: 'SEO-optimized blog template with proper heading structure and keyword placement',
            content_type: 'blog',
            template_body: '# [MAIN_KEYWORD]: The Complete Guide\n\n## Introduction\n[HOOK] In this comprehensive guide, you\'ll learn everything about [MAIN_KEYWORD].\n\n## What is [MAIN_KEYWORD]?\n[DEFINITION]\n\n## Why [MAIN_KEYWORD] Matters\n[BENEFIT_1]\n[BENEFIT_2]\n[BENEFIT_3]\n\n## How to [ACTION_RELATED_TO_KEYWORD]\n### Step 1: [STEP_1_TITLE]\n[STEP_1_DESCRIPTION]\n\n### Step 2: [STEP_2_TITLE]\n[STEP_2_DESCRIPTION]\n\n### Step 3: [STEP_3_TITLE]\n[STEP_3_DESCRIPTION]\n\n## Best Practices\n[BEST_PRACTICES]\n\n## Common Mistakes to Avoid\n[MISTAKES]\n\n## Conclusion\n[SUMMARY_AND_CTA]\n\n## FAQs\n**Q: [QUESTION_1]**\nA: [ANSWER_1]\n\n**Q: [QUESTION_2]**\nA: [ANSWER_2]',
            variables: ['MAIN_KEYWORD', 'HOOK', 'DEFINITION', 'BENEFIT_1', 'BENEFIT_2', 'BENEFIT_3', 'ACTION_RELATED_TO_KEYWORD', 'STEP_1_TITLE', 'STEP_1_DESCRIPTION', 'STEP_2_TITLE', 'STEP_2_DESCRIPTION', 'STEP_3_TITLE', 'STEP_3_DESCRIPTION', 'BEST_PRACTICES', 'MISTAKES', 'SUMMARY_AND_CTA', 'QUESTION_1', 'ANSWER_1', 'QUESTION_2', 'ANSWER_2'],
            ai_prompt: 'Write a comprehensive, SEO-optimized blog post with proper structure and keyword placement',
            suggested_channels: ['blog', 'website'],
            target_word_count_min: 1500,
            target_word_count_max: 2500,
            brand_guideline_ids: [],
            usage_count: 982,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-5',
            company_id: companyInfo.id,
            name: 'Limited Time Offer',
            description: 'Create urgency with time-sensitive promotional content that drives conversions',
            content_type: 'social_media',
            template_body: '⏰ LIMITED TIME OFFER! ⏰\n\n[OFFER_DESCRIPTION]\n\n🎁 Get [DISCOUNT_AMOUNT] OFF when you [ACTION]\n\n⚡️ But hurry! Offer ends [END_DATE]\n\n✨ Why you\'ll love it:\n• [BENEFIT_1]\n• [BENEFIT_2]\n• [BENEFIT_3]\n\n👉 [CALL_TO_ACTION]\n\n[PROMO_CODE]\n\n#Sale #LimitedOffer #DontMissOut',
            variables: ['OFFER_DESCRIPTION', 'DISCOUNT_AMOUNT', 'ACTION', 'END_DATE', 'BENEFIT_1', 'BENEFIT_2', 'BENEFIT_3', 'CALL_TO_ACTION', 'PROMO_CODE'],
            ai_prompt: 'Create an urgent, compelling promotional offer that drives immediate action',
            suggested_channels: ['facebook', 'instagram', 'twitter', 'email'],
            target_word_count_min: 60,
            target_word_count_max: 120,
            brand_guideline_ids: [],
            usage_count: 1456,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-6',
            company_id: companyInfo.id,
            name: 'Educational How-To Guide',
            description: 'Step-by-step instructional content that provides genuine value and establishes expertise',
            content_type: 'video',
            template_body: '🎓 How to [GOAL] in [TIMEFRAME]\n\n📋 What you\'ll need:\n• [REQUIREMENT_1]\n• [REQUIREMENT_2]\n• [REQUIREMENT_3]\n\n📝 Step-by-step:\n\n1️⃣ [STEP_1]\n2️⃣ [STEP_2]\n3️⃣ [STEP_3]\n4️⃣ [STEP_4]\n5️⃣ [STEP_5]\n\n💡 Pro tip: [PRO_TIP]\n\n⚠️ Common mistake: [COMMON_MISTAKE]\n\n✅ You\'re done! [FINAL_RESULT]\n\n👉 Try it yourself and let us know how it goes!\n\n#Tutorial #HowTo #LearnWithUs',
            variables: ['GOAL', 'TIMEFRAME', 'REQUIREMENT_1', 'REQUIREMENT_2', 'REQUIREMENT_3', 'STEP_1', 'STEP_2', 'STEP_3', 'STEP_4', 'STEP_5', 'PRO_TIP', 'COMMON_MISTAKE', 'FINAL_RESULT'],
            ai_prompt: 'Create a clear, actionable how-to guide that teaches a specific skill or process',
            suggested_channels: ['youtube', 'tiktok', 'instagram', 'blog'],
            target_word_count_min: 150,
            target_word_count_max: 300,
            brand_guideline_ids: [],
            usage_count: 734,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-7',
            company_id: companyInfo.id,
            name: 'Employee Spotlight',
            description: 'Humanize your brand by showcasing team members and company culture',
            content_type: 'social_media',
            template_body: '⭐ TEAM SPOTLIGHT ⭐\n\nMeet [EMPLOYEE_NAME], our [JOB_TITLE]!\n\n👤 About [FIRST_NAME]:\n📍 Location: [LOCATION]\n🎓 Background: [BACKGROUND]\n⏰ Time at company: [TENURE]\n\n💬 "[FAVORITE_QUOTE]"\n\n🎯 What [FIRST_NAME] does:\n[JOB_DESCRIPTION]\n\n🌟 Fun fact: [FUN_FACT]\n\n❤️ Why [FIRST_NAME] loves working here:\n"[TESTIMONIAL]"\n\n👏 Thanks for all you do, [FIRST_NAME]!\n\n#TeamSpotlight #CompanyCulture #MeetTheTeam',
            variables: ['EMPLOYEE_NAME', 'JOB_TITLE', 'FIRST_NAME', 'LOCATION', 'BACKGROUND', 'TENURE', 'FAVORITE_QUOTE', 'JOB_DESCRIPTION', 'FUN_FACT', 'TESTIMONIAL'],
            ai_prompt: 'Create an engaging employee spotlight that showcases personality and company culture',
            suggested_channels: ['linkedin', 'instagram', 'facebook'],
            target_word_count_min: 100,
            target_word_count_max: 200,
            brand_guideline_ids: [],
            usage_count: 589,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-8',
            company_id: companyInfo.id,
            name: 'Industry Trends Report',
            description: 'Position your brand as a thought leader with data-driven industry insights',
            content_type: 'blog',
            template_body: '# [YEAR] [INDUSTRY] Trends: What to Expect\n\n## Executive Summary\n[SUMMARY_PARAGRAPH]\n\n## Key Statistics\n📊 [STAT_1]\n📊 [STAT_2]\n📊 [STAT_3]\n\n## Top Trends to Watch\n\n### Trend #1: [TREND_1_TITLE]\n[TREND_1_DESCRIPTION]\n**Impact:** [TREND_1_IMPACT]\n**What to do:** [TREND_1_ACTION]\n\n### Trend #2: [TREND_2_TITLE]\n[TREND_2_DESCRIPTION]\n**Impact:** [TREND_2_IMPACT]\n**What to do:** [TREND_2_ACTION]\n\n### Trend #3: [TREND_3_TITLE]\n[TREND_3_DESCRIPTION]\n**Impact:** [TREND_3_IMPACT]\n**What to do:** [TREND_3_ACTION]\n\n## Expert Predictions\n> "[EXPERT_QUOTE]" - [EXPERT_NAME], [EXPERT_TITLE]\n\n## How to Prepare\n[PREPARATION_STEPS]\n\n## Conclusion\n[CONCLUSION]\n\n## Resources\n[ADDITIONAL_RESOURCES]',
            variables: ['YEAR', 'INDUSTRY', 'SUMMARY_PARAGRAPH', 'STAT_1', 'STAT_2', 'STAT_3', 'TREND_1_TITLE', 'TREND_1_DESCRIPTION', 'TREND_1_IMPACT', 'TREND_1_ACTION', 'TREND_2_TITLE', 'TREND_2_DESCRIPTION', 'TREND_2_IMPACT', 'TREND_2_ACTION', 'TREND_3_TITLE', 'TREND_3_DESCRIPTION', 'TREND_3_IMPACT', 'TREND_3_ACTION', 'EXPERT_QUOTE', 'EXPERT_NAME', 'EXPERT_TITLE', 'PREPARATION_STEPS', 'CONCLUSION', 'ADDITIONAL_RESOURCES'],
            ai_prompt: 'Write an authoritative industry trends report with data-driven insights and actionable recommendations',
            suggested_channels: ['blog', 'linkedin', 'email'],
            target_word_count_min: 1200,
            target_word_count_max: 2000,
            brand_guideline_ids: [],
            usage_count: 412,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-9',
            company_id: companyInfo.id,
            name: 'Event Promotion',
            description: 'Drive event registrations with compelling promotional content across all channels',
            content_type: 'social_media',
            template_body: '🎉 YOU\'RE INVITED! 🎉\n\n[EVENT_NAME]\n\n📅 Date: [EVENT_DATE]\n🕐 Time: [EVENT_TIME]\n📍 Location: [EVENT_LOCATION]\n\n✨ What to expect:\n• [HIGHLIGHT_1]\n• [HIGHLIGHT_2]\n• [HIGHLIGHT_3]\n\n🎤 Featured speakers:\n• [SPEAKER_1]\n• [SPEAKER_2]\n\n🎁 Special perks:\n[SPECIAL_OFFERS]\n\n💰 Pricing: [PRICING_INFO]\n⏰ Early bird discount: [EARLY_BIRD_DETAILS]\n\n👉 Reserve your spot: [REGISTRATION_LINK]\n\nSpace is limited - register now!\n\n#Event #Networking #DontMiss',
            variables: ['EVENT_NAME', 'EVENT_DATE', 'EVENT_TIME', 'EVENT_LOCATION', 'HIGHLIGHT_1', 'HIGHLIGHT_2', 'HIGHLIGHT_3', 'SPEAKER_1', 'SPEAKER_2', 'SPECIAL_OFFERS', 'PRICING_INFO', 'EARLY_BIRD_DETAILS', 'REGISTRATION_LINK'],
            ai_prompt: 'Create an exciting event promotion that drives registrations and creates FOMO',
            suggested_channels: ['facebook', 'linkedin', 'instagram', 'twitter', 'email'],
            target_word_count_min: 120,
            target_word_count_max: 200,
            brand_guideline_ids: [],
            usage_count: 891,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'template-10',
            company_id: companyInfo.id,
            name: 'Behind-the-Scenes Content',
            description: 'Build authenticity and connection by showing your company\'s human side',
            content_type: 'video',
            template_body: '🎬 BEHIND THE SCENES 🎬\n\nEver wondered [CURIOSITY_HOOK]?\n\nToday we\'re taking you behind the scenes of [PROCESS_OR_ACTIVITY]!\n\n🔍 What goes into it:\n• [STEP_1]\n• [STEP_2]\n• [STEP_3]\n\n👥 Meet the team:\n[TEAM_INTRODUCTION]\n\n⏱️ Time it takes: [DURATION]\n\n💡 Interesting fact: [FUN_FACT]\n\n❤️ Why we love it:\n"[TEAM_QUOTE]"\n\n👉 Want to see more behind-the-scenes content? Let us know in the comments!\n\n#BehindTheScenes #CompanyCulture #Transparency',
            variables: ['CURIOSITY_HOOK', 'PROCESS_OR_ACTIVITY', 'STEP_1', 'STEP_2', 'STEP_3', 'TEAM_INTRODUCTION', 'DURATION', 'FUN_FACT', 'TEAM_QUOTE'],
            ai_prompt: 'Create engaging behind-the-scenes content that builds authenticity and connection',
            suggested_channels: ['instagram', 'tiktok', 'youtube', 'facebook'],
            target_word_count_min: 100,
            target_word_count_max: 180,
            brand_guideline_ids: [],
            usage_count: 1067,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setTemplates(defaultTemplates);
      } else {
        setTemplates(templatesData);
      }
      
      setChannels(channelsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load content data');
    } finally {
      setLoading(false);
    }
  };

  const handleContentCreated = async (contentId: string) => {
    setShowCreator(false);
    await loadData();
    
    const content = await fetchContentPiece(contentId);
    if (content) {
      setSelectedContent(content);
      setActiveTab('library');
    }
  };

  const handleContentSelect = async (contentId: string) => {
    // Read from user-specific storage
    const pieces = loadFromUserStorage<any[]>(
      userContext,
      CONTENT_CENTER_KEYS.CONTENT_PIECES,
      []
    );
    
    const content = pieces.find((p: any) => p.id === contentId);
    if (content) {
      setSelectedContent(content);
      setShowPreview(true);
      console.log('Selected content:', content.title);
    } else {
      console.error('Content not found:', contentId);
      toast.error('Content not found');
    }
  };

  const handleStatusChange = async () => {
    await loadData();
    if (selectedContent) {
      const updated = await fetchContentPiece(selectedContent.id);
      setSelectedContent(updated);
    }
  };

  const handleEditContent = () => {
    if (selectedContent) {
      setEditForm({
        title: selectedContent.title,
        excerpt: selectedContent.excerpt || '',
        content_body: selectedContent.content_body,
        featured_image_url: selectedContent.featured_image_url || '',
        status: selectedContent.status,
        content_format: selectedContent.content_format
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedContent || !editForm) return;

    try {
      // Load from user-specific storage
      const pieces = loadFromUserStorage<any[]>(
        userContext,
        CONTENT_CENTER_KEYS.CONTENT_PIECES,
        []
      );

      // Find and update the content piece
      const updatedPieces = pieces.map((p: any) => {
        if (p.id === selectedContent.id) {
          return {
            ...p,
            title: editForm.title,
            excerpt: editForm.excerpt,
            content_body: editForm.content_body,
            featured_image_url: editForm.featured_image_url,
            status: editForm.status,
            content_format: editForm.content_format,
            updated_at: new Date().toISOString()
          };
        }
        return p;
      });

      // Save back to user-specific storage
      saveToUserStorage(
        userContext,
        CONTENT_CENTER_KEYS.CONTENT_PIECES,
        updatedPieces
      );

      // Update state
      const updatedContent = updatedPieces.find((p: any) => p.id === selectedContent.id);
      setSelectedContent(updatedContent);
      setIsEditing(false);
      setEditForm(null);

      // Best-effort sync to the KV-backed server so edits persist beyond this browser.
      try {
        await updateContentPiece(selectedContent.id, {
          title: editForm.title,
          excerpt: editForm.excerpt,
          content_body: editForm.content_body,
          featured_image_url: editForm.featured_image_url,
          status: editForm.status as any,
          content_format: editForm.content_format,
        });
      } catch (syncErr) {
        console.error('Server sync of content edit failed (saved locally):', syncErr);
      }

      // Reload data
      await loadData();

      toast.success('Content Updated!', {
        description: 'Your changes have been saved successfully'
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  // Calculate statistics
  const stats = {
    total: contentPieces.length,
    draft: contentPieces.filter(p => p.status === 'draft').length,
    pending: contentPieces.filter(p => p.status === 'pending_review').length,
    approved: contentPieces.filter(p => p.status === 'approved').length,
    published: contentPieces.filter(p => p.status === 'published').length,
    reels: contentPieces.filter(p => p.content_format === 'video_reel').length,
    totalImpressions: contentPieces.reduce((sum, p) => sum + (p.total_impressions || 0), 0),
    totalClicks: contentPieces.reduce((sum, p) => sum + (p.total_clicks || 0), 0),
    totalEngagement: contentPieces.reduce((sum, p) => sum + (p.total_engagement || 0), 0),
  };

  // Content type templates for quick generation
  const contentTypes = [
    { id: 'video_reel', name: 'Professional Reel', icon: Film, color: 'pink', description: 'Instagram Reels, TikTok & YouTube Shorts scripts' },
    { id: 'blog', name: 'Blog Post', icon: FileText, color: 'blue', description: 'Long-form article with SEO optimization' },
    { id: 'social', name: 'Social Media Post', icon: Share2, color: 'purple', description: 'Engaging social content for all platforms' },
    { id: 'email', name: 'Email Campaign', icon: Mail, color: 'green', description: 'Professional email newsletter' },
    { id: 'video', name: 'Video Script', icon: Video, color: 'red', description: 'Video content script and storyboard' },
    { id: 'image', name: 'Marketing Image', icon: ImageIcon, color: 'orange', description: 'AI-generated marketing visuals' },
    { id: 'ad', name: 'Advertisement', icon: Target, color: 'yellow', description: 'Paid advertising copy and creative' },
  ];

  const filteredContent = contentPieces.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         content.content_body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || content.status === statusFilter;
    // Match type: for 'ad' filter, match any content_format starting with 'ad_'
    const matchesType = typeFilter === 'all' || 
                       (typeFilter === 'ad' && content.content_format?.startsWith('ad_')) ||
                       content.content_format === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      case 'pending_review': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'approved': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'published': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'archived': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getTypeIcon = (format: string) => {
    // Extract base type from format (e.g., 'ad_carousel' -> 'ad')
    const baseType = format?.startsWith('ad_') ? 'ad' : format;
    const typeObj = contentTypes.find(t => t.id === baseType);
    return typeObj?.icon || FileText;
  };

  // AI Content Generation Templates
  /**
   * Real AI generation, via the OpenAI-backed content studio the server already
   * runs (`/content-studio/compose` — brand voice, platform specs and a
   * compliance score).
   *
   * Everything below used to be produced by generateContentText(), which
   * returns fixed template strings with the company name interpolated. That is
   * fine as an offline fallback, but it was being presented as AI output behind
   * simulated "Analyzing brand context…" progress steps, so the same generic
   * paragraph came back for every topic.
   *
   * Returns null when the service cannot be reached, so the caller can fall
   * back to a template AND say so, rather than passing boilerplate off as
   * generated work.
   */
  const composeWithAI = async (
    type: string,
    settings: typeof generationSettings,
    topic: string,
  ): Promise<{ text: string; complianceScore?: number; complianceIssues?: string[] } | null> => {
    // Map the studio's content types onto what the compose endpoint expects.
    // These keys must exist in PLATFORM_SPEC on the server, or the request
    // silently falls back to the Instagram spec and a blog post comes back as
    // a hashtag-laden caption.
    const platformFor: Record<string, string> = {
      social: 'instagram', ad: 'ad', video: 'youtube',
      blog: 'blog', email: 'email', image: 'instagram',
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/content-studio/compose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
        },
        body: JSON.stringify({
          topic,
          platform: platformFor[type] || 'instagram',
          contentType: type,
          tone: `${settings.tone}, written for ${settings.audience}`,
          includeHashtags: type === 'social' || type === 'ad',
          context: `Length: ${settings.length}. Company: ${companyInfo.name}, ${companyInfo.address.city} ${companyInfo.address.state}. Contact ${companyInfo.contact.phone} / ${companyInfo.contact.website}.`,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (!data?.success) return null;

      const body = String(data.caption || '').trim();
      if (!body) return null;
      const tags = Array.isArray(data.hashtags) && data.hashtags.length
        ? '\n\n' + data.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
        : '';
      const title = String(data.title || '').trim();

      return {
        text: (title ? `${title}\n\n` : '') + body + tags,
        complianceScore: typeof data.complianceScore === 'number' ? data.complianceScore : undefined,
        complianceIssues: Array.isArray(data.complianceIssues) ? data.complianceIssues : undefined,
      };
    } catch (err) {
      console.error('[ContentCenter] compose failed:', err);
      return null;
    }
  };

  const generateContentText = (type: string, settings: typeof generationSettings) => {
    const { tone, audience, length } = settings;

    const templates: Record<string, any> = {
      blog: {
        short: `Transform Your Space: Expert ${companyInfo.name} Tips\n\nDiscover how professional craftsmanship can elevate your home or business. Our team specializes in bringing your vision to life with precision and care.\n\nKey benefits:\n• Professional quality workmanship\n• Attention to detail\n• Customer satisfaction guaranteed\n\nContact us today to discuss your project!`,
        medium: `Transform Your Space with ${companyInfo.name}\n\nAre you ready to elevate your property to the next level? At ${companyInfo.name}, we understand that quality craftsmanship makes all the difference. Our expert team brings years of experience to every project, ensuring exceptional results that exceed expectations.\n\nWhy Choose Us?\n\n• Expert Craftsmanship: Our skilled professionals deliver superior quality on every project\n• Personalized Service: We work closely with you to bring your vision to life\n• Reliable & Timely: We respect your time and complete projects on schedule\n• Quality Materials: We use only the best materials for lasting results\n\nOur Services Include:\n- Residential renovations and remodeling\n- Commercial construction projects\n- Custom design solutions\n- Property improvements and upgrades\n\nWhat Our Clients Say:\n"Working with ${companyInfo.name} was an exceptional experience. The attention to detail and professionalism exceeded our expectations!" - Satisfied Customer\n\nReady to Get Started?\n\nContact us today for a free consultation. Let's discuss how we can transform your space into something extraordinary.\n\nCall: ${companyInfo.contact.phone}\nEmail: ${companyInfo.contact.email}\nVisit: ${companyInfo.contact.website}`,
        long: `Complete Guide to Professional Home Improvements with ${companyInfo.name}\n\nIntroduction\n\nTransforming your space requires expertise, dedication, and a commitment to excellence. At ${companyInfo.name}, we've built our reputation on delivering outstanding results that stand the test of time. This comprehensive guide will help you understand the value of professional craftsmanship and how it can enhance your property.\n\nThe ${companyInfo.name} Difference\n\nWith years of experience serving our community, we've perfected our approach to every project. Our team combines traditional craftsmanship with modern techniques to deliver results that exceed expectations.\n\nOur Core Values:\n• Quality First: We never compromise on materials or workmanship\n��� Customer Focus: Your satisfaction is our top priority\n• Transparency: Clear communication throughout every project\n• Innovation: Staying current with industry best practices\n\nComprehensive Services\n\nWe offer a full range of professional services designed to meet your needs:\n\nResidential Projects\n- Kitchen and bathroom remodeling\n- Room additions and expansions\n- Basement finishing\n- Exterior improvements\n- Custom cabinetry and millwork\n\nCommercial Solutions\n- Office renovations\n- Retail space improvements\n- Restaurant buildouts\n- Facility upgrades\n\nOur Process\n\n1. Initial Consultation: We discuss your vision and requirements\n2. Design Phase: Detailed planning and material selection\n3. Transparent Quoting: Clear, itemized estimates\n4. Professional Execution: Skilled craftsmen bring plans to life\n5. Quality Assurance: Thorough inspection and your satisfaction\n\nWhy Professional Matters\n\nChoosing professional services ensures:\n- Proper permits and code compliance\n- Quality materials and techniques\n- Warranty protection\n- Timely project completion\n- Long-lasting results\n\nClient Success Stories\n\n"${companyInfo.name} transformed our outdated kitchen into a modern masterpiece. The attention to detail was incredible!" - Happy Homeowner\n\n"Professional, reliable, and exceptional quality. We couldn't be happier with the results." - Business Owner\n\nGet Started Today\n\nReady to begin your transformation? Contact ${companyInfo.name} for a free consultation.\n\nPhone: ${companyInfo.contact.phone}\nEmail: ${companyInfo.contact.email}\nWebsite: ${companyInfo.contact.website}\nAddress: ${companyInfo.address.line1}, ${companyInfo.address.city}, ${companyInfo.address.state}`
      },
      social: {
        short: `🏠 Transform your space with ${companyInfo.name}! ✨\n\nQuality craftsmanship meets exceptional service. Let's bring your vision to life!\n\n📞 ${companyInfo.contact.phone}\n🌐 ${companyInfo.contact.website}\n\n#HomeImprovement #Construction #Renovation #QualityWork`,
        medium: `🎯 Ready for a transformation? ${companyInfo.name} is here to help! 🏗️\n\nWe specialize in:\n✅ Professional renovations\n✅ Custom design solutions\n✅ Quality craftsmanship\n✅ Timely project completion\n\nYour dream space is just a call away! 📞\n\n👉 Contact us: ${companyInfo.contact.phone}\n🌐 Learn more: ${companyInfo.contact.website}\n\n#${companyInfo.name.replace(/\s/g, '')} #HomeRenovation #ProfessionalConstruction #QualityCraftsmanship #DreamHome`,
        long: `✨ TRANSFORM YOUR SPACE TODAY! ✨\n\nAt ${companyInfo.name}, we believe every space has potential. Our expert team brings years of experience to create stunning results that exceed expectations.\n\n🔨 What We Offer:\n• Residential Renovations\n• Commercial Construction\n• Custom Design Solutions\n• Expert Craftsmanship\n• Quality Materials\n• Reliable Service\n\n💡 Why Choose Us?\n✅ Licensed & Insured\n✅ Experienced Professionals\n✅ Attention to Detail\n✅ Customer Satisfaction\n✅ Competitive Pricing\n✅ Warranty Protection\n\n🌟 What Our Clients Say:\n"Working with ${companyInfo.name} was incredible! Professional, reliable, and the results are stunning!" ⭐⭐⭐⭐⭐\n\n📞 Ready to get started?\nCall: ${companyInfo.contact.phone}\n📧 Email: ${companyInfo.contact.email}\n🌐 Visit: ${companyInfo.contact.website}\n📍 ${companyInfo.address.city}, ${companyInfo.address.state}\n\n💬 DM us or comment below to schedule your FREE consultation!\n\n#${companyInfo.name.replace(/\s/g, '')} #Construction #Renovation #HomeImprovement #CommercialConstruction #QualityWork #LocalBusiness #${companyInfo.address.city}Business`
      },
      email: {
        medium: `Subject: Transform Your Space with ${companyInfo.name}\n\n---\n\nDear Valued Customer,\n\nAre you ready to elevate your property? At ${companyInfo.name}, we're committed to delivering exceptional results that bring your vision to life.\n\nOur Services Include:\n• Professional Renovations\n• Custom Design Solutions\n• Quality Craftsmanship\n• Reliable & Timely Service\n\nWhy Choose ${companyInfo.name}?\n✓ Years of experience\n✓ Licensed & insured professionals\n✓ Quality materials and workmanship\n✓ Customer satisfaction guaranteed\n\nSpecial Offer: Schedule a consultation this month and receive a complimentary project assessment!\n\nReady to Get Started?\nContact us today:\n\nPhone: ${companyInfo.contact.phone}\nEmail: ${companyInfo.contact.email}\nWebsite: ${companyInfo.contact.website}\n\nWe look forward to working with you!\n\nBest regards,\nThe ${companyInfo.name} Team\n\n---\n\n${companyInfo.legalName}\n${companyInfo.address.line1}\n${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.zipCode}\n${companyInfo.tax.taxLabel}: ${companyInfo.tax.taxId}`
      },
      video: {
        medium: `Video Script: ${companyInfo.name} - Quality You Can Trust\n\nDURATION: 60 seconds\n\n[SCENE 1 - Opening]\n(0-10 seconds)\nVisual: Company logo animation\nVoiceover: "Looking for quality craftsmanship you can trust?"\n\n[SCENE 2 - Introduction]\n(10-20 seconds)\nVisual: Team at work, professional tools\nVoiceover: "At ${companyInfo.name}, we bring years of experience to every project."\n\n[SCENE 3 - Services]\n(20-35 seconds)\nVisual: Before/after transformations\nVoiceover: "From residential renovations to commercial projects, we deliver exceptional results that exceed expectations."\n\n[SCENE 4 - Benefits]\n(35-45 seconds)\nVisual: Happy clients, quality work close-ups\nVoiceover: "Licensed professionals. Quality materials. Customer satisfaction guaranteed."\n\n[SCENE 5 - Call to Action]\n(45-60 seconds)\nVisual: Contact information on screen\nVoiceover: "Ready to transform your space? Contact ${companyInfo.name} today for a free consultation."\n\nOn-screen text:\n${companyInfo.contact.phone}\n${companyInfo.contact.website}\n\n[END]`
      },
      ad: {
        short: `🏗️ ${companyInfo.name} 🏗️\n\nQUALITY CRAFTSMANSHIP • EXPERT SERVICE • GUARANTEED RESULTS\n\n✨ Transform Your Space Today! ✨\n\n📞 Call Now: ${companyInfo.contact.phone}\n🌐 Visit: ${companyInfo.contact.website}\n\n${companyInfo.address.city}, ${companyInfo.address.state}\nLicensed & Insured | ${companyInfo.tax.taxLabel}: ${companyInfo.tax.taxId}\n\n⭐ FREE Consultation - Limited Time! ⭐`
      },
      video_reel: {
        medium: `🎬 PROFESSIONAL REEL GENERATED!\n\nThis will use the advanced Professional Reel Generator to create platform-specific scripts for Instagram Reels, TikTok, and YouTube Shorts.\n\nThe AI will generate:\n✓ Hook (0-3 seconds)\n✓ Problem/Setup (3-15 seconds)\n✓ Transformation/Solution (15-35 seconds)\n✓ Reveal/Payoff (35-42 seconds)\n✓ Call-to-Action (42-45 seconds)\n\nPlatform-optimized caption with hashtags included.\n\nNote: Full professional script will be generated using AI Content Studio.`
      }
    };

    const contentForType = templates[type] || templates.blog;
    return contentForType[length] || contentForType.medium || contentForType.short;
  };

  const generateAIContent = async (type: string) => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const typeObj = contentTypes.find(t => t.id === type);
    
    toast.info(`🎨 AI Processing Started`, {
      description: `Generating ${typeObj?.name || 'content'} using ${companyInfo.name} branding...`
    });

    // Progress now tracks real work rather than sleeps. The old version stepped
    // 25→50→75→100 on timers while the "content" was a fixed template, so the
    // brand-analysis and SEO messages described work that never happened.
    setGenerationProgress(20);

    // What the piece should actually be about. Without a brief every request
    // would return the same generic company blurb — which is exactly what the
    // template path did.
    const brief = (generationSettings as any).topic?.trim?.()
      || (generationSettings as any).prompt?.trim?.()
      || `${typeObj?.name || 'content'} for ${companyInfo.name}, a ${companyInfo.industry || 'construction and property services'} company in ${companyInfo.address.city}, ${companyInfo.address.state}`;

    setGenerationProgress(45);
    const ai = await composeWithAI(type, generationSettings, brief);
    setGenerationProgress(85);

    // Fall back to the offline template if the service is unreachable — but say
    // so plainly. Presenting boilerplate as AI output is what made this feature
    // look functional while producing the same paragraph every time.
    const usedAI = Boolean(ai?.text);
    const contentText = ai?.text || generateContentText(type, generationSettings);

    if (!usedAI) {
      toast.error('AI service unavailable — inserted a starter template instead', {
        description: 'This is a generic draft, not generated content. Try again, or edit it directly.',
        duration: 8000,
      });
    } else if (typeof ai?.complianceScore === 'number') {
      const issues = ai.complianceIssues?.length
        ? ` · ${ai.complianceIssues.length} suggestion${ai.complianceIssues.length === 1 ? '' : 's'}`
        : '';
      toast.info(`Brand compliance: ${ai.complianceScore}/100${issues}`, {
        description: ai.complianceIssues?.slice(0, 2).join(' ') || 'Matches your brand voice.',
        duration: 7000,
      });
    }

    setGenerationProgress(100);

    // Create the new content piece — save to localStorage + try backend
    try {
      const newPiece = {
        id: `local_${Date.now()}`,
        title: `${typeObj?.name}: ${companyInfo.name} - ${new Date().toLocaleDateString()}`,
        content: contentText,
        content_body: contentText,
        content_format: type,
        excerpt: contentText.substring(0, 200),
        status: 'draft',
        // Honest: only true when the content studio actually produced this.
        // A template fallback is labelled as such so the library does not fill
        // up with boilerplate marked "AI generated".
        is_ai_generated: usedAI,
        created_at: new Date().toISOString(),
        tags: [type, usedAI ? 'ai-generated' : 'template-draft'],
      };

      // Always save to localStorage first (works without company setup)
      saveToUserStorage(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, [
        newPiece,
        ...loadFromUserStorage<any[]>(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, []),
      ]);
      setContentPieces(prev => [newPiece, ...prev]);

      // Also try backend (non-blocking, best effort)
      try {
        await createContentPiece({
          title: newPiece.title,
          content_body: contentText,
          content_format: type,
          excerpt: newPiece.excerpt,
          status: 'draft',
          is_ai_generated: usedAI,
          ai_generation_metadata: {
            tone: generationSettings.tone,
            audience: generationSettings.audience,
            length: generationSettings.length,
            // Record what actually produced it, plus the brand-compliance
            // grade the studio returned, so a reviewer can see why a piece
            // scored the way it did instead of guessing.
            source: usedAI ? 'content-studio/compose' : 'offline-template',
            brief,
            complianceScore: ai?.complianceScore,
            complianceIssues: ai?.complianceIssues,
          },
          current_workflow_stage: 1,
          total_impressions: 0,
          total_clicks: 0,
          total_engagement: 0,
          total_conversions: 0,
        });
      } catch {
        // Backend save failed (no company) — localStorage save already succeeded above
      }

      setIsGenerating(false);
      setGenerationProgress(0);

      toast.success(`✅ ${typeObj?.name} Generated!`, {
        description: 'AI content ready for review and editing. Check your Content Library!'
      });

      setActiveTab('library');
    } catch (error) {
      console.error('Error creating content:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      toast.error('Failed to generate content. Please try again.');
    }
  };

  const saveSocialMediaPost = (content: ContentPiece) => {
    try {
      // Load existing social media posts from user-specific storage
      const posts = loadFromUserStorage<SocialPost[]>(
        userContext,
        CONTENT_CENTER_KEYS.SOCIAL_POSTS,
        []
      );

      // Create a social media post from the content
      const socialPost: SocialPost = {
        id: `social-${Date.now()}`,
        content: content.content_body,
        media_urls: content.featured_image_url ? [content.featured_image_url] : [],
        media_type: content.featured_image_url ? 'image' : 'text',
        platforms: ['facebook', 'instagram', 'twitter', 'linkedin'],
        scheduled_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        status: 'draft',
        created_at: new Date().toISOString()
      };

      // Save to user-specific storage
      saveToUserStorage(
        userContext,
        CONTENT_CENTER_KEYS.SOCIAL_POSTS,
        [...posts, socialPost]
      );

      toast.success(`📱 Saved to your ${userContext.userType} folder`, {
        description: 'Content is ready to schedule and publish'
      });
    } catch (error) {
      console.error('Error saving to social media:', error);
    }
  };
  
  // Persist an ad created in Ad Studio into the real Content Library (user-scoped
  // storage + KV server), so it shows up in the Library tab and syncs across devices.
  const handleAdSaveToLibrary = (ad: {
    title: string; content_body: string; html: string; image?: string;
    source: string; format: string; theme: string; productId: string | null;
  }) => {
    try {
      const piece: any = {
        id: `ad_${Date.now()}`,
        title: ad.title || 'Untitled ad',
        content: ad.content_body,
        content_body: ad.content_body || '',
        // 'ad_' prefix so the Library's "Ads" type filter (startsWith('ad_')) matches.
        content_format: `ad_${ad.source || 'promo'}`,
        excerpt: (ad.content_body || '').substring(0, 200),
        status: 'approved',
        is_ai_generated: true,
        featured_image_url: ad.image || '',
        ai_generation_metadata: { html: ad.html, format: ad.format, theme: ad.theme, productId: ad.productId, ad_type: ad.source },
        created_at: new Date().toISOString(),
        tags: ['ad', ad.source].filter(Boolean),
      };

      const existing = loadFromUserStorage<any[]>(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, []);
      const merged = [piece, ...existing];
      saveToUserStorage(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, merged);
      setContentPieces(prev => [piece, ...prev]);

      // Best-effort server persistence.
      createContentPiece({
        title: piece.title,
        content_body: piece.content_body,
        content_format: piece.content_format,
        excerpt: piece.excerpt,
        status: 'approved',
        is_ai_generated: true,
        featured_image_url: piece.featured_image_url,
        ai_generation_metadata: piece.ai_generation_metadata,
        current_workflow_stage: 3,
        total_impressions: 0,
        total_clicks: 0,
        total_engagement: 0,
        total_conversions: 0,
      }).catch(err => console.error('Server persist of ad failed (saved locally):', err));
    } catch (err) {
      console.error('Failed to save ad to library:', err);
    }
  };

  // Queue Creator-Studio content into the same store the Social Scheduler reads,
  // so "Push to Scheduler" actually lands in the scheduler tab.
  const queueContentToScheduler = (content: any) => {
    try {
      const saved = JSON.parse(localStorage.getItem('social_scheduled_posts') || '[]');
      const platformNames: string[] = Array.isArray(content?.platforms)
        ? content.platforms.map((p: any) => (typeof p === 'string' ? p : p?.platform)).filter(Boolean)
        : ['facebook', 'instagram'];
      const firstCaption = Array.isArray(content?.platforms) && typeof content.platforms[0] === 'object'
        ? content.platforms[0]?.caption
        : undefined;
      const hashtags = Array.isArray(content?.script?.hashtags) ? content.script.hashtags.join(' ') : '';
      const post = {
        id: `cs_${Date.now()}`,
        content: [firstCaption || content?.description || content?.title, hashtags].filter(Boolean).join('\n\n'),
        media_urls: [],
        media_type: 'text',
        platforms: platformNames,
        scheduled_date: '',
        status: 'draft',
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('social_scheduled_posts', JSON.stringify([post, ...(Array.isArray(saved) ? saved : [])]));
    } catch (err) {
      console.error('Failed to queue content to scheduler:', err);
    }
  };

  // Persist a photo-to-video slideshow into the Content Library (local + server).
  const saveSlideshowToLibrary = (slides: any[], totalDuration: number, music?: any) => {
    try {
      const firstImage = slides?.find((s: any) => s?.image || s?.url || s?.src);
      const piece: any = {
        id: `slideshow_${Date.now()}`,
        title: `Video Slideshow — ${new Date().toLocaleDateString()}`,
        content: `Photo-to-video slideshow with ${slides.length} photos (${totalDuration.toFixed(1)}s)${music?.title ? ` set to "${music.title}"` : ''}.`,
        content_body: `Photo-to-video slideshow with ${slides.length} photos (${totalDuration.toFixed(1)}s)${music?.title ? ` set to "${music.title}"` : ''}.`,
        content_format: 'video_reel',
        excerpt: `${slides.length} photos · ${totalDuration.toFixed(1)}s`,
        status: 'draft',
        is_ai_generated: true,
        featured_image_url: firstImage?.image || firstImage?.url || firstImage?.src || '',
        ai_generation_metadata: { slideCount: slides.length, totalDuration, music: music?.title || null },
        created_at: new Date().toISOString(),
        tags: ['video', 'slideshow'],
      };
      const existing = loadFromUserStorage<any[]>(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, []);
      saveToUserStorage(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, [piece, ...existing]);
      setContentPieces(prev => [piece, ...prev]);
      createContentPiece({
        title: piece.title,
        content_body: piece.content_body,
        content_format: 'video_reel',
        excerpt: piece.excerpt,
        status: 'draft',
        is_ai_generated: true,
        featured_image_url: piece.featured_image_url,
        ai_generation_metadata: piece.ai_generation_metadata,
        current_workflow_stage: 1,
        total_impressions: 0,
        total_clicks: 0,
        total_engagement: 0,
        total_conversions: 0,
      }).catch(err => console.error('Server persist of slideshow failed (saved locally):', err));
    } catch (err) {
      console.error('Failed to save slideshow to library:', err);
    }
  };

  const handleExportContent = () => {
    // Export all user content
    const userData = exportUserData(userContext);
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `content-center-export-${userContext.userName}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('✅ Content exported successfully!');
  };

  const publishToSocialMedia = (content: ContentPiece) => {
    saveSocialMediaPost(content);
    toast.success('Content published to Social Media Manager!');
  };

  const publishToLandingPageReel = async (content: ContentPiece) => {
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Please log in to publish reels'); return; }

      const meta = content.ai_generation_metadata || {};
      const reel = {
        id: `reel_${content.id}`,
        title: content.title,
        description: content.excerpt || content.content_body?.substring(0, 120) || '',
        videoUrl: meta.videoUrl || '',
        thumbnailUrl: content.featured_image_url || '',
        advertiser: {
          name: meta.publisherName || 'Black Phoenix Company',
          logo: '',
          type: meta.publisherType || 'content', // vendor | subcontractor | advertiser | content
        },
        linkUrl: meta.linkUrl || '',
        placement: ['directory-landing-page'],
        priority: Date.now(),
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/public/reels`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reel }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success('🎬 Reel published to landing page!');
      } else {
        toast.error(`Failed to publish: ${data.error}`);
      }
    } catch (err: any) {
      toast.error('Failed to publish reel: ' + err.message);
    }
  };

  // AI Video Editing Functions
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      toast.success('Video uploaded successfully!');
    } else {
      toast.error('Please upload a valid video file');
    }
  };

  const aiVideoEdit = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    setIsProcessingVideo(true);
    setVideoProgress(0);

    try {
      toast.info('🎬 AI Video Analysis Started', {
        description: 'Analyzing video content for optimal editing...'
      });

      setVideoProgress(25);
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.info('🧠 Processing Video Frames', {
        description: 'Detecting scenes, transitions, and optimal cuts...'
      });

      setVideoProgress(50);

      // Extract real metadata from the uploaded clip so the AI plan reflects the
      // actual video (duration, resolution) rather than fixed placeholder values.
      const metadata = await new Promise<{ duration: number; width: number; height: number }>((resolve) => {
        const el = document.createElement('video');
        el.preload = 'metadata';
        el.onloadedmetadata = () => {
          resolve({ duration: el.duration || 0, width: el.videoWidth || 0, height: el.videoHeight || 0 });
          URL.revokeObjectURL(el.src);
        };
        el.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
        el.src = URL.createObjectURL(videoFile);
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/video/ai-edit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            name: videoFile.name,
            size: videoFile.size,
            type: videoFile.type,
            duration: metadata.duration,
            width: metadata.width,
            height: metadata.height,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI video analysis failed (${response.status}): ${errText}`);
      }

      const aiResult = await response.json();
      setAiVideoSuggestions(aiResult);

      setVideoProgress(100);

      toast.success('✨ AI Analysis Complete!', {
        description: 'Review suggested edits and apply changes'
      });

    } catch (error) {
      console.error('Error during AI video editing:', error);
      toast.error('AI video editing failed. Please try again.');
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const applyTrimPoints = (trimPoints: any[]) => {
    console.log('Applying trim points:', trimPoints);
    toast.success(`Applied ${trimPoints.length} trim points to video timeline`);
  };

  const applyEffects = (effects: any[]) => {
    console.log('Applying effects:', effects);
    toast.success(`Applied ${effects.length} video effects`);
  };

  const applyTransitions = (transitions: any[]) => {
    console.log('Applying transitions:', transitions);
    toast.success(`Applied ${transitions.length} transitions`);
  };

  const applyAllAISuggestions = () => {
    if (!aiVideoSuggestions) return;
    
    applyTrimPoints(aiVideoSuggestions.trimPoints || []);
    applyEffects(aiVideoSuggestions.effects || []);
    applyTransitions(aiVideoSuggestions.transitions || []);
    
    toast.success('🎬 All AI suggestions applied successfully!');
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setAiVideoSuggestions(null);
    setVideoProgress(0);
  };

  const saveVideoToLibrary = () => {
    if (!videoFile || !videoPreviewUrl) {
      toast.error('No video to save');
      return;
    }

    try {
      const videoAsset: VideoAsset = {
        id: `video-${Date.now()}`,
        title: videoFile.name.replace(/\.[^/.]+$/, ''), // Remove extension
        file: videoFile,
        url: videoPreviewUrl,
        size: {
          width: 1920, // Default HD size, could be detected from video
          height: 1080,
        },
        aiSuggestions: aiVideoSuggestions || undefined,
        appliedEdits: aiVideoSuggestions ? {
          trimPoints: false,
          effects: false,
          transitions: false,
        } : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'content-center',
      };

      saveVideoAsset(videoAsset);

      toast.success('🎬 Video saved to library!', {
        description: 'You can now use this video in the Product Ad Creator',
      });
    } catch (error) {
      console.error('Error saving video:', error);
      toast.error('Failed to save video to library');
    }
  };

  const useVideoInAd = () => {
    if (!videoFile || !videoPreviewUrl) {
      toast.error('No video to use');
      return;
    }

    // Save to library first
    saveVideoToLibrary();

    // Navigate to ad creator
    toast.info('Opening Product Ad Creator...', {
      description: 'Your video is ready to use in ads!',
    });

    // In a real app with routing, this would navigate to the ad creator
    // For now, just show a message
    setTimeout(() => {
      toast.success('💡 Tip: Open the Product Ad Creator from the Vendor Advertising Hub to create video ads!');
    }, 1500);
  };

  // Music & Audio Functions
  const loadMusicAssets = () => {
    const assets = getMusicAssets();
    setMusicAssets(assets);
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setMusicFile(file);
      
      const musicAsset: MusicAsset = {
        id: `music-upload-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        file: file,
        url: URL.createObjectURL(file),
        duration: 0, // Would need to detect from file
        mood: 'professional',
        genre: 'corporate',
        isRoyaltyFree: false,
        volume: audioSettings.volume,
        fadeIn: audioSettings.fadeIn,
        fadeOut: audioSettings.fadeOut,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'upload',
      };
      
      saveMusicAsset(musicAsset);
      loadMusicAssets();
      toast.success('🎵 Music track uploaded successfully!');
    } else {
      toast.error('Please upload a valid audio file (MP3, WAV, etc.)');
    }
  };

  const suggestMusicForCurrentVideo = () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    toast.info('🎵 Analyzing video for music suggestions...');

    // Simulate AI analysis
    setTimeout(() => {
      // Mock keywords based on video name or content
      const videoKeywords = ['professional', 'business', 'corporate', 'presentation'];
      const suggestions = suggestMusicForVideo(videoKeywords, 'professional', 60);
      
      setMusicSuggestions(suggestions);
      setShowMusicLibrary(true);
      
      toast.success(`✨ Found ${suggestions.length} music suggestions!`, {
        description: 'Browse AI-recommended tracks for your video',
      });
    }, 1000);
  };

  const applyMusicToVideo = (music: MusicAsset) => {
    setSelectedMusic(music);
    
    toast.success('🎵 Music track applied!', {
      description: `${music.title} has been added to your video`,
    });
  };

  const adjustMusicVolume = (volume: number) => {
    setAudioSettings(prev => ({ ...prev, volume }));
    if (selectedMusic) {
      const updatedMusic = { ...selectedMusic, volume };
      saveMusicAsset(updatedMusic);
    }
  };

  const adjustFadeIn = (fadeIn: number) => {
    setAudioSettings(prev => ({ ...prev, fadeIn }));
    if (selectedMusic) {
      const updatedMusic = { ...selectedMusic, fadeIn };
      saveMusicAsset(updatedMusic);
    }
  };

  const adjustFadeOut = (fadeOut: number) => {
    setAudioSettings(prev => ({ ...prev, fadeOut }));
    if (selectedMusic) {
      const updatedMusic = { ...selectedMusic, fadeOut };
      saveMusicAsset(updatedMusic);
    }
  };

  const toggleAutoDucking = () => {
    setAudioSettings(prev => ({ ...prev, autoDucking: !prev.autoDucking }));
    saveDefaultAudioSettings({ ...audioSettings, autoDucking: !audioSettings.autoDucking });
  };

  const searchMusic = (query: string) => {
    setMusicSearchQuery(query);
    if (query.trim()) {
      const results = searchMusicAssets(query);
      setMusicAssets(results);
    } else {
      loadMusicAssets();
    }
  };

  const filterByMood = (mood: MusicMood | 'all') => {
    setMusicMoodFilter(mood);
    if (mood === 'all') {
      loadMusicAssets();
    } else {
      const filtered = getMusicAssetsByMood(mood);
      setMusicAssets(filtered);
    }
  };

  const removeMusic = () => {
    setSelectedMusic(null);
    toast.info('Music track removed from video');
  };

  // Load music assets on mount
  useEffect(() => {
    loadMusicAssets();
    loadPlaylists();
  }, []);

  // Playlist Functions
  const loadPlaylists = () => {
    const lists = getPlaylists();
    setPlaylists(lists);
  };

  const handleCreatePlaylist = () => {
    const name = prompt('Enter playlist name:');
    if (!name) return;
    
    const description = prompt('Enter playlist description (optional):');
    const newPlaylist = createPlaylist(name, description || undefined, 'custom');
    
    loadPlaylists();
    toast.success(`📁 Playlist "${name}" created!`);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    if (playlist.isDefault) {
      toast.error('Cannot delete default playlists');
      return;
    }
    
    if (confirm(`Delete playlist "${playlist.name}"?`)) {
      try {
        deletePlaylist(playlistId);
        loadPlaylists();
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist(null);
        }
        toast.success('Playlist deleted');
      } catch (error) {
        toast.error('Failed to delete playlist');
      }
    }
  };

  const handleAddToPlaylist = (musicId: string, playlistId: string) => {
    try {
      addTrackToPlaylist(playlistId, musicId);
      loadPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      toast.success(`Added to ${playlist?.name}`);
    } catch (error) {
      toast.error('Failed to add track to playlist');
    }
  };

  const handleRemoveFromPlaylist = (musicId: string, playlistId: string) => {
    try {
      removeTrackFromPlaylist(playlistId, musicId);
      loadPlaylists();
      toast.success('Removed from playlist');
    } catch (error) {
      toast.error('Failed to remove track');
    }
  };

  const selectPlaylist = (playlist: MusicPlaylist) => {
    setSelectedPlaylist(playlist);
    const tracks = getPlaylistTracks(playlist.id, musicAssets);
    setMusicAssets(tracks);
    setActivePlaylistView('library');
  };

  const openPlaylistManager = (playlist: MusicPlaylist) => {
    setManagingPlaylist(playlist);
    setShowPlaylistManager(true);
  };

  // Beat Sync Functions
  const enableBeatSync = () => {
    if (!selectedMusic || !selectedMusic.bpm) {
      toast.error('Please select a music track with BPM information');
      return;
    }
    
    if (!videoFile || !videoPreviewUrl) {
      toast.error('Please upload a video first');
      return;
    }
    
    toast.info('🎵 Analyzing beats...');
    
    setTimeout(() => {
      const markers = generateBeatMarkers(
        selectedMusic.bpm!,
        selectedMusic.duration,
        4 // beats per bar
      );
      
      setBeatMarkers(markers);
      setBeatSyncEnabled(true);
      setShowBeatSync(true);
      
      // Generate transition suggestions
      const videoDuration = 60; // mock duration
      const transitions = suggestTransitionPoints(markers, videoDuration, 4, 8);
      setTransitionPoints(transitions);
      
      toast.success(`✨ Found ${markers.length} beat markers and ${transitions.length} transition points!`);
    }, 800);
  };

  const trimMusicToVideo = () => {
    if (!selectedMusic) {
      toast.error('Please select a music track first');
      return;
    }
    
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }
    
    const videoDuration = 60; // mock - would get from actual video
    
    const trimmed = trimAudioToVideo(selectedMusic, videoDuration, {
      preferFadeOut: true,
      allowLooping: true,
      snapToBar: true,
      beatsPerBar: 4,
    });
    
    setTrimmedAudio(trimmed);
    
    if (trimmed.loops > 1) {
      toast.success(`🎵 Music will loop ${trimmed.loops}x to match video duration`, {
        description: `Original: ${trimmed.originalDuration}s → Trimmed: ${trimmed.trimmedDuration}s`,
      });
    } else if (trimmed.trimmedDuration < trimmed.originalDuration) {
      toast.success(`✂️ Music trimmed to ${trimmed.trimmedDuration}s`, {
        description: `Fade out: ${trimmed.fadeOut}s`,
      });
    } else {
      toast.info('Music duration matches video');
    }
  };

  const disableBeatSync = () => {
    setBeatSyncEnabled(false);
    setShowBeatSync(false);
    setBeatMarkers([]);
    setTransitionPoints([]);
    toast.info('Beat sync disabled');
  };


  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 space-y-6">
      {/* Unified Back Button */}
      <button
        onClick={() => navigate('unified-dashboard')}
        className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-gray-300 hover:text-white rounded-lg transition-all duration-200"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span className="font-medium">Back to Command Center</span>
      </button>

      {/* Header with Company Branding */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[#ea580c]" />
            Enterprise Content Center
          </h1>
          <p className="text-gray-400 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            AI-Powered Content for {companyInfo.name} • Multi-Channel Distribution • Advanced Analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Button */}
          <button
            onClick={handleExportContent}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-blue-500"
            title="Export all your content"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export</span>
          </button>
          
          {/* User Context Indicator */}
          <button
            onClick={() => setShowUserContextSelector(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-[#ea580c]"
            title="Change folder settings"
          >
            <User className="w-4 h-4" />
            <div className="text-left">
              <div className="text-sm text-gray-500">Saving as:</div>
              <div className="text-sm font-medium capitalize">{userContext.userType}</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition-all shadow-lg shadow-[#ea580c]/20 font-bold"
          >
            <Wand2 className="w-5 h-5" />
            Create Content
          </button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-[#ea580c]/30 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Content</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
              <p className="text-sm text-gray-500 mt-1">All content pieces</p>
            </div>
            <FileText className="w-12 h-12 text-gray-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl border border-pink-500/30 p-6 hover:border-pink-500/50 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-pink-300">Pro Reels</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mt-2">{stats.reels}</p>
              <p className="text-sm text-pink-300/70 mt-1">IG • TikTok • Shorts</p>
            </div>
            <Film className="w-12 h-12 text-pink-400" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-yellow-500/30 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.pending}</p>
              <p className="text-sm text-gray-500 mt-1">Awaiting approval</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-green-500/30 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Published</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{stats.published}</p>
              <p className="text-sm text-gray-500 mt-1">Live content</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Engagement</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">{stats.totalEngagement.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Across all channels</p>
            </div>
            <Heart className="w-12 h-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-[#2A2A2A]">
          {[
            { id: 'command', label: '🎯 Command Center', icon: Target },
            { id: 'ad-studio', label: '📣 Ad Studio', icon: Megaphone },
            { id: 'creative-studio', label: '🎨 Creative Studio', icon: Wand2 },
            { id: 'content-studio', label: '✍️ Content Studio', icon: Repeat },
            { id: 'ecommerce', label: '🛒 eCommerce Store', icon: Store },
            { id: 'digital-products', label: '📦 Digital Products', icon: Download },
            { id: 'library', label: 'Content Library', icon: FileText },
            { id: 'create', label: 'AI Generator', icon: Sparkles },
            { id: 'storage', label: 'Storage', icon: HardDrive },
            { id: 'templates', label: 'Templates', icon: Layout },
            { id: 'photo-video', label: 'Photo to Video', icon: Film },
            { id: 'social-accounts', label: '🔗 Social Accounts', icon: Share2 },
            { id: 'social-scheduler', label: 'Social Scheduler', icon: Share2 },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'creator-studio', label: '🎬 Creator Studio', icon: Film },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'text-[#ea580c] border-[#ea580c]'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Marketing Command Center Tab */}
          {activeTab === 'command' && (
            <MarketingCommandCenter onNavigate={hubNavigate} onOpenTab={handleOpenTab} />
          )}

          {/* eCommerce Store — one place for every store tab & feature */}
          {activeTab === 'ecommerce' && (
            <EcommerceStoreHub onNavigate={hubNavigate} onOpenTab={handleOpenTab} />
          )}

          {/* Ad Studio Tab */}
          {activeTab === 'ad-studio' && (
            <AdStudio onNavigate={hubNavigate} onSaveToLibrary={handleAdSaveToLibrary} />
          )}

          {/* Creative Studio Tab — Higgsfield-style AI image/VFX generation. */}
          {activeTab === 'creative-studio' && (
            <CreativeStudio />
          )}

          {/* Content Studio Tab — Brand Kit, Omnichannel Repurposer & AI Planner. */}
          {activeTab === 'content-studio' && (
            <ContentStudio />
          )}

          {/* Digital Products Tab — create, price & organize all digital products.
              These feed the Ad Studio product picker, so you can make ads for them
              right here in the Content Center. */}
          {activeTab === 'digital-products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-[#ea580c]" /> Digital Products
                  </h3>
                  <p className="text-sm text-gray-400">Manage all your ebooks, templates, calculators & bundles. They automatically appear in the Ad Studio.</p>
                </div>
                <button
                  onClick={() => setActiveTab('ad-studio')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition"
                >
                  <Megaphone className="w-4 h-4" /> Make an ad for these
                </button>
              </div>
              <MarketplaceAdmin />
            </div>
          )}

          {/* Store Boosters Tab — AOV-boosting merchandising config */}
          {activeTab === 'store-boosters' && (
            <StoreBoostersManager />
          )}

          {/* Promotions Engine Tab — scheduled discounts + volume pricing */}
          {activeTab === 'promotions-engine' && (
            <PromotionsEngineManager />
          )}

          {/* Fulfillment Tab — order tracking, notifications, stock */}
          {activeTab === 'fulfillment' && (
            <FulfillmentManager />
          )}

          {/* Hot Products Tab — Kalodata-style trending discovery + fast import */}
          {activeTab === 'hot-products' && (
            <HotProductsRadar />
          )}

          {activeTab === 'store-content' && (
            <StoreContentStudio />
          )}

          {/* Online Store — moved in from the "Online Store" nav page. Renders the
              full DropshipperAdminPanel with its native sub-tab strip, reusing its
              own data loading so every area is wired end to end. */}
          {activeTab === 'store' && (
            <DropshipperAdminPanel embedded initialTab={storeSubTab} />
          )}

          {/* Library Tab */}
          {activeTab === 'library' && (
            <div className="space-y-6">

              {/* ── STATUS TABS ─────────────────────────────────────────────── */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  {
                    key: 'wip', label: '🔧 Work In Progress',
                    filter: (p: any) => p.status === 'draft' || p.status === 'pending_review',
                    statusValues: ['draft', 'pending_review'],
                    color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
                    activeColor: 'bg-yellow-500 text-white border-transparent',
                  },
                  {
                    key: 'ready', label: '✅ Ready to Post',
                    filter: (p: any) => p.status === 'approved',
                    statusValues: ['approved'],
                    color: 'bg-green-500/20 border-green-500/40 text-green-300',
                    activeColor: 'bg-green-600 text-white border-transparent',
                  },
                  {
                    key: 'published', label: '🚀 Published',
                    filter: (p: any) => p.status === 'published',
                    statusValues: ['published'],
                    color: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
                    activeColor: 'bg-blue-600 text-white border-transparent',
                  },
                  {
                    key: 'all', label: 'All Content',
                    filter: () => true,
                    statusValues: ['all'],
                    color: 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400',
                    activeColor: 'bg-orange-600 text-white border-transparent',
                  },
                ].map(tab => {
                  const count = contentPieces.filter(tab.filter).length;
                  const isActive = tab.statusValues.includes(statusFilter) || (tab.key === 'all' && statusFilter === 'all');
                  return (
                    <button key={tab.key}
                      onClick={() => setStatusFilter(tab.key === 'all' ? 'all' : tab.statusValues[0])}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition ${isActive ? tab.activeColor : tab.color} hover:opacity-90`}>
                      {tab.label}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-white/20' : 'bg-black/20'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* Mark selected as Ready to Post */}
                {(statusFilter === 'draft' || statusFilter === 'pending_review') && (
                  <button
                    onClick={() => {
                      const updated = contentPieces.map(p =>
                        (p.status === 'draft' || p.status === 'pending_review') && filteredContent.find((f: any) => f.id === p.id)
                          ? { ...p, status: 'approved' } : p
                      );
                      setContentPieces(updated);
                      saveToUserStorage(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, updated);
                      toast.success('Marked as Ready to Post!');
                      setStatusFilter('approved');
                    }}
                    className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition">
                    ✅ Mark All as Ready to Post
                  </button>
                )}
              </div>

              {/* Search and Type Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search content by title, description, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                >
                  <option value="all">All Types</option>
                  {contentTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* Content Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-xl font-bold text-gray-400 mb-2">No content found</p>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Get started by creating your first content piece'}
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition-all shadow-lg shadow-[#ea580c]/20 font-bold inline-flex items-center gap-2"
                  >
                    <Wand2 className="w-5 h-5" />
                    Create Content
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContent.map((content) => {
                    const TypeIcon = getTypeIcon(content.content_format);
                    return (
                      <div
                        key={content.id}
                        onClick={() => handleContentSelect(content.id)}
                        className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden hover:border-[#ea580c]/50 transition group cursor-pointer"
                      >
                        {/* Preview Image/Thumbnail */}
                        <div className="relative h-48 bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center">
                          {content.featured_image_url ? (
                            <img
                              src={content.featured_image_url}
                              alt={content.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <TypeIcon className="w-16 h-16 text-gray-600" />
                          )}
                          <div className="absolute top-3 right-3 flex flex-col gap-2">
                            {content.content_format === 'video_reel' && (
                              <div className="px-3 py-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg flex items-center gap-1 text-sm font-bold text-white shadow-lg">
                                <Film className="w-3 h-3" />
                                PRO REEL
                              </div>
                            )}
                            {content.is_ai_generated && (
                              <div className="px-3 py-1 bg-purple-500/90 rounded-lg flex items-center gap-1 text-sm font-bold text-white">
                                <Sparkles className="w-3 h-3" />
                                AI
                              </div>
                            )}
                          </div>
                          <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-sm font-bold ${getStatusColor(content.status)}`}>
                            {content.status.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>

                        {/* Content Info */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-[#ea580c] transition line-clamp-2">
                              {content.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                            {content.excerpt || content.content_body?.substring(0, 100) || 'No description available'}...
                          </p>

                          {/* Publish to Landing Page — shown for video_reel content */}
                          {content.content_format === 'video_reel' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); publishToLandingPageReel(content); }}
                              className="w-full mb-3 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3 h-3" fill="currentColor" />
                              Publish Reel to Landing Page
                            </button>
                          )}

                          {/* Status action buttons */}
                          <div className="flex gap-2 mb-3">
                            {(content.status === 'draft' || content.status === 'pending_review') && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const updated = contentPieces.map(p => p.id === content.id ? { ...p, status: 'approved' } : p);
                                  setContentPieces(updated);
                                  saveToUserStorage(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, updated);
                                  updateContentPiece(content.id, { status: 'approved' as any }).catch(err => console.error('Status sync failed (saved locally):', err));
                                  toast.success('✅ Moved to Ready to Post!');
                                }}
                                className="flex-1 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                                ✅ Mark Ready
                              </button>
                            )}
                            {content.status === 'approved' && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const updated = contentPieces.map(p => p.id === content.id ? { ...p, status: 'draft' } : p);
                                  setContentPieces(updated);
                                  saveToUserStorage(userContext, CONTENT_CENTER_KEYS.CONTENT_PIECES, updated);
                                  updateContentPiece(content.id, { status: 'draft' as any }).catch(err => console.error('Status sync failed (saved locally):', err));
                                  toast.success('Moved back to Work In Progress');
                                }}
                                className="flex-1 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                                🔧 Move to WIP
                              </button>
                            )}
                            {(content.status === 'approved' || content.status === 'draft') && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  // Send to social scheduler
                                  const saved = JSON.parse(localStorage.getItem('social_scheduled_posts') || '[]');
                                  const newPost = {
                                    id: `lib_${content.id}_${Date.now()}`,
                                    content: content.content_body || content.content || content.title,
                                    media_urls: [],
                                    media_type: 'text',
                                    platforms: ['facebook', 'instagram'],
                                    scheduled_date: '',
                                    status: 'draft',
                                    created_at: new Date().toISOString(),
                                  };
                                  localStorage.setItem('social_scheduled_posts', JSON.stringify([newPost, ...saved]));
                                  toast.success('📅 Added to Social Scheduler! Go schedule a date & time.');
                                }}
                                className="flex-1 py-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                                📅 Schedule
                              </button>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(content.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-3">
                              {content.total_impressions > 0 && (
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {content.total_impressions.toLocaleString()}
                                </span>
                              )}
                              {content.total_engagement > 0 && (
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3 text-red-400" />
                                  {content.total_engagement.toLocaleString()}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Create Tab - AI Generator */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-3 flex items-center justify-center gap-3">
                  <Brain className="w-8 h-8 text-[#ea580c]" />
                  AI Content Generator
                </h2>
                <p className="text-gray-400">Select content type to generate with AI using {companyInfo.name} branding</p>
              </div>

              {/* Start from any product — physical or digital — and route it into
                  any content tool (Ad Studio, Creator Studio, Store Content,
                  Social Scheduler) to create and post content about it. */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-[#ea580c]" />
                  <h3 className="text-lg font-bold text-white">Start from a product</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Pick any product you sell — physical or digital — and send it straight into a content tool.
                </p>
                <ProductPicker showSendMenu />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  const isReel = type.id === 'video_reel';
                  return (
                    <button
                      key={type.id}
                      onClick={() => generateAIContent(type.id)}
                      disabled={isGenerating}
                      className={`p-6 rounded-xl border-2 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ${
                        isReel 
                          ? 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30 hover:border-pink-500/60 hover:shadow-lg hover:shadow-pink-500/20' 
                          : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-[#ea580c]'
                      }`}
                    >
                      {isReel && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg text-[10px] font-bold text-white">
                          HOT 🔥
                        </div>
                      )}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <Icon className={`w-10 h-10 transition ${
                            isReel ? 'text-pink-400 group-hover:text-pink-300' : 'text-gray-400 group-hover:text-[#ea580c]'
                          }`} />
                          <ChevronRight className={`w-5 h-5 transition ${
                            isReel ? 'text-pink-400' : 'text-gray-600 group-hover:text-[#ea580c]'
                          }`} />
                        </div>
                        <h3 className={`text-xl font-bold mb-2 transition ${
                          isReel ? 'text-pink-100 group-hover:text-white' : 'text-white group-hover:text-[#ea580c]'
                        }`}>
                          {type.name}
                        </h3>
                        <p className={`text-sm mb-4 ${isReel ? 'text-pink-200/70' : 'text-gray-400'}`}>
                          {type.description}
                        </p>
                        <div className={`flex items-center gap-2 text-sm ${isReel ? 'text-pink-300' : 'text-gray-500'}`}>
                          <Sparkles className="w-3 h-3" />
                          <span>{isReel ? '8 Pro Templates' : 'AI-Powered Generation'}</span>
                        </div>
                      </div>
                      {isGenerating && (
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#ea580c] to-[#c2410c] transition-all duration-300"
                          style={{ width: `${generationProgress}%` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Advanced Generation Options */}
              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 mt-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#ea580c]" />
                  Advanced Options
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Tone & Style</label>
                    <select 
                      value={generationSettings.tone}
                      onChange={(e) => setGenerationSettings({...generationSettings, tone: e.target.value})}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c] transition"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual & Friendly</option>
                      <option value="technical">Technical</option>
                      <option value="persuasive">Persuasive</option>
                      <option value="educational">Educational</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Target Audience</label>
                    <select
                      value={generationSettings.audience}
                      onChange={(e) => setGenerationSettings({...generationSettings, audience: e.target.value})}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c] transition"
                    >
                      <option value="general">General Public</option>
                      <option value="business">Business Professionals</option>
                      <option value="experts">Industry Experts</option>
                      <option value="young">Young Adults</option>
                      <option value="homeowners">Homeowners</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Content Length</label>
                    <select
                      value={generationSettings.length}
                      onChange={(e) => setGenerationSettings({...generationSettings, length: e.target.value})}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c] transition"
                    >
                      <option value="short">Short (100-300 words)</option>
                      <option value="medium">Medium (300-800 words)</option>
                      <option value="long">Long (800-1500 words)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">AI Model</label>
                    <select
                      value={generationSettings.aiModel}
                      onChange={(e) => setGenerationSettings({...generationSettings, aiModel: e.target.value})}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c] transition"
                    >
                      <option value="gpt-4">GPT-4 (Recommended)</option>
                      <option value="gpt-3.5">GPT-3.5 Turbo (Faster)</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    </select>
                  </div>
                </div>
                
                {/* Company Branding Info */}
                <div className="mt-6 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#ea580c]" />
                    Integrated Brand Information
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                    <div>Company: {companyInfo.name}</div>
                    <div>Tagline: {companyInfo.tagline}</div>
                    <div>Phone: {companyInfo.contact.phone}</div>
                    <div>Website: {companyInfo.contact.website}</div>
                  </div>
                </div>
              </div>

              {/* AI Video Editing Section */}
              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 mt-8">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Video className="w-6 h-6 text-[#ea580c]" />
                  AI Video Editor
                </h3>
                <p className="text-gray-400 mb-6">Upload a video for AI-powered trimming and effect suggestions</p>

                {!videoFile ? (
                  <div className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-12 text-center hover:border-[#ea580c]/50 transition">
                    <Upload className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-400 mb-2">Upload Video File</p>
                    <p className="text-sm text-gray-500 mb-4">MP4, MOV, AVI up to 500MB</p>
                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition-all shadow-lg shadow-[#ea580c]/20 font-bold cursor-pointer">
                      <Upload className="w-5 h-5" />
                      Choose Video
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Video Preview */}
                    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
                      <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Video className="w-5 h-5 text-[#ea580c]" />
                          <div>
                            <p className="text-sm font-bold text-white">{videoFile.name}</p>
                            <p className="text-sm text-gray-500">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={clearVideo}
                          className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {videoPreviewUrl && (
                        <video
                          src={videoPreviewUrl}
                          controls
                          className="w-full max-h-96 bg-black"
                        />
                      )}
                    </div>

                    {/* AI Processing Button */}
                    {!aiVideoSuggestions && (
                      <button
                        onClick={aiVideoEdit}
                        disabled={isProcessingVideo}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition-all shadow-lg shadow-[#ea580c]/20 font-bold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                      >
                        {isProcessingVideo ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Processing Video... {videoProgress}%
                            <div
                              className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300"
                              style={{ width: `${videoProgress}%` }}
                            />
                          </>
                        ) : (
                          <>
                            <Brain className="w-5 h-5" />
                            Analyze with AI
                          </>
                        )}
                      </button>
                    )}

                    {/* AI Suggestions */}
                    {aiVideoSuggestions && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            AI Suggestions
                          </h4>
                          <button
                            onClick={applyAllAISuggestions}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                          >
                            <Check className="w-4 h-4" />
                            Apply All
                          </button>
                        </div>

                        {/* Trim Points */}
                        {aiVideoSuggestions.trimPoints?.length > 0 && (
                          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
                            <h5 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                              <PenTool className="w-4 h-4 text-blue-400" />
                              Recommended Trim Points ({aiVideoSuggestions.trimPoints.length})
                            </h5>
                            <div className="space-y-2">
                              {aiVideoSuggestions.trimPoints.map((trim: any) => (
                                <div
                                  key={trim.id}
                                  className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-blue-500/30 transition"
                                >
                                  <div>
                                    <p className="text-sm text-white font-medium">
                                      {trim.start}s - {trim.end}s
                                    </p>
                                    <p className="text-sm text-gray-500">{trim.reason}</p>
                                  </div>
                                  <button
                                    onClick={() => applyTrimPoints([trim])}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                                  >
                                    Apply
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Effects */}
                        {aiVideoSuggestions.effects?.length > 0 && (
                          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
                            <h5 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-400" />
                              Suggested Effects ({aiVideoSuggestions.effects.length})
                            </h5>
                            <div className="space-y-2">
                              {aiVideoSuggestions.effects.map((effect: any) => (
                                <div
                                  key={effect.id}
                                  className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-yellow-500/30 transition"
                                >
                                  <div>
                                    <p className="text-sm text-white font-medium capitalize">
                                      {effect.type}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {effect.start}s - {effect.end}s • Intensity: {effect.intensity}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => applyEffects([effect])}
                                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition"
                                  >
                                    Apply
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transitions */}
                        {aiVideoSuggestions.transitions?.length > 0 && (
                          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
                            <h5 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                              <Layers className="w-4 h-4 text-purple-400" />
                              Transitions ({aiVideoSuggestions.transitions.length})
                            </h5>
                            <div className="space-y-2">
                              {aiVideoSuggestions.transitions.map((transition: any) => (
                                <div
                                  key={transition.id}
                                  className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-purple-500/30 transition"
                                >
                                  <div>
                                    <p className="text-sm text-white font-medium capitalize">
                                      {transition.type}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Between clips {transition.between.join(' & ')} • {transition.duration}s
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => applyTransitions([transition])}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition"
                                  >
                                    Apply
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              setAiVideoSuggestions(null);
                              aiVideoEdit();
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Re-analyze
                          </button>
                          <button
                            onClick={saveVideoToLibrary}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Save to Library
                          </button>
                        </div>

                        {/* Use in Ad Creator Button */}
                        <button
                          onClick={useVideoInAd}
                          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:opacity-90 text-white rounded-xl transition font-bold shadow-lg shadow-[#ea580c]/20"
                        >
                          <Target className="w-5 h-5" />
                          Use in Product Ad Creator
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {/* Music & Audio Section */}
                    {videoFile && (
                      <div className="mt-8 space-y-6">
                        <div className="border-t border-[#2A2A2A] pt-6">
                          <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Music className="w-6 h-6 text-[#ea580c]" />
                            Music & Audio
                          </h4>

                          {/* Current Music Selection */}
                          {selectedMusic && (
                            <div className="mb-6 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-lg flex items-center justify-center">
                                    <Music className="w-6 h-6 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">{selectedMusic.title}</p>
                                    <p className="text-sm text-gray-500">
                                      {selectedMusic.mood} • {selectedMusic.genre} • {selectedMusic.duration}s
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={removeMusic}
                                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Audio Controls */}
                              <div className="space-y-4">
                                {/* Volume */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                      <Volume2 className="w-4 h-4" />
                                      Volume
                                    </label>
                                    <span className="text-sm text-white">{audioSettings.volume}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={audioSettings.volume}
                                    onChange={(e) => adjustMusicVolume(parseInt(e.target.value))}
                                    className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                                  />
                                </div>

                                {/* Fade In */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Fade In</label>
                                    <span className="text-sm text-white">{audioSettings.fadeIn}s</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    value={audioSettings.fadeIn}
                                    onChange={(e) => adjustFadeIn(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                                  />
                                </div>

                                {/* Fade Out */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400">Fade Out</label>
                                    <span className="text-sm text-white">{audioSettings.fadeOut}s</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    value={audioSettings.fadeOut}
                                    onChange={(e) => adjustFadeOut(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                                  />
                                </div>

                                {/* Auto-Ducking */}
                                <label className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-[#ea580c]/30 transition">
                                  <div className="flex items-center gap-2">
                                    <Headphones className="w-4 h-4 text-[#ea580c]" />
                                    <div>
                                      <p className="text-sm font-medium text-white">Auto-Ducking</p>
                                      <p className="text-sm text-gray-500">Lower music when dialogue detected</p>
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={audioSettings.autoDucking}
                                    onChange={toggleAutoDucking}
                                    className="w-5 h-5 rounded bg-[#2A2A2A] border-[#3A3A3A] checked:bg-[#ea580c] checked:border-[#ea580c] cursor-pointer"
                                  />
                                </label>
                              </div>

                              {/* Beat Sync & Trimming Controls */}
                              <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-3">
                                <h6 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Advanced Audio</h6>
                                
                                {/* Beat Sync Toggle */}
                                {selectedMusic.bpm && (
                                  <button
                                    onClick={beatSyncEnabled ? disableBeatSync : enableBeatSync}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                                      beatSyncEnabled
                                        ? 'bg-purple-500/10 border-purple-500/30'
                                        : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-purple-500/30'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Zap className={`w-4 h-4 ${beatSyncEnabled ? 'text-purple-400' : 'text-gray-400'}`} />
                                      <div className="text-left">
                                        <p className="text-sm font-medium text-white">Beat Sync</p>
                                        <p className="text-sm text-gray-500">{selectedMusic.bpm} BPM • Auto-align transitions</p>
                                      </div>
                                    </div>
                                    <span className={`text-sm font-medium ${beatSyncEnabled ? 'text-purple-400' : 'text-gray-500'}`}>
                                      {beatSyncEnabled ? 'Enabled' : 'Off'}
                                    </span>
                                  </button>
                                )}

                                {/* Beat Sync Visualization */}
                                {beatSyncEnabled && beatMarkers.length > 0 && (
                                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-sm font-medium text-purple-400">Beat Grid Visualization</p>
                                      <span className="text-sm text-gray-400">{beatMarkers.length} beats detected</span>
                                    </div>
                                    
                                    {/* Beat Grid Waveform */}
                                    <div className="h-12 bg-[#0A0A0A] rounded-lg p-2 flex items-end gap-0.5">
                                      {getBeatStrengthWaveform(beatMarkers, selectedMusic.duration, 60).map((strength, i) => (
                                        <div
                                          key={i}
                                          className="flex-1 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t"
                                          style={{ height: `${strength}%`, opacity: strength > 0 ? 0.8 : 0.1 }}
                                        />
                                      ))}
                                    </div>
                                    
                                    {/* Transition Suggestions */}
                                    {transitionPoints.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-purple-500/20">
                                        <p className="text-sm font-medium text-purple-400 mb-2">
                                          Suggested Transitions ({transitionPoints.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {transitionPoints.slice(0, 8).map((time, i) => (
                                            <span
                                              key={i}
                                              className="px-2 py-1 bg-[#0A0A0A] text-purple-300 text-sm rounded border border-purple-500/30"
                                            >
                                              {Math.floor(time)}s
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Audio Trimming */}
                                <button
                                  onClick={trimMusicToVideo}
                                  className="w-full flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-[#ea580c]/30 transition"
                                >
                                  <div className="flex items-center gap-2">
                                    <PenTool className="w-4 h-4 text-[#ea580c]" />
                                    <div className="text-left">
                                      <p className="text-sm font-medium text-white">Trim to Video Duration</p>
                                      <p className="text-sm text-gray-500">Auto-fit music to match video length</p>
                                    </div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                </button>

                                {/* Trimmed Audio Info */}
                                {trimmedAudio && (
                                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Check className="w-4 h-4 text-green-400" />
                                      <p className="text-sm font-medium text-green-400">Audio Trimmed Successfully</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                                      <div>
                                        <span className="text-gray-500">Original:</span> {trimmedAudio.originalDuration}s
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Trimmed:</span> {trimmedAudio.trimmedDuration}s
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Fade In:</span> {trimmedAudio.fadeIn}s
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Fade Out:</span> {trimmedAudio.fadeOut}s
                                      </div>
                                      {trimmedAudio.loops > 1 && (
                                        <div className="col-span-2">
                                          <span className="text-gray-500">Loops:</span> {trimmedAudio.loops}x
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Timeline Editor Toggle */}
                              <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                                <button
                                  onClick={() => setShowTimeline(!showTimeline)}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:opacity-90 text-white rounded-lg transition font-medium"
                                >
                                  <Video className="w-4 h-4" />
                                  {showTimeline ? 'Hide' : 'Show'} Timeline Editor
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Live Music Timeline Editor */}
                          {selectedMusic && showTimeline && (
                            <div className="mt-6">
                              <MusicTimelineEditor
                                video={videoFile && videoPreviewUrl ? {
                                  id: 'current-video',
                                  title: videoFile.name,
                                  url: videoPreviewUrl,
                                  size: { width: 1920, height: 1080 },
                                  duration: 60,
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                  source: 'upload'
                                } as VideoAsset : undefined}
                                music={selectedMusic}
                                beatMarkers={beatMarkers}
                                onTrimChange={(start, end) => {
                                  setTrimmedAudio({
                                    originalDuration: selectedMusic.duration,
                                    trimmedDuration: end - start,
                                    startTime: start,
                                    endTime: end,
                                    fadeIn: audioSettings.fadeIn,
                                    fadeOut: audioSettings.fadeOut,
                                    loops: 1,
                                  });
                                  toast.success('Timeline updated');
                                }}
                                onSyncPointAdd={(time) => {
                                  toast.info(`Sync point added at ${time.toFixed(2)}s`);
                                }}
                                videoDuration={60}
                              />
                            </div>
                          )}

                          {/* Live Music Preview Player */}
                          {selectedMusic && (
                            <div className="mt-6">
                              <div className="mb-3 flex items-center justify-between">
                                <h5 className="text-sm font-bold text-white">Live Preview</h5>
                                <button
                                  onClick={() => setShowLivePreview(!showLivePreview)}
                                  className="text-sm text-[#ea580c] hover:text-[#c2410c] font-medium"
                                >
                                  {showLivePreview ? 'Hide' : 'Show'} Player
                                </button>
                              </div>
                              
                              {showLivePreview && (
                                <LiveMusicPreviewPlayer
                                  track={selectedMusic}
                                  autoPlay={false}
                                  showWaveform={true}
                                />
                              )}
                            </div>
                          )}

                          {/* AI Music Suggestions */}
                          {!selectedMusic && (
                            <button
                              onClick={suggestMusicForCurrentVideo}
                              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl transition font-bold shadow-lg shadow-purple-600/20 mb-4"
                            >
                              <Sparkles className="w-5 h-5" />
                              AI Music Suggestions
                            </button>
                          )}

                          {/* Music Library */}
                          {showMusicLibrary && (
                            <div className="space-y-4">
                              {/* View Toggle: Library vs Playlists */}
                              <div className="flex gap-2 mb-4">
                                <button
                                  onClick={() => {
                                    setActivePlaylistView('library');
                                    loadMusicAssets();
                                  }}
                                  className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                                    activePlaylistView === 'library'
                                      ? 'bg-[#ea580c] text-white'
                                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  <Disc className="w-4 h-4 inline mr-2" />
                                  Music Library
                                </button>
                                <button
                                  onClick={() => setActivePlaylistView('playlists')}
                                  className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                                    activePlaylistView === 'playlists'
                                      ? 'bg-[#ea580c] text-white'
                                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  <Layers className="w-4 h-4 inline mr-2" />
                                  Playlists ({playlists.length})
                                </button>
                              </div>

                              {/* Playlists View */}
                              {activePlaylistView === 'playlists' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-sm font-bold text-white">Your Playlists</h5>
                                    <button
                                      onClick={handleCreatePlaylist}
                                      className="px-3 py-1 bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm rounded-lg transition font-medium"
                                    >
                                      <Plus className="w-3 h-3 inline mr-1" />
                                      New Playlist
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {playlists.map((playlist) => {
                                      const trackCount = playlist.trackIds.length;
                                      const duration = getPlaylistDuration(playlist.id, musicAssets);
                                      
                                      return (
                                        <div
                                          key={playlist.id}
                                          className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#ea580c]/30 transition"
                                        >
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3 flex-1">
                                              <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: playlist.coverColor || '#ea580c' }}
                                              >
                                                <Music className="w-6 h-6 text-white" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <h6 className="text-sm font-bold text-white truncate">{playlist.name}</h6>
                                                <p className="text-sm text-gray-500 truncate">{playlist.description}</p>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                                  <span>{trackCount} tracks</span>
                                                  <span>•</span>
                                                  <span>{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
                                                  {playlist.isDefault && (
                                                    <>
                                                      <span>•</span>
                                                      <span className="text-blue-400">Default</span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex gap-2 ml-2">
                                              <button
                                                onClick={() => selectPlaylist(playlist)}
                                                className="px-3 py-1 bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm rounded transition font-medium"
                                              >
                                                View
                                              </button>
                                              {!playlist.isDefault && (
                                                <button
                                                  onClick={() => handleDeletePlaylist(playlist.id)}
                                                  className="p-1 hover:bg-[#2A2A2A] rounded transition text-gray-400 hover:text-red-400"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          {playlist.category && (
                                            <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-400 text-sm rounded capitalize">
                                              {playlist.category.replace('-', ' ')}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Library View */}
                              {activePlaylistView === 'library' && (
                                <>
                                  {/* Search and Filter */}
                                  <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                      <input
                                        type="text"
                                        placeholder="Search music..."
                                        value={musicSearchQuery}
                                        onChange={(e) => searchMusic(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c] transition"
                                      />
                                    </div>
                                    <select
                                      value={musicMoodFilter}
                                      onChange={(e) => filterByMood(e.target.value as MusicMood | 'all')}
                                      className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c] transition"
                                    >
                                      <option value="all">All Moods</option>
                                      <option value="upbeat">Upbeat</option>
                                      <option value="calm">Calm</option>
                                      <option value="energetic">Energetic</option>
                                      <option value="professional">Professional</option>
                                      <option value="cinematic">Cinematic</option>
                                      <option value="corporate">Corporate</option>
                                      <option value="dramatic">Dramatic</option>
                                      <option value="inspiring">Inspiring</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {/* AI Suggestions (if available) */}
                              {musicSuggestions.length > 0 && (
                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                  <h5 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    AI Recommended ({musicSuggestions.length})
                                  </h5>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {musicSuggestions.map((suggestion) => {
                                      const music = musicAssets.find(m => m.id === suggestion.musicId);
                                      if (!music) return null;
                                      return (
                                        <div
                                          key={suggestion.musicId}
                                          className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-purple-500/50 transition"
                                        >
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-white">{music.title}</p>
                                            <p className="text-sm text-gray-500">{suggestion.reason}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-sm rounded">
                                                {suggestion.confidence}% match
                                              </span>
                                              {music.isRoyaltyFree && (
                                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-sm rounded">
                                                  Royalty-Free
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => applyMusicToVideo(music)}
                                            className="ml-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition font-medium"
                                          >
                                            Apply
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Music Library Grid */}
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                <h5 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                  <Disc className="w-4 h-4 text-[#ea580c]" />
                                  Music Library ({musicAssets.length})
                                </h5>
                                {musicAssets.map((music) => (
                                  <div
                                    key={music.id}
                                    className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#ea580c]/30 transition"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-10 h-10 bg-[#ea580c]/20 rounded-lg flex items-center justify-center">
                                        <Music className="w-5 h-5 text-[#ea580c]" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{music.title}</p>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                          <span>{music.mood}</span>
                                          <span>•</span>
                                          <span>{music.genre}</span>
                                          <span>•</span>
                                          <span>{music.duration}s</span>
                                          {music.bpm && (
                                            <>
                                              <span>•</span>
                                              <span>{music.bpm} BPM</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => applyMusicToVideo(music)}
                                      className="ml-3 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm rounded-lg transition font-medium"
                                    >
                                      Use
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {/* Upload Custom Music */}
                              <div className="border-t border-[#2A2A2A] pt-4">
                                <label className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition cursor-pointer font-medium">
                                  <Upload className="w-5 h-5" />
                                  Upload Custom Music
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleMusicUpload}
                                    className="hidden"
                                  />
                                </label>
                                <p className="text-sm text-gray-500 text-center mt-2">
                                  MP3, WAV, or other audio formats
                                </p>
                              </div>
                            </div>
                          )}

                          {!showMusicLibrary && !selectedMusic && (
                            <button
                              onClick={() => setShowMusicLibrary(true)}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium"
                            >
                              <Disc className="w-5 h-5" />
                              Browse Music Library
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Configuration Note */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <strong>Note:</strong> Configure your AI video editing service endpoint in the code. Currently using demo mode with mock suggestions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {/* Storage Tab — media library (upload/list images & videos). */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              <MediaLibraryManager />
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Content Templates</h2>
                  <p className="text-gray-400">Pre-built templates for quick content creation</p>
                </div>
                <button
                  onClick={() => setActiveTab('create')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium"
                >
                  <Plus className="w-4 h-4" />
                  New Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 hover:border-[#ea580c]/50 transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Layout className="w-8 h-8 text-gray-400 group-hover:text-[#ea580c] transition" />
                      <div className="flex flex-col gap-2 items-end">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-sm rounded font-medium capitalize">
                          {template.content_type.replace('_', ' ')}
                        </span>
                        {template.usage_count > 400 && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded font-bold flex items-center gap-1">
                            ⭐ Top Rated
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#ea580c] transition">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {template.description || 'No description available'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {template.usage_count.toLocaleString()} uses
                      </span>
                      {template.suggested_channels.length > 0 && (
                        <span className="flex items-center gap-1">
                          • {template.suggested_channels.length} channels
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('create');
                        toast.info(`Opening the AI Generator to create a "${template.name}" piece`);
                      }}
                      className="text-sm text-[#ea580c] hover:text-[#c2410c] font-medium flex items-center gap-1"
                    >
                      Use Template
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo to Video Tab */}
          {activeTab === 'photo-video' && (
            <div className="space-y-6">
              <PhotoToVideoConverter
                music={selectedMusic}
                onMusicChange={(music) => setSelectedMusic(music)}
                onExport={(slides, totalDuration, music) => {
                  saveSlideshowToLibrary(slides, totalDuration, music);
                  toast.success(`Video slideshow saved to Library! ${slides.length} photos, ${totalDuration.toFixed(1)}s duration`);
                }}
              />
            </div>
          )}

          {/* Social Scheduler Tab */}
          {/* Social Accounts Tab — connect Facebook, Instagram, TikTok */}
          {activeTab === 'social-accounts' && (
            <SocialMediaHub />
          )}

          {activeTab === 'social-scheduler' && (
            <SocialMediaSchedulerTab />
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Content Calendar</h2>
                    <p className="text-gray-400">Schedule and plan your content distribution across all channels</p>
                  </div>
                  <button
                    onClick={() => navigate('unified-calendar')}
                    className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-lg hover:from-[#c2410c] hover:to-[#9a3412] transition-all font-medium flex items-center gap-2"
                  >
                    <Calendar className="w-5 h-5" />
                    Open Full Calendar
                  </button>
                </div>
                <div className="border-t border-[#2a2a2a] pt-6">
                  <p className="text-gray-500 text-center py-12">
                    Click "Open Full Calendar" above to access the comprehensive enterprise calendar system with:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="flex items-start gap-3 p-4 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                      <CheckCircle2 className="w-5 h-5 text-[#ea580c] mt-0.5" />
                      <div>
                        <p className="font-medium text-white">Event Management</p>
                        <p className="text-sm text-gray-400">Create, edit, and delete events with full CRUD operations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                      <Calendar className="w-5 h-5 text-[#ea580c] mt-0.5" />
                      <div>
                        <p className="font-medium text-white">Multiple Views</p>
                        <p className="text-sm text-gray-400">Switch between month, week, day, and agenda views</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                      <Filter className="w-5 h-5 text-[#ea580c] mt-0.5" />
                      <div>
                        <p className="font-medium text-white">Advanced Filtering</p>
                        <p className="text-sm text-gray-400">Filter by event type, project, date range, and more</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                      <BarChart3 className="w-5 h-5 text-[#ea580c] mt-0.5" />
                      <div>
                        <p className="font-medium text-white">Visual Analytics</p>
                        <p className="text-sm text-gray-400">Track events, deadlines, meetings, and projects</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STORE ANALYTICS & FINANCIALS ── */}
          {activeTab === 'creator-vetting' && (
            <div className="py-2">
              <StoreAnalyticsDashboard />
            </div>
          )}

          {/* ── SHOP INTELLIGENCE SUITE ── */}
          {activeTab === 'shop-intelligence' && (
            <div className="py-2">
              <ShopIntelligenceSuite
                onSendToCreatorStudio={(product) => {
                  setStudioPreloadedProduct(product);
                  setActiveTab('creator-studio');
                  toast.success(`"${product.name}" loaded in Creator Studio — upload a reference video to recreate it!`);
                }}
              />
            </div>
          )}

          {/* ── CREATOR STUDIO ── */}
          {activeTab === 'creator-studio' && (
            <div className="py-2">
              <VideoRecreationEngine
                preloadedProduct={studioPreloadedProduct}
                onPushToScheduler={(content) => {
                  queueContentToScheduler(content);
                  toast.success(`Content queued for ${content.platforms?.length || 1} platform(s)! Switch to Social Scheduler to set publish times.`);
                }}
                onPushToStore={(productId, content) => {
                  // Best-effort: persist the generated script/description to the product
                  // record so it survives; ignored gracefully if the product isn't in the store.
                  updateContentPiece(productId, {
                    content_body: content.description,
                    ai_generation_metadata: { videoScript: content.videoScript, title: content.title },
                  }).catch(err => console.error('Push-to-store persist failed (script kept in Creator Studio):', err));
                  toast.success(`Product page updated with new script and description!`);
                }}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Total Views</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalImpressions.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">Across {stats.published} published item(s)</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <MousePointerClick className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-400">Total Clicks</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalClicks.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.totalImpressions > 0
                      ? `${((stats.totalClicks / stats.totalImpressions) * 100).toFixed(1)}% CTR`
                      : 'No impressions yet'}
                  </p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">Engagement Rate</span>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {stats.totalImpressions > 0
                      ? ((stats.totalEngagement / stats.totalImpressions) * 100).toFixed(1)
                      : '0'}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stats.totalEngagement.toLocaleString()} total engagements</p>
                </div>
              </div>

              {/* Real breakdowns computed from actual content pieces. */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Content by Status</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Draft', value: stats.draft, color: 'bg-gray-500' },
                      { label: 'Pending Review', value: stats.pending, color: 'bg-yellow-500' },
                      { label: 'Approved', value: stats.approved, color: 'bg-blue-500' },
                      { label: 'Published', value: stats.published, color: 'bg-green-500' },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-400">{row.label}</span>
                          <span className="text-white font-medium">{row.value}</span>
                        </div>
                        <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full transition-all`}
                            style={{ width: `${stats.total > 0 ? (row.value / stats.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Top Performing Content</h3>
                  {contentPieces.filter(p => (p.total_impressions || 0) > 0).length === 0 ? (
                    <p className="text-gray-500 text-sm py-8 text-center">
                      No performance data yet. Publish content to start tracking impressions and engagement.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {[...contentPieces]
                        .sort((a, b) => (b.total_impressions || 0) - (a.total_impressions || 0))
                        .slice(0, 5)
                        .map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-white truncate">{p.title}</span>
                            <span className="text-sm text-gray-400 whitespace-nowrap">
                              {(p.total_impressions || 0).toLocaleString()} views
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6 p-6">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Content Settings</h2>
                <p className="text-gray-400">Configure channels, workflows, and preferences</p>
              </div>

              <div className="space-y-4">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Distribution Channels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'Website/Blog', icon: Globe },
                      { name: 'Email', icon: Mail },
                      { name: 'Facebook', icon: Facebook },
                      { name: 'Instagram', icon: Instagram },
                      { name: 'Twitter/X', icon: Twitter },
                      { name: 'LinkedIn', icon: Linkedin },
                    ].map((channel) => {
                      const enabled = channelPrefs[channel.name] ?? false;
                      return (
                        <div
                          key={channel.name}
                          className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]"
                        >
                          <div className="flex items-center gap-3">
                            <channel.icon className={`w-5 h-5 ${enabled ? 'text-[#ea580c]' : 'text-gray-600'}`} />
                            <span className="text-white font-medium">{channel.name}</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleChannelPref(channel.name)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
                          </label>
                        </div>
                      );
                    })}
              </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab already rendered above */}
        </div>
      </div>

      {/* Content Preview Modal */}
      {showPreview && selectedContent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c] to-[#c2410c] flex items-center justify-center">
                  {selectedContent.is_ai_generated ? (
                    <Sparkles className="w-6 h-6 text-white" />
                  ) : (
                    <FileText className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedContent.title}</h2>
                  <p className="text-sm text-gray-400">
                    {selectedContent.content_format?.replace('_', ' ').toUpperCase()} • {selectedContent.status.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedContent(null);
                }}
                className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!isEditing ? (
                <>
                  {/* Featured Image */}
                  {selectedContent.featured_image_url && (
                    <div className="rounded-xl overflow-hidden">
                      <img
                        src={selectedContent.featured_image_url}
                        alt={selectedContent.title}
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    </div>
                  )}

                  {/* Excerpt */}
                  {selectedContent.excerpt && (
                    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
                      <h3 className="text-sm font-bold text-gray-400 mb-2">EXCERPT</h3>
                      <p className="text-white">{selectedContent.excerpt}</p>
                    </div>
                  )}

                  {/* Content Body */}
                  <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                    <h3 className="text-sm font-bold text-gray-400 mb-4">CONTENT</h3>
                    <div className="prose prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-white font-sans">{selectedContent.content_body}</pre>
                    </div>
                  </div>

                  {/* AI Generation Metadata */}
                  {selectedContent.is_ai_generated && selectedContent.ai_generation_metadata && (
                    <div className="bg-purple-500/10 rounded-xl border border-purple-500/30 p-4">
                      <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI GENERATION DETAILS
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedContent.ai_generation_metadata.ad_type && (
                          <div>
                            <span className="text-gray-400">Type:</span>
                            <span className="text-white ml-2">{selectedContent.ai_generation_metadata.ad_type}</span>
                          </div>
                        )}
                        {selectedContent.ai_generation_metadata.platform && (
                          <div>
                            <span className="text-gray-400">Platforms:</span>
                            <span className="text-white ml-2">{Array.isArray(selectedContent.ai_generation_metadata.platform) ? selectedContent.ai_generation_metadata.platform.join(', ') : selectedContent.ai_generation_metadata.platform}</span>
                          </div>
                        )}
                        {selectedContent.ai_generation_metadata.target_audience && (
                          <div>
                            <span className="text-gray-400">Audience:</span>
                            <span className="text-white ml-2">{selectedContent.ai_generation_metadata.target_audience}</span>
                          </div>
                        )}
                        {selectedContent.ai_generation_metadata.campaign_objective && (
                          <div>
                            <span className="text-gray-400">Objective:</span>
                            <span className="text-white ml-2">{selectedContent.ai_generation_metadata.campaign_objective}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
                      <div className="text-gray-400 mb-1">Created</div>
                      <div className="text-white font-medium">
                        {new Date(selectedContent.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
                      <div className="text-gray-400 mb-1">Last Updated</div>
                      <div className="text-white font-medium">
                        {new Date(selectedContent.updated_at || selectedContent.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit Form */}
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">TITLE</label>
                      <input
                        type="text"
                        value={editForm?.title || ''}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Enter title..."
                      />
                    </div>

                    {/* Featured Image URL */}
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">FEATURED IMAGE URL</label>
                      <input
                        type="text"
                        value={editForm?.featured_image_url || ''}
                        onChange={(e) => setEditForm({ ...editForm, featured_image_url: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Enter image URL..."
                      />
                    </div>

                    {/* Excerpt */}
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">EXCERPT</label>
                      <textarea
                        value={editForm?.excerpt || ''}
                        onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] min-h-[80px]"
                        placeholder="Enter excerpt..."
                      />
                    </div>

                    {/* Content Body */}
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">CONTENT</label>
                      <textarea
                        value={editForm?.content_body || ''}
                        onChange={(e) => setEditForm({ ...editForm, content_body: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] min-h-[200px] font-mono text-sm"
                        placeholder="Enter content..."
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">STATUS</label>
                      <select
                        value={editForm?.status || 'draft'}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
                      >
                        <option value="draft">Draft</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="approved">Approved</option>
                        <option value="published">Published</option>
                      </select>
                    </div>

                    {/* Content Format */}
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">FORMAT</label>
                      <select
                        value={editForm?.content_format || 'social_media'}
                        onChange={(e) => setEditForm({ ...editForm, content_format: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
                      >
                        <option value="social_media">Social Media</option>
                        <option value="blog">Blog</option>
                        <option value="email">Email</option>
                        <option value="video">Video</option>
                        <option value="infographic">Infographic</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A]">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setSelectedContent(null);
                      setIsEditing(false);
                      setEditForm(null);
                    }}
                    className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-bold"
                  >
                    Close
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={handleEditContent}
                      className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-bold flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement share/distribute functionality
                        toast.info('Distribution functionality coming soon');
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition font-bold flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Distribute
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition font-bold flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Context Selector */}
      {showUserContextSelector && (
        <UserContextSelector
          currentContext={userContext}
          onContextChange={(newContext) => {
            setUserContext(newContext);
            toast.success(`✅ Now saving to ${newContext.userType} folder`);
          }}
          onClose={() => setShowUserContextSelector(false)}
        />
      )}
    </div>
  );
}
