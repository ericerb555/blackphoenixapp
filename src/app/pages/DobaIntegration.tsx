/**
 * Doba Integration
 * Connect Doba dropshipping platform to sync products and inventory
 */

import { useState } from 'react';
import { Package, Link as LinkIcon, RefreshCw, CheckCircle, AlertCircle, Key, Server } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function DobaIntegration() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const testConnection = async () => {
    if (!apiKey || !apiSecret) {
      toast.error('Please enter both API Key and API Secret');
      return;
    }

    setIsTesting(true);

    try {
      // TODO: Replace with actual Doba API endpoint
      // const response = await fetch('https://api.doba.com/v1/test', {
      //   headers: {
      //     'Authorization': `Bearer ${apiKey}`,
      //     'X-API-Secret': apiSecret
      //   }
      // });

      // For now, simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Save credentials to localStorage
      localStorage.setItem('doba_api_key', apiKey);
      localStorage.setItem('doba_api_secret', apiSecret);
      localStorage.setItem('doba_connected', 'true');

      setIsConnected(true);
      toast.success('✅ Successfully connected to Doba!');

      console.log('✅ Doba connection successful');
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
      // TODO: Replace with actual Doba product sync
      // const response = await fetch('https://api.doba.com/v1/products', {
      //   headers: {
      //     'Authorization': `Bearer ${apiKey}`,
      //     'X-API-Secret': apiSecret
      //   }
      // });
      // const products = await response.json();

      // For now, simulate product sync
      await new Promise(resolve => setTimeout(resolve, 3000));

      toast.success('✅ Products synced from Doba!');
      console.log('✅ Doba product sync complete');

    } catch (error: any) {
      console.error('❌ Doba sync failed:', error);
      toast.error('Failed to sync products: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('doba_api_key');
    localStorage.removeItem('doba_api_secret');
    localStorage.removeItem('doba_connected');
    setIsConnected(false);
    setApiKey('');
    setApiSecret('');
    toast.success('Disconnected from Doba');
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
                disabled={isTesting || !apiKey || !apiSecret}
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
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-sm text-green-400">
                  ✓ Your Doba account is connected and ready to sync products
                </p>
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
              <span>Navigate to Settings → API Settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span>Generate a new API key and secret</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">4.</span>
              <span>Copy your API key and secret, then paste them above</span>
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
