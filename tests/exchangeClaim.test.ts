/**
 * Whether somebody has proven they own a listing.
 *
 * WHY THESE ASSERTIONS
 *
 * This is the one decision in the Exchange where being wrong hands a
 * stranger a real business's phone calls. Every rule below has a tempting
 * wrong version, and the tempting version is always the permissive one,
 * because the permissive version makes the directory fill up faster.
 *
 * TWO PROOFS IN THE SAME CATEGORY ARE NOT TWO FACTORS. The tempting wrong
 * version counts challenges rather than categories — and then a domain-matched
 * email plus a DNS record, which both only prove "controls the domain",
 * claims any listing whose website an attacker has registered a lookalike of.
 * Four tests pin this from different directions because it is the rule the
 * whole design rests on.
 *
 * AN UNKNOWN PROOF PROVES NOTHING. The tempting wrong version trusts the
 * category written on the row. A row carrying a category we do not recognise
 * has to count for zero, or inserting one becomes the attack.
 *
 * A BURNED OR EXPIRED CHALLENGE IS DEAD FOR EVER. The tempting wrong version
 * is checking expiry only, which leaves a brute-forced code answerable the
 * moment somebody guesses it on the sixth try.
 *
 * SUBDOMAIN MATCHING IS NOT SUBSTRING MATCHING. `example.com.attacker.net`
 * ends with nothing that should pass, and `.includes()` says it does.
 *
 * ALREADY-CLAIMED BEATS ANY AMOUNT OF PROOF. No quantity of factors takes a
 * listing off its owner automatically — the legitimate case (a business sold
 * last month) and the attack are indistinguishable from here.
 *
 * The constants are pinned too, so changing an attempt limit or an issue cap
 * is a deliberate act with a failing test attached.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACTORS,
  factorCategory,
  enabledFactor,
  challengeUsable,
  challengeExpiry,
  withinIssueCap,
  provenCategories,
  reachableCategories,
  assessClaim,
  disputeDeadline,
  sixDigitCode,
  maskPhone,
  maskEmail,
  websiteDomain,
  emailMatchesDomain,
  CHALLENGE_TTL_MINUTES,
  MAX_ATTEMPTS,
  MAX_CHALLENGES_PER_ORG_PER_DAY,
  DISPUTE_DAYS,
  type ChallengeRow,
} from '../supabase/functions/server/exchangeClaim.ts';

const NOW = '2026-10-02T12:00:00.000Z';
const at = (minutes: number) =>
  new Date(Date.parse(NOW) + minutes * 60 * 1000).toISOString();

/** A satisfied challenge in a category. */
const proven = (category: string): ChallengeRow => ({
  factor: 'phone_code',
  category,
  satisfied_at: NOW,
});

/* ── the constants ────────────────────────────────────────────────────── */

test('the limits are what the plan says they are', () => {
  assert.equal(CHALLENGE_TTL_MINUTES, 10);
  assert.equal(MAX_ATTEMPTS, 5);
  assert.equal(MAX_CHALLENGES_PER_ORG_PER_DAY, 6);
  assert.equal(DISPUTE_DAYS, 7);
});

/* ── the factor table ─────────────────────────────────────────────────── */

test('every factor belongs to exactly one known category', () => {
  const known = ['contact', 'web', 'premises', 'credential'];
  for (const f of FACTORS) {
    assert.ok(known.includes(f.category), `${f.factor} has category ${f.category}`);
  }
  // Both halves of the two-category rule need at least two categories that can
  // actually be offered without a person, or nothing is ever granted.
  const automatic = new Set(
    FACTORS.filter((f) => f.enabled && !f.manual).map((f) => f.category),
  );
  assert.ok(automatic.size >= 2, 'at least two categories are automatically provable');
});

test('the two web factors share a category, which is the point', () => {
  assert.equal(factorCategory('domain_email'), 'web');
  assert.equal(factorCategory('dns_token'), 'web');
  // And the record-contact factors are a different category from the domain
  // ones, or proving a domain twice would pass.
  assert.equal(factorCategory('email_code'), 'contact');
  assert.notEqual(factorCategory('email_code'), factorCategory('domain_email'));
});

test('an unrecognised factor has no category and cannot be offered', () => {
  assert.equal(factorCategory('owner_says_so'), null);
  assert.equal(factorCategory(''), null);
  assert.equal(factorCategory(null), null);
  assert.equal(factorCategory({ factor: 'phone_code' }), null);
  assert.equal(enabledFactor('owner_says_so'), null);
});

test('the postal factor is designed and switched off', () => {
  // Switched off rather than absent: the engine knows its shape, nothing
  // offers it, and a factor nobody posts must never be offered because the
  // claimant would wait for a letter that is not coming.
  assert.equal(factorCategory('postal_code'), 'premises');
  assert.equal(enabledFactor('postal_code'), null);
});

