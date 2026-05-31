/**
 * Portfolio Project Manager
 * 
 * Manage which completed work requests appear on the landing page
 * Features:
 * - View all completed work requests with media
 * - Toggle marketing approval
 * - Set featured projects
 * - Reorder portfolio items
 * - Preview media
 */

import { useState, useEffect } from 'react';
import {
  Image as ImageIcon, Video, CheckCircle, XCircle, Star,
  Eye, EyeOff, MapPin, Calendar, User, Tag, Sparkles,
  RefreshCw, Save, Trash2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  getCompletedProjectsWithMedia,
  toggleMarketingApproval,
  setProjectFeatured,
  type WorkRequestMedia
} from '../lib/services/portfolioService';
import { loadDual } from '../lib/database';

export default function PortfolioProjectManager() {
  const [projects, setProjects] = useState<WorkRequestMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<WorkRequestMedia | null>(null);
  const [featuredProjects, setFeaturedProjects] = useState<string[]>([]);

  useEffect(() => {
    loadProjects();
    (async () => {
      await loadFeaturedProjects();
    })();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getCompletedProjectsWithMedia();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedProjects = async () => {
    const featuredProjects = await loadDual('featured_projects');
    if (featuredProjects && Array.isArray(featuredProjects)) {
      setFeaturedProjects(featuredProjects);
    }
  };

  const handleToggleApproval = async (projectId: string, currentStatus: boolean) => {
    try {
      await toggleMarketingApproval(projectId, !currentStatus);
      toast.success(!currentStatus ? 'Project approved for marketing' : 'Marketing approval removed');
      loadProjects();
    } catch (error) {
      toast.error('Failed to update approval status');
    }
  };

  const handleToggleFeatured = async (projectId: string) => {
    try {
      const isFeatured = featuredProjects.includes(projectId);
      await setProjectFeatured(projectId, !isFeatured);
      
      if (isFeatured) {
        setFeaturedProjects(featuredProjects.filter(id => id !== projectId));
        toast.success('Removed from featured projects');
      } else {
        setFeaturedProjects([...featuredProjects, projectId]);
        toast.success('Added to featured projects');
      }
    } catch (error) {
      toast.error('Failed to update featured status');
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Portfolio Project Manager</h2>
          <p className="text-gray-400">
            Manage which completed work requests appear on your landing page
          </p>
        </div>
        <button
          onClick={loadProjects}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Total Projects</p>
          <p className="text-2xl font-bold text-white">{projects.length}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-green-500/30 rounded-xl p-4">
          <p className="text-green-400 text-sm mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-400">
            {projects.filter(p => p.approvedForMarketing !== false).length}
          </p>
        </div>
        <div className="bg-[#1A1A1A] border border-orange-500/30 rounded-xl p-4">
          <p className="text-orange-400 text-sm mb-1">Featured</p>
          <p className="text-2xl font-bold text-orange-400">{featuredProjects.length}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm mb-1">With Video</p>
          <p className="text-2xl font-bold text-blue-400">
            {projects.filter(p => p.videoUrl).length}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-white mb-1">Automatic Portfolio Generation</h4>
            <p className="text-sm text-gray-300">
              Projects marked as "Approved for Marketing" will automatically appear on your landing page
              portfolio section. Featured projects appear first. The system pulls media directly from
              completed work requests.
            </p>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0F0F0F] border-b border-[#2A2A2A]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Project</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Media</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Location</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {projects.map((project) => {
                const isFeatured = featuredProjects.includes(project.workRequestId);
                const isApproved = project.approvedForMarketing !== false;

                return (
                  <tr
                    key={project.id}
                    className="hover:bg-[#0F0F0F] transition"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        {project.photos[0] && (
                          <img
                            src={project.photos[0]}
                            alt={project.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-white mb-1">{project.title}</h4>
                          <p className="text-sm text-gray-400 line-clamp-1">
                            {project.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                              {project.serviceType}
                            </span>
                            {isFeatured && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 text-sm">
                        {project.photos.length > 0 && (
                          <div className="flex items-center gap-1 text-blue-400">
                            <ImageIcon className="w-4 h-4" />
                            <span>{project.photos.length}</span>
                          </div>
                        )}
                        {project.videoUrl && (
                          <div className="flex items-center gap-1 text-purple-400">
                            <Video className="w-4 h-4" />
                            <span>Video</span>
                          </div>
                        )}
                        {(project.beforePhotos?.length || 0) > 0 && (project.afterPhotos?.length || 0) > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                            B&A
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {project.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {project.completedDate && (
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.completedDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {isApproved ? (
                          <span className="flex items-center gap-1 text-sm text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <XCircle className="w-4 h-4" />
                            Not Approved
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleFeatured(project.workRequestId)}
                          className={`p-2 rounded-lg transition ${
                            isFeatured
                              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                              : 'bg-[#0F0F0F] text-gray-400 hover:bg-[#2A2A2A]'
                          }`}
                          title={isFeatured ? 'Remove from featured' : 'Add to featured'}
                        >
                          <Star className={`w-4 h-4 ${isFeatured ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleToggleApproval(project.workRequestId, isApproved)}
                          className={`p-2 rounded-lg transition ${
                            isApproved
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-[#0F0F0F] text-gray-400 hover:bg-[#2A2A2A]'
                          }`}
                          title={isApproved ? 'Remove marketing approval' : 'Approve for marketing'}
                        >
                          {isApproved ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">No completed work requests with media found</p>
            <p className="text-sm text-gray-500">
              Complete work requests with photos or videos will appear here automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
