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

    // CRITICAL: Auto-login owner if no current user is logged in
    const currentUserProfile = localStorage.getItem('currentUserProfile');
    if (!currentUserProfile) {
      console.log('👑 No current user - auto-logging in owner');
      localStorage.setItem('currentUserProfile', JSON.stringify(userProfiles[ownerEmail]));
      localStorage.setItem('demo_mode', 'true'); // Enable demo mode for owner
    } else {
      // Check if current user is owner email - fix account type if wrong
      try {
        const current = JSON.parse(currentUserProfile);
        if (current.email?.toLowerCase() === ownerEmail) {
          if (current.accountType !== 'owner') {
            console.log('👑 Current user is owner but wrong accountType - fixing');
            current.accountType = 'owner';
            current.fullName = OWNER_PROFILE.fullName;
            current.phone = OWNER_PROFILE.phone;
            localStorage.setItem('currentUserProfile', JSON.stringify(current));
          }
        }
      } catch (e) {
        console.error('Error checking current user:', e);
      }
    }

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
