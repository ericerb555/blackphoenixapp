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
    if (!user?.email) {
      setProfile(null);
      return;
    }

    // Use email-scoped key — same pattern used in Login.tsx
    const scopedKey = `currentUserProfile_${user.email.toLowerCase()}`;
    const currentProfile = localStorage.getItem(scopedKey);
    if (currentProfile) {
      try {
        const parsed = JSON.parse(currentProfile);
        // Safety: confirm profile belongs to this user before using it
        if (parsed.email?.toLowerCase() === user.email.toLowerCase()) {
          setProfile(parsed);
          return;
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    // Fallback: load by email from userProfiles object
    const loadedProfile = loadUserProfile(user.email);
    setProfile(loadedProfile);
  }, [user?.id, user?.email]);

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
    const scopedKey = `currentUserProfile_${email.toLowerCase()}`;
    localStorage.setItem(scopedKey, JSON.stringify(updated));
    setProfile(updated);
  };

  const displayName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  console.log('👤 [useUserProfile] displayName:', displayName, 'fullName:', profile?.fullName);

  return { profile, updateProfile, displayName };
}
