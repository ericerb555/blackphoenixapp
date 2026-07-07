/**
 * Doba Integration
 * Connect Doba dropshipping platform to sync products and inventory
 */

import { useState, useEffect } from 'react';
import { Package, Link as LinkIcon, RefreshCw, CheckCircle, AlertCircle, Key, Server } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export default function DobaIntegration() {
  const [retailerId, setRetailerId] = useState('9431671');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/doba/status`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setProductCount(data.product_count || 0);
        setLastSync(data.last_sync);
      }
    } catch (error: any) {
      console.error('Error checking Doba status:', error);
    }
  };

  const testConnection = async () => {
    if (!retailerId || !apiKey || !apiSecret) {
      toast.error('Please enter Retailer ID, API Key, and API Secret');
      return;
    }

    setIsTesting(true);

    try {
      const response = await fetch(`${API_BASE}/doba/test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ retailerId, apiKey, apiSecret })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Connection failed');
      }

      setIsConnected(true);
      toast.success('✅ Successfully connected to Doba!');

      console.log('✅ Doba connection successful');

      // Clear sensitive fields but keep retailer ID
      setApiKey('');
      setApiSecret('');

      // Refresh status
      await checkConnectionStatus();
    } catch (error: any) {
      console.error('❌ Doba connection failed:', error);
      toast.error('Failed to connect to Doba: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const syncProducts = async () => {
    if (!isConnected) {
      toast.error('Please connect to Doba first');
      return;
    }

    setIsSyncing(true);

    try {
      const response = await fetch(`${API_BASE}/doba/sync-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      toast.success(`✅ Synced ${data.count || 0} products from Doba!`);
      console.log('✅ Doba product sync complete:', data);

      // Update status
      setProductCount(data.count || 0);
      setLastSync(data.synced_at);

    } catch (error: any) {
      console.error('❌ Doba sync failed:', error);
      toast.error('Failed to sync products: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnect = async () => {
    try {
      const response = await fetch(`${API_BASE}/doba/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsConnected(false);
        setRetailerId('9431671');
        setApiKey('');
        setApiSecret('');
        setProductCount(0);
        setLastSync(null);
        toast.success('Disconnected from Doba');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Disconnect failed');
      }
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Doba Integration</h1>
              <p className="text-gray-400">Connect your Doba dropshipping account</p>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Connection Status</h2>
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Not Connected</span>
              </div>
            )}
          </div>

          {!isConnected ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Retailer ID
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={retailerId}
                    onChange={(e) => setRetailerId(e.target.value)}
                    placeholder="Enter your Doba Retailer ID"
                    className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Doba API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Doba API key"
                    className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Doba API Secret
                </label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your Doba API secret"
                    className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={testConnection}
                disabled={isTesting || !retailerId || !apiKey || !apiSecret}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-semibold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-5 h-5" />
                    Connect to Doba
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                <p className="text-sm text-green-400 font-semibold">
                  ✓ Your Doba account is connected and ready to sync products
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Synced Products</p>
                    <p className="text-lg font-bold text-white">{productCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Last Sync</p>
                    <p className="text-sm text-gray-300">
                      {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={disconnect}
                className="w-full px-6 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg font-semibold transition"
              >
                Disconnect Doba
              </button>
            </div>
          )}
        </div>

        {/* Product Sync */}
        {isConnected && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Product Sync</h2>
            <p className="text-gray-400 text-sm mb-6">
              Sync products from your Doba catalog to your store. This will import product details, images, pricing, and inventory levels.
            </p>

            <button
              onClick={syncProducts}
              disabled={isSyncing}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Syncing Products...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Sync Products from Doba
                </>
              )}
            </button>
          </div>
        )}

        {/* How to Get API Credentials */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-400 mb-3">How to Get Your Doba API Credentials</h3>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span>Log in to your Doba account at <a href="https://www.doba.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">doba.com</a></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span>Find your Retailer ID in your account settings (currently set to: <strong className="text-white">9431671</strong>)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span>Navigate to Settings → API Settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">4.</span>
              <span>Generate a new API key and secret</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">5.</span>
              <span>Copy your Retailer ID, API key, and API secret, then paste them above</span>
            </li>
          </ol>

          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-300">
              <strong>Note:</strong> Keep your API credentials secure. Never share them publicly or commit them to version control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
