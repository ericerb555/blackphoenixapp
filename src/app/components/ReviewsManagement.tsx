/**
 * Reviews Management Component
 * 
 * Comprehensive review management system with:
 * - Worker ratings & reviews
 * - Review requests
 * - Performance tracking
 * - Review moderation
 */

import { useState, useEffect } from 'react';
import {
  Star, User, Users, TrendingUp, TrendingDown, MessageSquare,
  Send, Calendar, Award, AlertCircle, CheckCircle, Clock,
  Search, Filter, MoreVertical, Eye, ThumbsUp, Flag, X,
  Mail, RefreshCw, Check
} from 'lucide-react';
import StarRating, { RatingDisplay } from './StarRating';
import { StandardButton, CompactStandardButton } from './ui/button/StandardButton';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Review {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: 'employee' | 'subcontractor';
  rating: number;
  comment: string;
  projectName: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  status: 'pending' | 'approved' | 'flagged';
}

interface WorkerStats {
  id: string;
  name: string;
  role: 'employee' | 'subcontractor';
  avatar: string;
  averageRating: number;
  totalReviews: number;
  recentRating: number;
  trend: 'up' | 'down' | 'stable';
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface RatingRequest {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  workerName: string;
  workerId: string;
  projectName: string;
  sentAt: string;
  completedAt?: string;
  status: 'sent' | 'completed';
  sentVia?: ('email' | 'sms')[];
  reminderCount: number;
}

export default function ReviewsManagement() {
  const [activeTab, setActiveTab] = useState<'workers' | 'reviews' | 'requests'>('workers');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'employee' | 'subcontractor'>('all');
  const [ratingRequests, setRatingRequests] = useState<RatingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [resendingRequest, setResendingRequest] = useState<string | null>(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Mock data
  const workerStats: WorkerStats[] = [
    {
      id: '1',
      name: 'John Smith',
      role: 'employee',
      avatar: 'JS',
      averageRating: 4.8,
      totalReviews: 24,
      recentRating: 5.0,
      trend: 'up',
      breakdown: { 5: 20, 4: 3, 3: 1, 2: 0, 1: 0 }
    },
    {
      id: '2',
      name: 'Mike Johnson',
      role: 'subcontractor',
      avatar: 'MJ',
      averageRating: 4.6,
      totalReviews: 18,
      recentRating: 4.5,
      trend: 'stable',
      breakdown: { 5: 12, 4: 5, 3: 1, 2: 0, 1: 0 }
    },
    {
      id: '3',
      name: 'Sarah Davis',
      role: 'employee',
      avatar: 'SD',
      averageRating: 4.9,
      totalReviews: 31,
      recentRating: 5.0,
      trend: 'up',
      breakdown: { 5: 28, 4: 2, 3: 1, 2: 0, 1: 0 }
    },
    {
      id: '4',
      name: 'ABC Roofing Co',
      role: 'subcontractor',
      avatar: 'AR',
      averageRating: 4.2,
      totalReviews: 15,
      recentRating: 3.8,
      trend: 'down',
      breakdown: { 5: 8, 4: 4, 3: 2, 2: 1, 1: 0 }
    }
  ];

  const reviews: Review[] = [
    {
      id: 'r1',
      workerId: '1',
      workerName: 'John Smith',
      workerRole: 'employee',
      rating: 5,
      comment: 'Excellent work! Very professional and completed ahead of schedule.',
      projectName: 'Kitchen Renovation',
      invoiceNumber: 'INV-2024-001',
      customerName: 'Jane Doe',
      date: '2024-02-20',
      status: 'approved'
    },
    {
      id: 'r2',
      workerId: '3',
      workerName: 'Sarah Davis',
      workerRole: 'employee',
      rating: 5,
      comment: 'Outstanding attention to detail. Highly recommend!',
      projectName: 'Bathroom Remodel',
      invoiceNumber: 'INV-2024-002',
      customerName: 'Bob Wilson',
      date: '2024-02-19',
      status: 'approved'
    },
    {
      id: 'r3',
      workerId: '4',
      workerName: 'ABC Roofing Co',
      workerRole: 'subcontractor',
      rating: 3,
      comment: 'Work was okay but took longer than expected.',
      projectName: 'Roof Repair',
      invoiceNumber: 'INV-2024-003',
      customerName: 'Tom Brown',
      date: '2024-02-18',
      status: 'pending'
    }
  ];

  // Fetch rating requests when the requests tab is active
  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRatingRequests();
    }
  }, [activeTab]);

  const fetchRatingRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/ratings/review-requests`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
        }
      );
      const data = await response.json();
      if (data.requests) {
        setRatingRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching rating requests:', error);
      toast.error('Failed to load rating requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleResendRequest = async (request: RatingRequest, via: 'email' | 'sms' | 'both') => {
    setResendingRequest(request.id);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/ratings/request-review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            invoiceNumber: request.invoiceNumber,
            customerName: request.customerName,
            customerEmail: request.customerEmail,
            customerPhone: request.customerPhone,
            workerName: request.workerName,
            workerId: request.workerId,
            projectName: request.projectName,
            via: via,
            isReminder: true
          })
        }
      );
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Review request resent via ${via}!`);
        fetchRatingRequests();
      } else {
        throw new Error(data.error || 'Failed to resend request');
      }
    } catch (error) {
      console.error('Error resending rating request:', error);
      toast.error('Failed to resend request');
    } finally {
      setResendingRequest(null);
    }
  };

  const filteredWorkers = workerStats.filter(worker => {
    const matchesSearch = worker.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || worker.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const renderWorkersList = () => (
    <div>
      {/* Search and Filters */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workers..."
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
          >
            <option value="all">All Roles</option>
            <option value="employee">Employees</option>
            <option value="subcontractor">Subcontractors</option>
          </select>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkers.map((worker) => (
          <div
            key={worker.id}
            className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition-colors cursor-pointer"
            onClick={() => setSelectedWorker(worker.id)}
          >
            {/* Worker Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white font-bold">
                  {worker.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{worker.name}</h3>
                  <p className="text-xs text-gray-400 capitalize">{worker.role}</p>
                </div>
              </div>
              
              {/* Trend Indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                worker.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                worker.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {worker.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {worker.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {worker.trend === 'stable' && <span className="w-3 h-0.5 bg-gray-400 rounded" />}
              </div>
            </div>

            {/* Rating Display */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">{worker.averageRating.toFixed(1)}</span>
                <span className="text-sm text-gray-400">average</span>
              </div>
              <StarRating rating={worker.averageRating} readOnly size="md" />
              <p className="text-xs text-gray-400 mt-1">
                {worker.totalReviews} {worker.totalReviews === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#2A2A2A]">
              <div>
                <p className="text-xs text-gray-400 mb-1">Recent</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold text-white">{worker.recentRating.toFixed(1)}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Excellence</p>
                <span className="text-sm font-semibold text-white">
                  {Math.round((worker.breakdown[5] / worker.totalReviews) * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Worker Detail Modal */}
      {selectedWorker && (
        <WorkerDetailModal
          worker={workerStats.find(w => w.id === selectedWorker)!}
          reviews={reviews.filter(r => r.workerId === selectedWorker)}
          onClose={() => setSelectedWorker(null)}
        />
      )}
    </div>
  );

  const renderReviewsList = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-bold text-white">All Reviews</h3>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-xs text-white hover:border-orange-500/30 transition-colors">
            All
          </button>
          <button className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-xs text-gray-400 hover:text-white hover:border-orange-500/30 transition-colors">
            Pending
          </button>
          <button className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-xs text-gray-400 hover:text-white hover:border-orange-500/30 transition-colors">
            Flagged
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {review.customerName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{review.customerName}</span>
                    <span className="text-xs text-gray-500">reviewed</span>
                    <span className="text-sm font-medium text-orange-400">{review.workerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{review.projectName}</span>
                    <span>•</span>
                    <span>{review.invoiceNumber}</span>
                    <span>•</span>
                    <span>{new Date(review.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  review.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  review.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {review.status}
                </span>
                <button className="p-1 hover:bg-[#0A0A0A] rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="mb-3">
              <StarRating rating={review.rating} readOnly size="md" />
            </div>

            {review.comment && (
              <p className="text-sm text-gray-300 mb-3">{review.comment}</p>
            )}

            {review.status === 'pending' && (
              <div className="flex gap-2 pt-3 border-t border-[#2A2A2A]">
                <button className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/30 transition-colors">
                  <CheckCircle className="w-3 h-3" />
                  Approve
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-colors">
                  <Flag className="w-3 h-3" />
                  Flag
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderReviewRequests = () => (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">Rating Requests</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setRequestStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                requestStatusFilter === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRequestStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                requestStatusFilter === 'pending'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:text-white'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setRequestStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                requestStatusFilter === 'completed'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:text-white'
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {loadingRequests ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : ratingRequests.length === 0 ? (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-12 text-center">
          <Send className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No rating requests found</h3>
          <p className="text-sm text-gray-500">Rating requests will appear here once they are sent</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ratingRequests
            .filter(req => 
              requestStatusFilter === 'all' || 
              (requestStatusFilter === 'pending' && req.status === 'sent') || 
              (requestStatusFilter === 'completed' && req.status === 'completed')
            )
            .map((request) => (
              <div
                key={request.id}
                className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-white">{request.projectName}</h3>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        request.status === 'sent' 
                          ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' 
                          : 'bg-green-600/20 text-green-400 border border-green-500/30'
                      }`}>
                        {request.status === 'sent' ? 'Pending Response' : 'Completed'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-400">Customer:</span>
                        <p className="text-white font-medium">{request.customerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Worker:</span>
                        <p className="text-white font-medium">{request.workerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Invoice:</span>
                        <p className="text-white font-medium">{request.invoiceNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Sent:</span>
                        <p className="text-white font-medium">
                          {new Date(request.sentAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Sent via:</span>
                      {request.sentVia && request.sentVia.length > 0 ? (
                        request.sentVia.map((method) => (
                          <span key={method} className="flex items-center gap-1 px-2 py-1 bg-[#0A0A0A] rounded text-xs text-gray-300 border border-[#2A2A2A]">
                            {method === 'email' ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            {method}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">No method recorded</span>
                      )}
                      {request.reminderCount > 0 && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs border border-yellow-500/30">
                          {request.reminderCount} {request.reminderCount === 1 ? 'reminder' : 'reminders'} sent
                        </span>
                      )}
                    </div>

                    {request.completedAt && (
                      <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <Check className="w-4 h-4" />
                          Completed on {new Date(request.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {request.status === 'sent' && (
                    <div className="flex flex-col gap-2 ml-4">
                      {request.customerEmail && (
                        <button
                          onClick={() => handleResendRequest(request, 'email')}
                          disabled={resendingRequest === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/30"
                        >
                          {resendingRequest === request.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Resend Email
                            </>
                          )}
                        </button>
                      )}
                      {request.customerPhone && (
                        <button
                          onClick={() => handleResendRequest(request, 'sms')}
                          disabled={resendingRequest === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-green-500/30"
                        >
                          {resendingRequest === request.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4" />
                              Resend SMS
                            </>
                          )}
                        </button>
                      )}
                      {request.customerEmail && request.customerPhone && (
                        <button
                          onClick={() => handleResendRequest(request, 'both')}
                          disabled={resendingRequest === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-orange-500/30"
                        >
                          {resendingRequest === request.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Resend Both
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A2A2A]">
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'workers'
              ? 'text-orange-400 border-orange-400'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Workers
          </div>
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'reviews'
              ? 'text-orange-400 border-orange-400'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Reviews
          </div>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'requests'
              ? 'text-orange-400 border-orange-400'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Requests
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'workers' && renderWorkersList()}
      {activeTab === 'reviews' && renderReviewsList()}
      {activeTab === 'requests' && renderReviewRequests()}
    </div>
  );
}

// Worker Detail Modal Component
function WorkerDetailModal({ worker, reviews, onClose }: { worker: WorkerStats; reviews: Review[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Worker Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Worker Info */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white text-2xl font-bold">
              {worker.avatar}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-1">{worker.name}</h3>
              <p className="text-sm text-gray-400 capitalize mb-3">{worker.role}</p>
              <div className="flex items-center gap-4">
                <StarRating rating={worker.averageRating} readOnly size="lg" showCount count={worker.totalReviews} />
              </div>
            </div>
          </div>

          {/* Rating Breakdown */}
          <RatingDisplay
            averageRating={worker.averageRating}
            totalRatings={worker.totalReviews}
            breakdown={worker.breakdown}
          />

          {/* Reviews */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Recent Reviews</h3>
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{review.customerName}</p>
                      <p className="text-xs text-gray-400">{review.projectName} • {new Date(review.date).toLocaleDateString()}</p>
                    </div>
                    <StarRating rating={review.rating} readOnly size="sm" />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-300">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}