/* ── whether a challenge can be answered ──────────────────────────────── */

test('a fresh challenge is usable', () => {
  const r = challengeUsable(
    { attempts: 0, max_attempts: 5, expires_at: at(9) },
    NOW,
  );
  assert.equal(r.usable, true);
});

test('a spent challenge cannot be answered again', () => {
  const r = challengeUsable(
    { attempts: 1, max_attempts: 5, expires_at: at(9), satisfied_at: NOW },
    NOW,
  );
  assert.equal(r.usable, false);
  assert.equal(r.reason, 'already_satisfied');
});

test('a burned challenge is dead even while it is unexpired', () => {
  const r = challengeUsable(
    { attempts: 1, max_attempts: 5, expires_at: at(9), burned_at: NOW },
    NOW,
  );
  assert.equal(r.usable, false);
  assert.equal(r.reason, 'burned');
});

test('the fifth wrong answer closes the challenge', () => {
  assert.equal(
    challengeUsable({ attempts: 4, max_attempts: 5, expires_at: at(9) }, NOW).usable,
    true,
  );
  const spent = challengeUsable(
    { attempts: 5, max_attempts: 5, expires_at: at(9) },
    NOW,
  );
  assert.equal(spent.usable, false);
  assert.equal(spent.reason, 'attempts_exhausted');
});

test('expiry is exclusive at the boundary', () => {
  assert.equal(challengeUsable({ expires_at: at(0) }, NOW).reason, 'expired');
  assert.equal(challengeUsable({ expires_at: at(-1) }, NOW).reason, 'expired');
  assert.equal(challengeUsable({ expires_at: at(1) }, NOW).usable, true);
});

test('an unreadable or missing expiry is treated as expired', () => {
  // Failing the other way would turn a corrupt date into an unlimited
  // credential, which is the worst possible direction for this to fail.
  assert.equal(challengeUsable({ expires_at: null }, NOW).reason, 'expired');
  assert.equal(challengeUsable({ expires_at: 'soon' }, NOW).reason, 'expired');
  assert.equal(challengeUsable({ expires_at: at(9) }, 'not a date').reason, 'expired');
});

test('a missing challenge row is not usable', () => {
  assert.equal(challengeUsable(null, NOW).usable, false);
  assert.equal(challengeUsable(undefined, NOW).usable, false);
});

test('a challenge expires ten minutes after it was issued', () => {
  assert.equal(challengeExpiry(NOW), at(10));
});

/* ── the issue cap ────────────────────────────────────────────────────── */

test('the sixth code in a day is allowed and the seventh is not', () => {
  const five = [at(-10), at(-20), at(-30), at(-40), at(-50)];
  assert.equal(withinIssueCap(five, NOW), true);
  assert.equal(withinIssueCap([...five, at(-60)], NOW), false);
});

test('the cap is a rolling day, so yesterday does not count', () => {
  const old = Array.from({ length: 10 }, (_, i) => at(-60 * 25 - i));
  assert.equal(withinIssueCap(old, NOW), true);
});

test('unreadable issue times are ignored rather than counted', () => {
  // A junk timestamp must not spend somebody's allowance, and must not grant
  // extra either — it simply is not a code that was sent today.
  assert.equal(withinIssueCap([null, undefined, 'whenever'], NOW), true);
});

test('a bad clock refuses to issue', () => {
  assert.equal(withinIssueCap([], 'not a date'), false);
});

/* ── what has actually been proven ────────────────────────────────────── */

test('only satisfied challenges count', () => {
  assert.deepEqual(
    provenCategories([
      { category: 'contact', satisfied_at: NOW },
      { category: 'web' },
      { category: 'credential', satisfied_at: null },
    ]),
    ['contact'],
  );
});

test('a satisfied challenge that was later burned does not count', () => {
  assert.deepEqual(
    provenCategories([{ category: 'web', satisfied_at: NOW, burned_at: NOW }]),
    [],
  );
});

test('a category we do not recognise proves nothing', () => {
  // Inserting a row that says `category: 'trust_me'` must not be a claim.
  assert.deepEqual(
    provenCategories([
      { category: 'trust_me', satisfied_at: NOW },
      { category: '', satisfied_at: NOW },
      { category: null, satisfied_at: NOW },
    ]),
    [],
  );
});

test('the same category proven twice is still one category', () => {
  assert.deepEqual(
    provenCategories([proven('web'), proven('web'), proven('web')]),
    ['web'],
  );
});

/* ── what a listing could ever prove ──────────────────────────────────── */

