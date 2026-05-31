/**
 * Design Project Manager - Professional project management for CAD/Design
 * Handles save, load, permissions, and collaboration
 */

import { useState, useEffect } from 'react';
import {
  Save, FolderOpen, Users, Lock, Unlock, Eye, Edit2, Trash2,
  Plus, Share2, Download, Upload, Clock, CheckCircle, AlertCircle,
  X, Copy, Settings, FileText, Image, Grid, Layers
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useCompany } from '../../contexts/CompanyContext';
import DesignProjectManager from '../../lib/services/designProjectManager';
import { ConfirmModal } from '../ui/modal';

interface Project {
  id: string;
  project_name: string;
  project_type: string;
  status: string;
  version: number;
  updated_at: string;
  thumbnail_url?: string;
  permission?: string;
}

interface DesignProjectManagerProps {
  currentProject?: any;
  onProjectLoad: (project: any) => void;
  onProjectSave: (project: any) => void;
  designData: any;
  projectType: string;
}

export default function DesignProjectManagerComponent({
  currentProject,
  onProjectLoad,
  onProjectSave,
  designData,
  projectType
}: DesignProjectManagerProps) {
  const companyContext = useCompany();
  const activeCompany = companyContext?.activeCompany || null;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [squareFootage, setSquareFootage] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  // Load projects
  useEffect(() => {
    if (activeCompany && showProjectsModal) {
      loadProjects();
    }
  }, [activeCompany, showProjectsModal]);
  
  // Auto-save every 30 seconds
  useEffect(() => {
    if (!currentProject || !autoSaveEnabled) return;
    
    const interval = setInterval(() => {
      handleAutoSave();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [currentProject, autoSaveEnabled, designData]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const result = await DesignProjectManager.getProjects(activeCompany?.id || '', {
        project_type: projectType
      });
      
      if (result.success && result.data) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = async () => {
    if (!projectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    
    setSaving(true);
    try {
      const result = await DesignProjectManager.createProject({
        company_id: activeCompany?.id || '',
        owner_id: '', // Will be set by service
        project_name: projectName,
        project_type: projectType as any,
        client_name: clientName || undefined,
        address: address || undefined,
        square_footage: squareFootage ? parseFloat(squareFootage) : undefined,
        status: 'draft',
        version: 1,
        design_data: designData,
        drawing_settings: {
          line_weight: 'medium',
          dimension_style: 'architectural',
          text_style: 'standard',
          symbol_library: 'default',
          layer_standards: 'aia'
        },
        permissions: {
          viewers: [],
          editors: [],
          allow_comments: true
        },
        export_formats: ['pdf', 'png'],
        tags: [],
        notes: ''
      });
      
      if (result.success && result.data) {
        toast.success('Project created successfully!');
        onProjectLoad(result.data);
        setShowNewProjectModal(false);
        setProjectName('');
        setClientName('');
        setAddress('');
        setSquareFootage('');
      } else {
        toast.error(result.error || 'Failed to create project');
      }
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProject = async () => {
    if (!currentProject) {
      toast.error('No project loaded');
      return;
    }
    
    setSaving(true);
    try {
      const result = await DesignProjectManager.saveDesignData(
        currentProject.id,
        designData,
        true // Increment version
      );
      
      if (result.success) {
        setLastSaved(new Date());
        toast.success('Project saved successfully!');
        onProjectSave(currentProject);
      } else {
        toast.error(result.error || 'Failed to save project');
      }
    } catch (error) {
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSave = async () => {
    if (!currentProject || saving) return;
    
    try {
      const result = await DesignProjectManager.saveDesignData(
        currentProject.id,
        designData,
        false // Don't increment version for auto-save
      );
      
      if (result.success) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleLoadProject = async (project: Project) => {
    try {
      const result = await DesignProjectManager.getProject(project.id);
      
      if (result.success && result.data) {
        onProjectLoad(result.data);
        setShowProjectsModal(false);
        toast.success(`Project loaded: ${project.project_name}`);
      } else {
        toast.error(result.error || 'Failed to load project');
      }
    } catch (error) {
      toast.error('Failed to load project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const result = await DesignProjectManager.deleteProject(projectId);
      
      if (result.success) {
        toast.success('Project archived');
        loadProjects();
        setDeleteProjectId(null);
      } else {
        toast.error(result.error || 'Failed to archive project');
      }
    } catch (error) {
      toast.error('Failed to archive project');
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    try {
      const result = await DesignProjectManager.duplicateProject(projectId);
      
      if (result.success && result.data) {
        toast.success('Project duplicated successfully');
        loadProjects();
      } else {
        toast.error(result.error || 'Failed to duplicate project');
      }
    } catch (error) {
      toast.error('Failed to duplicate project');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-400 bg-gray-600/20 border-gray-500/20';
      case 'in-progress': return 'text-blue-400 bg-blue-600/20 border-blue-500/20';
      case 'review': return 'text-yellow-400 bg-yellow-600/20 border-yellow-500/20';
      case 'approved': return 'text-green-400 bg-green-600/20 border-green-500/20';
      case 'completed': return 'text-purple-400 bg-purple-600/20 border-purple-500/20';
      default: return 'text-gray-400 bg-gray-600/20 border-gray-500/20';
    }
  };

  const getPermissionIcon = (permission?: string) => {
    switch (permission) {
      case 'owner': return <Lock className="w-4 h-4 text-orange-400" />;
      case 'editor': return <Edit2 className="w-4 h-4 text-blue-400" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-400" />;
      default: return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <>
      {/* Save Controls */}
      <div className="flex items-center gap-2">
        {/* Auto-save indicator */}
        {currentProject && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            {saving ? (
              <>
                <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-orange-400">Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-gray-400">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-gray-400">Not saved</span>
              </>
            )}
          </div>
        )}
        
        {/* Auto-save toggle */}
        {currentProject && (
          <button
            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            className={`px-3 py-1.5 rounded-lg border transition text-xs font-semibold ${
              autoSaveEnabled
                ? 'bg-green-600/20 border-green-500/20 text-green-400'
                : 'bg-gray-600/20 border-gray-500/20 text-gray-400'
            }`}
            title={autoSaveEnabled ? 'Auto-save enabled' : 'Auto-save disabled'}
          >
            Auto-save {autoSaveEnabled ? 'ON' : 'OFF'}
          </button>
        )}
        
        {/* New Project */}
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
        
        {/* Open Project */}
        <button
          onClick={() => setShowProjectsModal(true)}
          className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white text-xs font-semibold transition flex items-center gap-1"
        >
          <FolderOpen className="w-3 h-3" />
          Open
        </button>
        
        {/* Save Project */}
        {currentProject && (
          <>
            <button
              onClick={handleSaveProject}
              disabled={saving}
              className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/20 rounded-lg text-green-400 text-xs font-semibold transition flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            
            {/* Permissions */}
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-semibold transition flex items-center gap-1"
            >
              <Users className="w-3 h-3" />
              Share
            </button>
          </>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-2xl border-2 border-orange-500/30 w-full max-w-2xl shadow-2xl shadow-orange-500/20">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 border-b border-orange-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Create New Project</h2>
                  <p className="text-white/80 text-sm mt-1">Start a new design project</p>
                </div>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Enter project name..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Client name..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Square Footage
                  </label>
                  <input
                    type="number"
                    value={squareFootage}
                    onChange={(e) => setSquareFootage(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Project address..."
                />
              </div>
            </div>
            
            <div className="border-t border-[#2A2A2A] p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl font-semibold transition border border-[#2A2A2A]"
              >
                Cancel
              </button>
              <button
                onClick={handleNewProject}
                disabled={saving || !projectName.trim()}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Projects Modal */}
      {showProjectsModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-2xl border-2 border-orange-500/30 w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl shadow-orange-500/20">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 border-b border-orange-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">My Projects</h2>
                  <p className="text-white/80 text-sm mt-1">Open an existing design project</p>
                </div>
                <button
                  onClick={() => setShowProjectsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No projects found</p>
                  <p className="text-gray-500 text-sm mt-2">Create a new project to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden hover:border-orange-500/30 transition group"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-[#0F0F0F] flex items-center justify-center relative">
                        {project.thumbnail_url ? (
                          <img 
                            src={project.thumbnail_url} 
                            alt={project.project_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Grid className="w-12 h-12 text-gray-600" />
                        )}
                        <div className="absolute top-2 right-2">
                          {getPermissionIcon(project.permission)}
                        </div>
                      </div>
                      
                      {/* Info */}
                      <div className="p-4">
                        <h3 className="text-white font-semibold mb-2 truncate">{project.project_name}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                          <span className="text-xs text-gray-500">v{project.version}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadProject(project)}
                            className="flex-1 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/20 rounded-lg text-orange-400 text-xs font-semibold transition flex items-center justify-center gap-1"
                          >
                            <FolderOpen className="w-3 h-3" />
                            Open
                          </button>
                          
                          {project.permission === 'owner' && (
                            <>
                              <button
                                onClick={() => handleDuplicateProject(project.id)}
                                className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 rounded-lg text-blue-400 text-xs transition"
                                title="Duplicate"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeleteProjectId(project.id)}
                                className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 rounded-lg text-red-400 text-xs transition"
                                title="Archive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal - Placeholder */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-2xl border-2 border-orange-500/30 w-full max-w-2xl shadow-2xl shadow-orange-500/20">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 border-b border-orange-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Share Project</h2>
                  <p className="text-white/80 text-sm mt-1">Manage project permissions</p>
                </div>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-semibold mb-1">View-Only Mode</p>
                    <p className="text-gray-400 text-sm">
                      Files are saved to project owner's account. Other users have view-only access unless explicitly granted editor permissions.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Permission management system will be implemented here with:</p>
                <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
                  <li>Grant viewer access</li>
                  <li>Grant editor access</li>
                  <li>Revoke permissions</li>
                  <li>Generate public view-only link</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-[#2A2A2A] p-6 flex items-center justify-end">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
