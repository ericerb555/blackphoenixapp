import { useState, useEffect } from 'react';
import { 
  Brain, Video, Camera, MessageSquare, TrendingUp, Users, 
  Clock, CheckCircle, Target, Zap, DollarSign, Star,
  ArrowUpRight, ArrowDownRight, Sparkles, Eye, FileText,
  BarChart3, PieChart, Activity, Layers
} from 'lucide-react';
import { DataTable, Column } from '../ui/table/DataTable';

interface AIWorkRequestStats {
  totalRequests: number;
  aiGuideUsage: number;
  videoAnalysisUsage: number;
  standardFormUsage: number;
  averageCompletionTime: number;
  conversionRate: number;
  aiAccuracyRate: number;
  preFillSuccessRate: number;
}

interface ConversationMetric {
  id: string;
  date: string;
  customerName: string;
  projectType: string;
  messagesExchanged: number;
  usedVideoAnalysis: boolean;
  completionStatus: 'completed' | 'abandoned' | 'in_progress';
  aiAccuracy: number;
  timeToComplete: number;
  leadValue: number;
}

interface VideoAnalysisMetric {
  id: string;
  date: string;
  customerName: string;
  roomType: string;
  videoDuration: number;
  dimensionsDetected: boolean;
  materialsIdentified: number;
  floorPlanGenerated: boolean;
  accuracyScore: number;
  processingTime: number;
}

