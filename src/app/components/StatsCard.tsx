import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  valueColor?: string;
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-[#ea580c]',
  valueColor = 'text-white'
}: StatsCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400 text-sm">{title}</div>
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}
