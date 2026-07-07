/**
 * Portal Access Point
 * 
 * Public-facing login page for:
 * - Subcontractors
 * - Investors
 * - Vendors
 * - Employees
 * 
 * Each user type gets access to design tools, marketing tools,
 * and functions based on admin-controlled permissions
 */

import { useState, useEffect } from 'react';
import {
  LogIn, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle,
  Building2, Briefcase, DollarSign, Users, Package, Sparkles,
  Palette, FileText, Image, Video, Layout, Megaphone, Share2,
  BarChart3, Shield, Settings, Globe, ChevronRight, Star,
  Zap, Crown, Target, TrendingUp, Clock, Award
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useUserProfile } from '../lib/hooks/useUserProfile';

type UserRole = 'subcontractor' | 'investor' | 'vendor' | 'employee' | null;

interface UserPermissions {
  designTools: {
    cadDesign: boolean;
    graphics: boolean;
    videoEditing: boolean;
    templates: boolean;
  };
  marketingTools: {
    campaigns: boolean;
    socialMedia: boolean;
    analytics: boolean;
    contentCreation: boolean;
  };
  businessTools: {
    quotes: boolean;
    invoices: boolean;
    projects: boolean;
    reporting: boolean;
  };
  collaboration: {
    messaging: boolean;
    fileSharing: boolean;
    teamWorkspace: boolean;
  };
}

