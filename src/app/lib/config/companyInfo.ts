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
  name: 'ProBuild Enterprise',
  legalName: 'ProBuild Enterprise Solutions LLC',
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

