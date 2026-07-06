/**
 * Data Sync Service
 *
 * Ensures all critical data (customers, vendors, advertisers, subscriptions)
 * is saved to both localStorage AND Supabase backend for redundancy
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Generic save function - saves to both localStorage and server
 */
export async function syncSave<T>(
  storageKey: string,
  serverEndpoint: string,
  data: T
): Promise<SyncResult> {
  try {
    // 1. Save to localStorage immediately (instant backup)
    localStorage.setItem(storageKey, JSON.stringify(data));
    console.log(`✅ Saved to localStorage: ${storageKey}`);

    // 2. Sync to server (permanent storage)
    const response = await fetch(`${SERVER_BASE}${serverEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.warn(`⚠️ Server sync failed for ${storageKey}, but localStorage backup exists`);
      return {
        success: true, // Still success because localStorage saved
        error: `Server sync failed: ${response.status}`,
        data
      };
    }

    const serverData = await response.json();
    console.log(`✅ Synced to server: ${serverEndpoint}`);

    return {
      success: true,
      data: serverData
    };

  } catch (error) {
    console.error(`❌ Error syncing ${storageKey}:`, error);
    // Check if localStorage save succeeded at least
    const localData = localStorage.getItem(storageKey);
    if (localData) {
      return {
        success: true,
        error: `Server sync failed, but data saved locally`,
        data: JSON.parse(localData)
      };
    }

    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Generic fetch function - tries server first, falls back to localStorage
 */
export async function syncFetch<T>(
  storageKey: string,
  serverEndpoint: string
): Promise<SyncResult> {
  try {
    // 1. Try server first (most up-to-date)
    const response = await fetch(`${SERVER_BASE}${serverEndpoint}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (response.ok) {
      const serverData = await response.json();
      // Update localStorage cache
      localStorage.setItem(storageKey, JSON.stringify(serverData));
      console.log(`✅ Fetched from server: ${serverEndpoint}`);
      return {
        success: true,
        data: serverData
      };
    }

    throw new Error(`Server returned ${response.status}`);

  } catch (error) {
    console.warn(`⚠️ Server fetch failed for ${serverEndpoint}, using localStorage`);

    // 2. Fallback to localStorage
    const localData = localStorage.getItem(storageKey);
    if (localData) {
      return {
        success: true,
        data: JSON.parse(localData),
        error: 'Using cached data'
      };
    }

    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Sync array of items (like subscriptions list)
 */
export async function syncArray<T>(
  storageKey: string,
  serverEndpoint: string,
  items: T[]
): Promise<SyncResult> {
  try {
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(items));

    // Sync each item to server
    const results = await Promise.allSettled(
      items.map(item =>
        fetch(`${SERVER_BASE}${serverEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(item)
        })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Synced ${successCount}/${items.length} items to server`);

    return {
      success: true,
      data: items,
      error: successCount < items.length ? `${items.length - successCount} items failed to sync` : undefined
    };

  } catch (error) {
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Delete from both localStorage and server
 */
export async function syncDelete(
  storageKey: string,
  serverEndpoint: string,
  id: string
): Promise<SyncResult> {
  try {
    // Delete from server
    await fetch(`${SERVER_BASE}${serverEndpoint}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    // Remove from localStorage (if it's an array, filter out the item)
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          const filtered = data.filter((item: any) => item.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(filtered));
        }
      } catch {
        // If not an array, just clear the key
        localStorage.removeItem(storageKey);
      }
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Check sync status - useful for debugging
 */
export async function getSyncStatus(): Promise<{
  localStorage: boolean;
  server: boolean;
  details: Record<string, any>;
}> {
  const details: Record<string, any> = {};

  // Check localStorage
  const localStorageWorks = typeof localStorage !== 'undefined';
  details.localStorage = localStorageWorks;

  // Check server connection
  try {
    const response = await fetch(`${SERVER_BASE}/health`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });
    details.server = response.ok;
    details.serverStatus = response.status;
  } catch (error) {
    details.server = false;
    details.serverError = String(error);
  }

  return {
    localStorage: localStorageWorks,
    server: details.server,
    details
  };
}
