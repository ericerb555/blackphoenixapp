/**
 * Navigation Context
 * Provides navigation function to all components without page reloads
 */

import { createContext, useContext } from 'react';

interface NavigationContextType {
  navigate: (page: string) => void;
}

export const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    // Fallback to basic navigation if context not available
    return {
      navigate: (page: string) => {
        const path = page.startsWith('/') ? page : `/${page}`;
        window.location.href = path;
      }
    };
  }
  return context;
}
