/**
 * onCallIntake — reading an incoming work request as an emergency, or not.
 *
 * Three small questions, pure so they can be pinned by tests: is this an
 * emergency at all, whose rota answers it, and what kind of work is it. Each of
 * them fails silently when it is wrong — the wrong answer is a plausible one —
 * and each of them decides whether somebody is woken at three in the morning.
 */

/**
 * Is this record an emergency?
 *
 * `urgent` is the priority the portals already set on a real emergency, and an
 * explicit flag is honoured for callers that know. Anything else is ordinary
 * work and must not wake anybody: the whole value of a rota is that it is not
 * rung for a dripping tap, and a rota that goes off for everything is one
 * people stop answering.
 */
export function isEmergency(record: any): boolean {
  if (record?.isEmergency === true) return true;
  if (record?.isEmergency === false) return false;
  return String(record?.priority || '').trim().toLowerCase() === 'urgent';
}

/**
 * Whose rota answers this — NOT whoever reported it.
 *
 * A tenant reporting a burst pipe is not the account with the rota. Their
 * landlord is, and the landlord's plumber is who should be woken. Reading the
 * reporter's address here would look right in every test where the tester is
 * the landlord, and be wrong for every real tenant.
 *
 * The order is ownership first: the landlord or association that holds the
 * building, then whoever reported it. That last fallback covers a landlord
 * reporting something on their own property, and a plain customer with nobody
 * above them — who resolves to themselves, finds no rota, and escalates to
 * Black Phoenix, which is the right answer for a customer of ours.
 */
export function accountForRequest(record: any): string {
  return String(
    record?.landlordEmail
    || record?.landlord_email
    || record?.associationEmail
    || record?.ownerEmail
    || record?.owner_email
    || record?.client_email
    || record?.clientEmail
    || record?.email
    || '',
  ).trim().toLowerCase();
}

/**
 * What kind of emergency this is, in whatever words the record carries.
 *
 * Every spelling is checked rather than the one that happens to be current,
 * because the field names are inconsistent across this app's history and a
 * missed one produces an empty trade — which matches no service, falls to the
 * catch-all, and quietly wakes the wrong person.
 */
export function tradeOf(record: any): string {
  return String(
    record?.trade
    || record?.serviceType
    || record?.service_type
    || record?.project_type
    || record?.projectType
    || record?.category
    || '',
  ).trim();
}
