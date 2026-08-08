/**
 * contentHandoff — route ANY product (physical or digital) into ANY content
 * tool in the Content Center.
 *
 * This generalizes the original Ad Studio bridge (adStudioHandoff.ts) so a
 * single "Create content with this product" action can target Ad Studio,
 * Creator Studio, Store Content Studio, or the Social Scheduler.
 *
 * Flow (identical to the Ad Studio bridge, just parameterized by target):
 *   1. A product row calls `sendProductToContentTool(product, target)`.
 *   2. The product is stashed per-target in localStorage and a window event fires.
 *   3. The Content Center hears the event, switches to the target's tab, and
 *      hands the product to that tool.
 *   4. The tool consumes the pending product on mount / when it becomes active.
 *
 * Prices are always in DOLLARS.
 */
import type { UnifiedProduct } from './useAllProducts';
import { sendProductToAdStudio } from './adStudioHandoff';

export type ContentTarget =
  | 'ad-studio'
  | 'creator-studio'
  | 'store-content'
  | 'social-scheduler';

/** Which Content Center tab each target opens. */
export const CONTENT_TARGET_TAB: Record<ContentTarget, string> = {
  'ad-studio': 'ad-studio',
  'creator-studio': 'creator-studio',
  'store-content': 'store-content',
  'social-scheduler': 'social-scheduler',
};

/** Human labels for menus/buttons. */
export const CONTENT_TARGET_LABEL: Record<ContentTarget, string> = {
  'ad-studio': 'Ad Studio',
  'creator-studio': 'Creator Studio (video)',
  'store-content': 'Store Content Studio',
  'social-scheduler': 'Social Scheduler',
};

export const CONTENT_OPEN_EVENT = 'content:open';
const keyFor = (target: ContentTarget) => `bp_content_handoff:${target}`;

export interface ContentHandoffPayload {
  target: ContentTarget;
  product: UnifiedProduct;
}

/** Stash a product for a tool and ask the Content Center to open that tool. */
export function sendProductToContentTool(product: UnifiedProduct, target: ContentTarget) {
  // Ad Studio already has a battle-tested bridge with its own payload shape;
  // reuse it so its picker pre-selects exactly as before.
  if (target === 'ad-studio') {
    sendProductToAdStudio({
      id: product.id,
      title: product.name,
      subtitle: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      badge: product.badge,
      features: Array.isArray(product.raw?.features) ? product.raw.features : [],
    });
    return;
  }

  try {
    localStorage.setItem(keyFor(target), JSON.stringify(product));
  } catch {
    /* storage may be unavailable; the event still carries the payload */
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ContentHandoffPayload>(CONTENT_OPEN_EVENT, { detail: { target, product } }),
    );
    const spaNavigate = (window as any).__navigateApp;
    if (typeof spaNavigate === 'function') {
      spaNavigate(`enterprise-content-center?tab=${CONTENT_TARGET_TAB[target]}`);
    }
  }
}

/**
 * Send ONE product to SEVERAL tools at once (e.g. spin up an ad + a social post
 * in a single click). Every target gets its own stashed payload so each tool
 * pre-selects the product when the user opens it; we navigate to the first
 * target so something is on screen immediately. Returns the queued targets.
 */
export function sendProductToContentTools(
  product: UnifiedProduct,
  targets: ContentTarget[],
): ContentTarget[] {
  const unique = Array.from(new Set(targets));
  if (unique.length === 0) return [];

  for (const target of unique) {
    if (target === 'ad-studio') continue;
    try {
      localStorage.setItem(keyFor(target), JSON.stringify(product));
    } catch {
      /* storage may be unavailable; the open event still carries the payload */
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<ContentHandoffPayload>(CONTENT_OPEN_EVENT, {
          detail: { target, product },
        }),
      );
    }
  }

  if (unique.includes('ad-studio')) {
    sendProductToAdStudio({
      id: product.id,
      title: product.name,
      subtitle: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      badge: product.badge,
      features: Array.isArray(product.raw?.features) ? product.raw.features : [],
    });
  }

  if (typeof window !== 'undefined') {
    const spaNavigate = (window as any).__navigateApp;
    if (typeof spaNavigate === 'function') {
      spaNavigate(`enterprise-content-center?tab=${CONTENT_TARGET_TAB[unique[0]]}`);
    }
  }

  return unique;
}

