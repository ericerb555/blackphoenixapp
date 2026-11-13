/**
 * The conditions report as a document — the thing a deposit dispute turns on.
 *
 * `tasks/conditions-report.md` C7: "Itemised per area with both sides'
 * evidence, dated, the deposit arithmetic shown, each cost naming the quote
 * behind it."
 *
 * WHY IT IS A DOCUMENT AND NOT THE SCREEN WITH A PRINT BUTTON
 *
 * The screen is a working view: it has override buttons, expanding rows and
 * status chips, and it shows the landlord what they can still change. This is
 * the version handed to somebody who was not there — a tenant, or an
 * adjudicator reading it six months later with both parties disagreeing. It
 * carries no controls, and everything it asserts carries its source.
 *
 * BOTH SIDES, SIDE BY SIDE, INCLUDING WHERE THEY DISAGREE
 *
 * A deposit deduction is a claim about how a room changed. The move-in and
 * move-out readings sit in adjacent columns so that claim can be checked
 * rather than taken on trust, and a line where the landlord recorded something
 * different from what the tenant signed says so on its face — that is the
 * single most important thing on the page for anybody adjudicating it.
 *
 * An unsigned move-in record is marked. It is still evidence; it is weaker
 * evidence, and the reader is the one who should weigh it.
 *
 * EVERY FIGURE NAMES WHERE IT CAME FROM
 *
 * Each cost carries its quote id, and the arithmetic from deposit to returned
 * is shown as a sum rather than a result. A statement that says "we are
 * keeping $740" is an assertion; one that shows deposit minus four named,
 * quoted lines is a document.
 */
import DocumentPreviewModal from '../documents/DocumentPreviewModal';

/** Loose shapes: these come from the server's own view model. */
interface SideReading {
  condition?: string | null;
  notes?: string;
  signed?: boolean;
  landlordCondition?: string | null;
  media?: Array<{ url?: string; caption?: string }>;
}
interface Line {
  area: string;
  moveIn?: SideReading | null;
  moveOut?: SideReading | null;
  classification?: string;
  chargeable?: boolean;
  disputed?: boolean;
  why?: string;
}
interface Cost { area: string; cost?: number | null; quoteId?: string }
interface View {
  record: any;
  diff: { lines: Line[]; tenancyMonths?: number | null; notes?: string[]; noBaseline?: boolean };
  settlement: {
    deposit?: { amount?: number | null };
    deductions?: number | null;
    returnedToTenant?: number | null;
    owedByTenant?: number | null;
    unpriced?: string[];
    lines?: Cost[];
    notes?: string[];
  };
}

const money = (n: number | null | undefined) =>
  (n === null || n === undefined || !Number.isFinite(Number(n)))
    ? '—'
    : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const when = (iso: unknown) => {
  const t = Date.parse(String(iso ?? ''));
  return Number.isFinite(t)
    ? new Date(t).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
};

/** One side's reading, as evidence rather than as a word. */
function Side({ side, label }: { side: SideReading | null | undefined; label: string }) {
  if (!side) {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase text-gray-500">{label}</p>
        <p className="text-sm text-gray-500">No record</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{side.condition || '—'}</p>
      {/*
        The landlord's own reading, shown only when it differs from the one the
        tenant signed. Hiding a disagreement on the document that exists to
        settle disagreements would be the one unforgivable omission here.
      */}
      {side.landlordCondition && side.landlordCondition !== side.condition && (
        <p className="text-xs text-amber-700">
          Landlord recorded: {side.landlordCondition}
        </p>
      )}
      {side.signed === false && (
        <p className="text-xs text-amber-700">Not signed by the tenant</p>
      )}
      {side.notes ? <p className="mt-0.5 text-xs text-gray-600">{side.notes}</p> : null}
      {(side.media?.length ?? 0) > 0 && (
        <p className="mt-0.5 text-[10px] text-gray-500">
          {side.media!.length} photograph{side.media!.length === 1 ? '' : 's'} on file
        </p>
      )}
    </div>
  );
}

