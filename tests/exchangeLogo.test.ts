/**
 * A logo is the only piece of branding a compiled listing may carry, so the
 * rules deciding when one is shown are worth more than the upload code around
 * them.
 *
 * The test that matters most here is the one asserting a logo stops being
 * public the moment the claim behind it does. A logo outliving its claim would
 * be the directory asserting a brand on behalf of a business that no longer
 * stands behind it — which is the exact thing the invent-nothing rule exists to
 * prevent, arriving by the back door.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  logoIsPublic, businessMayMove, staffMayMove, logoObjectPath,
  refuseLogo, phraseLogoState, MAX_LOGO_BYTES, PUBLISHED_STATE,
  publicLogoUrl, logoObjectUrl,
  looksLikeMissingLogoColumn, LOGO_SELECT_COLUMNS,
} from '../supabase/functions/server/exchangeLogo.ts';
import { sniffImage } from '../supabase/functions/server/imageSniff.ts';

const PNG = { mime: 'image/png', ext: 'png' };

// ── when the public sees a logo ─────────────────────────────────────────────

test('an approved logo on a claimed listing is public', () => {
  assert.ok(logoIsPublic({
    logo_path: 'exchange-logos/abc.png',
    logo_state: 'approved',
    claim_state: 'claimed',
  }));
});

test('a logo stops being public the moment the claim does', () => {
  /*
   * The suspend route puts claim_state back to 'listed' when a claim turns out
   * to be wrong — somebody claimed a business they do not own. If the logo kept
   * showing, the directory would still be displaying a brand nobody standing
   * behind the listing had authorised, which is the whole thing we refuse to do.
   */
  assert.ok(!logoIsPublic({
    logo_path: 'exchange-logos/abc.png',
    logo_state: 'approved',
    claim_state: 'listed',
  }));
});

test('nothing but approved is public, whatever else the row says', () => {
  for (const state of ['submitted', 'rejected', 'none', '', null, undefined, 'APPROVED']) {
    assert.ok(
      !logoIsPublic({ logo_path: 'exchange-logos/a.png', logo_state: state, claim_state: 'claimed' }),
      `${String(state)} must not be public`,
    );
  }
});

test('an approved state with no image behind it shows nothing', () => {
  // The database has a constraint against this; the server does not rely on it.
  // A broken image on a business's own listing is worse than no logo at all.
  assert.ok(!logoIsPublic({ logo_path: null, logo_state: 'approved', claim_state: 'claimed' }));
  assert.ok(!logoIsPublic({ logo_path: '   ', logo_state: 'approved', claim_state: 'claimed' }));
});

test('no row is not a public logo', () => {
  assert.ok(!logoIsPublic(null));
  assert.ok(!logoIsPublic(undefined));
});

// ── who may publish ────────────────────────────────────────────────────────

test('a business can never reach approved, from any state', () => {
  /*
   * Eric's standing rule: nothing a tenant publishes reaches a resident without
   * a person saying so. Enforced as a refused transition rather than a hidden
   * button, so no sequence of business-side requests can publish an image.
   */
  for (const from of ['none', 'submitted', 'rejected', 'approved']) {
    assert.ok(!businessMayMove(from, PUBLISHED_STATE), `${from} → approved must be refused`);
  }
});

test('a business may submit, replace and take down its own logo', () => {
  assert.ok(businessMayMove('none', 'submitted'));
  assert.ok(businessMayMove('rejected', 'submitted'));
  assert.ok(businessMayMove('approved', 'submitted'));
  assert.ok(businessMayMove('approved', 'none'));
  assert.ok(businessMayMove('submitted', 'none'));
});

test('replacing an approved logo sends it back to the queue', () => {
  // Otherwise approval means nothing: submit something inoffensive, wait for
  // the tick, then swap the image for anything at all.
  assert.ok(businessMayMove('approved', 'submitted'));
  assert.ok(!businessMayMove('approved', 'approved'));
});

