/**
 * Phoenix Exchange — the map.
 *
 * Every listing already carries a coordinate, so this is the surface the
 * directory was always implying: the businesses in a category, where they
 * actually are, with the ones answering your search lit up and the rest still
 * visible so you can see what you are passing by.
 *
 * WHY IT LOADS LATE AND ON PURPOSE
 *
 * MapLibre is about a quarter of a megabyte of JavaScript and needs WebGL.
 * Importing it at the top of this file would put it in the bundle of every
 * page that so much as links to the Exchange, and initialising it on mount
 * would make a headless browser software-render a map it is never going to
 * look at — which is how a page becomes "slow" and then "hung" in the smoke
 * harness.
 *
 * So: nothing is imported until the container is actually scrolled into view,
 * and the style URL is not even asked for until then — the tile key is a
 * Supabase secret, so that is a network round trip and most visitors to a
 * category page never scroll this far. The import lives inside an effect,
 * which also means a failure to load it is a state this component can render
 * rather than an error that takes the page down.
 *
 * WHY EVERY FAILURE HAS A VISIBLE STATE
 *
 * A map that cannot draw is the worst thing to leave silent, because an empty
 * dark rectangle looks exactly like a working map of nowhere. No key, no
 * WebGL, no coordinates and no network each say which it is. The list of
 * businesses underneath is always there regardless, so nothing on this page
 * depends on the map succeeding.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. Inline styles and named classes only.
 * MapLibre's own controls are disabled for the same reason: their stylesheet
 * is built on padding this app zeroes, so they render misshapen. The zoom
 * buttons here are ours.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Plus, Minus, Crosshair, AlertCircle, Loader2 } from 'lucide-react';
/* MapLibre's stylesheet, statically. It is CSS only — no JavaScript comes with
   it — and because this component is reached through a lazily-loaded page it
   lands in that page's chunk rather than the main bundle. The library itself
   is still imported on demand further down. */
import 'maplibre-gl/dist/maplibre-gl.css';
/**
 * MapLibre's web worker, as a URL Vite actually emits.
 *
 * The library resolves its worker with
 * `new URL('./maplibre-gl-worker.mjs', import.meta.url)`, which no bundler can
 * rewrite — so the built page asked for `/assets/maplibre-gl-worker.mjs?v=6.14.0`,
 * a path Vite never wrote, and got a 404. The symptom was quiet and nasty: the
 * canvas appeared, the placeholder went away, and the map then never fired
 * `load`, so there were no pins, no controls and no credit. A map of nothing,
 * with one console line to explain it.
 *
 * `?url` makes Vite copy the file into the build with a content hash and give
 * us the real address, which is then handed to MapLibre through its own
 * `config.WORKER_URL`. The worker is self-contained — 497KB with no sibling
 * imports — so copying the single file is enough, and it is fetched only when
 * a map is actually built.
 */
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { Point } from '../../lib/exchangeGeo';
import { boundsOf } from '../../lib/exchangeGeo';
import { fetchBasemapConfig, MAP_ATTRIBUTION } from '../../config/mapTiles';

export interface MapPinData {
  id: string;
  name: string;
  slug: string;
  claimed: boolean;
  location: Point;
  /** Answers the current search. Drives the highlight. */
  highlighted: boolean;
}

interface Props {
  pins: MapPinData[];
  /** Where the resident is, if they said. Drawn as its own marker. */
  here: Point | null;
  /** True while something is typed, so highlighting means anything. */
  searching: boolean;
  /** The listing the list has selected, flown to when it changes. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** How many listings in the category have no coordinate at all. */
  unplaceable?: number;
  /**
   * Keep the view on `here` as it moves.
   *
   * Only ever true while somebody has switched following on. Panning a map
   * under the hands of a person who is reading it is obnoxious, so this is the
   * one thing that licenses it — they asked to be followed.
   */
  follow?: boolean;
}

type Status =
  | { kind: 'waiting' }        // not scrolled to yet
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unconfigured' }   // no tile key
  | { kind: 'unavailable'; why: string };

const ACCENT = '#ea580c';
const QUIET = '#64748b';

/** Padding around the fitted bounds, so pins are not against the edge. */
const FIT_PADDING = 48;

