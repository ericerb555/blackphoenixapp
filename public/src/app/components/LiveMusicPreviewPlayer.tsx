/**
 * Live Music Preview Player
 * Real-time audio preview with waveform visualization
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Download } from 'lucide-react';
import { MusicAsset } from '../lib/musicAssetManager';

interface LiveMusicPreviewPlayerProps {
  track: MusicAsset | null;
  autoPlay?: boolean;
  onEnded?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showWaveform?: boolean;
}

export default function LiveMusicPreviewPlayer({
  track,
  autoPlay = false,
  onEnded,
  onNext,
  onPrevious,
  showWaveform = true,
}: LiveMusicPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (track && autoPlay) {
      setIsPlaying(true);
    }
  }, [track, autoPlay]);

  // Simulate audio playback (in real app, would use actual audio)
  useEffect(() => {
    if (isPlaying && duration > 0) {
      const updateTime = () => {
        setCurrentTime((prev) => {
          const next = prev + 0.016; // ~60fps
          if (next >= duration) {
            if (isRepeat) {
              return 0;
            } else {
              setIsPlaying(false);
              onEnded?.();
              return 0;
            }
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
  }, [isPlaying, duration, isRepeat, onEnded]);

  useEffect(() => {
    if (track) {
      setDuration(track.duration);
      setCurrentTime(0);
    }
  }, [track]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    setCurrentTime(Math.max(0, Math.min(duration, newTime)));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const skipForward = () => {
    setCurrentTime(Math.min(currentTime + 10, duration));
  };

  const skipBackward = () => {
    setCurrentTime(Math.max(currentTime - 10, 0));
  };

  // Generate mock waveform data
  const waveformData = track 
    ? Array.from({ length: 100 }, () => Math.random() * 60 + 20)
    : [];

  if (!track) {
    return (
      <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-8">
        <div className="text-center text-gray-500">
          <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No track selected</p>
          <p className="text-sm mt-1">Select a track to preview</p>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 shadow-2xl">
      {/* Track Info */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${track.mood === 'energetic' ? '#ea580c' : track.mood === 'calm' ? '#10b981' : '#8b5cf6'} 0%, ${track.mood === 'energetic' ? '#dc2626' : track.mood === 'calm' ? '#059669' : '#7c3aed'} 100%)`,
          }}
        >
          <Volume2 className="w-10 h-10 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white truncate mb-1">{track.title}</h3>
          <p className="text-sm text-gray-400 mb-2">
            {track.artist || 'Audio Library'} • {track.genre}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              track.mood === 'energetic' ? 'bg-red-500/20 text-red-400' :
              track.mood === 'calm' ? 'bg-green-500/20 text-green-400' :
              track.mood === 'professional' ? 'bg-blue-500/20 text-blue-400' :
              'bg-purple-500/20 text-purple-400'
            }`}>
              {track.mood}
            </span>
            {track.bpm && (
              <span className="px-2 py-0.5 bg-[#2A2A2A] text-gray-300 rounded text-xs">
                {track.bpm} BPM
              </span>
            )}
            {track.isRoyaltyFree && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                Royalty-Free
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Waveform Visualization */}
      {showWaveform && (
        <div className="mb-6">
          <div className="h-24 bg-[#0A0A0A] rounded-lg p-2 flex items-end gap-0.5 overflow-hidden relative">
            {waveformData.map((height, i) => {
              const barProgress = (i / waveformData.length) * 100;
              const isPast = barProgress <= progress;
              
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all duration-75 ${
                    isPast
                      ? 'bg-gradient-to-t from-[#ea580c] to-[#f97316]'
                      : 'bg-[#2A2A2A]'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
            
            {/* Current position indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-2 bg-[#2A2A2A] rounded-full cursor-pointer group relative overflow-hidden"
        >
          <div
            className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316] rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          
          {/* Hover indicator */}
          <div className="absolute top-0 bottom-0 w-1 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs font-mono">
          <span className="text-white">{formatTime(currentTime)}</span>
          <span className="text-gray-500">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {/* Left: Secondary Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-2 rounded-lg transition ${
              isRepeat
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
            }`}
            title="Repeat"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Main Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevious || skipBackward}
            className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-white"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="p-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:opacity-90 rounded-full transition text-white shadow-lg shadow-[#ea580c]/30"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          
          <button
            onClick={onNext || skipForward}
            className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-white"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Volume Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-[#2A2A2A] rounded appearance-none cursor-pointer accent-[#ea580c]"
          />
        </div>
      </div>

      {/* Track Details */}
      <div className="pt-4 border-t border-[#2A2A2A]">
        <div className="grid grid-cols-2 gap-4 text-xs">
          {track.instruments && track.instruments.length > 0 && (
            <div>
              <p className="text-gray-500 mb-2">Instruments</p>
              <div className="flex flex-wrap gap-1">
                {track.instruments.slice(0, 3).map((instrument, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-[#2A2A2A] text-gray-300 rounded"
                  >
                    {instrument}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {track.keywords && track.keywords.length > 0 && (
            <div>
              <p className="text-gray-500 mb-2">Keywords</p>
              <div className="flex flex-wrap gap-1">
                {track.keywords.slice(0, 3).map((keyword, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {track.license && (
          <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
            <p className="text-xs text-gray-500 mb-1">License</p>
            <p className="text-xs text-gray-300">{track.license}</p>
          </div>
        )}
      </div>

      {/* Hidden audio element (in real app would play actual audio) */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
