/**
 * The page a texted junk pricing link opens.
 *
 * Eric, 2026-11-16: *"also can we create a link to the junk pricing tool i can
 * text?"*
 *
 * WHO IS LOOKING AT THIS
 *
 * Somebody standing in a basement holding a phone, who has never seen this
 * company's app, arrived from a text message, and has no account. So it carries
 * none of the app's chrome, asks for nothing before it is useful, and the first
 * thing on it is the camera button — not a sign-in, not a form, not an
 * explanation of what Black Phoenix is.
 *
 * THE TOKEN RIDES IN THE PATH
 *
 * `/junk-quote/<token>`, the same shape `architect-review` already uses and
 * registered the same way, through `PREFIX_ROUTES` in `App.tsx`. A query string
 * was the alternative and is worse: SMS clients truncate long URLs and the
 * place they truncate is the end, which is exactly where a query parameter
 * lives. A path segment survives being forwarded through three chat apps.
 *
 * NOTHING IS VALIDATED HERE
 *
 * The page does not check the token, and deliberately: a browser cannot. It
 * hands it to the server with the photographs, and the server decides whether
 * it is still good. That means a dead link produces a real refusal from the
 * only thing that knows — and it also means this page shows a stranger nothing
 * about whether a token they guessed at was ever real, because it has not
 * asked.
 */
import TrashEstimatePanel from '../components/portals/TrashEstimatePanel';

export default function JunkQuoteLink() {
  /*
   * Read from the path at render rather than held in state.
   *
   * There is nothing to keep in sync — the token does not change while the page
   * is open, and a visitor who edits the URL should get whatever they now have
   * rather than what they arrived with.
   */
  const token = (() => {
    try {
      const parts = window.location.pathname.split('/').filter(Boolean);
      // ['junk-quote', '<token>']
      return parts.length > 1 ? decodeURIComponent(parts[1]) : '';
    } catch {
      return '';
    }
  })();

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <header className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-orange-500">
            Black Phoenix Builds
          </p>
          <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
            What will it cost to take this away?
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Photograph the pile — a wide shot and a couple of close-ups — and you will get a price
            back. No account needed, and nothing is charged.
          </p>
        </header>

        {token ? (
          <TrashEstimatePanel linkToken={token} />
        ) : (
          /*
           * No token in the path at all. This is somebody who opened
           * /junk-quote by hand or had the end of the link truncated, and the
           * second is likely enough to be worth saying out loud — a person
           * whose text message got cut short otherwise sees a dead page and
           * concludes the company's website is broken.
           */
          <div
            className="rounded-xl p-5"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}
          >
            <p className="text-sm font-black text-white">This link looks incomplete</p>
            <p className="mt-2 text-sm text-gray-400">
              Links sometimes get cut short when they are forwarded. Open the one we sent you
              directly from the original message, or call us on{' '}
              <a href="tel:6032072248" className="font-bold text-orange-400">603-207-2248</a>{' '}
              and we will send a fresh one.
            </p>
          </div>
        )}

        <footer className="mt-8 text-xs text-gray-600">
          <p>
            An estimate from photographs, not a site visit. If the pictures miss something we will
            tell you before any work starts rather than on the day.
          </p>
        </footer>
      </div>
    </div>
  );
}