test('a listing with a phone can reach contact, and credential by documents', () => {
  const reach = reachableCategories({ phone: '603-555-0100' });
  assert.deepEqual(reach, ['contact', 'credential']);
});

test('a website is what makes the web category reachable', () => {
  const reach = reachableCategories({ phone: '603-555-0100', website: 'https://x.com' });
  assert.ok(reach.includes('web'));
});

test('a listing with nothing can still reach credential and nothing else', () => {
  assert.deepEqual(reachableCategories({}), ['credential']);
  assert.deepEqual(reachableCategories({ phone: '   ' }), ['credential']);
});

test('premises is not reachable while the postal factor is off', () => {
  assert.ok(!reachableCategories({ phone: '1', website: 'https://x.com' }).includes('premises'));
});

/* ── the decision ─────────────────────────────────────────────────────── */

const WELL_KNOWN = { phone: '603-555-0100', website: 'https://sutton-roofing.com' };

test('two different categories grants the claim', () => {
  const r = assessClaim({
    challenges: [proven('contact'), proven('web')],
    listing: WELL_KNOWN,
    alreadyClaimed: false,
  });
  assert.equal(r.decision, 'granted');
  assert.deepEqual(r.proven, ['contact', 'web']);
});

test('two proofs in the same category does NOT grant the claim', () => {
  // The rule the whole design rests on. Both of these prove only "controls the
  // domain", and counting them as two factors would admit anybody who
  // registered a lookalike domain.
  const r = assessClaim({
    challenges: [
      { factor: 'domain_email', category: 'web', satisfied_at: NOW },
      { factor: 'dns_token', category: 'web', satisfied_at: NOW },
    ],
    listing: WELL_KNOWN,
    alreadyClaimed: false,
  });
  assert.notEqual(r.decision, 'granted');
  assert.deepEqual(r.proven, ['web']);
  assert.ok(r.outstanding.includes('contact'));
});

test('one category proven leaves the claim open with the rest to try', () => {
  const r = assessClaim({
    challenges: [proven('contact')],
    listing: WELL_KNOWN,
    alreadyClaimed: false,
  });
  assert.equal(r.decision, 'open');
  assert.deepEqual(r.outstanding, ['web']);
});

test('a phone-only listing that proves contact goes to a person', () => {
  // Eric's decision, 2026-10-02: not granted on one fact, and not refused for
  // being unlucky. This is most of a compiled directory's harder half.
  const r = assessClaim({
    challenges: [proven('contact')],
    listing: { phone: '603-555-0100' },
    alreadyClaimed: false,
  });
  assert.equal(r.decision, 'needs_review');
  assert.match(r.reason, /person will check/);
});

test('credential alone never grants, whatever else the listing holds', () => {
  // Documents read by a person are one category, not two, so the claim still
  // has work to do. With a phone on record that work is automatic; with
  // nothing on record there is nowhere left to go but a person.
  const withPhone = assessClaim({
    challenges: [proven('credential')],
    listing: { phone: '603-555-0100' },
    alreadyClaimed: false,
  });
  assert.equal(withPhone.decision, 'open');
  assert.deepEqual(withPhone.outstanding, ['contact']);

  const withNothing = assessClaim({
    challenges: [proven('credential')],
    listing: {},
    alreadyClaimed: false,
  });
  assert.equal(withNothing.decision, 'needs_review');
});

test('a second manual proof is not progress, it is the same queue twice', () => {
  // `credential` is never offered as the way OUT of review, because both the
  // factors under it need a person. Outstanding must only ever list categories
  // the claimant can finish on their own.
  const r = assessClaim({
    challenges: [proven('contact')],
    listing: { phone: '603-555-0100', website: 'https://sutton-roofing.com' },
    alreadyClaimed: false,
  });
  assert.ok(!r.outstanding.includes('credential'));
});

test('nothing proven on a reachable listing is simply open', () => {
  const r = assessClaim({ challenges: [], listing: WELL_KNOWN, alreadyClaimed: false });
  assert.equal(r.decision, 'open');
  assert.deepEqual(r.proven, []);
  assert.deepEqual(r.outstanding, ['contact', 'web']);
});

test('a listing with nothing at all goes to a person rather than nowhere', () => {
  const r = assessClaim({ challenges: [], listing: {}, alreadyClaimed: false });
  assert.equal(r.decision, 'needs_review');
});

test('already claimed beats any amount of proof', () => {
  const r = assessClaim({
    challenges: [proven('contact'), proven('web'), proven('credential')],
    listing: WELL_KNOWN,
    alreadyClaimed: true,
  });
  assert.equal(r.decision, 'disputed');
  assert.match(r.reason, /already claimed/i);
});

/* ── the dispute clock ────────────────────────────────────────────────── */

