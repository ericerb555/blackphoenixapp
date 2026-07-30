/**
 * Portal invitation email — the SINGLE source of truth for both the live
 * preview (what the admin sees in the Create-a-Portal panel / Owner's Dashboard)
 * and the email that is actually delivered via Resend. Preview === delivered,
 * guaranteed, because both call buildPortalInviteEmail().
 *
 * The editable copy (subject, heading, intro, blurb, trial line, button label,
 * footer) can be overridden per portal type. Overrides are stored in the KV
 * store by the server and merged in here. Any field left blank falls back to
 * the built-in default below. Copy supports these tokens:
 *   {firstName} {company} {label} {trialPeriod} {trialMonths}
 */

export const PORTAL_LABELS: Record<string, string> = {
  customer: "Customer",
  landlord: "Landlord",
  property_manager: "Property Manager",
  condo_manager: "Condo Manager",
  vendor: "Vendor",
  subcontractor: "Subcontractor",
  employee: "Employee",
  advertiser: "Advertiser",
  investor: "Investor",
  territory_owner: "Territory Owner",
};

/** One-line pitch shown under the heading, tailored per portal type. */
const PORTAL_BLURB: Record<string, string> = {
  customer: "Track your projects, approve quotes, and shop the store in one place.",
  landlord: "Manage your properties, work orders, and tenants from a single dashboard.",
  property_manager: "Coordinate maintenance, vendors, and approvals across every property you manage.",
  condo_manager: "Run your association's maintenance, budgets, and resident requests with ease.",
  vendor: "Receive purchase orders, manage catalog items, and get paid faster.",
  subcontractor: "Get dispatched to jobs, manage your schedule, and submit work updates.",
  employee: "Clock in, view your schedule, and document work right from your phone.",
  advertiser: "Launch geo-targeted campaigns and track performance in real time.",
  investor: "Review opportunities, track returns, and manage your portfolio.",
  territory_owner: "Operate your territory, onboard clients, and grow local revenue.",
};

/** The editable fields, in display order, for the Owner's Dashboard editor. */
export const INVITE_FIELD_DEFS: { key: InviteFieldKey; label: string; hint: string; multiline: boolean }[] = [
  { key: "subject", label: "Subject line", hint: "The email subject", multiline: false },
  { key: "heading", label: "Heading", hint: "Big welcome line at the top of the body", multiline: false },
  { key: "intro", label: "Intro paragraph", hint: "First sentence of the message", multiline: true },
  { key: "blurb", label: "Portal pitch", hint: "One-line value pitch for this portal", multiline: true },
  { key: "trialLine", label: "Trial note", hint: "Shown only when a free trial is granted", multiline: true },
  { key: "buttonLabel", label: "Button label", hint: "The call-to-action button text", multiline: false },
  { key: "footerNote", label: "Footer note", hint: "Small print at the bottom", multiline: true },
];

export type InviteFieldKey = "subject" | "heading" | "intro" | "blurb" | "trialLine" | "buttonLabel" | "footerNote";
export type InviteFields = Partial<Record<InviteFieldKey, string>>;

/** Built-in default copy (with tokens) for a given portal type. */
export function defaultInviteFields(portalType: string): Record<InviteFieldKey, string> {
  return {
    subject: "You're invited to your {label} portal at {company}",
    heading: "Welcome, {firstName} 👋",
    intro: "You've been invited to the {label} portal at {company}.",
    blurb: PORTAL_BLURB[portalType] || "Access your dedicated portal and get started.",
    trialLine: "As a welcome, you have full access to every feature for {trialPeriod}. After that you can choose a plan to keep going.",
    buttonLabel: "Access your portal →",
    footerNote: "Sent by {company}. If you weren't expecting this invitation, you can safely ignore this email.",
  };
}

/** Merge saved overrides over the defaults; blank/whitespace overrides are ignored. */
export function effectiveInviteFields(portalType: string, overrides?: InviteFields): Record<InviteFieldKey, string> {
  const base = defaultInviteFields(portalType);
  if (!overrides) return base;
  const out = { ...base };
  for (const def of INVITE_FIELD_DEFS) {
    const v = overrides[def.key];
    if (typeof v === "string" && v.trim().length > 0) out[def.key] = v;
  }
  return out;
}