export default function ExchangeMap({
  pins, here, searching, selectedId, onSelect, unplaceable = 0, follow = false,
}: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  /** The MapLibre map. `any` because the module is loaded dynamically. */
  const map = useRef<any>(null);
  const hereMarker = useRef<any>(null);
  /** Whether the map has been framed once, so the first fit does not animate. */
  const framed = useRef(false);
  const [status, setStatus] = useState<Status>({ kind: 'waiting' });
  /* Whatever credit the server names, so swapping tile provider does not need
     a change here. */
  const [credit, setCredit] = useState(MAP_ATTRIBUTION);

  /** The pins as GeoJSON. Recomputed whenever the search or the set changes. */
  const collection = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: pins.map((p) => ({
      type: 'Feature' as const,
      id: p.id,
      geometry: { type: 'Point' as const, coordinates: [p.location.lng, p.location.lat] },
      properties: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        claimed: p.claimed,
        // Only a highlight when something is actually typed, or every pin
        // would be lit and the emphasis would mean nothing.
        hit: searching && p.highlighted,
      },
    })),
  }), [pins, searching]);

  /** Which pins are on the map, as a stable key — refits only when it moves. */
  const pinKey = useMemo(() => pins.map((p) => p.id).join('|'), [pins]);

  /* ── hold off until it is looked at ───────────────────────────────────── */

  useEffect(() => {
    const node = holder.current;
    if (!node) return;

    // No IntersectionObserver (old browser, or a test environment) is not a
    // reason to withhold the map — it just means loading it straight away.
    if (typeof IntersectionObserver === 'undefined') {
      setStatus({ kind: 'loading' });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setStatus((s) => (s.kind === 'waiting' ? { kind: 'loading' } : s));
        observer.disconnect();
      }
    }, { rootMargin: '150px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* ── build it ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (status.kind !== 'loading' || map.current) return;
    let cancelled = false;

    (async () => {
      /* The key is a Supabase secret, so the style URL comes from the server.
         Asked for here rather than on mount: most visitors to a category page
         never scroll as far as the map, and this is a round trip. */
      const basemap = await fetchBasemapConfig();
      if (cancelled) return;
      if (!basemap.styleUrl) { setStatus({ kind: 'unconfigured' }); return; }
      setCredit(basemap.attribution);

      let maplibre: typeof import('maplibre-gl');
      try {
        // Named exports — MapLibre v6 has no default export, so reaching for
        // `.default` gets `undefined` and fails one line later at `new`.
        maplibre = await import('maplibre-gl');
      } catch {
        if (!cancelled) setStatus({ kind: 'unavailable', why: 'The map library could not be loaded.' });
        return;
      }
      if (cancelled || !holder.current) return;

      // Before the map is constructed, or it will already have tried to spawn
      // a worker from the address the bundler could not rewrite.
      try { maplibre.config.WORKER_URL = maplibreWorkerUrl; } catch { /* older API */ }

      let instance: any;
      try {
        instance = new maplibre.Map({
          container: holder.current,
          style: basemap.styleUrl,
          center: [-71.3245, 42.8],   // southern New Hampshire, until it fits
          zoom: 9,
          attributionControl: false,
          // Ours are drawn below; MapLibre's are built on padding this app
          // zeroes application-wide.
          dragRotate: false,
          pitchWithRotate: false,
        });
      } catch {
        // Almost always no WebGL — a headless browser, a locked-down device,
        // or hardware acceleration switched off.
        if (!cancelled) setStatus({ kind: 'unavailable', why: 'This browser cannot draw the map, so the list below is the full answer.' });
        return;
      }

      map.current = instance;

      instance.on('error', (e: any) => {
        // A tile 403 is the shape a wrong or unrestricted key takes, and it is
        // worth saying out loud rather than showing an empty void.
        const message = String(e?.error?.message ?? '');
        if (/40[13]/.test(message)) {
          setStatus({ kind: 'unavailable', why: 'The map tiles were refused — the tile key is missing, wrong, or not allowed on this domain.' });
        }
      });

      /*
       * A map that never finishes loading has to say so.
       *
       * This component claimed every failure had a visible state, and this one
       * did not: when the worker 404'd, MapLibre built its canvas, removed the
       * placeholder and then simply never fired `load`. The spinner would have
       * spun for ever and the only evidence was one console line. A resident
       * would have called that a broken page, and rightly.
       *
       * Thirty seconds because a cold cache on a phone pulling half a megabyte
       * of worker plus tiles is genuinely slow, and calling that a failure
       * would be worse than waiting.
       */
      const watchdog = setTimeout(() => {
        if (cancelled) return;
        setStatus((s) => (s.kind === 'ready' ? s : {
          kind: 'unavailable',
          why: 'The map did not finish loading. The list below is the full answer.',
        }));
      }, 30_000);

      instance.on('load', () => {
        clearTimeout(watchdog);
        if (cancelled) return;

        instance.addSource('listings', {
          type: 'geojson',
          data: collection,
          cluster: true,
          // Manchester alone is 895 listings in a few square miles, so
          // clustering is not an optimisation here, it is the only way the
          // map is readable at town zoom.
          clusterRadius: 48,
          clusterMaxZoom: 13,
          /*
           * How many of a cluster's members answer the search.
           *
           * Without this a search changed nothing visible on the map: the two
           * matching shops sat inside clusters of 39 and 5, so the pins the
           * resident asked to see were drawn as a number on a dot identical to
           * every other dot. The list said "2 of 45" and the map said nothing.
           * A cluster now knows whether it contains anything worth looking at.
           */
          clusterProperties: {
            hits: ['+', ['case', ['get', 'hit'], 1, 0]],
          },
        });

        instance.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'listings',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': 'rgba(234,88,12,0.82)',
            'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 26, 200, 32],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.35)',
          },
        });

        instance.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'listings',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
          },
          paint: { 'text-color': '#fff' },
        });

        instance.addLayer({
          id: 'pin',
          type: 'circle',
          source: 'listings',
          filter: ['!', ['has', 'point_count']],
          layout: {
            /*
             * WHICH PIN WINS WHERE TWO SIT ON TOP OF EACH OTHER.
             *
             * On a town map plenty of businesses share an address — a strip of
             * units, two trades at one yard — and whichever feature is drawn
             * last is the one a resident can see and tap. Left to the order the
             * query happened to return, that is arbitrary.
             *
             * A search match always wins, because the resident asked for it. A
             * claimed listing wins next: somebody stands behind it, its details
             * were corrected by its owner, and it is the one most worth
             * reaching. Everything else keeps its place rather than being
             * hidden — the point of a map is noticing what you were not looking
             * for.
             */
            'circle-sort-key': [
              'case',
              ['get', 'hit'], 3,
              ['get', 'claimed'], 2,
              1,
            ],
          },
          paint: {
            // The highlight, data-driven: a match is the accent and larger, a
            // non-match stays visible but recedes. Dimming rather than hiding
            // is deliberate — see the note on the category page.
            'circle-color': ['case', ['get', 'hit'], ACCENT, QUIET],
            /*
             * A match is nearly twice the radius of everything else, which on
             * a town holding 961 pins is the difference between spotting your
             * answer and hunting for it. It was 9 against 6 — visible once you
             * knew where to look, which is not the same thing.
             *
             * Zoom-aware, because a size that reads well across a whole town
             * is lost once somebody has zoomed into one street.
             */
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              10, ['case', ['get', 'hit'], 9, ['get', 'claimed'], 5, 4],
              14, ['case', ['get', 'hit'], 13, ['get', 'claimed'], 7, 6],
              17, ['case', ['get', 'hit'], 17, ['get', 'claimed'], 10, 8],
            ],
            /*
             * A claimed listing is not dimmed, even when it is not a match.
             * That is the whole visible reward for claiming on this surface:
             * the logo itself cannot be painted into a circle layer without
             * loading an image per business, and 1,092 of those would cost far
             * more than the map is worth — so the logo lives on the list beside
             * the map and on the listing page, and here claiming buys a pin
             * that reads as solid rather than faint.
             */
            'circle-opacity': ['case', ['get', 'hit'], 1, ['get', 'claimed'], 1, 0.75],
            'circle-stroke-width': ['case', ['get', 'hit'], 3, ['get', 'claimed'], 1.8, 1],
            // A white ring on a match, so it reads against the map as well as
            // against the pins beside it.
            'circle-stroke-color': ['case', ['get', 'hit'], '#ffffff', 'rgba(255,255,255,0.7)'],
          },
        });

        instance.on('click', 'pin', (e: any) => {
          const id = e?.features?.[0]?.properties?.id;
          if (id && onSelect) onSelect(String(id));
        });

        // Tapping a cluster opens it rather than doing nothing, which is the
        // single most confusing thing an unhandled cluster does.
        instance.on('click', 'clusters', (e: any) => {
          const feature = e?.features?.[0];
          const clusterId = feature?.properties?.cluster_id;
          if (clusterId == null) return;
          instance.getSource('listings').getClusterExpansionZoom(clusterId)
            .then((zoom: number) => {
              instance.easeTo({ center: feature.geometry.coordinates, zoom });
            })
            .catch(() => { /* an un-expandable cluster is not worth an error */ });
        });

        for (const layer of ['pin', 'clusters']) {
          instance.on('mouseenter', layer, () => { instance.getCanvas().style.cursor = 'pointer'; });
          instance.on('mouseleave', layer, () => { instance.getCanvas().style.cursor = ''; });
        }

        setStatus({ kind: 'ready' });
      });
    })();

    return () => { cancelled = true; };
    // `collection` is deliberately not a dependency: the source is created
    // once and updated by the effect below. Rebuilding the map on every
    // keystroke would be absurd.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.kind]);

  /* ── tear down ────────────────────────────────────────────────────────── */

  useEffect(() => () => {
    try { map.current?.remove(); } catch { /* already gone */ }
    map.current = null;
  }, []);

  /* ── keep the pins current ────────────────────────────────────────────── */

  useEffect(() => {
    if (status.kind !== 'ready') return;
    const m = map.current;
    const source = m?.getSource?.('listings');
    if (source?.setData) source.setData(collection);

    /*
     * Repaint for the search.
     *
     * With nothing typed every pin is the accent colour, because they are all
     * equally the answer. While searching, a match keeps the accent and grows,
     * and everything else recedes — the same treatment the list gives, so the
     * two halves of the page agree about what is being pointed at.
     *
     * Clusters follow their `hits` count, which is why that property exists:
     * a cluster holding a match stays lit, one holding none recedes with the
     * rest. Otherwise a search would be invisible at any zoom where the pins
     * are grouped, which at town zoom is all of them.
     */
    try {
      m.setPaintProperty('pin', 'circle-color',
        searching ? ['case', ['get', 'hit'], ACCENT, QUIET] : ACCENT);
      m.setPaintProperty('pin', 'circle-radius',
        searching ? ['case', ['get', 'hit'], 9, 5] : 6);
      m.setPaintProperty('pin', 'circle-opacity',
        searching ? ['case', ['get', 'hit'], 1, 0.4] : 0.95);
      m.setPaintProperty('pin', 'circle-stroke-width',
        searching ? ['case', ['get', 'hit'], 2.5, 0.5] : 1);

      m.setPaintProperty('clusters', 'circle-color',
        searching
          ? ['case', ['>', ['get', 'hits'], 0], 'rgba(234,88,12,0.9)', 'rgba(100,116,139,0.45)']
          : 'rgba(234,88,12,0.82)');
      m.setPaintProperty('cluster-count', 'text-color',
        searching
          ? ['case', ['>', ['get', 'hits'], 0], '#fff', 'rgba(255,255,255,0.5)']
          : '#fff');
    } catch { /* a map mid-teardown is not worth an error */ }
  }, [collection, status.kind, searching]);

  /*
   * Take the view to the matches.
   *
   * Highlighting something off-screen is not highlighting it. When a search
   * has results the map frames those results; when it is cleared the map goes
   * back to framing everything. Keyed on which listings matched rather than on
   * the query, so refining "sho" to "shoe" with the same two results does not
   * re-animate the map under the reader.
   */
  const matchKey = useMemo(
    () => (searching ? pins.filter((p) => p.highlighted).map((p) => p.id).join('|') : ''),
    [pins, searching],
  );

  useEffect(() => {
    if (status.kind !== 'ready' || !pins.length) return;

    // Matches when there are any, otherwise everything. Clearing the search
    // therefore pulls back to the whole category rather than leaving the
    // reader zoomed into wherever their last answer happened to be.
    const framing = matchKey ? pins.filter((p) => p.highlighted) : pins;
    const box = boundsOf(framing.map((p) => p.location));
    if (!box) return;

    try {
      map.current.fitBounds(
        [[box.sw.lng, box.sw.lat], [box.ne.lng, box.ne.lat]],
        // A single pin would otherwise fit to zoom 22 and show one rooftop.
        // Instant on the first frame, animated afterwards so a search reads as
        // a movement rather than a jump cut.
        { padding: FIT_PADDING, maxZoom: matchKey ? 14 : 15, duration: framed.current ? 500 : 0 },
      );
      framed.current = true;
    } catch { /* a map mid-teardown is not an error worth showing */ }
    // `pins` supplies the coordinates but must not retrigger the fit; the two
    // keys are what say the answer actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, matchKey, status.kind]);

  /* ── frame what is actually there ─────────────────────────────────────── */

  /* Deliberately removed: this used to fit to every pin, keyed on `pinKey`.
     The single effect below does both jobs, because two effects calling
     `fitBounds` on the same map race each other the moment a search lands. */

  /* ── where they are ──────────────────────────────────────────────────── */

  useEffect(() => {
    if (status.kind !== 'ready') return;
    let maplibre: typeof import('maplibre-gl');

    (async () => {
      // Already resolved by now — a dynamic import of a loaded module is a
      // cache hit, not a second download.
      try { maplibre = await import('maplibre-gl'); } catch { return; }
      if (!map.current) return;

      if (hereMarker.current) { hereMarker.current.remove(); hereMarker.current = null; }
      if (!here) return;

      const dot = document.createElement('div');
      dot.className = 'bpxm-you';
      dot.title = 'You are here';
      hereMarker.current = new maplibre.Marker({ element: dot })
        .setLngLat([here.lng, here.lat])
        .addTo(map.current);

      /*
       * Following means the view moves too, not just the dot.
       *
       * `easeTo` rather than `flyTo`: a fix arrives every few seconds while
       * walking, and the swooping zoom-out-zoom-in of a fly would be unusable
       * repeated at that rate. The zoom is left alone — whatever they have
       * pinched to is what they wanted.
       */
      if (follow) {
        map.current.easeTo({ center: [here.lng, here.lat], duration: 700 });
      }
    })();
  }, [here, status.kind, follow]);

  /* ── follow the list's selection ─────────────────────────────────────── */

  useEffect(() => {
    if (status.kind !== 'ready' || !selectedId) return;
    const chosen = pins.find((p) => p.id === selectedId);
    if (!chosen) return;
    try {
      map.current.easeTo({
        center: [chosen.location.lng, chosen.location.lat],
        zoom: Math.max(map.current.getZoom(), 14),
        duration: 420,
      });
    } catch { /* ignore */ }
  }, [selectedId, status.kind, pins]);

  const zoom = useCallback((by: number) => {
    try {
      const m = map.current;
      if (m) m.easeTo({ zoom: m.getZoom() + by, duration: 180 });
    } catch { /* ignore */ }
  }, []);

  const recentre = useCallback(() => {
    const box = boundsOf(pins.map((p) => p.location));
    if (!box || !map.current) return;
    try {
      map.current.fitBounds(
        [[box.sw.lng, box.sw.lat], [box.ne.lng, box.ne.lat]],
        { padding: FIT_PADDING, maxZoom: 15, duration: 300 },
      );
    } catch { /* ignore */ }
  }, [pins]);

  /* ── what to say when there is no map ─────────────────────────────────── */

  const placeable = pins.length;

  if (!placeable) {
    return (
      <div className="bpxm-shell bpxm-flat">
        <MapPin size={20} color="#9ca3af" />
        <div className="bpxb-note">
          None of these businesses has a location on record yet, so there is
          nothing to put on a map.
        </div>
      </div>
    );
  }

  return (
    <div className="bpxm-wrap">
      <div ref={holder} className="bpxm-shell" aria-label="Map of these businesses">
        {status.kind !== 'ready' && (
          <div className="bpxm-cover">
            {status.kind === 'unconfigured' && (
              <>
                <MapPin size={20} color="#9ca3af" />
                <div className="bpxb-note" style={{ maxWidth: 360, textAlign: 'center' }}>
                  The map needs a tile key before it can draw. Distances and
                  search below work without it.
                </div>
              </>
            )}
            {status.kind === 'unavailable' && (
              <>
                <AlertCircle size={20} color="#fca5a5" />
                <div className="bpxb-note" style={{ maxWidth: 360, textAlign: 'center' }}>
                  {status.why}
                </div>
              </>
            )}
            {(status.kind === 'waiting' || status.kind === 'loading') && (
              <Loader2 size={20} className="animate-spin" color="#9ca3af" />
            )}
          </div>
        )}

        {status.kind === 'ready' && (
          <div className="bpxm-controls">
            <button type="button" onClick={() => zoom(1)} aria-label="Zoom in"><Plus size={15} /></button>
            <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out"><Minus size={15} /></button>
            <button type="button" onClick={recentre} aria-label="Fit all of them in"><Crosshair size={15} /></button>
          </div>
        )}

        {status.kind === 'ready' && (
          /* The licence term, on the map where it belongs. */
          <div className="bpxm-credit">{credit}</div>
        )}
      </div>

      {/* Said under the map rather than hidden, because a map that quietly
          holds fewer businesses than the list is actively misleading. */}
      {unplaceable > 0 && (
        <div className="bpxb-note">
          {unplaceable} {unplaceable === 1 ? 'business is' : 'businesses are'} not
          on the map because {unplaceable === 1 ? 'it has' : 'they have'} no
          location on record. {unplaceable === 1 ? 'It is' : 'They are'} still
          in the list below.
        </div>
      )}
    </div>
  );
}
