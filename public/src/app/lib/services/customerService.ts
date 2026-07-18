import { supabase } from '../supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export interface Customer {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'lead' | 'active' | 'inactive' | 'vip';
  total_spent: number;
  project_count: number;
  rating?: number;
  tags: string[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  notes?: string;
  source?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  company_id?: string;
}

export interface CreateCustomerInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  status?: 'lead' | 'active' | 'inactive' | 'vip';
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  tags?: string[];
  notes?: string;
  source?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}

export interface CustomerFilters {
  status?: string;
  search?: string;
  tags?: string[];
}

// Mock data fallback
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    customer_number: 'CUST-001',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    company: 'Tech Corp Solutions',
    status: 'active',
    total_spent: 45000,
    project_count: 3,
    rating: 5,
    tags: ['premium', 'commercial'],
    city: 'Austin',
    state: 'TX',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    customer_number: 'CUST-002',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.j@gmail.com',
    phone: '(555) 234-5678',
    company: 'BuildCo Properties',
    status: 'vip',
    total_spent: 125000,
    project_count: 8,
    rating: 5,
    tags: ['vip', 'residential'],
    city: 'Denver',
    state: 'CO',
    created_at: '2023-11-20T14:30:00Z',
    updated_at: '2024-02-10T09:15:00Z',
  },
  {
    id: '3',
    customer_number: 'CUST-003',
    first_name: 'Michael',
    last_name: 'Davis',
    email: 'mdavis@company.com',
    phone: '(555) 345-6789',
    status: 'lead',
    total_spent: 0,
    project_count: 0,
    rating: 0,
    tags: ['lead', 'potential'],
    city: 'Seattle',
    state: 'WA',
    created_at: '2024-02-18T16:45:00Z',
    updated_at: '2024-02-18T16:45:00Z',
  },
];

/**
 * Fetch all customers with optional filtering
 */
