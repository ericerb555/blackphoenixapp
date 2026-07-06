/**
 * Blueprint Export History Viewer
 * Shows list of all blueprint exports for a project
 */

import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Package, ExternalLink, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId as supabaseProjectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-57095a78`;

interface BlueprintExport {
  exportId: string;
  projectId: string;
  projectName: string;
  quoteId?: string;
  sheetSize: string;
  scale: string;
  format: string;
  layers: {
    architectural: boolean;
    plumbing: boolean;
    electrical: boolean;
  };
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

interface Props {
  projectId: string;
  onClose?: () => void;
}

export default function BlueprintExportHistory({ projectId, onClose }: Props) {
  const [exports, setExports] = useState<BlueprintExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/blueprints/project/${projectId}/exports`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch exports: ${response.status}`);
      }

      const data = await response.json();
      setExports(data.exports || []);
    } catch (err) {
      console.error('Error fetching exports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exports');
      toast.error('Failed to load export history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (exportId: string) => {
    if (!confirm('Are you sure you want to delete this export?')) return;

    try {
      const response = await fetch(`${API_BASE}/blueprints/export/${exportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete export');
      }

      toast.success('Export deleted successfully');
      // Refresh the list
      fetchExports();
    } catch (err) {
      console.error('Error deleting export:', err);
      toast.error('Failed to delete export');
    }
  };

  const handleDownload = (downloadUrl: string, fileName: string) => {
    window.open(downloadUrl, '_blank');
    toast.info(`Opening ${fileName}...`);
  };

  useEffect(() => {
    fetchExports();
  }, [projectId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xl">
      <div className="w-full max-w-5xl max-h-[90vh] border border-white/14 rounded-3xl bg-gradient-to-br from-[#0f131b]/95 to-[#090c12]/90 shadow-[0_28px_120px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-wide">Blueprint Export History</h2>
            <p className="text-sm text-gray-400 mt-1">Project ID: {projectId}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchExports}
              className="p-2 rounded-xl border border-white/10 bg-[#0f131b]/55 hover:bg-[#0f131b]/75 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-white/10 bg-[#0f131b]/55 hover:bg-[#0f131b]/75 transition-all text-sm font-semibold"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#6cf0ff]" />
              <span className="ml-3 text-gray-400">Loading exports...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-400 mb-2">⚠️ {error}</div>
                <button
                  onClick={fetchExports}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-[#0f131b]/55 hover:bg-[#0f131b]/75 transition-all text-sm font-semibold"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : exports.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No exports yet</p>
                <p className="text-sm mt-1">Create your first blueprint export to see it here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {exports.map((exp) => (
                <div
                  key={exp.exportId}
                  className="p-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/2 hover:border-[#6cf0ff]/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-[#6cf0ff]" />
                        <div>
                          <h3 className="font-bold text-white">{exp.projectName}</h3>
                          <p className="text-xs text-gray-400 font-mono">{exp.exportId}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="p-2 rounded-lg bg-[#0a0c12]/55">
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Sheet</div>
                          <div className="text-sm font-mono text-white">{exp.sheetSize}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#0a0c12]/55">
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Scale</div>
                          <div className="text-sm font-mono text-white">{exp.scale}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#0a0c12]/55">
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Format</div>
                          <div className="text-sm font-mono text-white uppercase">{exp.format}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#0a0c12]/55">
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Size</div>
                          <div className="text-sm font-mono text-white">{formatFileSize(exp.fileSize)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Created {formatDate(exp.createdAt)}</span>
                        {exp.completedAt && (
                          <span className="ml-2">• Completed {formatDate(exp.completedAt)}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {exp.layers.architectural && (
                          <span className="px-2 py-1 rounded-full text-xs bg-[#6cf0ff]/20 text-[#6cf0ff] border border-[#6cf0ff]/30">
                            Architectural
                          </span>
                        )}
                        {exp.layers.plumbing && (
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-400/20 text-blue-400 border border-blue-400/30">
                            Plumbing
                          </span>
                        )}
                        {exp.layers.electrical && (
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                            Electrical
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleDownload(exp.downloadUrl, exp.fileName)}
                        className="px-3 py-2 rounded-xl border border-[#6cf0ff]/35 bg-gradient-to-b from-[#6cf0ff]/18 to-[#0f131b]/68 hover:border-[#6cf0ff]/55 transition-all text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(exp.exportId)}
                        className="px-3 py-2 rounded-xl border border-red-400/35 bg-gradient-to-b from-red-400/10 to-[#0f131b]/68 hover:border-red-400/55 transition-all text-sm font-semibold flex items-center gap-2 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {!loading && !error && exports.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Total Exports: {exports.length}</span>
              <span>
                Total Size: {formatFileSize(exports.reduce((sum, exp) => sum + exp.fileSize, 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}