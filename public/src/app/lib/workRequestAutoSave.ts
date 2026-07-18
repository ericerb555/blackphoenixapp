import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_BASE_URL } from './apiConfig';

export interface WorkRequestDraft {
  draftId: string;
  userId: string | null;
  formData: any;
  currentStep: string;
  lastSaved: string;
  createdAt: string;
}

const LOCALSTORAGE_KEY = 'work_request_draft';
const API_BASE = API_BASE_URL;

export class WorkRequestAutoSave {
  private draftId: string;
  private userId: string | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private lastSaveTime: Date | null = null;

  constructor(userId: string | null = null) {
    this.userId = userId;
    // Generate or restore draft ID
    const existingDraft = this.getLocalDraft();
    this.draftId = existingDraft?.draftId || this.generateDraftId();
  }

  private generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Serialize form data by removing non-serializable objects like Files, Blobs, and circular references
   */
  private serializeFormData(formData: any): any {
    if (!formData) return formData;
    
    const serialized: any = {};
    
    // Copy all primitive values and arrays
    for (const key in formData) {
      if (!formData.hasOwnProperty(key)) continue;
      
      const value = formData[key];
      
      // Handle null and undefined
      if (value === null || value === undefined) {
        serialized[key] = value;
        continue;
      }
      
      // Handle primitive types (string, number, boolean)
      const valueType = typeof value;
      if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
        serialized[key] = value;
        continue;
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        // Special handling for known file/blob arrays
        if (key === 'videos') {
          serialized[key] = value.map((video: any) => ({
            duration: video?.duration || 0,
            hasBlob: true
          }));
        } else if (key === 'photos' || key === 'blueprints') {
          serialized[key] = value.map((file: any) => ({
            name: file?.name || 'file',
            size: file?.size || 0,
            type: file?.type || 'application/octet-stream'
          }));
        } else {
          // For other arrays, just copy them
          serialized[key] = value;
        }
        continue;
      }
      
      // Handle objects
      if (valueType === 'object') {
        // Check if it's a File or Blob
        if (value.constructor && (value.constructor.name === 'File' || value.constructor.name === 'Blob')) {
          console.warn(`Skipping File/Blob object in field: ${key}`);
          continue;
        }
        
        // Check for DOM elements or Event objects
        if (value.nodeType !== undefined || 
            value.preventDefault !== undefined || 
            value.stopPropagation !== undefined ||
            value.tagName !== undefined ||
            (value.target !== undefined && value.currentTarget !== undefined)) {
          console.warn(`Removing non-serializable DOM/Event object from field: ${key}`);
          continue;
        }
        
        // It's a plain object, copy it
        serialized[key] = value;
        continue;
      }
      
      // Skip functions
      if (valueType === 'function') {
        console.warn(`Skipping function in field: ${key}`);
        continue;
      }
      
      // For anything else, try to include it
      serialized[key] = value;
    }
    
