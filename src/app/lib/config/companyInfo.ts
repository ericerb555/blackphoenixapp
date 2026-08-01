/**
 * Company Branding Configuration
 * Central source of truth for company information across the app
 * Now supports dynamic loading from database
 */

import { BrandingService, type BrandingProfile } from '../services/brandingService';

export interface CompanyInfo {
  name: string;
  legalName: string;
  tagline: string;
  logo?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website: string;
    fax?: string;
  };
  tax: {
    taxId: string;
    taxLabel: string;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
  };
  banking?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
  };
  legal: {
    licenseNumber?: string;
    insuranceNumber?: string;
    terms: string;
  };
}

// Default company information - used as fallback
export const defaultCompanyInfo: CompanyInfo = {
  name: 'The Black Phoenix Company', // DBA - public-facing brand name
  legalName: 'ProBuild Enterprise Solutions LLC', // Legal entity name for contracts/invoices only
  tagline: 'Professional Construction & Design Solutions',
  address: {
    line1: '1234 Business Park Drive',
    line2: 'Suite 500',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    country: 'United States',
  },
  contact: {
    phone: '(512) 555-0100',
    email: 'billing@probuild-enterprise.com',
    website: 'www.probuild-enterprise.com',
    fax: '(512) 555-0101',
  },
  tax: {
    taxId: '12-3456789',
    taxLabel: 'EIN',
  },
  branding: {
    primaryColor: '#ea580c', // Deep orange
    secondaryColor: '#0A0A0A', // Dark background
    accentColor: '#f97316', // Orange accent
  },
  banking: {
    bankName: 'Texas Commerce Bank',
    accountName: 'ProBuild Enterprise Solutions LLC',
    accountNumber: '****6789',
    routingNumber: '111000025',
  },
  legal: {
    licenseNumber: 'TX-CONTR-123456',
    insuranceNumber: 'INS-987654321',
    terms: `Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly finance charge. All work is guaranteed for 90 days. Disputes must be raised within 10 days of invoice receipt.`,
  },
};

// Current company info - exported for components
export let companyInfo: CompanyInfo = { ...defaultCompanyInfo };

/**
 * Pick the "main app" company (the construction business — Black Phoenix Builds)
 * out of a list of `simpleCompanyStore` companies. Invoices, quotes, and other
 * documents in the main app always use this company, regardless of any manual
 * switcher. Resolution order:
 *   1. a company whose name/dba mentions "build" (the construction business),
 *   2. otherwise the company flagged `is_primary`,
 *   3. otherwise the first company.
 * The ecommerce store uses its own branding, so it is intentionally NOT chosen.
 */
export function pickMainAppCompany(companies: any[]): any | null {
  if (!Array.isArray(companies) || companies.length === 0) return null;
  // Handle both store shapes: simpleCompanyStore (name/dba) and
  // CompanyDatabaseService / branding profile (company_name/company_legal_name).
  const nameOf = (c: any) =>
    `${c?.name || ''} ${c?.dba || ''} ${c?.company_name || ''} ${c?.company_legal_name || ''}`.toLowerCase();
  const byBuild = companies.find((c) => /build/.test(nameOf(c)));
  if (byBuild) return byBuild;
  const primary = companies.find((c) => c?.is_primary);
  if (primary) return primary;
  return companies[0];
}

/**
 * Sync the global company info from a `simpleCompanyStore` Company record (the
 * shape used by the owner's-dashboard Companies tab). That store uses different
 * field names than the branding profile (e.g. a single `address` string,
 * `business_license`, a `bank_accounts` array), so it needs its own mapping.
 */
/**
 * Sync the global company info from a branding-profile-shaped record (the shape
 * used by BrandingService and CompanyDatabaseService: `company_name`,
 * `address_line1`, `tax_id`, `bank_name`, etc.). Invoices and quotes read the
 * global `companyInfo`, so this is what makes them show the right business.
 */
export function setActiveCompanyInfo(company: any | null): CompanyInfo {
  if (company && company.company_name) {
    companyInfo = convertProfileToCompanyInfo(company as BrandingProfile);
  } else {
    companyInfo = { ...defaultCompanyInfo };
  }
  return companyInfo;
}

