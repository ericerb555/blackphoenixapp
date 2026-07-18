/**
 * Photo to Video Converter
 * Drag-and-drop photo slideshow creator with transitions and effects
 */

import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Play, Pause, Plus, Trash2, GripVertical, Zap, Download, Music, Clock, Sparkles, Move, RotateCw, Film, Eye, Edit3 } from 'lucide-react';
import { MusicAsset } from '../lib/musicAssetManager';
import AdvancedPhotoEditor, { PhotoEdits } from './AdvancedPhotoEditor';
import VideoExportOptions, { ExportSettings } from './VideoExportOptions';

export interface PhotoSlide {
  id: string;
  url: string;
  title: string;
  duration: number;
  transition: 'fade' | 'slide' | 'zoom' | 'dissolve' | 'wipe' | 'none';
  transitionDuration: number;
  effect: 'none' | 'ken-burns' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
  order: number;
}

interface PhotoToVideoConverterProps {
  onExport?: (slides: PhotoSlide[], totalDuration: number, music?: MusicAsset) => void;
  music?: MusicAsset;
  onMusicChange?: (music: MusicAsset | null) => void;
}

export default function PhotoToVideoConverter({
  onExport,
  music,
  onMusicChange,
}: PhotoToVideoConverterProps) {
  const [slides, setSlides] = useState<PhotoSlide[]>([]);
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [draggedSlide, setDraggedSlide] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [globalDuration, setGlobalDuration] = useState(3);
  const [globalTransition, setGlobalTransition] = useState<PhotoSlide['transition']>('fade');
  const [editingSlide, setEditingSlide] = useState<PhotoSlide | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [slideEdits, setSlideEdits] = useState<Record<string, PhotoEdits>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const totalDuration = slides.reduce((sum, slide) => sum + slide.duration + slide.transitionDuration, 0);

  // Playback animation
  useEffect(() => {
    if (isPlaying && totalDuration > 0) {
      const updateTime = () => {
        setCurrentTime((prev) => {
          const next = prev + 0.033; // ~30fps
          if (next >= totalDuration) {
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
  }, [isPlaying, totalDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newSlide: PhotoSlide = {
            id: `slide-${Date.now()}-${index}`,
            url: event.target?.result as string,
            title: file.name,
            duration: globalDuration,
            transition: globalTransition,
            transitionDuration: 0.5,
            effect: 'ken-burns',
            order: slides.length + index,
          };
          setSlides(prev => [...prev, newSlide]);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragStart = (slideId: string) => {
    setDraggedSlide(slideId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedSlide) return;
    
    const dragIndex = slides.findIndex(s => s.id === draggedSlide);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    
    const newSlides = [...slides];
    const [removed] = newSlides.splice(dragIndex, 1);
    newSlides.splice(dropIndex, 0, removed);
    
    // Update order
    newSlides.forEach((slide, idx) => {
      slide.order = idx;
    });
    
    setSlides(newSlides);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedSlide(null);
    setDragOverIndex(null);
  };

  const updateSlide = (slideId: string, updates: Partial<PhotoSlide>) => {
    setSlides(prev => prev.map(slide => 
      slide.id === slideId ? { ...slide, ...updates } : slide
    ));
  };

  const removeSlide = (slideId: string) => {
    setSlides(prev => prev.filter(s => s.id !== slideId));
    if (selectedSlide === slideId) {
      setSelectedSlide(null);
    }
  };

  const applyToAll = (property: 'duration' | 'transition' | 'effect', value: any) => {
    setSlides(prev => prev.map(slide => ({ ...slide, [property]: value })));
  };

  const getCurrentSlide = () => {
    let accumulatedTime = 0;
    for (const slide of slides) {
      const slideEndTime = accumulatedTime + slide.duration + slide.transitionDuration;
      if (currentTime >= accumulatedTime && currentTime < slideEndTime) {
        return slide;
      }
      accumulatedTime = slideEndTime;
    }
    return slides[0];
  };

  const currentSlide = getCurrentSlide();

  const transitionOptions = [
    { value: 'fade', label: 'Fade', icon: '⬜' },
    { value: 'slide', label: 'Slide', icon: '➡️' },
    { value: 'zoom', label: 'Zoom', icon: '🔍' },
    { value: 'dissolve', label: 'Dissolve', icon: '✨' },
    { value: 'wipe', label: 'Wipe', icon: '🎬' },
    { value: 'none', label: 'None', icon: '⏭️' },
  ];

  const effectOptions = [
    { value: 'none', label: 'None', icon: '—' },
    { value: 'ken-burns', label: 'Ken Burns', icon: '🎥' },
    { value: 'zoom-in', label: 'Zoom In', icon: '🔍' },
    { value: 'zoom-out', label: 'Zoom Out', icon: '🔎' },
    { value: 'pan-left', label: 'Pan Left', icon: '⬅️' },
    { value: 'pan-right', label: 'Pan Right', icon: '➡️' },
  ];

  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-lg">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Photo to Video Converter</h3>
              <p className="text-xs text-gray-400">Create stunning video slideshows from your photos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg transition font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Photos
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Settings
            </button>
            
            {onExport && slides.length > 0 && (
              <button
                onClick={() => setShowExportOptions(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                Export Video
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3 h-3" />
            <span>{slides.length} photos</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>{formatTime(totalDuration)} duration</span>
          </div>
          {music && (
            <div className="flex items-center gap-2">
              <Music className="w-3 h-3 text-[#ea580c]" />
              <span className="text-[#ea580c]">{music.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Settings Panel */}
      {showSettings && (
        <div className="p-6 border-b border-[#2A2A2A] bg-[#1A1A1A]">
          <h4 className="text-sm font-bold text-white mb-4">Global Settings</h4>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Default Duration */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Default Duration (seconds)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={globalDuration}
                  onChange={(e) => setGlobalDuration(parseFloat(e.target.value))}
                  className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm"
                />
                <button
                  onClick={() => applyToAll('duration', globalDuration)}
                  className="px-3 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg transition text-xs whitespace-nowrap"
                >
                  Apply All
                </button>
              </div>
            </div>

            {/* Default Transition */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Default Transition</label>
              <div className="flex items-center gap-2">
                <select
                  value={globalTransition}
                  onChange={(e) => setGlobalTransition(e.target.value as PhotoSlide['transition'])}
                  className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm"
                >
                  {transitionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => applyToAll('transition', globalTransition)}
                  className="px-3 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg transition text-xs whitespace-nowrap"
                >
                  Apply All
                </button>
              </div>
            </div>

            {/* Music Sync */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Music Sync</label>
              <button
                onClick={() => {
                  if (music && slides.length > 0) {
                    const durationPerSlide = music.duration / slides.length;
                    applyToAll('duration', durationPerSlide);
                  }
                }}
                disabled={!music || slides.length === 0}
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Auto-fit to Music
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview */}
      <div className="p-6 border-b border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#ea580c]" />
            Live Preview
          </h4>
          {currentSlide && (
            <span className="text-xs text-gray-400">
              Showing: {currentSlide.title}
            </span>
          )}
        </div>
        
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative">
          {currentSlide ? (
            <>
              <img
                src={currentSlide.url}
                alt={currentSlide.title}
                className={`w-full h-full object-cover transition-all duration-1000 ${
                  currentSlide.effect === 'ken-burns' ? 'animate-ken-burns' :
                  currentSlide.effect === 'zoom-in' ? 'animate-zoom-in' :
                  currentSlide.effect === 'zoom-out' ? 'animate-zoom-out' :
                  currentSlide.effect === 'pan-left' ? 'animate-pan-left' :
                  currentSlide.effect === 'pan-right' ? 'animate-pan-right' :
                  ''
                }`}
              />
              
              {/* Overlay Info */}
              <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-xs text-white">
                  {isPlaying ? 'Playing' : 'Paused'}
                </span>
              </div>
              
              <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                <p className="text-xs font-mono text-white">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </p>
              </div>

              {/* Transition Preview */}
              <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                <p className="text-xs text-white">
                  {currentSlide.effect !== 'none' && `${currentSlide.effect} • `}
                  {currentSlide.transition}
                </p>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
              <ImageIcon className="w-16 h-16 mb-3 opacity-50" />
              <p className="text-sm">No photos added</p>
              <p className="text-xs mt-1">Add photos to start creating your video</p>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(false);
            }}
            className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition text-gray-400 hover:text-white"
            disabled={slides.length === 0}
          >
            <RotateCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:opacity-90 rounded-full transition text-white shadow-lg shadow-[#ea580c]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={slides.length === 0}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
        </div>

        {/* Progress Bar */}
        {totalDuration > 0 && (
          <div className="mb-2">
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316] transition-all duration-100"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Photo Slides List */}
      <div className="p-6">
        {slides.length === 0 ? (
          <div className="py-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-white mb-2">No Photos Yet</h4>
            <p className="text-sm text-gray-400 mb-4">
              Add photos to create your video slideshow
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:opacity-90 text-white rounded-lg transition font-medium"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Add Photos
            </button>
          </div>
        ) : (
          <>
            <h4 className="text-sm font-bold text-white mb-4">
              Photo Sequence ({slides.length} slides)
            </h4>
            
            <div className="space-y-2">
              {slides.map((slide, index) => {
                const isSelected = selectedSlide === slide.id;
                const isDragOver = dragOverIndex === index;
                
                return (
                  <div key={slide.id}>
                    {/* Drop Indicator */}
                    {isDragOver && (
                      <div className="h-1 bg-[#ea580c] rounded-full mb-2 shadow-lg shadow-[#ea580c]/50" />
                    )}
                    
                    <div
                      draggable
                      onDragStart={() => handleDragStart(slide.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => setSelectedSlide(slide.id)}
                      className={`group p-4 rounded-lg border-2 transition-all cursor-move ${
                        isSelected
                          ? 'bg-[#ea580c]/10 border-[#ea580c]'
                          : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Drag Handle & Order */}
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-5 h-5 text-gray-600 group-hover:text-gray-400 cursor-grab active:cursor-grabbing" />
                          <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-sm font-bold text-gray-400">
                            {index + 1}
                          </div>
                        </div>
                        
                        {/* Photo Thumbnail */}
                        <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                          <img
                            src={slide.url}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Slide Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate mb-1">
                            {slide.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{slide.duration}s</span>
                            <span>•</span>
                            <span className="capitalize">{slide.transition}</span>
                            <span>•</span>
                            <span className="capitalize">{slide.effect.replace('-', ' ')}</span>
                          </div>
                        </div>
                        
                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          {/* Duration */}
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <input
                              type="number"
                              min="0.5"
                              max="10"
                              step="0.5"
                              value={slide.duration}
                              onChange={(e) => updateSlide(slide.id, { duration: parseFloat(e.target.value) })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-xs"
                            />
                          </div>
                          
                          {/* Transition */}
                          <select
                            value={slide.transition}
                            onChange={(e) => updateSlide(slide.id, { transition: e.target.value as PhotoSlide['transition'] })}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-xs"
                          >
                            {transitionOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          
                          {/* Effect */}
                          <select
                            value={slide.effect}
                            onChange={(e) => updateSlide(slide.id, { effect: e.target.value as PhotoSlide['effect'] })}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-xs"
                          >
                            {effectOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          
                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSlide(slide.id);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Helper Text */}
            <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] text-center text-sm text-gray-500">
              💡 Drag photos to reorder • Click to select • Adjust duration and effects per slide
            </div>
          </>
        )}
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes ken-burns {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.1) translate(-2%, -2%); }
        }
        @keyframes zoom-in {
          0% { transform: scale(1); }
          100% { transform: scale(1.2); }
        }
        @keyframes zoom-out {
          0% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes pan-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-5%); }
        }
        @keyframes pan-right {
          0% { transform: translateX(-5%); }
          100% { transform: translateX(0); }
        }
        .animate-ken-burns { animation: ken-burns 3s ease-in-out infinite alternate; }
        .animate-zoom-in { animation: zoom-in 3s ease-in-out infinite alternate; }
        .animate-zoom-out { animation: zoom-out 3s ease-in-out infinite alternate; }
        .animate-pan-left { animation: pan-left 3s ease-in-out infinite alternate; }
        .animate-pan-right { animation: pan-right 3s ease-in-out infinite alternate; }
      `}</style>

      {/* Export Options */}
      {showExportOptions && (
        <VideoExportOptions
          slides={slides}
          totalDuration={totalDuration}
          music={music}
          onExport={onExport}
          onClose={() => setShowExportOptions(false)}
        />
      )}
    </div>
  );
}