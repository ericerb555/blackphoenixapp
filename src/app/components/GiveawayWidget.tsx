import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gift, X, Calendar, Users, Trophy } from 'lucide-react';
import { PrimaryButton } from './ui/button/PrimaryButton';

interface Giveaway {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  prize: string;
  endDate: string;
  entryCount: number;
  isActive: boolean;
}

interface GiveawayWidgetProps {
  position?: 'fixed' | 'inline';
  dismissible?: boolean;
}

export default function GiveawayWidget({ 
  position = 'fixed',
  dismissible = true 
}: GiveawayWidgetProps) {
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    loadActiveGiveaway();
    
    // Check if user already dismissed this giveaway
    const dismissed = localStorage.getItem('giveaway_dismissed');
    if (dismissed) {
      const dismissedIds = JSON.parse(dismissed);
      if (giveaway && dismissedIds.includes(giveaway.id)) {
        setIsDismissed(true);
      }
    }

    // Check if user already entered
    const entered = localStorage.getItem('giveaway_entries');
    if (entered && giveaway) {
      const enteredIds = JSON.parse(entered);
      setIsEntered(enteredIds.includes(giveaway.id));
    }
  }, [giveaway?.id]);

  const loadActiveGiveaway = () => {
    try {
      const saved = localStorage.getItem('giveaways');
      if (saved) {
        const allGiveaways: Giveaway[] = JSON.parse(saved);
        const active = allGiveaways.find(g => g.isActive && new Date(g.endDate) > new Date());
        setGiveaway(active || null);
      }
    } catch (error) {
      console.error('Error loading giveaway:', error);
      localStorage.removeItem('giveaways');
    }
  };

  const handleEnter = () => {
    if (!giveaway) return;

    // Save entry
    try {
      const entered = localStorage.getItem('giveaway_entries') || '[]';
      const enteredIds = JSON.parse(entered);
      enteredIds.push(giveaway.id);
      localStorage.setItem('giveaway_entries', JSON.stringify(enteredIds));
      
      // Update entry count
      const saved = localStorage.getItem('giveaways');
      if (saved) {
        const allGiveaways: Giveaway[] = JSON.parse(saved);
        const updated = allGiveaways.map(g => 
          g.id === giveaway.id ? { ...g, entryCount: g.entryCount + 1 } : g
        );
        localStorage.setItem('giveaways', JSON.stringify(updated));
      }
      
      setIsEntered(true);
    } catch (error) {
      console.error('Error entering giveaway:', error);
    }
  };

  const handleDismiss = () => {
    if (!giveaway) return;
    
    try {
      const dismissed = localStorage.getItem('giveaway_dismissed') || '[]';
      const dismissedIds = JSON.parse(dismissed);
      dismissedIds.push(giveaway.id);
      localStorage.setItem('giveaway_dismissed', JSON.stringify(dismissedIds));
      setIsDismissed(true);
    } catch (error) {
      console.error('Error dismissing giveaway:', error);
    }
  };

  if (isDismissed || !giveaway) {
    return null;
  }

  const daysLeft = Math.ceil(
    (new Date(giveaway.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const positionClasses = position === 'fixed' 
    ? 'fixed bottom-4 right-4 w-80 z-50' 
    : 'w-full';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={`${positionClasses} bg-gradient-to-br from-[#ea580c] to-[#dc4a08] rounded-xl shadow-2xl overflow-hidden`}
    >
      {/* Dismiss Button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white z-10"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Image */}
      {giveaway.imageUrl && (
        <div className="h-32 overflow-hidden">
          <img 
            src={giveaway.imageUrl} 
            alt={giveaway.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-6 h-6" />
          <h3 className="text-xl font-bold">{giveaway.title}</h3>
        </div>

        <p className="text-white/90 text-sm mb-4">{giveaway.description}</p>

        {/* Prize */}
        <div className="flex items-center gap-2 mb-4 bg-white/10 rounded-lg p-3">
          <Trophy className="w-5 h-5 text-yellow-300" />
          <div>
            <div className="text-xs text-white/70">Prize</div>
            <div className="font-semibold">{giveaway.prize}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{daysLeft} days left</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            <span>{giveaway.entryCount} entries</span>
          </div>
        </div>

        {/* Action Button */}
        {isEntered ? (
          <div className="bg-white/20 rounded-lg p-3 text-center font-semibold">
            ✓ You're Entered!
          </div>
        ) : (
          <PrimaryButton
            onClick={handleEnter}
            className="w-full bg-white text-[#ea580c] hover:bg-gray-100 font-bold"
          >
            Enter Giveaway
          </PrimaryButton>
        )}
      </div>
    </motion.div>
  );
}
