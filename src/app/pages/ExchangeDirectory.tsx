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
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import { LAUNCH_TOWNS, readTown, writeTown } from '../lib/exchangeTowns';

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
                <div className="bpxb-section-tag">
                  Local businesses in Pelham, Salem and Manchester, New Hampshire
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
          {LAUNCH_TOWNS.map((t) => (
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
            Nothing is invented, and a business can claim or correct its own
            listing at any time.
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
