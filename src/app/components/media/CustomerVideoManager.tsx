import { useState } from 'react';
import { 
  Video, Upload, FolderOpen, Filter, Search, Grid3X3, 
  List, Calendar, Tag, User, MapPin, FileVideo, Download,
  Trash2, Eye, MoreVertical, CheckCircle2, Clock, Sparkles
} from 'lucide-react';
import { EnterpriseVideoCapture } from './EnterpriseVideoCapture';
import { PrimaryButton as Button } from '../ui/button/PrimaryButton';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';

import type { VideoRecording, VideoCategory } from '../../lib/video/types';

interface VideoLibraryItem {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  tags: string[];
  location?: string;
  projectId?: string;
  customerId?: string;
  uploadedBy: string;
  uploadedAt: Date;
  fileSize: number;
  duration: number;
  url: string;
  thumbnailUrl?: string;
  status: 'processing' | 'ready' | 'archived';
}

export function CustomerVideoManager() {
  const [activeTab, setActiveTab] = useState<'capture' | 'library'>('capture');
  const [videos, setVideos] = useState<VideoLibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Handle new video recording
  const handleVideoRecorded = (recording: VideoRecording) => {
    // In a real app, this would upload to Supabase storage
    const videoMetadata: VideoLibraryItem = {
      id: recording.id,
      title: recording.metadata.title,
      description: recording.metadata.description,
      category: recording.metadata.category,
      tags: recording.metadata.tags,
      uploadedBy: recording.metadata.uploadedBy,
      uploadedAt: recording.timestamp,
      fileSize: recording.size,
      duration: recording.duration,
      url: recording.url,
      thumbnailUrl: recording.thumbnail,
      status: 'ready'
    };

    setVideos(prev => [videoMetadata, ...prev]);
    toast.success('Video saved to library', {
      description: `${recording.metadata.resolution.width}x${recording.metadata.resolution.height} @ ${recording.analytics.averageFps}fps`
    });
  };

  // Filter videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || video.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    const colors = {
      site_walkthrough: 'bg-blue-100 text-blue-700',
      damage_documentation: 'bg-red-100 text-red-700',
      progress_update: 'bg-green-100 text-green-700',
      customer_request: 'bg-purple-100 text-purple-700',
      other: 'bg-slate-100 text-slate-700'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels = {
      site_walkthrough: 'Site Walkthrough',
      damage_documentation: 'Damage Documentation',
      progress_update: 'Progress Update',
      customer_request: 'Customer Request',
      other: 'Other'
    };
    return labels[category as keyof typeof labels] || 'Other';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Video Management</h2>
          <p className="text-slate-600 mt-1">
            Capture and manage videos for your projects
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Video className="w-4 h-4 mr-2" />
          {videos.length} Videos
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="capture" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Record Video
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Video Library
          </TabsTrigger>
        </TabsList>

        {/* Capture Tab */}
        <TabsContent value="capture" className="space-y-6 mt-6">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Record New Video</h3>
              <p className="text-slate-600 text-sm">
                Capture site walkthroughs, damage documentation, or any other project-related videos.
                Videos are automatically saved to your library.
              </p>
            </div>

            <EnterpriseVideoCapture
              onVideoRecorded={handleVideoRecorded}
              maxDuration={600} // 10 minutes
              maxFileSize={200} // 200MB
              showThumbnails={true}
              allowMultiple={true}
            />
          </Card>

          {/* Quick Tips */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Video Recording Tips
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Hold your device steady or use a tripod for stable footage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Ensure adequate lighting for clear visibility</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Narrate what you're showing to provide context</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Move slowly and smoothly to capture details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Record in landscape mode for better viewing experience</span>
              </li>
            </ul>
          </Card>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-6 mt-6">
          {/* Search and Filters */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Category: {filterCategory === 'all' ? 'All' : getCategoryLabel(filterCategory)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setFilterCategory('all')}>
                      All Categories
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterCategory('site_walkthrough')}>
                      Site Walkthrough
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterCategory('damage_documentation')}>
                      Damage Documentation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterCategory('progress_update')}>
                      Progress Update
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterCategory('customer_request')}>
                      Customer Request
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterCategory('other')}>
                      Other
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-none"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Video Grid/List */}
          {filteredVideos.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <FileVideo className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  No videos found
                </h3>
                <p className="text-slate-600 mb-6">
                  {searchQuery || filterCategory !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Start by recording your first video'}
                </p>
                {(!searchQuery && filterCategory === 'all') && (
                  <Button onClick={() => setActiveTab('capture')}>
                    <Video className="w-4 h-4 mr-2" />
                    Record Video
                  </Button>
                )}
              </div>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden group">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-slate-900">
                    {video.thumbnailUrl ? (
                      <img 
                        src={video.thumbnailUrl} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileVideo className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="lg" variant="secondary">
                        <Eye className="w-5 h-5 mr-2" />
                        View
                      </Button>
                    </div>

                    <Badge className="absolute bottom-2 right-2 bg-black/70">
                      {formatDuration(video.duration)}
                    </Badge>

                    <Badge 
                      className={`absolute top-2 left-2 ${getCategoryColor(video.category)}`}
                    >
                      {getCategoryLabel(video.category)}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{video.title}</h4>
                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                          {video.description || 'No description'}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {video.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {video.uploadedAt.toLocaleDateString()}
                      </div>
                      <div>{formatSize(video.fileSize)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="divide-y">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-32 aspect-video bg-slate-900 rounded overflow-hidden flex-shrink-0">
                        {video.thumbnailUrl ? (
                          <img 
                            src={video.thumbnailUrl} 
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileVideo className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{video.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">
                              {video.description || 'No description'}
                            </p>
                          </div>
                          <Badge className={getCategoryColor(video.category)}>
                            {getCategoryLabel(video.category)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(video.duration)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {video.uploadedAt.toLocaleDateString()}
                          </div>
                          <div>{formatSize(video.fileSize)}</div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {video.uploadedBy}
                          </div>
                        </div>

                        {video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {video.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}