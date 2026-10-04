/**
 * reportHtml.ts — render a report's blocks as a page that looks like the books.
 *
 * WHY THIS AND NOT A PDF
 *
 * `documents-need-a-view-and-a-pdf` is the standing expectation: every business
 * document the platform produces can be viewed as it will actually look, and
 * printed or saved as a PDF. A print stylesheet satisfies both — the owner sees
 * the document, and Ctrl-P gives them the file — and it does it without
 * shipping jsPDF into the edge function that carries payments on a dependency
 * nobody here can prove works under Deno.
 *
 * MATCHING THE AUTHORED BOOKS ON PURPOSE
 *
 * The fifteen products are typeset by `pdfBook.mjs`: US Letter, one-inch
 * margins, Times for body text and Helvetica for furniture, ten-and-a-half
 * point body on fourteen point leading. Those are the numbers below. The plan's
 * warning was that generated reports would otherwise *"look like a different
 * company made them"* — the page here is deliberately the same page.
 *
 * ESCAPING
 *
 * Every string in a report comes from a record somebody typed: an inspection
 * note, a property name, a job title. All of it goes through `esc`, including
 * table cells and list items, because a landlord who names a unit `<script>`
 * must not get a document that runs it — and these pages are shared with
 * tenants, buyers and lenders.
 */
import type { Report, Block } from './propertyReportContent.ts';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** The same measurements pdfBook.mjs uses, in CSS. */
const STYLE = `
  :root {
    --ink: #15130f;
    --quiet: #5f5a52;
    --rule: #d6d1c7;
    --paper: #ffffff;
    --callout: #f6f3ec;
    --body: 'Times New Roman', Times, serif;
    --furniture: Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e9e6df; color: var(--ink); font-family: var(--body); }
  .sheet {
    background: var(--paper);
    width: 8.5in;
    max-width: 100%;
    margin: 24px auto;
    padding: 1in 1in 0.9in;
    box-shadow: 0 1px 4px rgba(0,0,0,.14);
  }
  h1 { font-family: var(--furniture); font-size: 25px; line-height: 1.2; margin: 0 0 6px; }
  .subtitle { font-family: var(--furniture); font-size: 13px; color: var(--quiet); margin: 0 0 22px; }
  h2 {
    font-family: var(--furniture); font-size: 16px; margin: 30px 0 10px;
    padding-bottom: 5px; border-bottom: 1px solid var(--rule);
  }
  h3 { font-family: var(--furniture); font-size: 13px; margin: 20px 0 6px; }
  p, li { font-size: 10.5pt; line-height: 14pt; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin: 0 0 5px; }
  .checks { list-style: none; padding-left: 4px; }
  .checks li::before { content: '\\2610'; margin-right: 8px; color: var(--quiet); }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 16px; }
  th, td {
    font-size: 9.5pt; line-height: 13pt; text-align: left; vertical-align: top;
    padding: 6px 8px; border-bottom: 1px solid var(--rule);
  }
  th { font-family: var(--furniture); font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: var(--quiet); }
  .callout {
    background: var(--callout); border-left: 3px solid #b8aa8a;
    padding: 12px 14px; margin: 14px 0 16px;
  }
  .callout .h { font-family: var(--furniture); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; margin: 0 0 5px; }
  .callout p { margin: 0; }
  .fields { display: grid; grid-template-columns: 150px 1fr; gap: 5px 14px; margin: 0 0 16px; }
  .fields dt { font-family: var(--furniture); font-size: 9pt; color: var(--quiet); }
  .fields dd { margin: 0; font-size: 10.5pt; }
  hr { border: 0; border-top: 1px solid var(--rule); margin: 18px 0; }
  .meta { font-family: var(--furniture); font-size: 9pt; color: var(--quiet); border-top: 1px solid var(--rule); margin-top: 34px; padding-top: 10px; }
  .print-hint { font-family: var(--furniture); font-size: 12px; text-align: center; color: #4c4740; margin: 18px 0 0; }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; box-shadow: none; padding: 0.75in 0.9in; width: auto; }
    .print-hint { display: none; }
    h2 { break-after: avoid; }
    table, .callout { break-inside: avoid; }
  }
  @page { size: letter; margin: 0.75in; }
  @media (max-width: 820px) {
    .sheet { padding: 28px 18px; margin: 0; }
    .fields { grid-template-columns: 1fr; gap: 2px 0; }
    .fields dd { margin-bottom: 8px; }
  }
`;

function renderBlock(b: Block): string {
  switch (b.t) {
    case 'h2': return `<h2>${esc(b.text)}</h2>`;
    case 'h3': return `<h3>${esc(b.text)}</h3>`;
    case 'p': return `<p>${esc(b.text)}</p>`;
    case 'bullets': return `<ul>${(b.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'numbers': return `<ol>${(b.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`;
    case 'checks': return `<ul class="checks">${(b.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'callout':
      return `<div class="callout"><p class="h">${esc(b.heading)}</p><p>${esc(b.body)}</p></div>`;
    case 'table': {
      const head = (b.head || []).map((h) => `<th>${esc(h)}</th>`).join('');
      const rows = (b.rows || []).map((r) => `<tr>${r.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
      // Its own scroller at phone width: a four-column table is the one thing
      // on the page that cannot reflow, and the page must not scroll sideways.
      return `<div style="overflow-x:auto">${`<table>${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${rows}</tbody></table>`}</div>`;
    }
    case 'fields':
      return `<dl class="fields">${(b.pairs || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    case 'rule': return '<hr />';
    // A page break is meaningless on screen and handled by the print rules.
    case 'break': return '';
    default: return '';
  }
}

export function reportToHtml(report: Report): string {
  const chapters = report.chapters
    .map((chapter) => `<h2>${esc(chapter.title)}</h2>${chapter.blocks.map(renderBlock).join('')}`)
    .join('');

  const meta = report.meta.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' &middot; ');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(report.title)} — ${esc(report.subtitle)}</title>
<style>${STYLE}</style>
</head><body>
<div class="sheet">
  <h1>${esc(report.title)}</h1>
  <p class="subtitle">${esc(report.subtitle)}</p>
  ${chapters}
  <p class="meta">${meta} &middot; Black Phoenix</p>
</div>
<p class="print-hint">Print this page, or save it as a PDF, from your browser&rsquo;s print dialog.</p>
</body></html>`;
}
