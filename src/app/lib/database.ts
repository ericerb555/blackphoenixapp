/**
 * Database persistence layer
 * Saves data to Supabase database with localStorage as fallback
 */

import { supabase } from './supabase';
import { publicAnonKey } from '../utils/supabase/info';

const API_BASE = 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6';

/**
 * Get current user's access token for authenticated requests
 * Falls back to public anon key for demo mode
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data?.session?.access_token;

    // Use session token if available, otherwise use public anon key
    return sessionToken || publicAnonKey;
  } catch {
    // Fallback to public anon key
    return publicAnonKey;
  }
}

/**
 * Get current user ID
 */
async function getUserId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

/**
 * Save data to database
 */
export async function saveToDatabase(key: string, value: any): Promise<boolean> {
  try {
    const token = await getAuthToken();
    const userId = await getUserId();
    const userKey = `${key}_${userId}`;

    const response = await fetch(`${API_BASE}/kv/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ key: userKey, value })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Only log if not a 404 (server route doesn't exist)
      if (response.status !== 404) {
        console.warn('Database save failed (working offline):', errorText);
      }
      return false;
    }

    console.log(`✅ Saved to database: ${userKey}`);
    return true;
  } catch (error) {
    console.error('Database save error:', error);
    return false;
  }
}

/**
 * Load data from database
 */
export async function loadFromDatabase(key: string): Promise<any | null> {
  try {
    const token = await getAuthToken();
    const userId = await getUserId();
    const userKey = `${key}_${userId}`;

    const response = await fetch(`${API_BASE}/kv/get/${encodeURIComponent(userKey)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Only log if not a 404 (server route doesn't exist)
      if (response.status !== 404) {
        console.warn('Database load failed (working offline):', errorText);
      }
      return null;
    }

    const data = await response.json();
    // Check if value exists and is not undefined
    if (data && data.value !== undefined && data.value !== null) {
      console.log(`✅ Loaded from database: ${userKey}`);
      return data.value;
    }
    return null;
  } catch (error) {
    console.error('Database load error:', error);
    return null;
  }
}

/**
 * Save with dual persistence: database + localStorage
 */
export async function saveDual(key: string, value: any): Promise<void> {
  // Don't save undefined or null values
  if (value === undefined || value === null) {
    console.warn(`⚠️ Skipping save of undefined/null value for key: ${key}`);
    return;
  }

  // Save to localStorage immediately (fast, synchronous)
  try {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(`✅ Saved to localStorage: ${key}`);
  } catch (error) {
    console.error('localStorage save failed:', error);
  }

  // Save to database (slower, but persistent)
  await saveToDatabase(key, value);
}

/**
 * Load with dual persistence: try database first, fallback to localStorage
 */
export async function loadDual(key: string): Promise<any | null> {
  // Try database first (source of truth)
  const dbValue = await loadFromDatabase(key);
  if (dbValue !== null && dbValue !== undefined) {
    // Cache in localStorage for faster subsequent loads
    try {
      localStorage.setItem(key, JSON.stringify(dbValue));
    } catch {}
    return dbValue;
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      // Check if stored value is "undefined" string (invalid JSON)
      if (stored === 'undefined' || stored === 'null' || stored.trim() === '') {
        console.warn(`⚠️ Invalid localStorage value for ${key}: "${stored}" - clearing`);
        localStorage.removeItem(key);
        return null;
      }

      try {
        const value = JSON.parse(stored);
        console.log(`⚠️ Loaded from localStorage (database empty): ${key}`);
        // Sync to database in background
        saveToDatabase(key, value);
        return value;
      } catch (parseError) {
        console.error(`❌ Failed to parse localStorage data for ${key}:`, parseError);
        console.error(`   Raw value: "${stored.substring(0, 100)}..."`);
        // Clear corrupted data
        localStorage.removeItem(key);
        return null;
      }
    }
  } catch (error) {
    console.error(`localStorage load failed for ${key}:`, error);
    // Clear corrupted data
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  return null;
}