export default function ConditionsReportPrint({
  isOpen, onClose, view, actions,
}: {
  isOpen: boolean;
  onClose: () => void;
  view: View;
  /** Share, and anything else the caller wants on the toolbar. */
  actions?: React.ReactNode;
}) {
  const r = view.record || {};
  const s = view.settlement || {};
  const costFor = (area: string) => (s.lines || []).find((l) => l.area === area);
  const id = 'conditions-report-print';

  return (
    <DocumentPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="Conditions report"
      printElementId={id}
      actions={actions}
    >
      {/* White ground and dark text: this is printed and photocopied. */}
      <div id={id} className="bg-white p-8 text-gray-900">
        <header className="border-b border-gray-300 pb-4">
          <h1 className="text-xl font-bold">Conditions report and deposit statement</h1>
          <p className="mt-1 text-sm text-gray-700">
            {r.propertyAddress}{r.unit ? ` · ${r.unit}` : ''}
          </p>
          <p className="text-sm text-gray-700">
            Tenant: {r.tenantName || r.tenantEmail || '—'}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 sm:grid-cols-4">
            <div><dt className="font-bold uppercase">Move-in</dt><dd>{when(r.moveInAt)}</dd></div>
            <div><dt className="font-bold uppercase">Move-out</dt><dd>{when(r.moveOutAt)}</dd></div>
            <div>
              <dt className="font-bold uppercase">Tenancy</dt>
              <dd>{view.diff?.tenancyMonths ?? '—'} months</dd>
            </div>
            <div><dt className="font-bold uppercase">Prepared</dt><dd>{when(r.updatedAt || r.createdAt)}</dd></div>
          </dl>
        </header>

        {/*
          The caveats go at the TOP, not in a footnote.
          A report with no move-in baseline is a weaker document and the reader
          should know that before they read the deductions, not after.
        */}
        {((view.diff?.notes?.length ?? 0) > 0 || (s.notes?.length ?? 0) > 0) && (
          <section className="mt-4 rounded border border-amber-300 bg-amber-50 p-3">
            <h2 className="text-[10px] font-bold uppercase text-amber-800">Read this first</h2>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-900">
              {[...(view.diff?.notes || []), ...(s.notes || [])].map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase text-gray-700">Area by area</h2>
          <div className="mt-2 divide-y divide-gray-200 border-y border-gray-200">
            {(view.diff?.lines || []).map((line) => {
              const priced = costFor(line.area);
              return (
                <div key={line.area} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-4">
                  <div>
                    <p className="font-semibold">{line.area}</p>
                    <p className="text-xs uppercase text-gray-600">
                      {line.classification || '—'}
                      {line.disputed ? ' · disputed' : ''}
                    </p>
                    {/* The sentence the server wrote, which says WHY it is classified so. */}
                    {line.why ? <p className="mt-0.5 text-xs text-gray-600">{line.why}</p> : null}
                  </div>
                  <Side side={line.moveIn} label="At move-in" />
                  <Side side={line.moveOut} label="At move-out" />
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase text-gray-500">Cost</p>
                    {line.chargeable
                      ? (priced?.cost !== null && priced?.cost !== undefined
                        ? <>
                            <p className="font-semibold">{money(priced.cost)}</p>
                            {/* Naming the quote is what makes the figure checkable. */}
                            {priced.quoteId
                              ? <p className="text-[10px] text-gray-500">Quote {priced.quoteId}</p>
                              : null}
                          </>
                        : <p className="text-sm text-gray-600">Awaiting price</p>)
                      : <p className="text-sm text-gray-500">Not charged</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/*
          The arithmetic as a sum, not a result.
          "We are keeping $740" is an assertion. Deposit, minus named and quoted
          lines, equals what is returned — that is a document somebody can check
          line by line, which is the entire point of it.
        */}
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase text-gray-700">The deposit</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-1.5">Deposit held</td>
                <td className="py-1.5 text-right font-semibold">{money(s.deposit?.amount)}</td>
              </tr>
              {(s.lines || []).filter((l) => l.cost !== null && l.cost !== undefined).map((l) => (
                <tr key={l.area} className="border-b border-gray-100">
                  <td className="py-1.5 pl-4 text-gray-700">
                    Less: {l.area}
                    {l.quoteId ? <span className="text-xs text-gray-500"> · quote {l.quoteId}</span> : null}
                  </td>
                  <td className="py-1.5 text-right">-{money(l.cost)}</td>
                </tr>
              ))}
              <tr className="border-b border-gray-300">
                <td className="py-1.5 font-semibold">Total deductions</td>
                <td className="py-1.5 text-right font-semibold">{money(s.deductions)}</td>
              </tr>
              <tr>
                <td className="py-2 font-bold">
                  {Number(s.owedByTenant) > 0 ? 'Owed by tenant' : 'Returned to tenant'}
                </td>
                <td className="py-2 text-right text-lg font-bold">
                  {Number(s.owedByTenant) > 0 ? money(s.owedByTenant) : money(s.returnedToTenant)}
                </td>
              </tr>
            </tbody>
          </table>

          {/*
            An unpriced area means the total below is not final, and saying so
            on the face of it is the difference between a draft and a statement
            somebody relies on.
          */}
          {(s.unpriced?.length ?? 0) > 0 && (
            <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              Not final — {s.unpriced!.length} area{s.unpriced!.length === 1 ? '' : 's'} still
              awaiting a price: {s.unpriced!.join(', ')}.
            </p>
          )}
        </section>

        <footer className="mt-6 border-t border-gray-300 pt-3 text-[10px] text-gray-500">
          Prepared from the signed move-in and move-out records for this tenancy.
          Costs shown are taken from the quotes named against each line.
        </footer>
      </div>
    </DocumentPreviewModal>
  );
}
