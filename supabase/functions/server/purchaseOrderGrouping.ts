/**
 * Grouping a materials list into one purchase order per vendor.
 *
 * This is the part of `/purchase-orders/from-materials` worth testing on its
 * own, because getting it wrong is expensive in a way that is invisible on
 * screen: a line assigned to the wrong vendor becomes an order somebody has to
 * unwind, and a line dropped silently becomes a job missing materials,
 * discovered on site.
 *
 * The rule is that a line's own `vendorId` is authoritative. Only a line typed
 * by hand falls back to matching the supplier name, and an unrecognised name is
 * reported rather than guessed at — name guessing is what once resolved a
 * two-character supplier string to Home Depot.
 */

export interface MaterialLine {
  vendorId?: string;
  supplier?: string;
  vendorName?: string;
  name?: string;
  sku?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  [key: string]: unknown;
}

export interface VendorRecord {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface GroupedOrders {
  groups: Array<{ vendor: VendorRecord; lines: MaterialLine[] }>;
  unassigned: MaterialLine[];
}

export function groupMaterialLines(
  lines: MaterialLine[],
  vendors: VendorRecord[],
): GroupedOrders {
  const byId = new Map<string, VendorRecord>();
  const byName = new Map<string, VendorRecord>();
  for (const v of vendors) {
    const id = String(v?.id ?? '').trim();
    if (id) byId.set(id, v);
    const name = String(v?.name ?? '').trim().toLowerCase();
    // An empty vendor name must never become a lookup key, or every line with
    // a blank supplier would match it.
    if (name) byName.set(name, v);
  }

  const order: string[] = [];
  const grouped = new Map<string, { vendor: VendorRecord; lines: MaterialLine[] }>();
  const unassigned: MaterialLine[] = [];

  for (const line of lines) {
    const explicit = String(line?.vendorId ?? '').trim();
    const typedName = String(line?.supplier ?? line?.vendorName ?? '').trim().toLowerCase();

    // An explicit id that matches nothing is a stale or bad reference. Falling
    // back to the name there would quietly send the line to a different vendor
    // than the one it claims, so it is reported instead.
    const vendor = explicit ? byId.get(explicit) : (typedName ? byName.get(typedName) : undefined);

    if (!vendor) { unassigned.push(line); continue; }

    const key = String(vendor.id);
    if (!grouped.has(key)) { grouped.set(key, { vendor, lines: [] }); order.push(key); }
    grouped.get(key)!.lines.push(line);
  }

  return { groups: order.map(k => grouped.get(k)!), unassigned };
}

/** Order total, derived from the lines rather than trusted from the caller. */
export function lineTotal(line: MaterialLine): number {
  const stated = Number(line?.totalPrice);
  if (Number.isFinite(stated) && stated > 0) return stated;
  const qty = Number(line?.quantity) || 0;
  const price = Number(line?.unitPrice) || 0;
  return qty * price;
}
