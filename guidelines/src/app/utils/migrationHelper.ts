/**
 * Migration Helper
 * Automatically fixes user profiles on app load
 */

export function migrateUserProfiles() {
  try {
    const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
    const currentProfile = localStorage.getItem('currentUserProfile');

    // Get all users
    const allUsers = Object.keys(userProfiles);

    // Check if there's an owner
    const hasOwner = allUsers.some(email => {
      const user = userProfiles[email];
      return user.accountType === 'owner' || user.accountType === 'admin' || user.accountType === 'master_admin';
    });

    // If only one user or no owner exists, make the first user an owner
    if (allUsers.length === 1 || !hasOwner) {
      const firstUserEmail = allUsers[0];
      const firstUser = userProfiles[firstUserEmail];

      if (firstUser && firstUser.accountType !== 'owner') {
        console.log('🔄 [Migration] Upgrading first user to owner:', firstUserEmail);
        firstUser.accountType = 'owner';

        // Ensure they have a proper name
        if (!firstUser.fullName || firstUser.fullName === 'User') {
          firstUser.fullName = firstUserEmail.split('@')[0].charAt(0).toUpperCase() + firstUserEmail.split('@')[0].slice(1);
        }

        userProfiles[firstUserEmail] = firstUser;
        localStorage.setItem('userProfiles', JSON.stringify(userProfiles));

        // Update currentUserProfile if it matches
        if (currentProfile) {
          try {
            const current = JSON.parse(currentProfile);
            if (current.email === firstUserEmail) {
              localStorage.setItem('currentUserProfile', JSON.stringify(firstUser));
              console.log('✅ [Migration] Updated currentUserProfile to owner');
            }
          } catch (e) {
            console.error('Error updating currentUserProfile:', e);
          }
        }

        return true; // Migration happened
      }
    }

    // Ensure all profiles have proper fullName
    let updated = false;
    allUsers.forEach(email => {
      const user = userProfiles[email];
      if (!user.fullName || user.fullName === 'User') {
        user.fullName = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
        userProfiles[email] = user;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
      console.log('✅ [Migration] Updated user names');
    }

    return updated;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}