export default function PortalAccess() {
  const { profile, displayName } = useUserProfile();
  const [step, setStep] = useState<'select-role' | 'login' | 'portal'>('select-role');
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const lastEmail = localStorage.getItem('lastEmail');
    
    setRememberMe(remembered);
    if (remembered && lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  // Check for demo user on mount
  useEffect(() => {
    try {
      // FIX: Use consistent key 'demo_mode' to match AuthContext
      const demoMode = localStorage.getItem('demo_mode');
      if (demoMode === 'true') {
        console.log('🎭 Demo mode detected in PortalAccess');
        
        // Map demo roles to portal roles
        const roleMap: Record<string, UserRole> = {
          'professional': 'subcontractor',
          'property_manager': 'subcontractor',
          'provider': 'vendor',
          'stakeholder': 'investor',
          'investor': 'investor',
          'employee': 'employee',
          'field_worker': 'employee'
        };
        
        const mappedRole = roleMap['professional'] || 'subcontractor';
        setSelectedRole(mappedRole);
        setEmail('demo@example.com');
        
        // Auto-login demo user
        toast.success(`Welcome to the Demo Portal!`, {
          description: 'Demo portal access granted'
        });
        setStep('portal');
      }
    } catch (error) {
      console.error('Error checking demo user:', error);
    }
  }, []);

  // Mock permissions (would come from backend based on admin settings)
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    designTools: {
      cadDesign: true,
      graphics: true,
      videoEditing: false,
      templates: true
    },
    marketingTools: {
      campaigns: true,
      socialMedia: true,
      analytics: true,
      contentCreation: true
    },
    businessTools: {
      quotes: true,
      invoices: true,
      projects: true,
      reporting: false
    },
    collaboration: {
      messaging: true,
      fileSharing: true,
      teamWorkspace: true
    }
  });

  const roles = [
    {
      id: 'subcontractor' as UserRole,
      name: 'Subcontractor',
      icon: Briefcase,
      color: 'from-blue-600 to-blue-500',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-600/20',
      borderColor: 'border-blue-500/30',
      description: 'Access project management, quotes, and collaboration tools',
      features: ['Project Dashboard', 'Quote Builder', 'Time Tracking', 'File Sharing']
    },
    {
      id: 'investor' as UserRole,
      name: 'Investor',
      icon: DollarSign,
      color: 'from-green-600 to-green-500',
      textColor: 'text-green-400',
      bgColor: 'bg-green-600/20',
      borderColor: 'border-green-500/30',
      description: 'View investment portfolios, analytics, and financial reports',
      features: ['Portfolio Dashboard', 'ROI Analytics', 'Reports', 'Insights']
    },
    {
      id: 'vendor' as UserRole,
      name: 'Vendor',
      icon: Package,
      color: 'from-purple-600 to-purple-500',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-600/20',
      borderColor: 'border-purple-500/30',
      description: 'Manage orders, inventory, and vendor relationships',
      features: ['Order Management', 'Inventory', 'Invoicing', 'Catalog']
    },
    {
      id: 'employee' as UserRole,
      name: 'Employee',
      icon: Users,
      color: 'from-orange-600 to-orange-500',
      textColor: 'text-orange-400',
      bgColor: 'bg-orange-600/20',
      borderColor: 'border-orange-500/30',
      description: 'Access work tools, timesheets, and company resources',
      features: ['Timesheet', 'Tasks', 'HR Portal', 'Company Resources']
    }
  ];

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('lastEmail', email);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('lastEmail');
    }

    // Simulate login
    setTimeout(() => {
      setLoading(false);
      toast.success('Login successful! Loading your portal...');
      setStep('portal');
    }, 1500);
  };

  const selectedRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Unified Back Button - Fixed Position */}
      <button
        onClick={() => window.location.href = '/unified-dashboard'}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-gray-300 hover:text-white rounded-lg transition-all duration-200"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to Unified Dashboard
      </button>

      {/* Left Side - Branding & Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#ea580c] p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Globe className="w-7 h-7 text-[#ea580c]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Enterprise Portal</h1>
              <p className="text-sm text-white/80">Business Management Platform</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-white mb-6">
              Welcome to Your Business Portal
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Access powerful tools for design, marketing, project management, and collaboration - all in one place.
            </p>

            {/* Features List */}
            <div className="space-y-4">
              {[
                { icon: Palette, text: 'Professional Design Tools' },
                { icon: Megaphone, text: 'Marketing & Campaign Manager' },
                { icon: BarChart3, text: 'Analytics & Reporting' },
                { icon: Users, text: 'Team Collaboration' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white/90 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-3xl font-bold text-white">500+</p>
            <p className="text-sm text-white/80">Active Users</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-3xl font-bold text-white">24/7</p>
            <p className="text-sm text-white/80">Support</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-3xl font-bold text-white">99.9%</p>
            <p className="text-sm text-white/80">Uptime</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login/Portal */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* STEP 1: SELECT ROLE */}
          {step === 'select-role' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#ea580c]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#ea580c]/30">
                  <Shield className="w-8 h-8 text-[#ea580c]" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Choose Your Portal</h2>
                <p className="text-gray-400">Select your role to access your personalized workspace</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className={`bg-[#1A1A1A] border-2 ${role.borderColor} rounded-2xl p-6 hover:bg-[#2A2A2A] transition group text-left`}
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${role.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                      <role.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className={`text-xl font-bold ${role.textColor} mb-2`}>{role.name}</h3>
                    <p className="text-sm text-gray-400 mb-4">{role.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {role.features.slice(0, 2).map((feature, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#2A2A2A] text-gray-300 rounded text-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2A2A]">
                      <span className="text-sm text-gray-500">Access Portal</span>
                      <ArrowRight className={`w-5 h-5 ${role.textColor} group-hover:translate-x-1 transition`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: LOGIN */}
          {step === 'login' && selectedRoleData && (
            <div>
              <button
                onClick={() => setStep('select-role')}
                className="mb-6 text-gray-400 hover:text-white transition flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to role selection
              </button>

              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-16 h-16 bg-gradient-to-br ${selectedRoleData.color} rounded-xl flex items-center justify-center`}>
                    <selectedRoleData.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedRoleData.name} Portal</h2>
                    <p className="text-sm text-gray-400">Sign in to access your workspace</p>
                  </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@company.com"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-12 pr-12 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember & Forgot */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-400">Remember me</span>
                    </label>
                    <button type="button" className="text-sm text-[#ea580c] hover:text-[#f97316] transition">
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full px-6 py-4 bg-gradient-to-r ${selectedRoleData.color} hover:opacity-90 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg`}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        Sign In to {selectedRoleData.name} Portal
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2A2A2A]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#1A1A1A] text-gray-500">New user?</span>
                  </div>
                </div>

                {/* Sign Up Link */}
                <button
                  type="button"
                  className="w-full px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-semibold transition"
                >
                  Request Access
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PORTAL DASHBOARD */}
          {step === 'portal' && selectedRoleData && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] border border-[#2A2A2A] rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${selectedRoleData.color} rounded-xl flex items-center justify-center`}>
                      <selectedRoleData.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Welcome back, {displayName.split(' ')[0]}!</h2>
                      <p className="text-gray-400">{email}</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl transition flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                    <p className="text-2xl font-bold text-white">12</p>
                    <p className="text-sm text-gray-400">Active Projects</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                    <p className="text-2xl font-bold text-white">8</p>
                    <p className="text-sm text-gray-400">Pending Tasks</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                    <p className="text-2xl font-bold text-white">3</p>
                    <p className="text-sm text-gray-400">Notifications</p>
                  </div>
                </div>
              </div>

              {/* Design Tools Access */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Palette className="w-6 h-6 text-purple-400" />
                  <h3 className="text-xl font-bold text-white">Design Tools</h3>
                  <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-sm font-bold border border-purple-500/30">
                    ENABLED BY ADMIN
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'CAD Design Suite', icon: Layout, enabled: userPermissions.designTools.cadDesign },
                    { name: 'Graphics Editor', icon: Image, enabled: userPermissions.designTools.graphics },
                    { name: 'Video Editing', icon: Video, enabled: userPermissions.designTools.videoEditing },
                    { name: 'Templates Library', icon: FileText, enabled: userPermissions.designTools.templates }
                  ].map((tool, idx) => (
                    <button
                      key={idx}
                      disabled={!tool.enabled}
                      className={`p-4 rounded-xl border-2 transition text-left ${
                        tool.enabled
                          ? 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-purple-500/50 cursor-pointer'
                          : 'bg-[#0A0A0A]/50 border-[#2A2A2A]/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <tool.icon className={`w-5 h-5 ${tool.enabled ? 'text-purple-400' : 'text-gray-600'}`} />
                        {tool.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <p className={`text-sm font-semibold ${tool.enabled ? 'text-white' : 'text-gray-600'}`}>
                        {tool.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Marketing Tools Access */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Megaphone className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Marketing Tools</h3>
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm font-bold border border-blue-500/30">
                    ENABLED BY ADMIN
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Campaign Manager', icon: Target, enabled: userPermissions.marketingTools.campaigns },
                    { name: 'Social Media', icon: Share2, enabled: userPermissions.marketingTools.socialMedia },
                    { name: 'Analytics Dashboard', icon: BarChart3, enabled: userPermissions.marketingTools.analytics },
                    { name: 'Content Creator', icon: Sparkles, enabled: userPermissions.marketingTools.contentCreation }
                  ].map((tool, idx) => (
                    <button
                      key={idx}
                      disabled={!tool.enabled}
                      className={`p-4 rounded-xl border-2 transition text-left ${
                        tool.enabled
                          ? 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-blue-500/50 cursor-pointer'
                          : 'bg-[#0A0A0A]/50 border-[#2A2A2A]/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <tool.icon className={`w-5 h-5 ${tool.enabled ? 'text-blue-400' : 'text-gray-600'}`} />
                        {tool.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <p className={`text-sm font-semibold ${tool.enabled ? 'text-white' : 'text-gray-600'}`}>
                        {tool.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Business Tools Access */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-6 h-6 text-green-400" />
                  <h3 className="text-xl font-bold text-white">Business Tools</h3>
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-sm font-bold border border-green-500/30">
                    ADMIN CONTROLLED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Quote Builder', icon: FileText, enabled: userPermissions.businessTools.quotes },
                    { name: 'Invoice Manager', icon: DollarSign, enabled: userPermissions.businessTools.invoices },
                    { name: 'Project Dashboard', icon: Target, enabled: userPermissions.businessTools.projects },
                    { name: 'Reports & Analytics', icon: BarChart3, enabled: userPermissions.businessTools.reporting }
                  ].map((tool, idx) => (
                    <button
                      key={idx}
                      disabled={!tool.enabled}
                      className={`p-4 rounded-xl border-2 transition text-left ${
                        tool.enabled
                          ? 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-green-500/50 cursor-pointer'
                          : 'bg-[#0A0A0A]/50 border-[#2A2A2A]/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <tool.icon className={`w-5 h-5 ${tool.enabled ? 'text-green-400' : 'text-gray-600'}`} />
                        {tool.enabled ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <p className={`text-sm font-semibold ${tool.enabled ? 'text-white' : 'text-gray-600'}`}>
                        {tool.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}