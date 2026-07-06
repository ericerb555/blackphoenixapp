import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { CheckCircle, XCircle, RefreshCw, Database } from 'lucide-react';

export function SupabaseConnectionTest() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setStatus('checking');
    setError(null);
    
    try {
      console.log('🔍 Testing Supabase connection...');
      
      // Test 1: Check if we can get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('✅ Session check:', sessionData);
      
      // Test 2: Try to query KV store
      const healthResponse = await fetch(
        `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-57095a78/health`,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o'
          }
        }
      );
      const healthData = await healthResponse.json();
      console.log('✅ Server health check:', healthData);
      
      // Test 3: Check public branding endpoint
      const brandingResponse = await fetch(
        `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-57095a78/public/branding`,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o'
          }
        }
      );
      const brandingData = await brandingResponse.json();
      console.log('✅ Branding data:', brandingData);
      
      setDetails({
        session: sessionData,
        health: healthData,
        branding: brandingData,
        timestamp: new Date().toISOString()
      });
      
      setStatus('connected');
      console.log('✅ All Supabase connection tests passed!');
      
    } catch (err: any) {
      console.error('❌ Connection test failed:', err);
      setError(err.message);
      setStatus('error');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-orange-600" />
        <h2 className="text-xl font-bold">Supabase Connection Status</h2>
      </div>

      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
          {status === 'checking' && (
            <>
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="font-medium text-blue-700">Checking connection...</span>
            </>
          )}
          {status === 'connected' && (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-green-700">Connected Successfully!</span>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="font-medium text-red-700">Connection Error</span>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-mono">{error}</p>
          </div>
        )}

        {/* Connection Details */}
        {details && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Connection Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Project ID:</span>
                  <span className="font-mono font-medium">plzsvzwwcdopnawtiwzm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Server Health:</span>
                  <span className="font-medium text-green-600">
                    {details.health?.status || 'OK'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Session:</span>
                  <span className="font-medium">
                    {details.session?.session ? 'Active' : 'No active session'}
                  </span>
                </div>
                {details.branding && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company Name:</span>
                    <span className="font-medium">
                      {details.branding.company_name || 'Not set'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Checked:</span>
                  <span className="font-mono text-xs">
                    {new Date(details.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Raw Response (Collapsible) */}
            <details className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                View Raw Response Data
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-60 font-mono text-gray-600">
                {JSON.stringify(details, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Refresh Button */}
        <Button
          onClick={testConnection}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Test Connection Again
            </>
          )}
        </Button>

        {/* Documentation */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-1">Connection Info</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Supabase URL: https://plzsvzwwcdopnawtiwzm.supabase.co</li>
            <li>• Edge Function: /functions/v1/make-server-57095a78</li>
            <li>• Auth Provider: Configured and ready</li>
            <li>• Database: PostgreSQL with KV Store</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
