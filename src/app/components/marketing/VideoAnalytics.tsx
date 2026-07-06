import {
  Eye, ThumbsUp, Share2, MessageSquare, TrendingUp,
  Clock, Users, Target, BarChart3, Play, Download
} from 'lucide-react';

export function VideoAnalytics() {
  const metrics = [
    {
      label: 'Total Views',
      value: '45,234',
      change: '+15.3%',
      trend: 'up',
      icon: Eye,
      color: 'blue'
    },
    {
      label: 'Engagement Rate',
      value: '67.8%',
      change: '+8.2%',
      trend: 'up',
      icon: TrendingUp,
      color: 'green'
    },
    {
      label: 'Avg Watch Time',
      value: '2:45',
      change: '+12.5%',
      trend: 'up',
      icon: Clock,
      color: 'purple'
    },
    {
      label: 'Total Interactions',
      value: '8,432',
      change: '+21.7%',
      trend: 'up',
      icon: MessageSquare,
      color: 'orange'
    },
  ];

  const topVideos = [
    {
      title: 'Enterprise CRM Solution Demo',
      views: 12470,
      likes: 892,
      shares: 234,
      avgWatchTime: '85%',
      engagement: '72%'
    },
    {
      title: 'Customer Portal Walkthrough',
      views: 8932,
      likes: 645,
      shares: 189,
      avgWatchTime: '78%',
      engagement: '68%'
    },
    {
      title: 'Master Scheduling Tutorial',
      views: 7124,
      likes: 521,
      shares: 143,
      avgWatchTime: '82%',
      engagement: '65%'
    },
    {
      title: 'AI Quote Builder Overview',
      views: 5689,
      likes: 423,
      shares: 112,
      avgWatchTime: '91%',
      engagement: '75%'
    },
  ];

  const modulePerformance = [
    { module: 'CRM Management', views: 15234, engagement: 68, videos: 12 },
    { module: 'Customer Portal', views: 12890, engagement: 72, videos: 18 },
    { module: 'Reports & Analytics', views: 9876, engagement: 65, videos: 20 },
    { module: 'Master Scheduling', views: 8432, engagement: 70, videos: 8 },
    { module: 'Quote Builder', views: 7654, engagement: 75, videos: 15 },
  ];

  const viewsByPlatform = [
    { platform: 'Website', views: 18500, percentage: 41, color: 'bg-blue-500' },
    { platform: 'LinkedIn', views: 12300, percentage: 27, color: 'bg-purple-500' },
    { platform: 'YouTube', views: 8900, percentage: 20, color: 'bg-red-500' },
    { platform: 'Facebook', views: 3800, percentage: 8, color: 'bg-blue-600' },
    { platform: 'Instagram', views: 1734, percentage: 4, color: 'bg-pink-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${metric.color}-100`}>
                  <Icon className={`w-6 h-6 text-${metric.color}-600`} />
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                  {metric.change}
                </span>
              </div>
              <p className="text-sm text-gray-600 font-medium mb-1">{metric.label}</p>
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Videos */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Top Performing Videos</h3>
            <p className="text-sm text-gray-600 mt-1">Most viewed and engaged content</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topVideos.map((video, index) => (
                <div key={video.title} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{video.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {video.views.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {video.likes}
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="w-4 h-4" />
                        {video.shares}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{video.engagement}</p>
                    <p className="text-xs text-gray-500">engagement</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Module Performance */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Performance by Module</h3>
            <p className="text-sm text-gray-600 mt-1">Video engagement across modules</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {modulePerformance.map((item) => (
                <div key={item.module}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.module}</span>
                      <span className="text-sm text-gray-600">({item.videos} videos)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{item.views.toLocaleString()}</span>
                      <span className="text-sm text-gray-600 ml-2">{item.engagement}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${item.engagement}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Views by Platform */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Views by Platform</h3>
          <p className="text-sm text-gray-600 mt-1">Distribution across publishing platforms</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              {viewsByPlatform.map((platform) => (
                <div key={platform.platform}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{platform.platform}</span>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{platform.views.toLocaleString()}</span>
                      <span className="text-sm text-gray-600 ml-2">({platform.percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${platform.color}`}
                      style={{ width: `${platform.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <div className="relative w-64 h-64">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {viewsByPlatform.reduce((acc, platform, index) => {
                    const prevPercentage = viewsByPlatform.slice(0, index).reduce((sum, p) => sum + p.percentage, 0);
                    const strokeDasharray = `${platform.percentage} ${100 - platform.percentage}`;
                    const strokeDashoffset = -prevPercentage;
                    const colorMap: Record<string, string> = {
                      'bg-blue-500': '#3B82F6',
                      'bg-purple-500': '#A855F7',
                      'bg-red-500': '#EF4444',
                      'bg-blue-600': '#2563EB',
                      'bg-pink-500': '#EC4899',
                    };
                    
                    acc.push(
                      <circle
                        key={platform.platform}
                        cx="50"
                        cy="50"
                        r="15.9155"
                        fill="transparent"
                        stroke={colorMap[platform.color]}
                        strokeWidth="10"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                    return acc;
                  }, [] as JSX.Element[])}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">45.2K</p>
                    <p className="text-sm text-gray-600">Total Views</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">Export Analytics Report</h3>
            <p className="text-blue-100">Download comprehensive video performance data</p>
          </div>
          <button className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}
