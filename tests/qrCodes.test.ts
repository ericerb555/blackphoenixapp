/**
 * Saved QR codes, and what leaves the building when one is sent.
 *
 * Two of these tests guard a link this company puts in front of a customer
 * under its own name, which is the part worth being strict about: the
 * destination goes into a text message and into an email href, and the fact
 * that somebody typed it into our own admin screen is not a reason to pass
 * `javascript:` along to a homeowner.
 *
 * WHY DROPPING RATHER THAN REFUSING
 *
 * The save arrives as the whole list every time. One malformed entry must not
 * cost somebody the other fifty-nine codes they have built up — so bad entries
 * are dropped and good ones kept, and there is a test saying so, because the
 * instinct when writing a validator is to reject the request.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeCodes, isImageDataUrl, isSendableUrl, smsTextFor, emailSubjectFor,
  emailHtmlFor, attachmentNameFor, MAX_SAVED_CODES, MAX_DATA_URL_BYTES,
  type QRCode,
} from '../supabase/functions/server/qrCodes.ts';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const code = (over: Partial<QRCode> = {}): QRCode => ({
  id: 'q1',
  label: 'Truck door',
  url: 'https://theblackphoenixcompany.com/get-quote',
  dataUrl: PNG,
  ...over,
});

test('a real QR entry survives', () => {
  const out = sanitizeCodes([code()]);
  assert.equal(out.length, 1);
  assert.equal(out[0].url, 'https://theblackphoenixcompany.com/get-quote');
});

test('only image data URIs are accepted', () => {
  assert.equal(isImageDataUrl(PNG), true);
  assert.equal(isImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), true);
  assert.equal(isImageDataUrl('data:text/html;base64,PGI+aGk8L2I+'), false);
  assert.equal(isImageDataUrl('https://example.com/x.png'), false);
  assert.equal(isImageDataUrl(''), false);
});

test('only http(s) destinations are sendable', () => {
  // The one that matters: this string becomes an href in an email we send and
  // the body of a text we send. Our own admin screen is not a trust boundary.
  assert.equal(isSendableUrl('https://x.com/a'), true);
  assert.equal(isSendableUrl('http://x.com'), true);
  assert.equal(isSendableUrl('javascript:alert(1)'), false);
  assert.equal(isSendableUrl('data:text/html,<b>x</b>'), false);
  assert.equal(isSendableUrl('mailto:a@b.com'), false);
  assert.equal(isSendableUrl('/relative'), false);
  assert.equal(isSendableUrl(''), false);
});

test('a bad entry is dropped and the good ones are kept', () => {
  const out = sanitizeCodes([
    code({ id: 'ok1' }),
    code({ id: 'bad', url: 'javascript:alert(1)' }),
    code({ id: 'ok2' }),
    { id: 'no-url', label: 'x', dataUrl: PNG } as any,
    code({ id: 'bad2', dataUrl: 'data:text/html;base64,PGI+' }),
  ]);
  assert.deepEqual(out.map((c) => c.id), ['ok1', 'ok2']);
});

test('an oversized image is dropped, not stored', () => {
  const huge = 'data:image/png;base64,' + 'A'.repeat(MAX_DATA_URL_BYTES + 10);
  assert.deepEqual(sanitizeCodes([code({ dataUrl: huge })]), []);
});

test('the list is capped', () => {
  const many = Array.from({ length: MAX_SAVED_CODES + 25 }, (_, i) => code({ id: `q${i}` }));
  assert.equal(sanitizeCodes(many).length, MAX_SAVED_CODES);
});

test('garbage input yields an empty list rather than throwing', () => {
  for (const bad of [null, undefined, 'nope', 42, {}, [null], [undefined]]) {
    assert.deepEqual(sanitizeCodes(bad as any), [], JSON.stringify(bad));
  }
});

test('the text message carries the DESTINATION, never the image', () => {
  // Eric: "send the destination url in the text." A picture of a QR code on
  // your own phone is a puzzle; the link is the thing.
  const text = smsTextFor(code());
  assert.ok(text.includes('https://theblackphoenixcompany.com/get-quote'));
  assert.ok(!text.includes('data:image'), 'a text must never carry the PNG');
  assert.ok(!text.includes('base64'));
});

test('the text says who it is from and which link it is', () => {
  const text = smsTextFor(code());
  assert.ok(text.includes('Black Phoenix Builds'));
  assert.ok(text.includes('Truck door'));
  // Short enough not to split into several messages, which reads as spam.
  assert.ok(text.length <= 160, `${text.length} characters`);
});

test('an unlabelled code still produces a sensible text', () => {
  const text = smsTextFor(code({ label: 'Untitled' }));
  assert.ok(!text.includes('Untitled'), 'the placeholder label must not be sent');
  assert.ok(text.includes('https://'));
});

test('the email carries both the image and the destination', () => {
  const html = emailHtmlFor(code());
  assert.ok(html.includes('data:image/png;base64'), 'whoever prints it needs the PNG');
  assert.ok(html.includes('https://theblackphoenixcompany.com/get-quote'), 'and the URL, readable');
});

test('a hostile label cannot break out of the email HTML', () => {
  const html = emailHtmlFor(code({ label: '<script>alert(1)</script>' }));
  assert.ok(!html.includes('<script>'), html.slice(0, 200));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('the subject names the code, and the attachment is findable', () => {
  assert.equal(emailSubjectFor(code()), 'Black Phoenix Builds QR code: Truck door');
  assert.equal(attachmentNameFor(code()), 'BP-QR-Truck-door.png');
  assert.equal(attachmentNameFor(code({ label: '!!!' })), 'BP-QR-code.png');
});
