/**
 * Offline Mode Info Component
 * Shows in console and UI when app is in offline mode
 */

// Initialize offline mode detection
export const initOfflineModeDetection = () => {
  const checkServerStatus = async () => {
    // Check if in demo mode - skip server check
    const isDemoMode = localStorage.getItem('demo_mode') === 'true';
    
    if (isDemoMode) {
      console.log('%c🎭 DEMO MODE', 'background: #8b5cf6; color: white; font-size: 16px; padding: 8px; border-radius: 4px; font-weight: bold;');
      console.log('%cℹ️ App is running in demo mode with mock data', 'color: #8b5cf6; font-size: 14px;');
      return true; // Consider "online" in demo mode
    }
    
    try {
      const projectId = 'plzsvzwwcdopnawtiwzm';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/health`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        console.log('%c⚠️ OFFLINE MODE', 'background: #ea580c; color: white; font-size: 16px; padding: 8px; border-radius: 4px; font-weight: bold;');
        console.log('%cℹ️ Server not deployed - App is working with localStorage', 'color: #ea580c; font-size: 14px;');
        console.log('%c📦 To deploy server:', 'color: #f59e0b; font-size: 12px;');
        console.log('%csupabase functions deploy server', 'background: #1a1a1a; color: #22c55e; font-family: monospace; padding: 4px 8px; margin-top: 4px;');
        return false;
      }
      
      console.log('%c✅ ONLINE MODE', 'background: #22c55e; color: white; font-size: 16px; padding: 8px; border-radius: 4px; font-weight: bold;');
      console.log('%cℹ️ Server is deployed and running', 'color: #22c55e; font-size: 14px;');
      return true;
    } catch (error) {
      console.log('%c⚠️ OFFLINE MODE', 'background: #ea580c; color: white; font-size: 16px; padding: 8px; border-radius: 4px; font-weight: bold;');
      console.log('%cℹ️ Cannot reach server - App is working with localStorage', 'color: #ea580c; font-size: 14px;');
      return false;
    }
  };
  
  // Run check on page load
  checkServerStatus();
};