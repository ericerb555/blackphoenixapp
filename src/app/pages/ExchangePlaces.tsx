/**
 * Phoenix Exchange — places near you.
 *
 * The map as a destination rather than a view. Until now a map could only be
 * drawn after a resident had chosen a category, which is backwards: "what is
 * near me" is the question people arrive with, and "plumbers" is an answer
 * they work towards.
 *
 * WHY THIS IS A NEW PAGE AND NOT THE FRONT DOOR
 *
 * `/exchange` is the surface search engines walk to find listings, and the
 * whole free-traffic plan rests on it staying a crawlable tree of categories
 * and names. A map is a canvas: there is nothing in it for a crawler to read.
 * So this sits beside the directory as a first-class destination and is linked
 * prominently from it, rather than replacing the thing that earns the traffic.
 *
 * THE CONTROLS DO DIFFERENT JOBS, ON PURPOSE
 *
 *   a category   FILTERS    — removes everything else from the map and the list
 *   the search   HIGHLIGHTS — marks what it answers and dims the rest
 *   a location   SORTS      — nearest first, and nothing is hidden
 *   asking       EXPLAINS   — turns words into one of the three above
 *
 * Only one of them removes anything, and it is the one a resident chose
 * explicitly from a list of what is actually here. The other two never hide a
 * business, because the thing a map is for is noticing what you were not
 * looking for.
 *
 * ASKING IN WORDS DRIVES THE CONTROLS; IT IS NOT A FOURTH WAY TO SHOW A LIST
 *
 * "my basement smells damp after it rains" is not a business name, so the
 * search field cannot answer it. `/exchange/assistant` reads it, and this page
 * uses the answer for exactly ONE thing: picking the category chip a resident
 * could have picked themselves — which is then lit, labelled with what was
 * understood, and undone in one tap.
 *
 * The route also returns listings, and this page deliberately ignores them.
 * The server already refuses to let a model name a business it did not fetch;
 * here nothing a model has touched reaches the screen at all. Every pin and
 * every row came from `/exchange/nearby` and was measured in this browser,
 * exactly as it would have been if nobody had asked anything. A wrong guess
 * therefore costs a wrong chip — visible, one tap to clear — and can never
 * cost a business that does not exist.
 *
 * The field itself keeps working as it always has: instantly, on every
 * keystroke, against what is already loaded, for nothing. Asking is a separate
 * control and happens only on submit, because a model call per keystroke would
 * be both slower and a bill.
 *
 * WHERE YOU ARE NEVER LEAVES THIS BROWSER
 *
 * The server answers "this town" and the measuring happens here. That costs
 * something real — a resident near a boundary will not see the shop two miles
 * into the next town until they switch towns — and it is the right trade,
 * because the alternative buys a shorter list with the one piece of data this
 * directory has promised not to collect.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, MapPin, Search, X, Navigation,
  Crosshair, Building2, Store, Sparkles, ArrowRight,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import { useTowns, readTown, writeTown, townName } from '../lib/exchangeTowns';
import { measureListings, formatDistance, normalise } from '../lib/exchangeGeo';
import { useHere, pointOf } from '../lib/exchangeHere';
import ExchangeMap from '../components/exchange/ExchangeMap';
import type { MapPinData } from '../components/exchange/ExchangeMap';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Place {
  id: string;
  slug: string;
  name: string;
  claimed: boolean;
  location: { lat: number; lng: number };
  categoryIds: string[];
}

interface Category {
  id: string;
  slug: string;
  name: string;
  section_slug: string;
}

/**
 * What came back from an ask, reduced to the part this page acts on.
 *
 * The route's `listings` are not kept. They are the same businesses fetched a
 * second time and capped at six, and holding them here would invite a second,
 * differently filtered list onto a page whose point is one map everybody is
 * looking at. All that survives of them is `hasAny` — whether the directory
 * has anybody at all for this — which is the difference between "none of them
 * are placeable" and "nobody does that here yet".
 */
interface Answer {
  reply: string;
  understood: {
    category: string;
    holdingCategory: string;
    holdingSlug: string | null;
    how: string;
    matched: string;
  } | null;
  question: string | null;
  weOffer: boolean;
  hasAny: boolean;
}

/** How many of the list to render at once. The map still holds every pin. */
const SHOW_AT_FIRST = 60;

