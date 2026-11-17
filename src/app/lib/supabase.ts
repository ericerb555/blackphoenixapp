import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';
// Import error suppression FIRST
import '../utils/suppressErrors';

// Supabase configuration from info file
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

/*
 * The placeholder guard, and why it compares through `String()`.
 *
 * `projectId` is a literal in `utils/supabase/info`, so TypeScript narrows it
 * to that one project's id and reported `projectId !== 'placeholder'` as a
 * comparison that can never be false — the last of the TS2367s, and the only
 * one of them that was not a defect.
 *
 * The guard is not pointless, though: `info.tsx` is the file a fresh checkout
 * or a template copy has wrong, and this is what puts the app into its mock
 * client instead of pointing a real browser at `https://placeholder.supabase.co`.
 * The check has to survive a value TypeScript believes is impossible.
 *
 * `String(...)` widens it back to a string so the comparison is honest to the
 * compiler and unchanged at runtime. Deleting the guard to satisfy the
 * compiler would have been the wrong way round: the type is a claim about one
 * checkout, and the guard is about the others.
 */
const hasValidCredentials =
  projectId &&
  publicAnonKey &&
  String(projectId) !== 'placeholder' &&
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
