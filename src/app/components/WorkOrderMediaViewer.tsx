/**
 * Work Order Media Viewer
 * 
 * Displays all photos, videos, drawings, and documents from a work order
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Image as ImageIcon, Video, FileText, Download, Maximize2,
  Eye, Calendar, User, MapPin, Clock, Layers, Palette, Grid3x3,
  ZoomIn, ZoomOut, RotateCw, Share2, Trash2, Edit3, Plus,
  ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'drawing' | 'document' | 'floor-plan';
  url: string;
  thumbnail?: string;
  title: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize?: string;
  dimensions?: string;
  category?: string;
  tags?: string[];
}

interface WorkOrderMediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderNumber: string;
  workOrderTitle: string;
  customerName: string;
  location: string;
  media?: MediaItem[];
}

export default function WorkOrderMediaViewer({
  isOpen,
  onClose,
  workOrderNumber,
  workOrderTitle,
  customerName,
  location,
  media = []
}: WorkOrderMediaViewerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos' | 'drawings' | 'documents'>('all');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Sample media data - replace with actual data from props
  const sampleMedia: MediaItem[] = media.length > 0 ? media : [
    {
      id: '1',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=200',
      title: 'Before - Kitchen Main View',
      uploadedBy: 'John Smith',
      uploadedAt: '2026-03-10 09:15 AM',
      fileSize: '2.4 MB',
      dimensions: '4032x3024',
      category: 'Before Photos',
      tags: ['kitchen', 'before', 'main-view']
    },
    {
      id: '2',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=200',
      title: 'Before - Kitchen Countertops',
      uploadedBy: 'John Smith',
      uploadedAt: '2026-03-10 09:16 AM',
      fileSize: '2.1 MB',
      dimensions: '4032x3024',
      category: 'Before Photos',
      tags: ['kitchen', 'before', 'countertops']
    },
    {
      id: '3',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1556911261-6bd341186b2f?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1556911261-6bd341186b2f?w=200',
      title: 'After - Completed Kitchen',
      uploadedBy: 'Mike Johnson',
      uploadedAt: '2026-03-14 04:30 PM',
      fileSize: '2.8 MB',
      dimensions: '4032x3024',
      category: 'After Photos',
      tags: ['kitchen', 'after', 'completed']
    },
    {
      id: '4',
      type: 'video',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1556911261-6bd341186b2f?w=200',
      title: 'Walkthrough Video',
      uploadedBy: 'Mike Johnson',
      uploadedAt: '2026-03-14 04:45 PM',
      fileSize: '45 MB',
      dimensions: '1920x1080',
      category: 'Progress Videos',
      tags: ['walkthrough', 'video', 'progress']
    },
    {
      id: '5',
      type: 'drawing',
      url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200',
      title: 'Kitchen Floor Plan',
      uploadedBy: 'Design Team',
      uploadedAt: '2026-03-08 02:00 PM',
      fileSize: '1.2 MB',
      dimensions: '2400x1800',
      category: 'CAD Drawings',
      tags: ['floor-plan', 'cad', 'kitchen']
    },
    {
      id: '6',
      type: 'drawing',
      url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200',
      title: 'Elevation Drawing - North Wall',
      uploadedBy: 'Design Team',
      uploadedAt: '2026-03-08 02:15 PM',
      fileSize: '980 KB',
      dimensions: '2400x1800',
      category: 'CAD Drawings',
      tags: ['elevation', 'cad', 'north-wall']
    },
    {
      id: '7',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1565183928294-7d22f2300c56?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1565183928294-7d22f2300c56?w=200',
      title: 'Electrical Work Detail',
      uploadedBy: 'Electrician',
      uploadedAt: '2026-03-12 11:30 AM',
      fileSize: '1.8 MB',
      dimensions: '4032x3024',
      category: 'Progress Photos',
      tags: ['electrical', 'progress', 'detail']
    },
    {
      id: '8',
      type: 'document',
      url: '/documents/permit.pdf',
      thumbnail: 'https://via.placeholder.com/200x260/1a1a1a/ea580c?text=PDF',
      title: 'Building Permit',
      uploadedBy: 'Admin',
      uploadedAt: '2026-03-07 10:00 AM',
      fileSize: '340 KB',
      category: 'Permits & Documents',
      tags: ['permit', 'legal', 'required']
    }
  ];

  const filteredMedia = sampleMedia.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'photos') return item.type === 'photo';
    if (activeTab === 'videos') return item.type === 'video';
    if (activeTab === 'drawings') return item.type === 'drawing' || item.type === 'floor-plan';
    if (activeTab === 'documents') return item.type === 'document';
    return true;
  });

  const handleDownload = (item: MediaItem) => {
    toast.success(`Downloading ${item.title}`);
    // Implement actual download logic
  };

  const handleShare = (item: MediaItem) => {
    toast.success(`Share link copied to clipboard`);
    // Implement actual share logic
  };

  const openFullscreen = (item: MediaItem, index: number) => {
    setSelectedMedia(item);
    setCurrentIndex(index);
    setIsFullscreen(true);
    setZoomLevel(100);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setSelectedMedia(null);
    setIsPlaying(false);
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + filteredMedia.length) % filteredMedia.length
      : (currentIndex + 1) % filteredMedia.length;
    setCurrentIndex(newIndex);
    setSelectedMedia(filteredMedia[newIndex]);
    setZoomLevel(100);
  };

  const tabs = [
    { id: 'all', label: 'All Media', count: sampleMedia.length, icon: Grid3x3 },
    { id: 'photos', label: 'Photos', count: sampleMedia.filter(m => m.type === 'photo').length, icon: ImageIcon },
    { id: 'videos', label: 'Videos', count: sampleMedia.filter(m => m.type === 'video').length, icon: Video },
    { id: 'drawings', label: 'Drawings', count: sampleMedia.filter(m => m.type === 'drawing' || m.type === 'floor-plan').length, icon: Palette },
    { id: 'documents', label: 'Documents', count: sampleMedia.filter(m => m.type === 'document').length, icon: FileText }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-hidden"
        >
          <div className="min-h-screen bg-[#0A0A0A]">
            {/* Header */}
            <div className="border-b border-[#2A2A2A] bg-[#0A0A0A] sticky top-0 z-20">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-[#1A1A1A] rounded-lg transition text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-white">{workOrderTitle}</h1>
                        <span className="px-2 py-1 bg-[#ea580c]/20 text-[#ea580c] text-xs font-bold rounded-full">
                          {workOrderNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {customerName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {location}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-orange-700 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-[#ea580c]/50 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Upload Media
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4 overflow-x-auto">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'bg-[#ea580c] text-white'
                            : 'bg-[#1A1A1A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          activeTab === tab.id
                            ? 'bg-white/20'
                            : 'bg-[#2A2A2A]'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Media Grid */}
            <div className="p-6">
              {filteredMedia.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400">No media files found</p>
                  <p className="text-sm text-gray-600 mt-2">Upload photos, videos, or drawings to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredMedia.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#2A2A2A] hover:border-[#ea580c]/50 transition-all"
                    >
                      {/* Thumbnail */}
                      <div 
                        className="relative aspect-[4/3] cursor-pointer overflow-hidden"
                        onClick={() => openFullscreen(item, index)}
                      >
                        <img
                          src={item.thumbnail || item.url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        {/* Type Badge */}
                        <div className="absolute top-2 right-2">
                          <div className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                            {item.type === 'photo' && <ImageIcon className="w-4 h-4 text-blue-400" />}
                            {item.type === 'video' && <Video className="w-4 h-4 text-purple-400" />}
                            {item.type === 'drawing' && <Palette className="w-4 h-4 text-green-400" />}
                            {item.type === 'document' && <FileText className="w-4 h-4 text-orange-400" />}
                          </div>
                        </div>
                        {/* Play Button for Videos */}
                        {item.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center group-hover:bg-[#ea580c] transition-colors">
                              <Play className="w-6 h-6 text-white ml-1" />
                            </div>
                          </div>
                        )}
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openFullscreen(item, index);
                              }}
                              className="flex-1 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition"
                            >
                              <Eye className="w-4 h-4 mx-auto text-white" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item);
                              }}
                              className="flex-1 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition"
                            >
                              <Download className="w-4 h-4 mx-auto text-white" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(item);
                              }}
                              className="flex-1 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition"
                            >
                              <Share2 className="w-4 h-4 mx-auto text-white" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h4 className="text-sm font-semibold text-white truncate mb-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.uploadedAt.split(' ')[0]}
                          </span>
                          <span>{item.fileSize}</span>
                        </div>
                        {item.category && (
                          <div className="mt-2">
                            <span className="px-2 py-1 bg-[#2A2A2A] text-gray-400 text-xs rounded-full">
                              {item.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Viewer */}
            <AnimatePresence>
              {isFullscreen && selectedMedia && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black"
                >
                  {/* Fullscreen Header */}
                  <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">{selectedMedia.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {selectedMedia.uploadedBy} • {selectedMedia.uploadedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedMedia.type !== 'video' && (
                          <>
                            <button
                              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                            >
                              <ZoomOut className="w-5 h-5 text-white" />
                            </button>
                            <span className="text-white font-medium px-3">{zoomLevel}%</span>
                            <button
                              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                            >
                              <ZoomIn className="w-5 h-5 text-white" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDownload(selectedMedia)}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                        >
                          <Download className="w-5 h-5 text-white" />
                        </button>
                        <button
                          onClick={closeFullscreen}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Media Content */}
                  <div className="flex items-center justify-center h-full p-20">
                    {selectedMedia.type === 'video' ? (
                      <video
                        src={selectedMedia.url}
                        controls
                        autoPlay
                        className="max-w-full max-h-full rounded-lg"
                      />
                    ) : (
                      <img
                        src={selectedMedia.url}
                        alt={selectedMedia.title}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        style={{ transform: `scale(${zoomLevel / 100})` }}
                      />
                    )}
                  </div>

                  {/* Navigation Arrows */}
                  <button
                    onClick={() => navigateMedia('prev')}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={() => navigateMedia('next')}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>

                  {/* Bottom Info Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{currentIndex + 1} of {filteredMedia.length}</span>
                      <div className="flex items-center gap-4">
                        {selectedMedia.dimensions && (
                          <span>{selectedMedia.dimensions}</span>
                        )}
                        {selectedMedia.fileSize && (
                          <span>{selectedMedia.fileSize}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
