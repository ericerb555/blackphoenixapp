/**
 * Phoenix Exchange — one business, as a row under a map.
 *
 * WHY THIS IS A COMPONENT AND NOT TWO COPIES
 *
 * Two surfaces now draw a map with a list of the same businesses beneath it:
 * the directory front door and the full map page. They were going to be
 * maintained as duplicates, and the logo chip had already been added to one of
 * them — the drift starts immediately and is invisible until somebody notices
 * a business looks different depending on which page found it.
 *
 * THE THREE STATES A ROW CAN BE IN, AND WHY DIMMING RATHER THAN HIDING
 *
 * A search HIGHLIGHTS; it never removes. `hit` lights the row and `dim` fades
 * the rest, because the point of a map of a whole town is noticing the thing
 * you were not looking for — a filtered list cannot do that, and a resident who
 * typed "pizza" is still well served by seeing the bakery next door. The
 * category chips are the only control that removes anything, and a person
 * chose those explicitly.
 *
 * `chosen` is separate from `hit` and coloured differently on purpose: one is
 * "this answers what you typed", the other is "this is the pin you just
 * tapped", and a row can be both.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. Named classes only.
 */
import { MapPin, Building2 } from 'lucide-react';
import { formatDistance } from '../../lib/exchangeGeo';

export interface BizRowListing {
  id: string;
  slug: string;
  name: string;
  claimed: boolean;
  /** Approved, on a listing still claimed. Null on most of them, for now. */
  logo?: string | null;
}

interface Props {
  listing: BizRowListing;
  /** Null when nowhere has been measured from — the front door never asks. */
  miles?: number | null;
  /** Answers the current search. Ignored unless something is typed. */
  hit?: boolean;
  /** Something is typed, so highlighting means anything at all. */
  searching?: boolean;
  /** The pin that was tapped. */
  chosen?: boolean;
  onSelect?: (id: string) => void;
}

export const listingHref = (slug: string) =>
  `/exchange-listing?slug=${encodeURIComponent(slug)}`;

export default function ExchangeBizRow({
  listing, miles = null, hit = false, searching = false, chosen = false, onSelect,
}: Props) {
  return (
    <div className="bpx-card">
      <div
        className="bpx-card-body bpxb-biz"
        data-claimed={listing.claimed}
        data-hit={searching && hit}
        data-dim={searching && !hit}
        data-chosen={chosen}
        onClick={onSelect ? () => onSelect(listing.id) : undefined}
      >
        <div className="bpxb-biz-top">
          {/* The logo beside the name, not instead of it. A row that led with
              an image would make the thousand listings without one look broken
              rather than plain. */}
          {listing.logo && (
            <div className="bpxb-logo-chip">
              <img src={listing.logo} alt="" />
            </div>
          )}
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
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
  );
}
