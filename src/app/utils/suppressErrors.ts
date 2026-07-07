// Error Suppression Utility
// This file must be imported FIRST in the app to suppress non-critical errors

// Suppress all lock-related errors globally
if (typeof window !== 'undefined') {
  // Override console.error IMMEDIATELY
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (
      message.includes('Lock') ||
      message.includes('AbortError') ||
      message.includes('steal') ||
      message.includes('was released because')
    ) {
      // Silently ignore - these are non-critical
      return;
    }
    originalError.apply(console, args);
  };

  // Override console.warn IMMEDIATELY
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (
      message.includes('Lock') ||
      message.includes('steal') ||
      message.includes('was released')
    ) {
      // Silently ignore
      return;
    }
    originalWarn.apply(console, args);
  };

  // Suppress unhandled promise rejections for lock errors
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason);
    
    if (
      message.includes('Lock') ||
      message.includes('AbortError') ||
      message.includes('steal') ||
      message.includes('was released because')
    ) {
      event.preventDefault();
      return;
    }
  });

  // Suppress window errors for lock issues
  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    
    if (
      message.includes('Lock') ||
      message.includes('AbortError') ||
      message.includes('steal') ||
      message.includes('was released because')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });
}

export {};
