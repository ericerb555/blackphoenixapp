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
 * THE THREE CONTROLS DO THREE DIFFERENT JOBS, ON PURPOSE
 *
 *   a category   FILTERS   — removes everything else from the map and the list
 *   the search   HIGHLIGHTS — marks what it answers and dims the rest
 *   a location   SORTS      — nearest first, and nothing is hidden
 *
 * Only one of them removes anything, and it is the one a resident chose
 * explicitly from a list of what is actually here. The other two never hide a
 * business, because the thing a map is for is noticing what you were not
 * looking for.
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
  Crosshair, Building2, Store,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import { LAUNCH_TOWNS, readTown, writeTown, townName } from '../lib/exchangeTowns';
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

/** How many of the list to render at once. The map still holds every pin. */
const SHOW_AT_FIRST = 60;

export default function ExchangePlaces() {
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

  /* Measured and marked in one pass: nearest first once there is somewhere to
     measure from, and every search match flagged without anything removed. */
  const measured = useMemo(
    () => measureListings(inCategory, pointOf(here), query),
    [inCategory, here, query],
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

  const searching = query.trim().length > 0;
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
    const match = LAUNCH_TOWNS.find(
      (t) => t.slug && t.slug !== town && normalise(t.name) === asked,
    );
    return match ?? null;
  }, [query, town]);

  const changeTown = useCallback((slug: string) => {
    writeTown(slug);
    setTown(slug);
    setCategoryId(null);
    setChosenId(null);
    setShowing(SHOW_AT_FIRST);
  }, []);

  useEffect(() => { setShowing(SHOW_AT_FIRST); }, [categoryId, query]);

  const listingHref = (slug: string) => `/exchange-listing?slug=${encodeURIComponent(slug)}`;

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
                  {loading ? 'Loading…' : `${places.length} businesses in ${townName(town)}`}
                  {chosenCategory && ` · ${chosenCategory.name}`}
                </div>
              </div>
            </div>

            <div className="bpxb-towns">
              {LAUNCH_TOWNS.filter((t) => t.slug).map((t) => (
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
              <div className="bpxb-find-row">
                <label className="bpxb-find-field">
                  <Search size={15} />
                  <input
                    type="search"
                    placeholder="Search by name or what they do"
                    value={query}
                    maxLength={120}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search the businesses here"
                  />
                  {searching && (
                    <button
                      type="button"
                      className="bpxb-find-clear"
                      onClick={() => setQuery('')}
                      aria-label="Clear the search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>

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
              </div>

              {/*
                A town, typed into a box that searches businesses. Offered
                rather than corrected: switching is what they meant, and a page
                that knows that and says nothing is just being obtuse.
              */}
              {typedTown && (
                <div className="bpxb-note">
                  <button
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
                      ? `Nothing here is called "${query.trim()}". This box searches business names and trades — use the towns above to look somewhere else.`
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
