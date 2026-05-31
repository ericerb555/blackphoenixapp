import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import {
  Building2,
  Users,
  Settings,
  Shield,
  Globe,
  Award,
  FileText,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Network,
  Eye,
  Edit2,
  Plus,
  Trash2,
  Save,
  Upload,
  Image,
  Mail,
  Phone,
  Link,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Lock,
  Database,
  BarChart3,
  TrendingUp,
  Flag,
  Target,
  Layers,
  GitBranch,
  Crown,
  Sparkles,
} from 'lucide-react';
import { TextInput } from './ui/input/TextInput';
import { NumberInput } from './ui/input/NumberInput';
import { Checkbox } from './ui/input/Checkbox';

interface CompanyProfile {
  id: string;
  company_id: string;
  
  // Basic Information
  legal_name: string;
  trading_name: string;
  tagline: string;
  description: string;
  founded_date: string;
  ein_tax_id: string;
  duns_number: string;
  
  // Branding
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  
  // Contact Information
  headquarters_address: string;
  headquarters_city: string;
  headquarters_state: string;
  headquarters_zip: string;
  headquarters_country: string;
  primary_phone: string;
  primary_email: string;
  support_email: string;
  sales_email: string;
  website: string;
  
  // Company Details
  company_type: string;
  industry: string;
  employee_count: string;
  annual_revenue: string;
  
  // Social & Online Presence
  linkedin_url: string;
  twitter_url: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  github_url: string;
  
  // Business Information
  business_hours: Record<string, string>;
  time_zone: string;
  fiscal_year_start: string;
  default_currency: string;
  
  // Compliance & Certifications
  certifications: Array<{
    name: string;
    issuer: string;
    number: string;
    issue_date: string;
    expiry_date: string;
    document_url: string;
  }>;
  licenses: Array<{
    type: string;
    number: string;
    state: string;
    expiry_date: string;
    document_url: string;
  }>;
  
  // Settings
  settings: {
    enable_2fa: boolean;
    require_2fa_for_admins: boolean;
    session_timeout_minutes: number;
    password_expiry_days: number;
    allow_public_profile: boolean;
    enable_api_access: boolean;
    enable_webhooks: boolean;
    data_retention_days: number;
  };
}

interface Department {
  id: string;
  name: string;
  description: string;
  head_user_id: string;
  head_name: string;
  employee_count: number;
  budget: number;
  parent_department_id: string | null;
}

interface Location {
  id: string;
  name: string;
  type: 'headquarters' | 'branch' | 'warehouse' | 'retail';
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  manager_name: string;
  employee_count: number;
  is_active: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  location: string;
  hire_date: string;
  employment_type: string;
  status: 'active' | 'inactive';
  avatar_url: string;
}

type TabId = 'overview' | 'identity' | 'structure' | 'locations' | 'team' | 'compliance' | 'settings' | 'integrations' | 'security' | 'audit';

