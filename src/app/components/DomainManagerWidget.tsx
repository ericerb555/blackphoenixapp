import { useState, useEffect } from 'react';
import { Globe, CheckCircle2, AlertCircle, ExternalLink, Settings, Plus } from 'lucide-react';
import { DomainService, type DomainConfig } from '../lib/services/domainService';
import { toast } from 'sonner@2.0.3';

interface DomainManagerWidgetProps {
  compact?: boolean;
  showActions?: boolean;
  onDomainClick?: (domain: DomainConfig) => void;
}

/**
 * Domain Manager Widget
 * A compact widget that can be embedded throughout the app to show and manage domains
 */
export default function DomainManagerWidget({ 
  compact = false, 
  showActions = true,
  onDomainClick 
}: DomainManagerWidgetProps) {
  const [domains, setDomains] = useState<DomainConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryDomain, setPrimaryDomain] = useState<DomainConfig | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const { data, error } = await DomainService.getDomains();
      if (!error && data) {
        setDomains(data);
        const primary = data.find(d => d.isPrimary && d.status === 'verified');
        setPrimaryDomain(primary || null);
      } else {
        // Silently set empty state if service unavailable
        setDomains([]);
        setPrimaryDomain(null);
      }
    } catch (err) {
      // Silently handle - service may not be deployed
      setDomains([]);
      setPrimaryDomain(null);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'failed': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-gray-400 animate-pulse" />
          <div className="text-sm text-gray-400">Loading domains...</div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-semibold text-white">Custom Domains</span>
          </div>
          {showActions && (
            <a
              href="/domain-management"
              className="text-xs text-orange-600 hover:text-orange-500 font-medium flex items-center gap-1"
            >
              Manage
              <Settings className="w-3 h-3" />
            </a>
          )}
        </div>

        {domains.length === 0 ? (
          <div className="text-sm text-gray-400">
            No domains configured
          </div>
        ) : (
          <div className="space-y-2">
            {primaryDomain && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-white font-medium">{primaryDomain.domain}</span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded">
                  Primary
                </span>
              </div>
            )}
            {domains.length > 1 && (
              <div className="text-xs text-gray-400">
                +{domains.length - 1} more domain{domains.length - 1 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-orange-600" />
          <div>
            <h3 className="text-lg font-bold text-white">Domain Management</h3>
            <p className="text-sm text-gray-400">{domains.length} domain{domains.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        {showActions && (
          <a
            href="/domain-management"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage
          </a>
        )}
      </div>

      {domains.length === 0 ? (
        <div className="text-center py-8">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No domains configured yet</p>
          <a
            href="/domain-management"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <div
              key={domain.id}
              onClick={() => onDomainClick?.(domain)}
              className={`bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 ${
                onDomainClick ? 'cursor-pointer hover:border-orange-500/50' : ''
              } transition`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {domain.status === 'verified' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-white font-medium">{domain.domain}</span>
                    {domain.isPrimary && (
                      <span className="text-xs px-2 py-0.5 bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded border ${getStatusColor(domain.status)}`}>
                      {domain.status}
                    </span>
                    {domain.sslEnabled && (
                      <span className="text-green-400">SSL Enabled</span>
                    )}
                    <span className="text-gray-500">
                      Added {new Date(domain.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {onDomainClick && (
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}