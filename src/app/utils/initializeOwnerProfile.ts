/**
 * Initialize Owner Profile
 *
 * Ensures the platform owner (Eric Erb) has a properly configured profile
 * with all correct details on app startup.
 */

export interface UserProfile {
  email: string;
  fullName: string;
  phone?: string;
  createdAt: string;
  accountType: 'owner' | 'admin' | 'master_admin' | 'management' | 'customer' | 'vendor' | 'subcontractor' | 'advertiser' | 'investor' | 'employee';
  status: 'active' | 'inactive';
}

const OWNER_PROFILE: UserProfile = {
  email: 'ericerb555@proton.me',
  fullName: 'Eric Erb',
  phone: '6177100058',
  createdAt: '2024-01-01T00:00:00.000Z', // Platform creation date
  accountType: 'owner',
  status: 'active'
};

/**
 * Initialize or update the owner profile in localStorage
 * This runs on app startup to ensure the owner always has proper access
 */
export function initializeOwnerProfile(): void {
  try {
    // Load existing profiles
    const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');

    // Check if owner profile exists
    const ownerEmail = OWNER_PROFILE.email.toLowerCase();
    const existingProfile = userProfiles[ownerEmail];

    if (existingProfile) {
      // Update existing profile to ensure all fields are correct
      userProfiles[ownerEmail] = {
        ...existingProfile,
        fullName: OWNER_PROFILE.fullName,
        phone: OWNER_PROFILE.phone,
        accountType: 'owner', // Ensure always owner
        status: 'active'
      };
      console.log('✅ Owner profile updated:', userProfiles[ownerEmail]);
    } else {
      // Create new owner profile
      userProfiles[ownerEmail] = OWNER_PROFILE;
      console.log('✅ Owner profile created:', OWNER_PROFILE);
    }

    // Save back to localStorage
    localStorage.setItem('userProfiles', JSON.stringify(userProfiles));

    // Never create an authenticated or demo session here. This utility may seed
    // a legacy owner profile for display, but real access must come only from
    // the Supabase session and server-verified role. Auto-populating a current
    // profile or demo_mode can suppress the auth listener and cause login/
    // onboarding routing to use stale browser state.
    const currentUserProfile = localStorage.getItem('currentUserProfile');
    if (currentUserProfile) {
      try {
        const current = JSON.parse(currentUserProfile);
        if (current.email?.toLowerCase() === ownerEmail && current.accountType !== 'owner') {
          localStorage.setItem('currentUserProfile', JSON.stringify({ ...current, accountType: 'owner' }));
        }
      } catch { /* A corrupt legacy cache must not affect real authentication. */ }
    }
    // Remove the legacy demo flag created by older builds. RoleSwitcher remains
    // a view-only tester and cannot disable real auth state updates.
    localStorage.removeItem('demo_mode');

    console.log('🔧 Owner profile initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing owner profile:', error);
  }
}

/**
 * Get the owner profile
 */
export function getOwnerProfile(): UserProfile | null {
  try {
    const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
    return userProfiles[OWNER_PROFILE.email.toLowerCase()] || null;
  } catch (error) {
    console.error('❌ Error getting owner profile:', error);
    return null;
  }
}

/**
 * Check if a user is the platform owner
 */
export function isOwner(email: string): boolean {
  return email.toLowerCase() === OWNER_PROFILE.email.toLowerCase();
}
