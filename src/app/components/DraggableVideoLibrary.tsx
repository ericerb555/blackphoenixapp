/**
 * Draggable Video Library
 * Drag-and-drop video asset manager with live previews
 */

import React, { useState } from 'react';
import { Video, Play, Trash2, GripVertical, Clock, Download, Eye, Edit3, Copy, Share2 } from 'lucide-react';
import { VideoAsset } from '../lib/videoAssetManager';

interface DraggableVideoLibraryProps {
  videos: VideoAsset[];
  onVideoSelect: (video: VideoAsset) => void;
  onVideoDelete?: (videoId: string) => void;
  onVideoDuplicate?: (video: VideoAsset) => void;
  selectedVideo?: VideoAsset | null;
  showActions?: boolean;
}

export default function DraggableVideoLibrary({
  videos,
  onVideoSelect,
  onVideoDelete,
  onVideoDuplicate,
  selectedVideo,
  showActions = true,
}: DraggableVideoLibraryProps) {
  const [draggedVideo, setDraggedVideo] = useState<string | null>(null);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleDragStart = (e: React.DragEvent, video: VideoAsset) => {
    setDraggedVideo(video.id);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('video', JSON.stringify(video));
    
    // Visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedVideo(null);
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'upload': return 'bg-blue-500/20 text-blue-400';
      case 'stock': return 'bg-purple-500/20 text-purple-400';
      case 'generated': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (videos.length === 0) {
    return (
      <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-12 text-center">
        <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No Videos Yet</h3>
        <p className="text-sm text-gray-400 mb-4">
          Upload videos to get started with your video library
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:opacity-90 text-white rounded-lg transition font-medium">
          Upload Video
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Video Library</h3>
            <p className="text-sm text-gray-400">
              {videos.length} video{videos.length !== 1 ? 's' : ''} • Drag to timeline or click to preview
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <GripVertical className="w-4 h-4" />
            <span>Drag & Drop</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => {
            const isSelected = selectedVideo?.id === video.id;
            const isDragging = draggedVideo === video.id;
            const isHovered = hoveredVideo === video.id;
            const isPreviewing = previewVideo === video.id;
            
            return (
              <div
                key={video.id}
                draggable
                onDragStart={(e) => handleDragStart(e, video)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredVideo(video.id)}
                onMouseLeave={() => setHoveredVideo(null)}
                onClick={() => onVideoSelect(video)}
                className={`group bg-[#1A1A1A] rounded-lg border-2 transition-all cursor-move ${
                  isSelected
                    ? 'border-[#ea580c] ring-2 ring-[#ea580c]/50'
                    : isDragging
                    ? 'border-[#ea580c]/50 scale-95'
                    : 'border-[#2A2A2A] hover:border-[#ea580c]/30'
                } ${isDragging ? 'opacity-50' : ''}`}
              >
                {/* Video Preview Thumbnail */}
                <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
                  {/* Thumbnail or Video Preview */}
                  {video.url ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                      {isPreviewing ? (
                        <video
                          src={video.url}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div
                            className="w-20 h-20 rounded-full flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                            }}
                          >
                            <Video className="w-10 h-10 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ea580c]/20 to-[#dc2626]/20">
                      <Video className="w-12 h-12 text-[#ea580c]" />
                    </div>
                  )}

                  {/* Overlay on Hover */}
                  <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <div className="h-full flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewVideo(isPreviewing ? null : video.id);
                        }}
                        className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition"
                      >
                        {isPreviewing ? (
                          <Eye className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </button>
                      <p className="text-xs text-white">
                        {isPreviewing ? 'Previewing' : 'Click to preview'}
                      </p>
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-xs font-mono text-white">
                    {formatDuration(video.duration || 0)}
                  </div>

                  {/* Drag Handle */}
                  <div className={`absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-sm rounded transition-opacity ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>

                  {/* Source Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSourceColor(video.source)}`}>
                      {video.source}
                    </span>
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <h4 className="text-sm font-bold text-white mb-2 truncate">{video.title}</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>{video.size.width}x{video.size.height}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(video.duration || 0)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className={`flex items-center gap-1 transition-opacity ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVideoSelect(video);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded transition text-xs font-medium"
                        title="Select"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      
                      {onVideoDuplicate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onVideoDuplicate(video);
                          }}
                          className="p-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 hover:text-white rounded transition"
                          title="Duplicate"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Share functionality
                        }}
                        className="p-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 hover:text-white rounded transition"
                        title="Share"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      
                      {onVideoDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${video.title}"?`)) {
                              onVideoDelete(video.id);
                            }
                          }}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 p-1 bg-[#ea580c] rounded-full shadow-lg">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Helper Text */}
        <div className="mt-6 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] text-center text-sm text-gray-500">
          💡 Drag videos to the timeline • Click to select • Hover for actions
        </div>
      </div>
    </div>
  );
}
