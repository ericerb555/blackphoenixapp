/**
 * Access Request Management Page
 * 
 * Allows admins/owners to review and approve/deny access requests from portal users
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Shield, 
  ArrowLeft,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

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

interface AccessRequestManagementProps {
  onNavigate: (page: string) => void;
}

export default function AccessRequestManagement({ onNavigate }: AccessRequestManagementProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    try {
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
              reviewedBy: 'Admin' // In real app, would be current admin email
            }
          : req
      );
      localStorage.setItem('accessRequests', JSON.stringify(updatedRequests));
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
      localStorage.setItem('accessRequests', JSON.stringify(updatedRequests));
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

  const filteredRequests = requests
    .filter(req => filter === 'all' || req.status === filter)
    .filter(req => 
      req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.routeDisplayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const pendingCount = requests.filter(req => req.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('unified-dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Access Request Management</h1>
              <p className="text-gray-400">
                Review and manage user access requests
                {pendingCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-[#ea580c] text-white text-sm rounded-full">
                    {pendingCount} Pending
                  </span>
                )}
              </p>
            </div>
            <Shield className="w-12 h-12 text-[#ea580c]" />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or module..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'denied'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    filter === status
                      ? 'bg-[#ea580c] text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white'
                  }`}
                >
                  {status}
                  {status === 'pending' && pendingCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 text-sm rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No access requests found</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* User Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{request.userName}</h3>
                        <p className="text-sm text-gray-400">{request.userEmail}</p>
                      </div>
                      <span className="px-2 py-1 bg-[#2A2A2A] text-gray-400 text-sm rounded capitalize">
                        {request.accountType}
                      </span>
                    </div>

                    {/* Request Details */}
                    <div className="mb-3">
                      <p className="text-gray-300 mb-1">
                        Requesting access to:{' '}
                        <span className="font-semibold text-[#ea580c]">
                          {request.routeDisplayName}
                        </span>
                      </p>
                      {request.description && (
                        <p className="text-sm text-gray-400">{request.description}</p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p className="text-sm text-gray-500">
                      Requested {new Date(request.requestedAt).toLocaleString()}
                      {request.reviewedAt && (
                        <> · Reviewed {new Date(request.reviewedAt).toLocaleString()}</>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {request.status === 'pending' ? (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(request)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeny(request)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Deny
                        </motion.button>
                      </>
                    ) : (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        request.status === 'approved' 
                          ? 'bg-green-600/20 text-green-500' 
                          : 'bg-red-600/20 text-red-500'
                      }`}>
                        {request.status === 'approved' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
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
    </div>
  );
}
