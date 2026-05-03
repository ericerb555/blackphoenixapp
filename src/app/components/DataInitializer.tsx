import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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
    // Check if we're in demo mode - skip initialization
    const isDemoMode = localStorage.getItem('demo_mode') === 'true';
    if (isDemoMode) {
      console.log('🎭 Demo mode detected - skipping server data initialization');
      setLoading(false);
      setInitialized(true);
      return;
    }
    
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
    console.log('🌱 Starting data initialization...');
    console.log('💾 This app uses localStorage as primary data store - server init is optional');
    
    try {
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
      const headers = {
        'Authorization': `Bearer ${publicAnonKey}`,
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