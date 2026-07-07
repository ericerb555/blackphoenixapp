/**
 * Employee Performance Reports Component
 * 
 * Comprehensive reporting dashboard for employee ratings:
 * - Customer feedback aggregation
 * - Internal skill ratings vs customer ratings
 * - Performance trends over time
 * - Top performers
 * - Areas needing improvement
 * - Skill-specific analytics
 * - Recommendation rates
 */

import { useState } from 'react';
import {
  Star, TrendingUp, TrendingDown, Award, AlertCircle, Users,
  BarChart3, Calendar, Download, Filter, Search, ChevronDown,
  ThumbsUp, ThumbsDown, Target, Zap, CheckCircle, XCircle,
  User, MessageSquare, Clock, UserCheck, Wrench, Eye,
  ArrowUp, ArrowDown, Minus, Activity, PieChart, X, FileText
} from 'lucide-react';

interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  
  // Internal ratings (from employee skills database)
  internalRatings: {
    skillName: string;
    qualityRating: number;
    proficiencyLevel: string;
  }[];
  
  // Customer ratings (from feedback system)
  customerRatings: {
    totalReviews: number;
    averageOverall: number;
    averageProfessionalism: number;
    averageQuality: number;
    averageTimeliness: number;
    averageCommunication: number;
    recommendationRate: number; // percentage
    skillRatings: {
      skillName: string;
      averageRating: number;
      reviewCount: number;
    }[];
    recentComments: {
      comment: string;
      rating: number;
      date: Date;
      invoiceNumber: string;
    }[];
  };
  
  // Performance metrics
  metrics: {
    totalJobs: number;
    completionRate: number;
    responseTime: number; // hours
    repeatCustomerRate: number; // percentage
  };
  
  // Trends
  trends: {
    ratingTrend: 'up' | 'down' | 'stable';
    trendPercentage: number;
    lastMonthAverage: number;
    thisMonthAverage: number;
  };
}

