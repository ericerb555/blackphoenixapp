/**
 * Supabase Connection Diagnostics Tool
 * Tests all Supabase connections and endpoints
 */

import { useState } from 'react';
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { projectId as supabaseProjectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-57095a78`;

interface DiagnosticResult {
  test: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

export default function SupabaseDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const testResults: DiagnosticResult[] = [];

    // Test 1: Health Check
    try {
      // DISABLED: Health check removed to prevent console 404 spam
      const response = { ok: false } as Response;
      if (response.ok) {
        const data = await response.json();
        testResults.push({
          test: 'Health Check',
          status: 'success',
          message: `Server v${data.version} is running`,
          data: data
        });
      } else {
        testResults.push({
          test: 'Health Check',
          status: 'error',
          message: `Server returned ${response.status}`,
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Health Check',
        status: 'error',
        message: `Connection failed: ${error.message}`,
      });
    }

    // Test 2: Diagnostics Endpoint
    try {
      const response = await fetch(`${API_BASE}/diagnostics`);
      if (response.ok) {
        const data = await response.json();
        testResults.push({
          test: 'Diagnostics Endpoint',
          status: 'success',
          message: `All systems checked`,
          data: data
        });
      } else {
        testResults.push({
          test: 'Diagnostics Endpoint',
          status: 'error',
          message: `Diagnostics returned ${response.status}`,
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Diagnostics Endpoint',
        status: 'error',
        message: `Failed: ${error.message}`,
      });
    }

    // Test 3: CORS Preflight
    try {
      const response = await fetch(`${API_BASE}/media/upload`, {
        method: 'OPTIONS',
      });
      if (response.ok || response.status === 204) {
        testResults.push({
          test: 'CORS Preflight',
          status: 'success',
          message: 'CORS headers configured correctly',
        });
      } else {
        testResults.push({
          test: 'CORS Preflight',
          status: 'warning',
          message: `Preflight returned ${response.status}`,
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'CORS Preflight',
        status: 'error',
        message: `CORS check failed: ${error.message}`,
      });
    }

    // Test 4: Environment Variables
    testResults.push({
      test: 'Environment Variables',
      status: 'success',
      message: `Project ID: ${supabaseProjectId}`,
      data: {
        projectId: supabaseProjectId,
        hasAnonKey: !!publicAnonKey,
        anonKeyLength: publicAnonKey?.length || 0
      }
    });

    setResults(testResults);
    setRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400 animate-pulse" />;
    }
  };

  return (
    <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-[#ea580c]" />
          <h2 className="text-xl font-semibold text-white">Supabase Diagnostics</h2>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#dc4e0a] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running...' : 'Run Tests'}
        </button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Click "Run Tests" to check your Supabase connection
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4"
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{result.test}</h3>
                  <p className="text-sm text-gray-400">{result.message}</p>
                  {result.data && (
                    <pre className="mt-2 p-2 bg-[#1A1A1A] rounded text-xs text-gray-300 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className="mt-6 p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Summary:</span>
              <div className="flex gap-4 text-sm">
                <span className="text-green-500">
                  ✓ {results.filter(r => r.status === 'success').length} Passed
                </span>
                <span className="text-yellow-500">
                  ⚠ {results.filter(r => r.status === 'warning').length} Warnings
                </span>
                <span className="text-red-500">
                  ✗ {results.filter(r => r.status === 'error').length} Failed
                </span>
              </div>
            </div>
          </div>

          {/* Connection Info */}
          <div className="mt-4 p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
            <h3 className="font-semibold text-white mb-2">Connection Info</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Project ID:</span>
                <span className="text-white font-mono">{supabaseProjectId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">API Base URL:</span>
                <span className="text-white font-mono text-xs">{API_BASE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Function Name:</span>
                <span className="text-white font-mono">server</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Route Prefix:</span>
                <span className="text-white font-mono">/make-server-57095a78</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
