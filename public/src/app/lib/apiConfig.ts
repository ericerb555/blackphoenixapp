import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Centralized API configuration
 * The Supabase Edge Function is named "server"
 * All routes use the prefix /make-server-57095a78
 */
export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;

export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`
  }
};

export function getAuthHeaders(accessToken?: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken || publicAnonKey}`
  };
}
