/**
 * useNavigate Hook
 * Custom navigation hook for routing within the application
 */

import { useNavigationContext } from '../contexts/NavigationContext';

export function useNavigate() {
  const { navigate } = useNavigationContext();
  return navigate;
}