test('staff decide, and only on something that was submitted', () => {
  assert.ok(staffMayMove('submitted', 'approved'));
  assert.ok(staffMayMove('submitted', 'rejected'));
  assert.ok(!staffMayMove('none', 'approved'));
  assert.ok(!staffMayMove('none', 'rejected'));
});

test('staff can reverse a decision without making the owner upload again', () => {
  assert.ok(staffMayMove('approved', 'rejected'));
  assert.ok(staffMayMove('rejected', 'approved'));
});

test('an unknown state authorises nothing', () => {
  assert.ok(!businessMayMove('banana', 'submitted'));
  assert.ok(!staffMayMove(undefined, 'approved'));
  assert.ok(!staffMayMove(null, 'rejected'));
});

// ── what may be stored, and where ──────────────────────────────────────────

test('the stored path is keyed by the listing, so a replacement overwrites', () => {
  const first = logoObjectPath('11111111-2222-3333-4444-555555555555', 'png');
  const again = logoObjectPath('11111111-2222-3333-4444-555555555555', 'png');
  assert.equal(first, again);
  assert.ok(first.startsWith('exchange-logos/'));
});

test('the extension comes from the bytes, and a strange one is not trusted', () => {
  assert.ok(logoObjectPath('abc', 'webp').endsWith('.webp'));
  // Never from a filename: "logo.php" and friends do not get to name the object.
  assert.ok(logoObjectPath('abc', '../../evil.html').endsWith('.bin'));
  assert.ok(logoObjectPath('abc', '').endsWith('.bin'));
});

test('an SVG is refused, with the reason said out loud', () => {
  /*
   * The one refusal worth a test of its own. An SVG is an XML document that can
   * carry script, and these files are served from a public bucket, so accepting
   * one is stored cross-site scripting. `sniffImage` returns null for it, which
   * is what this relies on.
   */
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
  assert.equal(sniffImage(svg), null);
  const refusal = refuseLogo(sniffImage(svg), svg.length);
  assert.match(String(refusal), /SVG cannot be accepted/i);
});

test('a real PNG is accepted', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assert.equal(sniffImage(png)?.ext, 'png');
  assert.equal(refuseLogo(sniffImage(png), png.length), null);
});

test('an oversized file is refused in megabytes, not bytes', () => {
  const refusal = refuseLogo(PNG, MAX_LOGO_BYTES + 1);
  assert.match(String(refusal), /under 2MB/);
});

test('an empty file is refused before anything else is said about it', () => {
  assert.match(String(refuseLogo(PNG, 0)), /empty/i);
  assert.match(String(refuseLogo(null, 0)), /empty/i);
});

// ── what the owner is told ─────────────────────────────────────────────────

test('a waiting logo is described as not yet on the listing', () => {
  // The commonest misunderstanding: uploading feels like publishing.
  assert.match(phraseLogoState('submitted'), /not on your listing yet/i);
});

test('a rejection carries the reason when there is one', () => {
  assert.match(phraseLogoState('rejected', "That is somebody else's logo."), /somebody else/);
  assert.match(phraseLogoState('rejected', '   '), /Upload a different image/);
});

test('no logo reads as no logo rather than an error', () => {
  assert.match(phraseLogoState('none'), /No logo yet/);
  assert.match(phraseLogoState(undefined), /No logo yet/);
});

// ── the address a browser loads it from ────────────────────────────────────

test('a public logo gets a versioned address', () => {
  const url = publicLogoUrl({
    logo_path: 'exchange-logos/abc.png',
    logo_state: 'approved',
    claim_state: 'claimed',
    logo_submitted_at: '2026-10-15T12:00:00.000Z',
  }, 'https://project.supabase.co');

  assert.ok(String(url).includes('/storage/v1/object/public/'));
  assert.ok(String(url).includes('exchange-logos/abc.png'));
  /*
   * The version is what makes a replacement visible. The object path is keyed
   * by the organisation so a new logo overwrites the old one — which means it
   * arrives at an address a CDN already has an answer for.
   */
  assert.match(String(url), /\?v=\d+$/);
});

