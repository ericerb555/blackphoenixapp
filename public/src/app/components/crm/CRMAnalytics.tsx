import {
  TrendingUp, TrendingDown, Users, Building2, DollarSign,
  Target, Award, Calendar, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, Activity
} from 'lucide-react';

export function CRMAnalytics() {
  const metrics = [
    {
      label: 'Total Revenue',
      value: '$4.8M',
      change: '+23.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Avg Deal Size',
      value: '$14,250',
      change: '+8.2%',
      trend: 'up',
      icon: Target,
      color: 'blue'
    },
    {
      label: 'Win Rate',
      value: '38.4%',
      change: '+5.1%',
      trend: 'up',
      icon: Award,
      color: 'purple'
    },
    {
      label: 'Sales Cycle',
      value: '42 days',
      change: '-6.3%',
      trend: 'down',
      icon: Calendar,
      color: 'orange'
    },
  ];

  const pipelineMetrics = [
    { stage: 'Lead', count: 145, value: 580000, conversion: 61 },
    { stage: 'Qualified', count: 89, value: 445000, conversion: 63 },
    { stage: 'Proposal', count: 56, value: 340000, conversion: 61 },
    { stage: 'Negotiation', count: 34, value: 280000, conversion: 82 },
    { stage: 'Closed Won', count: 28, value: 420000, conversion: 100 },
  ];

  const topProducts = [
    { name: 'Enterprise CRM', deals: 45, revenue: '$1.2M', growth: '+18%' },
    { name: 'Cloud Migration', deals: 38, revenue: '$980K', growth: '+22%' },
    { name: 'Data Analytics', deals: 32, revenue: '$850K', growth: '+15%' },
    { name: 'IT Consulting', deals: 28, revenue: '$720K', growth: '+12%' },
    { name: 'Marketing Automation', deals: 24, revenue: '$640K', growth: '+25%' },
  ];

  const salesByRegion = [
    { region: 'West Coast', revenue: '$1.8M', percentage: 38, color: 'bg-blue-500' },
    { region: 'East Coast', revenue: '$1.4M', percentage: 29, color: 'bg-purple-500' },
    { region: 'Midwest', revenue: '$950K', percentage: 20, color: 'bg-green-500' },
    { region: 'South', revenue: '$650K', percentage: 13, color: 'bg-yellow-500' },
  ];

  const monthlyTrends = [
    { month: 'Jul', revenue: 380, deals: 18 },
    { month: 'Aug', revenue: 420, deals: 22 },
    { month: 'Sep', revenue: 390, deals: 19 },
    { month: 'Oct', revenue: 450, deals: 25 },
    { month: 'Nov', revenue: 480, deals: 28 },
    { month: 'Dec', revenue: 510, deals: 31 },
    { month: 'Jan', revenue: 540, deals: 34 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <div key={metric.label} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${metric.color}-100`}>
                  <Icon className={`w-6 h-6 text-${metric.color}-600`} />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                  metric.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <TrendIcon className="w-3 h-3" />
                  {metric.change}
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium mb-1">{metric.label}</p>
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Conversion Funnel */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Pipeline Conversion Funnel</h3>
            <p className="text-sm text-gray-600 mt-1">Stage-by-stage conversion rates</p>
          </div>
          <div className="p-6 space-y-4">
            {pipelineMetrics.map((stage, index) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{stage.stage}</span>
                    <span className="text-sm text-gray-600">({stage.count} deals)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">
                      ${(stage.value / 1000).toFixed(0)}K
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {stage.conversion}%
                    </span>
                  </div>
                </div>
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full ${
                      index === 0 ? 'bg-gray-400' :
                      index === 1 ? 'bg-blue-400' :
                      index === 2 ? 'bg-purple-400' :
                      index === 3 ? 'bg-yellow-400' :
                      'bg-green-400'
                    }`}
                    style={{ width: `${(stage.count / pipelineMetrics[0].count) * 100}%` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-sm">
                      {stage.count} → {index < pipelineMetrics.length - 1 ? pipelineMetrics[index + 1].count : stage.count}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Revenue Trend */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Monthly Revenue Trend</h3>
            <p className="text-sm text-gray-600 mt-1">Last 7 months performance</p>
          </div>
          <div className="p-6">
            <div className="flex items-end justify-between h-64 gap-2">
              {monthlyTrends.map((data) => {
                const maxRevenue = Math.max(...monthlyTrends.map(d => d.revenue));
                const height = (data.revenue / maxRevenue) * 100;
                
                return (
                  <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-900">${data.revenue}K</span>
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-700 hover:to-blue-500 transition-colors cursor-pointer"
                        style={{ height: `${height}%`, minHeight: '20px' }}
                        title={`${data.month}: $${data.revenue}K (${data.deals} deals)`}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{data.month}</span>
                    <span className="text-xs text-gray-500">{data.deals}d</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products/Services */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Top Products/Services</h3>
            <p className="text-sm text-gray-600 mt-1">Best performing offerings</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.deals} deals closed</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{product.revenue}</p>
                    <p className="text-sm text-green-600 font-medium">{product.growth}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales by Region */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Sales by Region</h3>
            <p className="text-sm text-gray-600 mt-1">Geographic revenue distribution</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {salesByRegion.map((region) => (
                <div key={region.region}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{region.region}</span>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{region.revenue}</span>
                      <span className="text-sm text-gray-600 ml-2">({region.percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${region.color}`}
                      style={{ width: `${region.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie Chart Representation */}
            <div className="mt-8 flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {salesByRegion.reduce((acc, region, index) => {
                    const prevPercentage = salesByRegion.slice(0, index).reduce((sum, r) => sum + r.percentage, 0);
                    const strokeDasharray = `${region.percentage} ${100 - region.percentage}`;
                    const strokeDashoffset = -prevPercentage;
                    const color = region.color.replace('bg-', '').replace('-500', '');
                    const colorMap: Record<string, string> = {
                      'blue': '#3B82F6',
                      'purple': '#A855F7',
                      'green': '#10B981',
                      'yellow': '#F59E0B',
                    };
                    
                    acc.push(
                      <circle
                        key={region.region}
                        cx="50"
                        cy="50"
                        r="15.9155"
                        fill="transparent"
                        stroke={colorMap[color]}
                        strokeWidth="10"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                    return acc;
                  }, [] as JSX.Element[])}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
