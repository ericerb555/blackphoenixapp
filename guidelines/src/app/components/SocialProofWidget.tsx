import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Star, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SocialEvent {
  id: string;
  type: 'purchase' | 'review' | 'viewing';
  name: string;
  city: string;
  product: string;
  productImg: string;
  ago: string;
  rating?: number;
}

const NAMES = [
  'Marcus T.','Sarah K.','Jamie R.','Devon M.','Priya S.','Alex W.','Jordan B.',
  'Taylor N.','Chris L.','Morgan F.','Riley H.','Casey P.','Drew S.','Quinn O.',
  'Blake M.','Avery J.','Parker C.','Reese D.','Finley A.','Cameron G.',
];

const CITIES = [
  'Columbus, OH','Dublin, OH','Westerville, OH','Grove City, OH','Gahanna, OH',
  'Hilliard, OH','Powell, OH','Lewis Center, OH','Pickerington, OH','Newark, OH',
  'Marion, OH','Delaware, OH','Marysville, OH','Lancaster, OH','Circleville, OH',
];

const PRODUCTS = [
  { name: 'Wireless Headphones', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&q=70' },
  { name: 'Water Bottle (32oz)', img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=80&q=70' },
  { name: 'LED Strip Lights', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&q=70' },
  { name: 'Cordless Drill Set', img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=80&q=70' },
  { name: 'Air Fryer (5.8Qt)', img: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=80&q=70' },
  { name: 'Bluetooth Speaker', img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=80&q=70' },
  { name: 'Yoga Mat', img: 'https://images.unsplash.com/photo-1601925228010-7c09e48f2be3?w=80&q=70' },
  { name: 'Graphic Hoodie', img: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=80&q=70' },
  { name: 'Vitamin C Gummies', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=80&q=70' },
  { name: 'Mechanical Keyboard', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=80&q=70' },
  { name: 'Home Bundle Kit', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&q=70' },
  { name: 'Tech Starter Bundle', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&q=70' },
];

const AGO = ['just now','1 min ago','2 min ago','3 min ago','5 min ago','7 min ago','12 min ago'];

const TYPES: SocialEvent['type'][] = ['purchase','purchase','purchase','purchase','review','viewing'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function makeEvent(): SocialEvent {
  const product = pick(PRODUCTS);
  const type = pick(TYPES);
  return {
    id: crypto.randomUUID(),
    type,
    name: pick(NAMES),
    city: pick(CITIES),
    product: product.name,
    productImg: product.img,
    ago: type === 'viewing' ? 'right now' : pick(AGO),
    rating: type === 'review' ? (Math.random() > 0.15 ? 5 : 4) : undefined,
  };
}

const INTERVAL_MS = 8000; // new notification every 8 seconds
const DISPLAY_MS  = 5500; // each notification visible for 5.5 seconds

export default function SocialProofWidget() {
  const [current, setCurrent] = useState<SocialEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const showTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Initial delay before first popup
    const init = setTimeout(() => showNext(), 4000);
    return () => {
      clearTimeout(init);
      clearTimeout(hideTimer.current);
      clearTimeout(showTimer.current);
    };
  }, []);

  function showNext() {
    setCurrent(makeEvent());
    setVisible(true);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      showTimer.current = setTimeout(showNext, INTERVAL_MS);
    }, DISPLAY_MS);
  }

  const iconMap = {
    purchase: <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />,
    review:   <Star className="w-3.5 h-3.5 text-yellow-400" />,
    viewing:  <MapPin className="w-3.5 h-3.5 text-blue-400" />,
  };

  const labelMap = {
    purchase: (e: SocialEvent) => <><span className="font-black text-white">{e.name}</span> from {e.city} purchased</>,
    review:   (e: SocialEvent) => <><span className="font-black text-white">{e.name}</span> left a {e.rating}⭐ review for</>,
    viewing:  (e: SocialEvent) => <><span className="font-black text-white">{e.name}</span> from {e.city} is viewing</>,
  };

  if (!current) return null;

  return (
    <div className="fixed bottom-24 left-4 z-40 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={current.id}
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="pointer-events-auto flex items-center gap-3 px-3.5 py-3 rounded-2xl shadow-2xl max-w-[280px]"
            style={{
              background: 'rgba(13,13,13,0.96)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {/* Product thumbnail */}
            <div className="relative flex-shrink-0">
              <img
                src={current.productImg}
                alt={current.product}
                className="w-11 h-11 rounded-xl object-cover"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {iconMap[current.type]}
              </div>
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400 leading-snug">
                {labelMap[current.type](current)}
              </p>
              <p className="text-[11px] font-black text-white mt-0.5 truncate">{current.product}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{current.ago}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
