/**
 * Five placeholder reels, submitted to the review queue.
 *
 * Eric: "can you please use the app and create some reels to put on the
 * landing page? trash removal, kitchen remodeling, bathroom remodeling,
 * painting and flooring" — then "just make them up for now down the road we
 * can use ours", and "put them in the system for my review".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THESE ARE PLACEHOLDERS AND THEY SAY SO
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The footage is Google's public sample video and the stills are stock. None
 * of it is Black Phoenix's work. That is fine for laying out a page and
 * wrong to leave in front of a customer: a reel on the landing page implies
 * "this is what we did", and a trade whose entire pitch is that it can be
 * trusted cannot afford a customer discovering the bathroom was somebody
 * else's.
 *
 * So every one is submitted as PENDING, never published. They land in
 * Owner's Dashboard -> Review Queue, where they can be approved one at a
 * time — and the id prefix below makes the whole set findable later when the
 * real footage exists.
 *
 * WHY THESE PARTICULAR HOSTS
 *
 * Not arbitrary. `vercel.json` already allows exactly two外 sources, and
 * anything else is blocked by the Content-Security-Policy and renders as a
 * dead player:
 *
 *   media-src ... https://commondatastorage.googleapis.com   (the video)
 *   img-src   ... https://images.unsplash.com                (the stills)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW TO RUN IT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Submitting needs a signed-in session, which a Node script does not have.
 * So this prints a snippet to paste into the browser console while signed in
 * as staff on theblackphoenixcompany.com:
 *
 *     node scripts/seed-placeholder-reels.mjs
 *
 * Then paste the output into the console. Five submissions, one paste.
 */

const PLACEHOLDER_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

/** A stock still, sized for a vertical reel card. */
const shot = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

/**
 * The five, written as the finished thing rather than as filler.
 *
 * The copy is the part that survives when the footage is replaced, so it is
 * worth writing properly now: what the job is, what the customer gets, and
 * one reason to call rather than scroll. No superlatives, no "transform your
 * space" — a contractor who talks like a brochure sounds like one.
 */
const REELS = [
  {
    id: 'reel_placeholder_trash',
    title: 'Trash removal and clear-outs',
    description:
      'Skips, loading and tip fees handled. Garage, basement, estate clear-out or the '
      + 'debris from somebody else’s job — we take it away and sweep up after it. '
      + 'Minimum $125, quoted before we start.',
    linkUrl: '/work-request?service=trash-removal',
    thumbnailUrl: shot('1558618666-fcd25c85cd64'),
  },
  {
    id: 'reel_placeholder_kitchen',
    title: 'Kitchen remodeling',
    description:
      'Strip-out to final clean, run as phases you can see finished: set-up and protection, '
      + 'demo, first fix, cabinets and worktops, second fix, hand-over. You get the phase '
      + 'prices up front and pay against the ones that are done.',
    linkUrl: '/work-request?service=kitchen-remodel',
    thumbnailUrl: shot('1556909212-d5b604d0c90d'),
  },
  {
    id: 'reel_placeholder_bathroom',
    title: 'Bathroom remodeling',
    description:
      'One bathroom out of use, not the whole house. Waterproofing and first fix done '
      + 'properly before anything pretty goes on top — the part nobody photographs and '
      + 'everybody pays for twice when it is skipped.',
    linkUrl: '/work-request?service=bathroom-remodel',
    thumbnailUrl: shot('1620626011761-996317b8d101'),
  },
  {
    id: 'reel_placeholder_painting',
    title: 'Interior and exterior painting',
    description:
      'Prep is most of the job: filling, sanding, caulking and masking before a brush is '
      + 'opened. Rooms back in use the same day where we can, and we move the furniture '
      + 'back ourselves.',
    linkUrl: '/work-request?service=painting',
    thumbnailUrl: shot('1562259929-b4e1fd3aef09'),
  },
  {
    id: 'reel_placeholder_flooring',
    title: 'Flooring — supply or fit your own',
    description:
      'Hardwood, LVP, tile and carpet. Subfloor checked and levelled first, because a '
      + 'beautiful floor on a bad subfloor is a complaint waiting six months. Buying your '
      + 'own material? That comes off the bill, itemised.',
    linkUrl: '/work-request?service=flooring',
    thumbnailUrl: shot('1581858726788-75bc0f6a952d'),
  },
].map((r) => ({
  ...r,
  videoUrl: PLACEHOLDER_VIDEO,
  submitterName: 'Black Phoenix Builds',
  submitterType: 'content',
}));

const snippet = `
/* Paste this while signed in as staff on theblackphoenixcompany.com.
   It submits 5 PLACEHOLDER reels to Owner's Dashboard -> Review Queue.
   Nothing is published; each one still has to be approved by you. */
(async () => {
  const reels = ${JSON.stringify(REELS, null, 2)};
  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) return console.error('Sign in first.');
  const base = location.origin.includes('localhost')
    ? 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1'
    : 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1';
  for (const reel of reels) {
    const res = await fetch(base + '/make-server-3eae23a6/social/submit-reel', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reel),
    });
    const body = await res.json().catch(() => ({}));
    console.log(res.ok ? 'submitted: ' + reel.title : 'FAILED: ' + reel.title, body);
  }
  console.log('Done. Open Owner\\'s Dashboard -> Review Queue.');
})();
`;

console.log(snippet);
