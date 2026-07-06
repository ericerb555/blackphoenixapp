import { useState, useEffect } from 'react';
import {
  Briefcase, Search, Filter, Download, Calendar, DollarSign,
  Plus, Grid, List, Clock, CheckCircle, XCircle, Pause, AlertCircle,
  MapPin, User, TrendingUp, Activity, Target, Edit2, Trash2, Eye, ArrowLeft
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '../components/ui/table';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import EditProjectModal from '../components/projects/EditProjectModal';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';
import ProjectDetail from './ProjectDetail';
import {
  getProjects,
  getProjectStats,
  deleteProject,
  type ProjectWithCustomer,
  type Project,
} from '../lib/services/projectService';
import { toast } from 'sonner@2.0.3';
import { isAdminOrHigher } from '../lib/utils/roleUtils';

type ViewMode = 'grid' | 'list';
type TabType = 'all' | 'pending' | 'in_progress' | 'completed' | 'on_hold';

export default function ProjectsNew() {
  const [projects, setProjects] = useState<ProjectWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingProject, setViewingProject] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    on_hold: 0,
    urgent: 0,
    totalEstimatedRevenue: 0,
    totalActualRevenue: 0,
  });

  useEffect(() => {
    loadProjects();
    loadStats();
  }, []);

  // Read tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab && ['all', 'pending', 'in_progress', 'completed', 'on_hold'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Failed to load projects');
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getProjectStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleCreateSuccess = () => {
    loadProjects();
    loadStats();
  };

  const handleEditSuccess = () => {
    loadProjects();
    loadStats();
  };

  const handleEditClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(project);
    setShowEditModal(true);
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setDeleteLoading(true);
    try {
      await deleteProject(projectToDelete.id);
      toast.success('Project deleted successfully!');
      setShowDeleteModal(false);
      setProjectToDelete(null);
      loadProjects();
      loadStats();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.message || 'Failed to delete project');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchQuery === '' ||
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === 'all' || project.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'in_progress':
        return Activity;
      case 'completed':
        return CheckCircle;
      case 'on_hold':
        return Pause;
      case 'cancelled':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'blue';
      case 'in_progress':
        return 'orange';
      case 'completed':
        return 'green';
      case 'on_hold':
        return 'yellow';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low':
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statsDisplay = [
    { label: 'Total Projects', value: stats.total, change: '+8%', icon: Briefcase },
    { label: 'Pending', value: stats.pending, change: '+12%', icon: Clock },
    { label: 'In Progress', value: stats.in_progress, change: '+5%', icon: Activity },
    { label: 'Completed', value: stats.completed, change: '+15%', icon: CheckCircle },
    {
      label: 'Est. Revenue',
      value: `$${(stats.totalEstimatedRevenue / 1000).toFixed(1)}k`,
      change: '+20%',
      icon: DollarSign,
    },
    {
      label: 'Actual Revenue',
      value: `$${(stats.totalActualRevenue / 1000).toFixed(1)}k`,
      change: '+18%',
      icon: TrendingUp,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadProjects}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show project detail view if viewing a specific project
  if (viewingProject) {
    return (
      <ProjectDetail
        projectId={viewingProject}
        onBack={() => setViewingProject(null)}
        onEdit={(project) => {
          setProjectToEdit(project);
          setShowEditModal(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => {
              window.location.href = '/unified-dashboard';
            }}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Back to Unified Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-orange-400" />
            Project Management
          </h1>
        </div>
        <p className="text-gray-400 ml-14">Manage work orders and track project progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsDisplay.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] hover:border-orange-500/30 transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <Icon className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-sm font-semibold text-green-400">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects by title, number, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
              showFilters
                ? 'bg-orange-600 text-white border-orange-600'
                : 'border-[#2A2A2A] text-gray-300 hover:bg-[#2A2A2A]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <div className="flex items-center gap-2 p-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-400 hover:bg-[#2A2A2A]'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-400 hover:bg-[#2A2A2A]'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-3 border border-[#2A2A2A] rounded-xl text-gray-300 hover:bg-[#2A2A2A] transition">
            <Download className="w-4 h-4" />
            Export
          </button>

          {isAdminOrHigher() && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => handleTabChange('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => handleTabChange('in_progress')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'in_progress'
                ? 'bg-orange-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            In Progress ({stats.in_progress})
          </button>
          <button
            onClick={() => handleTabChange('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            onClick={() => handleTabChange('on_hold')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'on_hold'
                ? 'bg-yellow-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            On Hold ({stats.on_hold})
          </button>
        </div>
      </div>

      {/* Project Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const StatusIcon = getStatusIcon(project.status);
            const statusColor = getStatusColor(project.status);

            return (
              <div
                key={project.id}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 hover:bg-gradient-to-br hover:from-orange-600/5 hover:to-orange-700/5 transition cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-gray-500">{project.project_number}</span>
                      <span
                        className={`px-2 py-1 rounded text-sm font-semibold ${getPriorityColor(
                          project.priority
                        )} border`}
                      >
                        {project.priority.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-orange-400 transition mb-1">
                      {project.title}
                    </h3>
                    {project.type && (
                      <p className="text-sm text-gray-500">{project.type}</p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1 ${
                      statusColor === 'blue'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : statusColor === 'orange'
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : statusColor === 'green'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : statusColor === 'yellow'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {project.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Customer */}
                {project.customer && (
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#2A2A2A]">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                      {project.customer.first_name?.charAt(0)}
                      {project.customer.last_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {project.customer.first_name} {project.customer.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{project.customer.company}</p>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="space-y-2 mb-4">
                  {project.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(project.scheduled_date)}</span>
                    </div>
                  )}
                  {project.location_address && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{project.location_address}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-[#2A2A2A] mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Estimated</p>
                    <p className="text-lg font-bold text-orange-400">
                      ${project.estimated_cost?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Hours</p>
                    <p className="text-lg font-bold text-white">
                      {project.estimated_hours || 0}h
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className={`grid ${isAdminOrHigher() ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingProject(project.id);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600/10 hover:bg-orange-600/20 rounded-lg text-orange-400 text-sm font-semibold transition border border-orange-500/20"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  {isAdminOrHigher() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/job-financial-tracker?project=${project.id}`;
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600/10 hover:bg-green-600/20 rounded-lg text-green-400 text-sm font-semibold transition border border-green-500/20"
                      title="View project financials and labor costs"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span className="hidden xl:inline">Financials</span>
                      <span className="xl:hidden">$</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEditClick(project, e)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 rounded-lg text-blue-400 text-sm font-semibold transition border border-blue-500/20"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(project, e)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 rounded-lg text-red-400 text-sm font-semibold transition border border-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <DataTable
          columns={[
            {
              key: 'project',
              header: 'Project',
              sortable: true,
              sortFn: (a, b) => a.title.localeCompare(b.title),
              render: (project: ProjectWithCustomer) => (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-gray-500">
                      {project.project_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-sm font-semibold ${getPriorityColor(
                        project.priority
                      )} border`}
                    >
                      {project.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-semibold text-white">{project.title}</p>
                  {project.type && <p className="text-sm text-gray-400">{project.type}</p>}
                </div>
              ),
            },
            {
              key: 'customer',
              header: 'Customer',
              render: (project: ProjectWithCustomer) =>
                project.customer ? (
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {project.customer.first_name} {project.customer.last_name}
                    </p>
                    <p className="text-sm text-gray-400">{project.customer.company}</p>
                  </div>
                ) : (
                  <span className="text-gray-500">-</span>
                ),
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              sortFn: (a, b) => a.status.localeCompare(b.status),
              render: (project: ProjectWithCustomer) => {
                const StatusIcon = getStatusIcon(project.status);
                const statusColor = getStatusColor(project.status);
                return (
                  <span
                    className={`px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1 w-fit ${
                      statusColor === 'blue'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : statusColor === 'orange'
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : statusColor === 'green'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : statusColor === 'yellow'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {project.status.replace('_', ' ').toUpperCase()}
                  </span>
                );
              },
            },
            {
              key: 'scheduled',
              header: 'Scheduled',
              sortable: true,
              sortFn: (a, b) =>
                (a.scheduled_date || '').localeCompare(b.scheduled_date || ''),
              render: (project: ProjectWithCustomer) => (
                <p className="text-sm text-gray-300">{formatDate(project.scheduled_date)}</p>
              ),
            },
            {
              key: 'estimated',
              header: 'Estimated',
              sortable: true,
              sortFn: (a, b) => (a.estimated_cost || 0) - (b.estimated_cost || 0),
              render: (project: ProjectWithCustomer) => (
                <p className="font-semibold text-orange-400">
                  ${project.estimated_cost?.toLocaleString() || '0'}
                </p>
              ),
              align: 'right',
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (project: ProjectWithCustomer) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {e.stopPropagation(); setViewingProject(project.id);}}
                    className="p-2 hover:bg-orange-600/10 rounded-lg transition border border-transparent hover:border-orange-500/20"
                    title="View details"
                  >
                    <Eye className="w-4 h-4 text-orange-400" />
                  </button>
                  {isAdminOrHigher() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/job-financial-tracker?project=${project.id}`;
                      }}
                      className="p-2 hover:bg-green-600/10 rounded-lg transition border border-transparent hover:border-green-500/20"
                      title="View financials and labor costs"
                    >
                      <DollarSign className="w-4 h-4 text-green-400" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {e.stopPropagation(); handleEditClick(project as Project, e);}}
                    className="p-2 hover:bg-blue-600/10 rounded-lg transition border border-transparent hover:border-blue-500/20"
                    title="Edit project"
                  >
                    <Edit2 className="w-4 h-4 text-blue-400" />
                  </button>
                  <button
                    onClick={(e) => {e.stopPropagation(); handleDeleteClick(project as Project, e);}}
                    className="p-2 hover:bg-red-600/10 rounded-lg transition border border-transparent hover:border-red-500/20"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ),
              align: 'right',
            },
          ] as DataTableColumn<ProjectWithCustomer>[]}
          data={filteredProjects}
          emptyMessage="No projects found"
          rowHoverEffect={true}
          defaultSort={{ key: 'scheduled', direction: 'desc' }}
          pagination={true}
          pageSize={15}
          pageSizeOptions={[10, 15, 25, 50]}
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Project Modal */}
      {projectToEdit && (
        <EditProjectModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setProjectToEdit(null);
          }}
          onSuccess={handleEditSuccess}
          project={projectToEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setProjectToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Project"
          message="Are you sure you want to delete this project? This action cannot be undone."
          itemName={`${projectToDelete.title} (${projectToDelete.project_number})`}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}