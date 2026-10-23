/**
 * An invoice, turned into the payload the shared PDF layout draws.
 *
 * WHY THE INVOICE BORROWS THE QUOTE'S LAYOUT
 *
 * Eric, looking at an invoice: "the view pdf is still wrong and all orange."
 *
 * He was right, and it was not the quote. I generated the quote PDF and
 * counted its colour operators: five of two hundred and twelve are orange —
 * two percent — being the ESTIMATE heading, the phase headings and the rule
 * above the total. The document he was looking at was `InvoiceDocument`: a
 * dark `#0A0A0A` page with an orange gradient banner, an orange logo tile,
 * orange headings, orange totals and an orange payment-terms box. It had
 * never been moved onto the new layout, because only quotes were.
 *
 * So rather than restyling a second document to look like the first, the
 * invoice is mapped onto `QuotePdfData` and drawn by `buildQuotePdf`. One
 * layout, two documents, nothing left to drift. The layout already takes its
 * heading as data — it was written that way — so "ESTIMATE" becomes
 * "INVOICE" and the rest follows.
 *
 * THIS FILE DECIDES NOTHING
 *
 * Every decision lives in `invoicePdfParts`, which is dependency-free and
 * tested. This adds the company letterhead and hands the result over. The
 * split exists because `companyInfo` drags in a chain of browser-shaped
 * modules that Node's test runner cannot follow, and the rules about what a
 * customer sees have to be assertable in a plain test — the same reason
 * `quotePdfSelection` is separate from `quoteToPdfDocument`.
 */
import { invoicePdfParts } from './invoicePdfParts';
import { companyInfo } from './config/companyInfo';
import type { QuotePdfData } from './services/quotePdfLayout';

const hexToRgb = (hex: string) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 234, g: 88, b: 12 };
};

export interface InvoicePdfOptions {
  /** Apply the customer visibility rules. False builds the office copy. */
  forCustomer?: boolean;
  /** Already-decoded logo. Fetching is the caller's job — this stays pure. */
  logoDataUrl?: string;
}

export function invoiceToPdfDocument(invoice: any, options: InvoicePdfOptions = {}): QuotePdfData {
  const { forCustomer = true, logoDataUrl } = options;

  return {
    company: {
      name: companyInfo.name,
      tagline: companyInfo.tagline,
      addressLines: [
        [companyInfo.address?.line1, companyInfo.address?.line2].filter(Boolean).join(', '),
        [companyInfo.address?.city, companyInfo.address?.state, companyInfo.address?.zipCode].filter(Boolean).join(' '),
      ].filter(Boolean) as string[],
      email: companyInfo.contact?.email,
      phone: companyInfo.contact?.phone,
      website: companyInfo.contact?.website,
      logoDataUrl,
      primaryColor: hexToRgb(companyInfo.branding?.primaryColor || '#ea580c'),
    },
    ...invoicePdfParts(invoice, forCustomer),
  };
}