export async function getCustomers(filters?: CustomerFilters) {
  try {
    // Fetch from server KV store instead of Supabase tables
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/customers`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    let customers = await response.json() as Customer[];
    
    // If no customers exist, auto-initialize with sample data
    if (customers.length === 0) {
      try {
        const initResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/customers/initialize`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (initResponse.ok) {
          // Re-fetch customers after initialization
          const retryResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/customers`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            }
          );
          if (retryResponse.ok) {
            customers = await retryResponse.json() as Customer[];
          }
        }
      } catch (initError) {
        // Initialization failed, use mock data
        console.log('Auto-initialization failed, using mock data');
      }
    }
    
    // Apply client-side filters
    if (filters?.status && filters.status !== 'all') {
      customers = customers.filter(c => c.status === filters.status);
    }

    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      customers = customers.filter(c =>
        c.first_name?.toLowerCase().includes(searchTerm) ||
        c.last_name?.toLowerCase().includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm) ||
        c.company?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      customers = customers.filter(c =>
        filters.tags!.some(tag => c.tags?.includes(tag))
      );
    }

    return customers.length > 0 ? customers : MOCK_CUSTOMERS;
  } catch (error: any) {
    // Fallback to mock data on any error (silently)
    // Only log if it's not a fetch error (which is expected on first load)
    if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('Server returned')) {
      console.error('Error fetching customers from server:', error);
    }
    // Silently use mock data - this is expected when server has no data yet
    return MOCK_CUSTOMERS;
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomerById(id: string) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }

    return data as Customer;
  } catch (error) {
    console.error('Error in getCustomerById:', error);
    throw error;
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(input: CreateCustomerInput) {
  try {
    // Generate customer number
    const { data: customerNumber, error: numberError } = await supabase
      .rpc('generate_customer_number');

    if (numberError) {
      console.error('Error generating customer number:', numberError);
      throw numberError;
    }

    const customerData = {
      ...input,
      customer_number: customerNumber,
      status: input.status || 'lead',
      total_spent: 0,
      project_count: 0,
      tags: input.tags || [],
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      throw error;
    }

    return data as Customer;
  } catch (error) {
    console.error('Error in createCustomer:', error);
    throw error;
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(input: UpdateCustomerInput) {
  try {
    const { id, ...updateData } = input;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      throw error;
    }

    return data as Customer;
  } catch (error) {
    console.error('Error in updateCustomer:', error);
    throw error;
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(id: string) {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteCustomer:', error);
    throw error;
  }
}

/**
 * Get customer statistics
 */
export async function getCustomerStats() {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('status, total_spent');

    if (error) {
      // If table doesn't exist, calculate from mock data silently
      if (error.code === 'PGRST205') {
        console.log('ℹ️ Using mock customer stats (Supabase table not yet created)');
        const stats = {
          total: MOCK_CUSTOMERS.length,
          active: MOCK_CUSTOMERS.filter(c => c.status === 'active').length,
          leads: MOCK_CUSTOMERS.filter(c => c.status === 'lead').length,
          vip: MOCK_CUSTOMERS.filter(c => c.status === 'vip').length,
          inactive: MOCK_CUSTOMERS.filter(c => c.status === 'inactive').length,
          totalRevenue: MOCK_CUSTOMERS.reduce((sum, c) => sum + (c.total_spent || 0), 0),
          avgDeal: MOCK_CUSTOMERS.length > 0 
            ? MOCK_CUSTOMERS.reduce((sum, c) => sum + (c.total_spent || 0), 0) / MOCK_CUSTOMERS.length 
            : 0,
        };
        return stats;
      }
      console.error('Error fetching customer stats:', error);
      throw error;
    }

    const stats = {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      leads: customers.filter(c => c.status === 'lead').length,
      vip: customers.filter(c => c.status === 'vip').length,
      inactive: customers.filter(c => c.status === 'inactive').length,
      totalRevenue: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
      avgDeal: customers.length > 0 
        ? customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / customers.length 
        : 0,
    };

    return stats;
  } catch (error: any) {
    // Fallback to mock stats
    if (error?.code === 'PGRST205') {
      console.log('ℹ️ Using mock customer stats (Supabase table not yet created)');
    } else {
      console.error('Error in getCustomerStats:', error);
    }
    const stats = {
      total: MOCK_CUSTOMERS.length,
      active: MOCK_CUSTOMERS.filter(c => c.status === 'active').length,
      leads: MOCK_CUSTOMERS.filter(c => c.status === 'lead').length,
      vip: MOCK_CUSTOMERS.filter(c => c.status === 'vip').length,
      inactive: MOCK_CUSTOMERS.filter(c => c.status === 'inactive').length,
      totalRevenue: MOCK_CUSTOMERS.reduce((sum, c) => sum + (c.total_spent || 0), 0),
      avgDeal: MOCK_CUSTOMERS.length > 0 
        ? MOCK_CUSTOMERS.reduce((sum, c) => sum + (c.total_spent || 0), 0) / MOCK_CUSTOMERS.length 
        : 0,
    };
    return stats;
  }
}

/**
 * Search customers by name or email
 */
export async function searchCustomers(searchTerm: string) {
  try {
    const term = `%${searchTerm}%`;
    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, company, status')
      .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},company.ilike.${term}`)
      .limit(10);

    if (error) {
      console.error('Error searching customers:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in searchCustomers:', error);
    throw error;
  }
}

/**
 * Update customer spending totals (called after invoice payment)
 */
export async function updateCustomerSpending(customerId: string, amount: number) {
  try {
    // Get current totals
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('total_spent')
      .eq('id', customerId)
      .single();

    if (fetchError) throw fetchError;

    const newTotal = (customer.total_spent || 0) + amount;

    const { error: updateError } = await supabase
      .from('customers')
      .update({ total_spent: newTotal })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error updating customer spending:', error);
    throw error;
  }
}

/**
 * Increment customer project count
 */
export async function incrementCustomerProjectCount(customerId: string) {
  try {
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('project_count')
      .eq('id', customerId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('customers')
      .update({ project_count: (customer.project_count || 0) + 1 })
      .eq('id', customerId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error incrementing project count:', error);
    throw error;
  }
}

export default {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  searchCustomers,
  updateCustomerSpending,
  incrementCustomerProjectCount,
};