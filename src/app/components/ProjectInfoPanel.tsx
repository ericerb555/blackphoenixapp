// Project Info Panel - Display Current Project Details
import { useState, useEffect } from 'react';
import { 
  FileText, 
  User, 
  DollarSign, 
  Calendar, 
  Image, 
  Video, 
  FileEdit, 
  ClipboardList,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  Eye,
  MessageSquare
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ProjectInfo {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  projectType: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  description?: string;
  photos: ProjectMedia[];
  videos: ProjectMedia[];
  notes: ProjectNote[];
  workRequest?: WorkRequest;
}

interface ProjectMedia {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
  type: 'photo' | 'video';
}

interface ProjectNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

interface WorkRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  submittedAt: string;
  dueDate?: string;
}

interface ProjectInfoPanelProps {
  quoteId: string | null;
  onClose?: () => void;
}

export default function ProjectInfoPanel({ quoteId, onClose }: ProjectInfoPanelProps) {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    details: true,
    media: true,
    notes: true,
    workRequest: true
  });

  useEffect(() => {
    if (quoteId) {
      fetchProjectInfo();
    }
  }, [quoteId]);

  const fetchProjectInfo = async () => {
    if (!quoteId) return;

    try {
      setLoading(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/studio/project-info/${quoteId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProjectInfo(data);
      }
    } catch (error) {
      console.error('Error fetching project info:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!quoteId) {
    return (
      <div className="p-6 text-center">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No project selected</p>
        <p className="text-xs text-gray-500 mt-1">Open a project to view details</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!projectInfo) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-400">Failed to load project info</p>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
    approved: 'bg-green-500/20 text-green-400 border-green-500',
    rejected: 'bg-red-500/20 text-red-400 border-red-500'
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A2A] bg-[#0A0A0A] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Current Project</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#2A2A2A] rounded transition-colors text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-xs text-[#ea580c] font-medium">{projectInfo.quoteNumber}</p>
      </div>

      {/* Project Details Section */}
      <div className="border-b border-[#2A2A2A]">
        <button
          onClick={() => toggleSection('details')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-semibold text-white">Project Details</span>
          </div>
          {expandedSections.details ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {expandedSections.details && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400">Customer</label>
              <p className="text-sm text-white font-medium flex items-center gap-2">
                <User className="w-3 h-3" />
                {projectInfo.customerName}
              </p>
              {projectInfo.customerEmail && (
                <p className="text-xs text-gray-500">{projectInfo.customerEmail}</p>
              )}
              {projectInfo.customerPhone && (
                <p className="text-xs text-gray-500">{projectInfo.customerPhone}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400">Project Type</label>
              <p className="text-sm text-white">{projectInfo.projectType || 'General'}</p>
            </div>

            <div>
              <label className="text-xs text-gray-400">Status</label>
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${statusColors[projectInfo.status as keyof typeof statusColors] || statusColors.draft}`}>
                {projectInfo.status}
              </span>
            </div>

            <div>
              <label className="text-xs text-gray-400">Amount</label>
              <p className="text-sm text-white font-semibold flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {projectInfo.totalAmount.toLocaleString()}
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-400">Created</label>
              <p className="text-sm text-white flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {new Date(projectInfo.createdAt).toLocaleDateString()}
              </p>
            </div>

            {projectInfo.description && (
              <div>
                <label className="text-xs text-gray-400">Description</label>
                <p className="text-xs text-gray-300 mt-1">{projectInfo.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photos & Videos Section */}
      <div className="border-b border-[#2A2A2A]">
        <button
          onClick={() => toggleSection('media')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-semibold text-white">Photos & Videos</span>
            <span className="text-xs text-gray-500">
              ({projectInfo.photos.length + projectInfo.videos.length})
            </span>
          </div>
          {expandedSections.media ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.media && (
          <div className="px-4 pb-4 space-y-3">
            {/* Photos */}
            {projectInfo.photos.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  Photos ({projectInfo.photos.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {projectInfo.photos.map((photo) => (
                    <MediaItem key={photo.id} media={photo} />
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {projectInfo.videos.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  Videos ({projectInfo.videos.length})
                </p>
                <div className="space-y-2">
                  {projectInfo.videos.map((video) => (
                    <MediaItem key={video.id} media={video} />
                  ))}
                </div>
              </div>
            )}

            {projectInfo.photos.length === 0 && projectInfo.videos.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No media uploaded</p>
            )}
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="border-b border-[#2A2A2A]">
        <button
          onClick={() => toggleSection('notes')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-semibold text-white">Notes</span>
            <span className="text-xs text-gray-500">({projectInfo.notes.length})</span>
          </div>
          {expandedSections.notes ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.notes && (
          <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
            {projectInfo.notes.length > 0 ? (
              projectInfo.notes.map((note) => (
                <div key={note.id} className="p-3 bg-[#2A2A2A] rounded-lg">
                  <p className="text-xs text-white mb-1">{note.content}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{note.createdBy}</span>
                    <span>•</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No notes available</p>
            )}
          </div>
        )}
      </div>

      {/* Work Request Section */}
      {projectInfo.workRequest && (
        <div className="border-b border-[#2A2A2A]">
          <button
            onClick={() => toggleSection('workRequest')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#ea580c]" />
              <span className="text-sm font-semibold text-white">Work Request</span>
            </div>
            {expandedSections.workRequest ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSections.workRequest && (
            <div className="px-4 pb-4 space-y-3">
              <div className="p-3 bg-[#2A2A2A] rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">{projectInfo.workRequest.title}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    projectInfo.workRequest.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    projectInfo.workRequest.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {projectInfo.workRequest.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-gray-300 mb-3">{projectInfo.workRequest.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Priority:</span>
                    <span className={`ml-1 font-medium ${
                      projectInfo.workRequest.priority === 'high' ? 'text-red-400' :
                      projectInfo.workRequest.priority === 'medium' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {projectInfo.workRequest.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Submitted:</span>
                    <span className="text-white ml-1">
                      {new Date(projectInfo.workRequest.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {projectInfo.workRequest.dueDate && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Due:</span>
                      <span className="text-white ml-1">
                        {new Date(projectInfo.workRequest.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <button className="w-full mt-3 px-3 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors text-xs font-medium flex items-center justify-center gap-2">
                  <ExternalLink className="w-3 h-3" />
                  View Full Request
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MediaItem({ media }: { media: ProjectMedia }) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div className="relative group">
        {media.type === 'photo' ? (
          <div className="aspect-square bg-[#3A3A3A] rounded-lg overflow-hidden">
            <img 
              src={media.url} 
              alt={media.filename}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => setShowPreview(true)}
                className="p-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors"
              >
                <Eye className="w-3 h-3" />
              </button>
              <a
                href={media.url}
                download={media.filename}
                className="p-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
              >
                <Download className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#3A3A3A] rounded-lg hover:bg-[#4A4A4A] transition-colors">
            <Video className="w-4 h-4 text-purple-400 mb-1" />
            <p className="text-xs text-white truncate">{media.filename}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowPreview(true)}
                className="flex-1 px-2 py-1 bg-[#ea580c] text-white rounded text-xs hover:bg-[#dc2626] transition-colors"
              >
                View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {media.type === 'photo' ? (
              <img src={media.url} alt={media.filename} className="w-full rounded-lg" />
            ) : (
              <video src={media.url} controls className="w-full rounded-lg" />
            )}
          </div>
          <button
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}