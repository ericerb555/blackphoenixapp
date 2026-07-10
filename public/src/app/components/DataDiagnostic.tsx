import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticResult {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function DataDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const diagnostics: DiagnosticResult[] = [];

    // 1. Check Server Health
    const serverCheck: DiagnosticResult = {
      name: 'Server Health',
      status: 'checking',
      message: 'Checking server...'
    };
    diagnostics.push(serverCheck);
    setResults([...diagnostics]);

    try {
      // DISABLED: Health check removed to prevent console 404 spam
      // Simulate offline response
      const response = { ok: false } as Response;
      
      if (response.ok) {
        const data = await response.json();
        serverCheck.status = 'success';
        serverCheck.message = `Server v${data.version} is online`;
        serverCheck.data = data;
      } else {
        serverCheck.status = 'error';
        serverCheck.message = `Server returned ${response.status}`;
      }
    } catch (error: any) {
      serverCheck.status = 'error';
      serverCheck.message = `Connection failed: ${error.message}`;
    }
    setResults([...diagnostics]);

    // 2. Check Customer Service
    const customerCheck: DiagnosticResult = {
      name: 'Customer Data',
      status: 'checking',
      message: 'Loading customers...'
    };
    diagnostics.push(customerCheck);
    setResults([...diagnostics]);

    try {
      const { getCustomers } = await import('../lib/services/customerService');
      const customers = await getCustomers();
      customerCheck.status = 'success';
      customerCheck.message = `Loaded ${customers.length} customers`;
      customerCheck.data = customers.slice(0, 3); // First 3 for preview
    } catch (error: any) {
      customerCheck.status = 'error';
      customerCheck.message = `Failed: ${error.message}`;
    }
    setResults([...diagnostics]);

    // 3. Check Supabase Connection
    const supabaseCheck: DiagnosticResult = {
      name: 'Supabase Config',
      status: 'checking',
      message: 'Checking configuration...'
    };
    diagnostics.push(supabaseCheck);
    setResults([...diagnostics]);

    try {
      const { supabase } = await import('../lib/supabase');
      const { data: session } = await supabase.auth.getSession();
      supabaseCheck.status = 'success';
      supabaseCheck.message = session.session 
        ? `Authenticated as ${session.session.user.email}` 
        : 'Using anonymous access';
      supabaseCheck.data = {
        projectId,
        hasSession: !!session.session
      };
    } catch (error: any) {
      supabaseCheck.status = 'error';
      supabaseCheck.message = `Config error: ${error.message}`;
    }
    setResults([...diagnostics]);

    // 4. Check KV Store Access
    const kvCheck: DiagnosticResult = {
      name: 'KV Store',
      status: 'checking',
      message: 'Testing KV store...'
    };
    diagnostics.push(kvCheck);
    setResults([...diagnostics]);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/kv/test_key`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      kvCheck.status = response.ok ? 'success' : 'error';
      kvCheck.message = response.ok 
        ? 'KV store accessible' 
        : `KV store error: ${response.status}`;
    } catch (error: any) {
      kvCheck.status = 'error';
      kvCheck.message = `KV access failed: ${error.message}`;
    }
    setResults([...diagnostics]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50"
      >
        <AlertCircle className="w-4 h-4" />
        <span>System Diagnostic</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <h3 className="text-white font-semibold">System Diagnostic</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runDiagnostics}
            className="p-1 hover:bg-[#2A2A2A] rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[#2A2A2A] rounded transition-colors"
          >
            <XCircle className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={index}
            className="p-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getStatusIcon(result.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium mb-1">
                  {result.name}
                </div>
                <div className={`text-sm ${
                  result.status === 'success' ? 'text-green-400' :
                  result.status === 'error' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {result.message}
                </div>
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      View Details
                    </summary>
                    <pre className="mt-2 text-xs text-gray-400 bg-black/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-3 border-t border-[#2A2A2A] bg-[#0F0F0F] rounded-b-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {results.filter(r => r.status === 'success').length} of {results.length} checks passed
          </span>
          <span className="text-xs text-gray-500">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
