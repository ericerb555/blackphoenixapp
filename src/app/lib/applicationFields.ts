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
