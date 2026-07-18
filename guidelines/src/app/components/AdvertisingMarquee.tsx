import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { adFrequencyController } from '../utils/adFrequencyController';

interface Advertisement {
  id: string;
  type: string;
  title: string;
  content: string;
  linkUrl?: string;
  placement: string[];
  isActive: boolean;
  priority: number;
  clickCount?: number;
}

interface AdvertisingMarqueeProps {
  placement?: string;
  dismissible?: boolean;
}

export default function AdvertisingMarquee({ 
  placement = 'subcontractor-portal', 
  dismissible = false 
}: AdvertisingMarqueeProps) {
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
    // Rotate through ads every 8 seconds
    if (advertisements.length > 1) {
      const rotateInterval = setInterval(() => {
        setCurrentAdIndex(prev => (prev + 1) % advertisements.length);
      }, 8000);
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
            if (!ad.isActive || ad.type !== 'marquee') return false;
            if (!ad.placement || !Array.isArray(ad.placement)) return false;
            if (!ad.placement.includes(placement)) return false;
            
            // Check if ad can be displayed based on subscription
            const { allowed } = adFrequencyController.canDisplayAd(ad.id);
            if (!allowed) {
              console.log(`Ad ${ad.id} (${ad.title}) blocked by frequency controller`);
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
      console.error('Error loading marquee advertisements:', error);
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

  return (
    <div className="relative bg-gradient-to-r from-[#ea580c] via-[#dc4a08] to-[#ea580c] text-white overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="py-1.5 px-4"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div 
              className={`text-center ${currentAd.linkUrl ? 'cursor-pointer' : ''}`}
              onClick={() => currentAd.linkUrl && handleAdClick(currentAd)}
            >
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{currentAd.title}</span>
                <span className="text-white/90 text-sm">{currentAd.content}</span>
                {currentAd.linkUrl && (
                  <span className="underline font-semibold text-sm">Learn More →</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dismiss Button */}
      {dismissible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="absolute top-1/2 -translate-y-1/2 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Progress Indicator for Multiple Ads */}
      {advertisements.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
          <motion.div
            key={currentAdIndex}
            className="h-full bg-white"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 8, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}