/**
 * Turning a submitted application into something a person can read.
 *
 * WHAT WAS THERE BEFORE
 *
 * `JSON.stringify(application, null, 2)` inside a `<pre>`. Every field a vendor,
 * subcontractor, investor or tenant filled in — company name, years trading,
 * address, tax id, what they sell, whether they carry insurance — was shown as
 * a raw object dump. The data was all present and none of it was readable, so
 * the person deciding whether to let somebody onto the platform was reading
 * JSON to do it.
 *
 * WHY THE FIELD LIST IS EXPLICIT
 *
 * Five different application forms write to one store, each with its own
 * spelling — `company_name` and `companyName`, `contact_email` and `email`.
 * Rendering whatever keys happen to be present would show internal bookkeeping
 * (`updatedAt`, `exchangeOrgId`, `planProposalId`) beside the answers, and the
 * reader could not tell which was which. So the fields worth showing are named
 * here, in the order somebody assessing an application would want them, and
 * everything else stays in the raw view underneath.
 *
 * NOTHING IS INVENTED AND NOTHING IS HIDDEN
 *
 * A field the applicant left blank is omitted rather than shown as "N/A" — an
 * empty row tells the reader nothing and pushes the filled ones off the screen.
 * But anything not covered here is still reachable: `unlistedKeys` names what
 * the readable view did not account for, so a new form field cannot silently
 * become invisible the moment somebody adds it.
 */

export interface ApplicationField {
  label: string;
  value: string;
  /** Long prose gets its own full-width row rather than sitting in a column. */
  wide?: boolean;
}

/** Keys the readable view accounts for, so the raw view can say what it adds. */
const HANDLED = new Set([
  'company_name', 'companyName', 'name', 'full_name',
  'type', 'applicationType', 'portalType', 'businessType',
  'contact_name', 'contactName', 'firstName', 'lastName',
  'contact_email', 'email', 'contact_phone', 'phone',
  'website', 'address', 'city', 'state', 'zipCode',
  'tax_id', 'taxId', 'years_in_business', 'yearsInBusiness',
  'products_services', 'productsServices', 'categories',
  'insurance_certificate', 'insuranceCertificate',
  'business_license', 'businessLicense',
  'api_integration', 'apiIntegration',
  // Bookkeeping the reader does not need in the body of the application.
  'id', 'status', 'submittedAt', 'updatedAt', 'reviewedAt', 'reviewedBy',
  'taxClassification', 'planPreference', 'planProposal', 'planProposalId',
  'onboardingStatus', 'exchangeOrgId', 'personalInfo', 'formData',
  /**
   * The technician profile, which has its own panel on the review screen.
   *
   * Listed here so a field technician's application does not report its two
   * most important answers as "also submitted, not shown above" — they ARE
   * shown, just not by `applicationFields`, which only knows business fields.
   */
  'trade_ratings', 'tradeRatings', 'certifications',
]);

const text = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value).trim();
};

/** The first of several spellings that actually carries a value. */
const pick = (app: any, ...keys: string[]): string => {
  for (const key of keys) {
    const v = text(app?.[key]);
    if (v) return v;
  }
  return '';
};

/**
 * The address, assembled from whichever pieces were filled in.
 *
 * One form posts a single joined string and another posts the parts, so both
 * shapes have to produce one line without repeating a city that is already in
 * the string.
 */
export function applicationAddress(app: any): string {
  const whole = text(app?.address);
  const city = text(app?.city);
  const state = text(app?.state);
  const zip = text(app?.zipCode);

  /**
   * State and postcode belong together with a space, not a comma. "NH, 03101"
   * is not how anybody writes an address, and this string is read by a person
   * deciding whether a company is real.
   */
  const region = [state, zip].filter(Boolean).join(' ');
  const parts = [city, region].filter(Boolean);

  if (!whole) return parts.join(', ');
  if (parts.length === 0) return whole;

  // Only the pieces the joined string does not already carry.
  const lower = whole.toLowerCase();
  const missing = parts.filter((p) => !lower.includes(p.toLowerCase()));
  return missing.length ? `${whole}, ${missing.join(', ')}` : whole;
}

