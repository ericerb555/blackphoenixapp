import { useState, useEffect } from 'react';
import {
  Sparkles, Image as ImageIcon, Video, Calendar, TrendingUp,
  Layers, Settings, Users, CheckCircle, Clock, Play, Upload,
  Wand2, Eye, Edit3, Share2, Download, Copy, Trash2, Plus,
  Instagram, Facebook, Linkedin, Twitter, Youtube, Target,
  BarChart3, Palette, Type, Layout, Zap, FileText, Brain,
  RefreshCw, Filter, Search, Grid, List, ChevronDown, Send,
  AlertCircle, Check, X, MessageSquare, ThumbsUp, Heart, ExternalLink,
  Briefcase, FolderOpen, Rocket, TrendingDown, Award, Globe,
  Hash, AtSign, ImagePlus, VideoOff, Maximize2, Activity, Save,
  Code, Gauge, Lightbulb, BookTemplate, ShieldCheck, Loader2,
  Building2, Phone, Mail
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import MediaLibraryManager from './MediaLibraryManager';
import { Select } from './ui/input/Select';
import { TextArea } from './ui/input/TextArea';
import { TextInput } from './ui/input/TextInput';
import { Label } from './ui/label';
import { ConfirmModal } from './ui/modal/ConfirmModal';
import { useContentManagement, ContentTemplate, BrandGuideline } from '../lib/useContentManagement';
import { useCompany } from '../contexts/CompanyContext';
import ProfessionalReelGenerator from '../lib/professionalReelGenerator';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const composeHeaders = {
  Authorization: `Bearer ${publicAnonKey}`,
  apikey: publicAnonKey,
  'Content-Type': 'application/json',
};

// Pure {{variable}} substitution for template bodies (real, deterministic).
function fillTemplate(template: ContentTemplate, variables: Record<string, string>): string {
  let content = template.template_body || '';
  (template.variables || []).forEach((variable: any) => {
    const value = variables[variable.name] || variable.default_value || '';
    content = content.replace(new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g'), value);
  });
  return content;
}

interface BrandGuidelinesLocal {
  id: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  fonts: {
    heading: string;
    body: string;
    accent: string;
  };
  tone: string[];
  keywords: string[];
  hashtags: string[];
  restrictions: string[];
}

interface ContentPiece {
  id: string;
  type: 'post' | 'reel' | 'story' | 'carousel';
  platform: string[];
  status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published';
  title: string;
  caption: string;
  media: string[];
  aiGenerated: boolean;
  createdBy: string;
  createdAt: string;
  scheduledFor?: string;
  publishedAt?: string;
  tags: string[];
  hashtags: string[];
  templateId?: string;
  complianceScore?: number;
  complianceIssues?: string[];
  analytics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
  };
}

interface AIPrompt {
  topic: string;
  tone: string;
  platform: string[];
  includeHashtags: boolean;
  includeEmojis: boolean;
  contentLength: 'short' | 'medium' | 'long';
  callToAction?: string;
  targetAudience?: string;
  creativity?: number;
  imageStyle?: string;
  videoLength?: number;
  keywords?: string[];
  brandVoice?: string;
  includeStatistics?: boolean;
  includeQuestions?: boolean;
  optimizeForSEO?: boolean;
  schedulingTime?: string;
  abTestVariants?: number;
  contentGoal?: string;
  useTemplate?: boolean;
  templateId?: string;
}

interface AIContentStudioProps {
  onContentCreated?: (contentId: string) => void;
  onCancel?: () => void;
}

export default function AIContentStudio({ onContentCreated, onCancel }: AIContentStudioProps) {
  const companyContext = useCompany();
  const currentCompany = companyContext?.activeCompany || null;
  const {
    fetchTemplates,
    fetchBrandGuidelines,
    fetchContentPieces,
    createContentPiece,
    updateContentPiece,
    deleteContentPiece,
    incrementTemplateUsage,
  } = useContentManagement();

  // State management
  const [activeTab, setActiveTab] = useState<'generate' | 'templates' | 'library' | 'media' | 'schedule' | 'analytics' | 'settings'>('generate');
  const [contentType, setContentType] = useState<'post' | 'reel' | 'story' | 'carousel'>('post');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; contentId: string | null; contentTitle: string }>({
    isOpen: false,
    contentId: null,
    contentTitle: ''
  });

  // Template & Brand Guidelines State
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuideline[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [useAI, setUseAI] = useState(true);
  const [includeSystemData, setIncludeSystemData] = useState(true);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [complianceIssues, setComplianceIssues] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Local brand guidelines for demo
  const brandGuidelinesLocal: BrandGuidelinesLocal = {
    id: 'BRAND-001',
    companyName: currentCompany?.name || 'Your Company',
    primaryColor: '#ea580c',
    secondaryColor: '#0A0A0A',
    accentColor: '#f97316',
    logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200',
    fonts: {
      heading: 'Inter',
      body: 'Inter',
      accent: 'Inter'
    },
    tone: ['Professional', 'Friendly', 'Expert', 'Trustworthy'],
    keywords: ['home improvement', 'renovation', 'quality work', 'customer satisfaction'],
    hashtags: ['#HomeImprovement', '#Renovation', '#QualityWork', '#CustomerFirst'],
    restrictions: ['No competitor mentions', 'No pricing in posts', 'Always include CTA']
  };

  // Real content library, loaded from the CMS backend (no mock seed).
  const [contentLibrary, setContentLibrary] = useState<ContentPiece[]>([]);

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-600 to-purple-600', formats: ['Post (1:1)', 'Story (9:16)', 'Reel (9:16)', 'Carousel'], loginUrl: 'https://www.instagram.com/accounts/login/' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-600 to-blue-700', formats: ['Post (1:1)', 'Story (9:16)', 'Video (16:9)'], loginUrl: 'https://www.facebook.com/login' },
    { id: 'tiktok', name: 'TikTok', icon: Video, color: 'from-black to-gray-800', formats: ['Video (9:16)'], loginUrl: 'https://www.tiktok.com/login' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'from-blue-700 to-blue-800', formats: ['Post (1:1)', 'Article', 'Carousel'], loginUrl: 'https://www.linkedin.com/login' },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'from-blue-500 to-blue-600', formats: ['Post', 'Thread', 'Video (16:9)'], loginUrl: 'https://twitter.com/i/flow/login' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-600 to-red-700', formats: ['Video (16:9)', 'Shorts (9:16)'], loginUrl: 'https://accounts.google.com/ServiceLogin?service=youtube' }
  ];

  // Load templates and brand guidelines
  useEffect(() => {
    loadData();
  }, [currentCompany]);

  const loadData = async () => {
    try {
      const [templatesData, guidelinesData] = await Promise.all([
        fetchTemplates(),
        fetchBrandGuidelines(),
      ]);
      setTemplates(templatesData);
      setBrandGuidelines(guidelinesData);
    } catch (error) {
      console.error('Error loading templates/brand guidelines:', error);
    }
    await loadLibrary();
  };

  // Map a persisted CMS content piece into the UI's ContentPiece shape.
  const mapPieceToLocal = (p: any): ContentPiece => {
    const meta = p.ai_generation_metadata || {};
    let status: ContentPiece['status'] = 'draft';
    if (p.status === 'published') status = 'published';
    else if (p.status === 'approved') status = 'approved';
    else if (p.status === 'pending_review') status = 'review';
    else if (p.scheduled_publish_at) status = 'scheduled';
    return {
      id: p.id,
      type: meta.type || 'post',
      platform: Array.isArray(meta.platform) ? meta.platform : [],
      status,
      title: p.title || 'Untitled',
      caption: p.content_body || '',
      media: p.featured_image_url ? [p.featured_image_url] : (Array.isArray(meta.media) ? meta.media : []),
      aiGenerated: Boolean(p.is_ai_generated),
      createdBy: p.created_by || 'system',
      createdAt: p.created_at || new Date().toISOString(),
      scheduledFor: p.scheduled_publish_at,
      publishedAt: p.published_at,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      hashtags: Array.isArray(meta.hashtags) ? meta.hashtags : [],
      templateId: p.template_id,
      complianceScore: p.brand_compliance_score,
      complianceIssues: Array.isArray(p.compliance_issues) ? p.compliance_issues : undefined,
      analytics: {
        views: p.total_impressions || 0,
        likes: p.total_engagement || 0,
        comments: 0,
        shares: 0,
        engagement: p.total_engagement || 0,
      },
    };
  };

  const loadLibrary = async () => {
    try {
      const pieces = await fetchContentPieces();
      setContentLibrary((pieces || []).map(mapPieceToLocal));
    } catch (error) {
      console.error('Error loading content library:', error);
    }
  };

  // AI Content Generation — REAL backend generation + CMS persistence.
  const handleGenerateAI = async (prompt: AIPrompt) => {
    setGeneratingContent(true);

    try {
      // Free-form and template both go through the real compose endpoint. For a
      // template we fill its variables locally (deterministic substitution) and
      // pass the result as context so the model refines it in the brand voice.
      let brief = prompt.topic;
      let context = '';
      let title = '';
      if (prompt.useTemplate && prompt.templateId && selectedTemplate) {
        context = fillTemplate(selectedTemplate, variableValues);
        brief = selectedTemplate.name;
        title = selectedTemplate.name;
      }

      const res = await fetch(`${API_BASE}/content-studio/compose`, {
        method: 'POST',
        headers: composeHeaders,
        body: JSON.stringify({
          topic: brief,
          platform: Array.isArray(prompt.platform) ? prompt.platform[0] : prompt.platform,
          tone: prompt.tone,
          includeHashtags: prompt.includeHashtags,
          contentType,
          context,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Generation failed (HTTP ${res.status})`);
      }

      const caption = String(data.caption || '');
      title = title || String(data.title || `AI: ${prompt.topic}`);
      const score = Number(data.complianceScore) || 0;
      const issues: string[] = Array.isArray(data.complianceIssues) ? data.complianceIssues : [];
      const hashtags: string[] = prompt.includeHashtags && Array.isArray(data.hashtags) ? data.hashtags : [];

      if (prompt.useTemplate && selectedTemplate) {
        // Count real usage of the template.
        await incrementTemplateUsage(selectedTemplate.id).catch(() => {});
      }

      // Persist the generated draft to the CMS so it becomes a real library item.
      let newId = `CONTENT-${Date.now()}`;
      try {
        const created = await createContentPiece({
          title,
          content_body: caption,
          content_format: contentType,
          status: 'draft',
          is_ai_generated: true,
          brand_compliance_score: score,
          compliance_issues: issues as any,
          ai_generation_metadata: {
            type: contentType,
            platform: prompt.platform,
            hashtags,
            tags: [prompt.topic.toLowerCase()],
            usedBrandKit: Boolean(data.usedBrandKit),
          },
          template_id: prompt.templateId,
        } as any);
        if (created?.id) newId = created.id;
      } catch (persistErr) {
        console.error('Generated content could not be persisted to CMS:', persistErr);
        toast.error('Generated, but saving to library failed — check connection.');
      }

      await loadLibrary();
      setGeneratedContent(caption);
      setGeneratedTitle(title);
      setComplianceScore(score);
      setComplianceIssues(issues);
      setShowAIGenerator(false);

      toast.success('✨ AI content generated successfully!', {
        description: `Compliance Score: ${score}% • ${issues.length} issue(s) found`
      });

      if (onContentCreated) {
        onContentCreated(newId);
      }
    } catch (error: any) {
      toast.error(`Failed to generate content: ${error?.message || error}`);
      console.error('AI content generation error:', error);
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleSchedulePost = async (contentId: string, dateTime: string) => {
    try {
      await updateContentPiece(contentId, { scheduled_publish_at: dateTime, status: 'approved' } as any);
      await loadLibrary();
      toast.success('📅 Content scheduled successfully!');
    } catch (error: any) {
      toast.error(`Failed to schedule content: ${error?.message || error}`);
      console.error('Schedule content error:', error);
    }
  };

  const handlePublishNow = async (contentId: string) => {
    try {
      await updateContentPiece(contentId, { status: 'published', published_at: new Date().toISOString() } as any);
      await loadLibrary();
      toast.success('🚀 Content published successfully!');
    } catch (error: any) {
      toast.error(`Failed to publish content: ${error?.message || error}`);
      console.error('Publish content error:', error);
    }
  };

  const handleDeleteContent = (contentId: string, contentTitle: string) => {
    setDeleteConfirm({ isOpen: true, contentId, contentTitle });
  };
  
  const confirmDeleteContent = async () => {
    if (!deleteConfirm.contentId) return;
    const id = deleteConfirm.contentId;
    setDeleteConfirm({ isOpen: false, contentId: null, contentTitle: '' });
    try {
      await deleteContentPiece(id);
      await loadLibrary();
      toast.success('Content deleted successfully');
    } catch (error: any) {
      toast.error(`Failed to delete content: ${error?.message || error}`);
      console.error('Delete content error:', error);
    }
  };

  const handleSaveContent = async () => {
    if (!generatedContent || !generatedTitle) {
      toast.error('No content to save');
      return;
    }

    setIsSaving(true);
    try {
      const created = await createContentPiece({
        title: generatedTitle,
        content_body: generatedContent,
        content_format: contentType,
        status: 'draft',
        is_ai_generated: true,
        brand_compliance_score: complianceScore ?? undefined,
        compliance_issues: complianceIssues as any,
        ai_generation_metadata: {
          type: contentType,
          platform: selectedPlatforms,
        },
      } as any);
      await loadLibrary();
      toast.success('Content saved to library!');

      if (onContentCreated && created?.id) {
        onContentCreated(created.id);
      }
    } catch (error: any) {
      toast.error(`Failed to save content: ${error?.message || error}`);
      console.error('Save content error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-400 border border-green-500/30';
      case 'scheduled': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      case 'review': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
      case 'approved': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'review': return <Eye className="w-4 h-4" />;
      case 'approved': return <Check className="w-4 h-4" />;
      default: return <Edit3 className="w-4 h-4" />;
    }
  };

  const getComplianceColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center shadow-xl shadow-orange-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0A0A0A] animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                  AI Content Studio
                  <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
                    ENTERPRISE
                  </span>
                </h1>
                <p className="text-gray-400 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI-powered content generation & management with template support
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#2A2A2A] hover:border-orange-500/30 transition font-bold flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Close
                </button>
              )}
              <button
                onClick={() => setShowAIGenerator(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-orange-500/20 group"
              >
                <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Generate with AI
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-5 hover:border-orange-500/30 transition group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6 text-orange-400" />
                </div>
                <Activity className="w-5 h-5 text-orange-400 opacity-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{contentLibrary.length}</p>
              <p className="text-sm text-gray-400">Total Content</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-5 hover:border-green-500/30 transition group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400 opacity-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {contentLibrary.filter(c => c.status === 'published').length}
              </p>
              <p className="text-sm text-gray-400">Published</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-5 hover:border-blue-500/30 transition group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <Calendar className="w-5 h-5 text-blue-400 opacity-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {contentLibrary.filter(c => c.status === 'scheduled').length}
              </p>
              <p className="text-sm text-gray-400">Scheduled</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-5 hover:border-purple-500/30 transition group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <Brain className="w-5 h-5 text-purple-400 opacity-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {contentLibrary.filter(c => c.aiGenerated).length}
              </p>
              <p className="text-sm text-gray-400">AI Generated</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-5 hover:border-cyan-500/30 transition group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookTemplate className="w-6 h-6 text-cyan-400" />
                </div>
                <FileText className="w-5 h-5 text-cyan-400 opacity-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{templates.length}</p>
              <p className="text-sm text-gray-400">Templates</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-5 hover:border-emerald-500/30 transition group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Gauge className="w-6 h-6 text-emerald-400" />
                </div>
                <Award className="w-5 h-5 text-emerald-400 opacity-50" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {Math.round(contentLibrary.reduce((acc, c) => acc + (c.complianceScore || 0), 0) / contentLibrary.length)}%
              </p>
              <p className="text-sm text-gray-400">Avg Compliance</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'generate' as const, label: 'Generate', icon: Wand2 },
            { id: 'templates' as const, label: 'Templates', icon: BookTemplate },
            { id: 'library' as const, label: 'Content Library', icon: Layers },
            { id: 'media' as const, label: 'Media Library', icon: FolderOpen },
            { id: 'schedule' as const, label: 'Schedule', icon: Calendar },
            { id: 'analytics' as const, label: 'Analytics', icon: TrendingUp },
            { id: 'settings' as const, label: 'Brand Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 hover:bg-[#2A2A2A] hover:border-orange-500/30'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-6">
            {/* Platform Selection */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Globe className="w-6 h-6 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">Select Platforms</h3>
                  <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold rounded-full">
                    {selectedPlatforms.length} SELECTED
                  </span>
                </div>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Hover to access platform login
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {platforms.map(platform => {
                  const Icon = platform.icon;
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <div key={platform.id} className="relative group">
                      <div
                        className={`w-full p-5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/10 border-orange-500/30'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'
                        }`}
                      >
                        <Icon className={`w-10 h-10 mb-3 ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                        <p className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-gray-300'}`}>{platform.name}</p>
                        <p className={`text-xs mt-1 ${isSelected ? 'text-orange-300' : 'text-gray-500'}`}>{platform.formats.length} formats available</p>
                        
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                              toast.success(`${platform.name} removed`);
                            } else {
                              setSelectedPlatforms([...selectedPlatforms, platform.id]);
                              toast.success(`${platform.name} added`);
                            }
                          }}
                          className={`w-full mt-4 px-4 py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                            isSelected
                              ? 'bg-orange-600 hover:bg-orange-700 text-white'
                              : 'bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-orange-500/30 text-gray-300'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-4 h-4" />
                              Selected
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Add Platform
                            </>
                          )}
                        </button>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(platform.loginUrl, '_blank', 'noopener,noreferrer');
                          toast.success(`Opening ${platform.name} login page...`);
                        }}
                        className="absolute top-3 right-3 p-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
                        title={`Login to ${platform.name}`}
                      >
                        <ExternalLink className="w-4 h-4 text-orange-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Type Selection */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Layout className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-bold text-white">Content Type</h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { id: 'post' as const, label: 'Post', icon: ImageIcon, desc: 'Single image/video' },
                  { id: 'reel' as const, label: 'Reel', icon: Video, desc: 'Short-form video' },
                  { id: 'story' as const, label: 'Story', icon: Play, desc: '24-hour content' },
                  { id: 'carousel' as const, label: 'Carousel', icon: Layers, desc: 'Multiple images' }
                ].map(type => {
                  const Icon = type.icon;
                  const isSelected = contentType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setContentType(type.id)}
                      className={`p-6 rounded-xl border transition group ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500/30'
                          : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <Icon className={`w-10 h-10 mb-3 mx-auto group-hover:scale-110 transition-transform ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                      <p className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-gray-300'}`}>{type.label}</p>
                      <p className={`text-xs mt-2 ${isSelected ? 'text-orange-300' : 'text-gray-500'}`}>{type.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setShowAIGenerator(true)}
                className="p-8 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-2xl transition group shadow-lg shadow-orange-500/20"
              >
                <Wand2 className="w-12 h-12 text-white mb-4 group-hover:scale-110 group-hover:rotate-12 transition" />
                <p className="font-bold text-white text-xl mb-2">Generate with AI</p>
                <p className="text-sm text-orange-100">Let AI create engaging content for you</p>
              </button>

              <button 
                onClick={() => setActiveTab('templates')}
                className="p-8 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-2xl transition group shadow-lg shadow-purple-500/20"
              >
                <BookTemplate className="w-12 h-12 text-white mb-4 group-hover:scale-110 transition" />
                <p className="font-bold text-white text-xl mb-2">Use Template</p>
                <p className="text-sm text-purple-100">Start from pre-made content templates</p>
              </button>

              <button 
                onClick={() => setActiveTab('media')}
                className="p-8 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl transition group shadow-lg shadow-blue-500/20"
              >
                <Upload className="w-12 h-12 text-white mb-4 group-hover:scale-110 transition" />
                <p className="font-bold text-white text-xl mb-2">Upload Media</p>
                <p className="text-sm text-blue-100">Use photos and videos from projects</p>
              </button>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BookTemplate className="w-6 h-6 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">Content Templates</h3>
                  <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold rounded-full">
                    {templates.length} AVAILABLE
                  </span>
                </div>
                <button className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Template
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <BookTemplate className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Templates Yet</h3>
                  <p className="text-gray-400 mb-6">Create your first content template to get started</p>
                  <button className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium">
                    Create Your First Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {templates.map(template => (
                    <div key={template.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5 hover:border-orange-500/30 transition group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileText className="w-6 h-6 text-purple-400" />
                        </div>
                        <span className="px-2 py-1 bg-gray-500/10 border border-gray-500/30 text-gray-400 text-xs font-bold rounded">
                          Used {template.usage_count}x
                        </span>
                      </div>
                      <h4 className="font-bold text-white mb-2">{template.name}</h4>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{template.description}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowAIGenerator(true);
                          }}
                          className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition"
                        >
                          Use Template
                        </button>
                        <button className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-gray-300 rounded-lg transition">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Library Tab */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search content..."
                  className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500/30 focus:outline-none transition"
                />
              </div>
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'published', label: 'Published' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'review', label: 'Review' }
                ]}
                value="all"
                onChange={() => {}}
              />
              <Select
                options={[
                  { value: 'all', label: 'All Platforms' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'facebook', label: 'Facebook' },
                  { value: 'tiktok', label: 'TikTok' },
                  { value: 'linkedin', label: 'LinkedIn' }
                ]}
                value="all"
                onChange={() => {}}
              />
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:bg-[#2A2A2A] hover:border-orange-500/30 transition"
              >
                {viewMode === 'grid' ? <List className="w-5 h-5 text-gray-300" /> : <Grid className="w-5 h-5 text-gray-300" />}
              </button>
            </div>

            {/* Content Grid */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-4'}>
              {contentLibrary.map(content => (
                <div key={content.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-orange-500/30 transition group">
                  {/* Media Preview */}
                  <div className="relative h-48 bg-[#0A0A0A] overflow-hidden">
                    <img
                      src={content.media[0]}
                      alt={content.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${getStatusColor(content.status)}`}>
                        {getStatusIcon(content.status)}
                        {content.status.toUpperCase()}
                      </span>
                      {content.aiGenerated && (
                        <span className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg text-xs font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      {content.complianceScore && (
                        <div className={`px-3 py-1.5 bg-[#0A0A0A]/90 backdrop-blur-sm border ${
                          content.complianceScore >= 90 ? 'border-green-500/30' : 
                          content.complianceScore >= 75 ? 'border-yellow-500/30' : 
                          'border-red-500/30'
                        } rounded-lg flex items-center gap-2`}>
                          <Gauge className={`w-4 h-4 ${getComplianceColor(content.complianceScore)}`} />
                          <span className={`text-xs font-bold ${getComplianceColor(content.complianceScore)}`}>
                            {content.complianceScore}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Details */}
                  <div className="p-5">
                    <h3 className="font-bold text-white mb-2 line-clamp-1">{content.title}</h3>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{content.caption}</p>

                    {/* Platforms */}
                    <div className="flex items-center gap-2 mb-4">
                      {content.platform.map(p => {
                        const platform = platforms.find(pl => pl.id === p);
                        if (!platform) return null;
                        const Icon = platform.icon;
                        return (
                          <div key={p} className="w-8 h-8 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-400" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Compliance Issues */}
                    {content.complianceIssues && content.complianceIssues.length > 0 && (
                      <div className="mb-4 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400">COMPLIANCE ISSUES</span>
                        </div>
                        <ul className="text-xs text-yellow-300/80 space-y-1">
                          {content.complianceIssues.slice(0, 2).map((issue, idx) => (
                            <li key={idx}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {content.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handlePublishNow(content.id)}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Publish
                          </button>
                          <button
                            onClick={() => handleSchedulePost(content.id, new Date(Date.now() + 86400000).toISOString())}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                          >
                            <Clock className="w-4 h-4" />
                            Schedule
                          </button>
                        </>
                      )}
                      {content.status === 'scheduled' && (
                        <button
                          onClick={() => handlePublishNow(content.id)}
                          className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition"
                        >
                          Publish Now
                        </button>
                      )}
                      {content.status === 'published' && content.analytics && (
                        <div className="flex-1 flex items-center justify-around text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {content.analytics.views}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {content.analytics.likes}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {content.analytics.comments}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteContent(content.id, content.title)}
                        className="px-4 py-2 bg-[#1A1A1A] border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 text-red-400 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Library Tab */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-6 h-6 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">Media Library</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-white mb-4">Project Media</h4>
                  <MediaLibraryManager />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-4">Photo Cache</h4>
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 text-center">
                    <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Photo cache management coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-bold text-white">Content Schedule</h3>
              </div>
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Content Calendar</h3>
                <p className="text-gray-400 mb-6">View and manage your scheduled posts</p>
                <p className="text-sm text-gray-500">
                  {contentLibrary.filter(c => c.status === 'scheduled').length} posts scheduled
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-bold text-white">Performance Analytics</h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                  <Eye className="w-8 h-8 text-blue-400 mb-3" />
                  <p className="text-2xl font-bold text-white mb-1">
                    {contentLibrary.reduce((acc, c) => acc + (c.analytics?.views || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">Total Views</p>
                </div>
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                  <Heart className="w-8 h-8 text-red-400 mb-3" />
                  <p className="text-2xl font-bold text-white mb-1">
                    {contentLibrary.reduce((acc, c) => acc + (c.analytics?.likes || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">Total Likes</p>
                </div>
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                  <MessageSquare className="w-8 h-8 text-green-400 mb-3" />
                  <p className="text-2xl font-bold text-white mb-1">
                    {contentLibrary.reduce((acc, c) => acc + (c.analytics?.comments || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">Total Comments</p>
                </div>
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                  <Share2 className="w-8 h-8 text-purple-400 mb-3" />
                  <p className="text-2xl font-bold text-white mb-1">
                    {contentLibrary.reduce((acc, c) => acc + (c.analytics?.shares || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">Total Shares</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Header with Edit Button */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-orange-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Company Branding Profile</h3>
                    <p className="text-sm text-gray-400 mt-1">Your brand settings are used for AI content generation</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Navigate to branding settings
                    if (onCancel) {
                      onCancel();
                    }
                    toast.info('Navigate to Owner Dashboard → Settings → Company Branding to edit');
                  }}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Branding
                </button>
              </div>

              {/* Company Info Summary */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-1">{currentCompany?.name || brandGuidelinesLocal.companyName}</h4>
                    <p className="text-sm text-gray-400 mb-3">{brandGuidelinesLocal.tone.join(' • ')}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="w-4 h-4 text-orange-400" />
                        <span>Contact info configured</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="w-4 h-4 text-orange-400" />
                        <span>Email templates ready</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Palette className="w-4 h-4 text-orange-400" />
                        <span>Brand colors set</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Globe className="w-4 h-4 text-orange-400" />
                        <span>Social media ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Brand Colors */}
                <div>
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-orange-400" />
                    Brand Colors
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition group">
                      <div className="w-full h-20 rounded-lg mb-3 group-hover:scale-105 transition-transform" style={{ backgroundColor: brandGuidelinesLocal.primaryColor }} />
                      <p className="text-sm font-medium text-gray-400">Primary Color</p>
                      <p className="text-xs text-gray-500 font-mono">{brandGuidelinesLocal.primaryColor}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition group">
                      <div className="w-full h-20 rounded-lg mb-3 group-hover:scale-105 transition-transform" style={{ backgroundColor: brandGuidelinesLocal.secondaryColor }} />
                      <p className="text-sm font-medium text-gray-400">Secondary Color</p>
                      <p className="text-xs text-gray-500 font-mono">{brandGuidelinesLocal.secondaryColor}</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition group">
                      <div className="w-full h-20 rounded-lg mb-3 group-hover:scale-105 transition-transform" style={{ backgroundColor: brandGuidelinesLocal.accentColor }} />
                      <p className="text-sm font-medium text-gray-400">Accent Color</p>
                      <p className="text-xs text-gray-500 font-mono">{brandGuidelinesLocal.accentColor}</p>
                    </div>
                  </div>
                </div>

                {/* Brand Tone */}
                <div>
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Type className="w-5 h-5 text-orange-400" />
                    Brand Tone & Voice
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {brandGuidelinesLocal.tone.map(tone => (
                      <span key={tone} className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition">
                        {tone}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    These tones are automatically applied to AI-generated content
                  </p>
                </div>

                {/* Keywords */}
                <div>
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-orange-400" />
                    Brand Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {brandGuidelinesLocal.keywords.map(keyword => (
                      <span key={keyword} className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition">
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Keywords help optimize content for your target audience
                  </p>
                </div>

                {/* Hashtags */}
                <div>
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <AtSign className="w-5 h-5 text-orange-400" />
                    Default Hashtags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {brandGuidelinesLocal.hashtags.map(hashtag => (
                      <span key={hashtag} className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/20 transition">
                        {hashtag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    These hashtags are automatically included when enabled
                  </p>
                </div>

                {/* Restrictions */}
                <div>
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-orange-400" />
                    Content Restrictions
                  </h4>
                  <div className="space-y-2">
                    {brandGuidelinesLocal.restrictions.map(restriction => (
                      <div key={restriction} className="bg-[#0A0A0A] border border-red-500/20 rounded-lg p-3 flex items-start gap-3 hover:border-red-500/30 transition">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-300">{restriction}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    AI-generated content is automatically checked against these restrictions
                  </p>
                </div>
              </div>
            </div>

            {/* Integration Info */}
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-2">How Brand Settings Work</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span><strong>AI Generation:</strong> Your brand voice, tone, and keywords are automatically applied to all AI-generated content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Compliance Checking:</strong> Content is validated against your restrictions before being saved</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Consistency:</strong> Brand colors and hashtags ensure visual and messaging consistency across all platforms</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Global Updates:</strong> Changes to your branding profile automatically apply to all new content</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (onCancel) onCancel();
                  toast.info('Opening Company Branding settings...');
                }}
                className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl transition group text-left"
              >
                <Building2 className="w-10 h-10 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-white mb-2">Edit Company Profile</h4>
                <p className="text-sm text-gray-400">Update company information, contact details, and tax info</p>
              </button>
              
              <button
                onClick={() => {
                  if (onCancel) onCancel();
                  toast.info('Opening brand colors editor...');
                }}
                className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl transition group text-left"
              >
                <Palette className="w-10 h-10 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-white mb-2">Customize Brand Colors</h4>
                <p className="text-sm text-gray-400">Change primary, secondary, and accent colors</p>
              </button>
            </div>
          </div>
        )}

        {/* AI Generator Modal */}
        {showAIGenerator && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0A0A0A] border-2 border-orange-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#0A0A0A] z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                    <Wand2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">AI Content Generator</h2>
                    <p className="text-sm text-gray-400">Powered by GPT-4 & Brand Compliance Engine</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAIGenerator(false);
                    setSelectedTemplate(null);
                    setVariableValues({});
                  }}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-6">
                <AIGeneratorForm
                  contentType={contentType}
                  selectedPlatforms={selectedPlatforms}
                  selectedTemplate={selectedTemplate}
                  variableValues={variableValues}
                  setVariableValues={setVariableValues}
                  useAI={useAI}
                  setUseAI={setUseAI}
                  onGenerate={handleGenerateAI}
                  generatingContent={generatingContent}
                />
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, contentId: null, contentTitle: '' })}
          onConfirm={confirmDeleteContent}
          title="Delete Content"
          message={`Are you sure you want to delete "${deleteConfirm.contentTitle}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmVariant="danger"
        />
      </div>
    </div>
  );
}

// AI Generator Form Component
interface AIGeneratorFormProps {
  contentType: 'post' | 'reel' | 'story' | 'carousel';
  selectedPlatforms: string[];
  selectedTemplate: ContentTemplate | null;
  variableValues: Record<string, string>;
  setVariableValues: (values: Record<string, string>) => void;
  useAI: boolean;
  setUseAI: (value: boolean) => void;
  onGenerate: (prompt: AIPrompt) => void;
  generatingContent: boolean;
}

function AIGeneratorForm({
  contentType,
  selectedPlatforms,
  selectedTemplate,
  variableValues,
  setVariableValues,
  useAI,
  setUseAI,
  onGenerate,
  generatingContent
}: AIGeneratorFormProps) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [callToAction, setCallToAction] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  const handleSubmit = () => {
    if (selectedTemplate && Object.keys(variableValues).length < selectedTemplate.variables.length) {
      toast.error('Please fill in all template variables');
      return;
    }

    if (!selectedTemplate && !topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    onGenerate({
      topic: selectedTemplate ? selectedTemplate.name : topic,
      tone,
      platform: selectedPlatforms,
      includeHashtags,
      includeEmojis,
      contentLength,
      callToAction,
      targetAudience,
      useTemplate: !!selectedTemplate,
      templateId: selectedTemplate?.id
    });
  };

  return (
    <div className="space-y-6">
      {selectedTemplate ? (
        <>
          {/* Template Mode */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <BookTemplate className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="font-bold text-white">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-400">{selectedTemplate.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">Enhance with AI</span>
              </label>
            </div>
          </div>

          {/* Template Variables */}
          <div className="space-y-4">
            <h4 className="font-bold text-white">Fill Template Variables</h4>
            {selectedTemplate.variables.map((variable: any) => (
              <div key={variable.name}>
                <Label htmlFor={variable.name} className="text-white mb-2">
                  {variable.label || variable.name}
                  {variable.required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                {variable.type === 'textarea' ? (
                  <TextArea
                    id={variable.name}
                    value={variableValues[variable.name] || ''}
                    onChange={(e) => setVariableValues({ ...variableValues, [variable.name]: e.target.value })}
                    placeholder={variable.placeholder || `Enter ${variable.name}`}
                    rows={3}
                  />
                ) : (
                  <TextInput
                    id={variable.name}
                    value={variableValues[variable.name] || ''}
                    onChange={(e) => setVariableValues({ ...variableValues, [variable.name]: e.target.value })}
                    placeholder={variable.placeholder || `Enter ${variable.name}`}
                  />
                )}
                {variable.help_text && (
                  <p className="text-xs text-gray-500 mt-1">{variable.help_text}</p>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Free-form Mode */}
          <div>
            <Label htmlFor="topic" className="text-white mb-2">Topic / Subject *</Label>
            <TextInput
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Kitchen Renovation Tips, Summer Maintenance Checklist"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tone" className="text-white mb-2">Tone</Label>
              <Select
                options={[
                  { value: 'professional', label: 'Professional' },
                  { value: 'friendly', label: 'Friendly' },
                  { value: 'expert', label: 'Expert' },
                  { value: 'casual', label: 'Casual' },
                  { value: 'enthusiastic', label: 'Enthusiastic' }
                ]}
                value={tone}
                onChange={setTone}
              />
            </div>

            <div>
              <Label htmlFor="length" className="text-white mb-2">Content Length</Label>
              <Select
                options={[
                  { value: 'short', label: 'Short (50-100 chars)' },
                  { value: 'medium', label: 'Medium (100-250 chars)' },
                  { value: 'long', label: 'Long (250+ chars)' }
                ]}
                value={contentLength}
                onChange={(value) => setContentLength(value as 'short' | 'medium' | 'long')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cta" className="text-white mb-2">Call to Action (Optional)</Label>
            <TextInput
              id="cta"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              placeholder="e.g., Call us today!, Book a consultation"
            />
          </div>

          <div>
            <Label htmlFor="audience" className="text-white mb-2">Target Audience (Optional)</Label>
            <TextInput
              id="audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Homeowners, Property managers, First-time renovators"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-300">Include Hashtags</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEmojis}
                onChange={(e) => setIncludeEmojis(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-300">Include Emojis</span>
            </label>
          </div>
        </>
      )}

      {/* Generate Button */}
      <div className="pt-4 border-t border-[#2A2A2A]">
        <button
          onClick={handleSubmit}
          disabled={generatingContent}
          className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 disabled:shadow-none"
        >
          {generatingContent ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate AI Content
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
