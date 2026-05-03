/**
 * Live Video Preview Player
 * Real-time video preview with advanced playback controls
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Settings, RotateCcw, FastForward, Rewind } from 'lucide-react';
import { VideoAsset } from '../lib/videoAssetManager';

interface LiveVideoPreviewPlayerProps {
  video: VideoAsset | null;
  autoPlay?: boolean;
  onEnded?: () => void;
  showControls?: boolean;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
}

export default function LiveVideoPreviewPlayer({
  video,
  autoPlay = false,
  onEnded,
  showControls = true,
  aspectRatio = '16:9',
}: LiveVideoPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (video && autoPlay) {
      setIsPlaying(true);
    }
  }, [video, autoPlay]);

  // Simulate video playback
  useEffect(() => {
    if (isPlaying && duration > 0) {
      const updateTime = () => {
        setCurrentTime((prev) => {
          const next = prev + (0.016 * playbackSpeed);
          if (next >= duration) {
            setIsPlaying(false);
            onEnded?.();
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
  }, [isPlaying, duration, playbackSpeed, onEnded]);

  useEffect(() => {
    if (video) {
      setDuration(video.duration || 30);
      setCurrentTime(0);
    }
  }, [video]);

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
    setCurrentTime(Math.min(currentTime + 5, duration));
  };

  const skipBackward = () => {
    setCurrentTime(Math.max(currentTime - 5, 0));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const resetVideo = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video';
      case '9:16': return 'aspect-[9/16]';
      case '1:1': return 'aspect-square';
      case '4:5': return 'aspect-[4/5]';
      default: return 'aspect-video';
    }
  };

  if (!video) {
    return (
      <div className={`bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden ${getAspectRatioClass()}`}>
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
          <Play className="w-16 h-16 mb-3 opacity-50" />
          <p className="text-sm">No video selected</p>
          <p className="text-xs mt-1">Upload or select a video to preview</p>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden shadow-2xl"
    >
      {/* Video Preview */}
      <div className={`relative bg-black ${getAspectRatioClass()} overflow-hidden group`}>
        {video.url ? (
          <>
            <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full object-contain"
              muted={isMuted}
            />
            
            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {/* Top Bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
                <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                  <p className="text-sm font-medium text-white">{video.title}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
                    {video.size.width}x{video.size.height}
                  </div>
                  <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
                    {playbackSpeed}x
                  </div>
                </div>
              </div>

              {/* Center Play Button */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <button
                    onClick={handlePlayPause}
                    className="p-6 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full transition"
                  >
                    <Play className="w-12 h-12 text-white ml-1" />
                  </button>
                </div>
              )}

              {/* Bottom Bar - Timestamp */}
              <div className="absolute bottom-20 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                <p className="text-sm font-mono text-white">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
            </div>

            {/* Live Indicator */}
            {isPlaying && (
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-red-600 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-medium text-white">LIVE</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div
              className="w-32 h-32 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
              }}
            >
              <Play className="w-16 h-16 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="p-4 bg-[#0A0A0A]">
          {/* Progress Bar */}
          <div className="mb-4">
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="h-1.5 bg-[#2A2A2A] rounded-full cursor-pointer group relative overflow-hidden"
            >
              {/* Buffer (mock) */}
              <div
                className="absolute h-full bg-gray-600/50 rounded-full"
                style={{ width: `${Math.min(progress + 10, 100)}%` }}
              />
              
              {/* Progress */}
              <div
                className="absolute h-full bg-gradient-to-r from-[#ea580c] to-[#f97316] rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
              
              {/* Scrubber */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progress}%`, marginLeft: '-6px' }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs font-mono">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="text-gray-500">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={resetVideo}
                className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              
              <button
                onClick={skipBackward}
                className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
                title="Rewind 5s"
              >
                <Rewind className="w-4 h-4" />
              </button>
              
              <button
                onClick={handlePlayPause}
                className="p-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:opacity-90 rounded-lg transition text-white shadow-lg shadow-[#ea580c]/30"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              
              <button
                onClick={skipForward}
                className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
                title="Forward 5s"
              >
                <FastForward className="w-4 h-4" />
              </button>
            </div>

            {/* Center: Volume */}
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
                className="w-24 h-1 bg-[#2A2A2A] rounded appearance-none cursor-pointer accent-[#ea580c]"
              />
              <span className="text-xs text-gray-400 min-w-[2rem]">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>

            {/* Right: Settings & Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Playback Speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
                  title="Playback Speed"
                >
                  <Settings className="w-4 h-4" />
                </button>
                
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl min-w-[120px]">
                    <p className="text-xs text-gray-400 mb-2 px-2">Speed</p>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          setShowSettings(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-sm rounded transition ${
                          playbackSpeed === speed
                            ? 'bg-[#ea580c] text-white'
                            : 'text-gray-300 hover:bg-[#2A2A2A]'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Info */}
      <div className="px-4 pb-4 border-t border-[#2A2A2A]">
        <div className="grid grid-cols-4 gap-3 text-xs pt-3">
          <div>
            <p className="text-gray-500 mb-1">Resolution</p>
            <p className="text-white font-medium">
              {video.size.width} x {video.size.height}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Duration</p>
            <p className="text-white font-medium">{formatTime(duration)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Source</p>
            <p className="text-white font-medium capitalize">{video.source}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Aspect</p>
            <p className="text-white font-medium">{aspectRatio}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