/** Everything worth reading, in the order somebody assessing it would want. */
export function applicationFields(app: any): ApplicationField[] {
  if (!app || typeof app !== 'object') return [];

  const nested = app.personalInfo || app.formData || {};
  const merged = { ...nested, ...app };

  const contactName = pick(merged, 'contact_name', 'contactName')
    || [text(merged.firstName), text(merged.lastName)].filter(Boolean).join(' ');

  const api = merged.api_integration || merged.apiIntegration;
  const apiLine = api && typeof api === 'object' && api.enabled
    ? [text(api.endpoint), text(api.documentation_url), text(api.notes)].filter(Boolean).join(' · ')
      || 'Offered, details to follow'
    : '';

  const rows: ApplicationField[] = [
    { label: 'Business', value: pick(merged, 'company_name', 'companyName') },
    { label: 'Business type', value: pick(merged, 'businessType', 'type', 'applicationType') },
    { label: 'Years in business', value: pick(merged, 'years_in_business', 'yearsInBusiness') },
    { label: 'Contact', value: contactName },
    { label: 'Email', value: pick(merged, 'contact_email', 'email') },
    { label: 'Phone', value: pick(merged, 'contact_phone', 'phone') },
    { label: 'Website', value: pick(merged, 'website') },
    { label: 'Address', value: applicationAddress(merged), wide: true },
    { label: 'Tax ID', value: pick(merged, 'tax_id', 'taxId') },
    { label: 'Categories', value: pick(merged, 'categories'), wide: true },
    { label: 'What they supply', value: pick(merged, 'products_services', 'productsServices'), wide: true },
    /**
     * Insurance and a licence are the two answers that decide whether somebody
     * may be let near a customer's property, so they are shown whether the
     * answer was yes or no — an omitted "No" here would read as "not asked".
     */
    {
      label: 'Insurance certificate',
      value: merged.insurance_certificate === undefined && merged.insuranceCertificate === undefined
        ? '' : text(merged.insurance_certificate ?? merged.insuranceCertificate),
    },
    {
      label: 'Business licence',
      value: merged.business_license === undefined && merged.businessLicense === undefined
        ? '' : text(merged.business_license ?? merged.businessLicense),
    },
    { label: 'API integration', value: apiLine, wide: true },
  ];

  return rows.filter((row) => row.value !== '');
}

/**
 * Keys the readable view did not account for.
 *
 * So a field added to a form tomorrow is visible as something unaccounted for
 * rather than silently dropping out of the application nobody can read.
 */
export function unlistedKeys(app: any): string[] {
  if (!app || typeof app !== 'object') return [];
  return Object.keys(app)
    .filter((key) => !HANDLED.has(key))
    .filter((key) => text(app[key]) !== '' || (app[key] && typeof app[key] === 'object'))
    .sort();
}

/**
 * Is this an application from somebody who would go out and do the work?
 *
 * Technician and employee applications carry a trade profile that no other
 * application has, and no other application should be shown an empty abilities
 * panel because of it.
 */
export function isTechnicianApplication(app: any): boolean {
  const source = String(app?.applicationType || app?.type || '').toLowerCase();
  return /employee|technician|field_tech|field tech|maintenance tech/.test(source);
}

export interface TechnicianTradeRow {
  tradeId: string;
  trade: string;
  declared: string;
  confirmed: string;
  years: number;
  tasks: string[];
  /** The claim and the years do not agree — worth a question at interview. */
  mismatch: boolean;
}

export interface TechnicianCertificationRow {
  label: string;
  number: string;
  state: string;
  expiresOn: string;
  lapsed: boolean;
}

/**
 * What a technician says he can do, ordered so the answer arrives first.
 *
 * WHY THIS IS SEPARATE FROM `applicationFields`
 *
 * That function names BUSINESS fields — company name, tax id, categories,
 * insurance — because it was written for vendors and subcontractors. A field
 * technician's trades, levels, tasks, certifications and references matched
 * none of them, so every one of those answers fell through to `unlistedKeys`
 * and appeared as a single grey line reading "Also submitted, not shown above:
 * availability, certifications, emergency_calls…". To find out what a
 * technician was good at you opened the raw JSON.
 *
 * Eric's words were *"i need to know the techs real abilities what he is good
 * at"*, so the ordering here is deliberate: strongest trade first, then down.
 * A reviewer should get the answer in about three seconds.
 *
 * DECLARED AND CONFIRMED ARE BOTH SHOWN, ALWAYS
 *
 * Because a level on an application is a claim, and what was actually found
 * during probation is a different fact. Collapsing them would quietly present
 * the applicant's own estimate as though somebody had verified it.
 */
