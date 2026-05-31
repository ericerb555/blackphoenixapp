import React, { useState, useEffect } from 'react';
import { HardDrive, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface StorageQuota {
  used: number;
  total: number;
  percentage: number;
}

interface StakeholderStorageQuotaProps {
  userId: string;
  className?: string;
}

export function StakeholderStorageQuota({ userId, className = '' }: StakeholderStorageQuotaProps) {
  const [quota, setQuota] = useState<StorageQuota>({
    used: 0,
    total: 10737418240, // 10 GB default
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStorageQuota();
  }, [userId]);

  const fetchStorageQuota = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockUsed = Math.random() * 10737418240;
      setQuota({
        used: mockUsed,
        total: 10737418240,
        percentage: (mockUsed / 10737418240) * 100,
      });
    } catch (error) {
      console.error('Failed to fetch storage quota:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = () => {
    if (quota.percentage >= 90) return 'text-red-400';
    if (quota.percentage >= 75) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (quota.percentage >= 90) return AlertTriangle;
    if (quota.percentage >= 75) return TrendingUp;
    return CheckCircle;
  };

  const getProgressBarColor = () => {
    if (quota.percentage >= 90) return 'bg-red-500';
    if (quota.percentage >= 75) return 'bg-yellow-500';
    return 'bg-[#ea580c]';
  };

  const StatusIcon = getStatusIcon();

  if (loading) {
    return (
      <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-zinc-800 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
          <HardDrive className="w-5 h-5 text-[#ea580c]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Storage Quota</h3>
          <p className="text-xs text-zinc-500">Usage and limits</p>
        </div>
        <StatusIcon className={`w-5 h-5 ${getStatusColor()}`} />
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-400">Used</span>
          <span className={`text-xs font-semibold ${getStatusColor()}`}>
            {quota.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressBarColor()} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(quota.percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Storage Details */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">
          {formatBytes(quota.used)} used
        </span>
        <span className="text-zinc-500">
          of {formatBytes(quota.total)}
        </span>
      </div>

      {/* Warning Message */}
      {quota.percentage >= 75 && (
        <div className={`mt-3 p-3 rounded-lg ${
          quota.percentage >= 90 ? 'bg-red-900/20 border border-red-900/50' : 'bg-yellow-900/20 border border-yellow-900/50'
        }`}>
          <p className={`text-xs ${
            quota.percentage >= 90 ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {quota.percentage >= 90
              ? 'Storage almost full. Please delete unused files.'
              : 'Storage running low. Consider cleaning up files.'}
          </p>
        </div>
      )}

      {/* Action Button */}
      <button className="w-full mt-3 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-white transition-colors">
        Manage Storage
      </button>
    </div>
  );
}
