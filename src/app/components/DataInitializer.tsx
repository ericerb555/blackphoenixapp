import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../lib/apiConfig';

/**
 * DataInitializer - Automatically seeds the database with sample data on first load
 * This component runs once and initializes all necessary data for the app to function
 * 
 * NOTE: This app uses localStorage as the primary data store.
 * Server initialization is optional and will gracefully fail if server is offline.
 */
export default function DataInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we've already initialized
    const hasInitialized = localStorage.getItem('dataInitialized');
    if (hasInitialized) {
      console.log('✅ Data already initialized (skipping). Clear localStorage to re-initialize.');
      setLoading(false);
      setInitialized(true);
      return;
    }

    console.log('🚀 No initialization flag found - starting initialization...');
    initializeData();
  }, []);

  const initializeData = async () => {
    /*
     * NOTHING IS SENT WITHOUT A SIGNED-IN SESSION.
     *
     * These four endpoints are staff-tier. This component sent them with the
     * anon key, so since the authorisation gate went in they have returned
     * 401 every time — four refusals, twice each, for every visitor who
     * arrived without the localStorage flag. They could never have succeeded.
     *
     * MEASURED 2026-11-14, and it is why this is a security fix rather than
     * tidying: `ipReputation` scores a 401 as `auth_refused`, which is how
     * Eric's own address reached 60.0 out of a possible 60 and sat
     * permanently in a would-ban state. The identical burst fires for a
     * first-time VISITOR. The moment `IP_REPUTATION_ENFORCE` is turned on,
     * the platform would ban every new customer on their first page load,
     * using requests it sent itself, and the log line would call it
     * credential probing.
     *
     * So: no session, nothing sent. A signed-out visitor needs none of this,
     * and the endpoints would refuse them anyway.
     */
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.log('ℹ️ Not signed in — skipping server initialization, which would be refused.');
      setLoading(false);
      setInitialized(true);
      return;
    }

    console.log('🌱 Starting data initialization...');
    console.log('💾 This app uses localStorage as primary data store - server init is optional');

    try {
      const baseUrl = `${API_BASE_URL}/make-server-3eae23a6`;
      const headers = {
        /* The SESSION, not the anon key. The anon key is what made every one
           of these a guaranteed 401. */
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Try to initialize server data, but don't fail if server is offline
      // All these requests will silently fail and return error objects
      console.log('🔄 Attempting optional server initialization...');
      
      const initPromises = [
        // Initialize customers (optional - localStorage is primary)
        fetch(`${baseUrl}/customers/initialize`, { 
          method: 'POST', 
          headers,
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
          .then(res => res.ok ? res.json() : { error: 'Server offline' })
          .then(data => {
            if (!data.error) {
              console.log('✅ Customers initialized on server:', data);
            }
            return data;
          })
          .catch(err => {
            console.log('ℹ️ Server offline - customers will use localStorage only');
            return { error: err.message };
          }),

        // Initialize vendors (optional - localStorage is primary)
        fetch(`${baseUrl}/vendors/initialize`, { 
          method: 'POST', 
          headers,
          signal: AbortSignal.timeout(5000)
        })
          .then(res => res.ok ? res.json() : { error: 'Server offline' })
          .then(data => {
            if (!data.error) {
              console.log('✅ Vendors initialized on server:', data);
            }
            return data;
          })
          .catch(err => {
            console.log('ℹ️ Server offline - vendors will use localStorage only');
            return { error: err.message };
          }),

        // Initialize pipeline data (optional - localStorage is primary)
        fetch(`${baseUrl}/seed-pipeline-data`, { 
          method: 'POST', 
          headers,
          signal: AbortSignal.timeout(5000)
        })
          .then(res => res.ok ? res.json() : { error: 'Server offline' })
          .then(data => {
            if (!data.error) {
              console.log('✅ Pipeline data initialized on server:', data);
            }
            return data;
          })
          .catch(err => {
            console.log('ℹ️ Server offline - pipeline will use localStorage only');
            return { error: err.message };
          }),

        // Initialize white-label clients (optional - localStorage is primary)
        fetch(`${baseUrl}/white-label/initialize`, { 
          method: 'POST', 
          headers,
          signal: AbortSignal.timeout(5000)
        })
          .then(res => res.ok ? res.json() : { error: 'Server offline' })
          .then(data => {
            if (!data.error) {
              console.log('✅ White-label clients initialized on server:', data);
            }
            return data;
          })
          .catch(err => {
            console.log('ℹ️ Server offline - white-label will use localStorage only');
            return { error: err.message };
          }),
      ];

      await Promise.all(initPromises);

      // Mark as initialized regardless of server status
      // App works fine with just localStorage
      localStorage.setItem('dataInitialized', 'true');
      setInitialized(true);
      console.log('✅ Data initialization complete!');
      console.log('💾 App is ready - using localStorage as primary data store');
      
    } catch (error) {
      console.log('ℹ️ Server initialization skipped - app will use localStorage only');
      // Still mark as initialized because localStorage is the primary store
      localStorage.setItem('dataInitialized', 'true');
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  // This component doesn't render anything - it just initializes data
  return null;
}