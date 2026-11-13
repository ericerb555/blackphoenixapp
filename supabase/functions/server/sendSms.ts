/**
 * The one door every text goes out through.
 *
 * WHY THIS IS A SEPARATE FILE AND NOT A CHECK INSIDE bird.ts
 *
 * The consent check was written into `sendBirdSms` first, which is the
 * obvious place: one function, impossible to bypass. It broke
 * `tests/bird.test.ts`, `birdSender.test.ts` and `birdVoice.test.ts`
 * immediately — the consent store reads the key-value store, `kv_store.tsx`
 * is a `.tsx`, and the Node test runner cannot load one.
 *
 * That failure was worth listening to rather than working around. `bird.ts`
 * decides what a well-formed Bird request looks like and what its errors
 * mean, and it was testable precisely because it reaches nothing. Giving it a
 * database made the whole module unprovable to buy one convenience. The same
 * reasoning put `quoteMargins`, `quoteTotal` and `laborBurden` in files of
 * their own: the part that can be argued about stays free of the world.
 *
 * So the transport stays pure, the RULES stay pure in `smsConsent.ts`, and
 * this fifteen-line file is the only thing that needs both. It is glue, and
 * glue is the right thing to have untested.
 *
 * NAMED sendTextMessage, NOT sendSms. This codebase already uses `sendSms`
 * as a BOOLEAN option on portal invites — `opts.sendSms` — and as a local
 * wrapper in the exchange claim routes. An import of that name is shadowed by
 * both, which TypeScript reports as "this expression is not callable" at the
 * call site rather than at the import, and which a JavaScript build would have
 * shipped silently.
 *
 * EVERY CALLER USES THIS. `sendBirdSms` is still exported because this file
 * needs it, and calling it directly is how a message gets sent to somebody
 * who asked us to stop. There is one number on this account and it carries
 * the on-call emergency pages, so a complaint earned by a bypassed check
 * suspends the emergency line.
 */

import { sendBirdSms, type SmsResult } from "./bird.ts";
import { maySendTo } from "./smsConsentStore.ts";
import type { SmsCategory } from "./smsConsent.ts";

export type { SmsResult };

/**
 * Send one text, if this number has not asked us not to.
 *
 * The check happens BEFORE the config is resolved, deliberately: "we did not
 * text them because they asked us not to" is true whether or not Bird is
 * configured, and it is the more useful line to find in a log.
 *
 * A store that will not read answers `unknown`, which refuses marketing and
 * allows operational traffic — the safe direction in both halves.
 */
export async function sendTextMessage(
  to: string,
  text: string,
  category: SmsCategory = "transactional",
): Promise<SmsResult> {
  const permission = await maySendTo(to, category);
  if (!permission.allowed) {
    console.log(`[SMS BLOCKED] ${String(to).slice(0, 6)}… ${category}: ${permission.reason}`);
    return { ok: false, error: `Not sent: ${permission.reason}.`, blocked: true };
  }
  return await sendBirdSms(to, text, category);
}
