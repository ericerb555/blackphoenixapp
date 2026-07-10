import { 
  Users, Building2, DollarSign, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Phone, Mail, 
  Calendar, Target, Award, Clock
} from 'lucide-react';

export function CRMDashboard() {
  const stats = [
    {
      label: 'Total Contacts',
      value: '2,847',
      change: '+12.5%',
      trend: 'up',
      icon: Users
    },
    {
      label: 'Active Companies',
      value: '456',
      change: '+8.2%',
      trend: 'up',
      icon: Building2
    },
    {
      label: 'Pipeline Value',
      value: '$1.2M',
      change: '+18.4%',
      trend: 'up',
      icon: DollarSign
    },
    {
      label: 'Conversion Rate',
      value: '34.8%',
      change: '-2.1%',
      trend: 'down',
      icon: TrendingUp
    },
    {
      label: 'Avg Deal Size',
      value: '$12,450',
      change: '+5.3%',
      trend: 'up',
      icon: Target
    },
    {
      label: 'Deals Closed',
      value: '89',
      change: '+15.7%',
      trend: 'up',
      icon: Award
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'call',
      contact: 'Sarah Johnson',
      company: 'Tech Solutions Inc',
      description: 'Initial discovery call completed',
      time: '15 minutes ago',
      icon: Phone
    },
    {
      id: 2,
      type: 'email',
      contact: 'Michael Chen',
      company: 'Global Enterprises',
      description: 'Proposal sent for review',
      time: '1 hour ago',
      icon: Mail
    },
    {
      id: 3,
      type: 'meeting',
      contact: 'Emily Rodriguez',
      company: 'Innovation Labs',
      description: 'Product demo scheduled',
      time: '2 hours ago',
      icon: Calendar
    },
    {
      id: 4,
      type: 'call',
      contact: 'David Park',
      company: 'StartupXYZ',
      description: 'Follow-up call - contract negotiation',
      time: '3 hours ago',
      icon: Phone
    },
    {
      id: 5,
      type: 'email',
      contact: 'Lisa Anderson',
      company: 'Enterprise Corp',
      description: 'Quote request received',
      time: '5 hours ago',
      icon: Mail
    },
  ];

  const pipelineStages = [
    { name: 'Lead', count: 145, value: '$580K', color: 'bg-gray-400' },
    { name: 'Qualified', count: 89, value: '$445K', color: 'bg-orange-400' },
    { name: 'Proposal', count: 56, value: '$340K', color: 'bg-orange-500' },
    { name: 'Negotiation', count: 34, value: '$280K', color: 'bg-amber-400' },
    { name: 'Closed Won', count: 28, value: '$420K', color: 'bg-green-400' },
  ];

  const topPerformers = [
    { name: 'Jennifer Martinez', deals: 23, value: '$287K', avatar: 'JM' },
    { name: 'Robert Taylor', deals: 19, value: '$245K', avatar: 'RT' },
    { name: 'Amanda White', deals: 17, value: '$198K', avatar: 'AW' },
    { name: 'James Wilson', deals: 15, value: '$176K', avatar: 'JW' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <div key={stat.label} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendIcon className={`w-4 h-4 ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`} />
                    <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500">vs last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/20 group-hover:border-orange-500/40 transition">
                  <Icon className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <div className="lg:col-span-2 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <div className="p-6 border-b border-[#2A2A2A]">
            <h3 className="font-semibold text-white">Pipeline Overview</h3>
            <p className="text-sm text-gray-400 mt-1">Deal distribution across stages</p>
          </div>
          <div className="p-6 space-y-4">
            {pipelineStages.map((stage) => (
              <div key={stage.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                    <span className="font-medium text-white">{stage.name}</span>
                    <span className="text-sm text-gray-400">({stage.count} deals)</span>
                  </div>
                  <span className="font-semibold text-white">{stage.value}</span>
                </div>
                <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stage.color}`}
                    style={{ width: `${(stage.count / 352) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <div className="p-6 border-b border-[#2A2A2A]">
            <h3 className="font-semibold text-white">Top Performers</h3>
            <p className="text-sm text-gray-400 mt-1">This month</p>
          </div>
          <div className="p-6 space-y-4">
            {topPerformers.map((performer, index) => (
              <div key={performer.name} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 text-white flex items-center justify-center font-semibold">
                  {performer.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{performer.name}</p>
                  <p className="text-sm text-gray-400">{performer.deals} deals • {performer.value}</p>
                </div>
                <div className="text-2xl font-bold text-gray-600">#{index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Recent Activities</h3>
              <p className="text-sm text-gray-400 mt-1">Latest customer interactions</p>
            </div>
            <button className="text-sm text-orange-400 hover:text-orange-300 font-medium transition">
              View All
            </button>
          </div>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {recentActivities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="p-6 hover:bg-[#0A0A0A] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/20 flex-shrink-0">
                    <Icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{activity.contact}</p>
                        <p className="text-sm text-gray-400 mt-0.5">{activity.company}</p>
                        <p className="text-sm text-gray-300 mt-2">{activity.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
                        <Clock className="w-4 h-4" />
                        {activity.time}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
