/**
 * Who the badge says you are, and what a password manager puts in the boxes.
 *
 * Both found on production on 2026-11-19 while creating a test account
 * through the junk-removal button.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const stripComments = (code: string) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/* ── the role badge shows the session, not a leftover ────────────────────── */

/**
 * THE BADGE SHOWED A DIFFERENT CUSTOMER'S EMAIL.
 *
 * `RoleSwitcher` renders `user.email` from `useUser()` — a preview identity
 * persisted in the browser — while the real session comes from `useAuth()`.
 * The effect that reconciles them only ran when the preview identity was
 * ABSENT, so one left behind by an earlier sign-in simply stayed.
 *
 * Observed: signed in as the owner (`user_metadata.name: ericerb555`,
 * `app_metadata.role: owner`), three lines under a "Welcome back, Eric"
 * greeting, the header read "Platform Owner (You)" above
 * jbrenes19@gmail.com — a customer's address, in another user's "(You)"
 * badge. It misidentifies the person holding the session and shows one
 * account holder the address of another.
 */
test('a stale preview identity is corrected, not displayed', () => {
  const code = stripComments(read('src/app/components/RoleSwitcher.tsx'));

  assert.match(
    code, /previewEmail\s*!==\s*authEmail/,
    'the badge no longer notices when its identity disagrees with the session, '
    + "so it can show another account holder's email again",
  );
  assert.doesNotMatch(
    code, /if \(canUse && !user && authEmail\) login\(/,
    'the repair is back to the absent-only case, which is what let the stale '
    + 'identity survive',
  );
  /* The session has to be what it is reconciled TO. */
  assert.match(code, /login\(authEmail,/, 'it no longer restores from the authenticated email');
});

/* ── the sign-up form tells the password manager what it is ──────────────── */

/**
 * BOTH PASSWORD BOXES ARRIVED PREFILLED ON A SIGN-UP FORM.
 *
 * Not one field declared `autoComplete`, so managers guessed. The phone box
 * came prefilled with an EMAIL ADDRESS — the saved username, in a
 * `type="tel"` input — and both password boxes came prefilled with the
 * password already saved for the site, while a NEW account was being made.
 *
 * That is one keystroke from giving a throwaway account the owner's real
 * password, and from storing that password under a second identity.
 * `new-password` is what tells a manager this is a new credential: offer to
 * generate one, do not fill the existing one.
 */
test('every sign-up field says what it wants', () => {
  const code = read('src/app/pages/SignUp.tsx');

  for (const [field, value] of [
    ['full name', 'name'],
    ['email', 'email'],
    ['phone', 'tel'],
  ] as [string, string][]) {
    assert.ok(
      code.includes(`autoComplete="${value}"`),
      `the ${field} field no longer declares autoComplete="${value}", so a manager will guess again`,
    );
  }

  const newPassword = code.split('autoComplete="new-password"').length - 1;
  assert.equal(
    newPassword, 2,
    'both the password and confirm-password fields must be marked new-password — '
    + 'without it a manager fills the saved password into a sign-up form',
  );
});

/**
 * And no password field on this form may claim to be an existing one.
 *
 * `current-password` is the attribute that ASKS a manager to fill the saved
 * credential. On a form that creates an account it is precisely wrong.
 */
test('the sign-up form never asks for the saved password', () => {
  const code = stripComments(read('src/app/pages/SignUp.tsx'));
  assert.doesNotMatch(code, /autoComplete="current-password"/);
});
