/**
 * Phoenix Exchange — the front door.
 *
 * WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT
 *
 * A plain browse: four sections, the categories under each, and the services
 * under those as prose so a resident can tell whether it is the right door
 * without opening it. That is all.
 *
 * It is NOT the main page. The real one — location, search, the business
 * count, Happening Now, the map preview — is Phase 4, and building half of it
 * here is exactly the "building on the whim" failure that produced work needing
 * reconciliation afterwards. There is no search box, no map and no counts.
 *
 * NO COUNTS, SPECIFICALLY
 *
 * A category tile that says "0 businesses" on launch day advertises an empty
 * directory on the page whose job is to look complete. The taxonomy route does
 * not serve counts and this page does not ask for them. When the directory is
 * compiled from the registries, counts become worth showing.
 *
 * WHY THE TOWN CHOOSER IS HERE
 *
 * `GET /exchange/category/:slug` already accepts a `territory` and writes it to
 * the demand ledger, and nothing was passing one — so every zero-result row
 * read "somebody wanted roofing somewhere". With a town it reads "roofing,
 * Salem, nobody", which is a recruitment call with a number attached. That is
 * the whole purpose of the ledger, so the three launch towns are offered here
 * and remembered.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. This page names its own classes, the
 * same way the other Exchange pages do.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Store, Loader2, AlertCircle, ChevronRight, MapPin, RefreshCw,
  KeyRound, Bookmark, ArrowRight, Building2, X, Search, Navigation,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import { useTowns, useTownChoice, townName } from '../lib/exchangeTowns';
import ExchangeMap from '../components/exchange/ExchangeMap';
import type { MapPinData } from '../components/exchange/ExchangeMap';
import ExchangeBizRow from '../components/exchange/ExchangeBizRow';
import ExchangeSponsored from '../components/exchange/ExchangeSponsored';
import { measureListings, RADIUS_CHOICES } from '../lib/exchangeGeo';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** How many businesses the list renders before asking. The map is unaffected:
    it always holds every pin, because a map that only drew the first sixty
    would be lying about the town. */
const SHOW_AT_FIRST = 40;

/** A business the map can draw. */
interface Place {
  id: string;
  slug: string;
  name: string;
  claimed: boolean;
  logo: string | null;
  location: { lat: number; lng: number };
}

interface Section { slug: string; name: string; tagline: string | null; sort_order: number }
interface Category {
  id: string;
  section_slug: string;
  parent_id: string | null;
  slug: string;
  name: string;
  is_construction: boolean;
}

