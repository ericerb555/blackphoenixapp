/**
 * Data Recovery — scans ALL KV store keys to find work requests
 * regardless of what key they were saved under.
 */

import { useState } from 'react';
import { RefreshCw, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export default function DataRecovery({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const scanAll = async () => {
    setScanning(true);
    setResults(null);
    const found: any = { allWorkRequests: [], byKey: {} };

    try {
      // 1. Query ALL rows in kv_store_57095a78
      const { data: allRows, error } = await supabase
        .from('kv_store_57095a78')
        .select('key, value')
        .order('key');

      if (error) { toast.error('DB error: ' + error.message); setScanning(false); return; }

      found.totalKeys = allRows?.length || 0;

      allRows?.forEach((row: any) => {
        const key = row.key;
        const val = row.value;

        // Check for work request arrays
        if (key === 'all_work_requests' && Array.isArray(val)) {
          found.allWorkRequests = val;
          found.byKey[key] = val.length + ' work requests';
        }
        // Check for individual wr: keys
        else if (key.startsWith('wr:') && val?.id) {
          if (!found.individualWR) found.individualWR = [];
          found.individualWR.push(val);
          found.byKey[key] = `${val.client_name || val.clientName || 'Customer'} - ${val.serviceType || val.project_type || 'Service'}`;
        }
        // Check for wr_index
        else if (key === 'wr_index') {
          found.byKey[key] = Array.isArray(val) ? val.length + ' IDs in index' : 'present';
        }
        // Check for user-specific work request keys
        else if (key.includes('work_request') || key.includes('workRequest')) {
          if (!found.userSpecific) found.userSpecific = [];
          if (Array.isArray(val)) found.userSpecific.push(...val);
          else if (val?.id) found.userSpecific.push(val);
          found.byKey[key] = Array.isArray(val) ? val.length + ' items' : 'single item';
        }
        // Check for any value that looks like a work request
        else if (val && typeof val === 'object' && (val.client_name || val.clientName || val.client_email || val.clientEmail)) {
          if (!found.scattered) found.scattered = [];
          found.scattered.push({ key, value: val });
          found.byKey[key] = `Possible WR: ${val.client_name || val.clientName || val.client_email || val.clientEmail}`;
        }
        else if (Array.isArray(val) && val.length > 0 && val[0] && (val[0].client_name || val[0].clientName || val[0].client_email)) {
          if (!found.scatteredArrays) found.scatteredArrays = [];
          found.scatteredArrays.push({ key, count: val.length, sample: val[0] });
          found.byKey[key] = `Array with ${val.length} WR-like items`;
        }
      });

      // Combine all found work requests
      const combined = [
        ...found.allWorkRequests,
        ...(found.individualWR || []),
        ...(found.userSpecific || []),
        ...(found.scattered?.map((s: any) => s.value) || []),
        ...(found.scatteredArrays?.flatMap((s: any) => {
          const { data: rows2 } = { data: allRows?.find(r => r.key === s.key)?.value };
          return Array.isArray(rows2) ? rows2 : [];
        }) || []),
      ];

      // Deduplicate
      const seen = new Set();
      found.combined = combined.filter((r: any) => {
        const id = r.id || r.client_email;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      setResults(found);

      // If we found requests not in all_work_requests, recover them
      if (found.combined.length > 0 && found.combined.length > found.allWorkRequests.length) {
        const { error: saveErr } = await supabase
          .from('kv_store_57095a78')
          .upsert({ key: 'all_work_requests', value: found.combined }, { onConflict: 'key' });
        if (!saveErr) {
          toast.success(`Recovered ${found.combined.length} work requests to all_work_requests key!`);
        }
      }

    } catch (e: any) {
      toast.error('Scan failed: ' + e.message);
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Work Request Recovery</h1>
          <p className="text-gray-400 text-sm">Scans ALL Supabase KV keys to find work requests regardless of where they were saved</p>
        </div>

        <button
          onClick={scanAll}
          disabled={scanning}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition disabled:opacity-50"
        >
          {scanning ? <><RefreshCw className="w-5 h-5 animate-spin" /> Scanning...</> : <><Search className="w-5 h-5" /> Scan & Recover All Work Requests</>}
        </button>

        {results && (
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <h3 className="font-bold text-white mb-3">Scan Results</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-[#0A0A0A] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-400">{results.totalKeys}</p>
                  <p className="text-xs text-gray-500">Total KV keys</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{results.combined?.length || 0}</p>
                  <p className="text-xs text-gray-500">Work requests found</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{results.allWorkRequests?.length || 0}</p>
                  <p className="text-xs text-gray-500">In main key</p>
                </div>
              </div>

              {results.combined?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Found {results.combined.length} work request(s):</p>
                  {results.combined.map((wr: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-[#0A0A0A] rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-white">{wr.client_name || wr.clientName || 'Customer'}</p>
                        <p className="text-xs text-gray-500">{wr.client_email || wr.clientEmail} · {wr.serviceType || wr.project_type || 'Service'} · {wr.created_at ? new Date(wr.created_at).toLocaleDateString() : ''}</p>
                      </div>
                      <span className="text-xs text-gray-600">{wr.id?.substring(0, 12)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  No work requests found in any KV key. The submissions may not have been saved to the database.
                </div>
              )}
            </div>

            {Object.keys(results.byKey).length > 0 && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                <h3 className="font-bold text-white mb-3 text-sm">Keys Found with Work Request Data:</h3>
                <div className="space-y-1">
                  {Object.entries(results.byKey).map(([key, desc]: any) => (
                    <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-[#2A2A2A]">
                      <span className="text-gray-400 font-mono">{key}</span>
                      <span className="text-gray-500">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.combined?.length > 0 && (
              <button
                onClick={() => onNavigate?.('work-request-viewer')}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition"
              >
                View All Work Requests →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
