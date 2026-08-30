/**
 * Rotation Content System - Data Models & Helper Functions
 * Uses kv_store with prefixed keys for organization
 */

import * as kv from './kv_store.tsx';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ContentStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'paused' | 'expired';
export type AdvertiserType = 'subcontractor' | 'advertiser' | 'vendor';
export type ContentTier = 'basic' | 'premium' | 'featured';
export type ContentType = 'banner' | 'card' | 'spotlight' | 'sidebar';

export interface RotationContent {
  id: string;
  advertiser_id: string;
  advertiser_type: AdvertiserType;
  advertiser_name: string;
  content_type: ContentType;
  title: string;
  description: string;
  image_url?: string;
  link_url?: string;
  service_category: string; // roofing, plumbing, HVAC, electrical, etc.
  geographic_zones: string[]; // zip codes or city names
  status: ContentStatus;
  tier: ContentTier;
  weight: number; // 1 = basic, 3 = premium, 5 = featured
  ai_score?: number; // 0-100 quality score from AI
  ai_reasoning?: string; // Why AI suggested this tier/weight
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  created_at: string;
  approved_at?: string;
  approved_by?: string; // admin user id
  rejection_reason?: string;
}

export interface ImpressionTracking {
  content_id: string;
  impressions_count: number;
  clicks_count: number;
  last_shown_at?: string;
  ctr: number; // click-through rate (clicks / impressions)
  created_at: string;
  updated_at: string;
}

export interface ApprovalLog {
  content_id: string;
  admin_id: string;
  admin_name: string;
  action: 'approved' | 'rejected';
  ai_suggestion?: {
    tier: ContentTier;
    weight: number;
    score: number;
    reasoning: string;
  };
  final_tier: ContentTier;
  final_weight: number;
  notes?: string;
  timestamp: string;
}

// ============================================================================
// KV STORE KEY PATTERNS
// ============================================================================

const KEYS = {
  content: (id: string) => `rotation_content:${id}`,
  impressions: (contentId: string) => `rotation_impressions:${contentId}`,
  approvalLog: (contentId: string) => `rotation_approval_log:${contentId}`,
  pendingList: 'rotation_pending_ids',
  activeList: 'rotation_active_ids',
};

// ============================================================================
// CONTENT CRUD OPERATIONS
// ============================================================================

/**
 * Create new rotation content (starts in pending status)
 */
