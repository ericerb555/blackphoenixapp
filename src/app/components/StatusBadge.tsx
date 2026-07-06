import React from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'compact';
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const getStatusIcon = (status: string) => {
    const className = "w-4 h-4";
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className={`${className} text-yellow-500`} />;
      case 'approved':
        return <CheckCircle className={`${className} text-blue-500`} />;
      case 'rejected':
        return <XCircle className={`${className} text-red-500`} />;
      case 'completed':
      case 'paid':
        return <CheckCircle className={`${className} text-green-500`} />;
      case 'active':
        return <CheckCircle className={`${className} text-green-500`} />;
      case 'inactive':
        return <XCircle className={`${className} text-gray-500`} />;
      default:
        return <AlertTriangle className={`${className} text-gray-500`} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'approved':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'completed':
      case 'paid':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'active':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(status)}`}>
      {getStatusIcon(status)}
      <span className="text-sm capitalize">{status}</span>
    </div>
  );
}
