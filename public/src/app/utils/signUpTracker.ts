/**
 * Sign-up tracking utility
 * Dispatches events when users complete sign-ups
 */

export type SignUpType = 'customer' | 'subcontractor' | 'advertiser' | 'vendor';

export function trackSignUp(type: SignUpType) {
  console.log('📊 Tracking sign-up:', type);

  // Dispatch custom event
  const event = new CustomEvent('signUpCompleted', {
    detail: { type }
  });
  window.dispatchEvent(event);

  // Also save to localStorage as backup
  const key = `signUpCount_${type}s`;
  const current = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, (current + 1).toString());
}
