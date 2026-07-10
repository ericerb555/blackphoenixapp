/**
 * Social Media Export Manager
 * 
 * Allows portal users to export branded content for use on their own social media
 * - Export individual posts
 * - Batch export
 * - Multiple formats (image, text, video)
 * - Branded templates
 * - Direct scheduling integration
 */

import { useState } from 'react';
import {
  Download, Share2, Image as ImageIcon, FileText, Video,
  Facebook, Instagram, Twitter, Linkedin, Copy, Check,
  Calendar, Clock, Sparkles, Package, Eye, ChevronRight,
  AlertCircle, Crown, X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PortalBranding } from './PortalBrandingManager';

interface ExportableContent {
  id: string;
  title: string;
  content_text: string;
  content_type: 'post' | 'image' | 'video' | 'story';
  preview_url?: string;
  created_at: string;
}

interface SocialMediaExportManagerProps {
  branding: PortalBranding;
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise';
  onExport?: (contentId: string, platforms: string[]) => void;
}

export default function SocialMediaExportManager({
  branding,
  subscriptionTier,
  onExport
}: SocialMediaExportManagerProps) {
  const [selectedContent, setSelectedContent] = useState<ExportableContent | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'text' | 'image' | 'video'>('text');
  const [copiedText, setCopiedText] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Sample content (in real app, fetch from content library)
  const availableContent: ExportableContent[] = [
    {
      id: '1',
      title: 'Company Announcement',
      content_text: `🎉 Exciting news from ${branding.company_name}!\n\n${branding.tagline || 'Quality service you can trust'}\n\n📞 ${branding.phone || 'Contact us'}\n🌐 ${branding.website || 'Visit our website'}\n\n#Business #Quality #Professional`,
      content_type: 'post',
      preview_url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Service Promotion',
      content_text: `✨ Transform your space with ${branding.company_name}!\n\nOur expert team delivers exceptional results. Contact us today for a consultation.\n\n${branding.email || ''}\n${branding.phone || ''}\n\n#Quality #Professional #Trusted`,
      content_type: 'post',
      preview_url: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800',
      created_at: new Date().toISOString()
    }
  ];

  const canExport = subscriptionTier !== 'free';
  const maxExportsPerMonth = {
    free: 0,
    basic: 10,
    pro: 50,
    enterprise: -1 // unlimited
  }[subscriptionTier];

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-500', enabled: !!branding.facebook_url },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500', enabled: !!branding.instagram_url },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'text-blue-400', enabled: !!branding.twitter_url },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600', enabled: !!branding.linkedin_url }
  ];

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const generateBrandedPost = (content: ExportableContent) => {
    let post = content.content_text;

    // Replace placeholders with actual branding
    post = post.replace(/\[COMPANY\]/g, branding.company_name);
    post = post.replace(/\[TAGLINE\]/g, branding.tagline || '');
    post = post.replace(/\[PHONE\]/g, branding.phone || '');
    post = post.replace(/\[EMAIL\]/g, branding.email || '');
    post = post.replace(/\[WEBSITE\]/g, branding.website || '');

    return post;
  };

  const handleCopyText = () => {
    if (!selectedContent) return;

    const brandedText = generateBrandedPost(selectedContent);
    navigator.clipboard.writeText(brandedText);
    setCopiedText(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleExport = () => {
    if (!selectedContent || !canExport) {
      toast.error('Export not available', {
        description: 'Upgrade to Basic or higher to export content'
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }

    // In real app, save to social media manager or download file
    if (onExport) {
      onExport(selectedContent.id, selectedPlatforms);
    }

    toast.success('Content exported!', {
      description: `Ready to post on ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`
    });

    // Save to social media manager
    saveToPlatforms(selectedContent, selectedPlatforms);

    setShowExportModal(false);
    setSelectedContent(null);
    setSelectedPlatforms([]);
  };

  const saveToPlatforms = (content: ExportableContent, platforms: string[]) => {
    try {
      // Get existing social media posts
      const storedPosts = localStorage.getItem('social_media_posts');
      const posts = storedPosts ? JSON.parse(storedPosts) : [];

      // Create new post with branding
      const brandedText = generateBrandedPost(content);
      const newPost = {
        id: `export-${Date.now()}`,
        content: brandedText,
        media_urls: content.preview_url ? [content.preview_url] : [],
        media_type: content.preview_url ? 'image' : 'text',
        platforms: platforms,
        scheduled_date: new Date(Date.now() + 86400000).toISOString(),
        status: 'draft',
        created_at: new Date().toISOString(),
        source: 'portal_export',
        branding: {
          company_name: branding.company_name,
          colors: {
            primary: branding.primary_color,
            accent: branding.accent_color
          }
        }
      };

      posts.push(newPost);
      localStorage.setItem('social_media_posts', JSON.stringify(posts));

      toast.success('Saved to Social Media Manager!', {
        description: 'Content is ready to schedule and publish'
      });
    } catch (error) {
      console.error('Error saving to platforms:', error);
    }
  };

  const openExportModal = (content: ExportableContent) => {
    if (!canExport) {
      toast.error('Upgrade Required', {
        description: 'Export feature requires Basic plan or higher'
      });
      return;
    }
    setSelectedContent(content);
    setShowExportModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            <Share2 className="w-7 h-7 text-[#ea580c]" />
            Social Media Export
          </h2>
          <p className="text-gray-400">Export branded content for your social media channels</p>
        </div>
        
        {/* Export Quota */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm text-gray-400">
              {maxExportsPerMonth === -1 ? 'Unlimited' : `${maxExportsPerMonth} exports/month`}
            </span>
          </div>
        </div>
      </div>

      {/* Upgrade Notice for Free Tier */}
      {!canExport && (
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Unlock Social Media Export</h3>
              <p className="text-gray-300 mb-4">
                Upgrade to Basic or higher to export branded content for your social media channels.
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-lg hover:from-[#c2410c] hover:to-[#9a3412] transition font-bold shadow-lg shadow-[#ea580c]/20">
                <Crown className="w-4 h-4 inline mr-2" />
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Platforms */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-bold text-white mb-4">Connected Platforms</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <div
                key={platform.id}
                className={`p-4 rounded-lg border-2 transition ${
                  platform.enabled
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-[#2A2A2A] bg-[#0A0A0A]'
                }`}
              >
                <Icon className={`w-8 h-8 ${platform.color} mb-2`} />
                <p className="text-sm font-medium text-white mb-1">{platform.name}</p>
                <p className={`text-xs ${platform.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                  {platform.enabled ? 'Connected' : 'Not Connected'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Content */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-6 border-b border-[#2A2A2A]">
          <h3 className="text-lg font-bold text-white">Available Content</h3>
          <p className="text-sm text-gray-400 mt-1">Select content to export with your branding</p>
        </div>

        <div className="divide-y divide-[#2A2A2A]">
          {availableContent.map((content) => (
            <div
              key={content.id}
              className="p-6 hover:bg-[#0A0A0A] transition group"
            >
              <div className="flex items-start gap-4">
                {/* Preview */}
                {content.preview_url ? (
                  <img
                    src={content.preview_url}
                    alt={content.title}
                    className="w-24 h-24 object-cover rounded-lg border border-[#2A2A2A]"
                  />
                ) : (
                  <div className="w-24 h-24 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-600" />
                  </div>
                )}

                {/* Content Info */}
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-white mb-2 group-hover:text-[#ea580c] transition">
                    {content.title}
                  </h4>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {generateBrandedPost(content).substring(0, 150)}...
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded font-medium">
                      {content.content_type}
                    </span>
                    <span>{new Date(content.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedContent(content);
                      handleCopyText();
                    }}
                    className="p-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition group/copy"
                  >
                    {copiedText && selectedContent?.id === content.id ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400 group-hover/copy:text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => openExportModal(content)}
                    disabled={!canExport}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition font-medium ${
                      canExport
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white hover:from-[#c2410c] hover:to-[#9a3412] shadow-lg shadow-[#ea580c]/20'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && selectedContent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Export to Social Media</h2>
                <p className="text-gray-400">{selectedContent.title}</p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Preview */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#ea580c]" />
                  Content Preview
                </h3>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                  {selectedContent.preview_url && (
                    <img
                      src={selectedContent.preview_url}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg mb-4"
                    />
                  )}
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {generateBrandedPost(selectedContent)}
                  </p>
                </div>
              </div>

              {/* Platform Selection */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Select Platforms</h3>
                <div className="grid grid-cols-2 gap-3">
                  {platforms.filter(p => p.enabled).map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatforms.includes(platform.id);
                    
                    return (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                          isSelected
                            ? 'border-[#ea580c] bg-[#ea580c]/10'
                            : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${platform.color}`} />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-white">{platform.name}</p>
                          <p className="text-xs text-gray-400">Ready to post</p>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-[#ea580c]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Export Format */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Export Format</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'text', label: 'Text Only', icon: FileText },
                    { id: 'image', label: 'With Image', icon: ImageIcon },
                    { id: 'video', label: 'Video', icon: Video }
                  ].map((format) => {
                    const Icon = format.icon;
                    const isSelected = exportFormat === format.id;
                    
                    return (
                      <button
                        key={format.id}
                        onClick={() => setExportFormat(format.id as any)}
                        className={`p-4 rounded-xl border-2 transition ${
                          isSelected
                            ? 'border-[#ea580c] bg-[#ea580c]/10'
                            : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                        <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {format.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A]">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium"
              >
                {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedText ? 'Copied!' : 'Copy Text'}
              </button>
              <button
                onClick={handleExport}
                disabled={selectedPlatforms.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-lg hover:from-[#c2410c] hover:to-[#9a3412] transition font-bold shadow-lg shadow-[#ea580c]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Export to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
