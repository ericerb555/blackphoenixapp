/**
 * Safe LocalStorage Wrapper
 * Prevents storing undefined, null, or invalid values
 */

export function safeSetItem(key: string, value: any): boolean {
  try {
    // Never allow storing undefined or null
    if (value === undefined || value === null) {
      console.warn(`[safeLocalStorage] Blocked attempt to store ${value} to key: ${key}`);
      return false;
    }

    // If it's an object/array, validate it has content
    if (typeof value === 'object') {
      if (Array.isArray(value) && value.length === 0) {
        console.warn(`[safeLocalStorage] Blocked empty array for key: ${key}`);
        return false;
      }
      if (!Array.isArray(value) && Object.keys(value).length === 0) {
        console.warn(`[safeLocalStorage] Blocked empty object for key: ${key}`);
        return false;
      }
    }

    // Convert to string (JSON.stringify for objects)
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Validate the string is not "undefined" or "null"
    if (stringValue === 'undefined' || stringValue === 'null') {
      console.warn(`[safeLocalStorage] Blocked literal "${stringValue}" for key: ${key}`);
      return false;
    }

    // All checks passed - save it
    localStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    console.error(`[safeLocalStorage] Error saving ${key}:`, error);
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    const value = localStorage.getItem(key);

    // Check for invalid values
    if (value === 'undefined' || value === 'null') {
      console.warn(`[safeLocalStorage] Found invalid value "${value}" for key: ${key}, clearing`);
      localStorage.removeItem(key);
      return null;
    }

    return value;
  } catch (error) {
    console.error(`[safeLocalStorage] Error reading ${key}:`, error);
    return null;
  }
}

export function safeGetItemJSON<T = any>(key: string): T | null {
  const value = safeGetItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[safeLocalStorage] Failed to parse JSON for ${key}:`, error);
    console.log(`[safeLocalStorage] Clearing corrupted data from ${key}`);
    localStorage.removeItem(key);
    return null;
  }
}
