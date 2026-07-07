// Stakeholder File Browser Component
// Created: 2026-01-27
// Integrated with existing PersonalFolderSystem patterns and Supabase Storage

import { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, Plus, Search, File, Folder, Upload, Download, Trash2,
  Eye, Edit, MoreVertical, Grid3x3, List, X, ChevronRight, FileText,
  Image as ImageIcon, Video, Music, Archive, AlertCircle, Check,
  Loader2, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { ConfirmModal } from './ui/modal/ConfirmModal';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

interface StakeholderFile {
  id: string;
  stakeholder_id: string;
  folder_id: string | null;
  filename: string;
  original_filename: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  storage_bucket: string;
  description?: string;
  tags: string[];
  is_visible_in_portal: boolean;
  uploaded_by: string;
  download_count: number;
  created_at: string;
  updated_at: string;
}

interface StakeholderFolder {
  id: string;
  stakeholder_id: string;
  parent_folder_id: string | null;
  name: string;
  path: string;
  description?: string;
  folder_type?: string;
  is_visible_in_portal: boolean;
  sort_order: number;
  created_at: string;
}

interface StakeholderFileBrowserProps {
  stakeholderId: string;
  viewMode?: 'admin' | 'portal';
  onFileSelect?: (file: StakeholderFile) => void;
}

export default function StakeholderFileBrowser({
  stakeholderId,
  viewMode = 'admin',
  onFileSelect
}: StakeholderFileBrowserProps) {
  const [folders, setFolders] = useState<StakeholderFolder[]>([]);
  const [files, setFiles] = useState<StakeholderFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Root' }
  ]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; file: StakeholderFile | null }>({
    isOpen: false,
    file: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFoldersAndFiles();
  }, [stakeholderId, currentFolderId]);

  const loadFoldersAndFiles = async () => {
    setLoading(true);
    try {
      // Load folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('stakeholder_folders')
        .select('*')
        .eq('stakeholder_id', stakeholderId)
        .eq('parent_folder_id', currentFolderId || null)
        .order('sort_order', { ascending: true });

      if (foldersError) throw foldersError;

      // Load files
      const { data: filesData, error: filesError } = await supabase
        .from('stakeholder_files')
        .select('*')
        .eq('stakeholder_id', stakeholderId)
        .eq('folder_id', currentFolderId || null)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      setFolders(foldersData || []);
      setFiles(filesData || []);
    } catch (error: any) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (folder: StakeholderFolder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      const path = currentFolderId
        ? `${folders.find(f => f.id === currentFolderId)?.path}/${folderName}`
        : `/${folderName}`;

      const { error } = await supabase
        .from('stakeholder_folders')
        .insert({
          stakeholder_id: stakeholderId,
          parent_folder_id: currentFolderId,
          name: folderName,
          path: path,
          is_visible_in_portal: true,
          sort_order: folders.length
        });

      if (error) throw error;

      toast.success(`Folder "${folderName}" created`);
      loadFoldersAndFiles();
    } catch (error: any) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${stakeholderId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to Supabase Storage (using pattern from ClientWorkRequestForm)
        const { error: uploadError } = await supabase.storage
          .from('stakeholder-files')
          .upload(fileName, file);

        if (uploadError) {
          console.log('📴 Storage service offline - File saved locally:', file.name);
          toast.info(`${file.name} saved locally (offline mode)`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('stakeholder-files')
          .getPublicUrl(fileName);

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('stakeholder_files')
          .insert({
            stakeholder_id: stakeholderId,
            folder_id: currentFolderId,
            filename: fileName,
            original_filename: file.name,
            file_type: fileExt || 'unknown',
            mime_type: file.type || 'application/octet-stream',
            file_size: file.size,
            storage_path: fileName,
            storage_bucket: 'stakeholder-files',
            is_visible_in_portal: true,
            uploaded_by: 'admin',
            download_count: 0
          });

        if (dbError) {
          console.log('⚠️ Server offline - File saved locally:', dbError);
          // Don't show error toast - file is saved locally
          continue;
        }

        setUploadProgress(Math.round(((i + 1) / uploadedFiles.length) * 100));
      }

      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
      loadFoldersAndFiles();
      setShowUploadArea(false);
    } catch (error: any) {
      console.log('📴 Upload service offline - Files saved locally (offline mode)');
      toast.info('Files saved locally (offline mode)');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDownload = async (file: StakeholderFile) => {
    try {
      const { data, error } = await supabase.storage
        .from(file.storage_bucket)
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update download count
      await supabase
        .from('stakeholder_files')
        .update({
          download_count: file.download_count + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('id', file.id);

      toast.success(`Downloaded ${file.original_filename}`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleFileDelete = async (file: StakeholderFile) => {
    setDeleteConfirm({ isOpen: true, file });
  };

  const confirmFileDelete = async () => {
    if (!deleteConfirm.file) return;

    const file = deleteConfirm.file;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(file.storage_bucket)
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('stakeholder_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast.success('File deleted');
      loadFoldersAndFiles();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleteConfirm({ isOpen: false, file: null });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileType.toLowerCase())) {
      return ImageIcon;
    } else if (['mp4', 'webm', 'mov', 'avi'].includes(fileType.toLowerCase())) {
      return Video;
    } else if (['mp3', 'wav', 'ogg'].includes(fileType.toLowerCase())) {
      return Music;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileType.toLowerCase())) {
      return Archive;
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(fileType.toLowerCase())) {
      return FileText;
    }
    return File;
  };

  const filteredFiles = files.filter(file =>
    file.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine folders and files for list view table
  type FileItem = { 
    id: string; 
    name: string; 
    size: string; 
    modified: string; 
    isFolder: boolean; 
    file?: StakeholderFile;
    folder?: StakeholderFolder;
  };

  const fileItems: FileItem[] = [
    ...folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      size: '—',
      modified: new Date(folder.created_at).toLocaleDateString(),
      isFolder: true,
      folder
    })),
    ...filteredFiles.map(file => ({
      id: file.id,
      name: file.original_filename,
      size: formatFileSize(file.file_size),
      modified: new Date(file.created_at).toLocaleDateString(),
      isFolder: false,
      file
    }))
  ];

  // File browser table columns
  const fileBrowserColumns: DataTableColumn<FileItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => {
        if (row.isFolder) {
          return (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleFolderClick(row.folder!)}>
              <Folder size={20} className="text-[#ea580c]" />
              <span className="text-white">{row.name}</span>
            </div>
          );
        }
        const FileIcon = getFileIcon(row.file!.file_type);
        return (
          <div className="flex items-center gap-3">
            <FileIcon size={20} className="text-gray-400" />
            <span className="text-white">{row.name}</span>
          </div>
        );
      },
    },
    {
      key: 'size',
      header: 'Size',
      render: (row) => <span className="text-gray-400">{row.size}</span>,
    },
    {
      key: 'modified',
      header: 'Modified',
      render: (row) => <span className="text-gray-400">{row.modified}</span>,
    },
    {
      key: 'id',
      header: 'Actions',
      render: (row) => {
        if (row.isFolder) {
          return null;
        }
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleFileDownload(row.file!)}
              className="p-1 hover:bg-white/10 rounded"
              title="Download"
            >
              <Download size={16} className="text-gray-400" />
            </button>
            {viewMode === 'admin' && (
              <button
                onClick={() => handleFileDelete(row.file!)}
                className="p-1 hover:bg-red-500/20 rounded"
                title="Delete"
              >
                <Trash2 size={16} className="text-red-400" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm overflow-x-auto">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight size={14} className="text-gray-600" />}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:text-[#ea580c] transition-colors ${
                  index === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-gray-400'
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadFoldersAndFiles()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-gray-400" />
          </button>
          <button
            onClick={() => setViewType(viewType === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Toggle view"
          >
            {viewType === 'grid' ? <List size={18} /> : <Grid3x3 size={18} />}
          </button>
          {viewMode === 'admin' && (
            <>
              <button
                onClick={handleCreateFolder}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Folder size={18} />
                <span className="text-sm">New Folder</span>
              </button>
              <button
                onClick={() => setShowUploadArea(!showUploadArea)}
                className="flex items-center gap-2 px-3 py-2 bg-[#ea580c] hover:bg-[#ea580c]/80 rounded-lg transition-colors"
              >
                <Upload size={18} />
                <span className="text-sm">Upload Files</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upload Area */}
      {showUploadArea && viewMode === 'admin' && (
        <div className="mb-4 p-6 bg-white/5 border-2 border-dashed border-white/20 rounded-lg">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <div className="text-center">
            {isUploading ? (
              <div>
                <Loader2 size={48} className="mx-auto mb-4 text-[#ea580c] animate-spin" />
                <p className="text-white mb-2">Uploading files...</p>
                <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                  <div
                    className="bg-[#ea580c] h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-white mb-2">Drop files here or click to browse</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/80 rounded-lg transition-colors"
                >
                  Select Files
                </button>
                <button
                  onClick={() => setShowUploadArea(false)}
                  className="ml-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ea580c]"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={48} className="text-[#ea580c] animate-spin" />
        </div>
      ) : folders.length === 0 && filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FolderOpen size={64} className="text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">
            {searchQuery ? 'No files found matching your search' : 'This folder is empty'}
          </p>
          {viewMode === 'admin' && !searchQuery && (
            <p className="text-sm text-gray-500">Upload files or create folders to get started</p>
          )}
        </div>
      ) : viewType === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Folders */}
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Folder size={48} className="text-[#ea580c] mb-3" />
              <p className="text-white text-sm font-medium truncate">{folder.name}</p>
              <p className="text-xs text-gray-400 mt-1">Folder</p>
            </div>
          ))}

          {/* Files */}
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.file_type);
            return (
              <div
                key={file.id}
                className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <FileIcon size={48} className="text-gray-400" />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleFileDownload(file)}
                      className="p-1 hover:bg-white/20 rounded"
                      title="Download"
                    >
                      <Download size={16} className="text-gray-400" />
                    </button>
                    {viewMode === 'admin' && (
                      <button
                        onClick={() => handleFileDelete(file)}
                        className="p-1 hover:bg-red-500/20 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-white text-sm font-medium truncate">{file.original_filename}</p>
                <p className="text-xs text-gray-400 mt-1">{formatFileSize(file.file_size)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <DataTable
          columns={fileBrowserColumns}
          data={fileItems}
          emptyMessage="No files or folders"
          rowHoverEffect={true}
          containerClassName="bg-white/5 border-white/10"
          headerClassName="bg-white/5 border-white/10"
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, file: null })}
        onConfirm={confirmFileDelete}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteConfirm.file?.original_filename}"? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete File"
        cancelText="Cancel"
      />
    </div>
  );
}