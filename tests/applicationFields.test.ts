/**
 * Making a submitted application readable.
 *
 * This decides what somebody sees when they choose whether to let a company
 * onto the platform, so the tests lean on two things: that nothing an applicant
 * answered can go missing, and that the two answers which decide whether they
 * go near a customer's property — insurance and a licence — are never hidden
 * when the answer is no.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applicationFields, applicationAddress, unlistedKeys, normalizeApplicationStatus,
} from '../src/app/lib/applicationFields.ts';

/** The vendor application exactly as the form posts it. */
const vendor = {
  id: 'ef0f6418',
  name: 'Dana Whitfield',
  company_name: 'Granite State Building Supply',
  type: 'vendor',
  applicationType: 'vendor',
  contact_name: 'Dana Whitfield',
  contact_email: 'vendor@example.com',
  email: 'vendor@example.com',
  contact_phone: '(603) 555-0188',
  phone: '(603) 555-0188',
  website: 'https://example.com',
  address: '18 Mill Yard Road, Manchester, NH 03101',
  tax_id: '00-0000000',
  years_in_business: '12',
  products_services: 'Flooring, underlayment, trim and fixings.',
  categories: ['Flooring', 'Lumber & Building Materials'],
  insurance_certificate: true,
  business_license: true,
  api_integration: null,
  status: 'pending',
  submittedAt: '2026-09-27T19:18:53.473Z',
};

const labels = (app: any) => applicationFields(app).map((f) => f.label);
const valueOf = (app: any, label: string) =>
  applicationFields(app).find((f) => f.label === label)?.value;

/* ── what the reader sees ────────────────────────────────────────────────── */

test('every answer the applicant gave comes through readable', () => {
  assert.equal(valueOf(vendor, 'Business'), 'Granite State Building Supply');
  assert.equal(valueOf(vendor, 'Years in business'), '12');
  assert.equal(valueOf(vendor, 'Contact'), 'Dana Whitfield');
  assert.equal(valueOf(vendor, 'Email'), 'vendor@example.com');
  assert.equal(valueOf(vendor, 'Tax ID'), '00-0000000');
  assert.equal(valueOf(vendor, 'What they supply'), 'Flooring, underlayment, trim and fixings.');
});

test('a list of categories reads as a sentence, not as an array', () => {
  assert.equal(valueOf(vendor, 'Categories'), 'Flooring, Lumber & Building Materials');
});

test('yes and no are words, because true is not an answer a person gives', () => {
  assert.equal(valueOf(vendor, 'Insurance certificate'), 'Yes');
  assert.equal(valueOf({ ...vendor, business_license: false }, 'Business licence'), 'No');
});

test('a declined insurance answer is shown, never dropped', () => {
  const uninsured = { ...vendor, insurance_certificate: false };
  assert.equal(valueOf(uninsured, 'Insurance certificate'), 'No',
    'omitting a No here would read as "not asked", which is the opposite of what it means');
});

test('a question never asked is left out rather than shown as unknown', () => {
  const { insurance_certificate, business_license, ...partial } = vendor;
  assert.ok(!labels(partial).includes('Insurance certificate'));
  assert.ok(!labels(partial).includes('Business licence'));
});

test('blank answers do not push the filled ones off the screen', () => {
  const sparse = { company_name: 'Small Co', email: 'a@b.com', website: '', tax_id: '   ' };
  assert.deepEqual(labels(sparse), ['Business', 'Email']);
});

/* ── the several spellings five forms use ────────────────────────────────── */

test('either spelling of a field is found', () => {
  assert.equal(valueOf({ companyName: 'Camel Co' }, 'Business'), 'Camel Co');
  assert.equal(valueOf({ yearsInBusiness: '4' }, 'Years in business'), '4');
  assert.equal(valueOf({ productsServices: 'Tiles' }, 'What they supply'), 'Tiles');
});

test('a contact name assembled from first and last still appears', () => {
  assert.equal(valueOf({ firstName: 'Dana', lastName: 'Whitfield' }, 'Contact'), 'Dana Whitfield');
});

test('answers nested under personalInfo are read too', () => {
  const nested = { id: 'x', personalInfo: { companyName: 'Nested Co', email: 'n@b.com' } };
  assert.equal(valueOf(nested, 'Business'), 'Nested Co');
});

/* ── the address, from either shape ──────────────────────────────────────── */

test('a joined address is left alone', () => {
  assert.equal(applicationAddress({ address: '18 Mill Yard Road, Manchester, NH 03101' }),
    '18 Mill Yard Road, Manchester, NH 03101');
});

test('separate parts are assembled', () => {
  assert.equal(
    applicationAddress({ address: '18 Mill Yard Road', city: 'Manchester', state: 'NH', zipCode: '03101' }),
    '18 Mill Yard Road, Manchester, NH 03101',
  );
});

test('a city already in the string is not repeated', () => {
  assert.equal(
    applicationAddress({ address: '18 Mill Yard Road, Manchester', city: 'Manchester', state: 'NH' }),
    '18 Mill Yard Road, Manchester, NH',
  );
});

test('no address at all is empty rather than a row of commas', () => {
  assert.equal(applicationAddress({}), '');
});

/* ── the API offer ───────────────────────────────────────────────────────── */

test('an offered integration is described', () => {
  const withApi = { ...vendor, api_integration: { enabled: true, endpoint: 'https://api.example.com' } };
  assert.equal(valueOf(withApi, 'API integration'), 'https://api.example.com');
});

test('an integration offered with no detail still says so', () => {
  const bare = { ...vendor, api_integration: { enabled: true } };
  assert.equal(valueOf(bare, 'API integration'), 'Offered, details to follow');
});

test('no integration is not a row', () => {
  assert.ok(!labels(vendor).includes('API integration'));
});

/* ── nothing goes silently missing ───────────────────────────────────────── */

test('a field nobody accounted for is named rather than lost', () => {
  const future = { ...vendor, deliveryRadiusMiles: 50 };
  assert.deepEqual(unlistedKeys(future), ['deliveryRadiusMiles'],
    'a field added to a form tomorrow must not vanish from the application');
});

test('bookkeeping is not reported as unaccounted for', () => {
  assert.deepEqual(unlistedKeys(vendor), []);
});

/* ── one vocabulary for status ───────────────────────────────────────────── */

test('pending and new are the same thing', () => {
  assert.equal(normalizeApplicationStatus('pending'), 'new',
    'the server writes pending; this page was built around new, and an application matching neither looked like it had no status at all');
  assert.equal(normalizeApplicationStatus('new'), 'new');
  assert.equal(normalizeApplicationStatus(undefined), 'new');
});

test('accepted and approved are the same thing', () => {
  assert.equal(normalizeApplicationStatus('accepted'), 'approved');
  assert.equal(normalizeApplicationStatus('approved'), 'approved');
  assert.equal(normalizeApplicationStatus('active'), 'approved');
});

test('a decision against is never read as undecided', () => {
  assert.equal(normalizeApplicationStatus('rejected'), 'rejected');
  assert.equal(normalizeApplicationStatus('declined'), 'rejected');
});

test('anything unrecognised waits for a decision rather than claiming one', () => {
  assert.equal(normalizeApplicationStatus('banana'), 'new');
});

/* ── rubbish in ──────────────────────────────────────────────────────────── */

test('no application is an empty list, not a crash', () => {
  assert.deepEqual(applicationFields(null), []);
  assert.deepEqual(applicationFields('nonsense'), []);
  assert.deepEqual(unlistedKeys(null), []);
});
