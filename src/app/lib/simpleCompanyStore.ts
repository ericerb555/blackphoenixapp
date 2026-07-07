/**
 * Company Storage with Database Persistence
 * Saves to Supabase database + localStorage backup
 */

import { saveDual, loadDual } from './database';

export interface Company {
  id: string;
  name: string;
  dba?: string;
  slug: string;
  is_primary: boolean;
  owner_id: string;
  logo_url?: string;
  logos?: any[];
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  industry?: string;
  description?: string;
  founded_date?: string;
  employee_count?: number;
  annual_revenue?: number;
  tax_id?: string;
  business_license?: string;
  documents?: any[];
  profile?: any;
  bank_accounts?: any[];
  created_at: string;
  updated_at?: string;
  role?: string;
}

const STORAGE_KEYS = [
  'companies_main',
  'companies_backup1',
  'companies_backup2',
  'companies_backup3',
  'companies_backup4'
];

/**
 * Get all companies for current user (async - loads from database)
 */
export async function getAllCompanies(userId?: string): Promise<Company[]> {
  try {
    // Load from database first (with localStorage fallback)
    const companies = await loadDual('companies');

    if (companies && Array.isArray(companies) && companies.length > 0) {
      console.log(`[CompanyStore] Loaded ${companies.length} companies from database`);
      return companies;
    }
  } catch (error) {
    console.error('[CompanyStore] Database load failed:', error);
  }

  console.log('[CompanyStore] No companies found');
  return [];
}

/**
 * Save companies to database + localStorage
 */
export async function saveCompanies(companies: Company[], userId?: string): Promise<void> {
  await saveDual('companies', companies);
  console.log(`[CompanyStore] ✅ Saved ${companies.length} companies to database`);
}

/**
 * Add a new company
 */
export async function addCompany(company: Company, userId?: string): Promise<Company[]> {
  const companies = await getAllCompanies(userId);
  companies.push(company);
  await saveCompanies(companies, userId);
  return companies;
}

/**
 * Update an existing company
 */
export async function updateCompany(companyId: string, updates: Partial<Company>, userId?: string): Promise<Company[]> {
  const companies = await getAllCompanies(userId);
  const index = companies.findIndex(c => c.id === companyId);

  if (index === -1) {
    console.error('[CompanyStore] Company not found:', companyId);
    return companies;
  }

  companies[index] = {
    ...companies[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  await saveCompanies(companies, userId);
  return companies;
}

/**
 * Delete a company
 */
export async function deleteCompany(companyId: string, userId?: string): Promise<Company[]> {
  const companies = await getAllCompanies(userId);
  const filtered = companies.filter(c => c.id !== companyId);
  await saveCompanies(filtered, userId);
  return filtered;
}

/**
 * Get active company (from localStorage)
 */
export async function getActiveCompany(userId?: string): Promise<Company | null> {
  try {
    const activeId = localStorage.getItem(`active_company_${userId || 'current'}`);
    if (activeId) {
      const companies = await getAllCompanies(userId);
      return companies.find(c => c.id === activeId) || companies[0] || null;
    }
  } catch (e) {
    console.error('[CompanyStore] Error getting active company:', e);
  }

  const companies = await getAllCompanies(userId);
  return companies[0] || null;
}

/**
 * Set active company
 */
export function setActiveCompany(companyId: string, userId?: string): void {
  try {
    localStorage.setItem(`active_company_${userId || 'current'}`, companyId);
    console.log('[CompanyStore] Set active company:', companyId);
  } catch (e) {
    console.error('[CompanyStore] Error setting active company:', e);
  }
}