test('a dispute is ruled on seven days later', () => {
  assert.equal(disputeDeadline(NOW), '2026-10-09T12:00:00.000Z');
});

/* ── the code itself ──────────────────────────────────────────────────── */

test('a code is six digits, zero-padded, and varies', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 400; i += 1) {
    const code = sixDigitCode();
    assert.match(code, /^\d{6}$/);
    seen.add(code);
  }
  // 400 draws from a million: a collision is plausible, 400 identical codes
  // is not. This catches a generator that has stopped generating.
  assert.ok(seen.size > 350, `only ${seen.size} distinct codes in 400 draws`);
});

/* ── masking ──────────────────────────────────────────────────────────── */

test('a masked phone shows the last four digits and nothing else', () => {
  const masked = maskPhone('(603) 555-0142');
  assert.match(masked, /0142$/);
  assert.ok(!masked.includes('603'));
  assert.ok(!masked.includes('555'));
});

test('a short or missing phone masks to nothing readable', () => {
  assert.ok(!maskPhone('12').includes('12'));
  assert.ok(!maskPhone(null).match(/\d/));
  assert.ok(!maskPhone('').match(/\d/));
});

test('a masked email keeps one letter and the domain', () => {
  const masked = maskEmail('bookkeeping@sutton-roofing.com');
  assert.ok(masked.startsWith('b'));
  assert.ok(masked.endsWith('@sutton-roofing.com'));
  assert.ok(!masked.includes('ookkeeping'));
});

test('a one-letter local part does not unmask itself', () => {
  // The guard against producing 'a@x.com' from 'a@x.com' — recognisable to the
  // owner is fine, but it must not read as a complete address.
  const masked = maskEmail('a@x.com');
  assert.ok(masked.includes('•'));
});

test('something that is not an email masks to nothing', () => {
  assert.ok(!maskEmail('not-an-email').includes('not-an-email'));
  assert.ok(!maskEmail('@nolocal.com').includes('nolocal'));
  assert.ok(!maskEmail(null).includes('@'));
});

/* ── the domain rules ─────────────────────────────────────────────────── */

test('a website resolves to its registrable host without www', () => {
  assert.equal(websiteDomain('https://www.sutton-roofing.com/about'), 'sutton-roofing.com');
  assert.equal(websiteDomain('http://SUTTON-ROOFING.COM'), 'sutton-roofing.com');
});

test('only http and https are domains we accept proof against', () => {
  // These fields render as links across the portals and the store, so the
  // scheme check is not cosmetic.
  assert.equal(websiteDomain('javascript:alert(1)'), null);
  assert.equal(websiteDomain('data:text/html,<p>hi'), null);
  assert.equal(websiteDomain('ftp://files.example.com'), null);
});

test('junk, bare hosts and IP addresses are not domains', () => {
  assert.equal(websiteDomain('sutton-roofing.com'), null, 'no scheme is not a URL');
  assert.equal(websiteDomain('https://localhost'), null);
  assert.equal(websiteDomain('https://192.168.1.10'), null);
  assert.equal(websiteDomain(''), null);
  assert.equal(websiteDomain(null), null);
});

test('an email at the business domain matches, including a subdomain', () => {
  const site = 'https://www.sutton-roofing.com';
  assert.equal(emailMatchesDomain('dave@sutton-roofing.com', site), true);
  assert.equal(emailMatchesDomain('DAVE@Sutton-Roofing.com', site), true);
  assert.equal(emailMatchesDomain('dave@mail.sutton-roofing.com', site), true);
});

test('a lookalike domain does not match, which substring matching would allow', () => {
  const site = 'https://sutton-roofing.com';
  assert.equal(emailMatchesDomain('dave@sutton-roofing.com.attacker.net', site), false);
  assert.equal(emailMatchesDomain('dave@notsutton-roofing.com', site), false);
  assert.equal(emailMatchesDomain('dave@sutton-roofing.co', site), false);
  assert.equal(emailMatchesDomain('sutton-roofing.com@attacker.net', site), false);
});

test('no website means no email can prove the web category', () => {
  assert.equal(emailMatchesDomain('dave@anything.com', null), false);
  assert.equal(emailMatchesDomain('dave@anything.com', ''), false);
  assert.equal(emailMatchesDomain('dave@anything.com', 'javascript:x'), false);
});

test('malformed addresses do not match anything', () => {
  const site = 'https://sutton-roofing.com';
  assert.equal(emailMatchesDomain('@sutton-roofing.com', site), false);
  assert.equal(emailMatchesDomain('dave@', site), false);
  assert.equal(emailMatchesDomain('dave@sutton roofing.com', site), false);
  assert.equal(emailMatchesDomain('', site), false);
  assert.equal(emailMatchesDomain(null, site), false);
});
