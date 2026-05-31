import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import { adFrequencyController } from '../utils/adFrequencyController';

interface Advertisement {
  id: string;
  type: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  placement: string[];
  isActive: boolean;
  priority: number;
}

interface AdvertisingBannerProps {
  placement: string;
  dismissible?: boolean;
  variant?: 'horizontal' | 'vertical' | 'square';
}

export default function AdvertisingBanner({ 
  placement, 
  dismissible = false,
  variant = 'horizontal'
}: AdvertisingBannerProps) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    loadAdvertisements();
    
    // Reload ads every 30 seconds
    const interval = setInterval(loadAdvertisements, 30000);
    return () => clearInterval(interval);
  }, [placement]);

  useEffect(() => {
    // Rotate through ads every 15 seconds
    if (advertisements.length > 1) {
      const rotateInterval = setInterval(() => {
        setCurrentAdIndex(prev => (prev + 1) % advertisements.length);
      }, 15000);
      return () => clearInterval(rotateInterval);
    }
  }, [advertisements]);

  const loadAdvertisements = () => {
    try {
      const saved = localStorage.getItem('advertisements');
      if (saved) {
        const allAds: Advertisement[] = JSON.parse(saved);
        
        // Filter ads for this placement and check subscription/frequency limits
        const relevantAds = allAds
          .filter(ad => {
            if (!ad.isActive || ad.type !== 'banner') return false;
            if (!ad.placement || !Array.isArray(ad.placement)) return false;
            if (!ad.placement.includes(placement)) return false;
            
            // Check if ad can be displayed based on subscription
            const { allowed } = adFrequencyController.canDisplayAd(ad.id);
            if (!allowed) {
              console.log(`Ad ${ad.id} (${ad.title}) blocked:`, allowed);
              return false;
            }
            
            return true;
          })
          .sort((a, b) => b.priority - a.priority);
        
        setAdvertisements(relevantAds);
        
        // Track impressions
        if (relevantAds.length > 0) {
          relevantAds.forEach(ad => {
            window.dispatchEvent(new CustomEvent('adImpression', {
              detail: { adId: ad.id, placement }
            }));
          });
        }
      }
    } catch (error) {
      console.error('Error loading advertisements:', error);
      // Clear corrupted data
      localStorage.removeItem('advertisements');
    }
  };

  const handleAdClick = (ad: Advertisement) => {
    // Track click
    try {
      const saved = localStorage.getItem('advertisements');
      if (saved) {
        const allAds: Advertisement[] = JSON.parse(saved);
        const updatedAds = allAds.map(a => 
          a.id === ad.id 
            ? { ...a, clickCount: (a.clickCount || 0) + 1 }
            : a
        );
        localStorage.setItem('advertisements', JSON.stringify(updatedAds));
      }
    } catch (error) {
      console.error('Error tracking ad click:', error);
    }
    
    // Navigate
    if (ad.linkUrl) {
      if (ad.linkUrl.startsWith('http')) {
        window.open(ad.linkUrl, '_blank');
      } else {
        window.location.href = ad.linkUrl;
      }
    }
  };

  if (isDismissed || advertisements.length === 0) {
    return null;
  }

  const currentAd = advertisements[currentAdIndex];

  const variantClasses = {
    horizontal: 'aspect-[4/1]',
    vertical: 'aspect-[1/2]',
    square: 'aspect-square'
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          onClick={() => handleAdClick(currentAd)}
          className={`bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-800 ${
            currentAd.linkUrl ? 'cursor-pointer hover:border-[#ea580c] transition-colors' : ''
          } ${variantClasses[variant]}`}
        >
          {currentAd.imageUrl ? (
            <div className="relative h-full">
              <img
                src={currentAd.imageUrl}
                alt={currentAd.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl md:text-2xl font-bold mb-2 text-white">{currentAd.title}</h3>
                  <p className="text-gray-200 mb-3 line-clamp-2">{currentAd.content}</p>
                  {currentAd.linkUrl && (
                    <div className="flex items-center gap-2 text-[#ea580c] font-semibold">
                      <span>Learn More</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#ea580c] to-[#dc4a08]">
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-white">{currentAd.title}</h3>
              <p className="text-white/90 mb-4 text-lg">{currentAd.content}</p>
              {currentAd.linkUrl && (
                <div className="px-6 py-2 bg-white text-[#ea580c] rounded-lg font-semibold inline-flex items-center gap-2">
                  <span>Learn More</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              )}
            </div>
          )}

          {dismissible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Indicator Dots */}
      {advertisements.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {advertisements.map((ad, index) => (
            <button
              key={ad.id}
              onClick={() => setCurrentAdIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentAdIndex 
                  ? 'bg-[#ea580c] w-6' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to ad ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
