/**
 * adStudioHandoff — a tiny cross-component bridge that lets any product list
 * (digital products, the ecommerce store, dropshipper inventory, etc.) hand a
 * single product off to the Ad Studio in the Content Center.
 *
 * Flow:
 *   1. A product row calls `sendProductToAdStudio(product)`.
 *   2. The product is stashed in localStorage and a window event is fired.
 *   3. The Content Center hears the event and switches to the Ad Studio tab.
 *   4. Ad Studio consumes the pending product on mount, injects it into its
 *      picker, and pre-selects it — ready to customize immediately.
 *
 * Prices are always passed in DOLLARS so the receiver never has to guess units.
 */

export interface PendingAdProduct {
  id: string;
  title: string;
  subtitle?: string;
  price?: number; // dollars
  originalPrice?: number; // dollars
  image?: string;
  badge?: string;
  features?: string[];
}

const KEY = 'bp_adstudio_pending';
export const AD_STUDIO_OPEN_EVENT = 'adstudio:open';

/** Stash a product and ask the Content Center to open Ad Studio with it. */
export function sendProductToAdStudio(product: PendingAdProduct) {
  try {
    localStorage.setItem(KEY, JSON.stringify(product));
  } catch {
    /* storage may be unavailable; the event still carries the payload */
  }
  if (typeof window !== 'undefined') {
    // If the Content Center is already mounted, this switches it to Ad Studio
    // instantly (no navigation).
    window.dispatchEvent(new CustomEvent(AD_STUDIO_OPEN_EVENT, { detail: product }));
    // If we're on another page, route to the Content Center's Ad Studio tab via
    // the app's SPA navigator. The pending product survives in storage, so
    // Ad Studio picks it up once it mounts.
    const spaNavigate = (window as any).__navigateApp;
    if (typeof spaNavigate === 'function') {
      spaNavigate('enterprise-content-center?tab=ad-studio');
    }
  }
}

/** Read and clear the pending product (called by Ad Studio on mount). */
export function consumePendingAdProduct(): PendingAdProduct | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    return JSON.parse(raw) as PendingAdProduct;
  } catch {
    return null;
  }
}
