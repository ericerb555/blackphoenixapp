import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface Logo {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl?: string;
}

interface LogoMarqueeProps {
  speed?: number; // pixels per second
}

export default function LogoMarquee({ speed = 30 }: LogoMarqueeProps) {
  const [logos, setLogos] = useState<Logo[]>([]);

  useEffect(() => {
    loadLogos();
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

  // Duplicate logos for seamless loop
  const duplicatedLogos = [...logos, ...logos];

  return (
    <section className="bg-[#0A0A0A] border-y border-gray-800 py-2 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-1">
        <p className="text-center text-xs text-gray-500 uppercase tracking-wider font-semibold">
          We Work With Trusted Brands
        </p>
      </div>
      
      <div className="relative overflow-hidden">
        <motion.div
          className="flex gap-12 items-center"
          animate={{
            x: [0, -logos.length * 200],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: logos.length * (200 / speed),
              ease: "linear",
            },
          }}
        >
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`${logo.id}-${index}`}
              className="flex-shrink-0 w-[180px] h-[80px] flex items-center justify-center"
            >
              {logo.linkUrl ? (
                <a
                  href={logo.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={logo.imageUrl}
                    alt={logo.name}
                    className="max-w-full max-h-full object-contain opacity-60 hover:opacity-100 transition-opacity filter grayscale hover:grayscale-0"
                  />
                </a>
              ) : (
                <img
                  src={logo.imageUrl}
                  alt={logo.name}
                  className="max-w-full max-h-full object-contain opacity-60 filter grayscale"
                />
              )}
            </div>
          ))}
        </motion.div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent pointer-events-none" />
      </div>
    </section>
  );
}