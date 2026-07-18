/**
 * User Context Provider
 * Manages current user session and role-based access
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './rbac';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void; // For demo purposes
  updateUser: (updates: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user from localStorage (in production, use secure auth)
  useEffect(() => {
    const storedUser = localStorage.getItem('current_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    // Don't create a fake default user — let AuthContext drive user state
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // In production, this would call your auth API
    setIsLoading(true);
    
    // Mock login
    const mockUser: User = {
      id: 'user-' + Date.now(),
      email,
      name: email.split('@')[0],
      role: UserRole.PLATFORM_OWNER,
      tenant_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    
    setUser(mockUser);
    localStorage.setItem('current_user', JSON.stringify(mockUser));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
  };

  const switchRole = (role: UserRole) => {
    if (!user) return;

    console.log(`🔄 UserContext: Switching role from ${user.role} to ${role}`);

    const updatedUser: User = {
      ...user,
      role,
      tenant_id: role === UserRole.PLATFORM_OWNER ? null : `tenant-${role}-001`,
      territory_ids: role === UserRole.TERRITORY_ADMIN ? ['TERR-001'] : undefined,
      cohort_id: role !== UserRole.PLATFORM_OWNER ? 'cohort-001' : undefined,
    };

    setUser(updatedUser);
    localStorage.setItem('current_user', JSON.stringify(updatedUser));

    // Set a flag to indicate we're in the middle of a role switch
    sessionStorage.setItem('role_switching', 'true');

    console.log(`✅ UserContext: Role updated to ${role}`);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('current_user', JSON.stringify(updatedUser));
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        switchRole,
        updateUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
