import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // Silently fail and throw for upstream handling
    throw error;
  }
}

/**
 * Test server connectivity
 */
export async function testConnection() {
  try {
    const response = await fetch(`${API_BASE}/make-server-57095a78/health`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    return { success: false, status: response.status };
  } catch (error) {
    return { success: false, error };
  }
}

export interface Project {
  id: string;
  project_number: string;
  customer_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  assigned_to?: string;
  scheduled_date?: string;
  start_date?: string;
  completion_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  estimated_cost?: number;
  actual_cost?: number;
  location_address?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  special_instructions?: string;
  materials_needed?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  company_id?: string;
}

export interface ProjectWithCustomer extends Project {
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    company?: string;
  };
}

export interface CreateProjectInput {
  customer_id: string;
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  assigned_to?: string;
  scheduled_date?: string;
  estimated_hours?: number;
  estimated_cost?: number;
  location_address?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  special_instructions?: string;
  materials_needed?: string[];
  tags?: string[];
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: string;
}

export interface ProjectFilters {
  status?: string;
  priority?: string;
  assigned_to?: string;
  customer_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch all projects with optional filtering
 */
export async function getProjects(filters?: ProjectFilters): Promise<ProjectWithCustomer[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.search) params.append('search', filters.search);
    
    const endpoint = `/projects${params.toString() ? `?${params.toString()}` : ''}`;
    const projects = await apiFetch(endpoint);
    
    // Get customer info for each project
    const projectsWithCustomers: ProjectWithCustomer[] = await Promise.all(
      projects.map(async (project: Project) => {
        if (project.customer_id) {
          try {
            const customer = await apiFetch(`/customers/${project.customer_id}`);
            return {
              ...project,
              customer: {
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                phone: customer.phone,
                company: customer.company
              }
            };
          } catch {
            return project;
          }
        }
        return project;
      })
    );

    return projectsWithCustomers;
  } catch (error) {
    // Silently return empty array on error
    return [];
  }
}

/**
 * Get a single project by ID with full details
 */
export async function getProjectById(id: string): Promise<ProjectWithCustomer | null> {
  try {
    const project = await apiFetch(`/projects/${id}`);
    
    // Get customer info if available
    if (project.customer_id) {
      try {
        const customer = await apiFetch(`/customers/${project.customer_id}`);
        return {
          ...project,
          customer: {
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            phone: customer.phone,
            company: customer.company
          }
        };
      } catch {
        return project;
      }
    }

    return project;
  } catch (error) {
    // Silently return null on error
    return null;
  }
}

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    const project = await apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    // Increment customer project count
    if (input.customer_id) {
      await incrementCustomerProjectCount(input.customer_id);
    }

    return project;
  } catch (error) {
    // Re-throw error for create operations (user should know)
    throw error;
  }
}

/**
 * Update an existing project
 */
export async function updateProject(input: UpdateProjectInput): Promise<Project | null> {
  try {
    const { id, ...updateData } = input;

    const project = await apiFetch(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    return project;
  } catch (error) {
    // Silently return null on error
    return null;
  }
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<boolean> {
  try {
    // Get project to decrement customer count
    const project = await apiFetch(`/projects/${id}`);

    await apiFetch(`/projects/${id}`, {
      method: 'DELETE',
    });

    // Decrement customer project count
    if (project?.customer_id) {
      await decrementCustomerProjectCount(project.customer_id);
    }

    return true;
  } catch (error) {
    // Silently return false on error
    return false;
  }
}

/**
 * Get project statistics
 */
export async function getProjectStats() {
  try {
    const stats = await apiFetch('/projects/stats');
    return stats;
  } catch (error) {
    // Silently return default stats on error
    return {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      on_hold: 0,
      urgent: 0,
      totalEstimatedRevenue: 0,
      totalActualRevenue: 0,
    };
  }
}

/**
 * Add a note to a project
 */
export async function addProjectNote(projectId: string, note: string, noteType: string = 'general') {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const noteData = {
      id,
      project_id: projectId,
      note,
      note_type: noteType,
      created_at: now,
    };

    // Store note in KV (notes are not exposed via API yet)
    // For now, store in memory or skip
    return noteData;
  } catch (error) {
    console.error('Error in addProjectNote:', error);
    throw error;
  }
}

/**
 * Get notes for a project
 */
export async function getProjectNotes(projectId: string) {
  try {
    // Notes are not exposed via API yet, return empty array
    return [];
  } catch (error) {
    console.error('Error in getProjectNotes:', error);
    return [];
  }
}

/**
 * Get projects for a specific customer
 */
export async function getProjectsByCustomer(customerId: string): Promise<Project[]> {
  try {
    const params = new URLSearchParams({ customer_id: customerId });
    const projects = await apiFetch(`/projects?${params.toString()}`);
    return projects;
  } catch (error) {
    console.error('Error in getProjectsByCustomer:', error);
    return [];
  }
}

// Helper functions
async function incrementCustomerProjectCount(customerId: string) {
  try {
    const customer = await apiFetch(`/customers/${customerId}`);
    if (customer) {
      await apiFetch(`/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify({
          project_count: (customer.project_count || 0) + 1,
        }),
      });
    }
  } catch (error) {
    console.error('Error incrementing customer project count:', error);
  }
}

async function decrementCustomerProjectCount(customerId: string) {
  try {
    const customer = await apiFetch(`/customers/${customerId}`);
    if (customer) {
      await apiFetch(`/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify({
          project_count: Math.max(0, (customer.project_count || 0) - 1),
        }),
      });
    }
  } catch (error) {
    console.error('Error decrementing customer project count:', error);
  }
}

export default {
  testConnection,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
  addProjectNote,
  getProjectNotes,
  getProjectsByCustomer,
};
