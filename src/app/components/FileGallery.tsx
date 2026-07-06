import { useState, useEffect } from 'react';
import { 
  File, Image as ImageIcon, FileText, Film, Download, Trash2, 
  ExternalLink, X, ZoomIn, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { 
  getFilesByEntity, 
  deleteFile, 
  downloadFile, 
  formatFileSize,
  type FileAttachment 
} from '../lib/services/fileService';
import { toast } from 'sonner@2.0.3';

interface FileGalleryProps {
  relatedToType: 'customer' | 'project' | 'invoice' | 'payment';
  relatedToId: string;
  onFilesChange?: () => void;
}

export default function FileGallery({ relatedToType, relatedToId, onFilesChange }: FileGalleryProps) {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxFile, setLightboxFile] = useState<FileAttachment | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    loadFiles();
  }, [relatedToType, relatedToId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await getFilesByEntity(relatedToType, relatedToId);
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;

    try {
      await deleteFile(fileId);
      toast.success('File deleted');
      loadFiles();
      if (onFilesChange) onFilesChange();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleDownload = async (file: FileAttachment) => {
    try {
      await downloadFile(file.storage_bucket, file.file_path, file.file_name);
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-6 h-6" />;
    if (fileType.startsWith('video/')) return <Film className="w-6 h-6" />;
    if (fileType === 'application/pdf') return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const isImage = (fileType: string) => fileType.startsWith('image/');
  const isVideo = (fileType: string) => fileType.startsWith('video/');

  const openLightbox = (file: FileAttachment, index: number) => {
    if (isImage(file.file_type) || isVideo(file.file_type)) {
      setLightboxFile(file);
      setLightboxIndex(index);
    }
  };

  const closeLightbox = () => {
    setLightboxFile(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const imageFiles = files.filter(f => isImage(f.file_type) || isVideo(f.file_type));
    const currentIndex = imageFiles.findIndex(f => f.id === lightboxFile?.id);
    
    if (direction === 'prev' && currentIndex > 0) {
      setLightboxFile(imageFiles[currentIndex - 1]);
      setLightboxIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < imageFiles.length - 1) {
      setLightboxFile(imageFiles[currentIndex + 1]);
      setLightboxIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading files...</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-12 text-center">
        <div className="w-16 h-16 bg-[#2A2A2A] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <File className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-gray-400">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file, index) => (
          <div
            key={file.id}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-orange-500/30 transition group"
          >
            {/* Preview */}
            {isImage(file.file_type) && file.signed_url ? (
              <div 
                className="aspect-video bg-[#0A0A0A] relative cursor-pointer"
                onClick={() => openLightbox(file, index)}
              >
                <img
                  src={file.signed_url}
                  alt={file.file_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
              </div>
            ) : isVideo(file.file_type) && file.signed_url ? (
              <div 
                className="aspect-video bg-[#0A0A0A] relative cursor-pointer"
                onClick={() => openLightbox(file, index)}
              >
                <video
                  src={file.signed_url}
                  className="w-full h-full object-cover"
                  muted
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Film className="w-8 h-8 text-white" />
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-[#0A0A0A] flex items-center justify-center">
                <div className="text-gray-600">
                  {getFileIcon(file.file_type)}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-medium text-white truncate flex-1">
                  {file.file_name}
                </h4>
              </div>
              
              <p className="text-xs text-gray-500 mb-3">
                {formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString()}
              </p>

              {file.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {file.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(file)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#2A2A2A] hover:bg-orange-500/10 text-gray-300 hover:text-orange-400 rounded-lg transition text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                
                {file.signed_url && (
                  <a
                    href={file.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-[#2A2A2A] hover:bg-blue-500/10 text-gray-300 hover:text-blue-400 rounded-lg transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                
                <button
                  onClick={() => handleDelete(file.id, file.file_name)}
                  className="px-3 py-2 bg-[#2A2A2A] hover:bg-red-500/10 text-gray-300 hover:text-red-400 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxFile && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation */}
          {lightboxIndex > 0 && (
            <button
              onClick={() => navigateLightbox('prev')}
              className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
          
          {lightboxIndex < files.filter(f => isImage(f.file_type) || isVideo(f.file_type)).length - 1 && (
            <button
              onClick={() => navigateLightbox('next')}
              className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Content */}
          <div className="max-w-6xl max-h-full w-full">
            {isImage(lightboxFile.file_type) && lightboxFile.signed_url ? (
              <img
                src={lightboxFile.signed_url}
                alt={lightboxFile.file_name}
                className="max-w-full max-h-[90vh] mx-auto rounded-xl"
              />
            ) : isVideo(lightboxFile.file_type) && lightboxFile.signed_url ? (
              <video
                src={lightboxFile.signed_url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] mx-auto rounded-xl"
              />
            ) : null}

            {/* Info Bar */}
            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white font-medium">{lightboxFile.file_name}</p>
              <p className="text-gray-300 text-sm mt-1">
                {formatFileSize(lightboxFile.file_size)} • {new Date(lightboxFile.uploaded_at).toLocaleDateString()}
              </p>
              {lightboxFile.description && (
                <p className="text-gray-400 text-sm mt-2">{lightboxFile.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
