import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon, Video, Upload, Download, Folder, Grid, List,
  Filter, Search, Calendar, Tag, Star, Trash2, Plus, X, Check,
  FolderPlus, FileVideo, FileImage, BarChart3, Eye, Edit3, Copy,
  Share2, Archive, Clock, User, Camera, Film, Sparkles, ExternalLink,
  ChevronDown, ChevronRight, Layers, ZoomIn, PlayCircle, Maximize2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_BASE_URL } from '../lib/apiConfig';
import { saveDual, loadDual } from '../lib/database';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  name: string;
  url: string;
  thumbnail?: string;
  size: number; // bytes
  duration?: number; // seconds for video
  dimensions: { width: number; height: number };
  uploadedAt: string;
  uploadedBy: string;
  tags: string[];
  folder?: string;
  project?: string;
  client?: string;
  favorite: boolean;
  description?: string;
  metadata?: {
    camera?: string;
    location?: string;
    dateTaken?: string;
  };
}

interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  itemCount: number;
  color: string;
}

interface MediaLibraryManagerProps {
  selectionMode?: boolean;
  onSelectMedia?: (url: string, type: 'image' | 'video') => void;
  filterType?: 'all' | 'image' | 'video';
}

export default function MediaLibraryManager({ 
  selectionMode = false, 
  onSelectMedia,
  filterType: initialFilterType = 'all'
}: MediaLibraryManagerProps = {}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>(initialFilterType);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['root']);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Mock data
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([
    {
      id: 'MEDIA-001',
      type: 'image',
      name: 'Kitchen Renovation - Before.jpg',
      url: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=400',
      size: 2400000,
      dimensions: { width: 1920, height: 1080 },
      uploadedAt: '2026-01-20T10:00:00Z',
      uploadedBy: 'John Smith',
      tags: ['kitchen', 'before', 'renovation'],
      folder: 'FOLDER-001',
      project: 'Kitchen Remodel #445',
      client: 'Johnson Family',
      favorite: true,
      description: 'Before photo of kitchen renovation project',
      metadata: {
        camera: 'iPhone 15 Pro',
        location: '123 Main St, Boston MA',
        dateTaken: '2026-01-15'
      }
    },
    {
      id: 'MEDIA-002',
      type: 'image',
      name: 'Kitchen Renovation - After.jpg',
      url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400',
      size: 2800000,
      dimensions: { width: 1920, height: 1080 },
      uploadedAt: '2026-01-22T14:30:00Z',
      uploadedBy: 'John Smith',
      tags: ['kitchen', 'after', 'renovation', 'completed'],
      folder: 'FOLDER-001',
      project: 'Kitchen Remodel #445',
      client: 'Johnson Family',
      favorite: true,
      description: 'After photo of completed kitchen renovation'
    },
    {
      id: 'MEDIA-003',
      type: 'video',
      name: 'Bathroom Transformation Timelapse.mp4',
      url: 'https://example.com/video1.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400',
      size: 15600000,
      duration: 45,
      dimensions: { width: 1080, height: 1920 },
      uploadedAt: '2026-01-18T09:15:00Z',
      uploadedBy: 'Mike Johnson',
      tags: ['bathroom', 'timelapse', 'transformation', 'reel'],
      folder: 'FOLDER-002',
      project: 'Bathroom Upgrade #337',
      favorite: false,
      description: 'Time-lapse video of bathroom transformation'
    },
    {
      id: 'MEDIA-004',
      type: 'video',
      name: 'HVAC Installation Process.mp4',
      url: 'https://example.com/video2.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400',
      size: 22400000,
      duration: 60,
      dimensions: { width: 1080, height: 1920 },
      uploadedAt: '2026-01-19T11:00:00Z',
      uploadedBy: 'Sarah Davis',
      tags: ['hvac', 'installation', 'process', 'educational'],
      folder: 'FOLDER-003',
      favorite: true,
      description: 'Step-by-step HVAC installation process video'
    },
    {
      id: 'MEDIA-005',
      type: 'image',
      name: 'Customer Testimonial - Smith Family.jpg',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
      size: 1900000,
      dimensions: { width: 1080, height: 1080 },
      uploadedAt: '2026-01-21T16:45:00Z',
      uploadedBy: 'Emily Chen',
      tags: ['testimonial', 'customer', 'happy'],
      folder: 'FOLDER-004',
      favorite: false,
      description: 'Happy customer with completed project'
    }
  ]);

  const [folders, setFolders] = useState<MediaFolder[]>([
    { id: 'FOLDER-001', name: 'Kitchen Projects', itemCount: 24, color: 'bg-orange-600' },
    { id: 'FOLDER-002', name: 'Bathroom Projects', itemCount: 18, color: 'bg-blue-600' },
    { id: 'FOLDER-003', name: 'HVAC Installations', itemCount: 12, color: 'bg-green-600' },
    { id: 'FOLDER-004', name: 'Customer Testimonials', itemCount: 31, color: 'bg-purple-600' },
    { id: 'FOLDER-005', name: 'Before & After', itemCount: 45, color: 'bg-pink-600' },
    { id: 'FOLDER-006', name: 'Team Photos', itemCount: 8, color: 'bg-yellow-600' },
    { id: 'FOLDER-007', name: 'Equipment & Tools', itemCount: 15, color: 'bg-gray-600' }
  ]);

  // Load media items from database on mount
  useEffect(() => {
    (async () => {
      const savedMedia = await loadDual('media_library_items');
      if (savedMedia && Array.isArray(savedMedia) && savedMedia.length > 0) {
        setMediaItems(savedMedia);
        console.log(`✅ Loaded ${savedMedia.length} media items from database`);
      }
    })();
  }, []);

  // Save media items to database whenever they change
  useEffect(() => {
    if (mediaItems.length > 0) {
      (async () => {
        await saveDual('media_library_items', mediaItems);
        console.log(`✅ Saved ${mediaItems.length} media items to database`);
      })();
    }
  }, [mediaItems]);

  const handleSelectItem = (id: string) => {
    // If in selection mode, call the callback immediately and select only this item
    if (selectionMode && onSelectMedia) {
      const item = mediaItems.find(i => i.id === id);
      if (item) {
        onSelectMedia(item.url, item.type);
        return;
      }
    }
    
    // Normal multi-select behavior
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleToggleFavorite = (id: string) => {
    setMediaItems(mediaItems.map(item =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    ));
    const item = mediaItems.find(i => i.id === id);
    if (item) {
      toast.success(item.favorite ? 'Removed from favorites' : 'Added to favorites');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }
    setMediaItems(mediaItems.filter(item => !selectedItems.includes(item.id)));
    toast.success(`Deleted ${selectedItems.length} item(s)`);
    setSelectedItems([]);
  };

  const handleExportSelected = () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }
    const exportData = mediaItems.filter(item => selectedItems.includes(item.id));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media-export-${Date.now()}.json`;
    a.click();
    toast.success(`Exported ${selectedItems.length} item(s)`);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            setMediaItems([...mediaItems, ...imported]);
            toast.success(`Imported ${imported.length} item(s)`);
          } catch (error) {
            toast.error('Failed to import file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size exceeds 100MB limit');
      return;
    }

    // Validate file type
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska', 'video/x-flv'];
    const allTypes = [...imageTypes, ...videoTypes];
    
    if (!allTypes.includes(file.type)) {
      toast.error(`Unsupported file type: ${file.type}`);
      return;
    }

    setUploadingFiles(true);
    setUploadProgress(0);

    console.log('📤 Starting file upload:', {
      name: file.name,
      type: file.type,
      size: file.size,
      folder: selectedFolder
    });

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      if (selectedFolder && selectedFolder !== 'all' && selectedFolder !== 'favorites') {
        formData.append('folder', selectedFolder);
      }
      formData.append('tags', '');
      formData.append('description', '');

      const uploadUrl = `${API_BASE_URL}/make-server-57095a78/media/upload`;
      console.log('📡 Uploading media file...');
      console.log('  - File:', file.name);
      console.log('  - Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for uploads

      // Upload to server
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('📥 Upload response:', response.status);

      if (!response.ok) {
        // Get error details
        let errorMessage = 'Server not available';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Ignore parse errors
        }
        
        // Server not available - store file as base64 data URL for persistence
        console.log('📴 Server offline - storing file locally (offline mode)');

        // Convert file to base64 data URL for database storage
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;

          const mockMedia: MediaItem = {
            id: `MEDIA-LOCAL-${Date.now()}`,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            name: file.name,
            url: dataUrl,
            thumbnail: dataUrl,
            size: file.size,
            dimensions: { width: 1920, height: 1080 },
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Current User',
            tags: ['uploaded', 'offline'],
            folder: selectedFolder !== 'all' && selectedFolder !== 'favorites' ? selectedFolder : undefined,
            favorite: false,
            description: 'Local upload (stored in database)'
          };

          setMediaItems([mockMedia, ...mediaItems]);
          toast.success(`${file.name} saved to database (offline mode)`);
          setShowUploadModal(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const result = await response.json();
      console.log('✅ Upload success:', result);
      
      // Add to media items
      if (result.success && result.media) {
        setMediaItems([result.media, ...mediaItems]);
        toast.success(`Successfully uploaded ${file.name}`);
        setShowUploadModal(false);
      } else {
        throw new Error('Upload failed - invalid response');
      }

    } catch (error: any) {
      // Check if it's a timeout/abort error
      if (error.name === 'AbortError') {
        console.log('⏱️ Upload timeout - Server may be offline. Storing locally.');
      } else {
        console.log('📴 Network error - Storing file locally (offline mode)');
      }

      // Convert file to base64 data URL for database storage
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        const mockMedia: MediaItem = {
          id: `MEDIA-LOCAL-${Date.now()}`,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          name: file.name,
          url: dataUrl,
          thumbnail: dataUrl,
          size: file.size,
          dimensions: { width: 1920, height: 1080 },
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Current User',
          tags: ['uploaded', 'offline'],
          folder: selectedFolder !== 'all' && selectedFolder !== 'favorites' ? selectedFolder : undefined,
          favorite: false,
          description: 'Local upload (stored in database)'
        };

        setMediaItems([mockMedia, ...mediaItems]);
        toast.success(`${file.name} saved to database (offline mode)`);
        setShowUploadModal(false);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingFiles(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter items
  const filteredItems = mediaItems.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFolder = selectedFolder === 'all' || item.folder === selectedFolder;
    return matchesType && matchesSearch && matchesFolder;
  });

  const stats = {
    total: mediaItems.length,
    images: mediaItems.filter(i => i.type === 'image').length,
    videos: mediaItems.filter(i => i.type === 'video').length,
    totalSize: mediaItems.reduce((acc, item) => acc + item.size, 0),
    favorites: mediaItems.filter(i => i.favorite).length
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Layers className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Media Library</h1>
                <p className="text-gray-400">Enterprise content management for social media creation</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-semibold flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Import
              </button>
              <button
                onClick={handleExportSelected}
                disabled={selectedItems.length === 0}
                className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                Export Selected
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-5 h-5" />
                Upload Media
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-gray-400">Total Items</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                  <FileImage className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.images}</p>
                  <p className="text-sm text-gray-400">Images</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                  <FileVideo className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.videos}</p>
                  <p className="text-sm text-gray-400">Videos</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.favorites}</p>
                  <p className="text-sm text-gray-400">Favorites</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-600 to-pink-700 flex items-center justify-center">
                  <Archive className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{formatFileSize(stats.totalSize)}</p>
                  <p className="text-sm text-gray-400">Storage Used</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Folders */}
          <div className="col-span-3">
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Folders</h3>
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <FolderPlus className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolder('all')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                    selectedFolder === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-[#2A2A2A]'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span className="flex-1 text-left text-sm font-semibold">All Media</span>
                  <span className="text-xs">{mediaItems.length}</span>
                </button>

                <button
                  onClick={() => setSelectedFolder('favorites')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                    selectedFolder === 'favorites'
                      ? 'bg-yellow-600 text-white'
                      : 'text-gray-400 hover:bg-[#2A2A2A]'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span className="flex-1 text-left text-sm font-semibold">Favorites</span>
                  <span className="text-xs">{stats.favorites}</span>
                </button>

                <div className="border-t border-[#2A2A2A] my-2"></div>

                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                      selectedFolder === folder.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded ${folder.color}`}></div>
                    <span className="flex-1 text-left text-sm font-semibold truncate">{folder.name}</span>
                    <span className="text-xs">{folder.itemCount}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {/* Toolbar */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, tags..."
                      className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Filter by type */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-4 py-2 rounded-lg transition font-semibold ${
                        filterType === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterType('image')}
                      className={`px-4 py-2 rounded-lg transition font-semibold flex items-center gap-2 ${
                        filterType === 'image'
                          ? 'bg-green-600 text-white'
                          : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Images
                    </button>
                    <button
                      onClick={() => setFilterType('video')}
                      className={`px-4 py-2 rounded-lg transition font-semibold flex items-center gap-2 ${
                        filterType === 'video'
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      Videos
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedItems.length > 0 && (
                    <>
                      <button
                        onClick={handleDeleteSelected}
                        className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition font-semibold flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete ({selectedItems.length})
                      </button>
                      <button
                        onClick={handleSelectAll}
                        className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg hover:bg-[#2A2A2A] transition font-semibold"
                      >
                        Deselect All
                      </button>
                    </>
                  )}
                  {selectedItems.length === 0 && (
                    <button
                      onClick={handleSelectAll}
                      className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg hover:bg-[#2A2A2A] transition font-semibold"
                    >
                      Select All
                    </button>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex gap-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded transition ${
                        viewMode === 'grid'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded transition ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Media Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`bg-[#1A1A1A] rounded-2xl border-2 overflow-hidden transition cursor-pointer group ${
                      selectedItems.includes(item.id)
                        ? 'border-blue-500'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                    onClick={() => handleSelectItem(item.id)}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square bg-[#0A0A0A] overflow-hidden">
                      <img
                        src={item.thumbnail || item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        {item.type === 'video' && (
                          <PlayCircle className="w-16 h-16 text-white" />
                        )}
                        {item.type === 'image' && (
                          <Maximize2 className="w-16 h-16 text-white" />
                        )}
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-2 left-2">
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          item.type === 'video'
                            ? 'bg-purple-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                          {item.type === 'video' ? (
                            <div className="flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              {formatDuration(item.duration)}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              IMG
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(item.id);
                        }}
                        className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm transition"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            item.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'
                          }`}
                        />
                      </button>

                      {/* Selection Checkbox */}
                      <div className="absolute bottom-2 left-2">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                          selectedItems.includes(item.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-black/60 border-white backdrop-blur-sm'
                        }`}>
                          {selectedItems.includes(item.id) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h4 className="font-semibold text-white text-sm truncate mb-1">{item.name}</h4>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>{formatFileSize(item.size)}</span>
                        <span>{item.dimensions.width} × {item.dimensions.height}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`bg-[#1A1A1A] rounded-xl border-2 p-4 transition cursor-pointer group ${
                      selectedItems.includes(item.id)
                        ? 'border-blue-500'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                    onClick={() => handleSelectItem(item.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                        selectedItems.includes(item.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-[#0A0A0A] border-[#2A2A2A]'
                      }`}>
                        {selectedItems.includes(item.id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Thumbnail */}
                      <img
                        src={item.thumbnail || item.url}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{item.name}</h4>
                          <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                            item.type === 'video'
                              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                              : 'bg-green-600/20 text-green-400 border border-green-500/30'
                          }`}>
                            {item.type}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>{formatFileSize(item.size)}</span>
                          <span>{item.dimensions.width} × {item.dimensions.height}</span>
                          {item.duration && <span>{formatDuration(item.duration)}</span>}
                          <span>Uploaded {new Date(item.uploadedAt).toLocaleDateString()}</span>
                          {item.project && <span className="text-blue-400">Project: {item.project}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(item.id);
                          }}
                          className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              item.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'
                            }`}
                          />
                        </button>
                        <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition">
                          <Share2 className="w-5 h-5 text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition">
                          <Download className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-12 text-center">
                <Layers className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No media found</h3>
                <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setSelectedFolder('all');
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-3xl border border-[#2A2A2A] max-w-2xl w-full">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Upload Media</h2>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div
                className="border-2 border-dashed border-[#2A2A2A] rounded-2xl p-12 text-center hover:border-blue-500 transition cursor-pointer relative"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadingFiles}
                />
                {uploadingFiles ? (
                  <>
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Uploading...</h3>
                    <p className="text-gray-400">Please wait while your file is being uploaded</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Drag & drop files here</h3>
                    <p className="text-gray-400 mb-4">or click to browse</p>
                    <div className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold inline-block">
                      Choose Files
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      <span className="font-semibold text-gray-400">Images:</span> JPG, PNG, GIF, WebP, SVG, BMP, TIFF<br/>
                      <span className="font-semibold text-gray-400">Videos:</span> MP4, MOV, WebM, AVI, MKV, FLV<br/>
                      <span className="font-semibold text-gray-400">Max Size:</span> 100MB per file
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}