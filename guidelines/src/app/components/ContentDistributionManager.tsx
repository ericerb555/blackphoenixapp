import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import {
  Send,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  TrendingUp,
  Eye,
  MousePointerClick,
  Heart,
} from 'lucide-react';
import {
  useContentManagement,
  ContentPiece,
  ContentChannel,
  ContentDistribution,
} from '../lib/useContentManagement';

interface ContentDistributionManagerProps {
  contentPiece: ContentPiece;
  onDistributionComplete?: () => void;
}

export function ContentDistributionManager({
  contentPiece,
  onDistributionComplete,
}: ContentDistributionManagerProps) {
  const {
    fetchChannels,
    fetchDistribution,
    createDistribution,
    updateDistribution,
    updateContentPiece,
  } = useContentManagement();

  const [channels, setChannels] = useState<ContentChannel[]>([]);
  const [distribution, setDistribution] = useState<ContentDistribution[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadData();
  }, [contentPiece.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [channelsData, distributionData] = await Promise.all([
        fetchChannels(),
        fetchDistribution(contentPiece.id),
      ]);

      setChannels(channelsData.filter(c => c.is_active));
      setDistribution(distributionData);

      // Pre-select channels that are already distributed
      const alreadyPublished = distributionData.map(d => d.channel_id);
      setSelectedChannels(alreadyPublished);
    } catch (error) {
      console.error('Error loading distribution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handlePublish = async () => {
    if (selectedChannels.length === 0) {
      alert('Please select at least one channel');
      return;
    }

    if (publishMode === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      alert('Please select date and time for scheduled publishing');
      return;
    }

    setPublishing(true);
    try {
      const publishTime = publishMode === 'now'
        ? new Date().toISOString()
        : new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      // Create or update distribution for each selected channel
      for (const channelId of selectedChannels) {
        const existingDistribution = distribution.find(d => d.channel_id === channelId);

        if (existingDistribution) {
          // Update existing distribution
          await updateDistribution(existingDistribution.id, {
            distribution_status: publishMode === 'now' ? 'published' : 'scheduled',
            scheduled_for: publishMode === 'scheduled' ? publishTime : undefined,
            published_at: publishMode === 'now' ? publishTime : undefined,
          });
        } else {
          // Create new distribution
          await createDistribution({
            content_piece_id: contentPiece.id,
            channel_id: channelId,
            distribution_status: publishMode === 'now' ? 'published' : 'scheduled',
            scheduled_for: publishMode === 'scheduled' ? publishTime : undefined,
            published_at: publishMode === 'now' ? publishTime : undefined,
          });
        }
      }

      // Update content piece status
      if (publishMode === 'now') {
        await updateContentPiece(contentPiece.id, {
          status: 'published',
          published_at: publishTime,
        });
      } else {
        await updateContentPiece(contentPiece.id, {
          scheduled_publish_at: publishTime,
        });
      }

      if (onDistributionComplete) {
        onDistributionComplete();
      }

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error publishing content:', error);
      alert('Error publishing content. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const getChannelIcon = (channelType: string) => {
    // In a real app, you'd have actual social media icons
    return channelType.charAt(0).toUpperCase();
  };

  const getDistributionStatus = (channelId: string) => {
    return distribution.find(d => d.channel_id === channelId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Published
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading channels...</div>
      </Card>
    );
  }

  const canPublish = contentPiece.status === 'approved' || contentPiece.status === 'published';

  return (
    <div className="space-y-6">
      {/* Publishing Options */}
      {canPublish && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Publishing Options</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant={publishMode === 'now' ? 'default' : 'outline'}
                  onClick={() => setPublishMode('now')}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish Now
                </Button>
                <Button
                  variant={publishMode === 'scheduled' ? 'default' : 'outline'}
                  onClick={() => setPublishMode('scheduled')}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>

              {publishMode === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="schedule-date">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule-time">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Channel Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Select Channels</h3>
        
        {channels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No active channels configured</p>
            <p className="text-sm mt-2">Configure channels in Settings to enable distribution</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map(channel => {
              const dist = getDistributionStatus(channel.id);
              const isPublished = dist?.distribution_status === 'published';

              return (
                <div
                  key={channel.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {getChannelIcon(channel.channel_type)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{channel.channel_name}</h4>
                        <p className="text-sm text-muted-foreground">{channel.channel_type}</p>
                      </div>
                    </div>
                    {canPublish && (
                      <Checkbox
                        checked={selectedChannels.includes(channel.id)}
                        onCheckedChange={() => handleChannelToggle(channel.id)}
                        disabled={isPublished}
                      />
                    )}
                  </div>

                  {dist && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        {getStatusBadge(dist.distribution_status)}
                        {dist.published_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(dist.published_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {dist.external_url && (
                        <a
                          href={dist.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Post
                        </a>
                      )}

                      {/* Performance Metrics */}
                      {isPublished && (dist.impressions > 0 || dist.clicks > 0 || dist.engagement > 0) && (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              <span>Views</span>
                            </div>
                            <p className="text-sm font-semibold mt-1">{dist.impressions.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <MousePointerClick className="h-3 w-3" />
                              <span>Clicks</span>
                            </div>
                            <p className="text-sm font-semibold mt-1">{dist.clicks.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <Heart className="h-3 w-3" />
                              <span>Engage</span>
                            </div>
                            <p className="text-sm font-semibold mt-1">{dist.engagement.toLocaleString()}</p>
                          </div>
                        </div>
                      )}

                      {dist.error_message && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          {dist.error_message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Publish Button */}
      {canPublish && channels.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''} selected
              </p>
              <p className="text-sm text-muted-foreground">
                {publishMode === 'now'
                  ? 'Content will be published immediately'
                  : `Content will be published on ${scheduledDate} at ${scheduledTime}`}
              </p>
            </div>
            <Button
              onClick={handlePublish}
              disabled={publishing || selectedChannels.length === 0}
              size="lg"
            >
              {publishing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : publishMode === 'now' ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publish Now
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {!canPublish && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900">Content Not Yet Approved</h4>
              <p className="text-sm text-amber-700 mt-1">
                This content must be approved before it can be published to channels
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Overall Performance Summary */}
      {distribution.some(d => d.distribution_status === 'published') && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Performance
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Impressions</p>
              <p className="text-2xl font-bold">
                {contentPiece.total_impressions.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Clicks</p>
              <p className="text-2xl font-bold">
                {contentPiece.total_clicks.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Engagement</p>
              <p className="text-2xl font-bold">
                {contentPiece.total_engagement.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Engagement Rate</p>
              <p className="text-2xl font-bold">
                {contentPiece.total_impressions > 0
                  ? ((contentPiece.total_engagement / contentPiece.total_impressions) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
