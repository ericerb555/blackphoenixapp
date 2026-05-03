/**
 * Request Access Button Component
 * 
 * Allows portal users to request access to additional features/modules
 * Admins can grant access through subscriptions/plans
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Send, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface RequestAccessButtonProps {
  requestedRoute: string;
  routeDisplayName: string;
  description?: string;
  className?: string;
}

export default function RequestAccessButton({
  requestedRoute,
  routeDisplayName,
  description,
  className = '',
}: RequestAccessButtonProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending' | 'approved' | 'denied'>('idle');

  // Check if already requested or has access
  const checkAccessStatus = () => {
    try {
      const currentUserProfile = localStorage.getItem('currentUserProfile');
      if (!currentUserProfile) return 'idle';
      
      const profile = JSON.parse(currentUserProfile);
      const userEmail = profile.email;

      // Check if user has granted access
      const subscriptions = JSON.parse(localStorage.getItem('userSubscriptions') || '{}');
      const userSub = subscriptions[userEmail.toLowerCase()];
      if (userSub && userSub.grantedRoutes && userSub.grantedRoutes.includes(requestedRoute)) {
        return 'approved';
      }

      // Check if request is pending
      const accessRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
      const existingRequest = accessRequests.find(
        (req: any) => req.userEmail === userEmail && req.requestedRoute === requestedRoute
      );
      
      if (existingRequest) {
        return existingRequest.status;
      }

      return 'idle';
    } catch (e) {
      console.error('Error checking access status:', e);
      return 'idle';
    }
  };

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    
    try {
      const currentUserProfile = localStorage.getItem('currentUserProfile');
      if (!currentUserProfile) {
        toast.error('User profile not found');
        setIsRequesting(false);
        return;
      }

      const profile = JSON.parse(currentUserProfile);
      const userEmail = profile.email;
      const userName = profile.fullName || profile.email;

      // Create access request
      const accessRequest = {
        id: `req_${Date.now()}`,
        userEmail,
        userName,
        accountType: profile.accountType,
        requestedRoute,
        routeDisplayName,
        description: description || '',
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      // Save to localStorage
      const accessRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
      accessRequests.push(accessRequest);
      localStorage.setItem('accessRequests', JSON.stringify(accessRequests));

      // Send notification to admins
      const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
      notifications.push({
        id: `notif_${Date.now()}`,
        type: 'access_request',
        title: 'New Access Request',
        message: `${userName} (${profile.accountType}) requested access to ${routeDisplayName}`,
        requestId: accessRequest.id,
        timestamp: new Date().toISOString(),
        read: false,
      });
      localStorage.setItem('adminNotifications', JSON.stringify(notifications));

      setRequestStatus('pending');
      toast.success('Access request submitted! An admin will review your request.');
    } catch (error) {
      console.error('Error requesting access:', error);
      toast.error('Failed to submit access request');
    } finally {
      setIsRequesting(false);
    }
  };

  const status = checkAccessStatus();

  if (status === 'approved') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-600/30 rounded-lg ${className}`}
      >
        <CheckCircle className="w-5 h-5 text-green-500" />
        <span className="text-green-500 font-medium">Access Granted</span>
      </motion.div>
    );
  }

  if (status === 'pending' || requestStatus === 'pending') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-4 py-2 bg-yellow-600/20 border border-yellow-600/30 rounded-lg ${className}`}
      >
        <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-yellow-500 font-medium">Request Pending</span>
      </motion.div>
    );
  }

  if (status === 'denied') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-600/30 rounded-lg ${className}`}
      >
        <XCircle className="w-5 h-5 text-red-500" />
        <span className="text-red-500 font-medium">Request Denied</span>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleRequestAccess}
      disabled={isRequesting}
      className={`flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isRequesting ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Requesting...</span>
        </>
      ) : (
        <>
          <Send className="w-5 h-5" />
          <span>Request Access</span>
        </>
      )}
    </motion.button>
  );
}
