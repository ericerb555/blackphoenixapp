/**
 * Who may read a conversation.
 *
 * WHAT THIS CLOSES
 *
 * `GET /messaging/conversations/:convId/messages` took a conversation id and
 * returned every message in it, with **no ownership check at all**. The only
 * gate in front of it was the blanket "are you signed in", so any signed-in
 * vendor, tenant or customer could read anybody else's thread with the company
 * — and the ids are `conv_{timestamp}`, so they are not hard to arrive at.
 *
 * The listing route was the same shape from the other direction: it took a
 * `userId` from the path and an `email` from the query string and answered
 * with whatever matched. Both are supplied by the caller, so asking for
 * somebody else's conversations was a matter of typing their address.
 *
 * IDENTITY COMES FROM THE TOKEN, NEVER FROM THE URL
 *
 * That is the whole fix. The verified account decides what is visible; the
 * path and query are used to narrow it, never to widen it.
 *
 * FAIL CLOSED
 *
 * An actor who cannot be identified sees nothing, and a conversation whose
 * participants cannot be read is not shown. The alternative — defaulting to
 * visible when a record looks odd — is how one malformed row becomes a leak.
 */

export interface ConversationViewer {
  /** From the verified token. Empty means unidentifiable, which sees nothing. */
  email: string;
  /** The auth user id, because some participants are recorded by UUID. */
  userId?: string;
  /** True only for a company-side role, resolved from `app_metadata`. */
  isStaff: boolean;
}

interface Participant {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

interface ConversationLike {
  participants?: Participant[];
  metadata?: { customerEmail?: string } | null;
}

const norm = (value: unknown): string => String(value ?? '').trim().toLowerCase();

/** Does this participant entry refer to the viewer? */
const isViewer = (p: Participant | null | undefined, viewer: ConversationViewer): boolean => {
  if (!p) return false;
  const email = norm(viewer.email);
  const uid = norm(viewer.userId);

  /**
   * `userId` holds an email on some rows and a UUID on others — both spellings
   * are in production. Checking each against both of the viewer's identifiers
   * is what makes this work across the history rather than only for whichever
   * shape was written last.
   */
  const candidates = [norm(p.userId), norm(p.userEmail)].filter(Boolean);
  return candidates.some((c) => (email && c === email) || (uid && c === uid));
};

/** Is this a company-side participant? */
export const isStaffParticipant = (p: Participant | null | undefined): boolean => {
  const role = norm(p?.userRole);
  return role === 'admin' || role === 'owner' || role === 'staff' || role === 'employee';
};

/**
 * May this viewer read this conversation?
 *
 * Staff may read the company's threads — that is what an inbox is. They are
 * NOT given a blanket key to every conversation on the platform: the rule is
 * that the conversation has a company-side participant, so a thread between
 * two other parties is still not theirs to open.
 *
 * Everybody else may read a conversation they are in, and nothing else.
 */
export function mayReadConversation(
  conversation: ConversationLike | null | undefined,
  viewer: ConversationViewer | null | undefined,
): boolean {
  if (!conversation || !viewer) return false;
  if (!norm(viewer.email) && !norm(viewer.userId)) return false;

  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];

  if (isViewer({ userEmail: conversation.metadata?.customerEmail }, viewer)) return true;
  if (participants.some((p) => isViewer(p, viewer))) return true;

  if (viewer.isStaff && participants.some(isStaffParticipant)) return true;

  return false;
}

/**
 * The conversations this viewer may see, out of all of them.
 *
 * Deliberately a filter over the full set rather than a lookup by the id the
 * caller supplied. The caller's id is not evidence of anything; the verified
 * account is.
 */
export function visibleConversations<T extends ConversationLike>(
  all: Array<T | null | undefined>,
  viewer: ConversationViewer | null | undefined,
): T[] {
  return (all || []).filter((c): c is T => Boolean(c) && mayReadConversation(c, viewer));
}

/**
 * The staff inbox, without hunting for a magic id.
 *
 * The inbox asked for conversations whose participant was
 * `blackphoenix-admin`. Of the four that exist in production, the company side
 * is recorded as the literal `admin` twice and as the owner's auth UUID twice.
 * None of them matches, so the inbox was empty while real customers waited —
 * one of them had messaged twice and had no reply.
 *
 * Asking for the ROLE instead of an id catches every spelling that has been
 * written and every one that will be.
 */
