import { projectId, publicAnonKey } from '../../utils/supabase/info';

export interface DomainConfig {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  isPrimary: boolean;
  sslEnabled: boolean;
  verificationToken?: string;
  verificationMethod: 'dns' | 'html';
  dnsRecords?: {
    type: string;
    name: string;
    value: string;
    priority?: number;
  }[];
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  lastChecked?: string;
}

export class DomainService {
  /**
   * Get all configured domains
   */
  static async getDomains(): Promise<{ data: DomainConfig[]; error: string | null }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to fetch domains';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const text = await response.text();
      
      // Try to parse the JSON response
      let domains;
      try {
        domains = text ? JSON.parse(text) : [];
      } catch (parseError) {
        console.error('Failed to parse domains response:', text);
        throw new Error(`Invalid response format: ${parseError.message}`);
      }

      // Ensure we have an array
      const domainsArray = Array.isArray(domains) ? domains : [];
      return { data: domainsArray, error: null };
    } catch (error: any) {
      // Silently return empty array - service may not be deployed
      return { data: [], error: null };
    }
  }

  /**
   * Get primary domain
   */
  static async getPrimaryDomain(): Promise<{ data: DomainConfig | null; error: string | null }> {
    try {
      const { data, error } = await this.getDomains();
      if (error) throw new Error(error);
      
      const primary = data.find(d => d.isPrimary && d.status === 'verified');
      return { data: primary || null, error: null };
    } catch (error: any) {
      console.error('Error fetching primary domain:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Add a new domain
   */
  static async addDomain(
    domain: string,
    verificationMethod: 'dns' | 'html' = 'dns'
  ): Promise<{ data: DomainConfig | null; error: string | null }> {
    try {
      // Clean and validate domain
      const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      if (!this.isValidDomain(cleanDomain)) {
        throw new Error('Invalid domain format');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            domain: cleanDomain,
            verificationMethod,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add domain');
      }

      const newDomain = await response.json();
      return { data: newDomain, error: null };
    } catch (error: any) {
      console.error('Error adding domain:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Verify a domain
   */
  static async verifyDomain(domainId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains/${domainId}/verify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify domain');
      }

      const result = await response.json();
      return { success: result.verified, error: result.error || null };
    } catch (error: any) {
      console.error('Error verifying domain:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set primary domain
   */
  static async setPrimaryDomain(domainId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains/${domainId}/set-primary`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set primary domain');
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error setting primary domain:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a domain
   */
  static async deleteDomain(domainId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains/${domainId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete domain');
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error deleting domain:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate domain format
   */
  private static isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  }

  /**
   * Generate DNS records for domain
   */
  static generateDNSRecords(domain: string, projectId: string): any[] {
    return [
      {
        type: 'CNAME',
        name: '@',
        value: `${projectId}.supabase.co`,
        ttl: 3600,
        description: 'Points your domain to Supabase'
      },
      {
        type: 'CNAME',
        name: 'www',
        value: `${projectId}.supabase.co`,
        ttl: 3600,
        description: 'Points www subdomain to Supabase'
      }
    ];
  }

  /**
   * Check domain DNS configuration
   */
  static async checkDNS(domain: string): Promise<{ configured: boolean; records: any[] }> {
    try {
      // In a real implementation, this would check actual DNS records
      // For now, we'll simulate it
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains/check-dns?domain=${encodeURIComponent(domain)}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check DNS');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking DNS:', error);
      return { configured: false, records: [] };
    }
  }

  /**
   * Export all domains
   */
  static async exportDomains(): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains/export`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export domains');
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error exporting domains:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Bulk import domains
   */
  static async bulkImportDomains(domains: any[]): Promise<{ 
    success: boolean; 
    results?: any;
    error: string | null;
  }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains/bulk-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ domains }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to bulk import domains');
      }

      const result = await response.json();
      return { success: true, results: result, error: null };
    } catch (error: any) {
      console.error('Error bulk importing domains:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk verify domains
   */
  static async bulkVerifyDomains(domainIds: string[]): Promise<{ 
    success: boolean; 
    results?: any;
    error: string | null;
  }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains/bulk-verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ domainIds }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to bulk verify domains');
      }

      const result = await response.json();
      return { success: true, results: result, error: null };
    } catch (error: any) {
      console.error('Error bulk verifying domains:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk delete domains
   */
  static async bulkDeleteDomains(domainIds: string[]): Promise<{ 
    success: boolean; 
    results?: any;
    error: string | null;
  }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/domains/bulk-delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ domainIds }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to bulk delete domains');
      }

      const result = await response.json();
      return { success: true, results: result, error: null };
    } catch (error: any) {
      console.error('Error bulk deleting domains:', error);
      return { success: false, error: error.message };
    }
  }
}