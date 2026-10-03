/**
 * Editable Word documents, built from WordprocessingML directly.
 *
 * WHY EDITABLE MATTERS ENOUGH TO DO THIS
 *
 * Five of the products are templates — a lease pack, vendor contracts, an
 * inspection report, a board meeting package, a winter prep checklist. A lease
 * you cannot change is barely worth $49: the entire value is that somebody
 * fills in their own names, dates and amounts. PDF-only would have made five
 * products materially worse, so the format is not a nicety.
 *
 * `npm install` cannot run here (sixty malformed dependency entries in
 * package.json, an artefact of the original Figma export), so the `docx`
 * package is not available. A .docx is a zip of XML and the parts needed for a
 * clean, styled, editable document are few. See `zip.mjs` for the container.
 *
 * WHAT IT PRODUCES
 *
 * A document with real Word styles — Title, Heading 1 to 3, Normal — so the
 * navigation pane works and somebody can restyle the whole thing by changing a
 * style rather than hand-formatting every heading. Tables carry borders.
 * Fill-in blanks are shaded, so what wants completing is visible at a glance
 * and survives printing.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Images, fields, tracked changes, comments. None of the eleven documents needs
 * them, and each would be a part, a content type and a relationship for
 * something nobody asked for.
 */
import { zip } from './zip.mjs';

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Charcoal and amber, matching the spreadsheets so a buyer sees one company. */
const INK = '1C1917';
const INK_SOFT = '57534E';
const AMBER = 'B45309';
const RULE = 'E7E5E4';
const FILL_SHADE = 'FFFBEB';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Twips: Word's unit. 1 inch = 1440. */
const inch = (n) => Math.round(n * 1440);
/** Half-points, which is how Word sizes type. */
const pt = (n) => Math.round(n * 2);

// ── Content builders ────────────────────────────────────────────────────────

/**
 * A run of text. `text` may be an array of {t, b, i, mono} for mixed emphasis
 * inside one paragraph — which a contract needs constantly.
 */
function runs(text) {
  const parts = Array.isArray(text) ? text : [{ t: text }];
  return parts.map((part) => {
    if (part == null) return '';
    const piece = typeof part === 'string' ? { t: part } : part;
    const props = [];
    if (piece.b) props.push('<w:b/>');
    if (piece.i) props.push('<w:i/>');
    if (piece.mono) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
    if (piece.color) props.push(`<w:color w:val="${piece.color}"/>`);
    if (piece.size) props.push(`<w:sz w:val="${pt(piece.size)}"/>`);
    const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
    // xml:space="preserve" or Word eats leading and trailing spaces, which
    // matters for "Landlord: ____" style lines.
    return `<w:r>${rPr}<w:t xml:space="preserve">${esc(piece.t)}</w:t></w:r>`;
  }).join('');
}

export const title = (text) => `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${runs(text)}</w:p>`;
export const h1 = (text) => `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>${runs(text)}</w:p>`;
export const h2 = (text) => `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>${runs(text)}</w:p>`;
export const h3 = (text) => `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr>${runs(text)}</w:p>`;
export const p = (text) => `<w:p>${runs(text)}</w:p>`;
export const spacer = () => '<w:p/>';
export const pageBreak = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

/** A bulleted line. Indent and glyph by hand — a numbering part is overkill. */
export const bullet = (text, level = 0) =>
  `<w:p><w:pPr><w:ind w:left="${inch(0.3 + level * 0.3)}" w:hanging="${inch(0.2)}"/>`
  + `<w:spacing w:after="${pt(3)}"/></w:pPr>`
  + runs([{ t: '•   ' }, ...(Array.isArray(text) ? text : [{ t: text }])])
  + '</w:p>';

/** A numbered line, where the number is part of the text and stays put. */
export const numbered = (n, text) =>
  `<w:p><w:pPr><w:ind w:left="${inch(0.4)}" w:hanging="${inch(0.25)}"/>`
  + `<w:spacing w:after="${pt(3)}"/></w:pPr>`
  + runs([{ t: `${n}.   ` }, ...(Array.isArray(text) ? text : [{ t: text }])])
  + '</w:p>';

