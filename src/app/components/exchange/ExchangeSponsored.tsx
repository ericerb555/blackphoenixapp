/**
 * Phoenix Exchange — a paying advertiser, labelled as one.
 *
 * THE LINE THIS STAYS ON THE RIGHT SIDE OF
 *
 * Paid placement *inside* the directory is the one thing a directory cannot
 * sell without becoming worthless: a plumber must never outrank a better
 * matched plumber because they paid. That is the same ruling already made
 * about the map, and nothing here touches it — this component renders its own
 * block and has no connection to the listings, the search, the pins or their
 * order. Delete it and every result on the Exchange is identical.
 *
 * What is being sold is a labelled space beside the directory, which is what
 * any newspaper has always sold next to its listings. The label is not
 * decoration; it is the whole basis on which this is allowed to exist, so it
 * is rendered before the content and never conditionally.
 *
 * IT IS THE FIRST THING IN THE APP TO ACTUALLY READ THE AD API
 *
 * `advertising.tsx` was built because "an advertiser pays for that screen, so
 * the numbers on it have to come from somewhere real" — campaigns, creatives,
 * an approval queue and impression counters. Nothing ever called it. Every
 * portal marquee reads `localStorage`, which no advertiser can write to, so
 * the advertiser portal has been reporting on counters that nothing
 * increments.
 *
 * This asks the server. The portals are deliberately left alone: changing the
 * data source under nineteen surfaces is its own change with its own risk, and
 * it is not this one.
 *
 * AN EMPTY BLOCK IS WORSE THAN NO BLOCK
 *
 * With nothing sold, this renders nothing at all — not a frame, not a heading,
 * not a placeholder. A directory with an empty advertisement slot on it looks
 * abandoned, and today there are no Exchange ads to show.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { publicAnonKey } from '../../utils/supabase/info';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface Ad {
  id: string;
  title: string;
  content: string;
  linkUrl: string | null;
  imageUrl: string | null;
}

/**
 * Only http and https may become a link target.
 *
 * The server sanitises these on the way in and again on the way out, and this
 * checks a third time. Not redundancy for its own sake: this is the value that
 * ends up in an `href` in a resident's browser, and the cost of being wrong is
 * an advertiser-supplied `javascript:` running as the person reading the page.
 */
function safeAdUrl(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export default function ExchangeSponsored({ limit = 2 }: { limit?: number }) {
  const [ads, setAds] = useState<Ad[]>([]);
  /** Ids already counted, so a re-render is not a second impression. */
  const counted = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `${SERVER}/advertising/serve?placement=exchange&limit=${limit}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } },
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || !body?.success) return;
        setAds(Array.isArray(body.ads) ? body.ads.slice(0, limit) : []);
      } catch {
        /* No ads is the normal state of this component. A failure to fetch
           them is not worth a word on a resident's screen. */
      }
    })();

    return () => { cancelled = true; };
  }, [limit]);

  /** Tell the server what was actually shown, once per ad per page. */
  useEffect(() => {
    const fresh = ads.map((ad) => ad.id).filter((id) => !counted.current.has(id));
    if (!fresh.length) return;
    for (const id of fresh) counted.current.add(id);

    void fetch(`${SERVER}/advertising/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ events: fresh.map((id) => ({ creativeId: id, kind: 'impression' })) }),
    }).catch(() => {
      /* An uncounted impression is a smaller problem than a broken page. */
    });
  }, [ads]);

  const clicked = useCallback((id: string) => {
    void fetch(`${SERVER}/advertising/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ events: [{ creativeId: id, kind: 'click' }] }),
    }).catch(() => { /* as above */ });
  }, []);

  // Nothing sold, nothing drawn. See the note above.
  if (!ads.length) return null;

  return (
    <div className="bpxb-section">
      <div className="bpxb-section-head">
        {/*
          Said plainly, in the heading, before anybody reads a word of the ad.
          "Sponsored" and "Promoted" are the industry's softer words for this
          and both are vaguer than the truth.
        */}
        <div className="bpxb-section-name">Advertisement</div>
        <div className="bpxb-section-tag">
          paid for — it is not a search result, and nothing here affects the
          listings
        </div>
      </div>

      {ads.map((ad) => {
        const href = safeAdUrl(ad.linkUrl);
        const image = safeAdUrl(ad.imageUrl);

        const inside = (
          <>
            {image && (
              <div className="bpxb-ad-image">
                <img src={image} alt="" />
              </div>
            )}
            <div className="bpxb-door-text">
              <div className="bpxb-door-title">{ad.title}</div>
              {ad.content && <div className="bpxb-note">{ad.content}</div>}
            </div>
            {href && <ExternalLink size={16} />}
          </>
        );

        /* An ad with no usable link is still an ad and is still shown; it just
           is not a link. Rendering an <a> with no href would be a control that
           looks clickable and is not. */
        return href ? (
          <a
            key={ad.id}
            className="bpxb-ad"
            href={href}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            onClick={() => clicked(ad.id)}
          >
            {inside}
          </a>
        ) : (
          <div key={ad.id} className="bpxb-ad">{inside}</div>
        );
      })}
    </div>
  );
}
