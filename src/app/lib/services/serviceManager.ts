/**
 * Service Manager - Enterprise Service CRUD Operations
 * Handles all service management with API integration
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../supabase';

export interface ServiceData {
  id?: string;
  company_id: string;
  
  // Basic Information
  name: string;
  description: string;
  category: string;
  subcategory: string;
  
  // Pricing
  pricing_type: 'fixed' | 'hourly' | 'per_sqft' | 'custom';
  base_price: number;
  min_price?: number;
  max_price?: number;
  cost: number;
  
  // Time Estimates
  duration_min: number;
  duration_max: number;
  duration_unit: 'hours' | 'days' | 'weeks';
  
  // Service Details
  service_code: string;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  
  // Requirements
  required_skills: string[];
  required_certifications: string[];
  required_equipment: string[];
  team_size_min: number;
  team_size_max: number;
  
  // Variants & Add-ons
  has_variants: boolean;
  variants: any[];
  addons: any[];
  
  // Business Rules
  requires_site_visit: boolean;
  requires_permit: boolean;
  requires_inspection: boolean;
  min_notice_days: number;
  
  // Terms & Conditions
  terms_conditions: string;
  warranty_period: number;
  warranty_description: string;
  
  // Metadata
  tags: string[];
  internal_notes: string;
  
  // Images
  image_url?: string;
  gallery_urls: string[];
  
  // Integration
  quickbooks_item_id?: string;
  stripe_product_id?: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export class ServiceManager {
  /**
   * Create a new service
   */
  static async createService(serviceData: ServiceData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Prepare service data
      const service = {
        ...serviceData,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insert via API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/services`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(service)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error creating service:', error);
        return { success: false, error: error.error || 'Failed to create service' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      console.error('Service creation error:', error);
      return { success: false, error: error.message || 'Failed to create service' };
    }
  }
  
  /**
   * Update an existing service
   */
  static async updateService(serviceId: string, serviceData: Partial<ServiceData>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Prepare update data
      const updates = {
        ...serviceData,
        updated_at: new Date().toISOString()
      };
      
      // Update via API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/services/${serviceId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error updating service:', error);
        return { success: false, error: error.error || 'Failed to update service' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      console.error('Service update error:', error);
      return { success: false, error: error.message || 'Failed to update service' };
    }
  }
  
  /**
   * Delete a service (soft delete by setting status to inactive)
   */
  static async deleteService(serviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Soft delete by updating status
      return await this.updateService(serviceId, { 
        status: 'inactive', 
        updated_at: new Date().toISOString() 
      });
    } catch (error: any) {
      console.error('Service deletion error:', error);
      return { success: false, error: error.message || 'Failed to delete service' };
    }
  }
  
  /**
   * Get all services for a company
   */
  static async getServices(companyId: string, includeInactive: boolean = false): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/services`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching services:', error);
        return { success: false, error: error.error || 'Failed to fetch services' };
      }

      let data = await response.json();
      
      // Filter by company_id
      data = data.filter((service: any) => service.company_id === companyId);
      
      // Filter by status if needed
      if (!includeInactive) {
        data = data.filter((service: any) => 
          service.status === 'active' || service.status === 'draft'
        );
      }
      
      // Sort by created_at
      data.sort((a: any, b: any) => 
        new Date(b.created_at || b.createdAt).getTime() - 
        new Date(a.created_at || a.createdAt).getTime()
      );
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Service fetch error:', error);
      return { success: false, error: error.message || 'Failed to fetch services' };
    }
  }
  
  /**
   * Get a single service by ID
   */
  static async getService(serviceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/services/${serviceId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching service:', error);
        return { success: false, error: error.error || 'Failed to fetch service' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      console.error('Service fetch error:', error);
      return { success: false, error: error.message || 'Failed to fetch service' };
    }
  }
  
  /**
   * Get services by category
   */
  static async getServicesByCategory(companyId: string, category: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const result = await this.getServices(companyId, false);
      if (!result.success) {
        return result;
      }
      
      const filteredData = result.data?.filter((service: any) => service.category === category) || [];
      filteredData.sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      return { success: true, data: filteredData };
    } catch (error: any) {
      console.error('Service fetch error:', error);
      return { success: false, error: error.message || 'Failed to fetch services' };
    }
  }
  
  /**
   * Search services
   */
  static async searchServices(companyId: string, searchTerm: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const result = await this.getServices(companyId, false);
      if (!result.success) {
        return result;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const filteredData = result.data?.filter((service: any) => 
        service.name?.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower) ||
        service.service_code?.toLowerCase().includes(searchLower)
      ) || [];
      
      filteredData.sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      return { success: true, data: filteredData };
    } catch (error: any) {
      console.error('Service search error:', error);
      return { success: false, error: error.message || 'Failed to search services' };
    }
  }
  
  /**
   * Duplicate a service
   */
  static async duplicateService(serviceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get the original service
      const { success, data: originalService, error: fetchError } = await this.getService(serviceId);
      
      if (!success || !originalService) {
        return { success: false, error: fetchError || 'Service not found' };
      }
      
      // Create a copy with modified name and code
      const duplicate = {
        ...originalService,
        id: undefined, // Remove ID to create new record
        name: `${originalService.name} (Copy)`,
        service_code: `${originalService.service_code}-COPY`,
        status: 'draft' as const,
        created_at: undefined,
        updated_at: undefined
      };
      
      // Create the duplicate
      return await this.createService(duplicate);
    } catch (error: any) {
      console.error('Service duplication error:', error);
      return { success: false, error: error.message || 'Failed to duplicate service' };
    }
  }
  
  /**
   * Get service statistics
   */
  static async getServiceStats(companyId: string): Promise<any> {
    try {
      const result = await this.getServices(companyId, true); // Include all statuses
      if (!result.success || !result.data) {
        return {
          total: 0,
          active: 0,
          inactive: 0,
          draft: 0,
          byCategory: {},
          averagePrice: 0,
          totalRevenue: 0
        };
      }
      
      const services = result.data;
      const stats = {
        total: services.length,
        active: services.filter((s: any) => s.status === 'active').length,
        inactive: services.filter((s: any) => s.status === 'inactive').length,
        draft: services.filter((s: any) => s.status === 'draft').length,
        byCategory: {} as any,
        averagePrice: 0,
        totalRevenue: 0
      };
      
      // Calculate category distribution
      services.forEach((service: any) => {
        const cat = service.category || 'Other';
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
      });
      
      // Calculate average price (only for active services)
      const activeServices = services.filter((s: any) => s.status === 'active');
      if (activeServices.length > 0) {
        const totalPrice = activeServices.reduce((sum: number, s: any) => sum + (s.base_price || 0), 0);
        stats.averagePrice = totalPrice / activeServices.length;
      }
      
      return stats;
    } catch (error: any) {
      console.error('Service stats error:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        draft: 0,
        byCategory: {},
        averagePrice: 0,
        totalRevenue: 0
      };
    }
  }
}

export default ServiceManager;
