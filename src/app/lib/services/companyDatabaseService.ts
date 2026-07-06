/**
 * Company Database Service
 * Uses Supabase PostgreSQL tables for permanent data storage
 * This replaces localStorage and KV store for production-grade persistence
 */

import { supabase } from '../supabase';

export interface CompanyDocument {
  id: string;
  company_id: string;
  name: string;
  type: 'license' | 'insurance' | 'certification' | 'contract' | 'policy' | 'other';
  description?: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  expires_at?: string;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  user_id?: string;

  // Basic Info
  company_name: string;
  company_legal_name?: string;
  company_tagline?: string;
  slug?: string;

  // Contact Info
  email?: string;
  phone?: string;
  fax?: string;
  website?: string;

  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;

  // Branding
  logo_url?: string;
  logo_primary?: string;
  logo_secondary?: string;
  logo_icon?: string;
  logo_square?: string;
  logo_horizontal?: string;
  logo_vertical?: string;
  logo_white?: string;
  logo_black?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;

  // Business Details
  industry?: string;
  description?: string;
  tax_id?: string;
  tax_label?: string;

  // Banking
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;

  // Additional
  license_number?: string;
  insurance_number?: string;
  payment_terms?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;

  // Relationships
  documents?: CompanyDocument[];
}

export class CompanyDatabaseService {
  /**
   * Get current user's ID
   */
  private static async getUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Get all companies for current user
   */
  static async getCompanies(): Promise<{ data: Company[] | null; error: any }> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.log('No user ID - using anonymous mode');
        // Fall back to localStorage for demo mode
        return this.getCompaniesFromLocalStorage();
      }

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        // Fallback to localStorage
        return this.getCompaniesFromLocalStorage();
      }

      // Cache to localStorage for offline access - SINGLE KEY ONLY
      if (data && data.length > 0) {
        this.updateAllCaches(data as Company[], userId);
      }

      console.log(`✅ Loaded ${data?.length || 0} companies from database`);
      return { data: data as Company[], error: null };
    } catch (error) {
      console.error('Error loading companies:', error);
      return this.getCompaniesFromLocalStorage();
    }
  }

  /**
   * Get primary company (first one or most recently updated)
   */
  static async getPrimaryCompany(): Promise<{ data: Company | null; error: any }> {
    const { data: companies, error } = await this.getCompanies();

    if (error || !companies || companies.length === 0) {
      return { data: null, error };
    }

    // Return the most recently updated company
    const primary = companies[0];
    return { data: primary, error: null };
  }

  /**
   * Create or update a company
   */
  static async saveCompany(company: Company): Promise<{ data: Company | null; error: any }> {
    try {
      const userId = await this.getUserId();

      // Prepare company data
      const companyData = {
        ...company,
        user_id: userId || undefined,
        updated_at: new Date().toISOString(),
      };

      // If no ID, create new
      if (!company.id) {
        delete companyData.id;
        companyData.created_at = new Date().toISOString();
      }

      if (userId) {
        // Log logo sizes before saving
        console.log('🖼️ [DATABASE SAVE] Logo sizes in companyData:');
        console.log('   logo_primary:', companyData.logo_primary ? `${(companyData.logo_primary.length / 1024).toFixed(2)} KB` : 'NOT SET');
        console.log('   logo_secondary:', companyData.logo_secondary ? `${(companyData.logo_secondary.length / 1024).toFixed(2)} KB` : 'NOT SET');
        console.log('   logo_icon:', companyData.logo_icon ? `${(companyData.logo_icon.length / 1024).toFixed(2)} KB` : 'NOT SET');

        // Save to database
        const { data, error } = await supabase
          .from('companies')
          .upsert(companyData)
          .select()
          .single();

        if (error) {
          console.error('❌❌❌ DATABASE SAVE ERROR:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          // Fallback to localStorage
          return this.saveCompanyToLocalStorage(companyData);
        }

        console.log('✅ Company saved to database:', data.company_name);
        console.log('🖼️ [DATABASE SAVE] Logo sizes in returned data:');
        console.log('   logo_primary:', data.logo_primary ? `${(data.logo_primary.length / 1024).toFixed(2)} KB` : 'NOT SET');
        console.log('   logo_secondary:', data.logo_secondary ? `${(data.logo_secondary.length / 1024).toFixed(2)} KB` : 'NOT SET');
        console.log('   logo_icon:', data.logo_icon ? `${(data.logo_icon.length / 1024).toFixed(2)} KB` : 'NOT SET');

        // CRITICAL: Immediately update ALL caches with fresh data from database
        const { data: freshCompanies } = await this.getCompanies();
        if (freshCompanies) {
          this.updateAllCaches(freshCompanies, userId);
        }

        // Notify all listeners that company data changed
        window.dispatchEvent(new CustomEvent('companySaved', { detail: data }));

        return { data: data as Company, error: null };
      } else {
        // No user - save to localStorage only (demo mode)
        return this.saveCompanyToLocalStorage(companyData);
      }
    } catch (error) {
      console.error('Error saving company:', error);
      return this.saveCompanyToLocalStorage(company);
    }
  }

  /**
   * Delete a company
   */
  static async deleteCompany(companyId: string): Promise<{ success: boolean; error: any }> {
    try {
      const userId = await this.getUserId();

      if (userId) {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', companyId)
          .eq('user_id', userId);

        if (error) {
          console.error('Database delete error:', error);
          return { success: false, error };
        }

        console.log('✅ Company deleted from database');
        return { success: true, error: null };
      } else {
        // Delete from localStorage
        const stored = localStorage.getItem('companies_cache');
        if (stored) {
          const companies = JSON.parse(stored);
          const updated = companies.filter((c: Company) => c.id !== companyId);
          localStorage.setItem('companies_cache', JSON.stringify(updated));
        }
        return { success: true, error: null };
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      return { success: false, error };
    }
  }

  /**
   * Get documents for a company
   */
  static async getDocuments(companyId: string): Promise<{ data: CompanyDocument[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', companyId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        return { data: null, error };
      }

      return { data: data as CompanyDocument[], error: null };
    } catch (error) {
      console.error('Error loading documents:', error);
      return { data: null, error };
    }
  }

  /**
   * Save a document
   */
  static async saveDocument(document: CompanyDocument): Promise<{ data: CompanyDocument | null; error: any }> {
    try {
      const documentData = {
        ...document,
        updated_at: new Date().toISOString(),
      };

      if (!document.id) {
        delete documentData.id;
        documentData.created_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('company_documents')
        .upsert(documentData)
        .select()
        .single();

      if (error) {
        console.error('Error saving document:', error);
        return { data: null, error };
      }

      console.log('✅ Document saved to database');
      return { data: data as CompanyDocument, error: null };
    } catch (error) {
      console.error('Error saving document:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('company_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Error deleting document:', error);
        return { success: false, error };
      }

      console.log('✅ Document deleted from database');
      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting document:', error);
      return { success: false, error };
    }
  }

  /**
   * Update all localStorage caches with fresh data
   */
  private static updateAllCaches(companies: Company[], userId: string) {
    try {
      const data = JSON.stringify(companies);

      // SINGLE SOURCE: Only use companies_cache as the primary localStorage key
      localStorage.setItem('companies_cache', data);

      // Clear old redundant keys to prevent conflicts
      const keysToRemove = [
        'companies_offline',
        'companies_global_backup',
        'companies_latest',
        `companies_${userId}`,
      ];

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore errors
        }
      });

      console.log('✅ Updated cache with', companies.length, 'companies');
    } catch (error) {
      console.error('Error updating caches:', error);
    }
  }

  /**
   * Clear all company caches (useful for debugging)
   */
  static clearAllCaches() {
    const keys = [
      'companies_cache',
      'companies_offline',
      'companies_global_backup',
      'companies_latest',
      'active_company_id',
    ];

    // Also clear user-specific keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('companies_') || key.startsWith('company_') || key.includes('active_session'))) {
        keys.push(key);
      }
    }

    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore
      }
    });

    console.log('🧹 Cleared all company caches');
  }

  /**
   * Fallback: Get companies from localStorage
   */
  private static getCompaniesFromLocalStorage(): { data: Company[] | null; error: any } {
    try {
      // ONLY check companies_cache - single source of truth
      const stored = localStorage.getItem('companies_cache');

      if (stored) {
        const companies = JSON.parse(stored);
        console.log(`⚠️ Loaded ${companies.length} companies from localStorage cache`);
        return { data: companies, error: null };
      }

      return { data: [], error: null };
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return { data: [], error };
    }
  }

  /**
   * Fallback: Save company to localStorage
   */
  private static saveCompanyToLocalStorage(company: Company): { data: Company | null; error: any } {
    try {
      const stored = localStorage.getItem('companies_cache');
      let companies: Company[] = stored ? JSON.parse(stored) : [];

      if (company.id) {
        // Check if company exists
        const existingIndex = companies.findIndex(c => c.id === company.id);
        if (existingIndex >= 0) {
          // Update existing
          companies[existingIndex] = company;
        } else {
          // Company has ID but doesn't exist yet - add it
          companies.push(company);
        }
      } else {
        // Create new with generated ID
        company.id = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        companies.push(company);
      }

      // SINGLE KEY ONLY
      localStorage.setItem('companies_cache', JSON.stringify(companies));

      // Notify all listeners that company data changed
      window.dispatchEvent(new CustomEvent('companySaved', { detail: company }));

      console.log('⚠️ Company saved to localStorage (offline mode)');
      return { data: company, error: null };
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return { data: null, error };
    }
  }

  /**
   * Migrate data from localStorage to database
   * Call this once to move existing data
   */
  static async migrateFromLocalStorage(): Promise<{ success: boolean; migratedCount: number; error: any }> {
    try {
      console.log('🔄 Starting migration from localStorage to database...');

      const userId = await this.getUserId();
      if (!userId) {
        return { success: false, migratedCount: 0, error: 'No user logged in' };
      }

      // Get data from localStorage
      const { data: localCompanies } = this.getCompaniesFromLocalStorage();
      if (!localCompanies || localCompanies.length === 0) {
        console.log('No data to migrate');
        return { success: true, migratedCount: 0, error: null };
      }

      // Save each company to database
      let migratedCount = 0;
      for (const company of localCompanies) {
        const { data, error } = await this.saveCompany({
          ...company,
          user_id: userId,
        });

        if (data) {
          migratedCount++;
        } else {
          console.error('Failed to migrate company:', company.company_name, error);
        }
      }

      console.log(`✅ Migration complete! Migrated ${migratedCount} companies`);
      return { success: true, migratedCount, error: null };
    } catch (error) {
      console.error('Migration error:', error);
      return { success: false, migratedCount: 0, error };
    }
  }
}
