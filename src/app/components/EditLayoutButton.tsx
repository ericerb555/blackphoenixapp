/**
 * Edit Layout Button - Global Layout Editor Access
 * 
 * Floating button that appears on all pages for admin users
 * Opens the comprehensive layout editor
 */

import { useState, useEffect } from 'react';
import { Layout, Wand2, Crown } from 'lucide-react';
import LayoutEditorPanel from './LayoutEditorPanel';

interface EditLayoutButtonProps {
  pageName: string;
  userRole?: string;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  showLabel?: boolean;
}

export default function EditLayoutButton({ 
  pageName, 
  userRole = 'admin',
  position = 'bottom-right',
  showLabel = true
}: EditLayoutButtonProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Only show for admins/owners
  const isAdmin = userRole === 'admin' || userRole === 'owner' || userRole === 'super-admin';

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!isAdmin) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
      default:
        return 'bottom-4 right-4';
    }
  };

  return (
    <>
      {/* Floating Edit Button */}
      <div 
        className={`fixed ${getPositionClasses()} z-40 transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <button
          onClick={() => setIsEditorOpen(true)}
          className="group relative px-4 py-3 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#f97316] hover:to-[#fb923c] text-white rounded-xl shadow-2xl shadow-[#ea580c]/30 hover:shadow-[#ea580c]/50 transition-all duration-300 flex items-center gap-3 border-2 border-[#ea580c]/20 hover:scale-105"
          title="Edit Page Layout"
        >
          {/* Crown Badge (Admin Indicator) */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
            <Crown className="w-3 h-3 text-white" />
          </div>

          {/* Magic Wand Icon */}
          <div className="relative">
            <Wand2 className="w-5 h-5 animate-pulse" />
            <div className="absolute inset-0 bg-white/30 blur-md rounded-full animate-ping" />
          </div>

          {/* Label */}
          {showLabel && (
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold whitespace-nowrap">Edit Layout</span>
              <span className="text-xs text-white/80">Admin Mode</span>
            </div>
          )}

          {/* Layout Icon */}
          <Layout className="w-5 h-5" />

          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>

        {/* Tooltip (when label is hidden) */}
        {!showLabel && (
          <div className="absolute bottom-full mb-2 right-0 bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap">
            <p className="text-xs font-bold text-white">Edit Page Layout</p>
            <p className="text-xs text-gray-400">Admin Mode</p>
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-[#1A1A1A] border-r border-b border-[#2A2A2A] transform rotate-45" />
          </div>
        )}
      </div>

      {/* Layout Editor Panel */}
      <LayoutEditorPanel
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        pageName={pageName}
      />
    </>
  );
}
