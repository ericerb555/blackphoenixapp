/**
 * The directory advertising itself, beside advertisers who paid.
 *
 * Two things can go wrong and only one of them is visible. The house ad can
 * fail to appear, which somebody notices within a day. Or it can quietly take
 * the position a paying advertiser bought, or travel without the flag that
 * lets the page label it honestly — and neither of those is noticed until a
 * person asks why the owner's own promotion sits above the one they paid for
 * under a heading that says "paid for".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mixHouseAd, houseAdIsShowable, HOUSE_KEY, type HouseAd,
} from '../supabase/functions/server/houseAd.ts';

const paid = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `paid${i + 1}` }));
const house: HouseAd = {
  id: 'house-exchange',
  title: 'The Black Phoenix Company',
  linkUrl: 'https://theblackphoenixcompany.com',
  isActive: true,
};

test('it appears when nothing has been sold', () => {
  const out = mixHouseAd([], house, 2);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'house-exchange');
});

test('it still appears when the block is already full of paid ads', () => {
  // The whole point of "always". Appending to a full list would drop it
  // exactly when there is most to be seen beside.
  const out = mixHouseAd(paid(5), house, 2);
  assert.equal(out.length, 2);
  assert.equal(out[out.length - 1].id, 'house-exchange');
});

test('it never takes the top slot from somebody who paid for it', () => {
  const out = mixHouseAd(paid(3), house, 3);
  assert.deepEqual(out.map((a) => a.id), ['paid1', 'paid2', 'house-exchange']);
});

test('it is marked, so the page can label it as the directory’s own', () => {
  // Without this flag it renders under "Advertisement — paid for", which it
  // is not. That label is the basis on which the block is allowed to exist.
  const out = mixHouseAd(paid(1), house, 2);
  assert.equal((out[1] as any).house, true);
  assert.notEqual((out[0] as any).house, true);
});

test('switched off, it does not appear and the paid ads take the room back', () => {
  const out = mixHouseAd(paid(2), { ...house, isActive: false }, 2);
  assert.deepEqual(out.map((a) => a.id), ['paid1', 'paid2']);
});

test('no house ad configured changes nothing', () => {
  assert.deepEqual(mixHouseAd(paid(2), null, 2).map((a) => a.id), ['paid1', 'paid2']);
  assert.deepEqual(mixHouseAd(paid(2), undefined, 2).map((a) => a.id), ['paid1', 'paid2']);
});

test('a limit of one shows the house ad and nothing else', () => {
  // Deliberate: "always" means always, and a one-slot block is the case where
  // the rule has to be stated rather than inferred.
  const out = mixHouseAd(paid(4), house, 1);
  assert.deepEqual(out.map((a) => a.id), ['house-exchange']);
});

test('a limit of zero shows nothing at all', () => {
  assert.deepEqual(mixHouseAd(paid(4), house, 0), []);
});

/* ── what counts as complete enough to show ──────────────────────────────── */

test('an incomplete house ad is not shown, rather than shown broken', () => {
  // A row with no destination is a picture that does nothing; a row with no
  // title is a blank line. Both read as a broken directory.
  assert.equal(houseAdIsShowable({ ...house, linkUrl: '' }), false);
  assert.equal(houseAdIsShowable({ ...house, title: '' }), false);
  assert.equal(houseAdIsShowable({ ...house, id: '' }), false);
  assert.equal(houseAdIsShowable({ ...house, isActive: false }), false);
  assert.equal(houseAdIsShowable(null), false);
});

test('a complete one is', () => {
  assert.equal(houseAdIsShowable(house), true);
});

test('the key is per placement, so the Exchange and the marquee differ', () => {
  assert.equal(HOUSE_KEY('exchange'), 'ad_house:exchange');
  assert.notEqual(HOUSE_KEY('exchange'), HOUSE_KEY('marquee'));
});
