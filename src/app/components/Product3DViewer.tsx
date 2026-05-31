// Interactive 3D Product Model Viewer
import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  RotateCw,
  Maximize2,
  Minimize2,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Box,
  Eye,
  Layers
} from 'lucide-react';

interface Product3DViewerProps {
  modelUrl?: string;
  productName: string;
  fallbackImage?: string;
}

export default function Product3DViewer({ modelUrl, productName, fallbackImage }: Product3DViewerProps) {
  const [rotation, setRotation] = useState({ x: 20, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoRotate) return;

    const interval = setInterval(() => {
      setRotation(prev => ({
        ...prev,
        y: (prev.y + 0.5) % 360
      }));
    }, 30);

    return () => clearInterval(interval);
  }, [isAutoRotate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsAutoRotate(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x - deltaY * 0.5)),
      y: (prev.y + deltaX * 0.5) % 360
    }));

    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const resetView = () => {
    setRotation({ x: 20, y: 45 });
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setIsAutoRotate(true);
  };

  // If no 3D model, show fallback with pseudo-3D effect
  if (!modelUrl) {
    return (
      <div className="relative aspect-square bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {fallbackImage ? (
            <motion.img
              src={fallbackImage}
              alt={productName}
              className="w-3/4 h-3/4 object-contain"
              animate={{
                rotateY: rotation.y,
                rotateX: rotation.x,
                scale: zoom
              }}
              style={{ transformStyle: 'preserve-3d' }}
            />
          ) : (
            <div className="text-center">
              <Box className="w-20 h-20 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">3D model not available</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-full">
          <span className="text-xs font-bold text-slate-400">Interactive 3D View Coming Soon</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 3D Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="relative aspect-square bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Simulated 3D Environment */}
        <div className="absolute inset-0 flex items-center justify-center perspective-1000">
          <motion.div
            className="relative w-3/4 h-3/4"
            animate={{
              rotateY: rotation.y,
              rotateX: rotation.x,
              scale: zoom,
              x: position.x,
              y: position.y
            }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            style={{
              transformStyle: 'preserve-3d',
              transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`
            }}
          >
            {/* 3D Model Placeholder - In production, use Three.js or similar */}
            <div className={`w-full h-full rounded-2xl flex items-center justify-center ${
              wireframe ? 'border-4 border-cyan-500' : 'bg-gradient-to-br from-cyan-500/20 to-purple-600/20'
            }`}>
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-40 h-40 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-3xl shadow-2xl shadow-purple-500/50"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="absolute inset-4 bg-slate-900/50 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                    <Box className="w-16 h-16 text-cyan-400" />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Grid Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              transform: 'perspective(500px) rotateX(60deg)',
              transformOrigin: 'bottom'
            }}
          />
        </div>

        {/* Lighting Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-radial from-white/10 via-transparent to-transparent pointer-events-none blur-3xl" />

        {/* Auto-rotate indicator */}
        {isAutoRotate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-purple-500/20 backdrop-blur-xl border border-purple-500/30 rounded-full flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-xs font-bold text-purple-400">Auto-rotating</span>
          </motion.div>
        )}
      </div>

      {/* Control Panel */}
      <div className="mt-4 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold text-white">3D Controls</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetView}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-cyan-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Zoom Controls */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Zoom</label>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-cyan-400 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </motion.button>
              <div className="flex-1 text-center text-xs font-bold text-white">
                {Math.round(zoom * 100)}%
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-cyan-400 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Rotation</label>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsAutoRotate(!isAutoRotate)}
                className={`flex-1 p-2 rounded-lg text-xs font-semibold transition-colors ${
                  isAutoRotate
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                Auto
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setWireframe(!wireframe)}
                className={`flex-1 p-2 rounded-lg text-xs font-semibold transition-colors ${
                  wireframe
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                Wire
              </motion.button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-cyan-400" />
              <span>Drag to rotate</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Scroll to zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-cyan-400" />
              <span>Auto-rotate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Note */}
      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-xs text-blue-300">
          💡 <strong>Note:</strong> This is a demo 3D viewer. In production, integrate Three.js, Babylon.js, or Model Viewer for full WebGL-powered 3D models with realistic lighting and materials.
        </p>
      </div>
    </div>
  );
}
