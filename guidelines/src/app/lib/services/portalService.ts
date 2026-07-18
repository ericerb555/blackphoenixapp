import { supabase } from '../supabase';

export type PortalType = 'customer' | 'employee' | 'subcontractor' | 'vendor' | 'custom';
export type PortalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published';

export interface Portal {
  id: string;
  name: string;
  description: string;
  type: PortalType;
  status: PortalStatus;
  icon: string;
  primary_color: string;
  secondary_color: string;
  
  // Content from AI Creator
  ai_generated_content?: {
    tagline?: string;
    welcome_message?: string;
    about_section?: string;
    social_media_posts?: any[];
    marketing_copy?: string;
  };
  
  // Design from Design Center
  layout_design?: {
    floor_plan?: any;
    cad_drawings?: any[];
    mockups?: any[];
    wireframes?: any[];
  };
  
  // Features & Modules
  enabled_features: string[];
  custom_modules: any[];
  
  // Access & Permissions
  access_roles: string[];
  visibility: 'public' | 'private' | 'restricted';
  
  // Workflow
  created_by?: string;
  created_at: string;
  updated_at: string;
  submitted_for_approval?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  
  // Sharing
  shared_with_customers?: string[];
  linked_to_jobs?: string[];
  
  company_id?: string;
}

export interface CreatePortalInput {
  name: string;
  description: string;
  type: PortalType;
  icon?: string;
  primary_color?: string;
  secondary_color?: string;
  ai_generated_content?: any;
  layout_design?: any;
  enabled_features?: string[];
  custom_modules?: any[];
  access_roles?: string[];
  visibility?: 'public' | 'private' | 'restricted';
}

export interface UpdatePortalInput extends Partial<CreatePortalInput> {
  id: string;
}

/**
 * Fetch all portals with optional filtering
 */
export async function getPortals(filters?: {
  type?: PortalType;
  status?: PortalStatus;
  search?: string;
}) {
  try {
    let query = supabase
      .from('portals')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching portals:', error);
      throw error;
    }

    return data as Portal[];
  } catch (error) {
    console.error('Error in getPortals:', error);
    throw error;
  }
}

/**
 * Get a single portal by ID
 */
export async function getPortalById(id: string) {
  try {
    const { data, error } = await supabase
      .from('portals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching portal:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in getPortalById:', error);
    throw error;
  }
}

/**
 * Create a new portal
 */
export async function createPortal(input: CreatePortalInput) {
  try {
    const portalData = {
      name: input.name,
      description: input.description,
      type: input.type,
      status: 'draft' as PortalStatus,
      icon: input.icon || 'Smartphone',
      primary_color: input.primary_color || '#ea580c',
      secondary_color: input.secondary_color || '#f97316',
      ai_generated_content: input.ai_generated_content || null,
      layout_design: input.layout_design || null,
      enabled_features: input.enabled_features || [],
      custom_modules: input.custom_modules || [],
      access_roles: input.access_roles || [],
      visibility: input.visibility || 'private',
    };

    const { data, error } = await supabase
      .from('portals')
      .insert([portalData])
      .select()
      .single();

    if (error) {
      console.error('Error creating portal:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in createPortal:', error);
    throw error;
  }
}

/**
 * Update an existing portal
 */
export async function updatePortal(input: UpdatePortalInput) {
  try {
    const { id, ...updateData } = input;

    const { data, error } = await supabase
      .from('portals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating portal:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in updatePortal:', error);
    throw error;
  }
}

/**
 * Delete a portal
 */
export async function deletePortal(id: string) {
  try {
    const { error } = await supabase
      .from('portals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting portal:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePortal:', error);
    throw error;
  }
}

/**
 * Submit portal for approval
 */
export async function submitForApproval(id: string) {
  try {
    const { data, error } = await supabase
      .from('portals')
      .update({
        status: 'pending_approval',
        submitted_for_approval: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error submitting portal for approval:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in submitForApproval:', error);
    throw error;
  }
}

/**
 * Approve a portal
 */
export async function approvePortal(id: string, approvedBy: string) {
  try {
    const { data, error } = await supabase
      .from('portals')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving portal:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in approvePortal:', error);
    throw error;
  }
}

/**
 * Reject a portal
 */
export async function rejectPortal(id: string, reason: string, rejectedBy: string) {
  try {
    const { data, error } = await supabase
      .from('portals')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: rejectedBy, // Track who rejected it
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting portal:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in rejectPortal:', error);
    throw error;
  }
}

/**
 * Publish a portal
 */
export async function publishPortal(id: string) {
  try {
    const { data, error } = await supabase
      .from('portals')
      .update({
        status: 'published',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error publishing portal:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in publishPortal:', error);
    throw error;
  }
}

/**
 * Share portal with customers
 */
export async function shareWithCustomers(id: string, customerIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('portals')
      .update({
        shared_with_customers: customerIds,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error sharing portal with customers:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in shareWithCustomers:', error);
    throw error;
  }
}

/**
 * Link portal to jobs
 */
export async function linkToJobs(id: string, jobIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('portals')
      .update({
        linked_to_jobs: jobIds,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error linking portal to jobs:', error);
      throw error;
    }

    return data as Portal;
  } catch (error) {
    console.error('Error in linkToJobs:', error);
    throw error;
  }
}

/**
 * Get portal statistics
 */
export async function getPortalStats() {
  try {
    const { data: portals, error } = await supabase
      .from('portals')
      .select('status, type');

    if (error) {
      console.error('Error fetching portal stats:', error);
      throw error;
    }

    const stats = {
      total: portals.length,
      draft: portals.filter(p => p.status === 'draft').length,
      pending: portals.filter(p => p.status === 'pending_approval').length,
      approved: portals.filter(p => p.status === 'approved').length,
      published: portals.filter(p => p.status === 'published').length,
      rejected: portals.filter(p => p.status === 'rejected').length,
      byType: {
        customer: portals.filter(p => p.type === 'customer').length,
        employee: portals.filter(p => p.type === 'employee').length,
        subcontractor: portals.filter(p => p.type === 'subcontractor').length,
        vendor: portals.filter(p => p.type === 'vendor').length,
        custom: portals.filter(p => p.type === 'custom').length,
      },
    };

    return stats;
  } catch (error) {
    console.error('Error in getPortalStats:', error);
    throw error;
  }
}

export default {
  getPortals,
  getPortalById,
  createPortal,
  updatePortal,
  deletePortal,
  submitForApproval,
  approvePortal,
  rejectPortal,
  publishPortal,
  shareWithCustomers,
  linkToJobs,
  getPortalStats,
};
