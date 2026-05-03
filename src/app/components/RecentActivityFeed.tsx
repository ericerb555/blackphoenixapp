// Recent Activity Feed Component
// Displays recent user activities and system events
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Package,
  ShoppingCart,
  User,
  DollarSign,
  TrendingUp,
  FileText,
  Settings,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'order' | 'user' | 'product' | 'payment' | 'system';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

export default function RecentActivityFeed() {
  const [filter, setFilter] = useState<'all' | 'order' | 'user' | 'product' | 'payment' | 'system'>('all');

  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'order',
      title: 'New Order Received',
      description: 'Order #ORD-2024-1234 from John Doe - $156.99',
      timestamp: '2 minutes ago',
      icon: <ShoppingCart className="w-5 h-5" />,
      color: 'text-blue-400'
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment Processed',
      description: 'Transaction #TXN-789456 completed successfully',
      timestamp: '5 minutes ago',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-green-400'
    },
    {
      id: '3',
      type: 'user',
      title: 'New User Registration',
      description: 'Sarah Johnson signed up as a Customer',
      timestamp: '12 minutes ago',
      icon: <User className="w-5 h-5" />,
      color: 'text-purple-400'
    },
    {
      id: '4',
      type: 'product',
      title: 'Product Updated',
      description: 'Widget Pro - Stock updated to 150 units',
      timestamp: '18 minutes ago',
      icon: <Package className="w-5 h-5" />,
      color: 'text-orange-400'
    },
    {
      id: '5',
      type: 'order',
      title: 'Order Shipped',
      description: 'Order #ORD-2024-1230 shipped via UPS',
      timestamp: '25 minutes ago',
      icon: <ShoppingCart className="w-5 h-5" />,
      color: 'text-blue-400'
    },
    {
      id: '6',
      type: 'system',
      title: 'System Update',
      description: 'Payment gateway integration updated',
      timestamp: '1 hour ago',
      icon: <Settings className="w-5 h-5" />,
      color: 'text-gray-400'
    },
    {
      id: '7',
      type: 'payment',
      title: 'Refund Processed',
      description: 'Refund issued for Order #ORD-2024-1215 - $89.99',
      timestamp: '2 hours ago',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-green-400'
    },
    {
      id: '8',
      type: 'user',
      title: 'Vendor Approved',
      description: 'ABC Supplies vendor account approved',
      timestamp: '3 hours ago',
      icon: <User className="w-5 h-5" />,
      color: 'text-purple-400'
    }
  ];

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  const filters: Array<{ value: typeof filter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: activities.length },
    { value: 'order', label: 'Orders', count: activities.filter(a => a.type === 'order').length },
    { value: 'payment', label: 'Payments', count: activities.filter(a => a.type === 'payment').length },
    { value: 'user', label: 'Users', count: activities.filter(a => a.type === 'user').length },
    { value: 'product', label: 'Products', count: activities.filter(a => a.type === 'product').length },
    { value: 'system', label: 'System', count: activities.filter(a => a.type === 'system').length }
  ];

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            <p className="text-sm text-gray-400">Live system events and updates</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-sm font-semibold">Live</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === f.value
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A]'
            }`}
          >
            {f.label} <span className="opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
        {filteredActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:border-[#ea580c]/30 transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg bg-${activity.color.split('-')[1]}-500/10 flex items-center justify-center ${activity.color} flex-shrink-0`}>
                {activity.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-[#ea580c] transition-colors">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {activity.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm flex-shrink-0">
                    <Clock className="w-4 h-4" />
                    <span>{activity.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View All Button */}
      <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
        <button className="w-full py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white font-semibold hover:border-[#ea580c] hover:bg-[#ea580c]/10 transition-all">
          View All Activity
        </button>
      </div>
    </div>
  );
}
