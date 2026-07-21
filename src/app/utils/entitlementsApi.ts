import { projectId, publicAnonKey } from "./supabase/info";
const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
export async function loadEntitlementSummary(params: { owner?: string; email?: string; portalType?: string }) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][]);
  const response = await fetch(`${BASE}/entitlements-summary?${query}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Could not load plan balance");
  return data;
}
