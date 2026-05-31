/**
 * Design Project Manager - Professional CAD/Design Project Management
 * Handles all design project operations with owner permissions and view-only access
 */

import { supabase } from '../supabase';

export interface DesignProjectData {
  id?: string;
  company_id: string;
  owner_id: string; // User who created the project
  
  // Project Information
  project_name: string;
  project_type: 'floor-plan' | 'kitchen' | 'bathroom' | 'electrical' | 'plumbing' | 'structural' | 'landscape' | 'mixed';
  client_name?: string;
  client_id?: string; // Link to customer
  address?: string;
  square_footage?: number;
  
  // Project Status
  status: 'draft' | 'in-progress' | 'review' | 'approved' | 'completed' | 'archived';
  version: number;
  
  // Design Data (JSON)
  design_data: {
    // Layers
    layers: any[];
    
    // Elements by type
    walls?: any[];
    doors?: any[];
    windows?: any[];
    rooms?: any[];
    furniture?: any[];
    dimensions?: any[];
    text_annotations?: any[];
    
    // Electrical (if applicable)
    electrical_elements?: any[];
    
    // Plumbing (if applicable)
    plumbing_elements?: any[];
    
    // Custom elements
    custom_elements?: any[];
    
    // Canvas settings
    canvas_width?: number;
    canvas_height?: number;
    grid_size?: number;
    unit?: 'ft' | 'in' | 'm' | 'cm';
    scale?: number;
  };
  
  // Professional Settings
  drawing_settings: {
    line_weight: string;
    dimension_style: string;
    text_style: string;
    symbol_library: string;
    layer_standards: string;
  };
  
  // Collaboration & Permissions
  permissions: {
    viewers: string[]; // User IDs who can view
    editors: string[]; // User IDs who can edit
    public_link?: string; // Public view-only link
    allow_comments: boolean;
  };
  
  // Export & Output
  export_formats: string[]; // ['pdf', 'dwg', 'dxf', 'png']
  thumbnail_url?: string;
  pdf_url?: string;
  dwg_url?: string;
  
  // Metadata
  tags: string[];
  notes: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_modified_by?: string;
}

export interface DesignProjectPermission {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  granted_by: string;
  granted_at: string;
}

export class DesignProjectManager {
  /**
   * Create a new design project
   */
  static async createProject(projectData: DesignProjectData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const project = {
        ...projectData,
        owner_id: user.id,
        version: 1,
        status: projectData.status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_modified_by: user.id
      };
      
      const { data, error } = await supabase
        .from('design_projects')
        .insert([project])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating design project:', error);
        return { success: false, error: error.message };
      }
      
