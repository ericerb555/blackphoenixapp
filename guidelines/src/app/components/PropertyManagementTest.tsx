import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function PropertyManagementTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results: any[] = [];

    // Test 1: Verify Supabase info
    results.push({
      test: 'Supabase Configuration',
      status: projectId && publicAnonKey ? 'PASS' : 'FAIL',
      details: {
        projectId,
        hasPublicKey: !!publicAnonKey
      }
    });

    // Test 2: Test health endpoint
    try {
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-management/health`;
      console.log('Testing health endpoint:', healthUrl);
      
      const healthRes = await fetch(healthUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const healthData = await healthRes.json();
      
      results.push({
        test: 'Health Endpoint',
        status: healthRes.ok ? 'PASS' : 'FAIL',
        details: {
          url: healthUrl,
          status: healthRes.status,
          statusText: healthRes.statusText,
          data: healthData
        }
      });
    } catch (error) {
      results.push({
        test: 'Health Endpoint',
        status: 'ERROR',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    // Test 3: Test pending-counts endpoint
    try {
      const countsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-management/pending-counts`;
      console.log('Testing pending-counts endpoint:', countsUrl);
      
      const countsRes = await fetch(countsUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const countsData = await countsRes.json();
      
      results.push({
        test: 'Pending Counts Endpoint',
        status: countsRes.ok ? 'PASS' : 'FAIL',
        details: {
          url: countsUrl,
          status: countsRes.status,
          statusText: countsRes.statusText,
          data: countsData
        }
      });
    } catch (error) {
      results.push({
        test: 'Pending Counts Endpoint',
        status: 'ERROR',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    // Test 4: Test inline health endpoint
    try {
      const inlineHealthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-management-test`;
      console.log('Testing inline test endpoint:', inlineHealthUrl);
      
      const inlineRes = await fetch(inlineHealthUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const inlineData = await inlineRes.json();
      
      results.push({
        test: 'Inline Test Endpoint',
        status: inlineRes.ok ? 'PASS' : 'FAIL',
        details: {
          url: inlineHealthUrl,
          status: inlineRes.status,
          statusText: inlineRes.statusText,
          data: inlineData
        }
      });
    } catch (error) {
      results.push({
        test: 'Inline Test Endpoint',
        status: 'ERROR',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    // Test 5: Test base server endpoint
    try {
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
      console.log('Testing base server endpoint:', baseUrl);
      
      const baseRes = await fetch(baseUrl, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      let baseData;
      try {
        baseData = await baseRes.json();
      } catch {
        baseData = await baseRes.text();
      }
      
      results.push({
        test: 'Base Server Endpoint',
        status: baseRes.ok ? 'PASS' : 'FAIL',
        details: {
          url: baseUrl,
          status: baseRes.status,
          statusText: baseRes.statusText,
          data: baseData
        }
      });
    } catch (error) {
      results.push({
        test: 'Base Server Endpoint',
        status: 'ERROR',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Property Management API Test</h1>
        <p className="text-gray-600">Test connectivity to Property Management endpoints</p>
      </div>

      <button
        onClick={runTests}
        disabled={testing}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 mb-6"
      >
        {testing ? 'Running Tests...' : 'Run Tests'}
      </button>

      {testResults.length > 0 && (
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                result.status === 'PASS'
                  ? 'border-green-500 bg-green-50'
                  : result.status === 'FAIL'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-red-500 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{result.test}</h3>
                <span
                  className={`px-3 py-1 rounded text-sm font-bold ${
                    result.status === 'PASS'
                      ? 'bg-green-500 text-white'
                      : result.status === 'FAIL'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {result.status}
                </span>
              </div>
              <pre className="bg-white p-3 rounded text-xs overflow-auto max-h-60">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {testResults.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-500 rounded-lg">
          <h3 className="font-bold mb-2">Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {testResults.filter(r => r.status === 'PASS').length}
              </div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {testResults.filter(r => r.status === 'FAIL').length}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {testResults.filter(r => r.status === 'ERROR').length}
              </div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