export default function EmployeePerformanceReports() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<EmployeePerformance | null>(null);
  const [dateRange, setDateRange] = useState('30'); // days
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'trend'>('rating');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('grid');

  // Mock data - in production, this would come from API
  const performanceData: EmployeePerformance[] = [
    {
      employeeId: 'emp_001',
      employeeName: 'Robert Martinez',
      role: 'Senior Electrician',
      department: 'Field Operations',
      internalRatings: [
        { skillName: 'Electrical Wiring', qualityRating: 5, proficiencyLevel: 'expert' },
        { skillName: 'Electrical Troubleshooting', qualityRating: 5, proficiencyLevel: 'expert' },
        { skillName: 'Blueprint Reading', qualityRating: 4, proficiencyLevel: 'advanced' }
      ],
      customerRatings: {
        totalReviews: 47,
        averageOverall: 4.8,
        averageProfessionalism: 4.9,
        averageQuality: 4.9,
        averageTimeliness: 4.7,
        averageCommunication: 4.8,
        recommendationRate: 96,
        skillRatings: [
          { skillName: 'Electrical Wiring', averageRating: 4.9, reviewCount: 35 },
          { skillName: 'Electrical Troubleshooting', averageRating: 4.8, reviewCount: 28 }
        ],
        recentComments: [
          { comment: 'Robert was fantastic! Very professional and thorough.', rating: 5, date: new Date('2026-01-20'), invoiceNumber: 'INV-12345' },
          { comment: 'Great work, arrived on time and fixed everything quickly.', rating: 5, date: new Date('2026-01-18'), invoiceNumber: 'INV-12340' }
        ]
      },
      metrics: {
        totalJobs: 152,
        completionRate: 99,
        responseTime: 2.5,
        repeatCustomerRate: 78
      },
      trends: {
        ratingTrend: 'up',
        trendPercentage: 8,
        lastMonthAverage: 4.6,
        thisMonthAverage: 4.8
      }
    },
    {
      employeeId: 'emp_002',
      employeeName: 'Sarah Johnson',
      role: 'Tile Specialist',
      department: 'Field Operations',
      internalRatings: [
        { skillName: 'Tile Installation', qualityRating: 5, proficiencyLevel: 'expert' },
        { skillName: 'Flooring Installation', qualityRating: 4, proficiencyLevel: 'advanced' }
      ],
      customerRatings: {
        totalReviews: 38,
        averageOverall: 4.7,
        averageProfessionalism: 4.8,
        averageQuality: 4.9,
        averageTimeliness: 4.5,
        averageCommunication: 4.6,
        recommendationRate: 94,
        skillRatings: [
          { skillName: 'Tile Installation', averageRating: 4.9, reviewCount: 32 },
          { skillName: 'Flooring Installation', averageRating: 4.6, reviewCount: 15 }
        ],
        recentComments: [
          { comment: 'Beautiful tile work! Sarah is a true craftsperson.', rating: 5, date: new Date('2026-01-22'), invoiceNumber: 'INV-12350' }
        ]
      },
      metrics: {
        totalJobs: 125,
        completionRate: 98,
        responseTime: 3.1,
        repeatCustomerRate: 72
      },
      trends: {
        ratingTrend: 'stable',
        trendPercentage: 2,
        lastMonthAverage: 4.7,
        thisMonthAverage: 4.7
      }
    },
    {
      employeeId: 'emp_003',
      employeeName: 'Mike Thompson',
      role: 'Plumber',
      department: 'Field Operations',
      internalRatings: [
        { skillName: 'Plumbing Installation', qualityRating: 3, proficiencyLevel: 'intermediate' },
        { skillName: 'Plumbing Repair', qualityRating: 3, proficiencyLevel: 'intermediate' }
      ],
      customerRatings: {
        totalReviews: 22,
        averageOverall: 3.8,
        averageProfessionalism: 4.1,
        averageQuality: 3.6,
        averageTimeliness: 3.9,
        averageCommunication: 3.7,
        recommendationRate: 68,
        skillRatings: [
          { skillName: 'Plumbing Installation', averageRating: 3.7, reviewCount: 18 },
          { skillName: 'Plumbing Repair', averageRating: 3.5, reviewCount: 12 }
        ],
        recentComments: [
          { comment: 'Job was done but took longer than expected.', rating: 3, date: new Date('2026-01-19'), invoiceNumber: 'INV-12342' }
        ]
      },
      metrics: {
        totalJobs: 89,
        completionRate: 95,
        responseTime: 4.8,
        repeatCustomerRate: 52
      },
      trends: {
        ratingTrend: 'down',
        trendPercentage: 5,
        lastMonthAverage: 4.0,
        thisMonthAverage: 3.8
      }
    }
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-400" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-400" />;
      case 'stable': return <Minus className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-400 bg-green-600/20 border-green-500/30';
      case 'down': return 'text-red-400 bg-red-600/20 border-red-500/30';
      case 'stable': return 'text-blue-400 bg-blue-600/20 border-blue-500/30';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 4.0) return 'text-blue-400';
    if (rating >= 3.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPerformanceLevel = (rating: number) => {
    if (rating >= 4.7) return { label: 'Exceptional', color: 'bg-orange-600/20 text-orange-400 border-orange-500/30' };
    if (rating >= 4.3) return { label: 'Excellent', color: 'bg-green-600/20 text-green-400 border-green-500/30' };
    if (rating >= 4.0) return { label: 'Very Good', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' };
    if (rating >= 3.5) return { label: 'Good', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30' };
    return { label: 'Needs Improvement', color: 'bg-red-600/20 text-red-400 border-red-500/30' };
  };

  // Calculate overall stats
  const totalReviews = performanceData.reduce((sum, emp) => sum + emp.customerRatings.totalReviews, 0);
  const averageRating = performanceData.reduce((sum, emp) => sum + emp.customerRatings.averageOverall * emp.customerRatings.totalReviews, 0) / totalReviews;
  const topPerformers = performanceData.filter(emp => emp.customerRatings.averageOverall >= 4.5).length;
  const needsImprovement = performanceData.filter(emp => emp.customerRatings.averageOverall < 4.0).length;

  const handleViewDetails = (employeeId: string) => {
    const employee = performanceData.find(emp => emp.employeeId === employeeId);
    if (employee) {
      setSelectedEmployeeData(employee);
      setSelectedEmployee(employeeId);
    }
  };

  const closeDetailModal = () => {
    setSelectedEmployee(null);
    setSelectedEmployeeData(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-400" />
              Employee Performance Reports
            </h2>
            <p className="text-gray-400 text-sm">Customer feedback and ratings analysis</p>
          </div>
          <button className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{performanceData.length}</p>
                <p className="text-xs text-gray-400">Total Employees</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-600/20 rounded-lg">
                <Star className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{averageRating.toFixed(1)}</p>
                <p className="text-xs text-gray-400">Avg Rating</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <Award className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{topPerformers}</p>
                <p className="text-xs text-gray-400">Top Performers</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-600/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{needsImprovement}</p>
                <p className="text-xs text-gray-400">Needs Attention</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
                placeholder="Search employees..."
              />
            </div>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="rating">Sort by Rating</option>
            <option value="reviews">Sort by Reviews</option>
            <option value="trend">Sort by Trend</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2.5 rounded-xl transition ${
                viewMode === 'grid'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-4 py-2.5 rounded-xl transition ${
                viewMode === 'detailed'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:text-white'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Employee Performance Cards */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
        {performanceData.map(employee => {
          const performanceLevel = getPerformanceLevel(employee.customerRatings.averageOverall);
          
          return viewMode === 'grid' ? (
            // Grid View
            <div key={employee.employeeId} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{employee.employeeName}</h3>
                    <p className="text-sm text-gray-400">{employee.role}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 ${getTrendColor(employee.trends.ratingTrend)}`}>
                  {getTrendIcon(employee.trends.ratingTrend)}
                  {employee.trends.trendPercentage}%
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Overall Rating</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(employee.customerRatings.averageOverall)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`font-bold ${getRatingColor(employee.customerRatings.averageOverall)}`}>
                      {employee.customerRatings.averageOverall.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Total Reviews</span>
                  <span className="text-white font-semibold">{employee.customerRatings.totalReviews}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Recommendation</span>
                  <span className="text-green-400 font-semibold">{employee.customerRatings.recommendationRate}%</span>
                </div>
              </div>

              <div className={`px-3 py-2 rounded-lg border text-center font-semibold text-sm ${performanceLevel.color}`}>
                {performanceLevel.label}
              </div>

              <button
                onClick={() => handleViewDetails(employee.employeeId)}
                className="w-full mt-4 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>
          ) : (
            // Detailed View
            <div key={employee.employeeId} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
              {/* Employee Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{employee.employeeName}</h3>
                    <p className="text-gray-400">{employee.role} • {employee.department}</p>
                    <div className={`inline-block mt-1 px-2 py-1 rounded-lg border text-xs font-bold ${performanceLevel.color}`}>
                      {performanceLevel.label}
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-2 rounded-lg border font-bold flex items-center gap-2 ${getTrendColor(employee.trends.ratingTrend)}`}>
                  {getTrendIcon(employee.trends.ratingTrend)}
                  <div className="text-right">
                    <p className="text-sm">{employee.trends.trendPercentage}%</p>
                    <p className="text-xs opacity-75">vs last month</p>
                  </div>
                </div>
              </div>

              {/* Rating Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= Math.round(employee.customerRatings.averageOverall) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                    ))}
                  </div>
                  <p className={`text-2xl font-bold ${getRatingColor(employee.customerRatings.averageOverall)}`}>
                    {employee.customerRatings.averageOverall.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">Overall</p>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 text-center">
                  <UserCheck className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                  <p className="text-xl font-bold text-white">{employee.customerRatings.averageProfessionalism.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">Professional</p>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 text-center">
                  <Award className="w-6 h-6 mx-auto mb-1 text-green-400" />
                  <p className="text-xl font-bold text-white">{employee.customerRatings.averageQuality.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">Quality</p>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 text-center">
                  <Clock className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                  <p className="text-xl font-bold text-white">{employee.customerRatings.averageTimeliness.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">Timeliness</p>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 text-center">
                  <MessageSquare className="w-6 h-6 mx-auto mb-1 text-orange-400" />
                  <p className="text-xl font-bold text-white">{employee.customerRatings.averageCommunication.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">Communication</p>
                </div>
              </div>

              {/* Skills Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-400" />
                    Skill Ratings Comparison
                  </h4>
                  <div className="space-y-2">
                    {employee.customerRatings.skillRatings.map(skill => {
                      const internalRating = employee.internalRatings.find(ir => ir.skillName === skill.skillName);
                      return (
                        <div key={skill.skillName} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{skill.skillName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-blue-400">Internal: {internalRating?.qualityRating || 'N/A'}</span>
                              <span className="text-gray-500">|</span>
                              <span className="text-green-400">Customer: {skill.averageRating.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600" style={{ width: `${(internalRating?.qualityRating || 0) * 20}%` }}></div>
                            </div>
                            <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                              <div className="h-full bg-green-600" style={{ width: `${skill.averageRating * 20}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-400" />
                    Performance Metrics
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Total Jobs</span>
                      <span className="text-white font-semibold">{employee.metrics.totalJobs}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Completion Rate</span>
                      <span className="text-green-400 font-semibold">{employee.metrics.completionRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Avg Response Time</span>
                      <span className="text-blue-400 font-semibold">{employee.metrics.responseTime}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Repeat Customers</span>
                      <span className="text-purple-400 font-semibold">{employee.metrics.repeatCustomerRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Would Recommend</span>
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-semibold">{employee.customerRatings.recommendationRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Comments */}
              {employee.customerRatings.recentComments.length > 0 && (
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-400" />
                    Recent Customer Feedback
                  </h4>
                  <div className="space-y-3">
                    {employee.customerRatings.recentComments.map((comment, idx) => (
                      <div key={idx} className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} className={`w-3 h-3 ${star <= comment.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">{comment.invoiceNumber}</span>
                        </div>
                        <p className="text-sm text-gray-300">{comment.comment}</p>
                        <p className="text-xs text-gray-500 mt-1">{comment.date.toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Employee Modal */}
      {selectedEmployee && selectedEmployeeData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-6xl my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedEmployeeData.employeeName}</h2>
                  <p className="text-gray-400">{selectedEmployeeData.role} • {selectedEmployeeData.department}</p>
                </div>
              </div>
              <button
                onClick={closeDetailModal}
                className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] transition text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto">
              {/* Performance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-orange-600/20 rounded-lg">
                      <Star className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 ${getTrendColor(selectedEmployeeData.trends.ratingTrend)}`}>
                      {getTrendIcon(selectedEmployeeData.trends.ratingTrend)}
                      {selectedEmployeeData.trends.trendPercentage}%
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {selectedEmployeeData.customerRatings.averageOverall.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-400">Overall Rating</p>
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(selectedEmployeeData.customerRatings.averageOverall)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
                  <div className="p-2 bg-blue-600/20 rounded-lg w-fit mb-3">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {selectedEmployeeData.customerRatings.totalReviews}
                  </p>
                  <p className="text-sm text-gray-400">Total Reviews</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Last 30 days: {Math.floor(selectedEmployeeData.customerRatings.totalReviews * 0.2)}
                  </p>
                </div>

                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
                  <div className="p-2 bg-green-600/20 rounded-lg w-fit mb-3">
                    <ThumbsUp className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-green-400 mb-1">
                    {selectedEmployeeData.customerRatings.recommendationRate}%
                  </p>
                  <p className="text-sm text-gray-400">Recommendation Rate</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Industry avg: 85%
                  </p>
                </div>

                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
                  <div className="p-2 bg-purple-600/20 rounded-lg w-fit mb-3">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {selectedEmployeeData.metrics.completionRate}%
                  </p>
                  <p className="text-sm text-gray-400">Completion Rate</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedEmployeeData.metrics.totalJobs} total jobs
                  </p>
                </div>
              </div>

              {/* Detailed Rating Breakdown */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                  Rating Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        Professionalism
                      </span>
                      <span className="font-bold text-white">
                        {selectedEmployeeData.customerRatings.averageProfessionalism.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${(selectedEmployeeData.customerRatings.averageProfessionalism / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-400" />
                        Quality
                      </span>
                      <span className="font-bold text-white">
                        {selectedEmployeeData.customerRatings.averageQuality.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all duration-500"
                        style={{ width: `${(selectedEmployeeData.customerRatings.averageQuality / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        Timeliness
                      </span>
                      <span className="font-bold text-white">
                        {selectedEmployeeData.customerRatings.averageTimeliness.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all duration-500"
                        style={{ width: `${(selectedEmployeeData.customerRatings.averageTimeliness / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-orange-400" />
                        Communication
                      </span>
                      <span className="font-bold text-white">
                        {selectedEmployeeData.customerRatings.averageCommunication.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-600 transition-all duration-500"
                        style={{ width: `${(selectedEmployeeData.customerRatings.averageCommunication / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Comparison Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-orange-400" />
                    Internal vs Customer Skill Ratings
                  </h3>
                  <div className="space-y-4">
                    {selectedEmployeeData.customerRatings.skillRatings.map(skill => {
                      const internalRating = selectedEmployeeData.internalRatings.find(ir => ir.skillName === skill.skillName);
                      const difference = skill.averageRating - (internalRating?.qualityRating || 0);
                      
                      return (
                        <div key={skill.skillName} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{skill.skillName}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-blue-400">
                                Internal: {internalRating?.qualityRating || 'N/A'}
                              </span>
                              <span className="text-xs text-green-400">
                                Customer: {skill.averageRating.toFixed(1)}
                              </span>
                              {difference !== 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  difference > 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                                }`}>
                                  {difference > 0 ? '+' : ''}{difference.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600"
                                  style={{ width: `${(internalRating?.qualityRating || 0) * 20}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-600"
                                  style={{ width: `${skill.averageRating * 20}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">{skill.reviewCount} customer reviews</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                          <Target className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-400">Total Jobs Completed</span>
                      </div>
                      <span className="text-lg font-bold text-white">
                        {selectedEmployeeData.metrics.totalJobs}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-600/20 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="text-sm text-gray-400">Job Completion Rate</span>
                      </div>
                      <span className="text-lg font-bold text-green-400">
                        {selectedEmployeeData.metrics.completionRate}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                          <Clock className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-sm text-gray-400">Avg Response Time</span>
                      </div>
                      <span className="text-lg font-bold text-purple-400">
                        {selectedEmployeeData.metrics.responseTime}h
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-600/20 rounded-lg">
                          <Users className="w-4 h-4 text-orange-400" />
                        </div>
                        <span className="text-sm text-gray-400">Repeat Customer Rate</span>
                      </div>
                      <span className="text-lg font-bold text-orange-400">
                        {selectedEmployeeData.metrics.repeatCustomerRate}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gradient-to-br from-orange-600/20 to-orange-700/10 rounded-lg border border-orange-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-orange-400" />
                      <span className="font-bold text-white">Performance Level</span>
                    </div>
                    <p className={`text-xl font-bold ${getPerformanceLevel(selectedEmployeeData.customerRatings.averageOverall).color}`}>
                      {getPerformanceLevel(selectedEmployeeData.customerRatings.averageOverall).label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Trend */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  Performance Trend
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#0A0A0A] rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">Last Month Average</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-white">
                        {selectedEmployeeData.trends.lastMonthAverage.toFixed(1)}
                      </p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= Math.round(selectedEmployeeData.trends.lastMonthAverage)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0A0A0A] rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">This Month Average</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-white">
                        {selectedEmployeeData.trends.thisMonthAverage.toFixed(1)}
                      </p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= Math.round(selectedEmployeeData.trends.thisMonthAverage)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-lg p-4 border ${getTrendColor(selectedEmployeeData.trends.ratingTrend)}`}>
                    <p className="text-sm opacity-75 mb-2">Trend Direction</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {selectedEmployeeData.trends.trendPercentage}%
                      </p>
                      {getTrendIcon(selectedEmployeeData.trends.ratingTrend)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Customer Feedback */}
              {selectedEmployeeData.customerRatings.recentComments.length > 0 && (
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-orange-400" />
                    Recent Customer Feedback
                  </h3>
                  <div className="space-y-3">
                    {selectedEmployeeData.customerRatings.recentComments.map((comment, idx) => (
                      <div key={idx} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= comment.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <FileText className="w-3 h-3" />
                            {comment.invoiceNumber}
                          </div>
                        </div>
                        <p className="text-gray-300 mb-2">{comment.comment}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {comment.date.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-medium flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Full Report
                </button>
                <button className="flex-1 px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium flex items-center justify-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  View All Reviews
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
