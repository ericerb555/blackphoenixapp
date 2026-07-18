import { useState, useEffect } from 'react';
import {
  ArrowLeft, Edit2, Calendar, MapPin, User, DollarSign,
  Clock, TrendingUp, AlertCircle, CheckCircle2, XCircle,
  Pause, FileText, Tag, Wrench, Package, Phone, Mail,
  Building2, Target, Activity, BarChart3
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onEdit: (project: any) => void;
}

interface Project {
  id: string;
  project_number: string;
  customer_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  assigned_to?: string;
  scheduled_date?: string;
  start_date?: string;
  completion_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  estimated_cost?: number;
  actual_cost?: number;
  location_address?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  special_instructions?: string;
  materials_needed?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    company?: string;
  };
}

export default function ProjectDetail({ projectId, onBack, onEdit }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      // In a real app, fetch from API
      // For now, using mock data
      const mockProject: Project = {
        id: projectId,
        project_number: 'PRJ-2026-001',
        customer_id: 'cust-001',
        title: 'Luxury Kitchen Remodel - Modern Contemporary Design',
        description: 'Complete kitchen renovation including custom cabinetry, quartz countertops, high-end appliances, and designer lighting. Premium finishes throughout with attention to detail.',
        status: 'in_progress',
        priority: 'high',
        type: 'Remodel',
        assigned_to: 'Mike Johnson',
        scheduled_date: '2026-03-20T09:00:00Z',
        start_date: '2026-03-15T08:00:00Z',
        completion_date: '2026-04-30T17:00:00Z',
        estimated_hours: 320,
        actual_hours: 180,
        estimated_cost: 85000,
        actual_cost: 45000,
        location_address: '456 Oak Avenue',
        location_city: 'Austin',
        location_state: 'TX',
        location_zip: '78702',
        special_instructions: 'Client prefers morning work hours. Premium materials only. Coordinate with interior designer Sarah Chen.',
        materials_needed: ['Custom Cabinetry', 'Quartz Countertops', 'Stainless Appliances', 'LED Lighting', 'Hardwood Flooring'],
        tags: ['Premium', 'Residential', 'Kitchen', 'High-Value'],
        created_at: '2026-02-01T10:30:00Z',
        updated_at: '2026-03-17T14:20:00Z',
        customer: {
          first_name: 'Sarah',
          last_name: 'Williams',
          email: 'sarah.williams@example.com',
          phone: '(555) 234-5678',
          company: 'Williams Residence',
        },
      };
      setProject(mockProject);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 };
      case 'in_progress':
        return { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Activity };
      case 'pending':
        return { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock };
      case 'on_hold':
        return { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: Pause };
      case 'cancelled':
        return { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle };
      default:
        return { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: AlertCircle };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2A2A2A] border-t-[#ea580c] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Project not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-300 rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;
  const progressPercentage = project.estimated_hours 
    ? Math.round((project.actual_hours || 0) / project.estimated_hours * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.title}</h1>
            <p className="text-gray-400">{project.project_number}</p>
          </div>
        </div>
        <button
          onClick={() => onEdit(project)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit Project
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Status</p>
            <StatusIcon className="w-4 h-4 text-gray-500" />
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
            {project.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Priority</p>
            <Target className="w-4 h-4 text-gray-500" />
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(project.priority)}`}>
            {project.priority.toUpperCase()}
          </span>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Estimated Cost</p>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${project.estimated_cost?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Progress</p>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-white">{progressPercentage}%</p>
            <div className="w-full bg-[#2A2A2A] rounded-full h-2">
              <div
                className="bg-[#ea580c] h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Project Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ea580c]" />
                Description
              </h2>
              <p className="text-gray-300">{project.description}</p>
            </div>
          )}

          {/* Customer Information */}
          {project.customer && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Customer</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#ea580c]" />
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="text-white">
                      {project.customer.first_name} {project.customer.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#ea580c]" />
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <a href={`mailto:${project.customer.email}`} className="text-white hover:text-[#ea580c]">
                      {project.customer.email}
                    </a>
                  </div>
                </div>
                {project.customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#ea580c]" />
                    <div>
                      <p className="text-sm text-gray-400">Phone</p>
                      <a href={`tel:${project.customer.phone}`} className="text-white hover:text-[#ea580c]">
                        {project.customer.phone}
                      </a>
                    </div>
                  </div>
                )}
                {project.customer.company && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-[#ea580c]" />
                    <div>
                      <p className="text-sm text-gray-400">Company</p>
                      <p className="text-white">{project.customer.company}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          {project.location_address && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#ea580c]" />
                Location
              </h2>
              <p className="text-white">
                {project.location_address}
                <br />
                {project.location_city}, {project.location_state} {project.location_zip}
              </p>
            </div>
          )}

          {/* Special Instructions */}
          {project.special_instructions && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                Special Instructions
              </h2>
              <p className="text-gray-300">{project.special_instructions}</p>
            </div>
          )}
        </div>

        {/* Right Column - Additional Info */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#ea580c]" />
              Timeline
            </h2>
            <div className="space-y-3">
              {project.scheduled_date && (
                <div>
                  <p className="text-sm text-gray-400">Scheduled</p>
                  <p className="text-white">
                    {new Date(project.scheduled_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {project.start_date && (
                <div>
                  <p className="text-sm text-gray-400">Started</p>
                  <p className="text-white">
                    {new Date(project.start_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {project.completion_date && (
                <div>
                  <p className="text-sm text-gray-400">Expected Completion</p>
                  <p className="text-white">
                    {new Date(project.completion_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Hours & Cost Tracking */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ea580c]" />
              Tracking
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Hours</span>
                  <span>{project.actual_hours || 0} / {project.estimated_hours || 0}</span>
                </div>
                <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Cost</span>
                  <span>${project.actual_cost?.toLocaleString() || 0} / ${project.estimated_cost?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ 
                      width: `${Math.min(
                        project.estimated_cost 
                          ? ((project.actual_cost || 0) / project.estimated_cost * 100)
                          : 0,
                        100
                      )}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Materials Needed */}
          {project.materials_needed && project.materials_needed.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#ea580c]" />
                Materials
              </h2>
              <ul className="space-y-2">
                {project.materials_needed.map((material, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-300">
                    <div className="w-1.5 h-1.5 bg-[#ea580c] rounded-full" />
                    {material}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#ea580c]" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#2A2A2A] text-gray-300 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
            <div className="space-y-3">
              {project.type && (
                <div>
                  <p className="text-sm text-gray-400">Type</p>
                  <p className="text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-gray-500" />
                    {project.type}
                  </p>
                </div>
              )}
              {project.assigned_to && (
                <div>
                  <p className="text-sm text-gray-400">Assigned To</p>
                  <p className="text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    {project.assigned_to}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-white">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Updated</p>
                <p className="text-white">
                  {new Date(project.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
