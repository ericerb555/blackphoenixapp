/**
 * Database Migration Tool
 * Migrates existing localStorage data to Supabase database
 * One-time migration for moving to production-grade storage
 */

import { useState } from 'react';
import { Database, ArrowRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { CompanyDatabaseService } from '../lib/services/companyDatabaseService';
import { BrandingService } from '../lib/services/brandingService';

export default function DatabaseMigrationTool() {
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationStats, setMigrationStats] = useState({
    companies: 0,
    brandingData: false,
  });

  const handleMigration = async () => {
    try {
      setMigrating(true);
      console.log('🚀 Starting database migration...');

      // Step 1: Migrate companies from localStorage
      console.log('📦 Step 1: Migrating companies...');
      const { migratedCount } = await CompanyDatabaseService.migrateFromLocalStorage();
      console.log(`✅ Migrated ${migratedCount} companies`);

      // Step 2: Ensure branding profile is in database
      console.log('📦 Step 2: Migrating branding profile...');
      const { data: existingProfile } = await BrandingService.getBrandingProfile();
      let brandingMigrated = false;

      if (existingProfile) {
        // Re-save to ensure it's in the database
        await BrandingService.updateBrandingProfile(existingProfile);
        brandingMigrated = true;
        console.log('✅ Branding profile migrated');
      }

      // Update stats
      setMigrationStats({
        companies: migratedCount,
        brandingData: brandingMigrated,
      });

      setMigrationComplete(true);
      toast.success(`Migration complete! Moved ${migratedCount} companies to database.`);

      console.log('🎉 Migration complete!');
      console.log('📊 Migration stats:', {
        companies: migratedCount,
        brandingData: brandingMigrated,
      });
    } catch (error) {
      console.error('❌ Migration error:', error);
      toast.error('Migration failed. Please try again or contact support.');
    } finally {
      setMigrating(false);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      const { data: companies } = await CompanyDatabaseService.getCompanies();
      const { data: branding } = await BrandingService.getBrandingProfile();

      if (companies && companies.length > 0) {
        toast.success(`Found ${companies.length} companies in database`);
      } else {
        toast.info('No companies found in database yet');
      }

      if (branding) {
        toast.success('Branding profile found in database');
      }
    } catch (error) {
      toast.error('Error checking database status');
    }
  };

  if (migrationComplete) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Migration Complete! 🎉</h3>
            <p className="text-green-200 mb-4">
              Your data has been successfully migrated to the database and is now permanent.
            </p>

            <div className="bg-green-500/10 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-white mb-2">What was migrated:</h4>
              <ul className="space-y-1 text-sm text-green-200">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {migrationStats.companies} {migrationStats.companies === 1 ? 'company' : 'companies'}
                </li>
                {migrationStats.brandingData && (
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Branding profile
                  </li>
                )}
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-2">✅ Your data is now:</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Stored in PostgreSQL database</li>
                <li>• Protected with Row Level Security</li>
                <li>• Automatically backed up by Supabase</li>
                <li>• Safe from environment resets</li>
                <li>• Persistent across all updates</li>
              </ul>
            </div>

            <button
              onClick={checkDatabaseStatus}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Check Database Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-start gap-4">
        <Database className="w-8 h-8 text-[#ea580c] flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">Database Migration</h3>
          <p className="text-gray-400 mb-4">
            Migrate your data from browser storage to permanent database storage
          </p>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-200 mb-1">Why migrate to database?</p>
                <ul className="text-blue-200/80 space-y-1">
                  <li>✅ Data persists forever (survives all updates)</li>
                  <li>✅ Automatic backups by Supabase</li>
                  <li>✅ Protected with enterprise security</li>
                  <li>✅ Accessible from any device</li>
                  <li>✅ No risk of data loss</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-white mb-2">What will be migrated:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#ea580c]" />
                All company information
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#ea580c]" />
                Branding profile (logos, colors, contact info)
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#ea580c]" />
                Company documents
              </li>
            </ul>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <p className="font-semibold mb-1">Important:</p>
                <p className="text-yellow-200/80">
                  This is a ONE-TIME migration. Your data will be copied to the database,
                  but won't be deleted from browser storage (for safety).
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleMigration}
            disabled={migrating}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#ea580c] hover:bg-[#dc2626] disabled:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            {migrating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Migrating to Database...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Start Migration
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-3 text-center">
            Safe to run multiple times • Won't create duplicates
          </p>
        </div>
      </div>
    </div>
  );
}
