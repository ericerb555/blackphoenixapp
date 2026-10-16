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
  KeyRound, Bookmark, ArrowRight,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import { useTowns, readTown, writeTown } from '../lib/exchangeTowns';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

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
  const [town, setTown] = useState<string>(() => readTown());
  /* From the database, so opening a town does not need a front-end deploy. */
  const towns = useTowns();

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

  const chooseTown = useCallback((slug: string) => {
    setTown(slug);
    writeTown(slug);
  }, []);

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

        {/*
          THE MAP, FIRST AND UNMISTAKABLE.

          Eric asked twice for the map to be a main feature. It was a one-line
          link sitting between the town chips and the tree, and on the live page
          it read as a notice — he did not register it as the map at all.

          It is still a DOOR rather than the map itself, and that is deliberate:
          `/exchange` is the crawlable tree of categories and names the whole
          free-traffic plan rests on, and a map canvas gives a crawler nothing to
          read. Putting the canvas here would also pull 1,500 rows and MapLibre
          onto the most visited page in the directory. So the door is built to
          look like what is behind it — the pin field is CSS and costs no
          request — and the tree below is untouched.
        */}
        <a className="bpxb-hero" href="/exchange-places">
          <span className="bpxb-hero-mark"><MapPin size={27} color="#fff" /></span>
          <span className="bpxb-hero-text">
            <span className="bpxb-hero-title">See every business on the map</span>
            <span className="bpxb-hero-sub">
              Nearest first, no category needed — the quickest way to find who is
              actually near you.
            </span>
          </span>
          <span className="bpxb-hero-go">Open the map <ArrowRight size={16} /></span>
        </a>

        <div className="bpx-row">
          <span className="bpxb-note" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} /> Looking in
          </span>
          {[{ slug: '', name: 'All towns' }, ...towns].map((t) => (
            <button
              key={t.slug || 'all'}
              className="bpx-chip"
              data-on={town === t.slug}
              onClick={() => chooseTown(t.slug)}
            >
              {t.name}
            </button>
          ))}
        </div>

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