/** A checkbox line, for the inspection and winter-prep documents. */
export const checkbox = (text) =>
  `<w:p><w:pPr><w:ind w:left="${inch(0.35)}" w:hanging="${inch(0.25)}"/>`
  + `<w:spacing w:after="${pt(2)}"/></w:pPr>`
  + runs([{ t: '☐   ' }, ...(Array.isArray(text) ? text : [{ t: text }])])
  + '</w:p>';

/**
 * A labelled blank to fill in.
 *
 * Shaded rather than underscored, because a row of underscores is a guess at
 * how much somebody needs to write and looks like a fax. The shading prints,
 * so a completed paper copy still shows which parts were filled.
 */
export const fill = (label, width = 3.2) =>
  `<w:p><w:spacing w:after="${pt(6)}"/>${runs([{ t: `${label}  ` }])}`
  + `<w:r><w:rPr><w:shd w:val="clear" w:fill="${FILL_SHADE}"/><w:u w:val="single" w:color="${RULE}"/></w:rPr>`
  + `<w:t xml:space="preserve">${' '.repeat(Math.round(width * 12))}</w:t></w:r></w:p>`;

/** A quiet aside — guidance to the person filling it in, not contract text. */
export const note = (text) =>
  `<w:p><w:pPr><w:ind w:left="${inch(0.25)}"/><w:spacing w:before="${pt(2)}" w:after="${pt(8)}"/></w:pPr>`
  + runs([{ t: text, i: true, color: INK_SOFT, size: 9 }]) + '</w:p>';

/**
 * A table. `rows` is an array of arrays; the first is treated as a header.
 * `widths` are fractions of the text column and must sum to about 1.
 */
export function table(rows, widths) {
  const total = inch(6.5);
  const cols = widths || rows[0].map(() => 1 / rows[0].length);
  const grid = cols.map((w) => `<w:gridCol w:w="${Math.round(total * w)}"/>`).join('');

  const body = rows.map((row, rowIndex) => {
    const isHead = rowIndex === 0;
    const cells = row.map((cell, i) => {
      const shade = isHead ? `<w:shd w:val="clear" w:fill="${INK}"/>` : '';
      const content = isHead
        ? runs([{ t: String(cell ?? ''), b: true, color: 'FFFFFF', size: 9.5 }])
        : runs(Array.isArray(cell) ? cell : [{ t: String(cell ?? ''), size: 10 }]);
      return `<w:tc><w:tcPr><w:tcW w:w="${Math.round(total * cols[i])}" w:type="dxa"/>${shade}`
        + `<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>`
        + `<w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar>`
        + `</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${content}</w:p></w:tc>`;
    }).join('');
    // Header rows repeat when a long table breaks across pages.
    const props = isHead ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
    return `<w:tr>${props}${cells}</w:tr>`;
  }).join('');

  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="${RULE}"/>`).join('');

  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>`
    + `<w:tblBorders>${borders}</w:tblBorders></w:tblPr>`
    + `<w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
}

// ── The package ─────────────────────────────────────────────────────────────

function stylesXml() {
  const base = (id, name, opts) => {
    const { size = 11, bold = false, color = INK, before = 0, after = 6, outline, font = 'Calibri' } = opts || {};
    return `<w:style w:type="paragraph" w:styleId="${id}">`
      + `<w:name w:val="${name}"/><w:qFormat/>`
      + `<w:pPr><w:spacing w:before="${pt(before)}" w:after="${pt(after)}" w:line="276" w:lineRule="auto"/>`
      + (outline !== undefined ? `<w:outlineLvl w:val="${outline}"/>` : '')
      + `</w:pPr>`
      + `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>`
      + `<w:sz w:val="${pt(size)}"/><w:color w:val="${color}"/>${bold ? '<w:b/>' : ''}</w:rPr>`
      + `</w:style>`;
  };
  return XML_HEAD
    + `<w:styles xmlns:w="${W}">`
    + `<w:docDefaults><w:rPrDefault><w:rPr>`
    + `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${pt(11)}"/>`
    + `<w:color w:val="${INK}"/></w:rPr></w:rPrDefault></w:docDefaults>`
    + base('Normal', 'Normal', {})
    + base('Title', 'Title', { size: 24, bold: true, after: 4 })
    + base('Heading1', 'heading 1', { size: 16, bold: true, before: 14, after: 6, outline: 0 })
    + base('Heading2', 'heading 2', { size: 13, bold: true, before: 10, after: 4, outline: 1 })
    + base('Heading3', 'heading 3', { size: 11, bold: true, before: 8, after: 3, outline: 2, color: AMBER })
    + `</w:styles>`;
}

