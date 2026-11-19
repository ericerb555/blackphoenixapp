/**
 * The honest answer for a screen whose data store was never built.
 *
 * WHY THIS EXISTS
 *
 * The November 2026 audit found eleven tables that the browser queries and
 * that have never existed. `supabase-js` does not throw on a missing table —
 * it resolves with an error object, which the calling code generally discards
 * — so the screens rendered as *empty* rather than as broken. Four of them are
 * reachable from the route table today.
 *
 * An empty dashboard is the worst of the three possible answers. "Nothing has
 * happened yet" and "this was never finished" look identical, so an operator
 * reads a blank engagement report as a quiet week rather than as an absent
 * feature, and nobody ever reports it.
 *
 * WHY NOT JUST DELETE THE SCREENS
 *
 * Because the brief for that audit said so, and it was right: classify, do not
 * delete. These are substantial features — 28 queries between them — that were
 * built front-first and are a decision away from being finished. Mounting this
 * notice instead of the screen keeps every line of that work in the tree and
 * is one import away from being reverted.
 *
 * It also takes the controls off the screen, which matters: the portal screen
 * had a delete button that reported "Portal deleted successfully" against a
 * table that does not exist.
 */
interface FeatureNotBuiltProps {
  /** What the user was trying to open, in their words. */
  title: string;
  /** One sentence on what it will do once the data store exists. */
  description: string;
  /** The tables it needs, so the next person does not have to go looking. */
  needs?: string[];
}

export function FeatureNotBuilt({ title, description, needs }: FeatureNotBuiltProps) {
  return (
    <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-8 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-2xl"
        aria-hidden="true"
      >
        🚧
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-prose text-sm leading-6 text-zinc-400">
        {description}
      </p>
      <p className="mt-4 text-sm text-zinc-500">
        This screen is not finished. It is showing you this instead of an empty
        page so that nothing here is mistaken for real data.
      </p>
      {needs?.length ? (
        <p className="mt-3 font-mono text-xs text-zinc-600">
          waiting on: {needs.join(', ')}
        </p>
      ) : null}
    </div>
  );
}

export default FeatureNotBuilt;