/**
 * Text-draft handoff into the Social Scheduler. Unlike the product handoff
 * above, this carries a ready-to-post caption (e.g. a repurposed channel post
 * or a planned calendar item) plus an optional platform + scheduled date so the
 * composer opens fully prefilled. Prices/products are not involved here.
 */
export interface SchedulerDraft {
  content: string;
  platforms?: ('facebook' | 'instagram' | 'linkedin' | 'twitter')[];
  scheduled_date?: string;
  media_url?: string;
  source?: string;
}

const SCHEDULER_DRAFT_KEY = 'bp_scheduler_draft';
const SCHEDULER_QUEUE_KEY = 'bp_scheduler_draft_queue';

/** Map a Content Studio channel id to a publishable scheduler platform (if any). */
export function channelToPlatform(
  channel: string,
): 'facebook' | 'instagram' | 'linkedin' | 'twitter' | null {
  switch (channel) {
    case 'x_thread':
      return 'twitter';
    case 'linkedin':
      return 'linkedin';
    case 'instagram':
      return 'instagram';
    case 'facebook':
      return 'facebook';
    default:
      return null; // email / youtube / tiktok aren't auto-publishable
  }
}

/** Stash a single text draft for the Social Scheduler and open that tab prefilled. */
export function sendDraftToScheduler(draft: SchedulerDraft) {
  try {
    localStorage.setItem(SCHEDULER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage may be unavailable; the event still carries the payload */
  }
  openScheduler();
}

/**
 * Queue SEVERAL drafts for the Social Scheduler at once (e.g. every publishable
 * channel from a repurposed pack). The scheduler lands each as its own draft
 * post rather than trying to cram them into a single composer.
 */
export function sendDraftsToScheduler(drafts: SchedulerDraft[]) {
  const list = (drafts || []).filter((d) => d && d.content);
  if (!list.length) return;
  try {
    localStorage.setItem(SCHEDULER_QUEUE_KEY, JSON.stringify(list));
  } catch {
    /* storage may be unavailable; the event still carries the payload */
  }
  openScheduler();
}

/** Fire the open event + SPA navigation to the Social Scheduler tab. */
function openScheduler() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(CONTENT_OPEN_EVENT, {
      detail: { target: 'social-scheduler' as ContentTarget },
    }),
  );
  const spaNavigate = (window as any).__navigateApp;
  if (typeof spaNavigate === 'function') {
    spaNavigate(`enterprise-content-center?tab=social-scheduler`);
  }
}

/** Read and clear a pending single scheduler draft (called by the scheduler). */
export function consumeSchedulerDraft(): SchedulerDraft | null {
  try {
    const raw = localStorage.getItem(SCHEDULER_DRAFT_KEY);
    if (!raw) return null;
    localStorage.removeItem(SCHEDULER_DRAFT_KEY);
    return JSON.parse(raw) as SchedulerDraft;
  } catch {
    return null;
  }
}

/** Read and clear a queued batch of scheduler drafts (called by the scheduler). */
export function consumeSchedulerDraftQueue(): SchedulerDraft[] {
  try {
    const raw = localStorage.getItem(SCHEDULER_QUEUE_KEY);
    if (!raw) return [];
    localStorage.removeItem(SCHEDULER_QUEUE_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SchedulerDraft[]) : [];
  } catch {
    return [];
  }
}

/** Read and clear the pending product for a tool (called by that tool on mount). */
export function consumeContentProduct(target: ContentTarget): UnifiedProduct | null {
  try {
    const raw = localStorage.getItem(keyFor(target));
    if (!raw) return null;
    localStorage.removeItem(keyFor(target));
    return JSON.parse(raw) as UnifiedProduct;
  } catch {
    return null;
  }
}
