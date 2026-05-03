/**
 * useDesignProject Hook
 * Easy integration of design project management into any CAD/Design component
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import DesignProjectManager from '../lib/services/designProjectManager';

export interface UseDesignProjectOptions {
  projectType: 'floor-plan' | 'kitchen' | 'bathroom' | 'electrical' | 'plumbing' | 'structural' | 'landscape' | 'mixed';
  autoSaveInterval?: number; // milliseconds, default 30000 (30 seconds)
  onProjectLoad?: (project: any) => void;
  onProjectSave?: (project: any) => void;
}

export function useDesignProject(options: UseDesignProjectOptions) {
  const { projectType, autoSaveInterval = 30000, onProjectLoad, onProjectSave } = options;
  
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [permission, setPermission] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  
  /**
   * Check if user can edit
   */
  const canEdit = permission === 'owner' || permission === 'editor';
  
  /**
   * Check if user is owner
   */
  const isOwner = permission === 'owner';
  
  /**
   * Create a new project
   */
  const createProject = useCallback(async (projectData: any, initialDesignData: any) => {
    setLoading(true);
    try {
      const result = await DesignProjectManager.createProject({
        ...projectData,
        project_type: projectType,
        design_data: initialDesignData
      });
      
      if (result.success && result.data) {
        setCurrentProject(result.data);
        setPermission('owner');
        setLastSaved(new Date());
        toast.success('Project created successfully!');
        onProjectLoad?.(result.data);
        return { success: true, data: result.data };
      } else {
        toast.error(result.error || 'Failed to create project');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      toast.error('Failed to create project');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [projectType, onProjectLoad]);
  
  /**
   * Load an existing project
   */
  const loadProject = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const result = await DesignProjectManager.getProject(projectId);
      
      if (result.success && result.data) {
        setCurrentProject(result.data);
        setPermission(result.permission as any || 'viewer');
        setLastSaved(new Date(result.data.updated_at));
        toast.success(`Project loaded: ${result.data.project_name}`);
        onProjectLoad?.(result.data);
        return { success: true, data: result.data };
      } else {
        toast.error(result.error || 'Failed to load project');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      toast.error('Failed to load project');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [onProjectLoad]);
  
  /**
   * Save design data (manual save with version increment)
   */
  const saveProject = useCallback(async (designData: any) => {
    if (!currentProject) {
      toast.error('No project loaded');
      return { success: false, error: 'No project loaded' };
    }
    
    if (!canEdit) {
      toast.error('You do not have permission to edit this project');
      return { success: false, error: 'Permission denied' };
    }
    
    setSaving(true);
    try {
      const result = await DesignProjectManager.saveDesignData(
        currentProject.id,
        designData,
        true // Increment version
      );
      
      if (result.success) {
        setLastSaved(new Date());
        toast.success('Project saved successfully!');
        onProjectSave?.(currentProject);
        return { success: true };
      } else {
        toast.error(result.error || 'Failed to save project');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      toast.error('Failed to save project');
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  }, [currentProject, canEdit, onProjectSave]);
  
  /**
   * Auto-save design data (no version increment, silent)
   */
  const autoSave = useCallback(async (designData: any) => {
    if (!currentProject || !autoSaveEnabled || saving || !canEdit) {
      return;
    }
    
    try {
      const result = await DesignProjectManager.saveDesignData(
        currentProject.id,
        designData,
        false // Don't increment version
      );
      
      if (result.success) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [currentProject, autoSaveEnabled, saving, canEdit]);
  
  /**
   * Delete/archive project
   */
  const deleteProject = useCallback(async () => {
    if (!currentProject) {
      toast.error('No project loaded');
      return { success: false, error: 'No project loaded' };
    }
    
    if (!isOwner) {
      toast.error('Only the project owner can delete this project');
      return { success: false, error: 'Permission denied' };
    }
    
    if (!confirm('Are you sure you want to archive this project?')) {
      return { success: false, error: 'Cancelled' };
    }
    
    try {
      const result = await DesignProjectManager.deleteProject(currentProject.id);
      
      if (result.success) {
        setCurrentProject(null);
        setPermission(null);
        toast.success('Project archived');
        return { success: true };
      } else {
        toast.error(result.error || 'Failed to archive project');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      toast.error('Failed to archive project');
      return { success: false, error: error.message };
    }
  }, [currentProject, isOwner]);
  
  /**
   * Duplicate project
   */
  const duplicateProject = useCallback(async (newName?: string) => {
    if (!currentProject) {
      toast.error('No project loaded');
      return { success: false, error: 'No project loaded' };
    }
    
    try {
      const result = await DesignProjectManager.duplicateProject(
        currentProject.id,
        newName
      );
      
      if (result.success && result.data) {
        toast.success('Project duplicated successfully');
        return { success: true, data: result.data };
      } else {
        toast.error(result.error || 'Failed to duplicate project');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      toast.error('Failed to duplicate project');
      return { success: false, error: error.message };
    }
  }, [currentProject]);
  
  /**
   * Close current project
   */
  const closeProject = useCallback(() => {
    setCurrentProject(null);
    setPermission(null);
    setLastSaved(null);
    toast.info('Project closed');
  }, []);
  
  /**
   * Export to PDF
   */
  const exportToPDF = useCallback(async () => {
    if (!currentProject) {
      toast.error('No project loaded');
      return { success: false, error: 'No project loaded' };
    }
    
    try {
      const result = await DesignProjectManager.exportToPDF(currentProject.id);
      return result;
    } catch (error: any) {
      toast.error('Failed to export to PDF');
      return { success: false, error: error.message };
    }
  }, [currentProject]);
  
  /**
   * Export to DWG
   */
  const exportToDWG = useCallback(async () => {
    if (!currentProject) {
      toast.error('No project loaded');
      return { success: false, error: 'No project loaded' };
    }
    
    try {
      const result = await DesignProjectManager.exportToDWG(currentProject.id);
      return result;
    } catch (error: any) {
      toast.error('Failed to export to DWG');
      return { success: false, error: error.message };
    }
  }, [currentProject]);
  
  return {
    // State
    currentProject,
    saving,
    loading,
    lastSaved,
    autoSaveEnabled,
    permission,
    canEdit,
    isOwner,
    
    // Actions
    createProject,
    loadProject,
    saveProject,
    autoSave,
    deleteProject,
    duplicateProject,
    closeProject,
    exportToPDF,
    exportToDWG,
    setAutoSaveEnabled,
  };
}

export default useDesignProject;
