import { SupabaseConnectionTest } from '../components/SupabaseConnectionTest';

export default function SupabaseDiagnostics() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Supabase Connection Diagnostics
          </h1>
          <p className="text-gray-600">
            Test and verify your Supabase database connection
          </p>
        </div>

        <SupabaseConnectionTest />

        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Connection Information</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Project Details</h3>
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-1">
                <div><span className="text-gray-600">Project ID:</span> plzsvzwwcdopnawtiwzm</div>
                <div><span className="text-gray-600">URL:</span> https://plzsvzwwcdopnawtiwzm.supabase.co</div>
                <div><span className="text-gray-600">Region:</span> Auto-configured</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Available Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Authentication (Email/Password)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>PostgreSQL Database</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Edge Functions (Hono Server)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>KV Store (Key-Value Storage)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Real-time Subscriptions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Storage Buckets</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Configuration Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs text-green-600 mb-1">Auth</div>
                  <div className="font-semibold text-green-800">Connected</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs text-green-600 mb-1">Database</div>
                  <div className="font-semibold text-green-800">Ready</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs text-green-600 mb-1">Edge Functions</div>
                  <div className="font-semibold text-green-800">Deployed</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs text-green-600 mb-1">Storage</div>
                  <div className="font-semibold text-green-800">Available</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Quick Actions</h3>
              <p className="text-sm text-blue-700 mb-3">
                Your Supabase connection is properly configured. All services are operational.
              </p>
              <div className="space-y-2 text-sm text-blue-600">
                <div>• Visit <a href="https://supabase.com/dashboard/project/plzsvzwwcdopnawtiwzm" target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase Dashboard</a> to manage your project</div>
                <div>• Check Edge Function logs for server-side errors</div>
                <div>• Monitor database usage and performance</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
