/**
 * Video Timeline Editor
 * Drag-and-drop multi-track video editor with live preview
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, Video as VideoIcon, Scissors, Move, Layers, Plus, Trash2, Volume2, Music, Type, Image as ImageIcon, Zap } from 'lucide-react';
import { VideoAsset } from '../lib/videoAssetManager';
import { MusicAsset } from '../lib/musicAssetManager';

interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image';
  asset: any;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  layer: number;
}

interface VideoTimelineEditorProps {
  video?: VideoAsset;
  music?: MusicAsset;
  duration?: number;
  onTimelineChange?: (tracks: TimelineTrack[]) => void;
  onExport?: () => void;
}

export default function VideoTimelineEditor({
  video,
  music,
  duration = 60,
  onTimelineChange,
  onExport,
}: VideoTimelineEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [tracks, setTracks] = useState<TimelineTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [draggedTrack, setDraggedTrack] = useState<string | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number>();

  const pixelsPerSecond = (1000 * zoom) / duration;

  // Initialize tracks from props
  useEffect(() => {
    const initialTracks: TimelineTrack[] = [];
    
    if (video) {
      initialTracks.push({
        id: 'video-main',
        type: 'video',
        asset: video,
        startTime: 0,
        duration: video.duration || 30,
        trimStart: 0,
        trimEnd: video.duration || 30,
        layer: 0,
      });
    }
    
    if (music) {
      initialTracks.push({
        id: 'audio-main',
        type: 'audio',
        asset: music,
        startTime: 0,
        duration: music.duration,
        trimStart: 0,
        trimEnd: music.duration,
        layer: 1,
      });
    }
    
    if (initialTracks.length > 0) {
      setTracks(initialTracks);
    }
  }, [video, music]);

  // Playback animation
  useEffect(() => {
    if (isPlaying) {
      const updateTime = () => {
        setCurrentTime((prev) => {
          const next = prev + 0.016;
          if (next >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // 30fps
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isDraggingPlayhead) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    setCurrentTime(Math.max(0, Math.min(duration, time)));
  };

  const handlePlayheadDrag = (e: MouseEvent) => {
    if (!timelineRef.current || !isDraggingPlayhead) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(duration, (x / rect.width) * duration));
    setCurrentTime(time);
  };

  const handleMouseUp = () => {
    setIsDraggingPlayhead(false);
  };

  useEffect(() => {
    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handlePlayheadDrag);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handlePlayheadDrag);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, duration]);

  const handleTrackDragStart = (trackId: string) => {
    setDraggedTrack(trackId);
    setSelectedTrack(trackId);
  };

  const handleTrackDrag = (e: React.DragEvent, trackId: string) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newStartTime = Math.max(0, (x / rect.width) * duration);
    
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, startTime: newStartTime }
        : track
    ));
  };

  const handleTrackDragEnd = () => {
    setDraggedTrack(null);
    onTimelineChange?.(tracks);
  };

  const handleTrimStart = (trackId: string, newTrimStart: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        const maxTrim = track.trimEnd - 0.5;
        const trimStart = Math.max(0, Math.min(newTrimStart, maxTrim));
        return { ...track, trimStart };
      }
      return track;
    }));
    onTimelineChange?.(tracks);
  };

  const handleTrimEnd = (trackId: string, newTrimEnd: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        const track_asset_duration = track.type === 'video' 
          ? (track.asset as VideoAsset).duration || 30
          : (track.asset as MusicAsset).duration;
        const minTrim = track.trimStart + 0.5;
        const trimEnd = Math.min(track_asset_duration, Math.max(newTrimEnd, minTrim));
        return { ...track, trimEnd };
      }
      return track;
    }));
    onTimelineChange?.(tracks);
  };

  const removeTrack = (trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (selectedTrack === trackId) {
      setSelectedTrack(null);
    }
    onTimelineChange?.(tracks.filter(t => t.id !== trackId));
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const skipToStart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const getTrackColor = (type: string) => {
    switch (type) {
      case 'video': return '#3b82f6';
      case 'audio': return '#ea580c';
      case 'text': return '#8b5cf6';
      case 'image': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTrackIcon = (type: string) => {
    switch (type) {
      case 'video': return VideoIcon;
      case 'audio': return Music;
      case 'text': return Type;
      case 'image': return ImageIcon;
      default: return Layers;
    }
  };

  const layerHeight = 60;
  const maxLayers = Math.max(4, ...tracks.map(t => t.layer + 1));

  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Video Timeline Editor</h3>
              <p className="text-xs text-gray-400">Drag to reorder • Trim handles to adjust length</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Zoom:</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-24 h-1 bg-[#2A2A2A] rounded appearance-none cursor-pointer accent-[#ea580c]"
              />
              <span className="text-xs text-white min-w-[2rem]">{zoom.toFixed(1)}x</span>
            </div>
            
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg transition font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Track
            </button>
            
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition font-medium text-sm"
              >
                <Zap className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Layers className="w-3 h-3" />
            <span>{tracks.length} tracks</span>
          </div>
          <div className="flex items-center gap-2">
            <VideoIcon className="w-3 h-3" />
            <span>{tracks.filter(t => t.type === 'video').length} video</span>
          </div>
          <div className="flex items-center gap-2">
            <Music className="w-3 h-3" />
            <span>{tracks.filter(t => t.type === 'audio').length} audio</span>
          </div>
          <div>Duration: {formatTime(duration)}</div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="p-6 border-b border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative">
          {video ? (
            <>
              <video
                ref={videoPreviewRef}
                src={video.url}
                className="w-full h-full object-contain"
                muted
              />
              <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-xs text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Live Preview
              </div>
              <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-xs font-mono text-white">
                {formatTime(currentTime)}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
              <VideoIcon className="w-16 h-16 mb-3 opacity-50" />
              <p className="text-sm">No video loaded</p>
              <p className="text-xs mt-1">Upload a video to start editing</p>
            </div>
          )}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={skipToStart}
            className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={togglePlayPause}
            className="p-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:opacity-90 rounded-full transition text-white shadow-lg shadow-[#ea580c]/20"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          
          <div className="px-4 py-2 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <div className="text-xs text-gray-500 mb-0.5">Timecode</div>
            <div className="text-sm font-mono text-white">{formatTime(currentTime)}</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        {/* Time Ruler */}
        <div className="flex items-center gap-1 text-xs text-gray-500 px-2 mb-2 select-none">
          {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0"
              style={{ width: `${5 * pixelsPerSecond}px` }}
            >
              {formatTime(i * 5)}
            </div>
          ))}
        </div>

        {/* Track Layers */}
        <div
          ref={timelineRef}
          className="relative bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-x-auto overflow-y-hidden"
          onClick={handleTimelineClick}
          style={{ height: `${maxLayers * layerHeight + 20}px`, minWidth: '100%' }}
        >
          <div
            className="relative h-full"
            style={{ width: `${duration * pixelsPerSecond}px` }}
          >
            {/* Grid Lines */}
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-[#2A2A2A]"
                style={{ left: `${i * pixelsPerSecond}px` }}
              />
            ))}

            {/* Tracks */}
            {tracks.map((track) => {
              const Icon = getTrackIcon(track.type);
              const color = getTrackColor(track.type);
              const trackDuration = track.trimEnd - track.trimStart;
              const isSelected = selectedTrack === track.id;
              
              return (
                <div
                  key={track.id}
                  draggable
                  onDragStart={() => handleTrackDragStart(track.id)}
                  onDrag={(e) => handleTrackDrag(e, track.id)}
                  onDragEnd={handleTrackDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTrack(track.id);
                  }}
                  className={`absolute cursor-move rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1A] z-10'
                      : 'hover:ring-1 hover:ring-gray-400'
                  }`}
                  style={{
                    left: `${track.startTime * pixelsPerSecond}px`,
                    top: `${track.layer * layerHeight + 10}px`,
                    width: `${trackDuration * pixelsPerSecond}px`,
                    height: `${layerHeight - 10}px`,
                    background: `linear-gradient(135deg, ${color}40 0%, ${color}20 100%)`,
                    borderColor: color,
                  }}
                >
                  {/* Track Content */}
                  <div className="h-full flex items-center px-3 gap-2 relative overflow-hidden">
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {track.type === 'video' 
                          ? (track.asset as VideoAsset).title
                          : track.type === 'audio'
                          ? (track.asset as MusicAsset).title
                          : 'Track'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTime(trackDuration)}
                      </p>
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrack(track.id);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded transition text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {/* Trim Handles */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/50 flex items-center justify-center group"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        // Implement trim start drag
                      }}
                    >
                      <Move className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                    
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/50 flex items-center justify-center group"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        // Implement trim end drag
                      }}
                    >
                      <Move className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>

                  {/* Waveform or Preview */}
                  {track.type === 'audio' && (
                    <div className="absolute bottom-0 left-0 right-0 h-6 px-1 flex items-end gap-px">
                      {Array.from({ length: 50 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{
                            height: `${Math.random() * 100}%`,
                            background: color,
                            opacity: 0.3,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20 cursor-grab active:cursor-grabbing"
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDraggingPlayhead(true);
              }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full shadow-lg" />
            </div>
          </div>
        </div>

        {/* Track Info */}
        {selectedTrack && tracks.find(t => t.id === selectedTrack) && (
          <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <h4 className="text-sm font-bold text-white mb-3">Track Properties</h4>
            <div className="grid grid-cols-3 gap-4 text-xs">
              {tracks.filter(t => t.id === selectedTrack).map(track => (
                <React.Fragment key={track.id}>
                  <div>
                    <p className="text-gray-500 mb-1">Start Time</p>
                    <p className="text-white font-mono">{formatTime(track.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Duration</p>
                    <p className="text-white font-mono">{formatTime(track.trimEnd - track.trimStart)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Layer</p>
                    <p className="text-white">{track.layer + 1}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] text-center text-sm text-gray-500">
          💡 Drag tracks to reposition • Click track to select • Drag edges to trim • Click timeline to seek
        </div>
      </div>
    </div>
  );
}
