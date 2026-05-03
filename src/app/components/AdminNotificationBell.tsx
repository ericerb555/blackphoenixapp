/**
 * Admin Notification Bell Component
 * 
 * Features:
 * - Shows unread admin alert count
 * - Click to navigate to admin alerts page
 * - Red badge for high priority alerts
 * - Loads from localStorage
 */

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface AdminNotificationBellProps {
  onClick?: () => void;
  onNavigate?: (page: string) => void;
}

interface Alert {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read' | 'handled';
  timestamp: Date;
  userId: string;
  data?: any;
}

export default function AdminNotificationBell({ onClick, onNavigate }: AdminNotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasHighPriority, setHasHighPriority] = useState(false);

  useEffect(() => {
    loadUnreadCount();

    // Listen for storage changes (when alerts are added/updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adminAlerts' || e.key === 'admin_alerts_storage') {
        loadUnreadCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Poll every 5 seconds for updates
    const interval = setInterval(loadUnreadCount, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadUnreadCount = () => {
    try {
      // Try both storage keys
      const adminAlerts = JSON.parse(localStorage.getItem('adminAlerts') || '[]') as Alert[];
      const adminAlertsStorage = JSON.parse(localStorage.getItem('admin_alerts_storage') || '[]') as Alert[];
      
      // Combine both sources
      const allAlerts = [...adminAlerts, ...adminAlertsStorage];
      
      // Count unread alerts
      const unread = allAlerts.filter((alert: Alert) => 
        alert.status === 'unread'
      );
      
      setUnreadCount(unread.length);
      
      // Check for high priority unread alerts
      const highPriority = unread.some((alert: Alert) => 
        alert.priority === 'high' || alert.priority === 'critical'
      );
      
      setHasHighPriority(highPriority);
    } catch (error) {
      console.error('Error loading admin alerts:', error);
      setUnreadCount(0);
      setHasHighPriority(false);
    }
  };

  const handleClick = () => {
    // Call custom onClick if provided
    if (onClick) {
      onClick();
    }
    
    // Navigate to admin alerts page
    if (onNavigate) {
      onNavigate('admin-alerts');
    } else {
      // Fallback: use window.location
      window.location.href = '/admin-alerts';
    }
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors group"
      aria-label={`Admin notifications, ${unreadCount} unread`}
    >
      <Bell 
        className={`w-5 h-5 transition-colors ${
          hasHighPriority 
            ? 'text-red-400' 
            : unreadCount > 0 
            ? 'text-[#ea580c]' 
            : 'text-gray-400'
        } group-hover:text-white`}
      />
      
      {unreadCount > 0 && (
        <span 
          className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full ${
            hasHighPriority
              ? 'bg-red-500 text-white'
              : 'bg-[#ea580c] text-white'
          } border-2 border-[#0A0A0A] px-1`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {unreadCount === 0 && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-gray-600 rounded-full border-2 border-[#0A0A0A] opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
