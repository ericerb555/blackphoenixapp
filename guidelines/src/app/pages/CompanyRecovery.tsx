import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';

export default function CompanyRecovery({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [backups, setBackups] = useState<Array<{ key: string; data: any; timestamp: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = () => {
    setLoading(true);
    const found: Array<{ key: string; data: any; timestamp: number }> = [];
    
    // Find all backup keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('companies_backup_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          const timestamp = parseInt(key.split('_').pop() || '0');
          found.push({ key, data, timestamp });
        } catch (err) {
          console.error('Error parsing backup:', key, err);
        }
      }
    }
    
    // Sort by timestamp (newest first)
    found.sort((a, b) => b.timestamp - a.timestamp);
    setBackups(found);
    setLoading(false);
  };

  const restoreBackup = async (backup: { key: string; data: any; timestamp: number }) => {
    if (!Array.isArray(backup.data) || backup.data.length === 0) {
      toast.error('This backup contains no companies');
      return;
    }

    setUploading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        toast.error('Not authenticated. Please log in again.');
        setUploading(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Upload each company from backup to database
      for (const company of backup.data) {
        try {
          console.log('Uploading company:', company.name);
          
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/companies`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(company)
            }
          );

          if (response.ok) {
            successCount++;
            console.log(`✅ ${company.name} uploaded successfully`);
          } else {
            errorCount++;
            const errorText = await response.text();
            console.error(`❌ Failed to upload ${company.name}:`, errorText);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error uploading ${company.name}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Restored ${successCount} ${successCount === 1 ? 'company' : 'companies'}!`, {
          description: errorCount > 0 ? `${errorCount} failed` : 'All companies restored successfully'
        });
        
        setTimeout(() => {
          onNavigate?.('owners-dashboard');
        }, 2000);
      } else {
        toast.error('Failed to restore any companies');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore backup');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] border-b border-[#ea580c]/30">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate?.('owners-dashboard')}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl">
                <RefreshCw className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Company Recovery</h1>
                <p className="text-gray-400 mt-1">Restore your companies from automatic backups</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-yellow-500 font-bold text-lg mb-2">Automatic Backups Found</h3>
              <p className="text-gray-300 mb-2">
                We found {backups.length} automatic {backups.length === 1 ? 'backup' : 'backups'} of your company data.
                Select the most recent backup with your complete company information to restore it to the database.
              </p>
              <p className="text-gray-400 text-sm">
                Each backup shows when it was created and how many companies it contains.
              </p>
            </div>
          </div>
        </div>

        {/* Backups List */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-[#ea580c] animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No backups found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {backups.map((backup, index) => (
              <div
                key={backup.key}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">
                        Backup #{backups.length - index}
                      </h3>
                      {index === 0 && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded-full">
                          Most Recent
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-3">
                      {new Date(backup.timestamp).toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <div className="text-sm">
                        <span className="text-gray-500">Companies: </span>
                        <span className="text-white font-semibold">{backup.data.length}</span>
                      </div>
                      {backup.data.length > 0 && (
                        <div className="text-sm">
                          <span className="text-gray-500">Names: </span>
                          <span className="text-white">
                            {backup.data.map((c: any) => c.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Show what data is included */}
                    {backup.data.length > 0 && backup.data[0] && (
                      <div className="mt-4 p-4 bg-[#0A0A0A] rounded-lg">
                        <p className="text-sm text-gray-500 mb-2">First company preview:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className={backup.data[0].logo_url ? 'text-green-400' : 'text-gray-600'}>
                              {backup.data[0].logo_url ? '✓' : '✗'} Logo
                            </span>
                          </div>
                          <div>
                            <span className={backup.data[0].address ? 'text-green-400' : 'text-gray-600'}>
                              {backup.data[0].address ? '✓' : '✗'} Address
                            </span>
                          </div>
                          <div>
                            <span className={backup.data[0].phone ? 'text-green-400' : 'text-gray-600'}>
                              {backup.data[0].phone ? '✓' : '✗'} Phone
                            </span>
                          </div>
                          <div>
                            <span className={backup.data[0].email ? 'text-green-400' : 'text-gray-600'}>
                              {backup.data[0].email ? '✓' : '✗'} Email
                            </span>
                          </div>
                          <div>
                            <span className={backup.data[0].documents?.length ? 'text-green-400' : 'text-gray-600'}>
                              {backup.data[0].documents?.length ? '✓' : '✗'} Documents ({backup.data[0].documents?.length || 0})
                            </span>
                          </div>
                          <div>
                            <span className={backup.data[0].employee_count ? 'text-green-400' : 'text-gray-600'}>
                              {backup.data[0].employee_count ? '✓' : '✗'} Employees
                            </span>
                          </div>
                          <div>
                            <span className={backup.data[0].tax_id ? 'text-green-400' : 'text-gray-600'}>
                              {backup.data[0].tax_id ? '✓' : '✗'} Tax ID
                            </span>
                          </div>
                          <div>
                            <span className={backup.data[0].industry ? 'text-green-400' : 'text-gray-600'}>
                              {backup.data[0].industry ? '✓' : '✗'} Industry
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => restoreBackup(backup)}
                    disabled={uploading}
                    className="ml-6 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-5 h-5" />
                    {uploading ? 'Restoring...' : 'Restore This Backup'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
