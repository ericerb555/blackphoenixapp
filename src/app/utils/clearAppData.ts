/**
 * Utility to clear all app data and force re-initialization
 * This is useful when the app isn't populating with data
 * 
 * Usage in browser console:
 * ```
 * import('/utils/clearAppData.ts').then(m => m.clearAndReload())
 * ```
 * 
 * Or add a button in the UI that calls this function
 */

export function clearAndReload() {
  console.log('🗑️ Clearing all app data...');
  
  // Clear localStorage
  localStorage.clear();
  console.log('✅ localStorage cleared');
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
  
  // Clear all cookies
  document.cookie.split(';').forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });
  console.log('✅ Cookies cleared');
  
  console.log('🔄 Reloading app...');
  
  // Force hard reload
  window.location.reload();
}

export function checkDataStatus() {
  console.log('📊 App Data Status:');
  console.log('==================');
  console.log('dataInitialized:', localStorage.getItem('dataInitialized'));
  console.log('demo_mode:', localStorage.getItem('demo_mode'));
  console.log('rememberMe:', localStorage.getItem('rememberMe'));
  console.log('lastEmail:', localStorage.getItem('lastEmail'));
  console.log('==================');
  console.log('Total localStorage items:', localStorage.length);
}

export function forceReinitialize() {
  console.log('🔄 Forcing data re-initialization...');
  localStorage.removeItem('dataInitialized');
  console.log('✅ Removed dataInitialized flag');
  console.log('🔄 Reload the page to trigger re-initialization');
  window.location.reload();
}

// Make functions available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).clearAndReload = clearAndReload;
  (window as any).checkDataStatus = checkDataStatus;
  (window as any).forceReinitialize = forceReinitialize;
  
  console.log('🛠️ Debug utilities loaded:');
  console.log('  - clearAndReload() - Clear all data and reload');
  console.log('  - checkDataStatus() - Check initialization status');
  console.log('  - forceReinitialize() - Force data re-initialization');
}
