import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';
// Import error suppression FIRST
import '../utils/suppressErrors';

// Supabase configuration from info file
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Check if we have valid Supabase credentials
const hasValidCredentials = 
  projectId && 
  publicAnonKey &&
  projectId !== 'placeholder' &&
  !publicAnonKey.includes('placeholder');

// Create a mock Supabase client for demo mode
const createMockSupabaseClient = () => {
  const mockResponse = { data: null, error: null };
  
  const mockQuery = () => ({
    eq: mockQuery,
    neq: mockQuery,
    gt: mockQuery,
    gte: mockQuery,
    lt: mockQuery,
    lte: mockQuery,
    like: mockQuery,
    ilike: mockQuery,
    is: mockQuery,
    in: mockQuery,
    contains: mockQuery,
    containedBy: mockQuery,
    range: mockQuery,
    order: mockQuery,
    limit: mockQuery,
    single: async () => mockResponse,
    maybeSingle: async () => mockResponse,
    then: (resolve: any) => resolve(mockResponse),
  });
  
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ 
        data: null, 
        error: { message: 'Supabase not configured. Please add your credentials.' } 
      }),
      signUp: async () => ({ 
        data: null, 
        error: { message: 'Supabase not configured. Please add your credentials.' } 
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ 
        data: { subscription: { unsubscribe: () => {} } }
      }),
    },
    from: () => ({
      select: () => mockQuery(),
      insert: () => ({
        select: () => ({
          single: async () => mockResponse,
        }),
        then: (resolve: any) => resolve(mockResponse),
      }),
      update: () => mockQuery(),
      upsert: () => mockQuery(),
      delete: () => mockQuery(),
    }),
    rpc: async () => ({ data: null, error: null }),
  };
};

// Create Supabase client or mock (singleton instance)
export const supabase = hasValidCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'sb-plzsvzwwcdopnawtiwzm-auth-token', // Explicit storage key
        storage: window.localStorage,
        // Increase lock timeout to prevent warnings in dev mode (React Strict Mode)
        lockAcquisitionTimeout: 10000, // 10 seconds instead of 5
        // Disable lock debugging to reduce noise
        debug: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'black-phoenix-app',
        },
      },
    })
  : createMockSupabaseClient() as any;

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data.user;
};

export default supabase;