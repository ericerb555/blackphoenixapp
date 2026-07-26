/**
 * Push Notification utilities
 * Handles service worker registration, push subscription, and sending pushes.
 */

import { projectId, publicAnonKey } from './supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** Register the service worker */
async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await reg.update();
    return reg;
  } catch (e) {
    console.warn('[Push] SW registration failed:', e);
    return null;
  }
}

/** Convert VAPID base64 public key to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

/** Request permission and subscribe to push notifications */
export async function subscribeToPush(userId?: string, userEmail?: string, userRole = 'customer'): Promise<boolean> {
  try {
    // 1. Check support
    if (!('Notification' in window) || !('PushManager' in window)) {
      console.log('[Push] Not supported in this browser');
      return false;
    }

    // 2. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Permission denied');
      return false;
    }

    // 3. Register SW
    const reg = await registerSW();
    if (!reg) return false;

    // 4. Get VAPID public key from server
    const keyRes = await fetch(`${SERVER}/notifications/push/vapid-key`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!keyRes.ok) {
      console.warn('[Push] VAPID key not available — push not configured yet');
      return false;
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    // 5. Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // 6. Save subscription to server
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || publicAnonKey;
    await fetch(`${SERVER}/notifications/push/subscribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId, userEmail, userRole }),
    });

    console.log('✅ [Push] Subscribed successfully');
    localStorage.setItem('push_subscribed', 'true');
    return true;
  } catch (e) {
    console.warn('[Push] Subscription failed:', e);
    return false;
  }
}

/** Check if already subscribed */
export function isPushSubscribed(): boolean {
  return localStorage.getItem('push_subscribed') === 'true';
}

/** Send a push notification to a user (called from frontend for same-device) */
export async function sendPushNotification(params: {
  userId?: string;
  userEmail?: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || publicAnonKey;
    await fetch(`${SERVER}/notifications/push/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (e) {
    console.warn('[Push] Send failed:', e);
  }
}

/** Initialize push for the current user on app load */
export async function initPushForUser(userId?: string, userEmail?: string, role = 'customer'): Promise<void> {
  // Don't auto-prompt — only subscribe if user has previously agreed or explicitly clicks
  if (!isPushSubscribed()) return;

  // Re-register subscription in case it expired
  await subscribeToPush(userId, userEmail, role);
}
