import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BusinessProfile, BusinessType, ServiceOffering } from '../types/multi-business.types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  Award,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  Save,
  X,
  Upload,
  Target,
  Briefcase,
  TrendingUp,
  Calendar,
  Settings,
} from 'lucide-react';

export default function MultiBusinessManager() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadBusinesses();
  }, [filterStatus]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('business_profiles')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      setBusinesses(data || mockBusinesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
      setBusinesses(mockBusinesses);
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = businesses.filter(
    b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.industry.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const mockBusinesses: BusinessProfile[] = [
    {
      id: '1',
      name: 'Elite HVAC Solutions',
      legal_name: 'Elite HVAC Solutions LLC',
      business_type: 'hvac',
      industry: ['HVAC', 'Heating', 'Cooling'],
      description: 'Professional heating and cooling services for residential and commercial properties',
      logo_url: 'https://via.placeholder.com/100',
      email: 'contact@elitehvac.com',
      phone: '(555) 123-4567',
      website: 'https://elitehvac.com',
      address: {
        street: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'USA',
        coordinates: { lat: 37.7749, lng: -122.4194 },
      },
      service_radius_miles: 50,
      service_areas: ['San Francisco', 'Oakland', 'San Jose'],
      services: [
        {
          id: 's1',
          name: 'AC Repair',
          category: 'hvac',
          description: 'Air conditioning repair and maintenance',
          estimated_duration_hours: 2,
          base_price: 150,
          requires_inspection: true,
        },
        {
          id: 's2',
          name: 'Heating Installation',
          category: 'hvac',
          description: 'Complete heating system installation',
          estimated_duration_hours: 8,
          base_price: 3000,
          requires_inspection: true,
        },
      ],
      license_number: 'HVAC-CA-12345',
      certifications: [
        {
          id: 'c1',
          name: 'EPA 608 Certification',
          issuer: 'EPA',
          number: 'EPA-608-12345',
          issued_date: '2020-01-15',
        },
      ],
      metrics: {
        total_jobs_completed: 450,
        average_rating: 4.8,
        total_reviews: 230,
        on_time_completion_rate: 95,
        customer_satisfaction_rate: 98,
        response_time_hours: 2,
      },
      availability: {
        monday: [{ start: '08:00', end: '18:00' }],
        tuesday: [{ start: '08:00', end: '18:00' }],
        wednesday: [{ start: '08:00', end: '18:00' }],
        thursday: [{ start: '08:00', end: '18:00' }],
        friday: [{ start: '08:00', end: '18:00' }],
        saturday: [{ start: '09:00', end: '15:00' }],
        sunday: [],
      },
      pricing_model: 'hourly',
      hourly_rate: 125,
      status: 'active',
      verified: true,
      verified_at: '2023-06-15T00:00:00Z',
      owner_id: user?.id || '',
      team_members: [],
      created_at: '2023-01-10T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: '2',
      name: 'ProPlumb Services',
      legal_name: 'ProPlumb Services Inc',
      business_type: 'plumbing',
      industry: ['Plumbing', 'Drain Cleaning'],
      description: '24/7 emergency plumbing services',
      email: 'info@proplumb.com',
      phone: '(555) 987-6543',
      address: {
        street: '456 Oak Avenue',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103',
        country: 'USA',
        coordinates: { lat: 37.7749, lng: -122.4194 },
      },
      service_radius_miles: 30,
      service_areas: ['San Francisco', 'Daly City'],
      services: [
        {
          id: 's3',
          name: 'Leak Repair',
          category: 'plumbing',
          description: 'Fast leak detection and repair',
          estimated_duration_hours: 2,
          base_price: 200,
          requires_inspection: false,
        },
      ],
      license_number: 'PLM-CA-67890',
      certifications: [],
      metrics: {
        total_jobs_completed: 320,
        average_rating: 4.6,
        total_reviews: 185,
        on_time_completion_rate: 92,
        customer_satisfaction_rate: 94,
        response_time_hours: 1,
      },
      availability: {
        monday: [{ start: '00:00', end: '23:59' }],
        tuesday: [{ start: '00:00', end: '23:59' }],
        wednesday: [{ start: '00:00', end: '23:59' }],
        thursday: [{ start: '00:00', end: '23:59' }],
        friday: [{ start: '00:00', end: '23:59' }],
        saturday: [{ start: '00:00', end: '23:59' }],
        sunday: [{ start: '00:00', end: '23:59' }],
      },
      pricing_model: 'hourly',
      hourly_rate: 150,
      status: 'active',
      verified: true,
      verified_at: '2023-08-20T00:00:00Z',
      owner_id: user?.id || '',
      team_members: [],
      created_at: '2023-03-20T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      case 'pending_verification':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getBusinessTypeLabel = (type: BusinessType): string => {
    const labels: Record<BusinessType, string> = {
      general_contractor: 'General Contractor',
      hvac: 'HVAC',
      plumbing: 'Plumbing',
      electrical: 'Electrical',
      roofing: 'Roofing',
      landscaping: 'Landscaping',
      cleaning: 'Cleaning',
      painting: 'Painting',
      carpentry: 'Carpentry',
      pest_control: 'Pest Control',
      appliance_repair: 'Appliance Repair',
      locksmith: 'Locksmith',
      other: 'Other',
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">Company Profiles Manager</h1>
              <p className="text-indigo-100">Manage all your company profiles in one place</p>
            </div>
          </div>
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 rounded-xl hover:bg-indigo-50 transition-colors font-semibold shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Company
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-600">Total Companies</p>
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{businesses.length}</p>
          <p className="text-sm text-slate-500 mt-1">
            {businesses.filter(b => b.status === 'active').length} active
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-600">Total Jobs</p>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {businesses.reduce((sum, b) => sum + b.metrics.total_jobs_completed, 0)}
          </p>
          <p className="text-sm text-slate-500 mt-1">Completed</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-600">Avg Rating</p>
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {(
              businesses.reduce((sum, b) => sum + b.metrics.average_rating, 0) / businesses.length || 0
            ).toFixed(1)}
          </p>
          <p className="text-sm text-slate-500 mt-1">Across all companies</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-600">Verified</p>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {businesses.filter(b => b.verified).length}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {Math.round((businesses.filter(b => b.verified).length / businesses.length) * 100)}% verified
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Business Cards */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
        {filteredBusinesses.map(business => (
          <div
            key={business.id}
            className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all overflow-hidden"
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-16 h-16 rounded-xl bg-white object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Building2 className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold mb-1">{business.name}</h3>
                    <p className="text-sm text-blue-100">{getBusinessTypeLabel(business.business_type)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {business.verified && (
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(business.status)}`}>
                  {business.status}
                </span>
                {business.industry.map((ind, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    {ind}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm line-clamp-2">{business.description}</p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">{business.metrics.average_rating}</span>
                  <span className="text-gray-500">({business.metrics.total_reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold">{business.metrics.total_jobs_completed}</span>
                  <span className="text-gray-500">jobs</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold">{business.metrics.response_time_hours}h</span>
                  <span className="text-gray-500">response</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold">{business.metrics.on_time_completion_rate}%</span>
                  <span className="text-gray-500">on-time</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {business.address.city}, {business.address.state}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {business.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Target className="w-4 h-4" />
                  {business.service_radius_miles} mile radius
                </div>
              </div>

              {/* Services */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Services:</p>
                <div className="flex flex-wrap gap-2">
                  {business.services.slice(0, 3).map(service => (
                    <span key={service.id} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {service.name}
                    </span>
                  ))}
                  {business.services.length > 3 && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                      +{business.services.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => setSelectedBusiness(business)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedBusiness(business);
                    setShowEditor(true);
                  }}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBusinesses.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No businesses found</h3>
          <p className="text-gray-500 mb-6">Create your first business profile to get started</p>
          <button
            onClick={() => setShowEditor(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add Business
          </button>
        </div>
      )}
    </div>
  );
}