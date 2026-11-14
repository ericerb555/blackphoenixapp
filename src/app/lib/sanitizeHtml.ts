/**
 * Untrusted content, made safe to put on a page.
 *
 * Eric: "sanitize every user input before it enters any template at all strip
 * the html escape special characters" and "render user content as plain text,
 * never as raw html".
 *
 * WHAT COUNTS AS UNTRUSTED HERE, AND IT IS WIDER THAN "WHAT A USER TYPED"
 *
 * A customer's name and a lead's message obviously are. So is anything a
 * MODEL produced: `svgLayout` in the floor-plan flow is a `<svg>` string the
 * assistant is asked to return as part of a JSON object, and what it returns
 * is shaped by photographs and descriptions somebody else uploaded. A model
 * that can be talked into emitting `<svg onload="...">` is an injection
 * vector wearing a trusted coat. Treat generated markup exactly like typed
 * markup.
 *
 * THREE DIFFERENT JOBS, AND USING THE WRONG ONE IS THE USUAL MISTAKE
 *
 *   escapeHtml     text that must never be markup. The default. Use this
 *                  unless there is a specific reason not to.
 *   escapeAttr     the same, for a value going inside an attribute, where a
 *                  bare quote ends the attribute and starts a new one.
 *   sanitizeSvg    a drawing that has to stay a drawing. Allowlist: anything
 *                  not named is dropped.
 *
 * WHY A PARSER AND NOT A REGULAR EXPRESSION
 *
 * Regex sanitisers fail on the cases that matter — nested quotes, broken
 * tags, `<scr<script>ipt>`, attributes split across lines, entity-encoded
 * payloads. The browser already has a correct HTML parser; parsing into an
 * inert document and walking the tree is both shorter and right. `DOMParser`
 * does not execute anything it parses, and the result is never attached to
 * the live document until it has been through the allowlist.
 *
 * The one thing this module will not do is guess. An element or attribute
 * that is not on a list is removed, not "cleaned up" — a sanitiser that tries
 * to repair hostile input is a sanitiser with a bypass in it.
 */

/**
 * Text into HTML. The workhorse.
 *
 * Ampersand first, always — escaping it after the others would double-escape
 * the entities this very function just produced, turning `&lt;` into
 * `&amp;lt;` and printing the escape codes to the customer.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Text into an attribute value.
 *
 * Everything `escapeHtml` does, plus backtick and equals. Both are legal
 * attribute delimiters in some parsers' error recovery, and an unquoted
 * attribute written by a careless template turns `a=b onclick=evil()` into
 * two attributes. Escaping them costs nothing and removes the class.
 */
export function escapeAttr(value: unknown): string {
  return escapeHtml(value)
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#61;');
}

/**
 * Elements an SVG may contain. Shapes, structure and text — nothing that can
 * fetch, script or embed foreign content.
 *
 * `script` and `foreignObject` are the obvious exclusions. `image` and `use`
 * are excluded too and less obviously: both take a URL, and both have been
 * used to pull in external or `data:` payloads.
 */
const SVG_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'title', 'desc', 'symbol',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan',
  'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern',
  'marker', 'filter', 'feGaussianBlur', 'feOffset', 'feMerge', 'feMergeNode',
]);

/**
 * Attributes an SVG element may carry.
 *
 * Deliberately no `href`/`xlink:href` — a link inside a drawing is not worth
 * the `javascript:` surface — and no `style`, because a style attribute can
 * carry `url(...)` and behaviours that are their own problem. Presentation is
 * expressed through the named attributes below, which is how SVG is normally
 * written anyway.
 */
const SVG_ATTRS = new Set([
  'viewBox', 'xmlns', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'transform',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-opacity',
  'opacity', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits',
  'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline',
  'class', 'id', 'clip-path', 'mask', 'preserveAspectRatio',
]);

/**
 * A drawing, with everything that is not a drawing removed.
 *
 * Returns an empty string rather than throwing: a floor plan that cannot be
 * shown is a gap on a page, and a thrown error in a render is a blank screen.
 * The caller decides what to put in the gap.
 */
export function sanitizeSvg(svg: unknown): string {
  const source = String(svg ?? '').trim();
  if (!source) return '';

  // No DOMParser (a server render, a test runner without a DOM): refuse
  // rather than pass the string through unchecked. Returning the input here
  // would make the sanitiser a no-op exactly where nobody is watching.
  if (typeof DOMParser === 'undefined') return '';

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  } catch {
    return '';
  }

  // A parser error document is hostile or broken; either way it is not drawn.
  if (doc.querySelector('parsererror')) return '';

  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') return '';

  const clean = (node: Element): boolean => {
    if (!SVG_ELEMENTS.has(node.nodeName)) return false;

    for (const attr of Array.from(node.attributes)) {
      const name = attr.name;
      // Every `on*` handler, whatever its case, and anything not allowlisted.
      if (/^on/i.test(name) || !SVG_ATTRS.has(name)) {
        node.removeAttribute(name);
        continue;
      }
      // A surviving attribute can still carry a script URL in its value.
      if (/javascript:|data:text\/html|vbscript:/i.test(attr.value)) {
        node.removeAttribute(name);
      }
    }

    for (const child of Array.from(node.children)) {
      if (!clean(child)) child.remove();
    }
    return true;
  };

  if (!clean(root)) return '';
  return root.outerHTML;
}

/**
 * The last resort, and the one to reach for when in doubt.
 *
 * Takes anything and gives back something that can only ever be read, never
 * interpreted. Line breaks survive as `<br>` because losing them turns a
 * paragraph of customer notes into one unreadable run.
 */
export function asPlainTextHtml(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}
