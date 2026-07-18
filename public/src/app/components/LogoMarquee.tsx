import { useState, useEffect } from 'react';

interface Logo {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl?: string;
}

interface LogoMarqueeProps {
  speed?: number; // duration in seconds
}

export default function LogoMarquee({ speed = 40 }: LogoMarqueeProps) {
  const [logos, setLogos] = useState<Logo[]>([]);

  useEffect(() => {
    loadLogos();

    // Listen for storage changes to update logos in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'partnerLogos') {
        loadLogos();
      }
    };

    // Listen for custom event from PartnerLogoManager
    const handleLogoUpdate = () => {
      loadLogos();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('partnerLogosUpdated', handleLogoUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('partnerLogosUpdated', handleLogoUpdate);
    };
  }, []);

  const loadLogos = () => {
    try {
      const saved = localStorage.getItem('partnerLogos');
      if (saved) {
        const allLogos: Logo[] = JSON.parse(saved);
        setLogos(allLogos);
      } else {
        // Set default partner logos
        const defaultLogos: Logo[] = [
          { id: '1', name: 'DeWalt', imageUrl: 'https://images.unsplash.com/photo-1588783948922-0c6e1c6a7c9c?w=200&h=80&fit=crop' },
          { id: '2', name: 'Milwaukee', imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=80&fit=crop' },
          { id: '3', name: 'Makita', imageUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=200&h=80&fit=crop' },
          { id: '4', name: 'Bosch', imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200&h=80&fit=crop' },
          { id: '5', name: 'Stanley', imageUrl: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=200&h=80&fit=crop' },
        ];
        setLogos(defaultLogos);
      }
    } catch (error) {
      console.error('Error loading partner logos:', error);
      localStorage.removeItem('partnerLogos');
    }
  };

  if (logos.length === 0) {
    return null;
  }

  // Duplicate logos 4 times for ultra-smooth infinite scroll
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  return (
    <section className="bg-[#0A0A0A] border-y border-gray-800 py-2 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-1">
        <p className="text-center text-xs text-gray-500 uppercase tracking-wider font-semibold">
          We Work With Trusted Brands
        </p>
      </div>

      <div className="relative overflow-hidden">
        {/* Wrapper div for seamless infinite scroll */}
        <div className="marquee-wrapper">
          <div className="marquee-content">
            {duplicatedLogos.map((logo, index) => (
              <div
                key={`${logo.id}-${index}`}
                className="marquee-item"
              >
                {logo.linkUrl ? (
                  <a
                    href={logo.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full flex items-center justify-center"
                  >
                    <img
                      src={logo.imageUrl}
                      alt={logo.name}
                      className="max-w-full max-h-full object-contain opacity-60 hover:opacity-100 transition-opacity filter grayscale hover:grayscale-0"
                      style={{ display: 'block' }}
                    />
                  </a>
                ) : (
                  <img
                    src={logo.imageUrl}
                    alt={logo.name}
                    className="max-w-full max-h-full object-contain opacity-60 filter grayscale"
                    style={{ display: 'block' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent pointer-events-none z-10" />
      </div>

      <style>{`
        .marquee-wrapper {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .marquee-content {
          display: flex;
          animation: scroll-infinite ${speed}s linear infinite;
          will-change: transform;
        }

        .marquee-item {
          flex-shrink: 0;
          width: 200px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 32px;
        }

        @keyframes scroll-infinite {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-25%);
          }
        }

        /* Ensure smooth animation with no stuttering */
        .marquee-content {
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}</style>
    </section>
  );
}