import { useContext } from 'react';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { NavigationContext } from '../App';

export default function StoreAccessButton() {
  const { navigate } = useContext(NavigationContext);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4 }}
      onClick={() => navigate('public-store')}
      title="Visit our online store"
      className="fixed bottom-6 left-6 z-[9990] flex items-center gap-2 px-4 py-3 rounded-full font-black text-sm text-white shadow-2xl hover:brightness-110 transition-all hover:scale-105 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
        boxShadow: '0 8px 28px rgba(29,78,216,0.45)',
      }}
    >
      <ShoppingBag className="w-4 h-4" />
      <span className="hidden sm:inline">Shop Online</span>
    </motion.button>
  );
}