export default function AIWorkRequestAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AIWorkRequestStats>({
    totalRequests: 0,
    aiGuideUsage: 0,
    videoAnalysisUsage: 0,
    standardFormUsage: 0,
    averageCompletionTime: 0,
    conversionRate: 0,
    aiAccuracyRate: 0,
    preFillSuccessRate: 0
  });

  const [conversationData, setConversationData] = useState<ConversationMetric[]>([]);
  const [videoAnalysisData, setVideoAnalysisData] = useState<VideoAnalysisMetric[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    
    // Simulate loading analytics data
    // In production, this would fetch from Supabase or your analytics service
    setTimeout(() => {
      setStats({
        totalRequests: 247,
        aiGuideUsage: 189,
        videoAnalysisUsage: 142,
        standardFormUsage: 58,
        averageCompletionTime: 8.5,
        conversionRate: 78.2,
        aiAccuracyRate: 94.7,
        preFillSuccessRate: 91.3
      });

      setConversationData([
        {
          id: 'WR-2401',
          date: '2026-02-21',
          customerName: 'John Martinez',
          projectType: 'Kitchen Renovation',
          messagesExchanged: 8,
          usedVideoAnalysis: true,
          completionStatus: 'completed',
          aiAccuracy: 96.5,
          timeToComplete: 6.2,
          leadValue: 45000
        },
        {
          id: 'WR-2402',
          date: '2026-02-21',
          customerName: 'Sarah Johnson',
          projectType: 'Bathroom Remodel',
          messagesExchanged: 12,
          usedVideoAnalysis: true,
          completionStatus: 'completed',
          aiAccuracy: 93.8,
          timeToComplete: 9.5,
          leadValue: 28000
        },
        {
          id: 'WR-2403',
          date: '2026-02-20',
          customerName: 'Michael Chen',
          projectType: 'Full Home Renovation',
          messagesExchanged: 15,
          usedVideoAnalysis: true,
          completionStatus: 'completed',
          aiAccuracy: 97.2,
          timeToComplete: 12.8,
          leadValue: 125000
        },
        {
          id: 'WR-2404',
          date: '2026-02-20',
          customerName: 'Emily Rodriguez',
          projectType: 'Deck Addition',
          messagesExchanged: 5,
          usedVideoAnalysis: false,
          completionStatus: 'abandoned',
          aiAccuracy: 0,
          timeToComplete: 3.2,
          leadValue: 0
        },
        {
          id: 'WR-2405',
          date: '2026-02-19',
          customerName: 'David Thompson',
          projectType: 'Kitchen Renovation',
          messagesExchanged: 10,
          usedVideoAnalysis: true,
          completionStatus: 'completed',
          aiAccuracy: 95.1,
          timeToComplete: 7.8,
          leadValue: 52000
        }
      ]);

      setVideoAnalysisData([
        {
          id: 'VA-1501',
          date: '2026-02-21',
          customerName: 'John Martinez',
          roomType: 'Kitchen',
          videoDuration: 185,
          dimensionsDetected: true,
          materialsIdentified: 8,
          floorPlanGenerated: true,
          accuracyScore: 96.5,
          processingTime: 12.3
        },
        {
          id: 'VA-1502',
          date: '2026-02-21',
          customerName: 'Sarah Johnson',
          roomType: 'Bathroom',
          videoDuration: 124,
          dimensionsDetected: true,
          materialsIdentified: 6,
          floorPlanGenerated: true,
          accuracyScore: 93.8,
          processingTime: 8.7
        },
        {
          id: 'VA-1503',
          date: '2026-02-20',
          customerName: 'Michael Chen',
          roomType: 'Multiple Rooms',
          videoDuration: 432,
          dimensionsDetected: true,
          materialsIdentified: 24,
          floorPlanGenerated: true,
          accuracyScore: 97.2,
          processingTime: 28.5
        },
        {
          id: 'VA-1504',
          date: '2026-02-19',
          customerName: 'David Thompson',
          roomType: 'Kitchen',
          videoDuration: 156,
          dimensionsDetected: true,
          materialsIdentified: 7,
          floorPlanGenerated: true,
          accuracyScore: 95.1,
          processingTime: 10.8
        }
      ]);

      setLoading(false);
    }, 1000);
  };

  const conversationColumns: Column<ConversationMetric>[] = [
    {
      key: 'id',
      header: 'Request ID',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center border border-blue-500/20">
            <MessageSquare className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-semibold text-white">{row.id}</span>
        </div>
      )
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="font-medium text-white">{row.customerName}</div>
          <div className="text-xs text-gray-500">{row.date}</div>
        </div>
      )
    },
    {
      key: 'projectType',
      header: 'Project Type',
      render: (row) => (
        <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
          {row.projectType}
        </span>
      )
    },
    {
      key: 'messagesExchanged',
      header: 'AI Messages',
      render: (row) => (
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span className="text-white font-medium">{row.messagesExchanged}</span>
        </div>
      )
    },
    {
      key: 'usedVideoAnalysis',
      header: 'Video Analysis',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.usedVideoAnalysis ? (
            <>
              <Video className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 font-medium">Yes</span>
            </>
          ) : (
            <span className="text-gray-500">No</span>
          )}
        </div>
      )
    },
    {
      key: 'aiAccuracy',
      header: 'AI Accuracy',
      render: (row) => (
        row.aiAccuracy > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  row.aiAccuracy >= 95 ? 'bg-green-500' :
                  row.aiAccuracy >= 90 ? 'bg-blue-500' :
                  'bg-yellow-500'
                }`}
                style={{ width: `${row.aiAccuracy}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-white">{row.aiAccuracy.toFixed(1)}%</span>
          </div>
        ) : (
          <span className="text-gray-500">N/A</span>
        )
      )
    },
    {
      key: 'timeToComplete',
      header: 'Time',
      render: (row) => (
        <div className="flex items-center gap-1 text-gray-300">
          <Clock className="w-4 h-4" />
          <span>{row.timeToComplete.toFixed(1)}m</span>
        </div>
      )
    },
    {
      key: 'completionStatus',
      header: 'Status',
      render: (row) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
          row.completionStatus === 'completed' 
            ? 'bg-green-500/10 text-green-400 border-green-500/20'
            : row.completionStatus === 'abandoned'
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        }`}>
          {row.completionStatus.toUpperCase()}
        </span>
      )
    },
    {
      key: 'leadValue',
      header: 'Lead Value',
      render: (row) => (
        <div className="font-semibold text-green-400">
          {row.leadValue > 0 ? `$${row.leadValue.toLocaleString()}` : '-'}
        </div>
      )
    }
  ];

  const videoAnalysisColumns: Column<VideoAnalysisMetric>[] = [
    {
      key: 'id',
      header: 'Analysis ID',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center border border-purple-500/20">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-semibold text-white">{row.id}</span>
        </div>
      )
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="font-medium text-white">{row.customerName}</div>
          <div className="text-xs text-gray-500">{row.date}</div>
        </div>
      )
    },
    {
      key: 'roomType',
      header: 'Room Type',
      render: (row) => (
        <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {row.roomType}
        </span>
      )
    },
    {
      key: 'videoDuration',
      header: 'Duration',
      render: (row) => (
        <div className="flex items-center gap-1 text-gray-300">
          <Video className="w-4 h-4" />
          <span>{Math.floor(row.videoDuration / 60)}:{(row.videoDuration % 60).toString().padStart(2, '0')}</span>
        </div>
      )
    },
    {
      key: 'materialsIdentified',
      header: 'Materials',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          <span className="text-white font-medium">{row.materialsIdentified}</span>
        </div>
      )
    },
    {
      key: 'floorPlanGenerated',
      header: 'Floor Plan',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.floorPlanGenerated ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">Generated</span>
            </>
          ) : (
            <span className="text-gray-500">Failed</span>
          )}
        </div>
      )
    },
    {
      key: 'accuracyScore',
      header: 'Accuracy',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                row.accuracyScore >= 95 ? 'bg-green-500' :
                row.accuracyScore >= 90 ? 'bg-blue-500' :
                'bg-yellow-500'
              }`}
              style={{ width: `${row.accuracyScore}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-white">{row.accuracyScore.toFixed(1)}%</span>
        </div>
      )
    },
    {
      key: 'processingTime',
      header: 'Processing',
      render: (row) => (
        <div className="flex items-center gap-1 text-gray-300">
          <Zap className="w-4 h-4" />
          <span>{row.processingTime.toFixed(1)}s</span>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading AI analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            AI Work Request Analytics
          </h2>
          <p className="text-gray-400">Performance metrics for AI-powered quote requests</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-xl font-medium transition ${
                timeRange === range
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]'
              }`}
            >
              {range === 'all' ? 'All Time' : `Last ${range}`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center border border-blue-500/20">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +18%
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.totalRequests}</p>
          <p className="text-sm text-gray-400">Total Requests</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center border border-purple-500/20">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +24%
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.aiGuideUsage}</p>
          <p className="text-sm text-gray-400">AI Guide Used</p>
          <div className="mt-2 text-xs text-purple-400">
            {((stats.aiGuideUsage / stats.totalRequests) * 100).toFixed(1)}% adoption
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600/20 to-red-600/20 flex items-center justify-center border border-orange-500/20">
              <Video className="w-6 h-6 text-orange-400" />
            </div>
            <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +32%
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.videoAnalysisUsage}</p>
          <p className="text-sm text-gray-400">Video Analysis</p>
          <div className="mt-2 text-xs text-orange-400">
            {((stats.videoAnalysisUsage / stats.totalRequests) * 100).toFixed(1)}% adoption
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 flex items-center justify-center border border-green-500/20">
              <Target className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +8%
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.conversionRate}%</p>
          <p className="text-sm text-gray-400">Conversion Rate</p>
          <div className="mt-2 text-xs text-green-400">
            +5.2% vs. standard form
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl p-6 border border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Avg. Completion Time</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.averageCompletionTime}min</p>
          <p className="text-xs text-gray-400 mt-1">43% faster than standard</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">AI Accuracy Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.aiAccuracyRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Measurement accuracy</p>
        </div>

        <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 rounded-2xl p-6 border border-green-500/20">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-green-400">Pre-fill Success</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.preFillSuccessRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Fields auto-populated</p>
        </div>

        <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 rounded-2xl p-6 border border-orange-500/20">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-medium text-orange-400">Avg. Lead Value</span>
          </div>
          <p className="text-2xl font-bold text-white">$62,500</p>
          <p className="text-xs text-gray-400 mt-1">From completed requests</p>
        </div>
      </div>

      {/* AI Conversation Data */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                AI Conversation Analytics
              </h3>
              <p className="text-sm text-gray-400 mt-1">Customer interactions with AI assistant</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
        <DataTable
          columns={conversationColumns}
          data={conversationData}
          emptyMessage="No conversation data available"
        />
      </div>

      {/* Video Analysis Data */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-400" />
                Video Analysis Performance
              </h3>
              <p className="text-sm text-gray-400 mt-1">AI video processing metrics and accuracy</p>
            </div>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              View Details
            </button>
          </div>
        </div>
        <DataTable
          columns={videoAnalysisColumns}
          data={videoAnalysisData}
          emptyMessage="No video analysis data available"
        />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 rounded-2xl p-6 border border-green-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Key Insights</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>AI Guide users complete forms <strong className="text-white">43% faster</strong></span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>Video Analysis increases accuracy to <strong className="text-white">94.7%</strong></span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>Conversion rate improved by <strong className="text-white">+5.2%</strong></span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 rounded-2xl p-6 border border-orange-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Recommendations</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm text-gray-300">
              <ArrowUpRight className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <span>Promote AI Video Analysis more prominently - 32% higher conversion</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-300">
              <ArrowUpRight className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <span>Add more kitchen/bathroom conversation templates</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-300">
              <ArrowUpRight className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <span>Consider auto-starting video analysis for high-value projects</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
