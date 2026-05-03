// Enhanced Image Gallery with Zoom, 360° Spin, and Video
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  RotateCw,
  Download,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  Video,
  Image as ImageIcon,
  Expand
} from 'lucide-react';

interface MediaItem {
  type: 'image' | 'video' | '360';
  url: string;
  thumbnail?: string;
  alt?: string;
}

interface EnhancedImageGalleryProps {
  media: MediaItem[];
  productName: string;
}

export default function EnhancedImageGallery({ media, productName }: EnhancedImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rotation360, setRotation360] = useState(0);
  const [isDragging360, setIsDragging360] = useState(false);
  
  const imageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragStartX = useRef(0);

  const currentMedia = media[selectedIndex];

  // Handle mouse move for zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomPosition({ x, y });
  };

  // Handle 360° drag
  const handle360Drag = (e: MouseEvent | TouchEvent, info: PanInfo) => {
    if (currentMedia.type !== '360') return;
    
    const delta = info.delta.x;
    setRotation360(prev => (prev + delta) % 360);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : media.length - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex(prev => (prev < media.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media.length, isFullscreen]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newLevel = Math.max(prev - 0.5, 1);
      if (newLevel === 1) setIsZoomed(false);
      return newLevel;
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Check out ${productName}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  const handleDownload = () => {
    if (currentMedia.type === 'image') {
      const link = document.createElement('a');
      link.href = currentMedia.url;
      link.download = `${productName.replace(/\s+/g, '-')}-${selectedIndex + 1}.jpg`;
      link.click();
    }
  };

  const renderMedia = () => {
    switch (currentMedia.type) {
      case 'video':
        return (
          <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              src={currentMedia.url}
              className="w-full h-full object-contain"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {!isPlaying && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                onClick={() => videoRef.current?.play()}
                className="absolute inset-0 m-auto w-20 h-20 bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl"
              >
                <Play className="w-10 h-10 text-purple-600 ml-1" />
              </motion.button>
            )}
          </div>
        );

      case '360':
        return (
          <motion.div
            ref={imageRef}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDrag={handle360Drag}
            onDragStart={() => setIsDragging360(true)}
            onDragEnd={() => setIsDragging360(false)}
            className="relative w-full h-full cursor-grab active:cursor-grabbing"
          >
            <img
              src={currentMedia.url}
              alt={currentMedia.alt || productName}
              className="w-full h-full object-contain"
              style={{
                transform: `rotate(${rotation360}deg)`,
                transition: isDragging360 ? 'none' : 'transform 0.1s'
              }}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-purple-500/20 backdrop-blur-xl border border-purple-500/30 rounded-full flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-sm font-bold text-purple-400">Drag to rotate 360°</span>
            </div>
          </motion.div>
        );

      case 'image':
      default:
        return (
          <motion.div
            ref={imageRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => !isFullscreen && setIsZoomed(false)}
            className="relative w-full h-full overflow-hidden cursor-crosshair"
            animate={{
              scale: zoomLevel
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <img
              src={currentMedia.url}
              alt={currentMedia.alt || productName}
              className="w-full h-full object-contain"
              style={isZoomed ? {
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
              } : undefined}
            />
            
            {isZoomed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 pointer-events-none"
              >
                <div className="absolute w-32 h-32 border-2 border-cyan-400 rounded-full"
                  style={{
                    left: `${zoomPosition.x}%`,
                    top: `${zoomPosition.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        );
    }
  };

  const GalleryContent = () => (
    <div className={`flex flex-col ${isFullscreen ? 'h-screen' : 'h-full'}`}>
      {/* Main Display */}
      <div className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden ${
        isFullscreen ? 'flex-1' : 'aspect-square'
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {renderMedia()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <motion.button
              whileHover={{ scale: 1.1, x: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedIndex(prev => (prev > 0 ? prev - 1 : media.length - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-full flex items-center justify-center text-white hover:border-cyan-500/50 transition-all shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, x: 4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedIndex(prev => (prev < media.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-full flex items-center justify-center text-white hover:border-cyan-500/50 transition-all shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          </>
        )}

        {/* Control Bar */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {currentMedia.type === 'image' && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-2.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg text-cyan-400 hover:border-cyan-500/50 transition-all disabled:opacity-50"
              >
                <ZoomIn className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-2.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg text-cyan-400 hover:border-cyan-500/50 transition-all disabled:opacity-50"
              >
                <ZoomOut className="w-5 h-5" />
              </motion.button>
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg text-cyan-400 hover:border-cyan-500/50 transition-all"
          >
            {isFullscreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </motion.button>

          {currentMedia.type === 'image' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDownload}
              className="p-2.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg text-cyan-400 hover:border-cyan-500/50 transition-all"
            >
              <Download className="w-5 h-5" />
            </motion.button>
          )}

          {navigator.share && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="p-2.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-lg text-cyan-400 hover:border-cyan-500/50 transition-all"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Media Type Badge */}
        <div className="absolute top-4 left-4">
          <div className="px-3 py-1.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-full flex items-center gap-2">
            {currentMedia.type === 'video' ? (
              <>
                <Video className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400">VIDEO</span>
              </>
            ) : currentMedia.type === '360' ? (
              <>
                <RotateCw className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-400">360° VIEW</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400">HD IMAGE</span>
              </>
            )}
          </div>
        </div>

        {/* Image Counter */}
        <div className="absolute top-4 right-4">
          <div className="px-3 py-1.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-full">
            <span className="text-xs font-bold text-white">
              {selectedIndex + 1} / {media.length}
            </span>
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      {!isFullscreen && media.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-slate-800">
          {media.map((item, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedIndex(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all ${
                selectedIndex === index
                  ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900'
                  : 'ring-1 ring-slate-700 hover:ring-cyan-500/50'
              }`}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <Play className="w-6 h-6 text-cyan-400" />
                </div>
              ) : (
                <img
                  src={item.thumbnail || item.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              
              {item.type === '360' && (
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/50 to-transparent flex items-end justify-center pb-1">
                  <RotateCw className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {!isFullscreen ? (
        <GalleryContent />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl p-8"
        >
          <GalleryContent />
        </motion.div>
      )}
    </>
  );
}
