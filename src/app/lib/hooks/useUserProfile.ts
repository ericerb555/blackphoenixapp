/**
 * User Profile Management Hook
 * Handles saving and loading user profile data to/from localStorage
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface UserProfile {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  businessName?: string;
  accountType?: string;
  createdAt: string;
}

/**
 * Save user profile to localStorage
 */
export function saveUserProfile(email: string, profile: UserProfile) {
  const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
  userProfiles[email.toLowerCase()] = {
    ...profile,
    email: email,
    createdAt: profile.createdAt || new Date().toISOString(),
  };
  localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
  console.log('✅ Saved user profile:', email);
}

/**
 * Load user profile from localStorage
 */
export function loadUserProfile(email: string): UserProfile | null {
  const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
  return userProfiles[email.toLowerCase()] || null;
}

/**
 * Hook to get current user's profile
 */
export function useUserProfile(): {
  profile: UserProfile | null;
  updateProfile: (data: Partial<UserProfile>) => void;
  displayName: string;
} {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // First try to load from currentUserProfile (set during login)
    const currentProfile = localStorage.getItem('currentUserProfile');
    if (currentProfile) {
      try {
        const parsed = JSON.parse(currentProfile);
        setProfile(parsed);
        console.log('✅ [useUserProfile] Loaded from currentUserProfile:', parsed);
        return;
      } catch (e) {
        console.error('Error parsing currentUserProfile:', e);
      }
    }

    // Fallback to loading by email from userProfiles
    if (user?.email) {
      const loadedProfile = loadUserProfile(user.email);
      setProfile(loadedProfile);
      console.log('✅ [useUserProfile] Loaded from userProfiles:', loadedProfile);
    } else {
      setProfile(null);
    }
  }, [user?.email]);

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!profile?.email && !user?.email) return;

    const email = profile?.email || user?.email || '';
    const updated = {
      ...profile,
      ...data,
      email: email,
      createdAt: profile?.createdAt || new Date().toISOString(),
    } as UserProfile;

    saveUserProfile(email, updated);
    localStorage.setItem('currentUserProfile', JSON.stringify(updated));
    setProfile(updated);
  };

  const displayName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  console.log('👤 [useUserProfile] displayName:', displayName, 'fullName:', profile?.fullName);

  return { profile, updateProfile, displayName };
}
