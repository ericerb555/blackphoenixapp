/**
 * SystemStatusOverview Component
 * 
 * Displays system health and status information
 */

import { useState, useEffect } from 'react';
import { Activity, Database, Server, Wifi, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface SystemStatusOverviewProps {
  compact?: boolean;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  icon: any;
  lastChecked: string;
  uptime?: string;
}

export function SystemStatusOverview({ compact = false }: SystemStatusOverviewProps) {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'API Server',
      status: 'operational',
      icon: Server,
      lastChecked: new Date().toISOString(),
      uptime: '99.9%',
    },
    {
      name: 'Database',
      status: 'operational',
      icon: Database,
      lastChecked: new Date().toISOString(),
      uptime: '99.95%',
    },
    {
      name: 'Network',
      status: 'operational',
      icon: Wifi,
      lastChecked: new Date().toISOString(),
      uptime: '99.8%',
    },
    {
      name: 'Background Jobs',
      status: 'operational',
      icon: Activity,
      lastChecked: new Date().toISOString(),
      uptime: '99.7%',
    },
  ]);

  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'down'>('operational');

  useEffect(() => {
    // Determine overall status
    const hasDown = services.some(s => s.status === 'down');
    const hasDegraded = services.some(s => s.status === 'degraded');
    
    if (hasDown) {
      setOverallStatus('down');
    } else if (hasDegraded) {
      setOverallStatus('degraded');
    } else {
      setOverallStatus('operational');
    }
  }, [services]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500/20 border-green-500/30';
      case 'degraded':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'down':
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'All Systems Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'down':
        return 'System Outage';
      default:
        return 'Unknown Status';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 ${getStatusBg(overallStatus)} border rounded-lg`}>
        {overallStatus === 'operational' ? (
          <CheckCircle className={`w-4 h-4 ${getStatusColor(overallStatus)}`} />
        ) : (
          <AlertCircle className={`w-4 h-4 ${getStatusColor(overallStatus)}`} />
        )}
        <span className="text-sm font-medium text-white">
          {getStatusText(overallStatus)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <div className={`p-6 ${getStatusBg(overallStatus)} border rounded-2xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {overallStatus === 'operational' ? (
              <CheckCircle className={`w-8 h-8 ${getStatusColor(overallStatus)}`} />
            ) : (
              <AlertCircle className={`w-8 h-8 ${getStatusColor(overallStatus)}`} />
            )}
            <div>
              <h3 className="text-xl font-bold text-white">
                {getStatusText(overallStatus)}
              </h3>
              <p className="text-sm text-gray-400">
                Last checked: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              // Refresh status
              setServices(services.map(s => ({
                ...s,
                lastChecked: new Date().toISOString(),
              })));
            }}
            className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Individual Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.name}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${getStatusBg(service.status)} border rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{service.name}</h4>
                    <p className={`text-sm ${getStatusColor(service.status)}`}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </p>
                  </div>
                </div>
                {service.status === 'operational' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Uptime: {service.uptime}</span>
                </div>
                <span>{new Date(service.lastChecked).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Incidents */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-white">All systems running normally</p>
              <p className="text-gray-500">No incidents reported in the last 30 days</p>
            </div>
            <span className="text-gray-500 text-xs">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemStatusOverview;
