/**
 * Database persistence layer
 * Saves data to Supabase database with localStorage as fallback
 */

import { supabase } from './supabase';
import { API_BASE_URL } from './apiConfig';

const API_BASE = `${API_BASE_URL}/make-server-3eae23a6`;

/**
 * The signed-in identity, or null. Both halves matter.
 *
 * WHAT THIS REPLACED, AND WHY IT WAS COSTING SO MUCH
 *
 * There were two functions here. `getAuthToken` returned the session token
 * `|| publicAnonKey`, described as "demo mode". `getUserId` returned the
 * user's id `|| 'anonymous'`. Signed out, this layer therefore sent the
 * publishable key as a credential and built its keys as `<key>_anonymous`.
 *
 * Three consequences, measured in the November 2026 audit as finding `A-1`:
 *
 *  1. **~1,300 refused requests a day.** The auth wall logged 1,304 blocks in
 *     24 hours, every one `tier=user signedIn=false`, and the biggest single
 *     line was `POST /kv/set` at 145. Each one was this code asking the server
 *     to store something on behalf of nobody.
 *
 *  2. **A blank dashboard instead of a sign-in prompt.** The callers discard
 *     the 401, so panels render empty and the owner sees a working-looking
 *     screen with nothing on it.
 *
 *  3. **A split data namespace, which is the expensive one.** `loadDual`
 *     syncs localStorage up to the server, so work done before signing in was
 *     stored under `_anonymous` — and is then invisible to the same person
 *     once they sign in, because the read asks for `<key>_<their uuid>`. Eight
 *     such keys hold 2.7 MB of real company data today, including two
 *     different service-area radii saved seven months apart. That is why the
 *     Service Area Settings screen looks blank to its own owner.
 *
 * It also had to be taught to `ipReputation.presentedCredential`, which must
 * ignore the anon key precisely so this noise did not score every signed-out
 * browser into a ban.
 *
 * So: no session, no request. `saveDual` and `loadDual` still use
 * localStorage, which is what "working offline" was always supposed to mean.
 * The key shape for a signed-in user is unchanged — `<key>_<uuid>` — because
 * changing it would strand the 113 keys already written that way.
 */
async function currentIdentity(): Promise<{ token: string; userId: string } | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const userId = data?.session?.user?.id;
    if (!token || !userId) return null;
    return { token, userId };
  } catch {
    return null;
  }
}

/**
 * Save data to database
 */
export async function saveToDatabase(key: string, value: any): Promise<boolean> {
  try {
    const who = await currentIdentity();
    // Signed out: localStorage is the whole story. Asking the server to store
    // something for nobody was 145 refused POSTs a day and a pile of
    // `_anonymous` keys that their own author could not read back.
    if (!who) return false;

    const userKey = `${key}_${who.userId}`;

    const response = await fetch(`${API_BASE}/kv/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${who.token}`
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
    const who = await currentIdentity();
    // Signed out: nothing to ask for. `loadDual` falls through to
    // localStorage, which is the answer it was always going to end up with
    // after a 401 anyway — minus the refused request and the misleading
    // "Database load failed" line in the console.
    if (!who) return null;

    const userKey = `${key}_${who.userId}`;

    const response = await fetch(`${API_BASE}/kv/get/${encodeURIComponent(userKey)}`, {
      headers: {
        'Authorization': `Bearer ${who.token}`
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
