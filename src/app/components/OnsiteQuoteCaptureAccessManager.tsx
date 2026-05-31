import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Video,
  Camera,
  Layout,
  Users,
  Shield,
  Settings,
  CheckCircle,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Lock,
  Unlock,
  Eye,
  AlertCircle,
  Zap,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

interface CaptureFeature {
  id: string;
  feature_name: string;
  feature_type: 'video' | 'photo' | 'ai_floor_plan' | 'measurement' | 'annotation';
  description: string;
  is_enabled: boolean;
  requires_approval: boolean;
  max_file_size_mb: number;
  allowed_formats: string[];
  created_at: string;
}

interface RoleAccess {
  id: string;
  role_name: string;
  role_display_name: string;
  can_capture_video: boolean;
  can_capture_photo: boolean;
  can_generate_floor_plan: boolean;
  can_use_measurements: boolean;
  can_use_annotations: boolean;
  can_approve_captures: boolean;
  daily_capture_limit: number;
  updated_at: string;
}

interface UserOverride {
  id: string;
  user_id: string;
  employee_name: string;
  email: string;
  role_name: string;
  override_permissions: {
    video?: boolean;
    photo?: boolean;
    floor_plan?: boolean;
    measurements?: boolean;
    annotations?: boolean;
  };
  reason: string;
  expires_at: string | null;
  created_at: string;
}

interface CaptureLog {
  id: string;
  user_name: string;
  capture_type: string;
  file_count: number;
  total_size_mb: number;
  created_at: string;
}