export function setActiveCompanyInfoFromStore(company: any | null): CompanyInfo {
  if (!company || !company.name) {
    companyInfo = { ...defaultCompanyInfo };
    return companyInfo;
  }
  const bank = Array.isArray(company.bank_accounts) ? company.bank_accounts[0] : undefined;
  companyInfo = {
    name: company.dba || company.name,
    legalName: company.name,
    tagline: company.description || defaultCompanyInfo.tagline,
    logo: company.logo_url,
    address: {
      line1: company.address || '',
      line2: undefined,
      city: company.city || '',
      state: company.state || '',
      zipCode: company.zip_code || '',
      country: company.country || 'United States',
    },
    contact: {
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      fax: undefined,
    },
    tax: {
      taxId: company.tax_id || '',
      taxLabel: 'EIN',
    },
    branding: {
      primaryColor: defaultCompanyInfo.branding.primaryColor,
      secondaryColor: defaultCompanyInfo.branding.secondaryColor,
      accentColor: defaultCompanyInfo.branding.accentColor,
      logoUrl: company.logo_url,
    },
    banking: bank ? {
      bankName: bank.bank_name || bank.bankName || '',
      accountName: bank.account_name || bank.accountName || company.name,
      accountNumber: bank.account_number || bank.accountNumber || '',
      routingNumber: bank.routing_number || bank.routingNumber || '',
    } : undefined,
    legal: {
      licenseNumber: company.business_license,
      insuranceNumber: undefined,
      terms: company.profile?.payment_terms || defaultCompanyInfo.legal.terms,
    },
  };
  return companyInfo;
}

/**
 * Load company info from database
 */
export async function loadCompanyInfo(): Promise<CompanyInfo> {
  const { data } = await BrandingService.getBrandingProfile();
  
  if (data) {
    companyInfo = convertProfileToCompanyInfo(data);
  } else {
    companyInfo = { ...defaultCompanyInfo };
  }
  
  return companyInfo;
}

/**
 * Convert BrandingProfile to CompanyInfo format
 */
export function convertProfileToCompanyInfo(profile: BrandingProfile): CompanyInfo {
  return {
    name: profile.company_name,
    legalName: profile.company_legal_name,
    tagline: profile.company_tagline,
    logo: profile.logo_url,
    address: {
      line1: profile.address_line1,
      line2: profile.address_line2,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zip_code,
      country: profile.country,
    },
    contact: {
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      fax: profile.fax,
    },
    tax: {
      taxId: profile.tax_id,
      taxLabel: profile.tax_label,
    },
    branding: {
      primaryColor: profile.primary_color,
      secondaryColor: profile.secondary_color,
      accentColor: profile.accent_color,
      logoUrl: profile.logo_url,
    },
    banking: profile.bank_name ? {
      bankName: profile.bank_name,
      accountName: profile.bank_account_name || '',
      accountNumber: profile.bank_account_number || '',
      routingNumber: profile.bank_routing_number || '',
    } : undefined,
    legal: {
      licenseNumber: profile.license_number,
      insuranceNumber: profile.insurance_number,
      terms: profile.payment_terms,
    },
  };
}

/**
 * Convert CompanyInfo to BrandingProfile format
 */
export function convertCompanyInfoToProfile(info: CompanyInfo): BrandingProfile {
  return {
    company_name: info.name,
    company_legal_name: info.legalName,
    company_tagline: info.tagline,
    address_line1: info.address.line1,
    address_line2: info.address.line2,
    city: info.address.city,
    state: info.address.state,
    zip_code: info.address.zipCode,
    country: info.address.country,
    phone: info.contact.phone,
    fax: info.contact.fax,
    email: info.contact.email,
    website: info.contact.website,
    tax_id: info.tax.taxId,
    tax_label: info.tax.taxLabel,
    primary_color: info.branding.primaryColor,
    secondary_color: info.branding.secondaryColor,
    accent_color: info.branding.accentColor,
    logo_url: info.branding.logoUrl,
    bank_name: info.banking?.bankName,
    bank_account_name: info.banking?.accountName,
    bank_account_number: info.banking?.accountNumber,
    bank_routing_number: info.banking?.routingNumber,
    license_number: info.legal.licenseNumber,
    insurance_number: info.legal.insuranceNumber,
    payment_terms: info.legal.terms,
  };
}

// Helper function to format full address
export const getFullAddress = (): string => {
  const { address } = companyInfo;
  return `${address.line1}${address.line2 ? `, ${address.line2}` : ''}, ${address.city}, ${address.state} ${address.zipCode}`;
};

// Helper function to format contact info
export const getContactInfo = (): string => {
  const { contact } = companyInfo;
  return `${contact.phone} • ${contact.email}`;
};

export default companyInfo;

