/**
 * Access Request Panel Component
 * 
 * Inline component for Owner's Dashboard to review and manage access requests
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, User, Clock, Send } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const AR_SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const arAuthHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

function persistAccessRequests(requests: any[]) {
  localStorage.setItem('accessRequests', JSON.stringify(requests));
  fetch(`${AR_SERVER}/access-requests`, {
    method: 'POST',
    headers: arAuthHeaders,
    body: JSON.stringify({ requests }),
  }).catch((err) => console.error('[AccessRequestPanel] server sync failed:', err));
}

interface AccessRequest {
  id: string;
  userEmail: string;
  userName: string;
  accountType: string;
  requestedRoute: string;
  routeDisplayName: string;
  description: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export default function AccessRequestPanel() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      // Server is authoritative so approvals sync across admins/devices.
      try {
        const res = await fetch(`${AR_SERVER}/access-requests`, { headers: arAuthHeaders });
        const json = await res.json();
        if (json.success && Array.isArray(json.requests)) {
          localStorage.setItem('accessRequests', JSON.stringify(json.requests));
          setRequests(json.requests);
          return;
        }
      } catch (err) {
        console.error('[AccessRequestPanel] Error loading requests from server:', err);
      }
      const accessRequests = JSON.parse(localStorage.getItem('accessRequests') || '[]');
      setRequests(accessRequests);
    } catch (e) {
      console.error('Error loading requests:', e);
      toast.error('Failed to load access requests');
    }
  };

  const handleApprove = (request: AccessRequest) => {
    try {
      // Update request status
      const updatedRequests = requests.map(req =>
        req.id === request.id
          ? { 
              ...req, 
              status: 'approved' as const, 
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin'
            }
          : req
      );
      persistAccessRequests(updatedRequests);
      setRequests(updatedRequests);

      // Grant access to the user
      const subscriptions = JSON.parse(localStorage.getItem('userSubscriptions') || '{}');
      const userEmail = request.userEmail.toLowerCase();
      
      if (!subscriptions[userEmail]) {
        subscriptions[userEmail] = {
          email: userEmail,
          plan: 'custom',
          grantedRoutes: [],
          grantedAt: new Date().toISOString(),
        };
      }

      if (!subscriptions[userEmail].grantedRoutes) {
        subscriptions[userEmail].grantedRoutes = [];
      }

      if (!subscriptions[userEmail].grantedRoutes.includes(request.requestedRoute)) {
        subscriptions[userEmail].grantedRoutes.push(request.requestedRoute);
      }

      localStorage.setItem('userSubscriptions', JSON.stringify(subscriptions));

      // Send notification to user
      const userNotifications = JSON.parse(localStorage.getItem(`notifications_${userEmail}`) || '[]');
      userNotifications.push({
        id: `notif_${Date.now()}`,
        type: 'access_granted',
        title: 'Access Request Approved',
        message: `Your request to access ${request.routeDisplayName} has been approved!`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      localStorage.setItem(`notifications_${userEmail}`, JSON.stringify(userNotifications));

      toast.success(`Access granted to ${request.userName} for ${request.routeDisplayName}`);
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleDeny = (request: AccessRequest) => {
    try {
      const updatedRequests = requests.map(req =>
        req.id === request.id
          ? { 
              ...req, 
              status: 'denied' as const, 
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin'
            }
          : req
      );
      persistAccessRequests(updatedRequests);
      setRequests(updatedRequests);

      // Send notification to user
      const userEmail = request.userEmail.toLowerCase();
      const userNotifications = JSON.parse(localStorage.getItem(`notifications_${userEmail}`) || '[]');
      userNotifications.push({
        id: `notif_${Date.now()}`,
        type: 'access_denied',
        title: 'Access Request Denied',
        message: `Your request to access ${request.routeDisplayName} has been denied.`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      localStorage.setItem(`notifications_${userEmail}`, JSON.stringify(userNotifications));

      toast.success(`Access request denied for ${request.userName}`);
    } catch (error) {
      console.error('Error denying request:', error);
      toast.error('Failed to deny request');
    }
  };

  const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);
  const pendingCount = requests.filter(req => req.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'denied'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg capitalize transition-colors ${
              filter === status
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A]'
            }`}
          >
            {status}
            {status === 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No {filter !== 'all' ? filter : ''} access requests found</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{request.userName}</h4>
                      <p className="text-xs text-gray-400 truncate">{request.userEmail}</p>
                    </div>
                    <span className="px-2 py-1 bg-[#2A2A2A] text-gray-400 text-xs rounded capitalize flex-shrink-0">
                      {request.accountType}
                    </span>
                  </div>

                  {/* Request Details */}
                  <div className="mb-2">
                    <p className="text-sm text-gray-300">
                      Requesting access to:{' '}
                      <span className="font-semibold text-[#ea580c]">
                        {request.routeDisplayName}
                      </span>
                    </p>
                    {request.description && (
                      <p className="text-xs text-gray-500 mt-1">{request.description}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-600">
                    {new Date(request.requestedAt).toLocaleString()}
                    {request.reviewedAt && (
                      <> · Reviewed {new Date(request.reviewedAt).toLocaleString()}</>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {request.status === 'pending' ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleApprove(request)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeny(request)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Deny
                      </motion.button>
                    </>
                  ) : (
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                      request.status === 'approved' 
                        ? 'bg-green-600/20 text-green-500' 
                        : 'bg-red-600/20 text-red-500'
                    }`}>
                      {request.status === 'approved' ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span className="capitalize">{request.status}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