export default function ExchangePlaces() {
  /* From the database, so a town opened this morning appears without a
     deploy. Falls back to the built-in list only when the server cannot be
     reached. */
  const towns = useTowns();
  const [town, setTown] = useState(() => readTown() || 'manchester-nh');
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [showing, setShowing] = useState(SHOW_AT_FIRST);
  const { here, ask, forget } = useHere();

  /* Asking in words. `drivenId` is the chip an answer lit, remembered so that
     dismissing the explanation also undoes the filter it caused — a page must
     never hold a filter whose reason has gone. */
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [drivenId, setDrivenId] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [askFailed, setAskFailed] = useState<string | null>(null);
  /* Out of asks for today. Kept apart from the answer because it is a fact
     about the day rather than about one question — putting an answer away must
     not re-enable a button the server will only refuse again. */
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `${SERVER}/exchange/nearby?territory=${encodeURIComponent(town)}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } },
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !body?.success) {
          setError(body?.error || 'We could not load what is here.');
          return;
        }
        setPlaces(Array.isArray(body.places) ? body.places : []);
        setCategories(Array.isArray(body.categories) ? body.categories : []);
      } catch {
        if (!cancelled) setError('We could not reach the Exchange just now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [town]);

  /* A chosen category removes everything else. It is the only control here
     that hides anything, and a resident picked it from a list of what is
     actually in this town. */
  const inCategory = useMemo(
    () => (categoryId ? places.filter((p) => p.categoryIds.includes(categoryId)) : places),
    [places, categoryId],
  );

  /*
   * What the typed words are being used for.
   *
   * Once an answer has understood the question, the words stop being a name
   * search: "my basement smells damp" matches no business name, so highlighting
   * against it would dim every single result the answer had just found. The
   * text stays in the box to be edited and re-asked; it is simply not a filter
   * any more, and the panel above says what is driving the page instead.
   */
  const highlightTerm = answer?.understood ? '' : query;

  /* Measured and marked in one pass: nearest first once there is somewhere to
     measure from, and every search match flagged without anything removed. */
  const measured = useMemo(
    () => measureListings(inCategory, pointOf(here), highlightTerm),
    [inCategory, here, highlightTerm],
  );

  const pins = useMemo<MapPinData[]>(
    () => measured.map((m) => ({
      id: m.listing.id,
      name: m.listing.name,
      slug: m.listing.slug,
      claimed: m.listing.claimed,
      location: m.listing.location,
      highlighted: m.highlighted,
    })),
    [measured],
  );

  const searching = highlightTerm.trim().length > 0;
  const hits = useMemo(() => measured.filter((m) => m.highlighted).length, [measured]);
  const chosenCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  /* Biggest first: on a map of a whole town the useful doors are the ones with
     something behind them, and an alphabetical list buries them. */
  const categoriesBySize = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of places) for (const id of p.categoryIds) count.set(id, (count.get(id) ?? 0) + 1);
    return categories
      .map((c) => ({ ...c, count: count.get(c.id) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [categories, places]);

  /*
   * The chip an answer lit, for the count.
   *
   * The sentence the model wrote describes the rows the SERVER fetched, and
   * those include businesses with no address we can place — which never reach
   * this map. So the page states its own number rather than leaving a resident
   * to reconcile "three of them" with two pins.
   */
  const drivenChip = useMemo(
    () => (drivenId ? categoriesBySize.find((c) => c.id === drivenId) ?? null : null),
    [drivenId, categoriesBySize],
  );

  /*
   * Did they type a town rather than a business?
   *
   * Eric typed "pelham nh" into this box and nothing came up. That was fair:
   * the placeholder used to read "Search manchester" — a town name — so typing
   * a town is exactly what it invited, while the search only ever matched
   * business names and trades. The box has been reworded, and rather than
   * stopping there the obvious action now works: a town is recognised and
   * offered, because typing one is a reasonable thing to do on a page about
   * places.
   *
   * "nh" and "new hampshire" are stripped, since that is how people write a
   * town when they are used to typing it into a search engine.
   */
  const typedTown = useMemo(() => {
    const asked = normalise(query).replace(/\b(nh|new hampshire)\b/g, '').trim();
    if (!asked) return null;
    const match = towns.find(
      (t) => t.slug && t.slug !== town && normalise(t.name) === asked,
    );
    return match ?? null;
  }, [query, town, towns]);

  const changeTown = useCallback((slug: string) => {
    writeTown(slug);
    setTown(slug);
    setCategoryId(null);
    setChosenId(null);
    setShowing(SHOW_AT_FIRST);
    /* An answer was about one town's directory. In another town it is not so
       much wrong as not about anything on the screen. */
    setAnswer(null);
    setDrivenId(null);
    setAskFailed(null);
  }, []);

  /**
   * Put the answer away, and undo what it did.
   *
   * The chip an answer lit is cleared with it, so the page never sits in a
   * filtered state with no explanation of why. Half an answer is worse than
   * none.
   */
  const dropAnswer = useCallback(() => {
    setAnswer(null);
    setAskFailed(null);
    if (drivenId) {
      setCategoryId((current) => (current === drivenId ? null : current));
      setDrivenId(null);
    }
  }, [drivenId]);

  /** Editing the question retires the answer to it, filter and all. */
  const retype = useCallback((value: string) => {
    setQuery(value);
    if (answer || askFailed) dropAnswer();
  }, [answer, askFailed, dropAnswer]);

  /**
   * Ask the server what the words mean.
   *
   * Everything the response is allowed to do to this page happens in the few
   * lines that set the chip. The sentence it wrote is shown as explanation; the
   * category it chose moves a control the resident can see and unset; and its
   * listings are read for one boolean and then dropped. See the top of the file
   * for why that is the design rather than an omission.
   */
  const putQuestion = useCallback(async () => {
    const words = query.trim();
    if (words.length < 2 || thinking) return;

    setThinking(true);
    setAskFailed(null);
    try {
      const res = await fetch(`${SERVER}/exchange/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        /* The town, never a coordinate. Where somebody is standing does not
           leave this browser, and no model vendor is told it. */
        body: JSON.stringify({ ask: words, territory: town }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.success) {
        setAskFailed(body?.error || 'We could not work that out just now.');
        return;
      }

      const read = body.understood ?? null;
      setAnswer({
        reply: String(body.reply ?? ''),
        understood: read,
        question: body.question ?? null,
        weOffer: body.weOffer === true,
        hasAny: Array.isArray(body.listings) && body.listings.length > 0,
      });
      if (body.capped === true) setCapped(true);

      /* The one effect it has: pick a chip, if the category it chose is one of
         the categories businesses here actually hold. */
      const chip = read?.holdingSlug
        ? categoriesBySize.find((c) => c.slug === read.holdingSlug)
        : undefined;
      if (chip) {
        setDrivenId(chip.id);
        setCategoryId(chip.id);
        setChosenId(null);
      } else {
        /* Whatever a previous ask lit, this one has not confirmed. */
        if (drivenId) setCategoryId(null);
        setDrivenId(null);
      }
    } catch {
      setAskFailed('We could not reach the Exchange just now.');
    } finally {
      setThinking(false);
    }
  }, [query, thinking, town, categoriesBySize, drivenId]);

  useEffect(() => { setShowing(SHOW_AT_FIRST); }, [categoryId, query]);

  const listingHref = (slug: string) => `/exchange-listing?slug=${encodeURIComponent(slug)}`;
  /* Where a business with no placeable address can still be read: the category
     tree lists everybody, while this map can only draw the ones it can place. */
  const categoryHref = (slug: string) => `/exchange-category?slug=${encodeURIComponent(slug)}`;

  return (
    <div className="bpx">
      <style>{EXCHANGE_CSS}</style>
      <style>{BROWSE_CSS}</style>

      <div className="bpx-shell">
        <a className="bpxb-crumb" href="/exchange">
          <ChevronLeft size={14} /> All of Phoenix Exchange
        </a>

        <div className="bpx-masthead">
          <div className="bpx-masthead-row">
            <div className="bpx-brand">
              <div className="bpx-mark"><MapPin size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">Places near you</div>
                <div className="bpxb-section-tag">
                  {loading ? 'Loading…' : `${places.length} businesses in ${townName(town, towns)}`}
                  {chosenCategory && ` · ${chosenCategory.name}`}
                </div>
              </div>
            </div>

            <div className="bpxb-towns">
              {towns.filter((t) => t.slug).map((t) => (
                <button
                  key={t.slug}
                  className="bpxb-town"
                  data-current={t.slug === town}
                  onClick={() => changeTown(t.slug)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="bpx-empty">
            <Loader2 size={24} className="animate-spin" color="#9ca3af" />
            <div className="bpx-desc">Looking…</div>
          </div>
        )}

        {!loading && error && (
          <div className="bpx-empty">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <a className="bpx-btn" href="/exchange">Back to the directory</a>
          </div>
        )}

        {!loading && !error && places.length > 0 && (
          <>
            <ExchangeMap
              pins={pins}
              here={pointOf(here)}
              searching={searching}
              selectedId={chosenId}
              onSelect={setChosenId}
            />

            <div className="bpxb-find">
              {/*
                A form, so that Enter asks. Typing still filters what is loaded
                on every keystroke and costs nothing; submitting is the only
                thing that spends a request.
              */}
              <form
                className="bpxb-find-row"
                onSubmit={(e) => { e.preventDefault(); void putQuestion(); }}
              >
                <label className="bpxb-find-field">
                  <Search size={15} />
                  <input
                    type="search"
                    placeholder="A name, a trade, or what you need doing"
                    value={query}
                    maxLength={120}
                    onChange={(e) => retype(e.target.value)}
                    aria-label="Search the businesses here, or describe what you need"
                  />
                  {query.trim().length > 0 && (
                    <button
                      type="button"
                      className="bpxb-find-clear"
                      onClick={() => retype('')}
                      aria-label="Clear the search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>

                {/*
                  Disabled once the ceiling is reached, with the reason on the
                  button itself. The server refuses anyway; this stops a
                  resident spending taps finding that out, and the panel above
                  says plainly that browsing and searching still work.
                */}
                <button
                  type="submit"
                  className="bpxb-ask"
                  disabled={query.trim().length < 2 || thinking || capped}
                >
                  {thinking
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Sparkles size={15} />}
                  {thinking ? 'Working it out…' : capped ? 'No asks left today' : 'Ask'}
                </button>

                {here.kind === 'known' ? (
                  <button type="button" className="bpx-btn" onClick={forget}>
                    <Crosshair size={15} /> Forget my location
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bpx-btn"
                    onClick={ask}
                    disabled={here.kind === 'asking'}
                  >
                    {here.kind === 'asking'
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Navigation size={15} />}
                    {here.kind === 'asking' ? 'Finding you…' : 'Show me what is nearest'}
                  </button>
                )}
              </form>

              {askFailed && <div className="bpxb-failed">{askFailed}</div>}

              {/*
                What was understood, said out loud.

                This panel is deliberately the quiet thing on the page: it is
                not the answer, it is the explanation. The answer is the
                businesses on the map underneath it, which came from the same
                place they always come from.
              */}
              {answer && (
                <div className="bpxb-answer" role="status" aria-live="polite">
                  <div className="bpxb-answer-top">
                    <div className="bpxb-answer-said">{answer.reply}</div>
                    <button
                      type="button"
                      className="bpxb-answer-drop"
                      onClick={dropAnswer}
                      aria-label="Put this answer away"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {answer.understood && (
                    <div className="bpxb-answer-read">
                      Read as <b>{answer.understood.holdingCategory}</b>
                      {answer.understood.how === 'model'
                        ? ' — worked out from what you wrote, so say it differently if that is wrong. '
                        : '. '}
                      {drivenChip
                        ? `The map is showing all ${drivenChip.count} in ${townName(town, towns)}.`
                        : answer.hasAny
                          ? 'None of them are on this map — the directory has them, but without an address we can place.'
                          : `Nobody in ${townName(town, towns)} does that yet. We have made a note of it.`}
                    </div>
                  )}

                  {/* The tree lists everybody; the map can only draw the ones
                      it can place. So when the directory has them and the map
                      cannot show them, send them somewhere that can. */}
                  {answer.understood?.holdingSlug && !drivenChip && answer.hasAny && (
                    <a className="bpx-btn" href={categoryHref(answer.understood.holdingSlug)}>
                      <Building2 size={14} /> See {answer.understood.holdingCategory} in the directory
                    </a>
                  )}

                  {answer.question && (
                    <div className="bpxb-answer-ask">{answer.question}</div>
                  )}

                  {/*
                    Ours, and labelled as ours. The directory list above is
                    ranked by match and distance and nothing else — no business
                    has ever outranked a better-matched one by paying. This is
                    Black Phoenix saying it does this work too, in its own
                    block, in its own colours, where nobody could mistake it
                    for a search result.
                  */}
                  {answer.weOffer && (
                    <a className="bpxb-ours" href="/get-quote">
                      <div className="bpxb-ours-text">
                        <div className="bpxb-ours-tag">Black Phoenix</div>
                        <div className="bpxb-ours-line">
                          We do this work ourselves as well. Tell us about the job
                          and we will quote it.
                        </div>
                      </div>
                      <ArrowRight size={18} />
                    </a>
                  )}
                </div>
              )}

              {/*
                A town, typed into a box that searches businesses. Offered
                rather than corrected: switching is what they meant, and a page
                that knows that and says nothing is just being obtuse.
              */}
              {typedTown && (
                <div className="bpxb-note">
                  <button
                    type="button"
                    className="bpx-btn bpx-btn-primary"
                    onClick={() => { setQuery(''); changeTown(typedTown.slug); }}
                  >
                    <MapPin size={14} /> Show me {typedTown.name} instead
                  </button>
                </div>
              )}

              <div className="bpxb-note">
                {searching && (
                  <>
                    {hits === 0
                      ? `Nothing here is called "${query.trim()}" — this box matches names and trades. Press Ask and we will work out which trade you want, or use the towns above to look somewhere else.`
                      : `${hits} of ${measured.length} match "${query.trim()}", lit up on the map.`}
                    {' '}
                  </>
                )}
                {here.kind === 'known' && 'Nearest first. Your location stays in this browser — it is not sent to us or stored.'}
                {here.kind === 'refused' && 'No problem — without a location we cannot work out distances.'}
                {here.kind === 'failed' && here.why}
                {here.kind === 'unsupported' && 'This browser cannot share a location, so distances are not available.'}
              </div>
            </div>

            {/* The category list, beside the map rather than instead of it. */}
            <div className="bpxb-chips">
              <button
                className="bpxb-chip"
                data-current={categoryId === null}
                onClick={() => setCategoryId(null)}
              >
                Everything ({places.length})
              </button>
              {categoriesBySize.map((c) => (
                <button
                  key={c.id}
                  className="bpxb-chip"
                  data-current={c.id === categoryId}
                  onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                >
                  {c.name} ({c.count})
                </button>
              ))}
            </div>

            <div className="bpx-list">
              {measured.slice(0, showing).map(({ listing, miles, highlighted }) => (
                <div key={listing.id} className="bpx-card">
                  <div
                    className="bpx-card-body bpxb-biz"
                    data-claimed={listing.claimed}
                    data-hit={searching && highlighted}
                    data-dim={searching && !highlighted}
                    data-chosen={listing.id === chosenId}
                    onClick={() => setChosenId(listing.id)}
                  >
                    <div className="bpxb-biz-top">
                      <div style={{ minWidth: 0 }}>
                        <a
                          className="bpxb-biz-name"
                          href={listingHref(listing.slug)}
                          style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                        >
                          {listing.name}
                        </a>
                      </div>
                      <div className="bpx-tags">
                        {formatDistance(miles) && (
                          <span className="bpxb-away">
                            <MapPin size={11} /> {formatDistance(miles)}
                          </span>
                        )}
                        <span className={`bpx-pill ${listing.claimed ? 'bpxb-pill-claimed' : 'bpxb-pill-listed'}`}>
                          {listing.claimed ? 'Claimed' : 'Public record'}
                        </span>
                      </div>
                    </div>
                    <div className="bpxb-contact">
                      <a href={listingHref(listing.slug)}>
                        <Building2 size={13} /> Full listing
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paged rather than truncated: the count says what is left, so a
                short list never reads as the whole answer. */}
            {measured.length > showing && (
              <button
                className="bpx-btn"
                onClick={() => setShowing((n) => n + SHOW_AT_FIRST)}
              >
                Show {Math.min(SHOW_AT_FIRST, measured.length - showing)} more
                {' '}of {measured.length - showing}
              </button>
            )}

            <div className="bpxb-note">
              Compiled listings include data from {'© OpenStreetMap contributors'}.
            </div>
          </>
        )}

        {!loading && !error && places.length === 0 && (
          <div className="bpx-empty">
            <Store size={26} color="#9ca3af" />
            <div className="bpx-card-title">Nothing on the map here yet</div>
            <div className="bpx-desc" style={{ maxWidth: 440 }}>
              We are building this directory town by town. Try another town, or
              browse by category.
            </div>
            <a className="bpx-btn" href="/exchange">Browse by category</a>
          </div>
        )}
      </div>
    </div>
  );
}
