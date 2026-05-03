// AR Try-On and Visualization Features
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Maximize2,
  RotateCw,
  Move,
  Smartphone,
  Scan,
  Download,
  Share2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap,
  Eye
} from 'lucide-react';

interface ARVisualizationProps {
  productName: string;
  productImage: string;
  category: string;
}

export default function ARVisualization({ productName, productImage, category }: ARVisualizationProps) {
  const [arMode, setArMode] = useState<'off' | 'room' | 'hand'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Check if AR is supported (WebXR)
  const isARSupported = 'xr' in navigator;

  const handleStartAR = async (mode: 'room' | 'hand') => {
    setArMode(mode);
    setIsCapturing(true);

    // Simulate AR initialization
    setTimeout(() => {
      setIsCapturing(false);
    }, 2000);
  };

  const handleCapture = () => {
    // Simulate capture
    setCapturedImage(productImage);
  };

  const handleShare = async () => {
    if (capturedImage && navigator.share) {
      try {
        await navigator.share({
          title: `${productName} - AR Preview`,
          text: `Check out how ${productName} looks!`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (arMode === 'off') {
    return (
      <div className="space-y-4">
        {/* AR Feature Card */}
        <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Try in AR</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                See how {productName} looks in your space or in your hands using augmented reality
              </p>
            </div>
          </div>

          {!isARSupported ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-300 mb-2">
                  AR features require a compatible device with camera access
                </p>
                <p className="text-xs text-yellow-400">
                  Try on a modern smartphone or tablet for the best experience
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Room Placement */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartAR('room')}
                className="group relative overflow-hidden bg-slate-900/50 hover:bg-slate-900 border border-cyan-500/20 hover:border-cyan-500/50 rounded-xl p-6 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                
                <div className="relative">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
                    <Scan className="w-6 h-6 text-cyan-400" />
                  </div>
                  
                  <h4 className="text-lg font-bold text-white mb-2">View in Your Space</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Place and visualize the product in your room using your device camera
                  </p>
                  
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-cyan-400">
                    <Zap className="w-4 h-4" />
                    <span>Start AR Experience</span>
                  </div>
                </div>
              </motion.button>

              {/* Hand View */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartAR('hand')}
                className="group relative overflow-hidden bg-slate-900/50 hover:bg-slate-900 border border-purple-500/20 hover:border-purple-500/50 rounded-xl p-6 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                
                <div className="relative">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-purple-400" />
                  </div>
                  
                  <h4 className="text-lg font-bold text-white mb-2">Hold in Hand</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    See the actual size and scale by holding the virtual product in your hand
                  </p>
                  
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-purple-400">
                    <Zap className="w-4 h-4" />
                    <span>Start AR Experience</span>
                  </div>
                </div>
              </motion.button>
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/30 backdrop-blur-xl border border-cyan-500/10 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Eye className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="font-semibold text-white text-sm">True Scale</span>
            </div>
            <p className="text-xs text-slate-400">View products at actual size</p>
          </div>

          <div className="p-4 bg-slate-900/30 backdrop-blur-xl border border-cyan-500/10 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <RotateCw className="w-4 h-4 text-purple-400" />
              </div>
              <span className="font-semibold text-white text-sm">360° View</span>
            </div>
            <p className="text-xs text-slate-400">Rotate and inspect from all angles</p>
          </div>

          <div className="p-4 bg-slate-900/30 backdrop-blur-xl border border-cyan-500/10 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Camera className="w-4 h-4 text-green-400" />
              </div>
              <span className="font-semibold text-white text-sm">Capture & Share</span>
            </div>
            <p className="text-xs text-slate-400">Save and share your AR views</p>
          </div>
        </div>
      </div>
    );
  }

  // AR Active View
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* AR Camera View Simulation */}
      <div className="relative w-full h-full">
        {/* Camera Feed Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {isCapturing ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full mx-auto mb-4"
                />
                <p className="text-white font-semibold">Initializing AR...</p>
                <p className="text-slate-400 text-sm mt-2">Please point your camera at a flat surface</p>
              </div>
            </div>
          ) : (
            <>
              {/* AR Grid Overlay */}
              <div className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(6, 182, 212, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.2) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }}
              />

              {/* Virtual Product */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64"
              >
                <div className="relative w-full h-full">
                  <img
                    src={productImage}
                    alt={productName}
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                  
                  {/* AR Anchor Points */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
                </div>
              </motion.div>

              {/* AR Status Info */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                <div className="px-4 py-2 bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-white font-semibold text-sm">AR Active</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setArMode('off')}
                  className="p-3 bg-red-500/80 backdrop-blur-xl rounded-full text-white"
                >
                  <AlertCircle className="w-5 h-5" />
                </motion.button>
              </div>

              {/* AR Controls */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCapture}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-cyan-400"
                >
                  <Camera className="w-8 h-8 text-slate-900" />
                </motion.button>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-full text-white"
                  >
                    <RotateCw className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-full text-white"
                  >
                    <Move className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-full text-white"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Instructions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute bottom-32 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/70 backdrop-blur-xl border border-cyan-500/30 rounded-full"
              >
                <p className="text-white text-sm font-semibold text-center">
                  {arMode === 'room' ? 'Move your device to place the product' : 'Hold steady to view the product'}
                </p>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Captured Image Preview */}
      <AnimatePresence>
        {capturedImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-10"
          >
            <div className="max-w-2xl w-full mx-4">
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="bg-slate-900 border border-cyan-500/20 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h3 className="text-xl font-bold text-white">AR Capture Saved!</h3>
                </div>

                <img
                  src={capturedImage}
                  alt="AR Capture"
                  className="w-full rounded-xl mb-4"
                />

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCapturedImage(null)}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition-colors"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