export function technicianTrades(app: any): TechnicianTradeRow[] {
  const nested = app?.personalInfo || app?.formData || {};
  const raw = app?.trade_ratings || app?.tradeRatings || nested.trade_ratings || nested.tradeRatings;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];

  const rank: Record<string, number> = { beginner: 1, novice: 2, advanced: 3 };
  const label: Record<string, string> = { beginner: 'Beginner', novice: 'Novice', advanced: 'Advanced' };

  return Object.values(raw)
    .filter((rating: any) => rating && typeof rating === 'object' && rating.tradeId)
    .map((rating: any) => {
      const years = Number(rating.years);
      const declared = String(rating.declared || '');
      // Mirrors `levelForYears` without importing it, so this module stays
      // dependency-free for the tests that exercise it in isolation.
      const impliedByYears = !Number.isFinite(years) || years < 2 ? 'beginner' : years < 5 ? 'novice' : 'advanced';
      return {
        tradeId: String(rating.tradeId),
        trade: TRADE_NAMES[String(rating.tradeId)] || String(rating.tradeId),
        declared: label[declared] || declared,
        confirmed: label[String(rating.confirmed || '')] || '',
        years: Number.isFinite(years) ? years : 0,
        tasks: Array.isArray(rating.tasks) ? rating.tasks.map((t: any) => String(t)) : [],
        mismatch: Boolean(declared) && Number.isFinite(years) && impliedByYears !== declared,
      };
    })
    .sort((a, b) => (rank[String(b.declared).toLowerCase()] || 0) - (rank[String(a.declared).toLowerCase()] || 0) || b.years - a.years);
}

/**
 * The trade names, duplicated here on purpose.
 *
 * `laborTasks.ts` is the source for the FORM, which is right — the applicant
 * must be offered exactly the trades the company prices. This module is read
 * by the review screen and by tests, and importing the seed task catalogue
 * (sixty-odd records) to render a label would pull the estimator into every
 * caller. Only the labels are repeated, never the trade list that drives the
 * form, so the two cannot disagree about what is offered.
 */
const TRADE_NAMES: Record<string, string> = {
  carpentry: 'Carpentry', painting: 'Painting', electrical: 'Electrical',
  plumbing: 'Plumbing', laboring: 'General Labour', sheetrock: 'Drywall & Taping',
  siding: 'Siding', roofing: 'Roofing', tile: 'Tile', flooring: 'Flooring',
  masonry: 'Masonry', hvac: 'HVAC',
};

/** Certifications, with lapsed ones marked rather than quietly listed. */
export function technicianCertifications(app: any): TechnicianCertificationRow[] {
  const nested = app?.personalInfo || app?.formData || {};
  const raw = app?.certifications ?? nested.certifications;
  if (!Array.isArray(raw)) return [];
  const now = Date.now();

  return raw
    .filter((entry: any) => entry && typeof entry === 'object')
    .map((entry: any) => {
      const expiresOn = String(entry.expiresOn || '').trim();
      const expiry = expiresOn ? new Date(expiresOn).getTime() : NaN;
      return {
        label: String(entry.otherLabel || CERT_NAMES[String(entry.typeId)] || entry.typeId || '').trim(),
        number: String(entry.number || '').trim(),
        state: String(entry.state || '').trim(),
        expiresOn,
        lapsed: Number.isFinite(expiry) && expiry < now,
      };
    })
    .filter((row) => row.label !== '');
}

/** Readable names for the certification ids the form stores. */
const CERT_NAMES: Record<string, string> = {
  epa608: 'EPA 608', epa_rrp: 'EPA RRP (lead-safe renovator)',
  osha10: 'OSHA 10', osha30: 'OSHA 30',
  electrical_apprentice: 'Electrical apprentice registration',
  electrical_journeyman: 'Journeyman electrician licence',
  electrical_master: 'Master electrician licence',
  plumbing_journeyman: 'Journeyman plumber licence',
  plumbing_master: 'Master plumber licence',
  gas_fitting: 'Gas fitting licence', backflow: 'Backflow prevention certification',
  aerial_lift: 'Aerial / scissor lift operator',
  fall_protection: 'Fall protection / competent person',
  confined_space: 'Confined space entry', cdl: 'Commercial driver licence (CDL)',
  first_aid_cpr: 'First aid / CPR',
};

/**
 * One vocabulary for status.
 *
 * The server writes `pending` when an application arrives. This page was built
 * around `new`, so a freshly submitted application matched no tab, counted
 * towards nothing, and left every status button unhighlighted — it looked like
 * it had no status at all. They mean the same thing, so they are folded
 * together here rather than either side being rewritten.
 */
export function normalizeApplicationStatus(status: unknown): 'new' | 'reviewed' | 'approved' | 'rejected' {
  const s = String(status ?? '').toLowerCase();
  if (s === 'rejected' || s === 'declined') return 'rejected';
  if (s === 'approved' || s === 'accepted' || s === 'active') return 'approved';
  if (s === 'reviewed' || s === 'in_review' || s === 'in review') return 'reviewed';
  return 'new';
}