function footerXml(footerText) {
  return XML_HEAD
    + `<w:ftr xmlns:w="${W}">`
    + `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="${pt(6)}"/></w:pPr>`
    + `<w:r><w:rPr><w:sz w:val="${pt(8)}"/><w:color w:val="${INK_SOFT}"/></w:rPr>`
    + `<w:t xml:space="preserve">${esc(footerText)}   ·   page </w:t></w:r>`
    + `<w:r><w:rPr><w:sz w:val="${pt(8)}"/><w:color w:val="${INK_SOFT}"/></w:rPr>`
    + `<w:fldChar w:fldCharType="begin"/></w:r>`
    + `<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>`
    + `<w:r><w:fldChar w:fldCharType="end"/></w:r>`
    + `</w:p></w:ftr>`;
}

/**
 * Assemble a .docx.
 *
 * `content` is an array of the strings the builders above return — they are XML
 * fragments, concatenated into the body in order.
 */
export function buildDocx({ title: docTitle, subject, keywords, footer, content }) {
  const sectPr = `<w:sectPr>`
    + `<w:footerReference w:type="default" r:id="rId2"/>`
    + `<w:pgSz w:w="${inch(8.5)}" w:h="${inch(11)}"/>`
    + `<w:pgMar w:top="${inch(0.9)}" w:right="${inch(1)}" w:bottom="${inch(0.9)}" w:left="${inch(1)}"`
    + ` w:header="${inch(0.5)}" w:footer="${inch(0.5)}" w:gutter="0"/>`
    + `</w:sectPr>`;

  const documentXml = XML_HEAD
    + `<w:document xmlns:w="${W}" xmlns:r="${OFFICE_R}">`
    + `<w:body>${content.join('')}${sectPr}</w:body></w:document>`;

  const now = '2026-10-03T00:00:00Z';
  const core = XML_HEAD
    + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"`
    + ` xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"`
    + ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
    + `<dc:title>${esc(docTitle)}</dc:title>`
    + `<dc:subject>${esc(subject || '')}</dc:subject>`
    + `<dc:creator>The Black Phoenix Company</dc:creator>`
    + `<cp:keywords>${esc(keywords || '')}</cp:keywords>`
    + `<cp:lastModifiedBy>The Black Phoenix Company</cp:lastModifiedBy>`
    + `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>`
    + `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>`
    + `</cp:coreProperties>`;

  const app = XML_HEAD
    + `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">`
    + `<Application>Microsoft Office Word</Application>`
    + `<Company>The Black Phoenix Company</Company></Properties>`;

  const contentTypes = XML_HEAD
    + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
    + `<Default Extension="xml" ContentType="application/xml"/>`
    + `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`
    + `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>`
    + `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`
    + `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`
    + `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`
    + `</Types>`;

  const rootRels = XML_HEAD
    + `<Relationships xmlns="${R_NS}">`
    + `<Relationship Id="rId1" Type="${OFFICE_R}/officeDocument" Target="word/document.xml"/>`
    + `<Relationship Id="rId2" Type="${OFFICE_R}/extended-properties" Target="docProps/app.xml"/>`
    + `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>`
    + `</Relationships>`;

  const docRels = XML_HEAD
    + `<Relationships xmlns="${R_NS}">`
    + `<Relationship Id="rId1" Type="${OFFICE_R}/styles" Target="styles.xml"/>`
    + `<Relationship Id="rId2" Type="${OFFICE_R}/footer" Target="footer1.xml"/>`
    + `</Relationships>`;

  // [Content_Types].xml first: it is where a reader looks before anything else.
  return zip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: stylesXml() },
    { name: 'word/footer1.xml', data: footerXml(footer || 'The Black Phoenix Company') },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'docProps/core.xml', data: core },
    { name: 'docProps/app.xml', data: app },
  ]);
}

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
