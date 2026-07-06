import { useState, useRef, DragEvent } from 'react';
import { Upload, X, File, Image as ImageIcon, FileText, Film, Check, AlertCircle } from 'lucide-react';
import { 
  uploadFile, 
  validateFileType, 
  validateFileSize, 
  formatFileSize,
  type FileUploadOptions 
} from '../lib/services/fileService';
import { toast } from 'sonner@2.0.3';

interface FileUploaderProps {
  relatedToType: 'customer' | 'project' | 'invoice' | 'payment';
  relatedToId: string;
  bucket?: string;
  path?: string;
  allowedTypes?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  onUploadComplete?: (files: any[]) => void;
  onClose?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  result?: any;
}

export default function FileUploader({
  relatedToType,
  relatedToId,
  bucket = 'attachments',
  path,
  allowedTypes = ['image/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSizeMB = 50,
  maxFiles = 10,
  onUploadComplete,
  onClose,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    // Check max files
    if (files.length + newFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    const validFiles: UploadingFile[] = [];
    
    for (const file of newFiles) {
      // Check file type
      if (!validateFileType(file, allowedTypes)) {
        toast.error(`${file.name}: Invalid file type`);
        continue;
      }

      // Check file size
      if (!validateFileSize(file, maxSizeMB)) {
        toast.error(`${file.name}: File too large (max ${maxSizeMB}MB)`);
        continue;
      }

      validFiles.push({
        file,
        progress: 0,
        status: 'uploading',
      });
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    setUploading(true);
    const uploadedFiles: any[] = [];

    try {
      // Upload files sequentially to show progress
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        
        if (fileItem.status !== 'uploading') {
          continue; // Skip already processed files
        }

        try {
          // Update progress
          setFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = { ...newFiles[i], progress: 50 };
            return newFiles;
          });

          // Upload file
          const result = await uploadFile({
            file: fileItem.file,
            bucket,
            path,
            relatedToType,
            relatedToId,
          });

          // Update success
          setFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = { 
              ...newFiles[i], 
              progress: 100, 
              status: 'success',
              result 
            };
            return newFiles;
          });

          uploadedFiles.push(result);
          toast.success(`${fileItem.file.name} uploaded successfully`);
        } catch (error: any) {
          // Update error
          setFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = { 
              ...newFiles[i], 
              status: 'error',
              error: error.message || 'Upload failed'
            };
            return newFiles;
          });
          toast.error(`Failed to upload ${fileItem.file.name}`);
        }
      }

      // Notify parent
      if (uploadedFiles.length > 0 && onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }

      // Close if all successful
      const allSuccessful = files.every(f => f.status === 'success');
      if (allSuccessful && onClose) {
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-6 h-6" />;
    if (file.type.startsWith('video/')) return <Film className="w-6 h-6" />;
    if (file.type === 'application/pdf') return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const hasSuccessfulUploads = files.some(f => f.status === 'success');
  const hasErrors = files.some(f => f.status === 'error');

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-orange-500 bg-orange-500/10' 
            : 'border-[#2A2A2A] hover:border-orange-500/50 bg-[#1A1A1A]'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
            ${isDragging ? 'bg-orange-500 text-white' : 'bg-[#2A2A2A] text-orange-400'}
          `}>
            <Upload className="w-8 h-8" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {isDragging ? 'Drop files here' : 'Upload Files'}
            </h3>
            <p className="text-gray-400 text-sm">
              Drag & drop files or click to browse
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Max {maxSizeMB}MB per file • Up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Files ({files.length}/{maxFiles})
          </h4>
          
          <div className="space-y-2">
            {files.map((fileItem, index) => (
              <div
                key={index}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${fileItem.status === 'success' 
                      ? 'bg-green-500/10 text-green-400' 
                      : fileItem.status === 'error'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-orange-500/10 text-orange-400'
                    }
                  `}>
                    {fileItem.status === 'success' ? (
                      <Check className="w-5 h-5" />
                    ) : fileItem.status === 'error' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      getFileIcon(fileItem.file)
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-white truncate">
                        {fileItem.file.name}
                      </p>
                      {fileItem.status === 'uploading' && !uploading && (
                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-400 transition flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {formatFileSize(fileItem.file.size)}
                    </p>

                    {/* Progress Bar */}
                    {fileItem.status === 'uploading' && uploading && (
                      <div className="mt-2">
                        <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 transition-all duration-300"
                            style={{ width: `${fileItem.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Success Message */}
                    {fileItem.status === 'success' && (
                      <p className="text-xs text-green-400 mt-1">
                        Upload complete
                      </p>
                    )}

                    {/* Error Message */}
                    {fileItem.status === 'error' && (
                      <p className="text-xs text-red-400 mt-1">
                        {fileItem.error || 'Upload failed'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#2A2A2A]">
          <div className="text-sm text-gray-400">
            {hasSuccessfulUploads && (
              <span className="text-green-400">
                {files.filter(f => f.status === 'success').length} uploaded
              </span>
            )}
            {hasErrors && (
              <span className="text-red-400 ml-3">
                {files.filter(f => f.status === 'error').length} failed
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-6 py-3 rounded-xl border border-[#2A2A2A] text-gray-400 hover:border-orange-500/30 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {hasSuccessfulUploads ? 'Done' : 'Cancel'}
              </button>
            )}
            
            {!hasSuccessfulUploads && (
              <button
                onClick={uploadFiles}
                disabled={uploading || files.length === 0}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {uploading ? 'Uploading...' : `Upload ${files.length} ${files.length === 1 ? 'File' : 'Files'}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
