/**
 * Advertising Video Reel Component
 * 
 * Displays video advertisements in a TikTok/Instagram Reels style
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Volume2, VolumeX, X, ChevronUp, ChevronDown,
  Heart, Share2, ExternalLink
} from 'lucide-react';

interface VideoReel {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  advertiser: {
    name: string;
    logo?: string;
  };
  linkUrl?: string;
  placement: string[];
  isActive: boolean;
  priority: number;
}

interface AdvertisingVideoReelProps {
  placement?: string;
  maxVideos?: number;
  autoPlay?: boolean;
}

export default function AdvertisingVideoReel({ 
  placement = 'employee-portal',
  maxVideos = 5,
  autoPlay = false
}: AdvertisingVideoReelProps) {
  const [videos, setVideos] = useState<VideoReel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadVideos();
  }, [placement]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const loadVideos = () => {
    try {
      const saved = localStorage.getItem('videoReels');
      if (saved) {
        const allVideos: VideoReel[] = JSON.parse(saved);
        const relevantVideos = allVideos
          .filter(video => 
            video.isActive && 
            video.placement?.includes(placement)
          )
          .sort((a, b) => b.priority - a.priority)
          .slice(0, maxVideos);
        
        setVideos(relevantVideos);
        if (relevantVideos.length > 0) {
          trackImpression(relevantVideos[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading video reels:', error);
    }
  };

  const trackImpression = (videoId: string) => {
    window.dispatchEvent(new CustomEvent('videoImpression', {
      detail: { videoId, placement }
    }));
  };

  const trackClick = (videoId: string) => {
    window.dispatchEvent(new CustomEvent('videoClick', {
      detail: { videoId, placement }
    }));
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      trackImpression(videos[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      trackImpression(videos[currentIndex - 1].id);
    }
  };

  const handleVideoClick = (url?: string) => {
    if (url) {
      trackClick(currentVideo.id);
      window.open(url, '_blank');
    }
  };

  if (videos.length === 0) return null;

  const currentVideo = videos[currentIndex];

  // Compact mode - small widget in corner
  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <div className="relative group">
          <button
            onClick={() => setIsExpanded(true)}
            className="relative w-24 h-40 rounded-2xl overflow-hidden border-2 border-orange-500/30 hover:border-orange-500 transition-all duration-300 shadow-lg hover:shadow-orange-500/50"
          >
            <img
              src={currentVideo.thumbnailUrl}
              alt={currentVideo.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
              <div className="flex items-center justify-center mb-1">
                <Play className="w-6 h-6 text-white" fill="white" />
              </div>
              <p className="text-white text-[10px] font-semibold text-center leading-tight">
                {currentVideo.title}
              </p>
            </div>
            <div className="absolute top-2 right-2">
              <div className="bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                AD
              </div>
            </div>
          </button>
          
          {videos.length > 1 && (
            <div className="absolute -top-2 -left-2 bg-orange-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
              {videos.length}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Expanded mode - fullscreen reel viewer
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <button
            onClick={() => {
              setIsExpanded(false);
              setIsPlaying(false);
            }}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-md w-full h-full max-h-[90vh] bg-black rounded-none md:rounded-2xl overflow-hidden">
            <video
              ref={videoRef}
              src={currentVideo.videoUrl}
              poster={currentVideo.thumbnailUrl}
              className="w-full h-full object-cover"
              loop
              playsInline
              onClick={() => setIsPlaying(!isPlaying)}
            />

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pointer-events-auto">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg mb-1">{currentVideo.title}</h3>
                    <p className="text-white/80 text-sm mb-2 line-clamp-2">{currentVideo.description}</p>
                    <div className="flex items-center gap-2">
                      {currentVideo.advertiser.logo && (
                        <img
                          src={currentVideo.advertiser.logo}
                          alt={currentVideo.advertiser.name}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-white/60 text-xs font-medium">{currentVideo.advertiser.name}</span>
                      {currentVideo.linkUrl && (
                        <button
                          onClick={() => handleVideoClick(currentVideo.linkUrl)}
                          className="ml-auto px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-full transition-colors flex items-center gap-1"
                        >
                          Learn More
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <button className="flex flex-col items-center gap-1 text-white hover:text-orange-400 transition-colors">
                      <Heart className="w-7 h-7" />
                    </button>
                    <button className="flex flex-col items-center gap-1 text-white hover:text-orange-400 transition-colors">
                      <Share2 className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              </div>

              {!isPlaying && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={() => setIsPlaying(true)}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white pointer-events-auto hover:bg-white/30 transition-colors"
                >
                  <Play className="w-10 h-10 ml-1" fill="white" />
                </motion.button>
              )}
            </div>

            {currentIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="absolute top-1/2 -translate-y-1/2 left-4 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
            )}
            {currentIndex < videos.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute top-1/2 -translate-y-1/2 right-4 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            )}

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute top-20 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <div className="absolute top-4 left-4 right-20 flex gap-1">
              {videos.map((_, index) => (
                <div
                  key={index}
                  className={`h-0.5 flex-1 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white'
                      : index < currentIndex
                      ? 'bg-white/50'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}