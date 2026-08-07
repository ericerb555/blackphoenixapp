/**
 * Portal Global Settings
 * 
 * Admin-only page for configuring global portal settings:
 * - Default themes and branding
 * - Notification preferences
 * - Email templates
 * - Branding assets
 * - Access policies
 * - Security settings
 * - Integration settings
 */

import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  ArrowLeft, Save, Settings, Palette, Bell, Mail, Image,
  Shield, Lock, Users, Globe, Zap, AlertCircle, Check,
  Upload, Download, Eye, EyeOff, Key, Server, Database,
  Smartphone, Monitor, Tablet, RefreshCw, Trash2, Copy,
  Crown, Award, Star, CheckCircle, XCircle, Edit, Plus,
  Search, Filter, LayoutGrid, List, BarChart3, FileText,
  MessageSquare, Video, Camera, Music, File, Folder,
  ChevronRight, ChevronDown, Info, HelpCircle, ExternalLink,
  Sparkles, Ruler
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BrandingHub } from '../components/branding/BrandingHub';

type SettingsTab = 'branding' | 'notifications' | 'email' | 'access' | 'security' | 'integrations' | 'defaults';

interface GlobalSettings {
  // Branding & Marketing Hub
  branding: {
    companyName: string;
    tagline?: string;
    logos: Array<{
      id: string;
      name: string;
      description?: string;
      url?: string;
      isDefault?: boolean;
    }>;
    colorPalettes: Array<{
      id: string;
      name: string;
      colors: Array<{
        name: string;
        hex: string;
        usage?: string;
      }>;
      isDefault?: boolean;
    }>;
    typography: {
      headingFont: string;
      bodyFont: string;
      fontPairings: Array<{
        id: string;
        name: string;
        heading: string;
        body: string;
        isActive?: boolean;
      }>;
    };
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    defaultTheme: 'light' | 'dark' | 'system';
    customCSS?: string;
  };
  
  // Asset Library
  assetLibrary: {
    categories: Array<{
      id: string;
      name: string;
      description?: string;
      icon: string;
      assets: Array<{
        id: string;
        name: string;
        description?: string;
        url?: string;
        type: 'image' | 'video' | 'document' | 'icon';
        tags: string[];
        uploadedAt: string;
        usageCount: number;
      }>;
    }>;
  };
  
  // Notifications
  notifications: {
    enablePushNotifications: boolean;
    enableEmailNotifications: boolean;
    enableSMSNotifications: boolean;
    portalCreatedNotifyAdmin: boolean;
    portalApprovedNotifyUser: boolean;
    dailyDigestEnabled: boolean;
    digestTime: string;
    criticalAlertsOnly: boolean;
  };
  
  // Email Templates
  emailTemplates: {
    portalCreatedSubject: string;
    portalCreatedBody: string;
    portalApprovedSubject: string;
    portalApprovedBody: string;
    portalRejectedSubject: string;
    portalRejectedBody: string;
    welcomeEmailSubject: string;
    welcomeEmailBody: string;
    fromEmail: string;
    replyToEmail: string;
    emailSignature: string;
  };
  
  // Access Control
  accessControl: {
    requireApprovalForNewPortals: boolean;
    allowPublicPortals: boolean;
    allowUserCreatedPortals: boolean;
    maxPortalsPerUser: number;
    allowedRoles: string[];
    autoApproveForRoles: string[];
    restrictedFeatures: string[];
  };
  
  // Security
  security: {
    enforceSSL: boolean;
    enableTwoFactor: boolean;
    sessionTimeout: number;
    passwordMinLength: number;
    requirePasswordChange: boolean;
    passwordChangeDays: number;
    allowAPIAccess: boolean;
    rateLimitRequests: boolean;
    maxRequestsPerMinute: number;
    ipWhitelist: string[];
    enableAuditLog: boolean;
  };
  
  // Integrations
  integrations: {
    enableAIContentCreator: boolean;
    enableDesignCenter: boolean;
    enablePaymentProcessing: boolean;
    enableAnalytics: boolean;
    stripeEnabled: boolean;
    stripePublishableKey?: string;
    googleAnalyticsId?: string;
    slackWebhookUrl?: string;
    customWebhooks: { name: string; url: string; events: string[] }[];
  };
  
  // Default Portal Settings
  defaults: {
    defaultPortalType: string;
    defaultVisibility: 'public' | 'private' | 'restricted';
    defaultFeatures: string[];
    defaultPrimaryColor: string;
    defaultSecondaryColor: string;
    autoEnableNewFeatures: boolean;
    allowUserCustomization: boolean;
    requireDescriptions: boolean;
    minDescriptionLength: number;
  };
}

interface PortalGlobalSettingsProps {
  onBack?: () => void;
}

