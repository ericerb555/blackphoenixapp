import { projectId } from "./supabase/info";
import { supabase } from "../lib/supabase";
const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
export async function loadEntitlementSummary(params: { owner?: string; email?: string; portalType?: string }) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][]);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to view plan balances.');
  const response = await fetch(`${BASE}/entitlements-summary?${query}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Could not load plan balance");
  return data;
}
