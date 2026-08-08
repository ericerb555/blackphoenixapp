/**
 * product-exporter.tsx — the "exporter" module of the discovery pipeline.
 *
 * Turns the ranked, scored product list into clean JSON and CSV that map 1:1 to
 * the fields a storefront / import flow needs. Self-contained (no cross-module
 * imports) so it survives sibling reverts.
 *
 * Export row fields (per spec):
 *   productName, category, trendScore, supplierName, supplierLink,
 *   supplierCost, estimatedRetailPrice, estimatedProfit, marginPct,
 *   shippingTime, competitionRisk, notes
 */

export interface ExportRow {
  productName: string;
  category: string;
  trendScore: number;
  supplierName: string;
  supplierLink: string;
  supplierCost: number;
  estimatedRetailPrice: number;
  estimatedProfit: number;
  marginPct: number;
  shippingTime: string;
  competitionRisk: string;
  notes: string;
}

/** Shape of a ranked product coming out of the discover pipeline. */
interface RankedLike {
  name?: string;
  category?: string;
  finalScore?: number;
  trendingScore?: number;
  sourceLabel?: string;
  source?: string;
  primarySourceUrl?: string;
  cost?: number;
  retail?: number;
  profit?: number;
  marginPct?: number;
  shippingDays?: number;
  competitionRisk?: string;
  sourcing?: Array<{ label: string; url: string; availability?: string }>;
  breakdown?: Record<string, number>;
  isTrending?: boolean;
  isNew?: boolean;
}

function bestSupplierLink(p: RankedLike): string {
  if (p.primarySourceUrl) return p.primarySourceUrl;
  const src = (p.source || "").toLowerCase();
  const match = (p.sourcing || []).find((s) => s.label.toLowerCase().includes(src));
  return match?.url || p.sourcing?.[0]?.url || "";
}

function buildNotes(p: RankedLike): string {
  const bits: string[] = [];
  if (p.isTrending) bits.push("🔥 On trending feed");
  if (p.isNew) bits.push("Newly listed");
  if (p.competitionRisk) bits.push(`${p.competitionRisk} competition`);
  if (p.breakdown) {
    const b = p.breakdown;
    const top = Object.entries(b).sort((a, z) => z[1] - a[1])[0];
    if (top) bits.push(`strongest factor: ${top[0]} (${top[1]})`);
  }
  const connected = (p.sourcing || []).filter((s) => s.availability === "connected").map((s) => s.label);
  if (connected.length) bits.push(`connected suppliers: ${connected.join(", ")}`);
  return bits.join("; ");
}

/** Map one ranked product to a flat export row. */
export function toExportRow(p: RankedLike): ExportRow {
  return {
    productName: String(p.name || "Untitled"),
    category: String(p.category || "General"),
    trendScore: Math.round(Number(p.finalScore ?? p.trendingScore ?? 0)),
    supplierName: String(p.sourceLabel || p.source || "Unknown"),
    supplierLink: bestSupplierLink(p),
    supplierCost: Number(p.cost ?? 0),
    estimatedRetailPrice: Number(p.retail ?? 0),
    estimatedProfit: Number(p.profit ?? 0),
    marginPct: Number(p.marginPct ?? 0),
    shippingTime: p.shippingDays ? `${p.shippingDays} days (est.)` : "unknown",
    competitionRisk: String(p.competitionRisk || "unknown"),
    notes: buildNotes(p),
  };
}

export function toExportRows(products: RankedLike[]): ExportRow[] {
  return products.map(toExportRow);
}

/** RFC-4180-ish CSV escaping: quote fields containing comma/quote/newline. */
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize export rows to CSV text (header + rows). */
export function toCSV(rows: ExportRow[]): string {
  const headers: (keyof ExportRow)[] = [
    "productName", "category", "trendScore", "supplierName", "supplierLink",
    "supplierCost", "estimatedRetailPrice", "estimatedProfit", "marginPct",
    "shippingTime", "competitionRisk", "notes",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(","));
  return lines.join("\r\n");
}