      // Create owner permission
      await this.grantPermission(data.id, user.id, 'owner', user.id);
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Design project creation error:', error);
      return { success: false, error: error.message || 'Failed to create project' };
    }
  }
  
  /**
   * Update an existing design project
   */
  static async updateProject(
    projectId: string, 
    updates: Partial<DesignProjectData>,
    incrementVersion: boolean = false
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Check if user has edit permission
      const hasPermission = await this.checkPermission(projectId, user.id, ['owner', 'editor']);
      if (!hasPermission) {
        return { success: false, error: 'You do not have permission to edit this project' };
      }
      
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
        last_modified_by: user.id
      };
      
      if (incrementVersion) {
        // Get current version
        const { data: current } = await supabase
          .from('design_projects')
          .select('version')
          .eq('id', projectId)
          .single();
        
        if (current) {
          updateData.version = (current.version || 1) + 1;
        }
      }
      
      const { data, error } = await supabase
        .from('design_projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating design project:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Design project update error:', error);
      return { success: false, error: error.message || 'Failed to update project' };
    }
  }
  
  /**
   * Save design data (auto-save)
   */
  static async saveDesignData(
    projectId: string,
    designData: any,
    autoIncrement: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.updateProject(
        projectId,
        { design_data: designData },
        autoIncrement
      );
      
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all projects for a company
   */
  static async getProjects(
    companyId: string,
    filters?: {
      status?: string;
      project_type?: string;
      owner_id?: string;
    }
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      let query = supabase
        .from('design_projects')
        .select(`
          *,
          design_project_permissions!inner(user_id, role)
        `)
        .eq('company_id', companyId)
        .eq('design_project_permissions.user_id', user.id);
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.project_type) {
        query = query.eq('project_type', filters.project_type);
      }
      if (filters?.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }
      
      query = query.order('updated_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching design projects:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Design project fetch error:', error);
      return { success: false, error: error.message || 'Failed to fetch projects' };
    }
  }
  
  /**
   * Get a single project with permission check
   */
  static async getProject(projectId: string): Promise<{ success: boolean; data?: any; permission?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('design_projects')
        .select(`
          *,
          design_project_permissions(user_id, role)
        `)
        .eq('id', projectId)
        .single();
      
      if (error) {
        console.error('Error fetching design project:', error);
        return { success: false, error: error.message };
      }
      
      // Get user's permission level
      const userPermission = data.design_project_permissions?.find(
        (p: any) => p.user_id === user.id
      );
      
      if (!userPermission) {
        return { success: false, error: 'You do not have permission to view this project' };
      }
      
      return { 
        success: true, 
        data,
        permission: userPermission.role 
      };
    } catch (error: any) {
      console.error('Design project fetch error:', error);
      return { success: false, error: error.message || 'Failed to fetch project' };
    }
  }
  
  /**
   * Delete a project (owner only)
   */
  static async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Check if user is owner
      const hasPermission = await this.checkPermission(projectId, user.id, ['owner']);
      if (!hasPermission) {
        return { success: false, error: 'Only the project owner can delete this project' };
      }
      
      // Soft delete by archiving
      const { error } = await supabase
        .from('design_projects')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString() 
        })
        .eq('id', projectId);
      
      if (error) {
        console.error('Error deleting design project:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Design project deletion error:', error);
      return { success: false, error: error.message || 'Failed to delete project' };
    }
  }
  
  /**
   * Duplicate a project
   */
  static async duplicateProject(projectId: string, newName?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { success, data: original, error } = await this.getProject(projectId);
      
      if (!success || !original) {
        return { success: false, error: error || 'Project not found' };
      }
      
      const duplicate: any = {
        ...original,
        id: undefined,
        project_name: newName || `${original.project_name} (Copy)`,
        status: 'draft',
        version: 1,
        created_at: undefined,
        updated_at: undefined,
        design_project_permissions: undefined
      };
      
      return await this.createProject(duplicate);
    } catch (error: any) {
      console.error('Design project duplication error:', error);
      return { success: false, error: error.message || 'Failed to duplicate project' };
    }
  }
  
  /**
   * Grant permission to a user
   */
  static async grantPermission(
    projectId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer',
    grantedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('design_project_permissions')
        .upsert({
          project_id: projectId,
          user_id: userId,
          role,
          granted_by: grantedBy,
          granted_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error granting permission:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Permission grant error:', error);
      return { success: false, error: error.message || 'Failed to grant permission' };
    }
  }
  
  /**
   * Revoke permission from a user
   */
  static async revokePermission(
    projectId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Only owner can revoke permissions
      const hasPermission = await this.checkPermission(projectId, user.id, ['owner']);
      if (!hasPermission) {
        return { success: false, error: 'Only the project owner can revoke permissions' };
      }
      
      const { error } = await supabase
        .from('design_project_permissions')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error revoking permission:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Permission revoke error:', error);
      return { success: false, error: error.message || 'Failed to revoke permission' };
    }
  }
  
  /**
   * Check if user has specific permission level(s)
   */
  static async checkPermission(
    projectId: string,
    userId: string,
    allowedRoles: string[]
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('design_project_permissions')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        return false;
      }
      
      return allowedRoles.includes(data.role);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
  
  /**
   * Get project permissions
   */
  static async getProjectPermissions(projectId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Only owner can view all permissions
      const hasPermission = await this.checkPermission(projectId, user.id, ['owner']);
      if (!hasPermission) {
        return { success: false, error: 'Only the project owner can view permissions' };
      }
      
      const { data, error } = await supabase
        .from('design_project_permissions')
        .select(`
          *,
          user:user_id(id, email, full_name)
        `)
        .eq('project_id', projectId);
      
      if (error) {
        console.error('Error fetching permissions:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Permissions fetch error:', error);
      return { success: false, error: error.message || 'Failed to fetch permissions' };
    }
  }
  
  /**
   * Export project to PDF
   */
  static async exportToPDF(projectId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // This would integrate with a PDF generation service
      // For now, return placeholder
      toast.info('PDF export will be implemented with professional rendering service');
      
      return { 
        success: true, 
        url: '/exports/project-' + projectId + '.pdf' 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Export project to DWG (AutoCAD)
   */
  static async exportToDWG(projectId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // This would integrate with a DWG conversion service
      toast.info('DWG export will be implemented with AutoCAD conversion service');
      
      return { 
        success: true, 
        url: '/exports/project-' + projectId + '.dwg' 
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Generate thumbnail for project
   */
  static async generateThumbnail(projectId: string, canvas: HTMLCanvasElement): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });
      
      // Upload to Supabase Storage
      const fileName = `thumbnails/${projectId}-${Date.now()}.png`;
      const { data, error } = await supabase.storage
        .from('design-projects')
        .upload(fileName, blob);
      
      if (error) {
        console.error('Error uploading thumbnail:', error);
        return { success: false, error: error.message };
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('design-projects')
        .getPublicUrl(fileName);
      
      // Update project with thumbnail URL
      await this.updateProject(projectId, { thumbnail_url: publicUrl });
      
      return { success: true, url: publicUrl };
    } catch (error: any) {
      console.error('Thumbnail generation error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DesignProjectManager;
