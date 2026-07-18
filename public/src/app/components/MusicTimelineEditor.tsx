/**
 * Music Timeline Editor
 * Drag-and-drop timeline with live preview for video/music sync
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, Volume2, Scissors, Zap, Music, Video as VideoIcon, Move } from 'lucide-react';
import { MusicAsset } from '../lib/musicAssetManager';
import { VideoAsset } from '../lib/videoAssetManager';
import { BeatMarker } from '../lib/audioBeatSync';

interface MusicTimelineEditorProps {
  video?: VideoAsset;
  music?: MusicAsset;
  beatMarkers?: BeatMarker[];
  onTrimChange?: (start: number, end: number) => void;
  onSyncPointAdd?: (time: number) => void;
  videoDuration?: number;
}

export default function MusicTimelineEditor({
  video,
  music,
  beatMarkers = [],
  onTrimChange,
  onSyncPointAdd,
  videoDuration = 60,
}: MusicTimelineEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(music?.duration || 60);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number>();

  const duration = Math.max(videoDuration, music?.duration || 60);
  const pixelsPerSecond = (800 * zoom) / duration; // Base width 800px

  useEffect(() => {
    if (music) {
      setTrimEnd(music.duration);
    }
  }, [music]);

  // Animation loop for playhead
  useEffect(() => {
    if (isPlaying) {
      const updateTime = () => {
        setCurrentTime((prev) => {
          const next = prev + 0.016; // ~60fps
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

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isDraggingStart || isDraggingEnd || isDraggingPlayhead) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    setCurrentTime(Math.max(0, Math.min(duration, time)));
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(duration, (x / rect.width) * duration));

    if (isDraggingStart) {
      const newStart = Math.min(time, trimEnd - 1);
      setTrimStart(newStart);
      onTrimChange?.(newStart, trimEnd);
    } else if (isDraggingEnd) {
      const newEnd = Math.max(time, trimStart + 1);
      setTrimEnd(newEnd);
      onTrimChange?.(trimStart, newEnd);
    } else if (isDraggingPlayhead) {
      setCurrentTime(time);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
    setIsDraggingPlayhead(false);
  };

  useEffect(() => {
    if (isDraggingStart || isDraggingEnd || isDraggingPlayhead) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingStart, isDraggingEnd, isDraggingPlayhead, trimStart, trimEnd, duration]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const skipToStart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const snapToNearestBeat = (time: number) => {
    if (beatMarkers.length === 0) return time;
    
    let nearest = beatMarkers[0];
    let minDist = Math.abs(time - nearest.time);
    
    for (const beat of beatMarkers) {
      const dist = Math.abs(time - beat.time);
      if (dist < minDist) {
        minDist = dist;
        nearest = beat;
      }
    }
    
    return minDist < 0.5 ? nearest.time : time;
  };

  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-[#ea580c]" />
          Music Timeline Editor
        </h3>
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
      </div>

      {/* Live Preview Windows */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Video Preview */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] aspect-video overflow-hidden">
          {video ? (
            <div className="w-full h-full flex items-center justify-center bg-black relative">
              <video
                ref={videoRef}
                src={video.url}
                className="max-w-full max-h-full"
                muted
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center gap-1">
                <VideoIcon className="w-3 h-3" />
                {video.title}
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
              <VideoIcon className="w-12 h-12 mb-2" />
              <p className="text-sm">No video loaded</p>
            </div>
          )}
        </div>

        {/* Audio Waveform Preview */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#ea580c]" />
              <span className="text-xs font-medium text-white">
                {music?.title || 'No music loaded'}
              </span>
            </div>
            {music?.bpm && (
              <span className="text-xs text-purple-400">{music.bpm} BPM</span>
            )}
          </div>
          
          {/* Waveform Visualization */}
          <div className="h-24 bg-[#0A0A0A] rounded-lg p-2 flex items-center gap-0.5 overflow-hidden">
            {music ? (
              Array.from({ length: 100 }).map((_, i) => {
                const height = Math.random() * 60 + 20; // Mock waveform
                const time = (i / 100) * music.duration;
                const isInTrimRange = time >= trimStart && time <= trimEnd;
                const isAtPlayhead = Math.abs(time - currentTime) < (music.duration / 100);
                
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-all ${
                      isAtPlayhead
                        ? 'bg-[#ea580c]'
                        : isInTrimRange
                        ? 'bg-gradient-to-t from-[#ea580c] to-[#f97316]'
                        : 'bg-gray-700'
                    }`}
                    style={{ height: `${height}%`, opacity: isInTrimRange ? 1 : 0.3 }}
                  />
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                No audio waveform
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={skipToStart}
          className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={togglePlayPause}
          className="p-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:opacity-90 rounded-lg transition text-white shadow-lg shadow-[#ea580c]/20"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-mono">{formatTime(currentTime)}</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400 font-mono">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {/* Time Ruler */}
        <div className="flex items-center gap-1 text-xs text-gray-500 px-2 select-none">
          {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0"
              style={{ width: `${5 * pixelsPerSecond}px` }}
            >
              {i * 5}s
            </div>
          ))}
        </div>

        {/* Main Timeline Container */}
        <div
          ref={timelineRef}
          className="relative h-32 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-x-auto overflow-y-hidden cursor-crosshair"
          onClick={handleTimelineClick}
          style={{ minWidth: '100%' }}
        >
          <div
            className="relative h-full"
            style={{ width: `${duration * pixelsPerSecond}px` }}
          >
            {/* Beat Markers Layer */}
            {beatMarkers.map((beat, i) => (
              <div
                key={i}
                className={`absolute top-0 bottom-0 w-px ${
                  beat.isMajorBeat ? 'bg-purple-500' : 'bg-purple-500/30'
                }`}
                style={{ left: `${beat.time * pixelsPerSecond}px` }}
                title={`Beat ${beat.beatInBar} of Bar ${beat.barNumber}`}
              >
                {beat.isMajorBeat && (
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-purple-500 rounded-full" />
                )}
              </div>
            ))}

            {/* Video Track */}
            <div className="absolute top-2 left-0 right-0 h-10 px-2">
              <div
                className="h-full bg-blue-500/20 border-2 border-blue-500/50 rounded flex items-center px-3 relative"
                style={{ width: `${videoDuration * pixelsPerSecond}px` }}
              >
                <VideoIcon className="w-4 h-4 text-blue-400 mr-2" />
                <span className="text-xs text-blue-300 font-medium">Video</span>
              </div>
            </div>

            {/* Music Track with Trim Handles */}
            {music && (
              <div className="absolute top-14 left-0 right-0 h-12 px-2">
                {/* Full track (dimmed) */}
                <div
                  className="absolute h-full bg-[#ea580c]/10 border border-[#ea580c]/30 rounded"
                  style={{ width: `${music.duration * pixelsPerSecond}px` }}
                />
                
                {/* Active/trimmed section */}
                <div
                  className="absolute h-full bg-gradient-to-r from-[#ea580c]/30 to-[#c2410c]/30 border-2 border-[#ea580c] rounded flex items-center px-3 relative"
                  style={{
                    left: `${trimStart * pixelsPerSecond}px`,
                    width: `${(trimEnd - trimStart) * pixelsPerSecond}px`,
                  }}
                >
                  <Music className="w-4 h-4 text-[#ea580c] mr-2" />
                  <span className="text-xs text-white font-medium truncate">{music.title}</span>
                  
                  {/* Start Trim Handle */}
                  <div
                    className="absolute -left-1 top-0 bottom-0 w-2 bg-[#ea580c] hover:bg-[#f97316] cursor-ew-resize flex items-center justify-center group"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDraggingStart(true);
                    }}
                  >
                    <Move className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                  </div>
                  
                  {/* End Trim Handle */}
                  <div
                    className="absolute -right-1 top-0 bottom-0 w-2 bg-[#ea580c] hover:bg-[#f97316] cursor-ew-resize flex items-center justify-center group"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDraggingEnd(true);
                    }}
                  >
                    <Move className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              </div>
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 cursor-grab active:cursor-grabbing"
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDraggingPlayhead(true);
              }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full shadow-lg" />
              <div className="absolute -left-8 -top-8 px-2 py-1 bg-black/80 rounded text-xs text-white font-mono whitespace-nowrap">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Trim Info */}
        {music && (
          <div className="flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-4 text-gray-400">
              <div>
                <span className="text-gray-500">Trim Start:</span>{' '}
                <span className="text-white font-mono">{formatTime(trimStart)}</span>
              </div>
              <div>
                <span className="text-gray-500">Trim End:</span>{' '}
                <span className="text-white font-mono">{formatTime(trimEnd)}</span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>{' '}
                <span className="text-[#ea580c] font-mono">{formatTime(trimEnd - trimStart)}</span>
              </div>
            </div>
            
            {beatMarkers.length > 0 && (
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-purple-400" />
                <span className="text-purple-400">{beatMarkers.length} beats</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-[#2A2A2A] flex gap-3">
        <button
          onClick={() => {
            const snappedStart = snapToNearestBeat(trimStart);
            const snappedEnd = snapToNearestBeat(trimEnd);
            setTrimStart(snappedStart);
            setTrimEnd(snappedEnd);
            onTrimChange?.(snappedStart, snappedEnd);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium"
          disabled={beatMarkers.length === 0}
        >
          <Zap className="w-4 h-4" />
          Snap to Beats
        </button>
        
        <button
          onClick={() => {
            setTrimStart(0);
            setTrimEnd(videoDuration);
            onTrimChange?.(0, videoDuration);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition text-sm font-medium"
        >
          <Scissors className="w-4 h-4" />
          Fit to Video
        </button>

        <button
          onClick={() => {
            setTrimStart(0);
            setTrimEnd(music?.duration || 60);
            onTrimChange?.(0, music?.duration || 60);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition text-sm font-medium"
        >
          Reset Trim
        </button>
      </div>
    </div>
  );
}