export async function createRotationContent(
  content: Omit<RotationContent, 'id' | 'created_at' | 'status'>
): Promise<RotationContent> {
  const id = `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newContent: RotationContent = {
    ...content,
    id,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  await kv.set(KEYS.content(id), newContent);
  
  // Add to pending list
  const pendingIds = (await kv.get(KEYS.pendingList)) || [];
  if (!pendingIds.includes(id)) {
    pendingIds.push(id);
    await kv.set(KEYS.pendingList, pendingIds);
  }

  return newContent;
}

/**
 * Get rotation content by ID
 */
export async function getRotationContent(id: string): Promise<RotationContent | null> {
  return await kv.get(KEYS.content(id));
}

/**
 * Update rotation content
 */
export async function updateRotationContent(
  id: string,
  updates: Partial<RotationContent>
): Promise<RotationContent | null> {
  const existing = await getRotationContent(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  await kv.set(KEYS.content(id), updated);
  return updated;
}

/**
 * Delete rotation content
 */
export async function deleteRotationContent(id: string): Promise<boolean> {
  await kv.del(KEYS.content(id));
  await kv.del(KEYS.impressions(id));
  await kv.del(KEYS.approvalLog(id));
  
  // Remove from lists
  await removeFromList(KEYS.pendingList, id);
  await removeFromList(KEYS.activeList, id);
  
  return true;
}

// ============================================================================
// CONTENT QUERIES
// ============================================================================

/**
 * Get all pending content awaiting approval
 */
export async function getPendingContent(): Promise<RotationContent[]> {
  const pendingIds = (await kv.get(KEYS.pendingList)) || [];
  const contentPromises = pendingIds.map(id => getRotationContent(id));
  const content = await Promise.all(contentPromises);
  return content.filter(c => c !== null) as RotationContent[];
}

/**
 * Get all active content (approved and within date range)
 */
export async function getActiveContent(): Promise<RotationContent[]> {
  const activeIds = (await kv.get(KEYS.activeList)) || [];
  const contentPromises = activeIds.map(id => getRotationContent(id));
  const content = await Promise.all(contentPromises);
  
  const now = new Date().toISOString();
  return content.filter(c => {
    if (!c) return false;
    if (c.status !== 'active') return false;
    if (c.start_date && c.start_date > now) return false;
    if (c.end_date && c.end_date < now) return false;
    return true;
  }) as RotationContent[];
}

/**
 * Get content by advertiser
 */
export async function getContentByAdvertiser(advertiserId: string): Promise<RotationContent[]> {
  const allContent = await kv.getByPrefix('rotation_content:');
  return allContent.filter(c => c.advertiser_id === advertiserId);
}

/**
 * Get content by status
 */
export async function getContentByStatus(status: ContentStatus): Promise<RotationContent[]> {
  const allContent = await kv.getByPrefix('rotation_content:');
  return allContent.filter(c => c.status === status);
}

// ============================================================================
// IMPRESSION TRACKING
// ============================================================================

/**
 * Get impression tracking for content
 */
export async function getImpressions(contentId: string): Promise<ImpressionTracking> {
  const existing = await kv.get(KEYS.impressions(contentId));
  if (existing) return existing;

  // Create new tracking record
  const newTracking: ImpressionTracking = {
    content_id: contentId,
    impressions_count: 0,
    clicks_count: 0,
    ctr: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.impressions(contentId), newTracking);
  return newTracking;
}

/**
 * Record an impression
 */
export async function recordImpression(contentId: string): Promise<void> {
  const tracking = await getImpressions(contentId);
  tracking.impressions_count += 1;
  tracking.last_shown_at = new Date().toISOString();
  tracking.updated_at = new Date().toISOString();
  tracking.ctr = tracking.impressions_count > 0 
    ? tracking.clicks_count / tracking.impressions_count 
    : 0;
  
  await kv.set(KEYS.impressions(contentId), tracking);
}

/**
 * Record a click
 */
export async function recordClick(contentId: string): Promise<void> {
  const tracking = await getImpressions(contentId);
  tracking.clicks_count += 1;
  tracking.updated_at = new Date().toISOString();
  tracking.ctr = tracking.impressions_count > 0 
    ? tracking.clicks_count / tracking.impressions_count 
    : 0;
  
  await kv.set(KEYS.impressions(contentId), tracking);
}

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

/**
 * Approve content and move to active
 */
export async function approveContent(
  contentId: string,
  adminId: string,
  adminName: string,
  tier: ContentTier,
  weight: number,
  aiSuggestion?: ApprovalLog['ai_suggestion'],
  notes?: string
): Promise<RotationContent | null> {
  const content = await getRotationContent(contentId);
  if (!content) return null;

  // Update content
  const updated = await updateRotationContent(contentId, {
    status: 'active',
    tier,
    weight,
    approved_at: new Date().toISOString(),
    approved_by: adminId,
  });

  // Move from pending to active list
  await removeFromList(KEYS.pendingList, contentId);
  await addToList(KEYS.activeList, contentId);

  // Create approval log
  const log: ApprovalLog = {
    content_id: contentId,
    admin_id: adminId,
    admin_name: adminName,
    action: 'approved',
    ai_suggestion: aiSuggestion,
    final_tier: tier,
    final_weight: weight,
    notes,
    timestamp: new Date().toISOString(),
  };
  await kv.set(KEYS.approvalLog(contentId), log);

  return updated;
}

/**
 * Reject content
 */
export async function rejectContent(
  contentId: string,
  adminId: string,
  adminName: string,
  reason: string,
  aiSuggestion?: ApprovalLog['ai_suggestion']
): Promise<RotationContent | null> {
  const content = await getRotationContent(contentId);
  if (!content) return null;

  // Update content
  const updated = await updateRotationContent(contentId, {
    status: 'rejected',
    rejection_reason: reason,
  });

  // Remove from pending list
  await removeFromList(KEYS.pendingList, contentId);

  // Create approval log
  const log: ApprovalLog = {
    content_id: contentId,
    admin_id: adminId,
    admin_name: adminName,
    action: 'rejected',
    ai_suggestion: aiSuggestion,
    final_tier: content.tier,
    final_weight: content.weight,
    notes: reason,
    timestamp: new Date().toISOString(),
  };
  await kv.set(KEYS.approvalLog(contentId), log);

  return updated;
}

/**
 * Get approval log for content
 */
export async function getApprovalLog(contentId: string): Promise<ApprovalLog | null> {
  return await kv.get(KEYS.approvalLog(contentId));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function addToList(listKey: string, id: string): Promise<void> {
  const list = (await kv.get(listKey)) || [];
  if (!list.includes(id)) {
    list.push(id);
    await kv.set(listKey, list);
  }
}

async function removeFromList(listKey: string, id: string): Promise<void> {
  const list = (await kv.get(listKey)) || [];
  const filtered = list.filter(item => item !== id);
  await kv.set(listKey, filtered);
}

/**
 * Helper to calculate tier weight multiplier
 */
export function getTierWeight(tier: ContentTier): number {
  const weights = {
    basic: 1,
    premium: 3,
    featured: 5,
  };
  return weights[tier];
}

/**
 * Helper to validate content dates
 */
export function isContentActive(content: RotationContent): boolean {
  if (content.status !== 'active') return false;
  
  const now = new Date().toISOString();
  if (content.start_date && content.start_date > now) return false;
  if (content.end_date && content.end_date < now) return false;
  
  return true;
}
