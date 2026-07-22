/**
 * Draggable Playlist Manager
 * Drag-and-drop interface for organizing music playlists with live preview
 */

import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, Plus, Trash2, GripVertical, X, Clock, Disc, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { MusicAsset } from '../lib/musicAssetManager';
import { MusicPlaylist, reorderPlaylistTracks } from '../lib/musicPlaylistManager';

interface DraggablePlaylistManagerProps {
  playlist: MusicPlaylist;
  tracks: MusicAsset[];
  onTrackRemove: (trackId: string) => void;
  onTrackReorder: (trackIds: string[]) => void;
  onTrackPlay: (track: MusicAsset) => void;
  availableTracks?: MusicAsset[];
  onTrackAdd?: (trackId: string) => void;
}

export default function DraggablePlaylistManager({
  playlist,
  tracks,
  onTrackRemove,
  onTrackReorder,
  onTrackPlay,
  availableTracks = [],
  onTrackAdd,
}: DraggablePlaylistManagerProps) {
  const [draggedTrack, setDraggedTrack] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAddTracks, setShowAddTracks] = useState(false);
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (e: React.DragEvent, trackId: string, index: number) => {
    setDraggedTrack(trackId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', trackId);
    
    // Visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedTrack(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedTrack) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedTrack) return;
    
    const dragIndex = tracks.findIndex(t => t.id === draggedTrack);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    
    // Reorder tracks
    const newTracks = [...tracks];
    const [removed] = newTracks.splice(dragIndex, 1);
    newTracks.splice(dropIndex, 0, removed);
    
    const newTrackIds = newTracks.map(t => t.id);
    onTrackReorder(newTrackIds);
    
    setDragOverIndex(null);
  };

  const handleTrackPlay = (track: MusicAsset) => {
    if (playingTrack === track.id) {
      setPlayingTrack(null);
      audioRef.current?.pause();
    } else {
      setPlayingTrack(track.id);
      onTrackPlay(track);
      // In real implementation, would play the actual audio
    }
  };

  const toggleTrackExpand = (trackId: string) => {
    const newExpanded = new Set(expandedTracks);
    if (newExpanded.has(trackId)) {
      newExpanded.delete(trackId);
    } else {
      newExpanded.add(trackId);
    }
    setExpandedTracks(newExpanded);
  };

  // Drag from available tracks
  const handleAvailableTrackDragStart = (e: React.DragEvent, trackId: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('trackId', trackId);
    e.dataTransfer.setData('source', 'available');
  };

  const handlePlaylistDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData('source');
    
    if (source === 'available') {
      const trackId = e.dataTransfer.getData('trackId');
      if (trackId && onTrackAdd) {
        onTrackAdd(trackId);
      }
    }
  };

  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      {/* Playlist Header */}
      <div
        className="p-6 border-b border-[#2A2A2A]"
        style={{
          background: `linear-gradient(135deg, ${playlist.coverColor || '#ea580c'}22 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center shadow-lg"
              style={{ backgroundColor: playlist.coverColor || '#ea580c' }}
            >
              <Disc className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{playlist.name}</h3>
              <p className="text-sm text-gray-400 mb-2">{playlist.description}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{tracks.length} tracks</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(totalDuration)}
                </span>
                {playlist.category && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{playlist.category.replace('-', ' ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddTracks(!showAddTracks)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg transition font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Tracks
          </button>
        </div>

        {/* Add Tracks Panel */}
        {showAddTracks && availableTracks.length > 0 && (
          <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white">Available Tracks</h4>
              <button
                onClick={() => setShowAddTracks(false)}
                className="p-1 hover:bg-[#2A2A2A] rounded transition text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableTracks
                .filter(track => !tracks.find(t => t.id === track.id))
                .map((track) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={(e) => handleAvailableTrackDragStart(e, track.id)}
                    className="flex items-center justify-between p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] rounded-lg cursor-move transition"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <Music className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{track.title}</p>
                        <p className="text-xs text-gray-500">{track.mood}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onTrackAdd?.(track.id)}
                      className="ml-2 px-3 py-1 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs rounded transition"
                    >
                      Add
                    </button>
                  </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 italic">
              💡 Drag tracks from here to reorder in the playlist
            </p>
          </div>
        )}
      </div>

      {/* Playlist Tracks */}
      <div
        className="p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handlePlaylistDrop}
      >
        {tracks.length === 0 ? (
          <div className="py-12 text-center">
            <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No tracks in this playlist</p>
            <p className="text-sm text-gray-600">
              {availableTracks.length > 0 
                ? 'Click "Add Tracks" to get started' 
                : 'Upload some music to add tracks'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, index) => {
              const isExpanded = expandedTracks.has(track.id);
              const isPlaying = playingTrack === track.id;
              const isDragOver = dragOverIndex === index;
              
              return (
                <div key={track.id}>
                  {/* Drop indicator */}
                  {isDragOver && (
                    <div className="h-0.5 bg-[#ea580c] rounded-full mb-1 shadow-lg shadow-[#ea580c]/50" />
                  )}
                  
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, track.id, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`group p-3 rounded-lg border transition-all cursor-move ${
                      isPlaying
                        ? 'bg-[#ea580c]/10 border-[#ea580c]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50 hover:bg-[#1A1A1A]/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Drag Handle */}
                      <GripVertical className="w-5 h-5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                      
                      {/* Track Number */}
                      <div className="w-6 text-center text-sm font-bold text-gray-500">
                        {index + 1}
                      </div>
                      
                      {/* Play Button */}
                      <button
                        onClick={() => handleTrackPlay(track)}
                        className={`p-2 rounded-lg transition flex-shrink-0 ${
                          isPlaying
                            ? 'bg-[#ea580c] text-white'
                            : 'bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#3A3A3A]'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      
                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">{track.title}</p>
                          {track.isRoyaltyFree && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded flex-shrink-0">
                              RF
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="capitalize">{track.mood}</span>
                          <span>•</span>
                          <span className="capitalize">{track.genre}</span>
                          <span>•</span>
                          <span>{formatTime(track.duration)}</span>
                          {track.bpm && (
                            <>
                              <span>•</span>
                              <span>{track.bpm} BPM</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTrackExpand(track.id)}
                          className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => onTrackRemove(track.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded Track Details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#2A2A2A] grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500 mb-1">Instruments</p>
                          <div className="flex flex-wrap gap-1">
                            {track.instruments?.map((instrument, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-[#2A2A2A] text-gray-300 rounded"
                              >
                                {instrument}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-gray-500 mb-1">Keywords</p>
                          <div className="flex flex-wrap gap-1">
                            {track.keywords?.slice(0, 4).map((keyword, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {track.license && (
                          <div className="col-span-2">
                            <p className="text-gray-500 mb-1">License</p>
                            <p className="text-gray-300">{track.license}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Live Preview Progress Bar */}
                    {isPlaying && (
                      <div className="mt-3">
                        <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316] transition-all duration-100"
                            style={{ width: `${(currentTime / track.duration) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {tracks.length > 0 && (
          <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] text-center text-sm text-gray-500">
            💡 Drag tracks to reorder • Click play to preview • Expand for details
          </div>
        )}
      </div>

      {/* Hidden audio element for preview */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
