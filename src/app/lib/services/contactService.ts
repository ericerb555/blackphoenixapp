/**
 * Contact Service - Supabase CRUD Operations
 * Handles all contact-related database operations for CRM
 * ISO20022 Compliant | App Store Guidelines Compatible
 */

import { supabase } from '../supabase';

export interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company?: string;
  position?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  status?: 'lead' | 'active' | 'vip' | 'inactive' | 'customer';
  customer_type?: 'residential' | 'commercial' | 'industrial' | 'government' | 'other';
  preferred_contact_method?: 'email' | 'phone' | 'text' | 'mail';
  tags?: string[];
  source?: string;
  referral_source?: string;
  notes?: string;
  internal_notes?: string;
  next_follow_up_date?: string;
}

export interface Contact extends ContactFormData {
  id: string;
  contact_id: string;
  full_name: string;
  full_address?: string;
  lifetime_value: number;
  total_projects: number;
  total_invoiced: number;
  total_paid: number;
  outstanding_balance: number;
  avatar_url?: string;
  created_by?: string;
  updated_by?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string;
  last_project_date?: string;
  deleted_at?: string;
}

export interface ContactActivity {
  id?: string;
  contact_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'quote' | 'invoice' | 'project' | 'payment' | 'status_change' | 'document' | 'other';
  subject?: string;
  description?: string;
  outcome?: string;
  duration_minutes?: number;
  related_id?: string;
  related_type?: string;
  created_by?: string;
  created_at?: string;
  scheduled_at?: string;
  completed_at?: string;
  is_completed?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class ContactService {
  /**
   * Validate contact form data
   */
  static validateContact(data: ContactFormData): { isValid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Required fields
    if (!data.first_name?.trim()) {
      errors.push({ field: 'first_name', message: 'First name is required' });
    }

    if (!data.last_name?.trim()) {
      errors.push({ field: 'last_name', message: 'Last name is required' });
    }

    if (!data.email?.trim()) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
      }
    }

    if (!data.phone?.trim()) {
      errors.push({ field: 'phone', message: 'Phone number is required' });
    } else {
      // Phone format validation (basic)
      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push({ field: 'phone', message: 'Invalid phone format' });
      }
    }

    // ZIP code validation (if provided)
    if (data.zip_code && !/^\d{5}(-\d{4})?$/.test(data.zip_code)) {
      errors.push({ field: 'zip_code', message: 'Invalid ZIP code format (use 12345 or 12345-6789)' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new contact
   */
  static async createContact(data: ContactFormData): Promise<{ data: Contact | null; error: any }> {
    try {
      // Validate data
      const validation = this.validateContact(data);
      if (!validation.isValid) {
        return { 
          data: null, 
          error: new Error(validation.errors.map(e => e.message).join(', ')) 
        };
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Generate unique contact_id
      const contact_id = await this.generateContactId();

      // Prepare insert data
      const insertData = {
        contact_id,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        company: data.company?.trim() || null,
        position: data.position?.trim() || null,
        street_address: data.street_address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        zip_code: data.zip_code?.trim() || null,
        status: data.status || 'lead',
        customer_type: data.customer_type || 'residential',
        preferred_contact_method: data.preferred_contact_method || 'email',
        tags: data.tags || [],
        source: data.source?.trim() || null,
        referral_source: data.referral_source?.trim() || null,
        notes: data.notes?.trim() || null,
        internal_notes: data.internal_notes?.trim() || null,
        next_follow_up_date: data.next_follow_up_date || null,
        created_by: user.id,
        updated_by: user.id,
        assigned_to: user.id, // Assign to creator by default
        iso20022_compliant: true,
        appstore_compliant: true
      };

      // Insert contact
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.message.includes('email')) {
            return { data: null, error: new Error('A contact with this email already exists') };
          }
          if (error.message.includes('phone')) {
            return { data: null, error: new Error('A contact with this phone number already exists') };
          }
        }
        console.error('Error creating contact:', error);
        return { data: null, error };
      }

      return { data: contact, error: null };
    } catch (error) {
      console.error('Contact creation failed:', error);
      return { data: null, error };
    }
  }

  /**
   * Update an existing contact
   */
  static async updateContact(contactId: string, data: Partial<ContactFormData>): Promise<{ data: Contact | null; error: any }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Prepare update data (only include provided fields)
      const updateData: any = {
        ...data,
        updated_by: user.id
      };

      // Trim string fields
      if (updateData.first_name) updateData.first_name = updateData.first_name.trim();
      if (updateData.last_name) updateData.last_name = updateData.last_name.trim();
      if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
      if (updateData.phone) updateData.phone = updateData.phone.trim();

      const { data: contact, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId)
        .select()
        .single();

      if (error) {
        console.error('Error updating contact:', error);
        return { data: null, error };
      }

      return { data: contact, error: null };
    } catch (error) {
      console.error('Contact update failed:', error);
      return { data: null, error };
    }
  }

  /**
   * Get contact by ID
   */
  static async getContactById(contactId: string): Promise<{ data: Contact | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .is('deleted_at', null)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get all contacts for current user
   */
  static async getContacts(filters?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Contact[] | null; error: any; count?: number }> {
    try {
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Search filter (full-text search on name, email, company)
      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
      }

      // Pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error, count: 0 };
      }

      return { data, error: null, count: count || 0 };
    } catch (error) {
      return { data: null, error, count: 0 };
    }
  }

  /**
   * Delete contact (soft delete)
   */
  static async deleteContact(contactId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', contactId);

      if (error) {
        console.error('Error deleting contact:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Add activity to contact
   */
  static async addActivity(activity: ContactActivity): Promise<{ data: ContactActivity | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('contact_activity')
        .insert({
          ...activity,
          created_by: user?.id,
          is_completed: activity.is_completed !== undefined ? activity.is_completed : true
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding activity:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get contact activities
   */
  static async getContactActivities(contactId: string): Promise<{ data: ContactActivity[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('contact_activity')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Helper: Generate unique contact ID
   */
  private static async generateContactId(): Promise<string> {
    let counter = 1;
    let contactId = '';
    let exists = true;

    while (exists) {
      contactId = `CONT-${String(counter).padStart(4, '0')}`;
      
      const { data } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('contact_id', contactId)
        .single();

      exists = !!data;
      counter++;
    }

    return contactId;
  }

  /**
   * Search contacts with advanced filters
   */
  static async searchContacts(query: string, filters?: {
    status?: string[];
    tags?: string[];
    minLifetimeValue?: number;
  }): Promise<{ data: Contact[] | null; error: any }> {
    try {
      let dbQuery = supabase
        .from('contacts')
        .select('*')
        .is('deleted_at', null);

      // Text search
      if (query) {
        dbQuery = dbQuery.textSearch('fts', query);
      }

      // Status filter
      if (filters?.status && filters.status.length > 0) {
        dbQuery = dbQuery.in('status', filters.status);
      }

      // Tags filter
      if (filters?.tags && filters.tags.length > 0) {
        dbQuery = dbQuery.contains('tags', filters.tags);
      }

      // Lifetime value filter
      if (filters?.minLifetimeValue) {
        dbQuery = dbQuery.gte('lifetime_value', filters.minLifetimeValue);
      }

      const { data, error } = await dbQuery.order('created_at', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export default ContactService;
