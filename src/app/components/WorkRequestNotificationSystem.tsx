/**
 * Work Request Notification System
 * 
 * Real-time monitoring for new work requests and quote submissions
 * Features:
 * - Real-time Supabase subscriptions
 * - Toast notifications for new requests
 * - Badge count updates
 * - Sound alerts (optional)
 * - Admin alert creation
 * - Auto-refresh Quote Prep queue
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { Bell, AlertCircle, FileText, Clock, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../lib/apiConfig';

export interface WorkRequestNotification {
  id: string;
  requestNumber: string;
  customerName: string;
  serviceTitle: string;
  serviceCategory: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  location: string;
  submittedDate: string;
  estimatedValue: number;
  aiStatus: 'analyzing' | 'ready' | 'manual-review';
  aiConfidence: number;
}

interface WorkRequestNotificationSystemProps {
  onNewRequest?: (request: WorkRequestNotification) => void;
  onCountChange?: (count: number) => void;
  enableSound?: boolean;
  showToasts?: boolean;
  userId?: string; // User ID for filtering
}

export function WorkRequestNotificationSystem({
  onNewRequest,
  onCountChange,
  enableSound = true,
  showToasts = true,
  userId
}: WorkRequestNotificationSystemProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!enableSound) return;
    
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, [enableSound]);

  // Create admin alert for new work request
  const createAdminAlert = async (request: WorkRequestNotification) => {
    try {
      const alert = {
        id: `alert-${request.id}`,
        type: request.urgency === 'urgent' || request.urgency === 'high' ? 'urgent' : 'info',
        category: 'Work Requests',
        title: `New Quote Request: ${request.serviceTitle}`,
        description: `${request.customerName} submitted a ${request.serviceCategory} request in ${request.location}. Estimated value: $${request.estimatedValue.toLocaleString()}. AI Status: ${request.aiStatus} (${request.aiConfidence}% confidence)`,
        priority: request.urgency === 'urgent' ? 'critical' : request.urgency === 'high' ? 'high' : 'medium',
        status: 'unread',
        timestamp: new Date(request.submittedDate),
        source: 'Work Request System',
        actionRequired: true,
        data: request
      };

      // Store in KV store - with safe error handling
      try {
        await fetch(`${API_BASE_URL}/make-server-57095a78/admin-alerts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(alert)
        }).catch(err => {
          console.log('[Notification] Server offline - alert not stored');
          return null;
        });

        console.log('✅ Created admin alert for new work request:', request.requestNumber);
      } catch (storageError) {
        console.log('[Notification] Alert creation skipped (server offline)');
      }
    } catch (error) {
      console.log('[Notification] Error in notification system (server offline)');
    }
  };

  // Show toast notification
  const showNotificationToast = (request: WorkRequestNotification) => {
    if (!showToasts) return;

    const urgencyColors: Record<string, string> = {
      urgent: '🚨',
      high: '⚠️',
      medium: '📋',
      low: '📝'
    };

    const icon = urgencyColors[request.urgency] || '📋';

    toast.success(`${icon} New Quote Request`, {
      description: (
        <div className="space-y-1">
          <p className="font-semibold text-white">{request.serviceTitle}</p>
          <p className="text-sm text-gray-300">{request.customerName} • {request.location}</p>
          <p className="text-xs text-gray-400">
            {request.aiStatus === 'ready' 
              ? `✅ AI Ready (${request.aiConfidence}% confidence)`
              : request.aiStatus === 'analyzing'
              ? '🔄 AI Analyzing...'
              : '⚠️ Manual Review Needed'
            }
          </p>
          <p className="text-xs text-orange-400 font-semibold mt-1">
            Est. Value: ${request.estimatedValue.toLocaleString()}
          </p>
        </div>
      ),
      duration: 8000,
      action: {
        label: 'View Request',
        onClick: () => {
          window.location.href = '/quote-prep';
        }
      }
    });
  };

  // Handle new work request
  const handleNewRequest = useCallback((request: WorkRequestNotification) => {
    console.log('🔔 New work request received:', request.requestNumber);

    // Update unread count
    setUnreadCount(prev => {
      const newCount = prev + 1;
      onCountChange?.(newCount);
      return newCount;
    });

    // Play sound
    playNotificationSound();

    // Show toast
    showNotificationToast(request);

    // Create admin alert
    createAdminAlert(request);

    // Callback to parent
    onNewRequest?.(request);
  }, [onNewRequest, onCountChange, playNotificationSound]);

  // Load initial unread count
  const loadUnreadCount = async () => {
    try {
      const url = new URL(`${API_BASE_URL}/make-server-57095a78/work-requests/unread-count`);
      if (userId) {
        url.searchParams.append('userId', userId);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (response.ok) {
        const { count } = await response.json();
        setUnreadCount(count);
        onCountChange?.(count);
      }
    } catch (error) {
      console.log('Could not load unread count:', error);
    }
  };

  // Set up real-time monitoring
  useEffect(() => {
    console.log('🔔 Starting work request monitoring...');
    setIsMonitoring(true);

    // Load initial count
    loadUnreadCount();

    // Subscribe to new work requests from KV store
    const pollInterval = setInterval(async () => {
      try {
        const url = new URL(`${API_BASE_URL}/make-server-57095a78/work-requests/recent`);
        if (userId) {
          url.searchParams.append('userId', userId);
        }
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });

        if (response.ok) {
          const requests = await response.json();
          
          // Check for new requests (submitted in last 30 seconds)
          const now = Date.now();
          const recentRequests = requests.filter((req: any) => {
            const submittedTime = new Date(req.submittedDate).getTime();
            return now - submittedTime < 30000; // Last 30 seconds
          });

          // Notify for each new request
          recentRequests.forEach((req: any) => {
            handleNewRequest(req);
          });
        }
      } catch (error) {
        console.log('Polling error (normal if backend not connected):', error);
      }
    }, 15000); // Poll every 15 seconds

    // Also try to use Supabase real-time if available
    const subscription = supabase
      .channel('work_requests')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'work_requests'
      }, (payload) => {
        console.log('📥 New work request from real-time subscription:', payload);
        handleNewRequest(payload.new as any);
      })
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('🔕 Stopping work request monitoring');
      setIsMonitoring(false);
      clearInterval(pollInterval);
      subscription.unsubscribe();
    };
  }, [handleNewRequest, onCountChange, userId]); // Re-run when userId changes

  // Mark as read
  const markAsRead = async () => {
    try {
      await fetch(
        `${API_BASE_URL}/make-server-57095a78/work-requests/mark-read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setUnreadCount(0);
      onCountChange?.(0);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  return null; // This is a headless component
}

export default WorkRequestNotificationSystem;