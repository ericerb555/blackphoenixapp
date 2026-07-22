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

  const [contentLibrary, setContentLibrary] = useState<ContentPiece[]>([
    {
      id: 'CONTENT-001',
      type: 'post',
      platform: ['instagram', 'facebook'],
      status: 'published',
      title: 'Kitchen Renovation Showcase',
      caption: '🏠 Transform your space! Check out this stunning kitchen renovation we completed last week. From outdated to outstanding! #HomeImprovement #KitchenReno',
      media: ['https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800'],
      aiGenerated: true,
      createdBy: 'admin',
      createdAt: '2024-01-24T10:00:00Z',
      publishedAt: '2024-01-24T14:00:00Z',
      tags: ['kitchen', 'renovation', 'before-after'],
      hashtags: ['#HomeImprovement', '#KitchenReno', '#Renovation'],
      complianceScore: 95,
      analytics: {
        views: 2450,
        likes: 187,
        comments: 23,
        shares: 12,
        engagement: 9.1
      }
    },
    {
      id: 'CONTENT-002',
      type: 'reel',
      platform: ['instagram', 'tiktok'],
      status: 'scheduled',
      title: 'Time-lapse: Bathroom Transformation',
      caption: '⚡ Watch this bathroom go from drab to fab in 60 seconds! Professional work, stunning results. 📞 Book your consultation today!',
      media: ['https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800'],
      aiGenerated: true,
      createdBy: 'manager',
      createdAt: '2024-01-25T09:00:00Z',
      scheduledFor: '2024-01-26T18:00:00Z',
      tags: ['bathroom', 'timelapse', 'transformation'],
      hashtags: ['#BathroomReno', '#HomeTransformation', '#BeforeAndAfter'],
      complianceScore: 92
    },
    {
      id: 'CONTENT-003',
      type: 'carousel',
      platform: ['instagram', 'facebook', 'linkedin'],
      status: 'review',
      title: '5 Tips for Successful Home Renovation',
      caption: '💡 Planning a renovation? Here are 5 essential tips from our experts! Swipe to learn more →',
      media: [
        'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=800',
        'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=800',
        'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=800'
      ],
      aiGenerated: true,
      createdBy: 'marketing',
      createdAt: '2024-01-25T11:00:00Z',
      tags: ['tips', 'education', 'carousel'],
      hashtags: ['#RenovationTips', '#HomeAdvice', '#ExpertTips'],
      complianceScore: 88,
      complianceIssues: ['Missing call-to-action']
    }
  ]);

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
      console.error('Error loading data:', error);
    }
  };

  // AI Content Generation with template support
  const handleGenerateAI = async (prompt: AIPrompt) => {
    setGeneratingContent(true);
    
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      let caption = '';
      let title = '';
      let score = 90;
      let issues: string[] = [];

      if (prompt.useTemplate && prompt.templateId && selectedTemplate) {
        // Generate from template
        caption = await generateFromTemplate(selectedTemplate, variableValues);
        title = selectedTemplate.name;
        score = await calculateBrandCompliance(caption);
        issues = await checkCompliance(caption);
        
        // Increment template usage
        await incrementTemplateUsage(selectedTemplate.id);
      } else {
        // Generate with free-form AI
        caption = generateAICaption(prompt);
        title = `AI Generated: ${prompt.topic}`;
        score = await calculateBrandCompliance(caption);
        issues = await checkCompliance(caption);
      }
      
      const newContent: ContentPiece = {
        id: `CONTENT-${Date.now()}`,
        type: contentType,
        platform: prompt.platform,
        status: 'draft',
        title,
        caption,
        media: [
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
        ],
        aiGenerated: true,
        createdBy: 'ai-system',
        createdAt: new Date().toISOString(),
        tags: [prompt.topic.toLowerCase()],
        hashtags: prompt.includeHashtags ? brandGuidelinesLocal.hashtags : [],
        templateId: prompt.templateId,
        complianceScore: score,
        complianceIssues: issues
      };

      setContentLibrary([newContent, ...contentLibrary]);
      setGeneratedContent(caption);
      setGeneratedTitle(title);
      setComplianceScore(score);
      setComplianceIssues(issues);
      setShowAIGenerator(false);
      
      toast.success('✨ AI content generated successfully!', {
        description: `Compliance Score: ${score}% • ${issues.length} issues found`
      });

      if (onContentCreated) {
        onContentCreated(newContent.id);
      }
    } catch (error) {
      toast.error('Failed to generate content');
      console.error(error);
    } finally {
      setGeneratingContent(false);
    }
  };

  // Generate content from template
  const generateFromTemplate = async (template: ContentTemplate, variables: Record<string, string>): Promise<string> => {
    let content = template.template_body;
    
    // Replace variables
    template.variables.forEach((variable: any) => {
      const value = variables[variable.name] || variable.default_value || '';
      content = content.replace(new RegExp(`{{${variable.name}}}`, 'g'), value);
    });

    // If AI enhancement is enabled, enhance the content
    if (useAI && template.ai_prompt) {
      // Simulate AI enhancement
      await new Promise(resolve => setTimeout(resolve, 1000));
      content = `${content}\n\n✨ AI-Enhanced: Professional tone applied with optimized SEO keywords.`;
    }

    return content;
  };

  // Calculate brand compliance score
  const calculateBrandCompliance = async (content: string): Promise<number> => {
    // Simulate compliance checking
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let score = 100;
    const lowerContent = content.toLowerCase();
    
    // Check for required terms
    brandGuidelinesLocal.keywords.forEach(keyword => {
      if (!lowerContent.includes(keyword.toLowerCase())) {
        score -= 5;
      }
    });
    
    // Check for prohibited terms
    brandGuidelinesLocal.restrictions.forEach(restriction => {
      if (lowerContent.includes(restriction.toLowerCase())) {
        score -= 10;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  };

  // Check compliance issues
  const checkCompliance = async (content: string): Promise<string[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const issues: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Check for CTA
    if (!lowerContent.includes('contact') && !lowerContent.includes('call') && !lowerContent.includes('book')) {
      issues.push('Missing call-to-action');
    }
    
    // Check for hashtags
    if (!content.includes('#')) {
      issues.push('No hashtags included');
    }
    
    // Check length
    if (content.length < 50) {
      issues.push('Content too short');
    }
    
    return issues;
  };

  const generateAICaption = (prompt: AIPrompt): string => {
    // Use enhanced professional reel generator for reels
    if (contentType === 'reel') {
      const reelScript = ProfessionalReelGenerator.generateReel({
        topic: prompt.topic,
        tone: prompt.tone,
        platform: prompt.platform,
        includeHashtags: prompt.includeHashtags,
        includeEmojis: prompt.includeEmojis,
        contentLength: prompt.contentLength,
        callToAction: prompt.callToAction,
        targetAudience: prompt.targetAudience,
        companyName: brandGuidelinesLocal.companyName,
        brandHashtags: brandGuidelinesLocal.hashtags,
      });
      
      return reelScript.script + '\n\n═══════════════════════════════════════\n\n📝 CAPTION:\n\n' + reelScript.caption;
    }
    
    const emojis = prompt.includeEmojis ? '✨ 🏠 💡 ' : '';
    const hashtags = prompt.includeHashtags ? brandGuidelinesLocal.hashtags.join(' ') : '';
    const cta = prompt.callToAction || 'Contact us today!';
    
    let lengthContent = '';
    switch (prompt.contentLength) {
      case 'short':
        lengthContent = `Discover professional ${prompt.topic.toLowerCase()}.`;
        break;
      case 'medium':
        lengthContent = `Discover how we can help transform your space with professional ${prompt.topic.toLowerCase()}. Our expert team delivers quality results every time.`;
        break;
      case 'long':
        lengthContent = `Discover how we can help transform your space with professional ${prompt.topic.toLowerCase()}. Our expert team brings years of experience and delivers quality results every time. We're committed to excellence and customer satisfaction in every project we undertake.`;
        break;
    }
    
    return `${emojis}${prompt.topic}\n\n${lengthContent}\n\n${cta}\n\n${hashtags}`;
  };

  const handleSchedulePost = (contentId: string, dateTime: string) => {
    setContentLibrary(contentLibrary.map(content =>
      content.id === contentId
        ? { ...content, status: 'scheduled', scheduledFor: dateTime }
        : content
    ));
    toast.success('📅 Content scheduled successfully!');
  };

  const handlePublishNow = (contentId: string) => {
    setContentLibrary(contentLibrary.map(content =>
      content.id === contentId
        ? { ...content, status: 'published', publishedAt: new Date().toISOString() }
        : content
    ));
    toast.success('🚀 Content published successfully!');
  };

  const handleDeleteContent = (contentId: string, contentTitle: string) => {
    setDeleteConfirm({ isOpen: true, contentId, contentTitle });
  };
  
  const confirmDeleteContent = () => {
    if (!deleteConfirm.contentId) return;
    
    setContentLibrary(contentLibrary.filter(c => c.id !== deleteConfirm.contentId));
    toast.success('Content deleted successfully');
    setDeleteConfirm({ isOpen: false, contentId: null, contentTitle: '' });
  };

  const handleSaveContent = async () => {
    if (!generatedContent || !generatedTitle) {
      toast.error('No content to save');
      return;
    }

    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const contentId = `CONTENT-${Date.now()}`;
      toast.success('Content saved to library!');
      
      if (onContentCreated) {
        onContentCreated(contentId);
      }
    } catch (error) {
      toast.error('Failed to save content');
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
