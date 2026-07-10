import { useState } from 'react';
import {
  Video, Plus, Grid, List, Settings, TrendingUp,
  Eye, Edit, Trash2, MoreVertical, Play, Pause,
  Upload, Download, Share2, Filter, Search
} from 'lucide-react';
import { VideoReelFeed } from './VideoReelFeed';
import { VideoReelEditor } from './VideoReelEditor';
import { ModuleConnectionSettings } from './ModuleConnectionSettings';
import { VideoAnalytics } from './VideoAnalytics';
import { ApprovalQueue } from './ApprovalQueue';

type TabType = 'feed' | 'editor' | 'analytics' | 'approvals' | 'settings';

export function VideoReelManager() {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  const tabs = [
    { id: 'feed', label: 'Video Feed', icon: Grid },
    { id: 'editor', label: 'Create/Edit', icon: Plus },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'approvals', label: 'Approvals', icon: Eye },
    { id: 'settings', label: 'Module Settings', icon: Settings },
  ];

  const stats = [
    { label: 'Total Videos', value: '127', change: '+12', color: 'blue' },
    { label: 'Active Reels', value: '89', change: '+8', color: 'green' },
    { label: 'Pending Approval', value: '14', change: '+3', color: 'yellow' },
    { label: 'Total Views', value: '45.2K', change: '+2.3K', color: 'purple' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video & Reel Manager</h1>
            <p className="text-sm text-gray-600 mt-1">
              Create, manage, and publish marketing videos across all modules with AI assistance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button 
              onClick={() => setActiveTab('editor')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Video
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
              <div className="flex items-end justify-between mt-2">
                <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                <span className="text-sm text-green-600 font-medium">{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-6 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'feed' && <VideoReelFeed onEdit={setSelectedVideo} />}
        {activeTab === 'editor' && <VideoReelEditor video={selectedVideo} />}
        {activeTab === 'analytics' && <VideoAnalytics />}
        {activeTab === 'approvals' && <ApprovalQueue />}
        {activeTab === 'settings' && <ModuleConnectionSettings />}
      </div>
    </div>
  );
}
