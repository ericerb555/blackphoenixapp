/**
 * Product Data Sources Management
 * Admin page to configure API credentials and manage data sources
 */

import { useState, useEffect } from 'react';
import {
  Settings, Package, Key, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Zap, Database, Cloud, Users, FileText, Info,
  ExternalLink, ArrowRight, Check, X, Loader
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { productDataSourceManager, DataSourceConfig } from '../lib/services/productDataSourceManager';

export default function ProductDataSources() {
  const [sources, setSources] = useState<DataSourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sourcesData, statsData] = await Promise.all([
        productDataSourceManager.getDataSources(),
        productDataSourceManager.getSourceStats()
      ]);
      setSources(sourcesData);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = async (source: DataSourceConfig) => {
    const updated = { ...source, enabled: !source.enabled };
    const success = await productDataSourceManager.updateDataSource(updated);
    
    if (success) {
      toast.success(`${source.name} ${updated.enabled ? 'enabled' : 'disabled'}`)  ;
      loadData();
      
      // Trigger event for Materials Hub to detect changes
      if (updated.enabled && updated.credentialsValid) {
        localStorage.setItem('data_source_updated', Date.now().toString());
        toast.success(`✅ ${source.name} is now available in Materials Hub!`, {
          duration: 5000
        });
      }
    } else {
      toast.error('Failed to update source');
    }
  };

  const testConnection = async (sourceId: string) => {
    setTestingSource(sourceId);
    try {
      const result = await productDataSourceManager.testCredentials(sourceId);
      
      if (result.valid) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      
      loadData();
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setTestingSource(null);
    }
  };

  const syncSource = async (sourceId: string) => {
    setSyncingSource(sourceId);
    try {
      const result = await productDataSourceManager.syncSource(sourceId);
      
      if (result.success) {
        toast.success(`Synced ${result.productsUpdated} products`);
        loadData();
      } else {
        toast.error('Sync failed');
      }
    } catch (error) {
      toast.error('Failed to sync source');
    } finally {
      setSyncingSource(null);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'direct-api': return <Zap className="w-5 h-5" />;
      case 'third-party': return <Cloud className="w-5 h-5" />;
      case 'vendor-catalog': return <Users className="w-5 h-5" />;
      case 'manual-reference': return <FileText className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const getStatusColor = (source: DataSourceConfig) => {
    if (!source.enabled) return 'gray';
    if (!source.hasCredentials) return 'yellow';
    if (!source.credentialsValid) return 'red';
    return 'green';
  };

  const getStatusIcon = (source: DataSourceConfig) => {
    if (!source.enabled) return <XCircle className="w-4 h-4" />;
    if (!source.hasCredentials) return <AlertTriangle className="w-4 h-4" />;
    if (!source.credentialsValid) return <XCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            Product Data Sources
          </h1>
          <p className="text-gray-400">Configure API integrations for live product data</p>
        </div>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-xl p-6">
            <Database className="w-8 h-8 mb-3 text-blue-400" />
            <p className="text-2xl font-bold text-white mb-1">{stats.total || sources.length}</p>
            <p className="text-sm text-gray-400">Total Sources</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-6">
            <CheckCircle className="w-8 h-8 mb-3 text-green-400" />
            <p className="text-2xl font-bold text-white mb-1">{stats.enabled || sources.filter(s => s.enabled).length}</p>
            <p className="text-sm text-gray-400">Enabled</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-6">
            <Key className="w-8 h-8 mb-3 text-orange-400" />
            <p className="text-2xl font-bold text-white mb-1">{stats.withCredentials || sources.filter(s => s.hasCredentials).length}</p>
            <p className="text-sm text-gray-400">With Credentials</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-6">
            <Zap className="w-8 h-8 mb-3 text-purple-400" />
            <p className="text-2xl font-bold text-white mb-1">{stats.validCredentials || sources.filter(s => s.credentialsValid).length}</p>
            <p className="text-sm text-gray-400">Active & Valid</p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-2 border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">About Product Data Sources</h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p>The Materials Hub supports multiple data sources with automatic fallback:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><span className="font-semibold text-blue-400">Direct APIs</span> - Official store APIs (highest priority, real-time data)</li>
                <li><span className="font-semibold text-purple-400">Third-Party Providers</span> - Aggregator services like Rainforest API</li>
                <li><span className="font-semibold text-green-400">Vendor Catalogs</span> - Custom uploads from your vendors</li>
                <li><span className="font-semibold text-gray-400">Manual Reference</span> - Demo data and manual entries</li>
              </ul>
              <p className="mt-3 text-blue-300">
                <strong>Priority System:</strong> The system searches enabled sources in order. Configure credentials to enable live data sources.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Direct API Sources */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Direct Store APIs (Official)
        </h2>
        <div className="space-y-4">
          {sources.filter(s => s.type === 'direct-api').map(source => (
            <SourceCard
              key={source.id}
              source={source}
              onToggle={() => toggleSource(source)}
              onTest={() => testConnection(source.id)}
              onSync={() => syncSource(source.id)}
              onEdit={() => setEditingSource(source.id)}
              isTesting={testingSource === source.id}
              isSyncing={syncingSource === source.id}
              getIcon={getSourceIcon}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
            />
          ))}
        </div>
      </div>

      {/* Third-Party API Sources */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-purple-500" />
          Third-Party Aggregators
        </h2>
        <div className="space-y-4">
          {sources.filter(s => s.type === 'third-party').map(source => (
            <SourceCard
              key={source.id}
              source={source}
              onToggle={() => toggleSource(source)}
              onTest={() => testConnection(source.id)}
              onSync={() => syncSource(source.id)}
              onEdit={() => setEditingSource(source.id)}
              isTesting={testingSource === source.id}
              isSyncing={syncingSource === source.id}
              getIcon={getSourceIcon}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
            />
          ))}
        </div>
      </div>

      {/* Vendor & Manual Sources */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" />
          Vendor & Manual Sources
        </h2>
        <div className="space-y-4">
          {sources.filter(s => s.type === 'vendor-catalog' || s.type === 'manual-reference').map(source => (
            <SourceCard
              key={source.id}
              source={source}
              onToggle={() => toggleSource(source)}
              onTest={() => testConnection(source.id)}
              onSync={() => syncSource(source.id)}
              onEdit={() => setEditingSource(source.id)}
              isTesting={testingSource === source.id}
              isSyncing={syncingSource === source.id}
              getIcon={getSourceIcon}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
            />
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingSource && (
        <EditSourceModal
          source={sources.find(s => s.id === editingSource)!}
          onClose={() => setEditingSource(null)}
          onSave={async (updated) => {
            const success = await productDataSourceManager.updateDataSource(updated);
            if (success) {
              toast.success('Source updated successfully');
              loadData();
              setEditingSource(null);
            } else {
              toast.error('Failed to update source');
            }
          }}
        />
      )}
    </div>
  );
}

// Source Card Component
function SourceCard({
  source,
  onToggle,
  onTest,
  onSync,
  onEdit,
  isTesting,
  isSyncing,
  getIcon,
  getStatusColor,
  getStatusIcon
}: any) {
  const statusColor = getStatusColor(source);
  const borderColors = {
    gray: 'border-gray-500/30',
    yellow: 'border-yellow-500/30',
    red: 'border-red-500/30',
    green: 'border-green-500/30'
  };

  return (
    <div className={`bg-[#1A1A1A] border-2 ${borderColors[statusColor as keyof typeof borderColors]} rounded-xl p-6 hover:border-opacity-50 transition`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${statusColor}-600 to-${statusColor}-700 flex items-center justify-center`}>
            {getIcon(source.type)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{source.name}</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className={`flex items-center gap-1 text-${statusColor}-400`}>
                {getStatusIcon(source)}
                {source.enabled ? 'Enabled' : 'Disabled'}
              </span>
              {source.hasCredentials && (
                <span className="flex items-center gap-1 text-gray-400">
                  <Key className="w-3 h-3" />
                  Configured
                </span>
              )}
              {source.lastSync && (
                <span className="text-gray-500">
                  Last sync: {new Date(source.lastSync).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Enable/Disable Toggle */}
          <button
            onClick={onToggle}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              source.enabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {source.enabled ? 'Enabled' : 'Disabled'}
          </button>

          {/* Test Connection */}
          {source.type !== 'vendor-catalog' && source.type !== 'manual-reference' && (
            <button
              onClick={onTest}
              disabled={isTesting || !source.hasCredentials}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Test
                </>
              )}
            </button>
          )}

          {/* Sync */}
          {source.enabled && source.credentialsValid && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync
                </>
              )}
            </button>
          )}

          {/* Configure */}
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Configuration Hint */}
      {!source.hasCredentials && source.type !== 'vendor-catalog' && source.type !== 'manual-reference' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
          <p className="text-sm text-yellow-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Click "Configure" to add API credentials and enable this source
          </p>
        </div>
      )}

      {/* Priority Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-400">Priority: {source.priority}</span>
        <span className="text-sm text-gray-600">•</span>
        <span className="text-sm text-gray-400 capitalize">{source.type.replace('-', ' ')}</span>
      </div>
    </div>
  );
}

// Edit Source Modal
function EditSourceModal({ source, onClose, onSave }: any) {
  const [formData, setFormData] = useState(source);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Configure {source.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#2A2A2A] rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* API Key */}
          {source.type !== 'vendor-catalog' && source.type !== 'manual-reference' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Key *</label>
                <input
                  type="password"
                  value={formData.config.apiKey || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, apiKey: e.target.value },
                    hasCredentials: !!e.target.value
                  })}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              {/* API Secret (for Oxylabs) */}
              {source.provider === 'oxylabs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">API Secret *</label>
                  <input
                    type="password"
                    value={formData.config.apiSecret || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, apiSecret: e.target.value }
                    })}
                    placeholder="Enter your API secret"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  min="1"
                  max="10"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <p className="text-sm text-gray-500 mt-1">Lower numbers = higher priority (searched first)</p>
              </div>

              {/* Documentation Link */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-200 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Need API credentials?
                </p>
                <a
                  href={getDocumentationUrl(source.provider)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  Visit {source.name} Documentation
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] text-white font-semibold rounded-xl hover:bg-[#3A3A3A] transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDocumentationUrl(provider: string) {
  const urls: Record<string, string> = {
    homedepot: 'https://developer.homedepot.com/',
    lowes: 'https://developer.lowes.com/',
    grainger: 'https://developer.grainger.com/',
    rainforest: 'https://www.rainforestapi.com/docs',
    oxylabs: 'https://developers.oxylabs.io/scraper-apis',
    brightdata: 'https://docs.brightdata.com/'
  };
  return urls[provider] || 'https://google.com';
}