/**
 * Customer Portal Reviews Display
 * 
 * Public-facing reviews section for customer portals:
 * - Display approved reviews only
 * - Filter by employee, rating, date
 * - Show admin responses
 * - Responsive card layout
 * - Verified badge for legitimate reviews
 */

import { useState } from 'react';
import {
  Star, ThumbsUp, User, Calendar, Award, CheckCircle, 
  MessageSquare, Filter, Search, ChevronDown, TrendingUp,
  Shield, Quote, ExternalLink
} from 'lucide-react';

interface PublicReview {
  id: string;
  employeeName: string;
  employeeRole: string;
  customerName: string;
  customerInitials: string; // For privacy
  
  ratings: {
    overall: number;
    professionalism: number;
    quality: number;
    timeliness: number;
    communication: number;
  };
  
  wouldRecommend: boolean;
  comments: string;
  
  adminResponse?: {
    message: string;
    respondedAt: Date;
  };
  
  metadata: {
    submittedAt: Date;
    projectType: string;
    verified: boolean;
  };
}

interface CustomerPortalReviewsProps {
  companyName?: string;
  showFilters?: boolean;
  maxReviews?: number;
}

export default function CustomerPortalReviews({ 
  companyName = 'Our Company',
  showFilters = true,
  maxReviews 
}: CustomerPortalReviewsProps) {
  const [reviews] = useState<PublicReview[]>(mockPublicReviews);
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'oldest'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique employees
  const employees = Array.from(new Set(reviews.map(r => r.employeeName)));

  // Filter and sort reviews
  let filteredReviews = reviews
    .filter(review => filterRating === 0 || review.ratings.overall >= filterRating)
    .filter(review => filterEmployee === 'all' || review.employeeName === filterEmployee)
    .filter(review => 
      searchQuery === '' ||
      review.comments.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.metadata.projectType.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Sort reviews
  if (sortBy === 'recent') {
    filteredReviews.sort((a, b) => b.metadata.submittedAt.getTime() - a.metadata.submittedAt.getTime());
  } else if (sortBy === 'highest') {
    filteredReviews.sort((a, b) => b.ratings.overall - a.ratings.overall);
  } else {
    filteredReviews.sort((a, b) => a.metadata.submittedAt.getTime() - b.metadata.submittedAt.getTime());
  }

  // Limit reviews if specified
  if (maxReviews) {
    filteredReviews = filteredReviews.slice(0, maxReviews);
  }

  // Calculate stats
  const avgRating = reviews.reduce((sum, r) => sum + r.ratings.overall, 0) / reviews.length;
  const recommendationRate = (reviews.filter(r => r.wouldRecommend).length / reviews.length) * 100;
  const totalReviews = reviews.length;

  const getRatingDistribution = () => {
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      distribution[Math.floor(review.ratings.overall) - 1]++;
    });
    return distribution.reverse();
  };

  const ratingDistribution = getRatingDistribution();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-orange-400" />
              Customer Reviews
            </h2>
            <p className="text-gray-400 text-sm">See what our customers are saying</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-xl border border-green-500/30">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Verified Reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Rating */}
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 text-center">
            <div className="text-5xl font-bold text-white mb-2">{avgRating.toFixed(1)}</div>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= Math.round(avgRating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
            <p className="text-gray-400 text-sm">Based on {totalReviews} reviews</p>
          </div>

          {/* Rating Distribution */}
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-white font-semibold mb-3">Rating Breakdown</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating, idx) => {
                const count = ratingDistribution[idx];
                const percentage = (count / totalReviews) * 100;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 w-8">{rating}★</span>
                    <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendation Rate */}
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 text-center">
            <div className="w-24 h-24 mx-auto mb-3 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-[#2A2A2A]"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - recommendationRate / 100)}`}
                  className="text-green-400"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{recommendationRate.toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-400">
              <ThumbsUp className="w-5 h-5" />
              <span className="font-semibold">Would Recommend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Search reviews..."
                />
              </div>
            </div>

            <select
              value={filterRating}
              onChange={(e) => setFilterRating(Number(e.target.value))}
              className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
            >
              <option value={0}>All Ratings</option>
              <option value={5}>5 Stars Only</option>
              <option value={4}>4+ Stars</option>
              <option value={3}>3+ Stars</option>
            </select>

            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
            >
              <option value="recent">Most Recent</option>
              <option value="highest">Highest Rated</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      )}

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredReviews.map(review => (
          <div key={review.id} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{review.customerInitials}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white">{review.customerName}</h3>
                    {review.metadata.verified && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-green-600/20 text-green-400 rounded border border-green-500/30 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {review.metadata.projectType} • {review.metadata.submittedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= review.ratings.overall
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-white font-bold">{review.ratings.overall.toFixed(1)}</span>
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Professional</span>
                <span className="text-white font-semibold">{review.ratings.professionalism}/5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Quality</span>
                <span className="text-white font-semibold">{review.ratings.quality}/5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Timeliness</span>
                <span className="text-white font-semibold">{review.ratings.timeliness}/5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Communication</span>
                <span className="text-white font-semibold">{review.ratings.communication}/5</span>
              </div>
            </div>

            {/* Review Comments */}
            <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 mb-4">
              <Quote className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-gray-300 text-sm leading-relaxed">{review.comments}</p>
            </div>

            {/* Employee & Recommendation */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">
                  <span className="text-white font-medium">{review.employeeName}</span>
                  {' • '}
                  {review.employeeRole}
                </span>
              </div>
              {review.wouldRecommend && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 rounded-lg border border-green-500/30 text-xs font-semibold">
                  <ThumbsUp className="w-3 h-3" />
                  Would Recommend
                </div>
              )}
            </div>

            {/* Admin Response */}
            {review.adminResponse && (
              <div className="mt-4 bg-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-orange-400">{companyName} Response</span>
                </div>
                <p className="text-sm text-gray-300">{review.adminResponse.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {review.adminResponse.respondedAt.toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredReviews.length === 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-12 text-center">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No reviews found matching your filters</p>
        </div>
      )}
    </div>
  );
}

// Mock data - approved reviews only
const mockPublicReviews: PublicReview[] = [
  {
    id: 'pub_rev_001',
    employeeName: 'Robert Martinez',
    employeeRole: 'Senior Electrician',
    customerName: 'John S.',
    customerInitials: 'JS',
    ratings: {
      overall: 5,
      professionalism: 5,
      quality: 5,
      timeliness: 4,
      communication: 5
    },
    wouldRecommend: true,
    comments: 'Robert was fantastic! Very professional and thorough. Fixed the issue quickly and explained everything clearly. I would definitely use this company again!',
    adminResponse: {
      message: 'Thank you so much for the wonderful feedback! We\'re thrilled to hear about your positive experience with Robert. We look forward to serving you again in the future!',
      respondedAt: new Date('2026-01-24')
    },
    metadata: {
      submittedAt: new Date('2026-01-24'),
      projectType: 'Electrical Panel Upgrade',
      verified: true
    }
  },
  {
    id: 'pub_rev_002',
    employeeName: 'Sarah Johnson',
    employeeRole: 'Tile Specialist',
    customerName: 'Emily D.',
    customerInitials: 'ED',
    ratings: {
      overall: 5,
      professionalism: 5,
      quality: 5,
      timeliness: 5,
      communication: 5
    },
    wouldRecommend: true,
    comments: 'Beautiful tile work! Sarah is a true craftsperson. She took her time to ensure everything was perfect. The bathroom looks amazing!',
    adminResponse: {
      message: 'We\'re so happy you love your new bathroom! Sarah takes great pride in her work, and we\'ll be sure to share your kind words with her.',
      respondedAt: new Date('2026-01-23')
    },
    metadata: {
      submittedAt: new Date('2026-01-23'),
      projectType: 'Bathroom Remodel',
      verified: true
    }
  },
  {
    id: 'pub_rev_003',
    employeeName: 'Robert Martinez',
    employeeRole: 'Senior Electrician',
    customerName: 'Michael T.',
    customerInitials: 'MT',
    ratings: {
      overall: 5,
      professionalism: 5,
      quality: 5,
      timeliness: 5,
      communication: 5
    },
    wouldRecommend: true,
    comments: 'Excellent service from start to finish. Robert arrived on time, was very professional, and completed the work efficiently. Fair pricing too!',
    metadata: {
      submittedAt: new Date('2026-01-22'),
      projectType: 'Outlet Installation',
      verified: true
    }
  },
  {
    id: 'pub_rev_004',
    employeeName: 'Sarah Johnson',
    employeeRole: 'Tile Specialist',
    customerName: 'Lisa M.',
    customerInitials: 'LM',
    ratings: {
      overall: 4,
      professionalism: 5,
      quality: 5,
      timeliness: 3,
      communication: 4
    },
    wouldRecommend: true,
    comments: 'Great quality work. Sarah did an excellent job on the kitchen backsplash. Only minor issue was scheduling - had to reschedule once. But the final result is beautiful!',
    metadata: {
      submittedAt: new Date('2026-01-20'),
      projectType: 'Kitchen Backsplash',
      verified: true
    }
  }
];