export default function PortalGlobalSettings({ onBack }: PortalGlobalSettingsProps = {}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [brandingSubTab, setBrandingSubTab] = useState<'identity' | 'assets' | 'import'>('identity');
  const [isSaving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Mock user role - in production, this would come from auth context
  const userRole = 'admin'; // admin, owner, super_admin
  const canAccess = ['admin', 'owner', 'super_admin'].includes(userRole);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/mobile-app-hub';
    }
  };

  const [settings, setSettings] = useState<GlobalSettings>({
    branding: {
      companyName: 'Enterprise Portal System',
      tagline: 'Building the future of enterprise portals',
      logos: [
        { id: '1', name: 'Primary Logo', description: 'Main company logo', isDefault: true },
        { id: '2', name: 'Secondary Logo', description: 'Alternative version', isDefault: true },
        { id: '3', name: 'White Logo', description: 'For dark backgrounds', isDefault: true },
        { id: '4', name: 'Dark Logo', description: 'For light backgrounds', isDefault: true },
        { id: '5', name: 'Favicon', description: 'Browser tab icon (32×32)', isDefault: true },
        { id: '6', name: 'Email Logo', description: 'For email templates', isDefault: true },
      ],
      colorPalettes: [
        {
          id: '1',
          name: 'Primary Brand Colors',
          isDefault: true,
          colors: [
            { name: 'Deep Orange', hex: '#ea580c', usage: 'Primary actions, CTAs' },
            { name: 'Bright Orange', hex: '#f97316', usage: 'Secondary elements' },
            { name: 'Light Orange', hex: '#fb923c', usage: 'Accents, highlights' },
            { name: 'Ultra Dark', hex: '#0A0A0A', usage: 'Backgrounds' },
            { name: 'Dark Gray', hex: '#1A1A1A', usage: 'Cards, panels' },
            { name: 'Medium Gray', hex: '#2A2A2A', usage: 'Borders, dividers' },
          ]
        },
        {
          id: '2',
          name: 'Success & Status',
          isDefault: true,
          colors: [
            { name: 'Success Green', hex: '#22c55e', usage: 'Success states' },
            { name: 'Warning Yellow', hex: '#eab308', usage: 'Warnings' },
            { name: 'Error Red', hex: '#ef4444', usage: 'Errors, alerts' },
            { name: 'Info Blue', hex: '#3b82f6', usage: 'Information' },
          ]
        }
      ],
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        fontPairings: [
          { id: '1', name: 'Inter (Default)', heading: 'Inter', body: 'Inter', isActive: true },
          { id: '2', name: 'Poppins & Open Sans', heading: 'Poppins', body: 'Open Sans', isActive: false },
          { id: '3', name: 'Montserrat & Roboto', heading: 'Montserrat', body: 'Roboto', isActive: false },
        ]
      },
      primaryColor: '#ea580c',
      secondaryColor: '#f97316',
      accentColor: '#fb923c',
      defaultTheme: 'dark'
    },
    assetLibrary: {
      categories: [
        {
          id: '1',
          name: 'Marketing Banners',
          description: 'Hero banners, CTAs, promotional graphics',
          icon: 'LayoutGrid',
          assets: []
        },
        {
          id: '2',
          name: 'Product Images',
          description: 'Product photos, mockups, screenshots',
          icon: 'Camera',
          assets: []
        },
        {
          id: '3',
          name: 'Team Photos',
          description: 'Team members, leadership, office photos',
          icon: 'Users',
          assets: []
        },
        {
          id: '4',
          name: 'Icons & Graphics',
          description: 'Icons, illustrations, graphic elements',
          icon: 'Sparkles',
          assets: []
        },
        {
          id: '5',
          name: 'Videos & Animations',
          description: 'Video content, animated graphics',
          icon: 'Video',
          assets: []
        },
        {
          id: '6',
          name: 'Documents & PDFs',
          description: 'Brochures, case studies, whitepapers',
          icon: 'FileText',
          assets: []
        }
      ]
    },
    notifications: {
      enablePushNotifications: true,
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      portalCreatedNotifyAdmin: true,
      portalApprovedNotifyUser: true,
      dailyDigestEnabled: false,
      digestTime: '09:00',
      criticalAlertsOnly: false
    },
    emailTemplates: {
      portalCreatedSubject: 'New Portal Created - Pending Approval',
      portalCreatedBody: 'A new portal "{portalName}" has been created and is awaiting your approval.',
      portalApprovedSubject: 'Your Portal Has Been Approved!',
      portalApprovedBody: 'Congratulations! Your portal "{portalName}" has been approved and is now live.',
      portalRejectedSubject: 'Portal Submission Update',
      portalRejectedBody: 'Your portal "{portalName}" requires some changes. Reason: {reason}',
      welcomeEmailSubject: 'Welcome to {companyName}!',
      welcomeEmailBody: 'Thank you for joining our platform. Get started by creating your first portal.',
      fromEmail: 'noreply@company.com',
      replyToEmail: 'support@company.com',
      emailSignature: 'Best regards,\nThe Team'
    },
    accessControl: {
      requireApprovalForNewPortals: true,
      allowPublicPortals: false,
      allowUserCreatedPortals: true,
      maxPortalsPerUser: 10,
      allowedRoles: ['admin', 'manager', 'user'],
      autoApproveForRoles: ['admin', 'owner'],
      restrictedFeatures: []
    },
    security: {
      enforceSSL: true,
      enableTwoFactor: false,
      sessionTimeout: 30,
      passwordMinLength: 8,
      requirePasswordChange: false,
      passwordChangeDays: 90,
      allowAPIAccess: true,
      rateLimitRequests: true,
      maxRequestsPerMinute: 60,
      ipWhitelist: [],
      enableAuditLog: true
    },
    integrations: {
      enableAIContentCreator: true,
      enableDesignCenter: true,
      enablePaymentProcessing: false,
      enableAnalytics: true,
      stripeEnabled: false,
      customWebhooks: []
    },
    defaults: {
      defaultPortalType: 'customer',
      defaultVisibility: 'private',
      defaultFeatures: ['dashboard', 'messages', 'documents'],
      defaultPrimaryColor: '#ea580c',
      defaultSecondaryColor: '#f97316',
      autoEnableNewFeatures: false,
      allowUserCustomization: true,
      requireDescriptions: true,
      minDescriptionLength: 50
    }
  });

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

  // Load any previously saved settings from the server, merging over the defaults
  // so newly-added setting fields still have sensible values.
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/portal-settings`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        });
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
        const data = await res.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (error) {
        console.error('[PortalSettings] Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const updateSettings = (section: keyof GlobalSettings, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
    setHasUnsavedChanges(true);
  };

  const updateAssets = (categoryId: string, updates: any) => {
    setSettings(prev => ({
      ...prev,
      assetLibrary: {
        ...prev.assetLibrary,
        categories: prev.assetLibrary.categories.map(cat =>
          cat.id === categoryId ? { ...cat, ...updates } : cat
        )
      }
    }));
    setHasUnsavedChanges(true);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/portal-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save settings (${res.status}): ${errText}`);
      }

      toast.success('Settings saved successfully', {
        description: 'Global portal settings have been updated'
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[PortalSettings] Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = () => {
    // Actually reset to defaults
    setSettings({
      branding: {
        companyName: 'Enterprise Portal System',
        tagline: 'Building the future of enterprise portals',
        logos: [
          { id: '1', name: 'Primary Logo', description: 'Main company logo', isDefault: true },
          { id: '2', name: 'Secondary Logo', description: 'Alternative version', isDefault: true },
          { id: '3', name: 'White Logo', description: 'For dark backgrounds', isDefault: true },
          { id: '4', name: 'Dark Logo', description: 'For light backgrounds', isDefault: true },
          { id: '5', name: 'Favicon', description: 'Browser tab icon (32×32)', isDefault: true },
          { id: '6', name: 'Email Logo', description: 'For email templates', isDefault: true },
        ],
        colorPalettes: [
          {
            id: '1',
            name: 'Primary Brand Colors',
            isDefault: true,
            colors: [
              { name: 'Deep Orange', hex: '#ea580c', usage: 'Primary actions, CTAs' },
              { name: 'Bright Orange', hex: '#f97316', usage: 'Secondary elements' },
              { name: 'Light Orange', hex: '#fb923c', usage: 'Accents, highlights' },
              { name: 'Ultra Dark', hex: '#0A0A0A', usage: 'Backgrounds' },
              { name: 'Dark Gray', hex: '#1A1A1A', usage: 'Cards, panels' },
              { name: 'Medium Gray', hex: '#2A2A2A', usage: 'Borders, dividers' },
            ]
          },
          {
            id: '2',
            name: 'Success & Status',
            isDefault: true,
            colors: [
              { name: 'Success Green', hex: '#22c55e', usage: 'Success states' },
              { name: 'Warning Yellow', hex: '#eab308', usage: 'Warnings' },
              { name: 'Error Red', hex: '#ef4444', usage: 'Errors, alerts' },
              { name: 'Info Blue', hex: '#3b82f6', usage: 'Information' },
            ]
          }
        ],
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
          fontPairings: [
            { id: '1', name: 'Inter (Default)', heading: 'Inter', body: 'Inter', isActive: true },
            { id: '2', name: 'Poppins & Open Sans', heading: 'Poppins', body: 'Open Sans', isActive: false },
            { id: '3', name: 'Montserrat & Roboto', heading: 'Montserrat', body: 'Roboto', isActive: false },
          ]
        },
        primaryColor: '#ea580c',
        secondaryColor: '#f97316',
        accentColor: '#fb923c',
        defaultTheme: 'dark'
      },
      assetLibrary: {
        categories: [
          {
            id: '1',
            name: 'Marketing Banners',
            description: 'Hero banners, CTAs, promotional graphics',
            icon: 'LayoutGrid',
            assets: []
          },
          {
            id: '2',
            name: 'Product Images',
            description: 'Product photos, mockups, screenshots',
            icon: 'Camera',
            assets: []
          },
          {
            id: '3',
            name: 'Team Photos',
            description: 'Team members, leadership, office photos',
            icon: 'Users',
            assets: []
          },
          {
            id: '4',
            name: 'Icons & Graphics',
            description: 'Icons, illustrations, graphic elements',
            icon: 'Sparkles',
            assets: []
          },
          {
            id: '5',
            name: 'Videos & Animations',
            description: 'Video content, animated graphics',
            icon: 'Video',
            assets: []
          },
          {
            id: '6',
            name: 'Documents & PDFs',
            description: 'Brochures, case studies, whitepapers',
            icon: 'FileText',
            assets: []
          }
        ]
      },
      notifications: {
        enablePushNotifications: true,
        enableEmailNotifications: true,
        enableSMSNotifications: false,
        portalCreatedNotifyAdmin: true,
        portalApprovedNotifyUser: true,
        dailyDigestEnabled: false,
        digestTime: '09:00',
        criticalAlertsOnly: false
      },
      emailTemplates: {
        portalCreatedSubject: 'New Portal Created - Pending Approval',
        portalCreatedBody: 'A new portal "{portalName}" has been created and is awaiting your approval.',
        portalApprovedSubject: 'Your Portal Has Been Approved!',
        portalApprovedBody: 'Congratulations! Your portal "{portalName}" has been approved and is now live.',
        portalRejectedSubject: 'Portal Submission Update',
        portalRejectedBody: 'Your portal "{portalName}" requires some changes. Reason: {reason}',
        welcomeEmailSubject: 'Welcome to {companyName}!',
        welcomeEmailBody: 'Thank you for joining our platform. Get started by creating your first portal.',
        fromEmail: 'noreply@company.com',
        replyToEmail: 'support@company.com',
        emailSignature: 'Best regards,\nThe Team'
      },
      accessControl: {
        requireApprovalForNewPortals: true,
        allowPublicPortals: false,
        allowUserCreatedPortals: true,
        maxPortalsPerUser: 10,
        allowedRoles: ['admin', 'manager', 'user'],
        autoApproveForRoles: ['admin', 'owner'],
        restrictedFeatures: []
      },
      security: {
        enforceSSL: true,
        enableTwoFactor: false,
        sessionTimeout: 30,
        passwordMinLength: 8,
        requirePasswordChange: false,
        passwordChangeDays: 90,
        allowAPIAccess: true,
        rateLimitRequests: true,
        maxRequestsPerMinute: 60,
        ipWhitelist: [],
        enableAuditLog: true
      },
      integrations: {
        enableAIContentCreator: true,
        enableDesignCenter: true,
        enablePaymentProcessing: false,
        enableAnalytics: true,
        stripeEnabled: false,
        customWebhooks: []
      },
      defaults: {
        defaultPortalType: 'customer',
        defaultVisibility: 'private',
        defaultFeatures: ['dashboard', 'messages', 'documents'],
        defaultPrimaryColor: '#ea580c',
        defaultSecondaryColor: '#f97316',
        autoEnableNewFeatures: false,
        allowUserCustomization: true,
        requireDescriptions: true,
        minDescriptionLength: 50
      }
    });
    
    toast.success('Settings reset to defaults');
    setHasUnsavedChanges(true);
    setShowResetConfirm(false);
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'portal-settings-export.json';
    link.click();
    toast.success('Settings exported');
  };

  // Reads a previously exported settings JSON file back in. Only keys that
  // already exist in the current settings object are applied, so a stale or
  // hand-edited file can't inject unknown fields.
  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('That file does not contain a settings object.');
        }
        const known = Object.keys(settings);
        const applied = Object.fromEntries(
          Object.entries(parsed).filter(([key]) => known.includes(key)),
        );
        const skipped = Object.keys(parsed).length - Object.keys(applied).length;
        if (Object.keys(applied).length === 0) {
          throw new Error('No recognised settings were found in that file.');
        }
        setSettings(prev => ({ ...prev, ...applied }));
        setHasUnsavedChanges(true);
        toast.success(
          `Imported ${Object.keys(applied).length} setting${Object.keys(applied).length === 1 ? '' : 's'}` +
          `${skipped > 0 ? ` (${skipped} unrecognised key${skipped === 1 ? '' : 's'} ignored)` : ''}. Save to apply.`,
        );
      } catch (err: any) {
        console.error('Portal settings import failed:', err);
        toast.error(`Could not import settings: ${err?.message || err}`);
      }
    };
    input.click();
  };

  const tabs = [
    { id: 'branding' as SettingsTab, label: 'Branding', icon: Palette, color: 'purple' },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell, color: 'blue' },
    { id: 'email' as SettingsTab, label: 'Email Templates', icon: Mail, color: 'green' },
    { id: 'access' as SettingsTab, label: 'Access Control', icon: Shield, color: 'yellow' },
    { id: 'security' as SettingsTab, label: 'Security', icon: Lock, color: 'red' },
    { id: 'integrations' as SettingsTab, label: 'Integrations', icon: Zap, color: 'cyan' },
    { id: 'defaults' as SettingsTab, label: 'Defaults', icon: Settings, color: 'gray' }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
      blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
      green: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
      yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
      red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
      cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400' },
      gray: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' }
    };
    return colors[color] || colors.gray;
  };

  // Access Control Check
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1A1A1A] rounded-2xl border border-red-500/30 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            You need administrator privileges to access global settings.
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl transition"
          >
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  // Render Branding Tab - Using Modular Branding Hub
  const renderBrandingTab = () => (
    <BrandingHub 
      settings={settings} 
      updateSettings={updateSettings}
      updateAssets={updateAssets}
    />
  );

  // Render Notifications Tab
  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Notification Settings</h3>
        
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          {/* Toggle Switches */}
          {[
            { key: 'enablePushNotifications', label: 'Push Notifications', desc: 'Send browser push notifications' },
            { key: 'enableEmailNotifications', label: 'Email Notifications', desc: 'Send email notifications to users' },
            { key: 'enableSMSNotifications', label: 'SMS Notifications', desc: 'Send SMS for critical alerts' },
            { key: 'portalCreatedNotifyAdmin', label: 'Portal Created → Admin', desc: 'Notify admins when new portal is created' },
            { key: 'portalApprovedNotifyUser', label: 'Portal Approved → User', desc: 'Notify users when portal is approved' },
            { key: 'dailyDigestEnabled', label: 'Daily Digest', desc: 'Send daily summary email' },
            { key: 'criticalAlertsOnly', label: 'Critical Alerts Only', desc: 'Only send critical notifications' }
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div className="flex-1">
                <p className="font-semibold text-white mb-1">{label}</p>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
              <button
                onClick={() => updateSettings('notifications', { 
                  [key]: !settings.notifications[key as keyof typeof settings.notifications] 
                })}
                className={`relative w-14 h-8 rounded-full transition ${
                  settings.notifications[key as keyof typeof settings.notifications]
                    ? 'bg-[#ea580c]'
                    : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  settings.notifications[key as keyof typeof settings.notifications]
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}

          {/* Digest Time */}
          {settings.notifications.dailyDigestEnabled && (
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Daily Digest Time
              </label>
              <input
                type="time"
                value={settings.notifications.digestTime}
                onChange={(e) => updateSettings('notifications', { digestTime: e.target.value })}
                className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Email Templates Tab
  const renderEmailTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Email Templates</h3>
        
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          {/* Email Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                From Email
              </label>
              <input
                type="email"
                value={settings.emailTemplates.fromEmail}
                onChange={(e) => updateSettings('emailTemplates', { fromEmail: e.target.value })}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Reply-To Email
              </label>
              <input
                type="email"
                value={settings.emailTemplates.replyToEmail}
                onChange={(e) => updateSettings('emailTemplates', { replyToEmail: e.target.value })}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
              />
            </div>
          </div>

          {/* Email Signature */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Email Signature
            </label>
            <textarea
              value={settings.emailTemplates.emailSignature}
              onChange={(e) => updateSettings('emailTemplates', { emailSignature: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
            />
          </div>

          {/* Templates */}
          {[
            { subjectKey: 'portalCreatedSubject', bodyKey: 'portalCreatedBody', title: 'Portal Created (Admin)' },
            { subjectKey: 'portalApprovedSubject', bodyKey: 'portalApprovedBody', title: 'Portal Approved (User)' },
            { subjectKey: 'portalRejectedSubject', bodyKey: 'portalRejectedBody', title: 'Portal Rejected (User)' },
            { subjectKey: 'welcomeEmailSubject', bodyKey: 'welcomeEmailBody', title: 'Welcome Email' }
          ].map(({ subjectKey, bodyKey, title }) => (
            <div key={title} className="p-4 bg-[#0A0A0A] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white">{title}</h4>
                <button className="text-sm text-[#ea580c] hover:text-[#f97316] flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={settings.emailTemplates[subjectKey as keyof typeof settings.emailTemplates] as string}
                  onChange={(e) => updateSettings('emailTemplates', { [subjectKey]: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Body</label>
                <textarea
                  value={settings.emailTemplates[bodyKey as keyof typeof settings.emailTemplates] as string}
                  onChange={(e) => updateSettings('emailTemplates', { [bodyKey]: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]/50"
                />
              </div>
              <p className="text-sm text-gray-500">
                Available variables: {'{portalName}'}, {'{userName}'}, {'{companyName}'}, {'{reason}'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Access Control Tab
  const renderAccessTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Access Control</h3>
        
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          {/* Toggle Settings */}
          {[
            { key: 'requireApprovalForNewPortals', label: 'Require Approval', desc: 'New portals need admin approval' },
            { key: 'allowPublicPortals', label: 'Allow Public Portals', desc: 'Users can create public portals' },
            { key: 'allowUserCreatedPortals', label: 'User Portal Creation', desc: 'Non-admins can create portals' }
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div className="flex-1">
                <p className="font-semibold text-white mb-1">{label}</p>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
              <button
                onClick={() => updateSettings('accessControl', { 
                  [key]: !settings.accessControl[key as keyof typeof settings.accessControl] 
                })}
                className={`relative w-14 h-8 rounded-full transition ${
                  settings.accessControl[key as keyof typeof settings.accessControl]
                    ? 'bg-[#ea580c]'
                    : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  settings.accessControl[key as keyof typeof settings.accessControl]
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}

          {/* Max Portals Per User */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Max Portals Per User
            </label>
            <input
              type="number"
              value={settings.accessControl.maxPortalsPerUser}
              onChange={(e) => updateSettings('accessControl', { maxPortalsPerUser: parseInt(e.target.value) })}
              min="1"
              max="100"
              className="w-32 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
            />
            <p className="text-sm text-gray-500 mt-2">Set to 0 for unlimited</p>
          </div>

          {/* Allowed Roles */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Roles Allowed to Create Portals
            </label>
            <div className="flex flex-wrap gap-2">
              {['admin', 'owner', 'manager', 'user', 'subcontractor'].map((role) => {
                const isAllowed = settings.accessControl.allowedRoles.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => {
                      const roles = isAllowed
                        ? settings.accessControl.allowedRoles.filter(r => r !== role)
                        : [...settings.accessControl.allowedRoles, role];
                      updateSettings('accessControl', { allowedRoles: roles });
                    }}
                    className={`px-4 py-2 rounded-lg border-2 transition capitalize ${
                      isAllowed
                        ? 'border-[#ea580c] bg-[#ea580c]/20 text-[#ea580c]'
                        : 'border-[#2A2A2A] text-gray-400 hover:border-[#ea580c]/50'
                    }`}
                  >
                    {role}
                    {isAllowed && <CheckCircle className="w-4 h-4 inline ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-Approve Roles */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Auto-Approve for Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {['admin', 'owner', 'manager'].map((role) => {
                const isAutoApprove = settings.accessControl.autoApproveForRoles.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => {
                      const roles = isAutoApprove
                        ? settings.accessControl.autoApproveForRoles.filter(r => r !== role)
                        : [...settings.accessControl.autoApproveForRoles, role];
                      updateSettings('accessControl', { autoApproveForRoles: roles });
                    }}
                    className={`px-4 py-2 rounded-lg border-2 transition capitalize ${
                      isAutoApprove
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-[#2A2A2A] text-gray-400 hover:border-green-500/50'
                    }`}
                  >
                    {role}
                    {isAutoApprove && <Crown className="w-4 h-4 inline ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Security Tab
  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Security Settings</h3>
        
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          {/* Security Toggles */}
          {[
            { key: 'enforceSSL', label: 'Enforce SSL/HTTPS', desc: 'Require secure connections', recommended: true },
            { key: 'enableTwoFactor', label: 'Two-Factor Authentication', desc: 'Require 2FA for all users' },
            { key: 'requirePasswordChange', label: 'Periodic Password Change', desc: 'Force users to change passwords' },
            { key: 'allowAPIAccess', label: 'API Access', desc: 'Allow external API access' },
            { key: 'rateLimitRequests', label: 'Rate Limiting', desc: 'Limit requests per minute' },
            { key: 'enableAuditLog', label: 'Audit Logging', desc: 'Log all system activities', recommended: true }
          ].map(({ key, label, desc, recommended }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{label}</p>
                  {recommended && (
                    <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-sm text-green-400">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">{desc}</p>
              </div>
              <button
                onClick={() => updateSettings('security', { 
                  [key]: !settings.security[key as keyof typeof settings.security] 
                })}
                className={`relative w-14 h-8 rounded-full transition ${
                  settings.security[key as keyof typeof settings.security]
                    ? 'bg-[#ea580c]'
                    : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  settings.security[key as keyof typeof settings.security]
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}

          {/* Numeric Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => updateSettings('security', { sessionTimeout: parseInt(e.target.value) })}
                min="5"
                max="1440"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Min Password Length
              </label>
              <input
                type="number"
                value={settings.security.passwordMinLength}
                onChange={(e) => updateSettings('security', { passwordMinLength: parseInt(e.target.value) })}
                min="6"
                max="32"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
              />
            </div>
            {settings.security.requirePasswordChange && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password Change Days
                </label>
                <input
                  type="number"
                  value={settings.security.passwordChangeDays}
                  onChange={(e) => updateSettings('security', { passwordChangeDays: parseInt(e.target.value) })}
                  min="30"
                  max="365"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
                />
              </div>
            )}
            {settings.security.rateLimitRequests && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Max Requests/Minute
                </label>
                <input
                  type="number"
                  value={settings.security.maxRequestsPerMinute}
                  onChange={(e) => updateSettings('security', { maxRequestsPerMinute: parseInt(e.target.value) })}
                  min="10"
                  max="1000"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
                />
              </div>
            )}
          </div>

          {/* IP Whitelist */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              IP Whitelist (Optional)
            </label>
            <textarea
              placeholder="Enter IP addresses, one per line"
              value={settings.security.ipWhitelist.join('\n')}
              onChange={(e) => updateSettings('security', { ipWhitelist: e.target.value.split('\n').filter(Boolean) })}
              rows={4}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-[#ea580c]/50"
            />
            <p className="text-sm text-gray-500 mt-2">Leave empty to allow all IPs</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Integrations Tab
  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Integration Settings</h3>
        
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          {/* Integration Toggles */}
          {[
            { key: 'enableAIContentCreator', label: 'AI Content Creator', desc: 'Enable AI-powered content generation', icon: Sparkles },
            { key: 'enableDesignCenter', label: 'Design Center', desc: 'Enable CAD and design tools', icon: Ruler },
            { key: 'enablePaymentProcessing', label: 'Payment Processing', desc: 'Accept payments through portals', icon: Zap },
            { key: 'enableAnalytics', label: 'Analytics', desc: 'Track portal usage and metrics', icon: BarChart3 },
            { key: 'stripeEnabled', label: 'Stripe Payments', desc: 'Enable Stripe payment integration', icon: Key }
          ].map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{label}</p>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
              </div>
              <button
                onClick={() => updateSettings('integrations', { 
                  [key]: !settings.integrations[key as keyof typeof settings.integrations] 
                })}
                className={`relative w-14 h-8 rounded-full transition ${
                  settings.integrations[key as keyof typeof settings.integrations]
                    ? 'bg-[#ea580c]'
                    : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  settings.integrations[key as keyof typeof settings.integrations]
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}

          {/* API Keys */}
          {settings.integrations.stripeEnabled && (
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Stripe Publishable Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.integrations.stripePublishableKey || ''}
                  onChange={(e) => updateSettings('integrations', { stripePublishableKey: e.target.value })}
                  placeholder="pk_live_..."
                  className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-[#ea580c]/50"
                />
                <button className="p-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl transition">
                  <Eye className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {settings.integrations.enableAnalytics && (
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Google Analytics ID
              </label>
              <input
                type="text"
                value={settings.integrations.googleAnalyticsId || ''}
                onChange={(e) => updateSettings('integrations', { googleAnalyticsId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-[#ea580c]/50"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Slack Webhook URL (Optional)
            </label>
            <input
              type="text"
              value={settings.integrations.slackWebhookUrl || ''}
              onChange={(e) => updateSettings('integrations', { slackWebhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-[#ea580c]/50"
            />
            <p className="text-sm text-gray-500 mt-2">Receive notifications in Slack</p>
          </div>

          {/* Custom Webhooks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-white">
                Custom Webhooks
              </label>
              <button className="px-3 py-1.5 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/30 text-[#ea580c] rounded-lg text-sm transition flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Webhook
              </button>
            </div>
            {settings.integrations.customWebhooks.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-[#2A2A2A] rounded-xl text-center">
                <p className="text-sm text-gray-500">No custom webhooks configured</p>
              </div>
            ) : (
              <div className="space-y-2">
                {settings.integrations.customWebhooks.map((webhook, idx) => (
                  <div key={idx} className="p-3 bg-[#0A0A0A] rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{webhook.name}</p>
                      <p className="text-sm text-gray-500 font-mono">{webhook.url}</p>
                    </div>
                    <button className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Defaults Tab
  const renderDefaultsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Default Portal Settings</h3>
        
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
          {/* Default Portal Type */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Default Portal Type
            </label>
            <select
              value={settings.defaults.defaultPortalType}
              onChange={(e) => updateSettings('defaults', { defaultPortalType: e.target.value })}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
            >
              <option value="customer">Customer Portal</option>
              <option value="employee">Employee Portal</option>
              <option value="subcontractor">Subcontractor Portal</option>
              <option value="vendor">Vendor Portal</option>
              <option value="custom">Custom Portal</option>
            </select>
          </div>

          {/* Default Visibility */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Default Visibility
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['private', 'restricted', 'public'].map((visibility) => (
                <button
                  key={visibility}
                  onClick={() => updateSettings('defaults', { defaultVisibility: visibility })}
                  className={`p-4 rounded-xl border-2 transition capitalize ${
                    settings.defaults.defaultVisibility === visibility
                      ? 'border-[#ea580c] bg-[#ea580c]/10'
                      : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{visibility}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Default Colors */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Default Color Scheme
            </label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'defaultPrimaryColor', label: 'Primary' },
                { key: 'defaultSecondaryColor', label: 'Secondary' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-2">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.defaults[key as keyof typeof settings.defaults] as string}
                      onChange={(e) => updateSettings('defaults', { [key]: e.target.value })}
                      className="w-12 h-12 rounded-lg border-2 border-[#2A2A2A] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.defaults[key as keyof typeof settings.defaults] as string}
                      onChange={(e) => updateSettings('defaults', { [key]: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white font-mono text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Default Features */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Default Enabled Features
            </label>
            <div className="flex flex-wrap gap-2">
              {['dashboard', 'projects', 'messages', 'payments', 'documents', 'calendar', 'notifications', 'analytics'].map((feature) => {
                const isEnabled = settings.defaults.defaultFeatures.includes(feature);
                return (
                  <button
                    key={feature}
                    onClick={() => {
                      const features = isEnabled
                        ? settings.defaults.defaultFeatures.filter(f => f !== feature)
                        : [...settings.defaults.defaultFeatures, feature];
                      updateSettings('defaults', { defaultFeatures: features });
                    }}
                    className={`px-4 py-2 rounded-lg border-2 transition capitalize ${
                      isEnabled
                        ? 'border-[#ea580c] bg-[#ea580c]/20 text-[#ea580c]'
                        : 'border-[#2A2A2A] text-gray-400 hover:border-[#ea580c]/50'
                    }`}
                  >
                    {feature}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other Defaults */}
          {[
            { key: 'autoEnableNewFeatures', label: 'Auto-Enable New Features', desc: 'Automatically enable new features when released' },
            { key: 'allowUserCustomization', label: 'Allow User Customization', desc: 'Users can customize their portal settings' },
            { key: 'requireDescriptions', label: 'Require Descriptions', desc: 'Portal descriptions are mandatory' }
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
              <div className="flex-1">
                <p className="font-semibold text-white mb-1">{label}</p>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
              <button
                onClick={() => updateSettings('defaults', { 
                  [key]: !settings.defaults[key as keyof typeof settings.defaults] 
                })}
                className={`relative w-14 h-8 rounded-full transition ${
                  settings.defaults[key as keyof typeof settings.defaults]
                    ? 'bg-[#ea580c]'
                    : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  settings.defaults[key as keyof typeof settings.defaults]
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}

          {settings.defaults.requireDescriptions && (
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Minimum Description Length
              </label>
              <input
                type="number"
                value={settings.defaults.minDescriptionLength}
                onChange={(e) => updateSettings('defaults', { minDescriptionLength: parseInt(e.target.value) })}
                min="10"
                max="500"
                className="w-32 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
              />
              <span className="ml-3 text-sm text-gray-400">characters</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'branding': return renderBrandingTab();
      case 'notifications': return renderNotificationsTab();
      case 'email': return renderEmailTab();
      case 'access': return renderAccessTab();
      case 'security': return renderSecurityTab();
      case 'integrations': return renderIntegrationsTab();
      case 'defaults': return renderDefaultsTab();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#ea580c]" />
                  Global Portal Settings
                </h1>
                <p className="text-sm text-gray-400">
                  Configure system-wide portal settings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <span className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved Changes
                </span>
              )}
              <button
                onClick={exportSettings}
                className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={saveSettings}
                disabled={isSaving || !hasUnsavedChanges}
                className="px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#f97316] hover:to-[#fb923c] text-white rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4 sticky top-24">
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const colors = getColorClasses(tab.color);
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full px-4 py-3 rounded-xl transition text-left flex items-center gap-3 ${
                        isActive
                          ? `${colors.bg} border ${colors.border} ${colors.text}`
                          : 'hover:bg-[#0A0A0A] text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-[#2A2A2A] space-y-3">
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl transition text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset to Defaults
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-400">Are you sure?</p>
                          <p className="text-sm text-red-300 mt-1">
                            This will reset ALL settings to factory defaults. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition text-sm font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmReset}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Confirm Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderCurrentTab()}
          </div>
        </div>
      </div>
    </div>
  );
}