    return serialized;
  }

  /**
   * Save draft to localStorage immediately
   */
  saveToLocalStorage(formData: any, currentStep: string): void {
    const draft: WorkRequestDraft = {
      draftId: this.draftId,
      userId: this.userId,
      formData: this.serializeFormData(formData), // Serialize before saving
      currentStep,
      lastSaved: new Date().toISOString(),
      createdAt: this.lastSaveTime?.toISOString() || new Date().toISOString()
    };

    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(draft));
      this.lastSaveTime = new Date();
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  /**
   * Save draft to backend (debounced)
   */
  saveToBackend(formData: any, currentStep: string, accessToken?: string): void {
    // Clear existing timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // Debounce: save after 2 seconds of inactivity
    this.saveTimer = setTimeout(() => {
      this.executeSaveToBackend(formData, currentStep, accessToken);
    }, 2000);
  }

  /**
   * Execute immediate save to backend
   */
  private async executeSaveToBackend(
    formData: any,
    currentStep: string,
    accessToken?: string
  ): Promise<void> {
    const draft: WorkRequestDraft = {
      draftId: this.draftId,
      userId: this.userId,
      formData: this.serializeFormData(formData), // Serialize before saving
      currentStep,
      lastSaved: new Date().toISOString(),
      createdAt: this.lastSaveTime?.toISOString() || new Date().toISOString()
    };

    try {
      const url = `${API_BASE}/work-request-drafts/save`;
      console.log('[AutoSave] Saving to:', url);
      
      const response = await fetch(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || publicAnonKey}`
          },
          body: JSON.stringify(draft)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AutoSave] Server responded with error:', response.status, errorText);
        throw new Error(`Failed to save draft: ${response.status} ${response.statusText}`);
      }

      this.lastSaveTime = new Date();
      console.log('[AutoSave] Draft saved to backend successfully');
    } catch (error) {
      console.error('[AutoSave] Error saving draft to backend:', error);
      // Still saved to localStorage, so not critical
    }
  }

  /**
   * Auto-save: saves to both localStorage (immediate) and backend (debounced)
   */
  autoSave(formData: any, currentStep: string, accessToken?: string): void {
    // Immediate save to localStorage
    this.saveToLocalStorage(formData, currentStep);
    
    // Debounced save to backend
    if (this.userId) {
      this.saveToBackend(formData, currentStep, accessToken);
    }
  }

  /**
   * Get draft from localStorage
   */
  getLocalDraft(): WorkRequestDraft | null {
    try {
      const draftStr = localStorage.getItem(LOCALSTORAGE_KEY);
      if (draftStr) {
        return JSON.parse(draftStr);
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
    return null;
  }

  /**
   * Get draft from backend
   */
  async getBackendDraft(accessToken?: string): Promise<WorkRequestDraft | null> {
    try {
      const response = await fetch(
        `${API_BASE}/work-request-drafts/${this.draftId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error loading draft from backend:', error);
    }
    return null;
  }

  /**
   * Restore draft - tries backend first, falls back to localStorage
   */
  async restoreDraft(accessToken?: string): Promise<WorkRequestDraft | null> {
    // Try backend first if user is logged in
    if (this.userId && accessToken) {
      const backendDraft = await this.getBackendDraft(accessToken);
      if (backendDraft) {
        return backendDraft;
      }
    }

    // Fall back to localStorage
    return this.getLocalDraft();
  }

  /**
   * Clear draft from localStorage
   */
  clearLocalDraft(): void {
    try {
      localStorage.removeItem(LOCALSTORAGE_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Clear draft from backend
   */
  async clearBackendDraft(accessToken?: string): Promise<void> {
    try {
      const url = `${API_BASE}/work-request-drafts/${this.draftId}`;
      console.log('[AutoSave] Clearing draft from:', url);
      
      const response = await fetch(
        url,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AutoSave] Server responded with error while clearing:', response.status, errorText);
      } else {
        console.log('[AutoSave] Draft cleared from backend successfully');
      }
    } catch (error) {
      console.error('[AutoSave] Error clearing backend draft:', error);
    }
  }

  /**
   * Clear all drafts (localStorage + backend)
   */
  async clearAllDrafts(accessToken?: string): Promise<void> {
    this.clearLocalDraft();
    if (this.userId) {
      await this.clearBackendDraft(accessToken);
    }
  }

  /**
   * Get last save time
   */
  getLastSaveTime(): Date | null {
    return this.lastSaveTime;
  }

  /**
   * Format last save time for display
   */
  formatLastSaveTime(): string {
    if (!this.lastSaveTime) {
      return 'Not saved';
    }

    const now = new Date();
    const diff = now.getTime() - this.lastSaveTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 10) {
      return 'Saved just now';
    } else if (seconds < 60) {
      return `Saved ${seconds} seconds ago`;
    } else if (minutes < 60) {
      return `Saved ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return `Saved at ${this.lastSaveTime.toLocaleTimeString()}`;
    }
  }

  /**
   * Get draft ID
   */
  getDraftId(): string {
    return this.draftId;
  }
}