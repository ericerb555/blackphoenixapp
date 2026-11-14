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
      /*
       * `hidden sm:flex` — not shown on a phone.
       *
       * This sits bottom-LEFT and the live chat widget sits bottom-RIGHT, both
       * fixed, both on every page. On a 390px screen that is both bottom
       * corners permanently occupied by things the page did not ask for, over
       * whatever the page actually put there — and the mobile dashboard's own
       * bottom nav lives in the same band.
       *
       * Of the two this is the one that goes: chat is a support channel people
       * look for, the store is reachable from the nav and the footer. Unchanged
       * from 640px up, where there is room for both.
       */
      className="hidden sm:flex fixed bottom-6 left-6 z-[9990] items-center gap-2 px-4 py-3 rounded-full font-black text-sm text-white shadow-2xl hover:brightness-110 transition-all hover:scale-105 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
        boxShadow: '0 8px 28px rgba(29,78,216,0.45)',
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ShoppingBag className="w-4 h-4" />
      <span className="hidden sm:inline">Shop Online</span>
    </motion.button>
  );
}
