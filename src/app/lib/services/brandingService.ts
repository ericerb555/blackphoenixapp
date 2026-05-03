import { supabase } from '../supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { saveDual, loadDual } from '../database';
import { CompanyDatabaseService, Company } from './companyDatabaseService';

export interface CompanyDocument {
  id: string;
  name: string;
  type: 'license' | 'insurance' | 'certification' | 'contract' | 'policy' | 'other';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  expiresAt?: string;
  description?: string;
  isPublic: boolean; // Whether to show on public-facing pages
}

export interface BrandingProfile {
  id?: string;
  company_name: string;
  company_legal_name: string;
  company_tagline: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  fax?: string;
  email: string;
  website: string;
  tax_id: string;
  tax_label: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  license_number?: string;
  insurance_number?: string;
  payment_terms: string;
  documents?: CompanyDocument[]; // Company documents
  created_at?: string;
  updated_at?: string;
}

const BRANDING_KEY = 'company_branding_profile';

export class BrandingService {
  /**
   * Get the company branding profile
   * Now uses Supabase database for permanent storage
   */
  static async getBrandingProfile(): Promise<{ data: BrandingProfile | null; error: any }> {
    try {
      console.log('🔍 Loading branding profile from database...');

      // Try database first (PRIMARY SOURCE OF TRUTH)
      const { data: company, error: dbError } = await CompanyDatabaseService.getPrimaryCompany();

      if (company) {
        console.log('✅ Loaded branding profile from database:', company.company_name);
        const profile = this.convertCompanyToBrandingProfile(company);

        // Cache to localStorage for offline access
        localStorage.setItem(BRANDING_KEY, JSON.stringify(profile));

        // Also cache logo variants to localStorage
        const logoVariants = {
          logo_primary: company.logo_primary || company.logo_url || '',
          logo_secondary: company.logo_secondary || '',
          logo_icon: company.logo_icon || '',
          logo_square: company.logo_square || '',
          logo_horizontal: company.logo_horizontal || '',
          logo_vertical: company.logo_vertical || '',
          logo_white: company.logo_white || '',
          logo_black: company.logo_black || '',
        };
        localStorage.setItem('company_logo_variants', JSON.stringify(logoVariants));

        return { data: profile, error: null };
      }

      if (dbError) {
        console.warn('Database error, trying fallbacks:', dbError);
      }

      // FALLBACK 1: Try dual persistence (old KV store + localStorage)
      const profile = await loadDual(BRANDING_KEY);
      if (profile) {
        console.log('✅ Loaded branding profile from fallback storage');
        // Migrate to database
        this.migrateToDatabaseInBackground(profile);
        return { data: profile, error: null };
      }

      // FALLBACK 2: Check backup locations
      const backupKeys = [
        'company_branding_profile_backup',
        'branding_profile_permanent',
        'company_data_backup'
      ];

      for (const backupKey of backupKeys) {
        const backup = await loadDual(backupKey);
        if (backup) {
          console.log(`✅ Recovered branding profile from backup: ${backupKey}`);
          // Migrate to database
          this.migrateToDatabaseInBackground(backup);
          return { data: backup, error: null };
        }
      }

      console.log('⚠️ No branding profile found anywhere');
      return { data: null, error: null };
    } catch (error) {
      console.error('Error loading branding profile:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Convert Company to BrandingProfile format
   */
  private static convertCompanyToBrandingProfile(company: Company): BrandingProfile {
    // Convert company documents to branding profile format
    const documents: CompanyDocument[] = (company.documents || []).map(doc => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      fileUrl: doc.file_url,
      fileName: doc.file_name,
      fileSize: doc.file_size,
      uploadedAt: doc.uploaded_at,
      expiresAt: doc.expires_at,
      description: doc.description,
      isPublic: doc.is_public,
    }));

    return {
      id: company.id,
      company_name: company.company_name || '',
      company_legal_name: company.company_legal_name || company.company_name || '',
      company_tagline: company.company_tagline || '',
      address_line1: company.address_line1 || '',
      address_line2: company.address_line2,
      city: company.city || '',
      state: company.state || '',
      zip_code: company.zip_code || '',
      country: company.country || 'United States',
      phone: company.phone || '',
      fax: company.fax,
      email: company.email || '',
      website: company.website || '',
      tax_id: company.tax_id || '',
      tax_label: company.tax_label || 'Tax ID',
      primary_color: company.primary_color || '#ea580c',
      secondary_color: company.secondary_color || '#dc2626',
      accent_color: company.accent_color || '#ea580c',
      logo_url: company.logo_url,
      bank_name: company.bank_name,
      bank_account_name: company.bank_account_name,
      bank_account_number: company.bank_account_number,
      bank_routing_number: company.bank_routing_number,
      license_number: company.license_number,
      insurance_number: company.insurance_number,
      payment_terms: company.payment_terms || 'Net 30',
      documents: documents,
      created_at: company.created_at,
      updated_at: company.updated_at,
    };
  }

  /**
   * Convert BrandingProfile to Company format
   */
  private static convertBrandingProfileToCompany(profile: BrandingProfile): Company {
    // Get logo variants from localStorage since they're stored there
    const logoVariants = localStorage.getItem('company_logo_variants');
    const parsedLogoVariants = logoVariants ? JSON.parse(logoVariants) : {};

    // Convert branding profile documents to company format
    const documents = (profile.documents || []).map(doc => ({
      id: doc.id,
      company_id: profile.id || '',
      name: doc.name,
      type: doc.type,
      description: doc.description,
      file_url: doc.fileUrl,
      file_name: doc.fileName,
      file_size: doc.fileSize,
      uploaded_at: doc.uploadedAt,
      expires_at: doc.expiresAt,
      is_public: doc.isPublic,
    }));

    return {
      id: profile.id || '',
      company_name: profile.company_name,
      company_legal_name: profile.company_legal_name,
      company_tagline: profile.company_tagline,
      address_line1: profile.address_line1,
      address_line2: profile.address_line2,
      city: profile.city,
      state: profile.state,
      zip_code: profile.zip_code,
      country: profile.country,
      phone: profile.phone,
      fax: profile.fax,
      email: profile.email,
      website: profile.website,
      tax_id: profile.tax_id,
      tax_label: profile.tax_label,
      primary_color: profile.primary_color,
      secondary_color: profile.secondary_color,
      accent_color: profile.accent_color,
      logo_url: profile.logo_url,
      // Include logo variants from localStorage
      logo_primary: parsedLogoVariants.logo_primary || profile.logo_url,
      logo_secondary: parsedLogoVariants.logo_secondary,
      logo_icon: parsedLogoVariants.logo_icon,
      logo_square: parsedLogoVariants.logo_square,
      logo_horizontal: parsedLogoVariants.logo_horizontal,
      logo_vertical: parsedLogoVariants.logo_vertical,
      logo_white: parsedLogoVariants.logo_white,
      logo_black: parsedLogoVariants.logo_black,
      bank_name: profile.bank_name,
      bank_account_name: profile.bank_account_name,
      bank_account_number: profile.bank_account_number,
      bank_routing_number: profile.bank_routing_number,
      license_number: profile.license_number,
      insurance_number: profile.insurance_number,
      payment_terms: profile.payment_terms,
      documents: documents,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  }

  /**
   * Migrate old data to database in background (don't block user)
   */
  private static async migrateToDatabaseInBackground(profile: BrandingProfile): Promise<void> {
    try {
      const company = this.convertBrandingProfileToCompany(profile);
      await CompanyDatabaseService.saveCompany(company);
      console.log('✅ Background migration to database complete');
    } catch (error) {
      console.error('⚠️ Background migration failed (non-critical):', error);
    }
  }

  /**
   * Update or create the company branding profile
   * Now saves to Supabase database for permanent storage
   */
  static async updateBrandingProfile(profile: BrandingProfile): Promise<{ data: BrandingProfile | null; error: any }> {
    try {
      const updatedProfile = {
        ...profile,
        updated_at: new Date().toISOString(),
      };

      if (!updatedProfile.created_at) {
        updatedProfile.created_at = new Date().toISOString();
      }

      console.log('💾 Saving branding profile to database...');

      // PRIMARY SAVE: Database (PostgreSQL)
      const company = this.convertBrandingProfileToCompany(updatedProfile);
      const { data: savedCompany, error: dbError } = await CompanyDatabaseService.saveCompany(company);

      if (savedCompany) {
        const savedProfile = this.convertCompanyToBrandingProfile(savedCompany);
        console.log('✅ Branding profile saved to database!');
        console.log('📊 Profile data:', {
          company: savedProfile.company_name,
          email: savedProfile.email,
          phone: savedProfile.phone,
          storage: 'PostgreSQL Database (Permanent)'
        });

        // Cache to localStorage for offline access
        localStorage.setItem(BRANDING_KEY, JSON.stringify(savedProfile));

        return { data: savedProfile, error: null };
      }

      // FALLBACK: If database save fails, use old method
      if (dbError) {
        console.warn('⚠️ Database save failed, using fallback storage:', dbError);
      }

      // Save to dual persistence as fallback
      await saveDual(BRANDING_KEY, updatedProfile);

      // Save to backup locations for extra safety
      const backupPromises = [
        saveDual('company_branding_profile_backup', updatedProfile),
        saveDual('branding_profile_permanent', updatedProfile),
        saveDual('company_data_backup', updatedProfile),
      ];

      await Promise.all(backupPromises);

      // Also save to old localStorage key for backwards compatibility
      localStorage.setItem('company_branding_profile', JSON.stringify(updatedProfile));

      console.log('✅ Branding profile saved to fallback locations');
      return { data: updatedProfile, error: null };
    } catch (error) {
      console.error('❌ Error saving branding profile:', error);
      return { data: null, error: error };
    }
  }

  /**
   * Get formatted address from profile
   */
  static getFormattedAddress(profile: BrandingProfile): string {
    return `${profile.address_line1}${profile.address_line2 ? `, ${profile.address_line2}` : ''}, ${profile.city}, ${profile.state} ${profile.zip_code}`;
  }

  /**
   * Get formatted contact info from profile
   */
  static getFormattedContact(profile: BrandingProfile): string {
    return `${profile.phone} • ${profile.email}`;
  }
}
