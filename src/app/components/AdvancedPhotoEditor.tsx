/**
 * Advanced Photo Editor
 * Text overlays, filters, cropping, and AI enhancements
 */

import React, { useState, useRef } from 'react';
import { Type, Sparkles, Crop, Sliders, Wand2, Image as ImageIcon, X, Check, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';

export interface PhotoEdits {
  text?: {
    content: string;
    position: 'top' | 'center' | 'bottom';
    align: 'left' | 'center' | 'right';
    fontSize: number;
    color: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    backgroundColor?: string;
    animation: 'none' | 'fade-in' | 'slide-up' | 'typewriter';
  };
  filter: 'none' | 'vintage' | 'bw' | 'sepia' | 'vibrant' | 'cool' | 'warm' | 'dramatic';
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  blur: number; // 0 to 10
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  aiEnhance: boolean;
  smartCrop: boolean;
}

interface AdvancedPhotoEditorProps {
  photoUrl: string;
  photoTitle: string;
  initialEdits?: PhotoEdits;
  onSave: (edits: PhotoEdits) => void;
  onCancel: () => void;
}

export default function AdvancedPhotoEditor({
  photoUrl,
  photoTitle,
  initialEdits,
  onSave,
  onCancel,
}: AdvancedPhotoEditorProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'filters' | 'adjust' | 'ai'>('text');
  const [edits, setEdits] = useState<PhotoEdits>(initialEdits || {
    filter: 'none',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    aiEnhance: false,
    smartCrop: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateText = (updates: Partial<PhotoEdits['text']>) => {
    setEdits(prev => ({
      ...prev,
      text: { ...prev.text, ...updates } as PhotoEdits['text']
    }));
  };

  const updateFilter = (filter: PhotoEdits['filter']) => {
    setEdits(prev => ({ ...prev, filter }));
  };

  const updateAdjustment = (key: keyof PhotoEdits, value: number | boolean) => {
    setEdits(prev => ({ ...prev, [key]: value }));
  };

  const getFilterStyle = () => {
    const filters: string[] = [];
    
    // Brightness
    if (edits.brightness !== 0) {
      filters.push(`brightness(${100 + edits.brightness}%)`);
    }
    
    // Contrast
    if (edits.contrast !== 0) {
      filters.push(`contrast(${100 + edits.contrast}%)`);
    }
    
    // Saturation
    if (edits.saturation !== 0) {
      filters.push(`saturate(${100 + edits.saturation}%)`);
    }
    
    // Blur
    if (edits.blur > 0) {
      filters.push(`blur(${edits.blur}px)`);
    }
    
    // Preset filters
    switch (edits.filter) {
      case 'vintage':
        filters.push('sepia(40%) contrast(110%) brightness(95%)');
        break;
      case 'bw':
        filters.push('grayscale(100%)');
        break;
      case 'sepia':
        filters.push('sepia(100%)');
        break;
      case 'vibrant':
        filters.push('saturate(150%) contrast(110%)');
        break;
      case 'cool':
        filters.push('hue-rotate(180deg) saturate(120%)');
        break;
      case 'warm':
        filters.push('sepia(20%) saturate(130%)');
        break;
      case 'dramatic':
        filters.push('contrast(150%) brightness(90%) saturate(130%)');
        break;
    }
    
    return filters.length > 0 ? filters.join(' ') : 'none';
  };

  const getTextPositionStyle = () => {
    if (!edits.text) return {};
    
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      padding: '1rem',
      color: edits.text.color,
      fontSize: `${edits.text.fontSize}px`,
      fontWeight: edits.text.fontWeight,
      fontStyle: edits.text.fontStyle,
      textAlign: edits.text.align,
      backgroundColor: edits.text.backgroundColor || 'transparent',
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    };
    
    switch (edits.text.position) {
      case 'top':
        return { ...base, top: '1rem' };
      case 'center':
        return { ...base, top: '50%', transform: 'translateY(-50%)' };
      case 'bottom':
        return { ...base, bottom: '1rem' };
      default:
        return base;
    }
  };

  const getTextAnimationClass = () => {
    if (!edits.text) return '';
    
    switch (edits.text.animation) {
      case 'fade-in': return 'animate-fade-in';
      case 'slide-up': return 'animate-slide-up';
      case 'typewriter': return 'animate-typewriter';
      default: return '';
    }
  };

  const filterPresets = [
    { value: 'none', label: 'Original', gradient: 'from-gray-500 to-gray-600' },
    { value: 'vintage', label: 'Vintage', gradient: 'from-amber-600 to-orange-700' },
    { value: 'bw', label: 'B&W', gradient: 'from-gray-800 to-gray-900' },
    { value: 'sepia', label: 'Sepia', gradient: 'from-amber-700 to-amber-900' },
    { value: 'vibrant', label: 'Vibrant', gradient: 'from-pink-500 to-purple-600' },
    { value: 'cool', label: 'Cool', gradient: 'from-blue-500 to-cyan-600' },
    { value: 'warm', label: 'Warm', gradient: 'from-orange-500 to-red-600' },
    { value: 'dramatic', label: 'Dramatic', gradient: 'from-purple-900 to-black' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Advanced Photo Editor</h2>
              <p className="text-sm text-gray-400">{photoTitle}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => onSave(edits)}
                className="px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:opacity-90 text-white rounded-lg transition font-medium flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Controls */}
          <div className="w-80 border-r border-[#2A2A2A] bg-[#0A0A0A] overflow-y-auto">
            {/* Tab Navigation */}
            <div className="grid grid-cols-4 gap-1 p-3 border-b border-[#2A2A2A]">
              {[
                { id: 'text', label: 'Text', icon: Type },
                { id: 'filters', label: 'Filters', icon: Sparkles },
                { id: 'adjust', label: 'Adjust', icon: Sliders },
                { id: 'ai', label: 'AI', icon: Wand2 },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`p-3 rounded-lg transition text-xs font-medium ${
                      activeTab === tab.id
                        ? 'bg-[#ea580c] text-white'
                        : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-4 space-y-4">
              {/* Text Tab */}
              {activeTab === 'text' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Text Content</label>
                    <textarea
                      value={edits.text?.content || ''}
                      onChange={(e) => updateText({ content: e.target.value })}
                      placeholder="Enter your text..."
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm resize-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['top', 'center', 'bottom'].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => updateText({ position: pos as any })}
                          className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
                            edits.text?.position === pos
                              ? 'bg-[#ea580c] text-white'
                              : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Alignment</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'left', icon: AlignLeft },
                        { value: 'center', icon: AlignCenter },
                        { value: 'right', icon: AlignRight },
                      ].map((align) => {
                        const Icon = align.icon;
                        return (
                          <button
                            key={align.value}
                            onClick={() => updateText({ align: align.value as any })}
                            className={`px-3 py-2 rounded-lg transition ${
                              edits.text?.align === align.value
                                ? 'bg-[#ea580c] text-white'
                                : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4 mx-auto" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Font Size: {edits.text?.fontSize || 24}px</label>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={edits.text?.fontSize || 24}
                      onChange={(e) => updateText({ fontSize: parseInt(e.target.value) })}
                      className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Text Color</label>
                    <input
                      type="color"
                      value={edits.text?.color || '#ffffff'}
                      onChange={(e) => updateText({ color: e.target.value })}
                      className="w-full h-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateText({ fontWeight: edits.text?.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={`px-3 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                          edits.text?.fontWeight === 'bold'
                            ? 'bg-[#ea580c] text-white'
                            : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                        }`}
                      >
                        <Bold className="w-4 h-4" />
                        Bold
                      </button>
                      <button
                        onClick={() => updateText({ fontStyle: edits.text?.fontStyle === 'italic' ? 'normal' : 'italic' })}
                        className={`px-3 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                          edits.text?.fontStyle === 'italic'
                            ? 'bg-[#ea580c] text-white'
                            : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                        }`}
                      >
                        <Italic className="w-4 h-4" />
                        Italic
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Animation</label>
                    <select
                      value={edits.text?.animation || 'none'}
                      onChange={(e) => updateText({ animation: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm"
                    >
                      <option value="none">None</option>
                      <option value="fade-in">Fade In</option>
                      <option value="slide-up">Slide Up</option>
                      <option value="typewriter">Typewriter</option>
                    </select>
                  </div>
                </>
              )}

              {/* Filters Tab */}
              {activeTab === 'filters' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Filter Presets</label>
                  {filterPresets.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => updateFilter(filter.value as any)}
                      className={`w-full p-3 rounded-lg transition flex items-center justify-between ${
                        edits.filter === filter.value
                          ? 'bg-[#ea580c] ring-2 ring-[#ea580c]'
                          : 'bg-[#1A1A1A] hover:bg-[#2A2A2A]'
                      }`}
                    >
                      <span className="text-sm font-medium text-white">{filter.label}</span>
                      <div className={`w-12 h-8 rounded bg-gradient-to-r ${filter.gradient}`} />
                    </button>
                  ))}
                </div>
              )}

              {/* Adjust Tab */}
              {activeTab === 'adjust' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Brightness: {edits.brightness > 0 ? '+' : ''}{edits.brightness}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={edits.brightness}
                      onChange={(e) => updateAdjustment('brightness', parseInt(e.target.value))}
                      className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Contrast: {edits.contrast > 0 ? '+' : ''}{edits.contrast}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={edits.contrast}
                      onChange={(e) => updateAdjustment('contrast', parseInt(e.target.value))}
                      className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Saturation: {edits.saturation > 0 ? '+' : ''}{edits.saturation}
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={edits.saturation}
                      onChange={(e) => updateAdjustment('saturation', parseInt(e.target.value))}
                      className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Blur: {edits.blur}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={edits.blur}
                      onChange={(e) => updateAdjustment('blur', parseInt(e.target.value))}
                      className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEdits(prev => ({
                        ...prev,
                        brightness: 0,
                        contrast: 0,
                        saturation: 0,
                        blur: 0,
                      }));
                    }}
                    className="w-full px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition text-sm"
                  >
                    Reset Adjustments
                  </button>
                </>
              )}

              {/* AI Tab */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <button
                    onClick={() => updateAdjustment('aiEnhance', !edits.aiEnhance)}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      edits.aiEnhance
                        ? 'bg-[#ea580c]/10 border-[#ea580c]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Wand2 className="w-5 h-5 text-[#ea580c]" />
                      <span className="font-medium text-white">AI Auto-Enhance</span>
                    </div>
                    <p className="text-xs text-gray-400 text-left">
                      Automatically improve brightness, contrast, and sharpness
                    </p>
                  </button>

                  <button
                    onClick={() => updateAdjustment('smartCrop', !edits.smartCrop)}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      edits.smartCrop
                        ? 'bg-[#ea580c]/10 border-[#ea580c]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Crop className="w-5 h-5 text-[#ea580c]" />
                      <span className="font-medium text-white">Smart Crop</span>
                    </div>
                    <p className="text-xs text-gray-400 text-left">
                      AI-powered composition for best framing
                    </p>
                  </button>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-400">Coming Soon</span>
                    </div>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Face detection & zoom</li>
                      <li>• Background removal</li>
                      <li>• Object recognition</li>
                      <li>• Style transfer</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 bg-black flex items-center justify-center p-8 overflow-auto">
            <div className="relative max-w-full max-h-full">
              <canvas ref={canvasRef} className="hidden" />
              <img
                src={photoUrl}
                alt={photoTitle}
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ filter: getFilterStyle() }}
              />
              
              {/* Text Overlay */}
              {edits.text?.content && (
                <div
                  className={getTextAnimationClass()}
                  style={getTextPositionStyle()}
                >
                  {edits.text.content}
                </div>
              )}

              {/* AI Enhancement Indicator */}
              {edits.aiEnhance && (
                <div className="absolute top-3 right-3 px-3 py-1.5 bg-purple-600 rounded-lg flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-white" />
                  <span className="text-xs font-medium text-white">AI Enhanced</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom Animations */}
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
          }
          .animate-fade-in {
            animation: fade-in 1s ease-in-out;
          }
          .animate-slide-up {
            animation: slide-up 0.8s ease-out;
          }
          .animate-typewriter {
            overflow: hidden;
            white-space: nowrap;
            animation: typewriter 2s steps(40) 1;
          }
        `}</style>
      </div>
    </div>
  );
}
