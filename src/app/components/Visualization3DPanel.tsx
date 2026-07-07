import { useState } from 'react';
import { 
  Box, Rotate3D, Eye, EyeOff, Lightbulb, Move, 
  ZoomIn, ZoomOut, Maximize2, RotateCcw, Settings,
  Layers, Grid3x3, Sun, Moon
} from 'lucide-react';

interface Visualization3DPanelProps {
  elements: any[];
  selectedElementId: string | null;
}

type ViewMode = 'perspective' | 'isometric' | 'top' | 'front' | 'side';
type RenderMode = 'solid' | 'wireframe' | 'xray';

export function Visualization3DPanel({ elements, selectedElementId }: Visualization3DPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [renderMode, setRenderMode] = useState<RenderMode>('solid');
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [lighting, setLighting] = useState<'day' | 'night'>('day');
  const [rotationX, setRotationX] = useState(30);
  const [rotationY, setRotationY] = useState(45);
  const [zoom3D, setZoom3D] = useState(1);

  const handleResetView = () => {
    setRotationX(30);
    setRotationY(45);
    setZoom3D(1);
  };

  // Simple 3D visualization simulation
  const get3DTransform = () => {
    return `perspective(1000px) rotateX(${rotationX}deg) rotateY(${rotationY}deg) scale(${zoom3D})`;
  };

  const getElementColor = (type: string) => {
    switch (type) {
      case 'beam': return '#3b82f6';
      case 'column': return '#ef4444';
      case 'foundation': return '#8b5cf6';
      case 'slab': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Box className="w-5 h-5 text-[#ea580c]" />
          3D Visualization
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetView}
            className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* View Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">View Mode</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-sm text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="perspective">Perspective</option>
            <option value="isometric">Isometric</option>
            <option value="top">Top View</option>
            <option value="front">Front View</option>
            <option value="side">Side View</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Render Mode</label>
          <select
            value={renderMode}
            onChange={(e) => setRenderMode(e.target.value as RenderMode)}
            className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-sm text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="solid">Solid</option>
            <option value="wireframe">Wireframe</option>
            <option value="xray">X-Ray</option>
          </select>
        </div>
      </div>

      {/* Display Options */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 block mb-2">Display Options</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showGrid
                ? 'bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/30'
                : 'bg-[#2A2A2A] text-gray-400 border border-[#3A3A3A]'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            Grid
          </button>
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showDimensions
                ? 'bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/30'
                : 'bg-[#2A2A2A] text-gray-400 border border-[#3A3A3A]'
            }`}
          >
            <Move className="w-4 h-4" />
            Dimensions
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showLabels
                ? 'bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/30'
                : 'bg-[#2A2A2A] text-gray-400 border border-[#3A3A3A]'
            }`}
          >
            <Layers className="w-4 h-4" />
            Labels
          </button>
          <button
            onClick={() => setLighting(lighting === 'day' ? 'night' : 'day')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              lighting === 'day'
                ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
            }`}
          >
            {lighting === 'day' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {lighting === 'day' ? 'Day' : 'Night'}
          </button>
        </div>
      </div>

      {/* Rotation Controls */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">Rotation X: {rotationX}°</label>
            <Rotate3D className="w-4 h-4 text-gray-500" />
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={rotationX}
            onChange={(e) => setRotationX(Number(e.target.value))}
            className="w-full accent-[#ea580c]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">Rotation Y: {rotationY}°</label>
            <Rotate3D className="w-4 h-4 text-gray-500" />
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={rotationY}
            onChange={(e) => setRotationY(Number(e.target.value))}
            className="w-full accent-[#ea580c]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">Zoom: {(zoom3D * 100).toFixed(0)}%</label>
            <ZoomIn className="w-4 h-4 text-gray-500" />
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom3D}
            onChange={(e) => setZoom3D(Number(e.target.value))}
            className="w-full accent-[#ea580c]"
          />
        </div>
      </div>

      {/* 3D Viewport */}
      <div 
        className={`relative w-full h-[400px] rounded-lg border-2 border-[#2A2A2A] overflow-hidden ${
          lighting === 'day' ? 'bg-gradient-to-b from-blue-50 to-gray-100' : 'bg-gradient-to-b from-gray-900 to-black'
        }`}
        style={{ perspective: '1000px' }}
      >
        {/* Grid Background */}
        {showGrid && (
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid3d" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={lighting === 'day' ? '#333' : '#666'} strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid3d)" />
            </svg>
          </div>
        )}

        {/* 3D Scene Container */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div 
            style={{ 
              transform: get3DTransform(),
              transformStyle: 'preserve-3d',
              transition: 'transform 0.2s ease-out'
            }}
          >
            {/* Render Elements */}
            {elements.length === 0 ? (
              <div className="text-center">
                <Box className="w-16 h-16 text-gray-400 mx-auto mb-2 opacity-30" />
                <p className="text-gray-500 text-sm">No elements to visualize</p>
                <p className="text-gray-600 text-xs mt-1">Add structural elements to see 3D view</p>
              </div>
            ) : (
              <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
                {elements.map((element, index) => {
                  const isSelected = element.id === selectedElementId;
                  const color = getElementColor(element.type);
                  const depth = element.type === 'slab' ? 10 : element.type === 'foundation' ? 30 : 20;
                  
                  return (
                    <div
                      key={element.id}
                      className="absolute"
                      style={{
                        left: `${element.x / 5}px`,
                        top: `${element.y / 5}px`,
                        width: `${element.width / 5}px`,
                        height: `${element.height / 5}px`,
                        transform: `translateZ(${index * 10}px) rotateZ(${element.rotation}deg)`,
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {/* Front Face */}
                      <div
                        className="absolute inset-0 transition-all"
                        style={{
                          backgroundColor: renderMode === 'wireframe' ? 'transparent' : color,
                          border: `2px solid ${isSelected ? '#ea580c' : color}`,
                          opacity: renderMode === 'xray' ? 0.3 : isSelected ? 0.9 : 0.7,
                        }}
                      >
                        {showLabels && (
                          <div className="absolute top-1 left-1 text-[8px] text-white font-bold bg-black/50 px-1 rounded">
                            {element.type.toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Top Face */}
                      {renderMode !== 'wireframe' && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: color,
                            opacity: 0.5,
                            transform: `rotateX(90deg) translateZ(${depth / 2}px)`,
                            transformOrigin: 'top',
                          }}
                        />
                      )}
                      
                      {/* Side Face */}
                      {renderMode !== 'wireframe' && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: color,
                            opacity: 0.6,
                            transform: `rotateY(90deg) translateZ(${depth / 2}px)`,
                            transformOrigin: 'right',
                            width: `${depth}px`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* View Mode Indicator */}
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <p className="text-xs text-white font-medium">{viewMode.toUpperCase()}</p>
        </div>

        {/* Render Mode Indicator */}
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <p className="text-xs text-white font-medium">{renderMode.toUpperCase()}</p>
        </div>

        {/* Element Count */}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <p className="text-xs text-white">
            {elements.length} Element{elements.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats */}
      {elements.length > 0 && (
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#2A2A2A]">
          {['beam', 'column', 'foundation', 'slab'].map((type) => {
            const count = elements.filter(e => e.type === type).length;
            return (
              <div key={type} className="text-center">
                <p className="text-xs text-gray-400 capitalize">{type}s</p>
                <p className="text-lg font-bold text-white">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Export Options */}
      <div className="pt-3 border-t border-[#2A2A2A]">
        <button className="w-full px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <Box className="w-4 h-4" />
          Export 3D Model
        </button>
      </div>
    </div>
  );
}
