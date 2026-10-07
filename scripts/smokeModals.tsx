/**
 * The modals the smoke test mounts, and the records it mounts them with.
 *
 * WHY THIS EXISTS
 *
 * The harness mounts every page in the route map. A modal is not a page: it
 * renders only when somebody presses a button, so nothing in the suite ever
 * rendered one. That gap had a cost on 2026-09-27 — a discount panel added to
 * the invoice modal read `calculateSubtotal()` above the line that declares it,
 * threw on every render, and took the whole invoice screen down. Typecheck
 * allowed it, because the name exists and temporal-dead-zone is a runtime rule.
 * Smoke passed, because smoke had never opened that modal. Eric found it by
 * pressing the button.
 *
 * THE RECORDS ARE DELIBERATELY THIN
 *
 * Each fixture below is close to the WORST record that could legitimately reach
 * the component, not a complete one. A modal handed a perfect object proves
 * very little: the failures on this project are missing fields, a quote written
 * in the other generation's shape, a job with no contract, an invoice with no
 * line items. Mounting with a full record would have passed on every one of
 * them.
 *
 * So: no quote totals where the other shape omits them, no priority where an
 * older work request stores `priority_level` instead, empty arrays where
 * production has empty arrays. If a component cannot survive these, a customer
 * will find out.
 *
 * ADDING ONE
 *
 * Give it a name, a thunk that renders it open, and the thinnest props that are
 * still honest. It is mounted in its own error boundary like any page, so a
 * throw is reported rather than taking the batch down.
 */
import { QuotePricingBasisBanner } from '../src/app/components/quotes/QuotePricingBasisBanner';
import CreateInvoiceModal from '../src/app/components/invoices/CreateInvoiceModal';
import InvoicePreviewModal from '../src/app/components/invoices/InvoicePreviewModal';
import { ProjectDetailsModal } from '../src/app/components/ProjectDetailsModal';
import { QuoteToContractEditor } from '../src/app/components/QuoteToContractEditor';

const noop = () => {};

/**
 * A quote in the OTHER generation's shape: `unitCost` and `quantity`, no
 * `totalCost` on the line and no `total` on the quote. This is the shape that
 * has now broken three separate screens.
 */
const thinQuote = {
  id: 'qt-smoke',
  quoteNumber: 'Q-SMOKE',
  materials: [{ name: 'Underlayment', unit: 'sq yd', quantity: 40, unitCost: 12.5 }],
  labor: [{ role: 'Fitter', hours: 8, hourlyRate: 85 }],
  processSteps: [],
  credits: [],
  taxRate: 0.08,
};

/** A job with no contract, no invoice, no owner and no priority field. */
const thinItem = {
  id: 'smoke-item',
  itemNumber: 'WR-SMOKE',
  stage: 'quote-draft',
  customerName: 'Smoke Test',
  customerEmail: 'smoke@example.test',
  serviceType: 'General Service',
  title: 'Thin record',
  description: '',
  estimatedValue: 0,
  createdDate: '2026-06-13T22:59:16.479Z',
  lastModified: '2026-06-13T22:59:16.479Z',
  // No priority, no contract, no invoice, no submission, no quote.
};

/** An invoice with no line items and none of the optional figures. */
const thinInvoice = {
  id: 'inv-smoke',
  invoice_id: 'inv-smoke',
  invoice_number: 'INV-SMOKE',
  customer_name: 'Smoke Test',
  customer_email: 'smoke@example.test',
  subtotal: 0,
  tax_amount: 0,
  total_amount: 0,
  paid_amount: 0,
  balance_due: 0,
  status: 'draft',
  line_items: [],
} as any;

export const modalMap: Record<string, () => JSX.Element> = {
  'modal:create-invoice': () => (
    <CreateInvoiceModal isOpen onClose={noop} onSuccess={noop} />
  ),

  /** The same modal reached the way the pipeline reaches it: prefilled. */
  'modal:create-invoice-from-job': () => (
    <CreateInvoiceModal
      isOpen
      onClose={noop}
      onSuccess={noop}
      projectData={{
        id: 'smoke-item',
        customerName: 'Smoke Test',
        customerEmail: 'smoke@example.test',
        title: 'Thin record',
        amount: 1180,
        lineItems: [
          { line_number: 1, description: 'Underlayment (sq yd)', quantity: 40, unit_price: 12.5, is_taxable: true },
          { line_number: 2, description: 'Labor — Fitter', quantity: 8, unit_price: 85, is_taxable: false },
          { line_number: 3, description: 'Customer-supplied flooring', quantity: 1, unit_price: -200, is_taxable: true },
        ],
      }}
    />
  ),

  'modal:invoice-preview': () => (
    <InvoicePreviewModal isOpen onClose={noop} invoice={thinInvoice} />
  ),

  'modal:project-details': () => (
    <ProjectDetailsModal item={thinItem} onClose={noop} onUpdate={noop} onStageChange={noop} />
  ),

  /** The same job once it has a quote, which is when the editor opens. */
  'modal:project-details-quoted': () => (
    <ProjectDetailsModal
      item={{ ...thinItem, quote: thinQuote }}
      initialTab="quote"
      onClose={noop}
      onUpdate={noop}
      onStageChange={noop}
    />
  ),

  'modal:quote-editor': () => (
    <QuoteToContractEditor
      workRequest={{ ...thinItem, quote: thinQuote } as any}
      onClose={noop}
      onSave={noop}
      onSendToCustomer={noop}
      onConvertToContract={noop}
    />
  ),

  /*
    The pricing-basis banner, once per basis.

    Thin on purpose, in the spirit of the note above: each of these carries the
    basis and NOTHING else. A quote whose repricing failed has a basis and no
    `priceSummary`, and that is the record the banner has to survive — reading
    `.note` off a null summary is exactly the shape of failure this harness
    exists to catch.
  */
  'modal:quote-basis-demo': () => (
    <QuotePricingBasisBanner quote={{ pricingBasis: 'offline-demo' }} />
  ),

  'modal:quote-basis-heuristic': () => (
    <QuotePricingBasisBanner quote={{ pricingBasis: 'server-heuristic' }} />
  ),

  /** Repricing failed, so there is a basis and no note to show. */
  'modal:quote-basis-no-note': () => (
    <QuotePricingBasisBanner quote={{ pricingBasis: 'estimator', priceSummary: null }} />
  ),

  /** The normal case: the server's own sentence, rendered as written. */
  'modal:quote-basis-estimator': () => (
    <QuotePricingBasisBanner
      quote={{
        pricingBasis: 'estimator',
        priceSummary: {
          note:
            '62% is priced from standard trade rates, not the model’s guesses — but none of it is ' +
            'your own figures yet. The rest is estimated. Save your rates and vendor prices to make this quote yours.',
          confidence: 0.62,
          onYourFigures: 0,
          settingsAreStandard: true,
        },
      }}
    />
  ),

  /** A quote saved before the basis existed says nothing rather than guessing. */
  'modal:quote-basis-legacy': () => <QuotePricingBasisBanner quote={{}} />,
};