export default function EnterpriseCompanyProfile() {
  const companyContext = useCompany();
  const activeCompany = companyContext?.activeCompany || null;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    loadData();
  }, [activeCompany]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadProfile(),
      loadDepartments(),
      loadLocations(),
      loadTeamMembers(),
    ]);
    setLoading(false);
  };

  const loadProfile = async () => {
    // Mock data - replace with Supabase query
    const mockProfile: CompanyProfile = {
      id: '1',
      company_id: activeCompany?.id || '1',
      legal_name: activeCompany?.name || 'Enterprise Solutions Inc.',
      trading_name: activeCompany?.name || 'Enterprise Solutions',
      tagline: 'Building the Future of Business',
      description: 'A leading enterprise software and consulting firm specializing in digital transformation and business process optimization.',
      founded_date: '2010-01-15',
      ein_tax_id: '12-3456789',
      duns_number: '123456789',
      logo_url: '',
      logo_dark_url: '',
      favicon_url: '',
      primary_color: '#3B82F6',
      secondary_color: '#8B5CF6',
      accent_color: '#EC4899',
      headquarters_address: '123 Enterprise Way',
      headquarters_city: 'San Francisco',
      headquarters_state: 'CA',
      headquarters_zip: '94102',
      headquarters_country: 'United States',
      primary_phone: '+1 (555) 123-4567',
      primary_email: 'info@enterprise.com',
      support_email: 'support@enterprise.com',
      sales_email: 'sales@enterprise.com',
      website: 'https://www.enterprise.com',
      company_type: 'Corporation',
      industry: 'Technology',
      employee_count: '500-1000',
      annual_revenue: '$50M-$100M',
      linkedin_url: 'https://linkedin.com/company/enterprise',
      twitter_url: 'https://twitter.com/enterprise',
      facebook_url: '',
      instagram_url: '',
      youtube_url: '',
      github_url: 'https://github.com/enterprise',
      business_hours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: 'Closed',
        sunday: 'Closed',
      },
      time_zone: 'America/Los_Angeles',
      fiscal_year_start: 'January',
      default_currency: 'USD',
      certifications: [
        {
          name: 'ISO 9001:2015',
          issuer: 'ISO',
          number: 'ISO-9001-2024-12345',
          issue_date: '2024-01-15',
          expiry_date: '2027-01-15',
          document_url: '',
        },
        {
          name: 'SOC 2 Type II',
          issuer: 'AICPA',
          number: 'SOC2-2024-67890',
          issue_date: '2024-06-01',
          expiry_date: '2025-06-01',
          document_url: '',
        },
      ],
      licenses: [
        {
          type: 'Business License',
          number: 'BL-2024-SF-12345',
          state: 'California',
          expiry_date: '2025-12-31',
          document_url: '',
        },
      ],
      settings: {
        enable_2fa: true,
        require_2fa_for_admins: true,
        session_timeout_minutes: 60,
        password_expiry_days: 90,
        allow_public_profile: true,
        enable_api_access: true,
        enable_webhooks: true,
        data_retention_days: 2555,
      },
    };
    setProfile(mockProfile);
    if (mockProfile.logo_url) {
      setLogoPreview(mockProfile.logo_url);
    }
  };

  const loadDepartments = async () => {
    setDepartments([
      {
        id: '1',
        name: 'Engineering',
        description: 'Software development and technical operations',
        head_user_id: 'user_1',
        head_name: 'Sarah Johnson',
        employee_count: 85,
        budget: 5000000,
        parent_department_id: null,
      },
      {
        id: '2',
        name: 'Sales',
        description: 'Revenue generation and client acquisition',
        head_user_id: 'user_2',
        head_name: 'Michael Chen',
        employee_count: 42,
        budget: 3000000,
        parent_department_id: null,
      },
      {
        id: '3',
        name: 'Marketing',
        description: 'Brand and customer engagement',
        head_user_id: 'user_3',
        head_name: 'Emily Rodriguez',
        employee_count: 28,
        budget: 2000000,
        parent_department_id: null,
      },
      {
        id: '4',
        name: 'Operations',
        description: 'Business operations and support',
        head_user_id: 'user_4',
        head_name: 'David Kim',
        employee_count: 35,
        budget: 1500000,
        parent_department_id: null,
      },
    ]);
  };

  const loadLocations = async () => {
    setLocations([
      {
        id: '1',
        name: 'San Francisco HQ',
        type: 'headquarters',
        address: '123 Enterprise Way',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'United States',
        phone: '+1 (555) 123-4567',
        email: 'sf@enterprise.com',
        manager_name: 'John Smith',
        employee_count: 150,
        is_active: true,
      },
      {
        id: '2',
        name: 'New York Office',
        type: 'branch',
        address: '456 Broadway',
        city: 'New York',
        state: 'NY',
        zip: '10013',
        country: 'United States',
        phone: '+1 (555) 234-5678',
        email: 'ny@enterprise.com',
        manager_name: 'Lisa Anderson',
        employee_count: 85,
        is_active: true,
      },
      {
        id: '3',
        name: 'Austin Tech Hub',
        type: 'branch',
        address: '789 Tech Drive',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'United States',
        phone: '+1 (555) 345-6789',
        email: 'austin@enterprise.com',
        manager_name: 'Carlos Martinez',
        employee_count: 55,
        is_active: true,
      },
    ]);
  };

  const loadTeamMembers = async () => {
    setTeamMembers([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('💾 Saving company profile...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to save changes');
        setSaving(false);
        return;
      }

      // UPDATED: Use SINGLE cache and proper update logic
      const existingCompanies = localStorage.getItem('companies_cache');
      let companies = existingCompanies ? JSON.parse(existingCompanies) : [];

      // Update the company in the array
      const companyIndex = companies.findIndex((c: any) => c.id === activeCompany?.id);

      if (companyIndex >= 0) {
        // Update existing company with ALL profile fields including logo
        companies[companyIndex] = {
          ...companies[companyIndex],
          ...profile,
          updated_at: new Date().toISOString()
        };
      } else if (activeCompany?.id) {
        // Add if not found
        companies.push({
          ...profile,
          id: activeCompany.id,
          updated_at: new Date().toISOString()
        });
      }

      // Save to SINGLE cache
      localStorage.setItem('companies_cache', JSON.stringify(companies));
      console.log('✅ Saved to companies_cache');

      // Trigger event to notify all listeners (including ActiveCompanyContext)
      window.dispatchEvent(new CustomEvent('companySaved', {
        detail: companies[companyIndex >= 0 ? companyIndex : companies.length - 1]
      }));

      // Refresh company context
      if (companyContext?.refreshCompanies) {
        await companyContext.refreshCompanies();
      }

      alert('Company profile saved successfully!');

      // Reload page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'overview' as TabId, name: 'Overview', icon: BarChart3, description: 'Company snapshot' },
    { id: 'identity' as TabId, name: 'Identity & Branding', icon: Sparkles, description: 'Logo, colors, and brand' },
    { id: 'structure' as TabId, name: 'Organization', icon: GitBranch, description: 'Departments & hierarchy' },
    { id: 'locations' as TabId, name: 'Locations', icon: MapPin, description: 'Offices & facilities' },
    { id: 'team' as TabId, name: 'Team Members', icon: Users, description: 'Employee directory' },
    { id: 'compliance' as TabId, name: 'Compliance', icon: Award, description: 'Certifications & licenses' },
    { id: 'settings' as TabId, name: 'Company Settings', icon: Settings, description: 'General configuration' },
    { id: 'integrations' as TabId, name: 'Integrations', icon: Zap, description: 'Third-party apps' },
    { id: 'security' as TabId, name: 'Security', icon: Shield, description: 'Access & permissions' },
    { id: 'audit' as TabId, name: 'Audit Log', icon: Eye, description: 'Activity history' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl p-8 text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
              ) : (
                <Building2 className="w-10 h-10 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{profile.legal_name}</h1>
              <p className="text-xl text-blue-100 mb-3">{profile.tagline}</p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                  {profile.company_type}
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                  {profile.industry}
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                  {profile.employee_count} Employees
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                  Founded {new Date(profile.founded_date).getFullYear()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-blue-700">Total Employees</p>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{profile.employee_count}</p>
          <p className="text-sm text-gray-600 mt-1">Across {locations.length} locations</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-emerald-700">Departments</p>
            <GitBranch className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{departments.length}</p>
          <p className="text-sm text-gray-600 mt-1">Active divisions</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-purple-700">Certifications</p>
            <Award className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{profile.certifications.length}</p>
          <p className="text-sm text-gray-600 mt-1">Active compliance</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-amber-700">Locations</p>
            <MapPin className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{locations.length}</p>
          <p className="text-sm text-gray-600 mt-1">Global presence</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-5 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-4 text-left transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-900'}`}>
                    {tab.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{tab.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Overview</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Company Information */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Legal Name</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{profile.legal_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Trading Name</label>
                    <p className="text-base font-semibold text-gray-900 mt-1">{profile.trading_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-sm text-gray-700 mt-1">{profile.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">EIN / Tax ID</label>
                      <p className="text-base font-semibold text-gray-900 mt-1">{profile.ein_tax_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">DUNS Number</label>
                      <p className="text-base font-semibold text-gray-900 mt-1">{profile.duns_number}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Headquarters</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {profile.headquarters_address}<br />
                      {profile.headquarters_city}, {profile.headquarters_state} {profile.headquarters_zip}<br />
                      {profile.headquarters_country}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Primary Phone</label>
                      <p className="text-base font-semibold text-gray-900 mt-1">{profile.primary_phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Website</label>
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-blue-600 hover:text-blue-700 mt-1 block">
                        {profile.website}
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Email Addresses</label>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">General:</span> {profile.primary_email}
                      </p>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Support:</span> {profile.support_email}
                      </p>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Sales:</span> {profile.sales_email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Overview */}
            <div className="border-t border-gray-200 pt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Department Overview</h3>
                <button
                  onClick={() => setActiveTab('structure')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{dept.name}</h4>
                        <p className="text-xs text-gray-500">{dept.employee_count} employees</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{dept.description}</p>
                    <p className="text-xs text-gray-500">
                      Head: <span className="font-medium text-gray-700">{dept.head_name}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Locations Overview */}
            <div className="border-t border-gray-200 pt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Office Locations</h3>
                <button
                  onClick={() => setActiveTab('locations')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {locations.map((loc) => (
                  <div key={loc.id} className="p-5 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          loc.type === 'headquarters' ? 'bg-purple-100' : 'bg-emerald-100'
                        }`}>
                          <MapPin className={`w-5 h-5 ${
                            loc.type === 'headquarters' ? 'text-purple-600' : 'text-emerald-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{loc.name}</h4>
                          <p className="text-xs text-gray-500 capitalize">{loc.type}</p>
                        </div>
                      </div>
                      {loc.type === 'headquarters' && (
                        <Crown className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {loc.city}, {loc.state}
                    </p>
                    <p className="text-xs text-gray-500">
                      {loc.employee_count} employees • {loc.manager_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Identity & Branding Tab */}
        {activeTab === 'identity' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Identity & Branding</h2>
              <p className="text-gray-600">Manage your company's visual identity and brand assets</p>
            </div>

            {/* Logo Management */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Logos</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Primary Logo</label>
                  <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="max-w-full max-h-full p-4" />
                    ) : (
                      <Image className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Dark Mode Logo</label>
                  <div className="aspect-square bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center mb-3">
                    <Image className="w-12 h-12 text-gray-600" />
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Favicon</label>
                  <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-3">
                    <Image className="w-12 h-12 text-gray-400" />
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    Upload Favicon
                  </button>
                </div>
              </div>
            </div>

            {/* Brand Colors */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Brand Colors</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={profile.primary_color}
                      onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })}
                      className="w-16 h-16 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <div>
                      <TextInput
                        value={profile.primary_color}
                        onChange={(value) => setProfile({ ...profile, primary_color: value })}
                        className="w-32 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">HEX value</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={profile.secondary_color}
                      onChange={(e) => setProfile({ ...profile, secondary_color: e.target.value })}
                      className="w-16 h-16 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <div>
                      <TextInput
                        value={profile.secondary_color}
                        onChange={(value) => setProfile({ ...profile, secondary_color: value })}
                        className="w-32 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">HEX value</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={profile.accent_color}
                      onChange={(e) => setProfile({ ...profile, accent_color: e.target.value })}
                      className="w-16 h-16 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <div>
                      <TextInput
                        value={profile.accent_color}
                        onChange={(value) => setProfile({ ...profile, accent_color: value })}
                        className="w-32 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">HEX value</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Legal Name</label>
                  <TextInput
                    value={profile.legal_name}
                    onChange={(value) => setProfile({ ...profile, legal_name: value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trading Name</label>
                  <TextInput
                    value={profile.trading_name}
                    onChange={(value) => setProfile({ ...profile, trading_name: value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                  <TextInput
                    value={profile.tagline}
                    onChange={(value) => setProfile({ ...profile, tagline: value })}
                    placeholder="Your company's tagline"
                  />
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={profile.description}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of your company"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Organization Structure Tab */}
        {activeTab === 'structure' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Structure</h2>
                <p className="text-gray-600">Manage departments, divisions, and reporting hierarchy</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                Add Department
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {departments.map((dept) => (
                <div key={dept.id} className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Briefcase className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{dept.name}</h3>
                        <p className="text-sm text-gray-600">{dept.description}</p>
                      </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Department Head</p>
                      <p className="font-semibold text-gray-900">{dept.head_name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Team Size</p>
                      <p className="font-semibold text-gray-900">{dept.employee_count} employees</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Annual Budget</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${(dept.budget / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Office Locations</h2>
                <p className="text-gray-600">Manage company offices, branches, and facilities</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <Plus className="w-4 h-4" />
                Add Location
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {locations.map((loc) => (
                <div key={loc.id} className="border border-gray-200 rounded-xl p-6 hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        loc.type === 'headquarters' ? 'bg-purple-100' : 'bg-emerald-100'
                      }`}>
                        <MapPin className={`w-6 h-6 ${
                          loc.type === 'headquarters' ? 'text-purple-600' : 'text-emerald-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900">{loc.name}</h3>
                          {loc.type === 'headquarters' && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                              HQ
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                            loc.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {loc.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 capitalize">{loc.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Address</h4>
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {loc.address}<br />
                        {loc.city}, {loc.state} {loc.zip}<br />
                        {loc.country}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {loc.phone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {loc.email}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Details</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-900">
                          <span className="text-gray-500">Manager:</span> {loc.manager_name}
                        </p>
                        <p className="text-sm text-gray-900">
                          <span className="text-gray-500">Employees:</span> {loc.employee_count}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members Tab */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Members</h2>
                <p className="text-gray-600">Employee directory and team management</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                Add Team Member
              </button>
            </div>

            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Directory</h3>
              <p className="text-gray-600 mb-6">Employee management and organizational chart</p>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-5 h-5" />
                Add First Team Member
              </button>
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Compliance & Certifications</h2>
              <p className="text-gray-600">Manage company certifications, licenses, and compliance documents</p>
            </div>

            {/* Certifications */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Certification
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.certifications.map((cert, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-6 hover:border-purple-300 hover:bg-purple-50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Award className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{cert.name}</h4>
                          <p className="text-sm text-gray-600">{cert.issuer}</p>
                        </div>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-purple-600 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Number:</span>
                        <span className="font-medium text-gray-900">{cert.number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Issued:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(cert.issue_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expires:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(cert.expiry_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Licenses */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Business Licenses</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add License
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {profile.licenses.map((license, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:bg-blue-50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{license.type}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-500">
                              License #: <span className="font-medium text-gray-900">{license.number}</span>
                            </span>
                            <span className="text-gray-500">
                              State: <span className="font-medium text-gray-900">{license.state}</span>
                            </span>
                            <span className="text-gray-500">
                              Expires: <span className="font-medium text-gray-900">
                                {new Date(license.expiry_date).toLocaleDateString()}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Settings</h2>
              <p className="text-gray-600">Configure general company preferences and defaults</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Regional Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                  <select
                    value={profile.time_zone}
                    onChange={(e) => setProfile({ ...profile, time_zone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                  <select
                    value={profile.default_currency}
                    onChange={(e) => setProfile({ ...profile, default_currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fiscal Year Start</label>
                  <select
                    value={profile.fiscal_year_start}
                    onChange={(e) => setProfile({ ...profile, fiscal_year_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="January">January</option>
                    <option value="April">April</option>
                    <option value="July">July</option>
                    <option value="October">October</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Privacy & Visibility</h3>
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer">
                  <Checkbox
                    checked={profile.settings.allow_public_profile}
                    onChange={(checked) => setProfile({
                      ...profile,
                      settings: { ...profile.settings, allow_public_profile: checked }
                    })}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Public Company Profile</p>
                    <p className="text-sm text-gray-600">Allow public access to company profile page</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
                  <Checkbox
                    checked={profile.settings.enable_api_access}
                    onChange={(checked) => setProfile({
                      ...profile,
                      settings: { ...profile.settings, enable_api_access: checked }
                    })}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">API Access</p>
                    <p className="text-sm text-gray-600">Enable API access for third-party integrations</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h2>
              <p className="text-gray-600">Connect third-party applications and services</p>
            </div>

            <div className="text-center py-16">
              <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Integration Marketplace</h3>
              <p className="text-gray-600 mb-6">Connect your favorite tools and automate workflows</p>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h2>
              <p className="text-gray-600">Configure security policies and access controls</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Authentication</h3>
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer">
                  <Checkbox
                    checked={profile.settings.enable_2fa}
                    onChange={(checked) => setProfile({
                      ...profile,
                      settings: { ...profile.settings, enable_2fa: checked }
                    })}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Enable Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600">Allow users to enable 2FA for their accounts</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer">
                  <Checkbox
                    checked={profile.settings.require_2fa_for_admins}
                    onChange={(checked) => setProfile({
                      ...profile,
                      settings: { ...profile.settings, require_2fa_for_admins: checked }
                    })}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Require 2FA for Administrators</p>
                    <p className="text-sm text-gray-600">Force all admin users to use two-factor authentication</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Session Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                  <NumberInput
                    value={profile.settings.session_timeout_minutes}
                    onChange={(value) => setProfile({
                      ...profile,
                      settings: { ...profile.settings, session_timeout_minutes: value }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                  <NumberInput
                    value={profile.settings.password_expiry_days}
                    onChange={(value) => setProfile({
                      ...profile,
                      settings: { ...profile.settings, password_expiry_days: value }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Audit Log</h2>
              <p className="text-gray-600">Track all changes and activities in your company profile</p>
            </div>

            <div className="text-center py-16">
              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity History</h3>
              <p className="text-gray-600">All profile changes will be logged here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
