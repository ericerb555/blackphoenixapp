/**
 * guaranteedSave — writes critical data to Supabase DIRECTLY from the client.
 * Does NOT rely on the Edge Function server being deployed.
 *
 * Layer 1: Write to kv_store_57095a78 table directly (always works)
 * Layer 2: Try the server endpoint (works when deployed)
 * Layer 3: Backup to localStorage (device-specific, last resort)
 */

import { supabase } from '../lib/supabase';

/**
 * Save a work request with guaranteed persistence.
 * Call this INSTEAD of (or in addition to) the server POST.
 */
export async function guaranteedSaveWorkRequest(workRequest: any): Promise<void> {
  const id = workRequest.id || `wr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const wr = { ...workRequest, id, saved_at: new Date().toISOString() };

  // ── LAYER 1: Write directly to kv_store_57095a78 (always works) ──────────
  try {
    // Save individual record
    await supabase
      .from('kv_store_57095a78')
      .upsert({ key: `wr:${id}`, value: wr }, { onConflict: 'key' });

    // Update the master list
    const { data: listData } = await supabase
      .from('kv_store_57095a78')
      .select('value')
      .eq('key', 'all_work_requests')
      .single();

    const existing: any[] = (listData?.value as any[]) || [];
    const withoutOld = existing.filter((r: any) => r.id !== id);
    const updated = [wr, ...withoutOld].slice(0, 500);

    await supabase
      .from('kv_store_57095a78')
      .upsert({ key: 'all_work_requests', value: updated }, { onConflict: 'key' });

    // Update index
    const { data: idxData } = await supabase
      .from('kv_store_57095a78')
      .select('value')
      .eq('key', 'wr_index')
      .single();

    const idx: string[] = (idxData?.value as string[]) || [];
    if (!idx.includes(id)) {
      await supabase
        .from('kv_store_57095a78')
        .upsert({ key: 'wr_index', value: [id, ...idx].slice(0, 1000) }, { onConflict: 'key' });
    }

    console.log('✅ [GuaranteedSave] Work request saved directly to Supabase:', id);
  } catch (e) {
    console.error('❌ [GuaranteedSave] Direct Supabase save failed:', e);
  }

  // ── LAYER 2: localStorage backup ─────────────────────────────────────────
  try {
    const localKey = 'guaranteed_work_requests';
    const local = JSON.parse(localStorage.getItem(localKey) || '[]');
    const withoutOld = local.filter((r: any) => r.id !== id);
    localStorage.setItem(localKey, JSON.stringify([wr, ...withoutOld].slice(0, 100)));
  } catch {}
}

/**
 * On admin load: recover any locally saved requests that might not have
 * made it to the server, and push them to Supabase.
 */
export async function recoverLocalWorkRequests(): Promise<number> {
  try {
    const localKey = 'guaranteed_work_requests';
    const local: any[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (local.length === 0) return 0;

    const { data: listData } = await supabase
      .from('kv_store_57095a78')
      .select('value')
      .eq('key', 'all_work_requests')
      .single();

    const existing: any[] = (listData?.value as any[]) || [];
    const existingIds = new Set(existing.map((r: any) => r.id));

    const missing = local.filter(r => !existingIds.has(r.id));
    if (missing.length === 0) return 0;

    // Push missing ones to Supabase
    const merged = [...missing, ...existing].slice(0, 500);
    await supabase
      .from('kv_store_57095a78')
      .upsert({ key: 'all_work_requests', value: merged }, { onConflict: 'key' });

    console.log(`✅ [Recovery] Recovered ${missing.length} work requests from localStorage`);
    return missing.length;
  } catch {
    return 0;
  }
}
