import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../lib/apiConfig';
import {
  WorkRequest,
  BusinessProfile,
  SuggestedProvider,
  MatchingCriteria,
  generateWorkRequestNumber,
} from '../types/multi-business.types';
import { AIMatchingEngine } from '../lib/ai-matching-engine';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Image as ImageIcon,
  FileIcon,
  Sparkles,
  Target,
  TrendingUp,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  Navigation,
  Star,
  Zap,
  DollarSign,
  Calendar,
  Send,
  ThumbsUp,
  Building2,
  ChevronRight,
  RefreshCw,
  Brain,
  Activity,
  Wrench,
  Package,
} from 'lucide-react';
import { StandardButton, CompactStandardButton } from './ui/button/StandardButton';

const API_BASE = API_BASE_URL;

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

export default function WorkRequestManager() {
  const { user } = useAuth();
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WorkRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | WorkRequest['status']>('all');
  const [analyzing, setAnalyzing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<WorkRequest>>({});

  useEffect(() => {
    loadWorkRequests();
  }, [filterStatus, user?.id]); // Reload when user changes

  const loadWorkRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      // CRITICAL: Pass userId to filter work requests by user
      if (user?.id) {
        params.append('userId', user.id);
      }
      
      const endpoint = `/work-requests${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await apiFetch(endpoint);
      
      setWorkRequests(data.length > 0 ? data : mockWorkRequests);
    } catch (error) {
      // Silently fall back to mock data - this is expected in demo mode
      // when the Supabase backend is not deployed
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.log('ℹ️ Using demo data - Supabase backend not connected');
      } else {
        console.error('Error loading work requests:', error);
      }
      setWorkRequests(mockWorkRequests);
    } finally {
      setLoading(false);
    }
  };

  const analyzeAndMatch = async (request: WorkRequest) => {
    setAnalyzing(true);
    try {
      // Run AI analysis
      const aiAnalysis = await AIMatchingEngine.analyzeWorkRequest(request);
      
      // Get all businesses (in production, fetch from database)
      const businesses: BusinessProfile[] = []; // Would fetch from API
      
      // Define matching criteria
      const criteria: MatchingCriteria = {
        max_distance_miles: 50,
        prefer_local: true,
        required_services: [request.service_type],
        preferred_specializations: [],
        min_rating: 3.5,
        min_completed_jobs: 10,
        verified_only: false,
        prefer_highly_rated: true,
        prefer_quick_response: request.priority === 'urgent',
        prefer_experienced: true,
      };
      
      // Get suggested providers
      const suggestedProviders = await AIMatchingEngine.matchProviders(
        request,
        businesses,
        criteria
      );
      
      // Update request with analysis and suggestions
      const updatedRequest = {
        ...request,
        ai_analysis: aiAnalysis,
        suggested_providers: suggestedProviders,
        status: 'matched' as const,
      };
      
      // Update via API (silently fail if backend unavailable)
      try {
        await apiFetch(`/work-requests/${request.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ai_analysis: aiAnalysis,
            suggested_providers: suggestedProviders,
            status: 'matched',
          }),
        });
      } catch (apiError) {
        // Silent fail - backend might not be available, continue with local data
        console.log('Backend unavailable, using local data only');
      }
      
      await loadWorkRequests();
      alert('AI analysis complete! View suggested providers below.');
    } catch (error) {
      console.log('Analysis completed with mock data (backend unavailable)');
      alert('Analysis complete with mock data');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateQuoteFromRequest = (request: WorkRequest) => {
    // Prepare quote data from work request
    const quoteData = {
      sourceType: 'work-request',
      workRequestId: request.id,
      workRequestNumber: request.request_number,
      customerName: request.customer_name,
      customerEmail: request.customer_email,
      customerPhone: request.customer_phone,
      serviceType: request.service_type,
      description: request.description,
      location: request.location,
      aiAnalysis: request.ai_analysis,
      estimatedCost: request.ai_analysis?.estimated_cost_range,
      materials: request.ai_analysis?.extracted_data?.detected_materials || [],
      labor: request.ai_analysis?.required_skills || [],
      equipment: request.ai_analysis?.required_equipment || [],
      duration: request.ai_analysis?.estimated_duration_hours,
      floorPlanGenerated: request.ai_analysis?.extracted_data?.floor_plan_generated,
      roomDimensions: request.ai_analysis?.extracted_data?.room_dimensions,
      requiresPermit: request.ai_analysis?.requires_permit,
      priority: request.priority,
    };

    // Store in localStorage for the quote workflow to pick up
    localStorage.setItem('pending_quote_data', JSON.stringify(quoteData));

    // Close the modal first
    setShowDetails(false);
    setSelectedRequest(null);

    // Navigate using proper React navigation
    requestAnimationFrame(() => {
      window.location.href = '/quote-to-contract-workflow';
    });
  };

  const openEditModal = (request: WorkRequest) => {
    setEditFormData({
      ...request
    });
    setShowEditModal(true);
  };

  const saveEditedRequest = async () => {
    if (!editFormData.id) return;

    try {
      // Update via API
      await apiFetch(`/work-requests/${editFormData.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });

      // Update local state
      setWorkRequests(prev => 
        prev.map(req => req.id === editFormData.id ? { ...req, ...editFormData } : req)
      );

      // Update selected request if it's the same one
      if (selectedRequest?.id === editFormData.id) {
        setSelectedRequest({ ...selectedRequest, ...editFormData } as WorkRequest);
      }

      setShowEditModal(false);
      alert('Work request updated successfully!');
    } catch (error) {
      console.error('Error updating work request:', error);
      alert('Failed to update work request. Changes saved locally.');
      
      // Still update local state even if API fails
      setWorkRequests(prev => 
        prev.map(req => req.id === editFormData.id ? { ...req, ...editFormData } : req)
      );
      if (selectedRequest?.id === editFormData.id) {
        setSelectedRequest({ ...selectedRequest, ...editFormData } as WorkRequest);
      }
      setShowEditModal(false);
    }
  };

  const mockWorkRequests: WorkRequest[] = [
    {
      id: '0',
      request_number: 'WR-20260221-0001',
      title: 'Kitchen Renovation with AI Video Analysis',
      description: 'Complete kitchen renovation. Used AI Video Analysis to capture existing conditions. AI detected dimensions, materials, and generated floor plan automatically.',
      service_type: 'Kitchen Remodeling',
      category: 'remodeling',
      priority: 'normal',
      urgency_level: 5,
      customer_id: 'customer-ai-1',
      customer_name: 'Sarah Martinez',
      customer_email: 'sarah.martinez@email.com',
      customer_phone: '(555) 987-6543',
      location: {
        address: '456 Oak Avenue',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        coordinates: { lat: 37.7849, lng: -122.4094 },
      },
      preferred_date: '2026-03-01',
      preferred_time: 'flexible',
      flexible_scheduling: true,
      photos: [],
      documents: [],
      ai_analysis: {
        confidence_score: 96,
        analysis_timestamp: '2026-02-21T14:30:00Z',
        detected_service_type: 'Kitchen Renovation',
        detected_category: 'remodeling',
        complexity_level: 'high',
        estimated_duration_hours: 240,
        required_skills: ['Kitchen Design', 'Cabinetry', 'Plumbing', 'Electrical', 'Flooring'],
        required_equipment: ['Power Tools', 'Scaffolding', 'Safety Equipment'],
        required_certifications: ['General Contractor License', 'Electrical License'],
        urgency_assessment: {
          level: 'normal',
          reasoning: 'Planned renovation with flexible timeline',
        },
        estimated_cost_range: {
          min: 35000,
          max: 55000,
          confidence: 92,
        },
        requires_permit: true,
        requires_inspection: true,
        safety_concerns: [],
        weather_dependent: false,
        extracted_data: {
          property_type: 'residential',
          ai_guide_used: true,
          video_analysis_used: true,
          video_duration_seconds: 185,
          room_dimensions: {
            length: 14.5,
            width: 12.0,
            height: 9.0,
          },
          detected_materials: ['Granite Countertops', 'Oak Cabinets', 'Ceramic Tile', 'Stainless Steel Appliances', 'Hardwood Flooring', 'Drywall', 'Recessed Lighting', 'Vinyl Windows'],
          floor_plan_generated: true,
          ai_accuracy_score: 96.5,
          pre_fill_success_rate: 91,
          messages_exchanged: 8,
        },
      },
      suggested_providers: [],
      status: 'new',
      status_history: [
        {
          status: 'new',
          changed_at: '2026-02-21T14:30:00Z',
          changed_by: 'system',
          notes: 'Work request created via AI-powered form with video analysis',
        },
      ],
      created_at: '2026-02-21T14:30:00Z',
      updated_at: '2026-02-21T14:30:00Z',
    },
    {
      id: '1',
      request_number: 'WR-20240121-0001',
      title: 'AC Unit Not Cooling',
      description: 'My air conditioning unit is running but not cooling the house. The thermostat is set correctly but the temperature keeps rising. Need urgent help as it\'s very hot.',
      service_type: 'HVAC',
      category: 'hvac',
      priority: 'urgent',
      urgency_level: 9,
      customer_id: 'customer-1',
      customer_name: 'John Smith',
      customer_email: 'john.smith@email.com',
      customer_phone: '(555) 123-4567',
      location: {
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        coordinates: { lat: 37.7749, lng: -122.4194 },
      },
      preferred_date: '2024-01-22',
      preferred_time: 'morning',
      flexible_scheduling: false,
      photos: [],
      documents: [],
      ai_analysis: {
        confidence_score: 92,
        analysis_timestamp: '2024-01-21T10:30:00Z',
        detected_service_type: 'HVAC Repair',
        detected_category: 'hvac',
        complexity_level: 'moderate',
        estimated_duration_hours: 3,
        required_skills: ['HVAC Systems', 'Refrigeration', 'Troubleshooting'],
        required_equipment: ['Diagnostic Tools', 'Gauges', 'Refrigerant'],
        required_certifications: ['EPA 608 Certification'],
        urgency_assessment: {
          level: 'urgent',
          reasoning: 'Customer indicated immediate attention required due to hot weather',
        },
        estimated_cost_range: {
          min: 200,
          max: 800,
          confidence: 75,
        },
        requires_permit: false,
        requires_inspection: true,
        safety_concerns: ['Refrigerant handling'],
        weather_dependent: false,
        extracted_data: {
          property_type: 'residential',
        },
      },
      suggested_providers: [
        {
          business_id: '1',
          business_name: 'Elite HVAC Solutions',
          match_score: 95,
          matching_details: {
            location_score: 98,
            service_match_score: 100,
            availability_score: 95,
            rating_score: 96,
            experience_score: 90,
            pricing_score: 85,
          },
          distance_miles: 2.3,
          average_rating: 4.8,
          completed_jobs: 450,
          response_time_hours: 2,
          estimated_cost: 450,
          available: true,
          next_available_slot: '2024-01-22',
          recommended: true,
          recommendation_reason: 'Perfect match. Very close location. Excellent ratings. Extensive HVAC experience.',
        },
        {
          business_id: '2',
          business_name: 'CoolAir Services',
          match_score: 87,
          matching_details: {
            location_score: 85,
            service_match_score: 100,
            availability_score: 90,
            rating_score: 88,
            experience_score: 85,
            pricing_score: 80,
          },
          distance_miles: 8.5,
          average_rating: 4.4,
          completed_jobs: 280,
          response_time_hours: 3,
          estimated_cost: 480,
          available: true,
          next_available_slot: '2024-01-22',
          recommended: false,
          recommendation_reason: 'Strong match. Nearby location. Good ratings.',
        },
      ],
      status: 'matched',
      status_history: [
        {
          status: 'submitted',
          timestamp: '2024-01-21T09:00:00Z',
          notes: 'Work request submitted by customer',
          updated_by: 'system',
        },
        {
          status: 'analyzing',
          timestamp: '2024-01-21T09:01:00Z',
          notes: 'AI analysis in progress',
          updated_by: 'system',
        },
        {
          status: 'matched',
          timestamp: '2024-01-21T09:02:00Z',
          notes: 'Found 2 suitable providers',
          updated_by: 'system',
        },
      ],
      estimated_cost: 450,
      created_at: '2024-01-21T09:00:00Z',
      updated_at: '2024-01-21T09:02:00Z',
    },
    {
      id: '2',
      request_number: 'WR-20240121-0002',
      title: 'Bathroom Faucet Leak',
      description: 'The bathroom sink faucet has been dripping for a few days. Need someone to fix or replace it.',
      service_type: 'Plumbing',
      category: 'plumbing',
      priority: 'medium',
      urgency_level: 5,
      customer_id: 'customer-2',
      customer_name: 'Sarah Johnson',
      customer_email: 'sarah.j@email.com',
      customer_phone: '(555) 987-6543',
      location: {
        address: '456 Oak Ave',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103',
        coordinates: { lat: 37.7749, lng: -122.4194 },
      },
      flexible_scheduling: true,
      photos: [],
      documents: [],
      suggested_providers: [],
      status: 'submitted',
      status_history: [
        {
          status: 'submitted',
          timestamp: '2024-01-21T11:30:00Z',
          notes: 'Work request submitted',
          updated_by: 'system',
        },
      ],
      created_at: '2024-01-21T11:30:00Z',
      updated_at: '2024-01-21T11:30:00Z',
    },
  ];

  const filteredRequests = workRequests.filter(
    req =>
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.request_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: WorkRequest['status']) => {
    const colors: Record<WorkRequest['status'], string> = {
      submitted: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      analyzing: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      matched: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      quote_sent: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      quote_accepted: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      scheduled: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
      in_progress: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      completed: 'bg-green-500/20 text-green-400 border border-green-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
      medium: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      high: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      urgent: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
    return colors[priority];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-xl p-8 text-white shadow-2xl border border-orange-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl border-2 border-white/30">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Work Request Manager</h1>
              <p className="text-orange-100 text-lg">AI-powered service provider matching</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-xs text-white/70">AI Powered</p>
                  <p className="text-sm font-bold">
                    {workRequests.filter(r => r.ai_analysis?.extracted_data?.ai_guide_used || r.ai_analysis?.extracted_data?.video_analysis_used).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-xs text-white/70">AI Matches</p>
                  <p className="text-sm font-bold">
                    {workRequests.filter(r => r.status === 'matched').length}
                  </p>
                </div>
              </div>
            </div>
            <CompactStandardButton
              onClick={() => {/* Create new work request */}}
              color="orange"
              icon={<Plus className="w-5 h-5" />}
              label="New Request"
              className="!bg-white !text-orange-600 hover:!bg-gray-100 !border-white shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {(['submitted', 'analyzing', 'matched', 'in_progress', 'completed'] as const).map((status) => {
          const count = workRequests.filter(r => r.status === status).length;
          return (
            <div
              key={status}
              className="bg-[#1a1a1a] rounded-xl border-2 border-[#2a2a2a] p-4 hover:border-orange-600/50 hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer"
              onClick={() => setFilterStatus(status)}
            >
              <p className="text-sm font-medium text-gray-400 mb-1 capitalize">
                {status.replace('_', ' ')}
              </p>
              <p className="text-3xl font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-xl shadow-sm border border-[#2a2a2a] p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] text-white border-2 border-[#2a2a2a] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-[#0a0a0a] text-white border-2 border-[#2a2a2a] rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="analyzing">Analyzing</option>
            <option value="matched">Matched</option>
            <option value="quote_sent">Quote Sent</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <CompactStandardButton
            onClick={loadWorkRequests}
            color="orange"
            icon={<RefreshCw className="w-4 h-4" />}
            label="Refresh"
          />
        </div>
      </div>

      {/* Work Requests List */}
      <div className="space-y-4">
        {filteredRequests.map(request => (
          <div
            key={request.id}
            className="bg-[#1a1a1a] rounded-xl border-2 border-[#2a2a2a] hover:border-orange-600/50 hover:shadow-lg hover:shadow-orange-500/20 transition-all overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white">{request.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    {request.ai_analysis?.extracted_data?.ai_guide_used && (
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center gap-1 border border-blue-500/30">
                        <Sparkles className="w-3 h-3" />
                        AI Guide
                      </span>
                    )}
                    {request.ai_analysis?.extracted_data?.video_analysis_used && (
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center gap-1 border border-purple-500/30">
                        <Brain className="w-3 h-3" />
                        Video Analysis
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 font-mono mb-2">{request.request_number}</p>
                  <p className="text-gray-300 mb-3 line-clamp-2">{request.description}</p>
                  
                  {/* Customer & Location Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="w-4 h-4" />
                      {request.customer_name}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="w-4 h-4" />
                      {request.customer_phone}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="w-4 h-4" />
                      {request.location.city}, {request.location.state}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4" />
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  {request.status === 'submitted' && (
                    <CompactStandardButton
                      onClick={() => analyzeAndMatch(request)}
                      disabled={analyzing}
                      color="purple"
                      icon={analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      label={analyzing ? "Analyzing..." : "AI Match"}
                    />
                  )}
                  
                  {/* Create Quote Button */}
                  <CompactStandardButton
                    onClick={() => {
                      // Prepare quote data from work request
                      const quoteData = {
                        workRequestNumber: request.request_number,
                        customerName: request.customer_name,
                        customerEmail: request.customer_email,
                        customerPhone: request.customer_phone,
                        serviceType: request.service_type,
                        description: request.description,
                        location: request.location,
                        priority: request.priority,
                        estimatedCost: request.ai_analysis?.estimated_cost_range,
                        estimatedDurationHours: request.ai_analysis?.estimated_duration_hours,
                        complexityLevel: request.ai_analysis?.complexity_level,
                        labor: request.ai_analysis?.required_skills,
                        materials: request.ai_analysis?.required_materials,
                        attachments: request.attachments,
                      };
                      
                      // Store in localStorage for the workflow to pick up
                      localStorage.setItem('pending_quote_data', JSON.stringify(quoteData));
                      
                      // Navigate to quote workflow
                      window.location.href = '/quote-to-contract-workflow';
                    }}
                    color="orange"
                    icon={<FileText className="w-4 h-4" />}
                    label="Create Quote"
                  />
                  
                  <CompactStandardButton
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetails(true);
                    }}
                    color="blue"
                    icon={<Eye className="w-4 h-4" />}
                    label="Details"
                  />
                </div>
              </div>

              {/* AI Analysis Summary */}
              {request.ai_analysis && (
                <div className="mt-4 p-4 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl border-2 border-purple-500/30">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h4 className="font-bold text-white">AI Analysis</h4>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full border border-purple-500/30">
                      {request.ai_analysis.confidence_score}% confidence
                    </span>
                    {request.ai_analysis.extracted_data?.ai_accuracy_score && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full flex items-center gap-1 border border-green-500/30">
                        <Target className="w-3 h-3" />
                        {request.ai_analysis.extracted_data.ai_accuracy_score}% accuracy
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Complexity</p>
                      <p className="font-semibold text-white capitalize">{request.ai_analysis.complexity_level}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Duration</p>
                      <p className="font-semibold text-white">{request.ai_analysis.estimated_duration_hours}h</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Est. Cost</p>
                      <p className="font-semibold text-white">
                        ${request.ai_analysis.estimated_cost_range.min.toLocaleString()} - ${request.ai_analysis.estimated_cost_range.max.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Urgency</p>
                      <p className="font-semibold text-white capitalize">{request.ai_analysis.urgency_assessment.level}</p>
                    </div>
                  </div>

                  {/* Video Analysis Details */}
                  {request.ai_analysis.extracted_data?.video_analysis_used && (
                    <div className="mt-3 pt-3 border-t border-purple-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <h5 className="font-semibold text-white text-sm">Video Analysis Details</h5>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {request.ai_analysis.extracted_data.room_dimensions && (
                          <div>
                            <p className="text-gray-400 mb-1">Dimensions</p>
                            <p className="font-medium text-white">
                              {request.ai_analysis.extracted_data.room_dimensions.length}' × {request.ai_analysis.extracted_data.room_dimensions.width}' × {request.ai_analysis.extracted_data.room_dimensions.height}'
                            </p>
                          </div>
                        )}
                        {request.ai_analysis.extracted_data.detected_materials && (
                          <div>
                            <p className="text-gray-400 mb-1">Materials</p>
                            <p className="font-medium text-white">
                              {request.ai_analysis.extracted_data.detected_materials.length} detected
                            </p>
                          </div>
                        )}
                        {request.ai_analysis.extracted_data.floor_plan_generated && (
                          <div>
                            <p className="text-gray-400 mb-1">Floor Plan</p>
                            <p className="font-medium text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Generated
                            </p>
                          </div>
                        )}
                        {request.ai_analysis.extracted_data.messages_exchanged && (
                          <div>
                            <p className="text-gray-400 mb-1">AI Messages</p>
                            <p className="font-medium text-white">
                              {request.ai_analysis.extracted_data.messages_exchanged} exchanged
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Suggested Providers */}
              {request.suggested_providers && request.suggested_providers.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-orange-600" />
                    <h4 className="font-bold text-white">Suggested Providers</h4>
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded-full border border-orange-500/30">
                      {request.suggested_providers.length} matches
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {request.suggested_providers.slice(0, 2).map(provider => (
                      <div
                        key={provider.business_id}
                        className="p-4 bg-[#0a0a0a] rounded-lg border-2 border-[#2a2a2a] hover:border-orange-600/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h5 className="font-bold text-white">{provider.business_name}</h5>
                              {provider.recommended && (
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1 border border-emerald-500/30">
                                  <ThumbsUp className="w-3 h-3" />
                                  Recommended
                                </span>
                              )}
                              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded-full border border-orange-500/30">
                                {provider.match_score}% match
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-400 mb-3">{provider.recommendation_reason}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                <Navigation className="w-4 h-4 text-orange-500" />
                                <span className="font-semibold text-gray-300">{provider.distance_miles}mi</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500" />
                                <span className="font-semibold text-gray-300">{provider.average_rating}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Award className="w-4 h-4 text-purple-500" />
                                <span className="font-semibold text-gray-300">{provider.completed_jobs} jobs</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-emerald-500" />
                                <span className="font-semibold text-gray-300">{provider.response_time_hours}h</span>
                              </div>
                              {provider.estimated_cost && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4 text-green-500" />
                                  <span className="font-semibold text-gray-300">${provider.estimated_cost}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <CompactStandardButton
                            onClick={() => {}}
                            color="orange"
                            label="Assign"
                            className="ml-4"
                          />
                        </div>
                      </div>
                    ))}
                    
                    {request.suggested_providers.length > 2 && (
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetails(true);
                        }}
                        className="w-full py-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 border border-orange-500/30"
                      >
                        View all {request.suggested_providers.length} providers
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRequests.length === 0 && !loading && (
        <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border-2 border-[#2a2a2a]">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No work requests found</h3>
          <p className="text-gray-400">Try adjusting your filters or create a new request</p>
        </div>
      )}

      {/* Detailed Work Request Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#0A0A0A] border-2 border-orange-500 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-orange-500/20">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b-2 border-orange-500 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedRequest.title}</h2>
                <p className="text-gray-400">Request #{selectedRequest.request_number}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedRequest(null);
                }}
                className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-red-500 text-gray-400 hover:text-red-400 transition-all flex items-center justify-center"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-500" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Name</p>
                    <p className="text-white font-semibold">{selectedRequest.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Email</p>
                    <p className="text-white font-semibold">{selectedRequest.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Phone</p>
                    <p className="text-white font-semibold">{selectedRequest.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Location</p>
                    <p className="text-white font-semibold">
                      {selectedRequest.location.address}, {selectedRequest.location.city}, {selectedRequest.location.state} {selectedRequest.location.zip}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Analysis & Floor Plans */}
              {selectedRequest.ai_analysis && (
                <div className="bg-[#1A1A1A] border-2 border-purple-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    AI Analysis & Floor Plans
                  </h3>
                  
                  {/* AI Detected Information */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-purple-400 mb-3">Detected Information</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Service Type</p>
                        <p className="text-white font-semibold">{selectedRequest.ai_analysis.detected_service_type}</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Complexity</p>
                        <p className="text-white font-semibold capitalize">{selectedRequest.ai_analysis.complexity_level}</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Confidence Score</p>
                        <p className="text-white font-semibold">{selectedRequest.ai_analysis.confidence_score}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Floor Plan & Dimensions */}
                  {selectedRequest.ai_analysis.extracted_data?.floor_plan_generated && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-purple-400 mb-3">AI-Generated Floor Plan</h4>
                      <div className="bg-[#0A0A0A] border-2 border-purple-500/30 rounded-lg p-6">
                        <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                          <div className="text-center">
                            <ImageIcon className="w-16 h-16 text-purple-400 mx-auto mb-3" />
                            <p className="text-purple-300 font-semibold">AI-Generated Floor Plan</p>
                            <p className="text-sm text-gray-400">Based on video analysis</p>
                          </div>
                        </div>
                        {selectedRequest.ai_analysis.extracted_data.room_dimensions && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#1A1A1A] border border-purple-500/30 rounded-lg p-3">
                              <p className="text-xs text-gray-400">Length</p>
                              <p className="text-white font-bold">{selectedRequest.ai_analysis.extracted_data.room_dimensions.length} ft</p>
                            </div>
                            <div className="bg-[#1A1A1A] border border-purple-500/30 rounded-lg p-3">
                              <p className="text-xs text-gray-400">Width</p>
                              <p className="text-white font-bold">{selectedRequest.ai_analysis.extracted_data.room_dimensions.width} ft</p>
                            </div>
                            <div className="bg-[#1A1A1A] border border-purple-500/30 rounded-lg p-3">
                              <p className="text-xs text-gray-400">Height</p>
                              <p className="text-white font-bold">{selectedRequest.ai_analysis.extracted_data.room_dimensions.height} ft</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3D Renderings */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-purple-400 mb-3">AI-Generated 3D Renderings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0A0A0A] border-2 border-purple-500/30 rounded-lg p-4">
                        <div className="aspect-video bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg flex items-center justify-center mb-3">
                          <div className="text-center">
                            <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                            <p className="text-blue-300 font-semibold text-sm">Before Rendering</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center">Current State Analysis</p>
                      </div>
                      <div className="bg-[#0A0A0A] border-2 border-green-500/30 rounded-lg p-4">
                        <div className="aspect-video bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-lg flex items-center justify-center mb-3">
                          <div className="text-center">
                            <Sparkles className="w-12 h-12 text-green-400 mx-auto mb-2" />
                            <p className="text-green-300 font-semibold text-sm">After Rendering</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center">Proposed Design</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Labor & Materials Breakdown */}
              <div className="bg-[#1A1A1A] border-2 border-green-500/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Labor & Materials Breakdown
                </h3>

                {/* Estimated Cost */}
                {selectedRequest.ai_analysis?.estimated_cost_range && (
                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-300 mb-2">Estimated Total Cost</p>
                    <p className="text-3xl font-bold text-white">
                      ${selectedRequest.ai_analysis.estimated_cost_range.min.toLocaleString()} - ${selectedRequest.ai_analysis.estimated_cost_range.max.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-400 mt-1">
                      {selectedRequest.ai_analysis.estimated_cost_range.confidence}% confidence
                    </p>
                  </div>
                )}

                {/* Required Skills (Labor) */}
                {selectedRequest.ai_analysis?.required_skills && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Required Labor & Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.ai_analysis.required_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-[#0A0A0A] border border-green-500/30 text-green-300 rounded-lg text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Materials */}
                {selectedRequest.ai_analysis?.extracted_data?.detected_materials && (
                  <div>
                    <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Detected Materials
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedRequest.ai_analysis.extracted_data.detected_materials.map((material, index) => (
                        <div
                          key={index}
                          className="bg-[#0A0A0A] border border-green-500/30 rounded-lg p-3 flex items-center gap-3"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-white font-medium">{material}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Equipment */}
                {selectedRequest.ai_analysis?.required_equipment && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-green-400 mb-3">Required Equipment</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.ai_analysis.required_equipment.map((equipment, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-[#0A0A0A] border border-orange-500/30 text-orange-300 rounded-lg text-sm font-medium"
                        >
                          {equipment}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duration */}
                {selectedRequest.ai_analysis?.estimated_duration_hours && (
                  <div className="mt-6 bg-[#0A0A0A] border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Estimated Duration</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedRequest.ai_analysis.estimated_duration_hours} hours
                      <span className="text-sm text-gray-400 ml-2">
                        (~{Math.ceil(selectedRequest.ai_analysis.estimated_duration_hours / 8)} days)
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Additional Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Description</p>
                    <p className="text-white">{selectedRequest.description}</p>
                  </div>
                  {selectedRequest.ai_analysis?.requires_permit && (
                    <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-3 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-300 font-semibold">Permit Required</p>
                        <p className="text-sm text-yellow-200/70">This project requires building permits</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <StandardButton
                  onClick={() => openEditModal(selectedRequest)}
                  color="orange"
                  label="Edit Details"
                  icon={<FileText className="w-5 h-5" />}
                  className="flex-1"
                />
                <StandardButton
                  onClick={() => generateQuoteFromRequest(selectedRequest)}
                  color="green"
                  label="Generate AI Quote"
                  icon={<Sparkles className="w-5 h-5" />}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Work Request Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#0A0A0A] border-2 border-orange-500 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-orange-500/20">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b-2 border-orange-500 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Edit Work Request</h2>
                <p className="text-gray-400">Request #{editFormData.request_number}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditFormData({});
                }}
                className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-red-500 text-gray-400 hover:text-red-400 transition-all flex items-center justify-center"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-500" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Name</p>
                    <input
                      type="text"
                      value={editFormData.customer_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                      className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Email</p>
                    <input
                      type="email"
                      value={editFormData.customer_email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, customer_email: e.target.value })}
                      className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Phone</p>
                    <input
                      type="tel"
                      value={editFormData.customer_phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, customer_phone: e.target.value })}
                      className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Location</p>
                    <input
                      type="text"
                      value={`${editFormData.location?.address || ''}, ${editFormData.location?.city || ''}, ${editFormData.location?.state || ''} ${editFormData.location?.zip || ''}`}
                      onChange={(e) => setEditFormData({ ...editFormData, location: { ...editFormData.location, address: e.target.value.split(',')[0].trim(), city: e.target.value.split(',')[1].trim(), state: e.target.value.split(',')[2].trim(), zip: e.target.value.split(',')[3].trim() } })}
                      className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Service Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Service Type</p>
                    <input
                      type="text"
                      value={editFormData.service_type || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, service_type: e.target.value })}
                      className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Category</p>
                    <input
                      type="text"
                      value={editFormData.category || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Priority</p>
                    <select
                      value={editFormData.priority || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                      className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Urgency Level</p>
                    <input
                      type="number"
                      value={editFormData.urgency_level || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, urgency_level: parseInt(e.target.value) })}
                      className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Description
                </h3>
                <textarea
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="text-white font-semibold bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2 w-full h-24"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <StandardButton
                  onClick={saveEditedRequest}
                  color="green"
                  label="Save Changes"
                  icon={<CheckCircle className="w-5 h-5" />}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}