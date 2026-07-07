import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { messagingService } from '../lib/services/messagingService';
import { useNavigate } from '../hooks/useNavigate';

interface MessagingNotificationBellProps {
  userId: string;
  className?: string;
}

export default function MessagingNotificationBell({ userId, className = '' }: MessagingNotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Load initial unread count
    loadUnreadCount();

    // Poll for updates every 10 seconds
    const interval = setInterval(loadUnreadCount, 10000);

    return () => clearInterval(interval);
  }, [userId]);

  const loadUnreadCount = async () => {
    const count = await messagingService.getUnreadCount(userId);
    setUnreadCount(count);
  };

  const handleClick = () => {
    navigate('messaging');
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-lg transition-all duration-200 hover:bg-gray-800 group ${className}`}
      title="Messages"
    >
      <MessageCircle className="w-6 h-6 text-gray-400 group-hover:text-[#ea580c] transition-colors" />
      
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center">
          {/* Pulse animation ring */}
          <div className="absolute inset-0 bg-[#ea580c] rounded-full animate-ping opacity-75" />
          
          {/* Badge */}
          <div className="relative bg-[#ea580c] text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        </div>
      )}
    </button>
  );
}
