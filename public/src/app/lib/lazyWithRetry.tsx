/**
 * Lazy Load Retry Utility
 * Retries failed dynamic imports with exponential backoff
 */

import React from 'react';

export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string = 'Component'
) {
  return React.lazy(async () => {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Loading ${componentName} (attempt ${attempt + 1}/${maxRetries})...`);
        const module = await componentImport();
        console.log(`✅ Successfully loaded ${componentName}`);
        return module;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Failed to load ${componentName} (attempt ${attempt + 1}/${maxRetries}):`, error);

        // If this is a network error or chunk load error, retry
        const isRetryableError =
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('dynamically imported module') ||
          error.name === 'ChunkLoadError' ||
          error.message?.includes('Loading chunk');

        if (!isRetryableError || attempt === maxRetries - 1) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If all retries failed, throw the error
    console.error(`🚫 All ${maxRetries} attempts to load ${componentName} failed`);
    throw lastError || new Error(`Failed to load ${componentName}`);
  });
}