export default function ExchangeDirectory() {
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* From the database, so opening a town does not need a front-end deploy. */
  const towns = useTowns();
  /* Where they are, unless they have said otherwise. Never prompts on arrival
     — see the note on the hook for why that restraint is deliberate. */
  const { town, locating, tooFar, choose, locate } = useTownChoice(towns);

  /*
   * THE MAP'S OWN DATA, FETCHED SEPARATELY FROM THE TREE.
   *
   * Two requests rather than one, deliberately: the category tree is what
   * earns the search traffic and what most arrivals came for, and it must not
   * wait on a thousand business rows to render. Whichever returns first shows
   * first, and a map that fails leaves the directory untouched.
   */
  const [places, setPlaces] = useState<Place[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [find, setFind] = useState('');
  /**
   * How far out the map is looking, in miles. Null is "fit whatever is here",
   * which is the old behaviour and still the right answer for a single town.
   */
  const [radius, setRadius] = useState<number | null>(null);
  /** How much of the list is rendered. The map always holds every pin. */
  const [showing, setShowing] = useState(SHOW_AT_FIRST);

  /**
   * A session is used when there is one and never required. These pages are
   * for people who have not signed up — that is the point of them being
   * indexable, and the whole free-traffic plan rests on it.
   */
  const authHeader = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return `Bearer ${session?.access_token || publicAnonKey}`;
    } catch {
      return `Bearer ${publicAnonKey}`;
    }
  }, []);

  /**
   * Everything placeable in the chosen town, for the map.
   *
   * Re-runs when the town chips change, because those chips filter the map as
   * much as the tree. "All towns" sends no territory, and the route then
   * returns every placeable listing — the same thing the full map page asks
   * for.
   */
  const loadPlaces = useCallback(async () => {
    setMapLoading(true);
    setMapError(null);
    setChosenId(null);
    try {
      const query = town ? `?territory=${encodeURIComponent(town)}` : '';
      const res = await fetch(`${SERVER}/exchange/nearby${query}`, {
        headers: { Authorization: await authHeader() },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setMapError(body?.error || 'We could not load the map.');
        return;
      }
      setPlaces(Array.isArray(body.places) ? body.places : []);
    } catch {
      setMapError('We could not reach the Exchange just now.');
    } finally {
      setMapLoading(false);
    }
  }, [town, authHeader]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER}/exchange/taxonomy`, {
        headers: { Authorization: await authHeader() },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setError(body?.error || 'We could not load the directory.');
        return;
      }
      setSections(Array.isArray(body.sections) ? body.sections : []);
      setCategories(Array.isArray(body.categories) ? body.categories : []);
      setServices(Array.isArray(body.services) ? body.services : []);
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadPlaces(); }, [loadPlaces]);
  /* A new search starts at the top of the list rather than forty rows down
     into the answer to the last one. */
  useEffect(() => { setShowing(SHOW_AT_FIRST); }, [find, town]);
  /* A one-mile view of the last town is not a sensible opening view of the
     next one, so changing town goes back to framing what is actually there. */
  useEffect(() => { setRadius(null); }, [town]);

  /** Services grouped under their parent, for the prose line on each tile. */
  const servicesByParent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of services) {
      if (!s.parent_id) continue;
      const list = map.get(s.parent_id) ?? [];
      list.push(s.name);
      map.set(s.parent_id, list);
    }
    return map;
  }, [services]);

  const bySection = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      const list = map.get(c.section_slug) ?? [];
      list.push(c);
      map.set(c.section_slug, list);
    }
    return map;
  }, [categories]);

  /*
   * Matched in one pass, for the map and the list together.
   *
   * `null` as the point because the front door measures no distances — it asks
   * for no location, so there is nowhere to measure from. What this is here for
   * is `highlighted`, which is what makes a searched-for business bigger on the
   * map and lit in the list.
   */
  const searching = find.trim().length > 0;
  const measured = useMemo(
    () => measureListings(places, null, find),
    [places, find],
  );
  const hits = useMemo(
    () => measured.filter((m) => m.highlighted).length,
    [measured],
  );

  const pins = useMemo<MapPinData[]>(
    () => measured.map(({ listing, highlighted }) => ({
      id: listing.id,
      name: listing.name,
      slug: listing.slug,
      claimed: listing.claimed,
      location: listing.location,
      highlighted,
    })),
    [measured],
  );

  const chosen = useMemo(
    () => places.find((place) => place.id === chosenId) ?? null,
    [places, chosenId],
  );

  /**
   * What a radius is measured from.
   *
   * The chosen town's centre, which the territories route already serves. Not
   * the resident's own position: this page asks for no location, and a radius
   * control is not a good enough reason to start — the full map is where
   * "near me" lives.
   *
   * With no town chosen there is no centre, so the radius buttons stay out of
   * the way rather than offering to zoom to the middle of nowhere.
   */
  const townCentre = useMemo(
    () => towns.find((t) => t.slug === town)?.center ?? null,
    [towns, town],
  );

  const focus = useMemo(
    () => (townCentre && radius ? { center: townCentre, miles: radius } : null),
    [townCentre, radius],
  );

  const categoryHref = useCallback(
    (slug: string) => `/exchange-category?slug=${encodeURIComponent(slug)}`,
    [],
  );

  return (
    <div className="bpx">
      <style>{EXCHANGE_CSS}</style>
      <style>{BROWSE_CSS}</style>

      <div className="bpx-shell">
        <div className="bpx-masthead">
          <div className="bpx-masthead-row">
            <div className="bpx-brand">
              <div className="bpx-mark"><Store size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">Phoenix Exchange</div>
                {/* Named from the live list rather than written in prose, so a
                    fourth town does not leave this line quietly lying. */}
                <div className="bpxb-section-tag">
                  Local businesses in{' '}
                  {towns.length > 1
                    ? `${towns.slice(0, -1).map((t) => t.name).join(', ')} and ${towns[towns.length - 1].name}`
                    : towns.map((t) => t.name).join('')}
                  , New Hampshire
                </div>
              </div>
            </div>
            {!loading && !error && (
              <button className="bpx-btn" onClick={() => void load()}>
                <RefreshCw size={15} /> Refresh
              </button>
            )}
          </div>
        </div>

        <div className="bpx-row">
          <span className="bpxb-note" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} /> Looking in
          </span>
          {/*
            Near me, first in the row, because it is the one that answers the
            question people actually arrived with. Pressing it is the opt-in:
            nothing asks for a position until somebody does.
          */}
          <button
            className="bpx-chip"
            onClick={() => locate()}
            disabled={locating}
            title="Use my location to pick the town"
          >
            {locating
              ? <Loader2 size={12} className="animate-spin" />
              : <Navigation size={12} />}
            {' '}Near me
          </button>
          {[{ slug: '', name: 'All towns' }, ...towns].map((t) => (
            <button
              key={t.slug || 'all'}
              className="bpx-chip"
              data-on={town === t.slug}
              onClick={() => choose(t.slug)}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/*
          A fix from outside the three towns. Said plainly rather than snapped
          to the nearest of three wrong answers — see `nearestTown`.
        */}
        {tooFar && (
          <div className="bpxb-note">
            You are not near one of the towns the Exchange covers yet. Showing
            everywhere instead — pick a town above to look somewhere specific.
          </div>
        )}

        {/*
          THE MAP ITSELF, ON THE FRONT DOOR.

          Asked for three times: "should we have the map a main feature", then
          twice more when a link was shipped instead. A link was the wrong
          answer and this is the right one — the map is the thing most people
          arrive wanting, and a directory of 1,092 placeable businesses is far
          easier to grasp as a picture of a town than as a list of trades.

          THE TREE BELOW IS UNTOUCHED, AND THAT IS THE WHOLE BARGAIN

          `/exchange` is the crawlable list of categories and names the entire
          free-traffic plan rests on — a map canvas has nothing in it a crawler
          can read. So the map is ADDED above the tree and removes none of it.
          Every section, category and service link is exactly where it was, and
          the map is a second way in rather than a replacement.

          WHAT IT COSTS, SAID PLAINLY

          A second request on the busiest page, and MapLibre. The tree does not
          wait for either: the two fetches are separate, and a map that fails
          leaves the directory working. MapLibre itself still loads only when
          the canvas is scrolled into view, which at the top of the page means
          immediately — that is the price of the decision, and it was made
          knowingly.

          NO LOCATION IS ASKED FOR HERE.

          The front door shows no distances, so it has no reason to want a
          coordinate, and a permission prompt on arrival is the behaviour people
          resent about lead-resale sites. "Follow me" lives on the full map,
          where distance is the point.
        */}
        <div className="bpxb-mapwrap">
          <div className="bpxb-maphead">
            <div className="bpxb-hero-text">
              <div className="bpxb-hero-title">
                {town ? `Businesses in ${townName(town, towns)}` : 'Every business on the map'}
              </div>
              <div className="bpxb-hero-sub">
                {mapLoading
                  ? 'Loading the map…'
                  : mapError
                    ? mapError
                    : `${places.length} on the map — tap a pin to see who it is`}
              </div>
            </div>
            <a className="bpxb-hero-go" href="/exchange-places">
              Full map <ArrowRight size={16} />
            </a>
          </div>

          {/*
            Searching makes a match BIGGER rather than hiding everything else.

            That is the rule the whole map obeys and it is worth stating: a
            category chip filters, a search highlights. Somebody who typed
            "pizza" is still well served by noticing the bakery next door, and a
            map of a town that quietly removed nine hundred businesses would be
            a worse map than one that marked six.
          */}
          {!mapLoading && !mapError && places.length > 0 && (
            <label className="bpxb-find-field">
              <Search size={15} />
              <input
                type="search"
                placeholder="Find a business by name or trade"
                value={find}
                maxLength={120}
                onChange={(e) => setFind(e.target.value)}
                aria-label="Find a business on the map"
              />
              {searching && (
                <button
                  type="button"
                  className="bpxb-find-clear"
                  onClick={() => setFind('')}
                  aria-label="Clear the search"
                >
                  <X size={15} />
                </button>
              )}
            </label>
          )}

          {/*
            How far out to look.

            Only offered once a town is chosen, because a radius needs a centre
            and "All towns" has none — and because the honest answer to "show
            me everything" is to frame everything, which is what the map does
            when no radius is set.

            This moves the VIEW and nothing else. The pins, the list and the
            count are unchanged: a category filters, a search highlights, and a
            radius decides how much of the map you are looking at.
          */}
          {!mapLoading && !mapError && town && townCentre && places.length > 0 && (
            <div className="bpx-row">
              <span className="bpxb-note">Looking within</span>
              {RADIUS_CHOICES.map((miles) => (
                <button
                  key={miles}
                  className="bpx-chip"
                  data-on={radius === miles}
                  onClick={() => setRadius(radius === miles ? null : miles)}
                >
                  {miles} mi
                </button>
              ))}
              <button
                className="bpx-chip"
                data-on={radius === null}
                onClick={() => setRadius(null)}
              >
                The whole town
              </button>
            </div>
          )}

          {mapLoading && (
            <div className="bpxb-mapwait">
              <Loader2 size={22} className="animate-spin" color="#9ca3af" />
            </div>
          )}

          {/* A map that cannot draw must never be a silent empty rectangle —
              the same rule the map component holds itself to. */}
          {!mapLoading && mapError && (
            <div className="bpxb-mapwait">
              <AlertCircle size={22} color="#fca5a5" />
              <span className="bpxb-note">{mapError}</span>
              <button className="bpx-btn" onClick={() => void loadPlaces()}>Try again</button>
            </div>
          )}

          {!mapLoading && !mapError && places.length > 0 && (
            <ExchangeMap
              pins={pins}
              here={null}
              /* Was hardcoded false, which meant `hit` was false for every pin
                 and a search lit the list while the map ignored it entirely.
                 The enlarged matching pin is the whole point of searching here. */
              searching={searching}
              selectedId={chosenId}
              onSelect={setChosenId}
              focus={focus}
            />
          )}

          {!mapLoading && !mapError && places.length === 0 && (
            <div className="bpxb-mapwait">
              <MapPin size={22} color="#9ca3af" />
              <span className="bpxb-note">
                Nothing placeable here yet. The categories below still list
                everybody.
              </span>
            </div>
          )}

          {/*
            Tapping a pin names the business rather than navigating away. A
            mis-tap on a map of a thousand pins is ordinary, and losing the page
            because of one would make the map annoying to use.
          */}
          {chosen && (
            <div className="bpxb-mappick">
              {chosen.logo
                ? <span className="bpxb-logo-chip"><img src={chosen.logo} alt="" /></span>
                : <Building2 size={18} color="#fdba74" />}
              <span className="bpxb-door-text">
                <span className="bpxb-door-title">{chosen.name}</span>
                <span className="bpxb-note">
                  {chosen.claimed ? 'Claimed by its owner' : 'Listed from public records'}
                </span>
              </span>
              <a className="bpx-btn" href={`/exchange-listing?slug=${encodeURIComponent(chosen.slug)}`}>
                Open listing
              </a>
              <button
                type="button"
                className="bpxb-find-clear"
                style={{ position: 'static' }}
                onClick={() => setChosenId(null)}
                aria-label="Clear the selection"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        {/*
          The list under the map, which is the half of the answer a map cannot
          give: a name you can read, a pill saying whether anybody stands
          behind the listing, and a link into it.

          Paged rather than truncated — the count says what is left, so a short
          list never reads as the whole town.
        */}
        {!mapLoading && !mapError && measured.length > 0 && (
          <>
            <div className="bpxb-note">
              {searching
                ? hits === 0
                  ? `Nothing here is called "${find.trim()}". The categories below search the whole directory, including businesses with no address to put on a map.`
                  : `${hits} of ${measured.length} match "${find.trim()}" — bigger on the map, lit in the list.`
                : `${measured.length} ${measured.length === 1 ? 'business' : 'businesses'}${town ? ` in ${townName(town, towns)}` : ''}.`}
            </div>

            <div className="bpx-list">
              {measured.slice(0, showing).map(({ listing, highlighted }) => (
                <ExchangeBizRow
                  key={listing.id}
                  listing={listing}
                  hit={highlighted}
                  searching={searching}
                  chosen={listing.id === chosenId}
                  onSelect={setChosenId}
                />
              ))}
            </div>

            {measured.length > showing && (
              <button
                className="bpx-btn"
                onClick={() => setShowing((count) => count + SHOW_AT_FIRST)}
              >
                {/* "Show 10 more of 10" is what the old wording produced on a
                    last page, which reads like a glitch. */}
                {measured.length - showing > SHOW_AT_FIRST
                  ? `Show ${SHOW_AT_FIRST} more of ${measured.length - showing}`
                  : `Show the last ${measured.length - showing}`}
              </button>
            )}
          </>
        )}

        {/*
          The two doors this page has been missing.

          Both of the things behind them were built and neither was reachable
          from here. Claiming could only be reached by finding your own listing
          through the tree and pressing the button on it — so an owner arriving
          at the front door had no way in at all, while the footer cheerfully
          told them they could claim. And the resident account (saved
          businesses, who you have contacted) was linked only from the staff
          role switcher, which no resident will ever open.
        */}
        <div className="bpxb-doors">
          <a className="bpxb-door" href="/exchange-claim">
            <KeyRound size={20} />
            <span className="bpxb-door-text">
              <span className="bpxb-door-title">Is one of these yours?</span>
              <span className="bpxb-note">
                Claim your listing — free, and it stays free
              </span>
            </span>
          </a>
          <a className="bpxb-door" href="/exchange-account">
            <Bookmark size={20} />
            <span className="bpxb-door-text">
              <span className="bpxb-door-title">Your Exchange</span>
              <span className="bpxb-note">
                Save businesses and see who you have contacted
              </span>
            </span>
          </a>
        </div>

        {/*
          A paying advertiser, below the doors and above the category tree.

          Not in the listing flow, and never between a resident and the thing
          they came for — the map, the search and the list are all above this.
          It renders nothing at all unless something has been sold, so today it
          is invisible.
        */}
        <ExchangeSponsored />

        {loading && (
          <div className="bpx-empty">
            <Loader2 size={24} className="animate-spin" color="#9ca3af" />
            <div className="bpx-desc">Loading the directory…</div>
          </div>
        )}

        {!loading && error && (
          <div className="bpx-empty">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <button className="bpx-btn" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {!loading && !error && sections.length === 0 && (
          <div className="bpx-empty">
            <Store size={26} color="#9ca3af" />
            <div className="bpx-card-title">The directory is not set up yet</div>
            <div className="bpx-desc">
              No sections have been published. Nothing is wrong with your
              connection — there is simply nothing here to show.
            </div>
          </div>
        )}

        {!loading && !error && sections.map((section) => {
          const cats = bySection.get(section.slug) ?? [];
          if (cats.length === 0) return null;

          return (
            <div key={section.slug} className="bpxb-section">
              <div className="bpxb-section-head">
                <span className="bpxb-section-name">{section.name}</span>
                {section.tagline && <span className="bpxb-section-tag">{section.tagline}</span>}
              </div>

              <div className="bpxb-tiles">
                {cats.map((cat) => {
                  const under = servicesByParent.get(cat.id) ?? [];
                  return (
                    <a key={cat.slug} className="bpxb-tile" href={categoryHref(cat.slug)}>
                      <span className="bpxb-tile-name">
                        {cat.name}
                        <ChevronRight size={15} />
                      </span>
                      {under.length > 0 && (
                        <span className="bpxb-tile-services">{under.join(' · ')}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!loading && !error && sections.length > 0 && (
          <div className="bpxb-note">
            Every business here is listed from public records or by its owner.
            Nothing is invented, and a business can{' '}
            {/* This sentence promised something and linked to nothing, which is
                the worst way to state a right somebody actually has. */}
            <a href="/exchange-claim" style={{ color: '#fdba74' }}>
              claim or correct its own listing
            </a>
            {' '}at any time.
            {' '}
            {/* ODbL. Compiled listings come from OpenStreetMap, and crediting
                it is a licence term rather than a courtesy. */}
            Compiled listings include data from {'© OpenStreetMap contributors'}.
          </div>
        )}
      </div>
    </div>
  );
}