export default function OnsiteQuoteCaptureAccessManager() {
  const [activeTab, setActiveTab] = useState<'features' | 'roles' | 'users' | 'logs'>('features');
  const [features, setFeatures] = useState<CaptureFeature[]>([]);
  const [roleAccess, setRoleAccess] = useState<RoleAccess[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
  const [captureLogs, setCaptureLogs] = useState<CaptureLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showAddOverride, setShowAddOverride] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadFeatures(),
      loadRoleAccess(),
      loadUserOverrides(),
      loadCaptureLogs(),
    ]);
    setLoading(false);
  };

  const loadFeatures = async () => {
    // Mock data - in production, load from database
    setFeatures([
      {
        id: '1',
        feature_name: 'Video Capture',
        feature_type: 'video',
        description: 'Record walkthrough videos of project sites',
        is_enabled: true,
        requires_approval: false,
        max_file_size_mb: 500,
        allowed_formats: ['mp4', 'mov', 'avi'],
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        feature_name: 'Photo Capture',
        feature_type: 'photo',
        description: 'Take high-resolution photos with measurements',
        is_enabled: true,
        requires_approval: false,
        max_file_size_mb: 50,
        allowed_formats: ['jpg', 'jpeg', 'png', 'heic'],
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        feature_name: 'AI Floor Plan Generation',
        feature_type: 'ai_floor_plan',
        description: 'Generate floor plans using AI from photos/video',
        is_enabled: true,
        requires_approval: true,
        max_file_size_mb: 100,
        allowed_formats: ['jpg', 'png', 'mp4'],
        created_at: new Date().toISOString(),
      },
      {
        id: '4',
        feature_name: 'Measurement Tools',
        feature_type: 'measurement',
        description: 'AR-based measurement and annotation tools',
        is_enabled: true,
        requires_approval: false,
        max_file_size_mb: 10,
        allowed_formats: ['json', 'xml'],
        created_at: new Date().toISOString(),
      },
      {
        id: '5',
        feature_name: 'Annotation & Markup',
        feature_type: 'annotation',
        description: 'Add notes, arrows, and markup to captures',
        is_enabled: true,
        requires_approval: false,
        max_file_size_mb: 5,
        allowed_formats: ['json'],
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const loadRoleAccess = async () => {
    // Mock data - in production, load from database
    setRoleAccess([
      {
        id: '1',
        role_name: 'owner',
        role_display_name: 'Owner',
        can_capture_video: true,
        can_capture_photo: true,
        can_generate_floor_plan: true,
        can_use_measurements: true,
        can_use_annotations: true,
        can_approve_captures: true,
        daily_capture_limit: -1, // unlimited
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        role_name: 'admin',
        role_display_name: 'Administrator',
        can_capture_video: true,
        can_capture_photo: true,
        can_generate_floor_plan: true,
        can_use_measurements: true,
        can_use_annotations: true,
        can_approve_captures: true,
        daily_capture_limit: -1,
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        role_name: 'technician',
        role_display_name: 'Technician',
        can_capture_video: true,
        can_capture_photo: true,
        can_generate_floor_plan: false,
        can_use_measurements: true,
        can_use_annotations: true,
        can_approve_captures: false,
        daily_capture_limit: 50,
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        role_name: 'subcontractor',
        role_display_name: 'Subcontractor',
        can_capture_video: false,
        can_capture_photo: true,
        can_generate_floor_plan: false,
        can_use_measurements: true,
        can_use_annotations: false,
        can_approve_captures: false,
        daily_capture_limit: 20,
        updated_at: new Date().toISOString(),
      },
      {
        id: '5',
        role_name: 'client',
        role_display_name: 'Client',
        can_capture_video: false,
        can_capture_photo: false,
        can_generate_floor_plan: false,
        can_use_measurements: false,
        can_use_annotations: false,
        can_approve_captures: false,
        daily_capture_limit: 0,
        updated_at: new Date().toISOString(),
      },
    ]);
  };

  const loadUserOverrides = async () => {
    // Mock data
    setUserOverrides([]);
  };

  const loadCaptureLogs = async () => {
    // Mock data
    setCaptureLogs([]);
  };

  const toggleFeature = async (featureId: string, enabled: boolean) => {
    setFeatures(prev =>
      prev.map(f => f.id === featureId ? { ...f, is_enabled: enabled } : f)
    );
  };

  const toggleRolePermission = async (roleId: string, permission: keyof RoleAccess, value: boolean) => {
    setRoleAccess(prev =>
      prev.map(r => r.id === roleId ? { ...r, [permission]: value } : r)
    );
  };

  const updateRoleCaptureLimit = async (roleId: string, limit: number) => {
    setRoleAccess(prev =>
      prev.map(r => r.id === roleId ? { ...r, daily_capture_limit: limit } : r)
    );
  };

  const getFeatureIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'photo':
        return <Camera className="w-5 h-5" />;
      case 'ai_floor_plan':
        return <Layout className="w-5 h-5" />;
      case 'measurement':
        return <TrendingUp className="w-5 h-5" />;
      case 'annotation':
        return <Edit2 className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const stats = {
    totalFeatures: features.length,
    enabledFeatures: features.filter(f => f.is_enabled).length,
    rolesConfigured: roleAccess.length,
    activeOverrides: userOverrides.length,
    todayCaptures: captureLogs.length,
  };

  // Role Permissions Table Columns
  const roleColumns: DataTableColumn<RoleAccess>[] = [
    {
      key: 'role',
      header: 'Role',
      render: (role) => (
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" />
          <span className="font-semibold text-white">
            {role.role_display_name}
          </span>
        </div>
      )
    },
    {
      key: 'video',
      header: (
        <div className="flex items-center justify-center gap-1">
          <Video className="w-4 h-4" />
          Video
        </div>
      ),
      align: 'center',
      render: (role) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRolePermission(role.id, 'can_capture_video', !role.can_capture_video);
          }}
          className={`p-2 rounded-lg transition-colors ${
            role.can_capture_video
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
          }`}
        >
          {role.can_capture_video ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        </button>
      )
    },
    {
      key: 'photo',
      header: (
        <div className="flex items-center justify-center gap-1">
          <Camera className="w-4 h-4" />
          Photo
        </div>
      ),
      align: 'center',
      render: (role) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRolePermission(role.id, 'can_capture_photo', !role.can_capture_photo);
          }}
          className={`p-2 rounded-lg transition-colors ${
            role.can_capture_photo
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
          }`}
        >
          {role.can_capture_photo ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        </button>
      )
    },
    {
      key: 'floorPlan',
      header: (
        <div className="flex items-center justify-center gap-1">
          <Layout className="w-4 h-4" />
          Floor Plan
        </div>
      ),
      align: 'center',
      render: (role) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRolePermission(role.id, 'can_generate_floor_plan', !role.can_generate_floor_plan);
          }}
          className={`p-2 rounded-lg transition-colors ${
            role.can_generate_floor_plan
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
          }`}
        >
          {role.can_generate_floor_plan ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        </button>
      )
    },
    {
      key: 'measure',
      header: (
        <div className="flex items-center justify-center gap-1">
          <TrendingUp className="w-4 h-4" />
          Measure
        </div>
      ),
      align: 'center',
      render: (role) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRolePermission(role.id, 'can_use_measurements', !role.can_use_measurements);
          }}
          className={`p-2 rounded-lg transition-colors ${
            role.can_use_measurements
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
          }`}
        >
          {role.can_use_measurements ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        </button>
      )
    },
    {
      key: 'annotate',
      header: (
        <div className="flex items-center justify-center gap-1">
          <Edit2 className="w-4 h-4" />
          Annotate
        </div>
      ),
      align: 'center',
      render: (role) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRolePermission(role.id, 'can_use_annotations', !role.can_use_annotations);
          }}
          className={`p-2 rounded-lg transition-colors ${
            role.can_use_annotations
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
          }`}
        >
          {role.can_use_annotations ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        </button>
      )
    },
    {
      key: 'approve',
      header: (
        <div className="flex items-center justify-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Approve
        </div>
      ),
      align: 'center',
      render: (role) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRolePermission(role.id, 'can_approve_captures', !role.can_approve_captures);
          }}
          className={`p-2 rounded-lg transition-colors ${
            role.can_approve_captures
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
          }`}
        >
          {role.can_approve_captures ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        </button>
      )
    },
    {
      key: 'dailyLimit',
      header: 'Daily Limit',
      render: (role) => (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={role.daily_capture_limit === -1 ? '' : role.daily_capture_limit}
            onChange={(e) => {
              e.stopPropagation();
              updateRoleCaptureLimit(role.id, e.target.value === '' ? -1 : parseInt(e.target.value));
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Unlimited"
            className="w-24 px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
          />
          {role.daily_capture_limit === -1 && (
            <span className="text-xs text-green-400 font-medium">Unlimited</span>
          )}
        </div>
      )
    }
  ];

  // Activity Logs Table Columns
  const logColumns: DataTableColumn<CaptureLog>[] = [
    {
      key: 'user',
      header: 'User',
      render: (log) => (
        <span className="text-sm font-medium text-white">{log.user_name}</span>
      )
    },
    {
      key: 'captureType',
      header: 'Capture Type',
      render: (log) => (
        <span className="text-sm text-gray-400">{log.capture_type}</span>
      )
    },
    {
      key: 'files',
      header: 'Files',
      render: (log) => (
        <span className="text-sm text-gray-400">{log.file_count} files</span>
      )
    },
    {
      key: 'size',
      header: 'Size',
      render: (log) => (
        <span className="text-sm text-gray-400">{log.total_size_mb} MB</span>
      )
    },
    {
      key: 'date',
      header: 'Date',
      render: (log) => (
        <span className="text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#0A0A0A]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#0A0A0A] p-6 min-h-screen">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-xl border border-orange-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-400">Total Features</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalFeatures}</p>
            </div>
            <Settings className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl border border-green-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-400">Enabled</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.enabledFeatures}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl border border-purple-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-400">Roles</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.rolesConfigured}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 rounded-xl border border-amber-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-400">Overrides</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.activeOverrides}</p>
            </div>
            <Users className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 rounded-xl border border-cyan-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-400">Today's Captures</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.todayCaptures}</p>
            </div>
            <Clock className="w-8 h-8 text-cyan-500" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#1A1A1A] rounded-xl shadow-sm border border-[#2A2A2A]">
        <div className="flex border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab('features')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'features'
                ? 'border-b-2 border-orange-600 text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            Capture Features
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'roles'
                ? 'border-b-2 border-orange-600 text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            Role Permissions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-orange-600 text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            User Overrides
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'border-b-2 border-orange-600 text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Activity Logs
          </button>
        </div>
      </div>

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          {features.map(feature => (
            <div
              key={feature.id}
              className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:shadow-lg hover:shadow-orange-500/10 transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${
                    feature.is_enabled ? 'bg-orange-500/20' : 'bg-gray-500/20'
                  }`}>
                    <div className={feature.is_enabled ? 'text-orange-400' : 'text-gray-500'}>
                      {getFeatureIcon(feature.feature_type)}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {feature.feature_name}
                      </h3>
                      {feature.is_enabled ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium rounded-lg">
                          Enabled
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 border border-gray-500/30 text-xs font-medium rounded-lg">
                          Disabled
                        </span>
                      )}
                      {feature.requires_approval && (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium rounded-lg flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Requires Approval
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-400 mb-3">{feature.description}</p>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Max File Size:</span>
                        <span className="ml-2 font-semibold text-white">
                          {feature.max_file_size_mb} MB
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Allowed Formats:</span>
                        <span className="ml-2 font-semibold text-white">
                          {feature.allowed_formats.join(', ').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 font-semibold text-white capitalize">
                          {feature.feature_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFeature(feature.id, !feature.is_enabled)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      feature.is_enabled
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    }`}
                  >
                    {feature.is_enabled ? (
                      <>
                        <XCircle className="w-4 h-4 inline mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Enable
                      </>
                    )}
                  </button>
                  <button className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <DataTable
          columns={roleColumns}
          data={roleAccess}
          rowHoverEffect={true}
          containerClassName="bg-[#1A1A1A] border-[#2A2A2A]"
        />
      )}

      {/* User Overrides Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddOverride(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition-colors font-medium shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              Add User Override
            </button>
          </div>

          {userOverrides.length === 0 ? (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No User Overrides</h3>
              <p className="text-gray-400 mb-4">
                Create custom permission overrides for specific users
              </p>
            </div>
          ) : (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] divide-y divide-[#2A2A2A]">
              {userOverrides.map(override => (
                <div key={override.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{override.employee_name}</h3>
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-medium rounded">
                          {override.role_name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{override.email}</p>
                      <p className="text-sm text-gray-300 mb-2">
                        <strong>Reason:</strong> {override.reason}
                      </p>
                      {override.expires_at && (
                        <p className="text-sm text-amber-400">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Expires: {new Date(override.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <div className="p-6 border-b border-[#2A2A2A]">
            <h3 className="text-lg font-semibold text-white">Recent Capture Activity</h3>
          </div>

          {captureLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Activity Yet</h3>
              <p className="text-gray-400">
                Capture activity will appear here when users start using the tools
              </p>
            </div>
          ) : (
            <DataTable
              columns={logColumns}
              data={captureLogs}
              rowHoverEffect={true}
              containerClassName="bg-transparent border-0"
            />
          )}
        </div>
      )}
    </div>
  );
}