test('a replacement is a different address', () => {
  const row = {
    logo_path: 'exchange-logos/abc.png',
    logo_state: 'approved',
    claim_state: 'claimed',
  };
  const before = publicLogoUrl({ ...row, logo_submitted_at: '2026-10-15T12:00:00.000Z' }, 'https://p.supabase.co');
  const after = publicLogoUrl({ ...row, logo_submitted_at: '2026-10-16T09:30:00.000Z' }, 'https://p.supabase.co');
  assert.notEqual(before, after);
});

test('a logo the public may not see has no address at all', () => {
  // Not an address the caller is trusted to withhold — no address.
  assert.equal(publicLogoUrl({
    logo_path: 'exchange-logos/abc.png',
    logo_state: 'submitted',
    claim_state: 'claimed',
    logo_submitted_at: '2026-10-15T12:00:00.000Z',
  }, 'https://project.supabase.co'), null);
});

test('the owner sees their own submission before anybody else does', () => {
  // Ungated on purpose: they uploaded it, and telling them to take our word
  // for what it looks like would be absurd.
  const url = logoObjectUrl('exchange-logos/abc.png', '2026-10-15T12:00:00.000Z', 'https://p.supabase.co');
  assert.ok(String(url).includes('exchange-logos/abc.png'));
});

test('a trailing slash on the project url does not double up', () => {
  const url = logoObjectUrl('exchange-logos/a.png', null, 'https://p.supabase.co/');
  assert.ok(!String(url).includes('.co//storage'));
});

test('no path and no project url produce nothing rather than a broken address', () => {
  assert.equal(logoObjectUrl('', '2026-10-15T12:00:00.000Z', 'https://p.supabase.co'), null);
  assert.equal(logoObjectUrl('exchange-logos/a.png', null, ''), null);
  assert.equal(logoObjectUrl(null, null, null), null);
});

// ── surviving a migration that has not been run ────────────────────────────

test('a missing logo column is recognised, by code or by message', () => {
  /*
   * Deploys here are manual and the function deploys on its own — deploy.md
   * documents `supabase functions deploy` and nothing in it applies a
   * migration. So this code can be live against a database without these
   * columns, and the directory must not go down because a logo cannot be
   * found. These are the shapes PostgREST actually returns.
   */
  assert.ok(looksLikeMissingLogoColumn({
    code: '42703',
    message: 'column organizations.logo_path does not exist',
  }));
  assert.ok(looksLikeMissingLogoColumn({
    message: 'column organizations.logo_state does not exist',
  }));
  assert.ok(looksLikeMissingLogoColumn({
    code: '42703',
    message: 'column organizations.logo_submitted_at does not exist',
  }));
});

test('an unrelated missing column is not swallowed as "no logo yet"', () => {
  // A typo in some other select must surface as the error it is, not quietly
  // turn into a listing served without its logo for the rest of the isolate.
  assert.ok(!looksLikeMissingLogoColumn({
    code: '42703',
    message: 'column organizations.phonee does not exist',
  }));
});

test('an ordinary failure is not mistaken for a missing column', () => {
  assert.ok(!looksLikeMissingLogoColumn({ code: '57014', message: 'canceling statement due to statement timeout' }));
  assert.ok(!looksLikeMissingLogoColumn({ message: 'FetchError: network timeout' }));
  assert.ok(!looksLikeMissingLogoColumn(null));
  assert.ok(!looksLikeMissingLogoColumn(undefined));
});

test('the logo columns name exactly what logoIsPublic and the url need', () => {
  // If these drift apart, the fallback query succeeds and every logo silently
  // stops appearing — the worst kind of failure, because nothing errors.
  for (const column of ['logo_path', 'logo_state', 'logo_submitted_at']) {
    assert.ok(LOGO_SELECT_COLUMNS.includes(column), `${column} must be selected`);
  }
});
