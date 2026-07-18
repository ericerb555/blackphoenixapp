/**
 * User-specific data storage hook
 * Provides isolated data storage per user account for any portal
 *
 * Usage:
 * const [data, setData] = useUserData<MyDataType>('keyName', initialValue);
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function useUserData<T>(
  storageKey: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const { user } = useAuth();
  const [data, setDataState] = useState<T>(initialValue);

  // Load user-specific data from localStorage
  useEffect(() => {
    if (!user?.id) {
      setDataState(initialValue);
      return;
    }

    const userStorageKey = `${storageKey}_${user.id}`;
    const storedData = localStorage.getItem(userStorageKey);

    if (storedData) {
      try {
        setDataState(JSON.parse(storedData));
      } catch (error) {
        console.error(`Error loading ${storageKey} for user ${user.id}:`, error);
        setDataState(initialValue);
      }
    } else {
      setDataState(initialValue);
    }
  }, [user?.id, storageKey]);

  // Save data to localStorage when it changes
  useEffect(() => {
    if (!user?.id) return;

    const userStorageKey = `${storageKey}_${user.id}`;
    localStorage.setItem(userStorageKey, JSON.stringify(data));
  }, [data, user?.id, storageKey]);

  const setData = (value: T | ((prev: T) => T)) => {
    setDataState(value);
  };

  return [data, setData];
}

/**
 * Hook for user-specific referral code
 * Generates and persists a unique referral code per user
 */
export function useReferralCode(): string {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (!user?.id) {
      setReferralCode('');
      return;
    }

    const codeKey = `referralCode_${user.id}`;
    const storedCode = localStorage.getItem(codeKey);

    if (storedCode) {
      setReferralCode(storedCode);
    } else {
      const newCode = 'REFER-' + Math.random().toString(36).substr(2, 8).toUpperCase();
      localStorage.setItem(codeKey, newCode);
      setReferralCode(newCode);
    }
  }, [user?.id]);

  return referralCode;
}
