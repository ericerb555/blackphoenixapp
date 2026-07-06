/**
 * Role Service
 * Handles all role and permission management operations with Supabase backend
 */

import { supabase } from '../supabase';

export interface RoleFormData {
  name: string;
  description: string;
  level: number;
  color: string;
  icon: string;
  inheritsFrom?: string;
  isSystem: boolean;
  permissions: string[];
}

export interface Role extends RoleFormData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  companyId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

class RoleService {
  /**
   * Validate role data before saving
   */
  validateRole(data: RoleFormData): ValidationResult {
    const errors: ValidationError[] = [];

    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Role name is required' });
    } else if (data.name.length < 2) {
      errors.push({ field: 'name', message: 'Role name must be at least 2 characters' });
    } else if (data.name.length > 50) {
      errors.push({ field: 'name', message: 'Role name must not exceed 50 characters' });
    }

    // Description validation
    if (!data.description || data.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Description is required' });
    } else if (data.description.length < 10) {
      errors.push({ field: 'description', message: 'Description must be at least 10 characters' });
    } else if (data.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
    }

    // Level validation
    if (data.level < 0 || data.level > 10) {
      errors.push({ field: 'level', message: 'Level must be between 0 and 10' });
    }

    // Color validation
    if (!data.color) {
      errors.push({ field: 'color', message: 'Color is required' });
    }

    // Icon validation
    if (!data.icon) {
      errors.push({ field: 'icon', message: 'Icon is required' });
    }

    // Permissions validation
    if (!data.permissions || data.permissions.length === 0) {
      errors.push({ field: 'permissions', message: 'At least one permission must be selected' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new role
   */
  async createRole(data: RoleFormData, companyId?: string): Promise<Role> {
    try {
      // Validate first
      const validation = this.validateRole(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const roleData = {
        name: data.name.trim(),
        description: data.description.trim(),
        level: data.level,
        color: data.color,
        icon: data.icon,
        inherits_from: data.inheritsFrom || null,
        is_system: data.isSystem,
        permissions: data.permissions,
        company_id: companyId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: role, error } = await supabase
        .from('roles')
        .insert(roleData)
        .select()
        .single();

      if (error) {
        console.error('Error creating role:', error);
        throw new Error(error.message || 'Failed to create role');
      }

      return this.mapDatabaseRole(role);
    } catch (error) {
      console.error('Error in createRole:', error);
      throw error;
    }
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: string, data: Partial<RoleFormData>): Promise<Role> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined) updateData.description = data.description.trim();
      if (data.level !== undefined) updateData.level = data.level;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.inheritsFrom !== undefined) updateData.inherits_from = data.inheritsFrom || null;
      if (data.isSystem !== undefined) updateData.is_system = data.isSystem;
      if (data.permissions !== undefined) updateData.permissions = data.permissions;

      const { data: role, error } = await supabase
        .from('roles')
        .update(updateData)
        .eq('id', roleId)
        .select()
        .single();

      if (error) {
        console.error('Error updating role:', error);
        throw new Error(error.message || 'Failed to update role');
      }

      return this.mapDatabaseRole(role);
    } catch (error) {
      console.error('Error in updateRole:', error);
      throw error;
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    try {
      // Check if it's a system role
      const { data: role, error: fetchError } = await supabase
        .from('roles')
        .select('is_system')
        .eq('id', roleId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch role');
      }

      if (role?.is_system) {
        throw new Error('Cannot delete system roles');
      }

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) {
        console.error('Error deleting role:', error);
        throw new Error(error.message || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error in deleteRole:', error);
      throw error;
    }
  }

  /**
   * Get all roles for a company
   */
  async getRoles(companyId?: string): Promise<Role[]> {
    try {
      let query = supabase.from('roles').select('*');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data: roles, error } = await query.order('level', { ascending: true });

      if (error) {
        console.error('Error fetching roles:', error);
        throw new Error(error.message || 'Failed to fetch roles');
      }

      return roles?.map(role => this.mapDatabaseRole(role)) || [];
    } catch (error) {
      console.error('Error in getRoles:', error);
      throw error;
    }
  }

  /**
   * Get a single role by ID
   */
  async getRole(roleId: string): Promise<Role> {
    try {
      const { data: role, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (error) {
        console.error('Error fetching role:', error);
        throw new Error(error.message || 'Failed to fetch role');
      }

      return this.mapDatabaseRole(role);
    } catch (error) {
      console.error('Error in getRole:', error);
      throw error;
    }
  }

  /**
   * Get permissions for a role (including inherited permissions)
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    try {
      const role = await this.getRole(roleId);
      let allPermissions = [...role.permissions];

      // If role inherits from another, get those permissions too
      if (role.inheritsFrom) {
        try {
          const parentRole = await this.getRole(role.inheritsFrom);
          allPermissions = [...new Set([...allPermissions, ...parentRole.permissions])];
        } catch (error) {
          console.warn('Could not fetch parent role permissions:', error);
        }
      }

      return allPermissions;
    } catch (error) {
      console.error('Error in getRolePermissions:', error);
      throw error;
    }
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(roleId: string, permission: string): Promise<boolean> {
    try {
      const permissions = await this.getRolePermissions(roleId);
      return permissions.includes(permission) || permissions.includes('*');
    } catch (error) {
      console.error('Error in hasPermission:', error);
      return false;
    }
  }

  /**
   * Map database role to Role interface
   */
  private mapDatabaseRole(dbRole: any): Role {
    return {
      id: dbRole.id,
      name: dbRole.name,
      description: dbRole.description,
      level: dbRole.level,
      color: dbRole.color,
      icon: dbRole.icon,
      inheritsFrom: dbRole.inherits_from,
      isSystem: dbRole.is_system,
      permissions: dbRole.permissions || [],
      companyId: dbRole.company_id,
      createdAt: new Date(dbRole.created_at),
      updatedAt: new Date(dbRole.updated_at)
    };
  }
}

// Export singleton instance
export default new RoleService();
