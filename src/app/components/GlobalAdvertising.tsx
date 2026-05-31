import { useState, useEffect } from 'react';
import AdvertisingMarquee from './AdvertisingMarquee';

/**
 * GlobalAdvertising Component
 * 
 * This component automatically loads and displays ads marked for "all-pages" placement.
 * It shows as a floating bar at the top or bottom of the viewport.
 * 
 * Usage: Add once to your App.tsx or layout component:
 * <GlobalAdvertising position="top" />
 */

interface GlobalAdvertisingProps {
  position?: 'top' | 'bottom';
}

export default function GlobalAdvertising({ position = 'top' }: GlobalAdvertisingProps) {
  const [hasAds, setHasAds] = useState(false);

  useEffect(() => {
    checkForAds();
    
    // Re-check every 30 seconds
    const interval = setInterval(checkForAds, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkForAds = () => {
    try {
      const saved = localStorage.getItem('advertisements');
      if (saved) {
        const allAds = JSON.parse(saved);
        const globalAds = allAds.filter((ad: any) => 
          ad.isActive && 
          ad.type === 'marquee' &&
          ad.placement &&
          Array.isArray(ad.placement) &&
          ad.placement.includes('all-pages')
        );
        setHasAds(globalAds.length > 0);
      } else {
        setHasAds(false);
      }
    } catch (error) {
      console.error('Error checking for global ads:', error);
      setHasAds(false);
      localStorage.removeItem('advertisements');
    }
  };

  if (!hasAds) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-0' 
    : 'bottom-0';

  return (
    <div className={`fixed left-0 right-0 ${positionClasses} z-[100]`}>
      <AdvertisingMarquee placement="all-pages" dismissible />
    </div>
  );
}
