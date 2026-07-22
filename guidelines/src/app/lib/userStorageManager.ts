/**
 * User Storage Manager
 * Provides user-specific folder isolation for Design Studio and Content Center
 * Ensures customers, vendors, advertisers, and employees can only access their own content
 */

export type UserType = 'customer' | 'vendor' | 'advertiser' | 'employee' | 'owner' | 'admin';

export interface UserContext {
  userId: string;
  userType: UserType;
  userName: string;
  companyId?: string; // For linking to company/organization
}

/**
 * Get the storage key prefix for a user
 * This creates isolated storage namespaces per user
 */
export function getUserStoragePrefix(userContext: UserContext): string {
  return `user_${userContext.userType}_${userContext.userId}`;
}

/**
 * Save data to user-specific storage
 */
export function saveToUserStorage<T>(
  userContext: UserContext,
  storageKey: string,
  data: T
): void {
  const prefix = getUserStoragePrefix(userContext);
  const fullKey = `${prefix}_${storageKey}`;
  
  try {
    localStorage.setItem(fullKey, JSON.stringify(data));
    console.log(`✅ Saved to user storage: ${fullKey}`);
  } catch (error) {
    console.error(`❌ Failed to save to user storage: ${fullKey}`, error);
    throw new Error('Failed to save data');
  }
}

/**
 * Load data from user-specific storage
 */
export function loadFromUserStorage<T>(
  userContext: UserContext,
  storageKey: string,
  defaultValue: T
): T {
  const prefix = getUserStoragePrefix(userContext);
  const fullKey = `${prefix}_${storageKey}`;
  
  try {
    const stored = localStorage.getItem(fullKey);
    if (stored) {
      return JSON.parse(stored) as T;
    }
    return defaultValue;
  } catch (error) {
    console.error(`❌ Failed to load from user storage: ${fullKey}`, error);
    return defaultValue;
  }
}

/**
 * Delete data from user-specific storage
 */
export function deleteFromUserStorage(
  userContext: UserContext,
  storageKey: string
): void {
  const prefix = getUserStoragePrefix(userContext);
  const fullKey = `${prefix}_${storageKey}`;
  
  try {
    localStorage.removeItem(fullKey);
    console.log(`🗑️ Deleted from user storage: ${fullKey}`);
  } catch (error) {
    console.error(`❌ Failed to delete from user storage: ${fullKey}`, error);
  }
}

/**
 * List all storage keys for a user
 */
export function listUserStorageKeys(userContext: UserContext): string[] {
  const prefix = getUserStoragePrefix(userContext);
  const keys: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      // Remove the prefix to get the actual storage key
      keys.push(key.replace(`${prefix}_`, ''));
    }
  }
  
  return keys;
}

/**
 * Clear all data for a specific user (use with caution)
 */
export function clearUserStorage(userContext: UserContext): void {
  const prefix = getUserStoragePrefix(userContext);
  const keysToDelete: string[] = [];
  
  // First, collect all keys to delete
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }
  
  // Then delete them
  keysToDelete.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ Cleared ${keysToDelete.length} items from user storage for ${prefix}`);
}

/**
 * Export user's data (for backup/download)
 */
export function exportUserData(userContext: UserContext): Record<string, any> {
  const prefix = getUserStoragePrefix(userContext);
  const userData: Record<string, any> = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const storageKey = key.replace(`${prefix}_`, '');
          userData[storageKey] = JSON.parse(value);
        } catch (error) {
          console.error(`Failed to parse data for key: ${key}`, error);
        }
      }
    }
  }
  
  return userData;
}

/**
 * Get mock user context (for development/testing)
 * In production, this should come from your auth system
 */
export function getMockUserContext(): UserContext {
  // Try to get from localStorage first
  const stored = localStorage.getItem('current_user_context');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored user context');
    }
  }
  
  // Default mock user
  return {
    userId: 'user-demo-123',
    userType: 'customer',
    userName: 'Demo Customer',
    companyId: 'company-demo-1'
  };
}

/**
 * Set mock user context (for development/testing)
 */
export function setMockUserContext(userContext: UserContext): void {
  localStorage.setItem('current_user_context', JSON.stringify(userContext));
  console.log('✅ User context set:', userContext);
}

/**
 * Storage keys for Design Studio
 */
export const DESIGN_STUDIO_KEYS = {
  PROJECTS: 'design-studio-projects',
  CURRENT_PROJECT: 'design-studio-current-project',
  TEMPLATES: 'design-studio-templates',
  SETTINGS: 'design-studio-settings'
} as const;

/**
 * Storage keys for Content Center
 */
export const CONTENT_CENTER_KEYS = {
  CONTENT_PIECES: 'content-center-pieces',
  DRAFTS: 'content-center-drafts',
  TEMPLATES: 'content-center-templates',
  SETTINGS: 'content-center-settings',
  SOCIAL_POSTS: 'social-media-posts',
  VIDEO_ASSETS: 'video-assets',
  MUSIC_ASSETS: 'music-assets'
} as const;