function esc(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fillTokens(s: string, tokens: Record<string, string>): string {
  return String(s || "").replace(/\{(\w+)\}/g, (m, k) => (tokens[k] != null ? tokens[k] : m));
}

/** Self-hosted Black Phoenix logo, served from the published domain's /public. */
export const DEFAULT_LOGO_URL = "https://www.theblackphoenixcompany.com/bpb-phoenix-logo.png";

export interface PortalInviteEmailInput {
  name: string;
  portalType: string;
  signInUrl: string;
  companyName?: string;
  logoUrl?: string;
  /** Trial info, optional. */
  fullAccess?: boolean;
  trialMonths?: number;
  /** Per-portal copy overrides from the KV store (Owner's Dashboard editor). */
  overrides?: InviteFields;
}

export function buildPortalInviteEmail(input: PortalInviteEmailInput): { subject: string; html: string; text: string } {
  const company = input.companyName || "Black Phoenix";
  const label = PORTAL_LABELS[input.portalType] || "Portal";
  const firstName = (input.name || "there").split(" ")[0];
  const url = input.signInUrl || "#";
  const logo = input.logoUrl || DEFAULT_LOGO_URL;
  const months = input.trialMonths || 6;
  const trialPeriod = `${months} month${months === 1 ? "" : "s"}`;

  const tokens: Record<string, string> = {
    firstName, company, label,
    trialPeriod, trialMonths: String(months),
  };
  const fields = effectiveInviteFields(input.portalType, input.overrides);

  // Plain (for subject/text) and escaped (for HTML) renders of each field.
  const raw = (k: InviteFieldKey) => fillTokens(fields[k], tokens);
  const html = (k: InviteFieldKey) => esc(raw(k));

  const subject = raw("subject");
  const trialLineHtml = input.fullAccess
    ? `<p style="margin:0 0 18px;color:#4b5563;font-size:14px;line-height:22px;">${html("trialLine")}</p>`
    : "";

  const logoBlock = logo
    ? `<img src="${esc(logo)}" alt="${esc(company)}" width="140" style="display:block;margin:0 auto 8px;max-width:140px;height:auto;" />`
    : `<div style="font-size:22px;font-weight:800;color:#ea580c;letter-spacing:-0.02em;">${esc(company)}</div>`;

  const htmlOut = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px 32px;text-align:center;">
          ${logoBlock}
          <div style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;margin-top:6px;">${esc(label)} Portal Invitation</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:800;">${html("heading")}</h1>
          <p style="margin:0 0 18px;color:#4b5563;font-size:15px;line-height:24px;">${html("intro")} ${html("blurb")}</p>
          ${trialLineHtml}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
            <tr><td style="border-radius:10px;background-color:#ea580c;">
              <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">${html("buttonLabel")}</a>
            </td></tr>
          </table>
          <p style="margin:0 0 6px;color:#6b7280;font-size:13px;line-height:20px;">Or paste this secure link into your browser:</p>
          <p style="margin:0 0 20px;word-break:break-all;"><a href="${esc(url)}" target="_blank" style="color:#ea580c;font-size:13px;">${esc(url)}</a></p>
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:18px;">On first sign-in you'll complete a short application, then land right in your ${esc(label)} portal. This link is unique to you — please don't share it.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">${html("footerNote")}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${raw("heading")}\n\n${raw("intro")} ${raw("blurb")}\n\nAccess your portal: ${url}\n\nOn first sign-in you'll complete a short application, then land in your ${label} portal. This link is unique to you — please don't share it.\n\n— ${company}`;

  return { subject, html: htmlOut, text };
}

/**
 * Concise SMS invitation built from the SAME editable template fields (intro,
 * blurb, trial note) so the text message stays in sync with the email. Kept
 * short and link-first for deliverability.
 */
export function buildPortalInviteSms(input: PortalInviteEmailInput): string {
  const company = input.companyName || "Black Phoenix";
  const months = input.trialMonths || 6;
  const trialPeriod = `${months} month${months === 1 ? "" : "s"}`;
  const label = PORTAL_LABELS[input.portalType] || "Portal";
  const firstName = (input.name || "there").split(" ")[0];
  const tokens: Record<string, string> = { firstName, company, label, trialPeriod, trialMonths: String(months) };
  const fields = effectiveInviteFields(input.portalType, input.overrides);
  const fill = (s: string) => fillTokens(s, tokens);

  const url = input.signInUrl || "#";
  const parts = [
    `${company}:`,
    fill(fields.intro),
    fill(fields.blurb),
  ];
  if (input.fullAccess) parts.push(fill(fields.trialLine));
  parts.push(`Get started: ${url}`);
  // Collapse whitespace and cap length so it lands as a clean SMS.
  let msg = parts.join(" ").replace(/\s+/g, " ").trim();
  const MAX = 480; // ~3 segments; Twilio concatenates automatically
  if (msg.length > MAX) msg = msg.slice(0, MAX - 1) + "…";
  return msg;
}
