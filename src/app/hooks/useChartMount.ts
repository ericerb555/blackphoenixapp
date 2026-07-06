import { useState, useEffect, useRef } from 'react';

/**
 * Hook to safely mount Recharts components only when their container has proper dimensions
 * This prevents the "width(-1) and height(-1)" error
 */
export function useChartMount(dependencies: any[] = []) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(false);

    const checkDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        
        // Only mount if container has valid dimensions
        if (offsetWidth > 0 && offsetHeight > 0) {
          setMounted(true);
          return true;
        }
      }
      return false;
    };

    // Try immediately
    if (checkDimensions()) {
      return;
    }

    // If not ready, use multiple fallback strategies
    const timers: NodeJS.Timeout[] = [];

    // Strategy 1: Quick check after next paint
    timers.push(setTimeout(() => {
      if (!checkDimensions()) {
        // Strategy 2: Check after a short delay
        timers.push(setTimeout(() => {
          if (!checkDimensions()) {
            // Strategy 3: Final check with longer delay
            timers.push(setTimeout(() => {
              checkDimensions();
            }, 200));
          }
        }, 100));
      }
    }, 50));

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, dependencies);

  return { mounted, containerRef };
}