export function staffInbox<T extends ConversationLike>(all: Array<T | null | undefined>): T[] {
  return (all || []).filter(
    (c): c is T => Boolean(c)
      && Array.isArray(c!.participants)
      && c!.participants!.some(isStaffParticipant),
  );
}

/**
 * How many unread messages this viewer has waiting.
 *
 * `unreadCount` is a map keyed by participant id, and the company side is
 * written under three different ids across the real conversations — the
 * literal `admin`, the owner's auth UUID, and `blackphoenix-admin` where
 * something used the screen's constant. Summing under any one of them
 * undercounts, which for a badge means messages that are never noticed.
 *
 * So for staff the count is taken under whichever id the STAFF PARTICIPANT of
 * that particular conversation carries, conversation by conversation. For
 * everybody else it is taken under their own identifiers.
 */
export function unreadForViewer(
  conversations: Array<(ConversationLike & { unreadCount?: Record<string, number> }) | null | undefined>,
  viewer: ConversationViewer | null | undefined,
): number {
  if (!viewer) return 0;

  let total = 0;
  for (const conversation of conversations || []) {
    if (!mayReadConversation(conversation, viewer)) continue;

    const counts = conversation!.unreadCount || {};
    const participants = Array.isArray(conversation!.participants) ? conversation!.participants! : [];

    const keys = viewer.isStaff
      ? participants.filter(isStaffParticipant).map((p) => String(p?.userId ?? ''))
      : participants.filter((p) => isViewer(p, viewer)).map((p) => String(p?.userId ?? ''));

    /**
     * Each conversation contributes once. A thread with two company-side
     * participants must not be counted twice, so the largest of the matching
     * keys is taken rather than their sum.
     */
    let most = 0;
    for (const key of keys) {
      const n = Number(counts[key]);
      if (Number.isFinite(n) && n > most) most = n;
    }
    total += most;
  }
  return total;
}

/**
 * The one thread between the company and a given account.
 *
 * WHY DEDUPLICATION KEYS ON THE CUSTOMER AND NOT ON BOTH SIDES
 *
 * The create route matched an existing conversation like this:
 *
 *     ids.includes(user1Id) && (ids.includes(user2Id) || convEmail === email)
 *
 * — where `user1Id` is the company. But the company side is written as the
 * literal `admin` by one caller, as the owner's auth UUID by another, and as
 * `blackphoenix-admin` by the messaging screen's constant. So the same
 * customer writing in through two different paths failed the first clause and
 * was given a SECOND thread. That is exactly what happened to one real
 * customer: two conversations, created thirteen seconds apart.
 *
 * Which id we happen to use for ourselves is an implementation detail. It must
 * never fragment somebody's conversation with us. So the question this asks is
 * only "is the company in it, and is this account in it" — one portal account
 * and the company means one thread, however either side is spelled.
 */
export interface ThreadParty {
  userId?: string;
  email?: string;
}

/** Is this account a party to the conversation? Staff status is not considered. */
export function isParticipant(
  conversation: ConversationLike | null | undefined,
  party: ThreadParty | null | undefined,
): boolean {
  if (!conversation || !party) return false;
  const viewer: ConversationViewer = {
    email: String(party.email ?? ''),
    userId: String(party.userId ?? ''),
    isStaff: false,
  };
  if (!norm(viewer.email) && !norm(viewer.userId)) return false;

  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  if (isViewer({ userEmail: conversation.metadata?.customerEmail }, viewer)) return true;
  return participants.some((p) => isViewer(p, viewer));
}

/**
 * The existing company thread for this account, or null.
 *
 * When more than one exists — which is the state the old matching left behind
 * — the OLDEST is returned, so the thread with the history in it is the one
 * that keeps being added to rather than whichever was created most recently.
 */
export function existingThreadFor<T extends ConversationLike & { id?: string; createdAt?: string }>(
  all: Array<T | null | undefined>,
  party: ThreadParty | null | undefined,
): T | null {
  const matches = (all || []).filter((c): c is T =>
    Boolean(c)
    && Array.isArray(c!.participants)
    && c!.participants!.some(isStaffParticipant)
    && isParticipant(c, party));

  if (matches.length === 0) return null;

  return matches.sort((a, b) =>
    String(a.createdAt ?? a.id ?? '').localeCompare(String(b.createdAt ?? b.id ?? '')))[0];
}
