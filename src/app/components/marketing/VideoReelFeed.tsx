import { useState } from 'react';
import {
  Play, Eye, ThumbsUp, MessageSquare, Share2, MoreVertical,
  Edit, Trash2, Download, Copy, Clock, CheckCircle,
  XCircle, AlertCircle, Filter, Search, Grid, List
} from 'lucide-react';
import { Select } from '../ui/input/Select';
import { DataTable } from '../ui/table/DataTable';
import type { DataTableColumn } from '../ui/table/DataTable';

interface VideoReelFeedProps {
  onEdit: (video: any) => void;
}

export function VideoReelFeed({ onEdit }: VideoReelFeedProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState('all');

  const videos = [
    {
      id: 1,
      title: 'Enterprise CRM Solution Demo',
      description: 'Complete walkthrough of our enterprise CRM features and capabilities',
      thumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692',
      duration: '2:45',
      status: 'published',
      views: 1247,
      likes: 89,
      comments: 23,
      shares: 12,
      createdBy: 'John Smith',
      createdAt: '2026-01-20',
      modules: ['CRM', 'Dashboard', 'Reports'],
      platforms: ['Website', 'LinkedIn', 'YouTube'],
      aiGenerated: true
    },
    {
      id: 2,
      title: 'Master Scheduling Tutorial',
      description: 'How to use drag-and-drop scheduling with our advanced calendar system',
      thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
      duration: '3:12',
      status: 'published',
      views: 892,
      likes: 67,
      comments: 15,
      shares: 8,
      createdBy: 'Amanda White',
      createdAt: '2026-01-19',
      modules: ['Scheduling', 'Calendar', 'Work Orders'],
      platforms: ['Website', 'Facebook'],
      aiGenerated: false
    },
    {
      id: 3,
      title: 'AI Quote Builder Overview',
      description: 'See how AI helps create professional quotes in minutes',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      duration: '1:58',
      status: 'pending',
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      createdBy: 'Robert Taylor',
      createdAt: '2026-01-21',
      modules: ['Quotes', 'AI Assistant'],
      platforms: ['Website', 'LinkedIn'],
      aiGenerated: true
    },
    {
      id: 4,
      title: 'Customer Portal Walkthrough',
      description: 'Complete guide to customer self-service portal features',
      thumbnail: 'https://images.unsplash.com/photo-1553877522-43269d4ea984',
      duration: '4:23',
      status: 'published',
      views: 2134,
      likes: 156,
      comments: 42,
      shares: 28,
      createdBy: 'Jennifer Martinez',
      createdAt: '2026-01-18',
      modules: ['Customer Portal', 'Approvals', 'Contracts'],
      platforms: ['Website', 'YouTube', 'Instagram'],
      aiGenerated: false
    },
    {
      id: 5,
      title: 'Referral Rewards Program',
      description: 'How to earn rewards by referring new customers',
      thumbnail: 'https://images.unsplash.com/photo-1556740758-90de374c12ad',
      duration: '2:15',
      status: 'draft',
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      createdBy: 'Sarah Williams',
      createdAt: '2026-01-21',
      modules: ['Referrals', 'Rewards'],
      platforms: ['Website'],
      aiGenerated: true
    },
    {
      id: 6,
      title: 'Enterprise Reporting Hub',
      description: 'Access powerful insights with our comprehensive reporting system',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
      duration: '3:45',
      status: 'rejected',
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      createdBy: 'Michael Brown',
      createdAt: '2026-01-20',
      modules: ['Reports', 'Analytics', 'Dashboard'],
      platforms: ['Website', 'LinkedIn'],
      aiGenerated: false
    },
  ];

  const statusConfig = {
    published: { label: 'Published', color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle },
    pending: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Clock },
    draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: Edit },
    rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle },
  };

  const videoColumns: DataTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Video',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-24 h-16 rounded bg-gray-900 flex-shrink-0">
            <img 
              src={row.thumbnail} 
              alt={row.title}
              className="w-full h-full object-cover rounded opacity-80"
            />
            <Play className="absolute inset-0 m-auto w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{row.title}</p>
            <p className="text-sm text-gray-400 truncate">{row.description}</p>
            <p className="text-xs text-gray-500 mt-1">{row.duration}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const StatusIcon = statusConfig[row.status as keyof typeof statusConfig].icon;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusConfig[row.status as keyof typeof statusConfig].color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig[row.status as keyof typeof statusConfig].label}
          </span>
        );
      },
    },
    {
      key: 'modules',
      header: 'Modules',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.modules.slice(0, 2).map((module: string) => (
            <span key={module} className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
              {module}
            </span>
          ))}
          {row.modules.length > 2 && (
            <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded border border-gray-500/30">
              +{row.modules.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'views',
      header: 'Stats',
      render: (row) => (
        row.status === 'published' ? (
          <div className="space-y-1 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              {row.views.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-gray-400" />
              {row.likes}
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-500">-</span>
        )
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => (
        <div className="text-sm">
          <p className="text-white">{row.createdBy}</p>
          <p className="text-gray-400">{new Date(row.createdAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => onEdit(row)}
            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded transition-colors"
            title="More"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const filteredVideos = filterStatus === 'all' 
    ? videos 
    : videos.filter(v => v.status === filterStatus);

  return (
    <div className="p-6 space-y-6">
      {/* Filters and Controls */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search videos by title, description, or module..."
              className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'published', label: 'Published' },
                { value: 'pending', label: 'Pending' },
                { value: 'draft', label: 'Draft' },
                { value: 'rejected', label: 'Rejected' }
              ]}
            />
            <Select
              value="all"
              onChange={() => {}}
              options={[
                { value: 'all', label: 'All Modules' },
                { value: 'crm', label: 'CRM' },
                { value: 'scheduling', label: 'Scheduling' },
                { value: 'quotes', label: 'Quotes' },
                { value: 'reports', label: 'Reports' }
              ]}
            />
            <div className="flex bg-[#0A0A0A] rounded-lg p-1 border border-[#2A2A2A]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => {
            const StatusIcon = statusConfig[video.status as keyof typeof statusConfig].icon;
            return (
              <div key={video.id} className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-hidden hover:shadow-lg hover:shadow-orange-500/10 transition-shadow">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-900">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white bg-opacity-90 flex items-center justify-center hover:bg-opacity-100 cursor-pointer transition-all hover:scale-110">
                      <Play className="w-8 h-8 text-orange-600 ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black bg-opacity-75 text-white text-xs font-medium rounded">
                    {video.duration}
                  </div>
                  {video.aiGenerated && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded flex items-center gap-1">
                      ✨ AI Generated
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white line-clamp-2">{video.title}</h3>
                    <button className="p-1 text-gray-400 hover:text-gray-300 rounded flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">{video.description}</p>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusConfig[video.status as keyof typeof statusConfig].color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig[video.status as keyof typeof statusConfig].label}
                    </span>
                  </div>

                  {/* Modules */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {video.modules.map((module) => (
                      <span key={module} className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                        {module}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  {video.status === 'published' && (
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3 pb-3 border-b border-[#2A2A2A]">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {video.views.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {video.likes}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {video.comments}
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="w-4 h-4" />
                        {video.shares}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      <p>{video.createdBy}</p>
                      <p>{new Date(video.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => onEdit(video)}
                        className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded transition-colors" title="Share">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <DataTable
          columns={videoColumns}
          data={filteredVideos}
          emptyMessage="No videos found"
          rowHoverEffect={true}
          containerClassName="bg-[#1A1A1A] border-[#2A2A2A]"
        />
      )}
    </div>
  );
}
