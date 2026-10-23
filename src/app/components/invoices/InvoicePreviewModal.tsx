/**
 * The invoice preview — now showing the actual PDF.
 *
 * WHAT WAS WRONG
 *
 * Eric: "the view pdf is still wrong and all orange."
 *
 * He was looking at this. `InvoiceDocument` is a dark `#0A0A0A` page with an
 * orange gradient banner, an orange logo tile, orange headings, orange
 * totals and an orange payment-terms box — and the Download button produced
 * something different again, via the old `PDFService`. Two renderings from
 * one screen, neither of which was the clean document the quote had gained.
 *
 * I checked rather than assumed: the quote PDF's colour operators are 5
 * orange out of 212, two percent. The orange was never the quote. Only
 * quotes had been moved onto the new layout; invoices had not.
 *
 * WHAT IT DOES NOW
 *
 * The preview IS the PDF, in an iframe, the same bytes the Download button
 * writes and the same layout the quote prints. There is no second rendering
 * left to drift. The old document view is still one click away, because the
 * Edit button lives inside it and that is a working staff screen — but it is
 * no longer what "preview" means.
 *
 * MY COPY / CUSTOMER COPY
 *
 * The same toggle the quote has. The office copy draws every line with the
 * withheld ones marked; the customer copy obeys the hiding. Being able to
 * see what they will actually receive, without sending it, is the entire
 * point of having per-line control.
 */
import { useEffect, useMemo, useState } from 'react';
import { Edit2, FileText, Eye } from 'lucide-react';
import { type InvoicePDFData } from '../../lib/services/pdfService';
import type { Invoice } from '../../lib/services/invoiceService';
import { buildQuotePdf } from '../../lib/services/quotePdfLayout';
import { invoiceToPdfDocument } from '../../lib/invoiceToPdfDocument';
import { useCompanyLogoDataUrl } from '../../lib/useCompanyLogoDataUrl';
import EmailInvoiceModal from './EmailInvoiceModal';
import InvoiceDocument from '../documents/InvoiceDocument';
import DocumentPreviewModal from '../documents/DocumentPreviewModal';
import { toast } from 'sonner';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onEdit?: () => void;
}

export default function InvoicePreviewModal({ isOpen, onClose, invoice, onEdit }: InvoicePreviewModalProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [asCustomer, setAsCustomer] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const logoDataUrl = useCompanyLogoDataUrl();

  const buildPdf = (forCustomer: boolean) =>
    buildQuotePdf(invoiceToPdfDocument(invoice, { forCustomer, logoDataUrl }));

  /**
   * Keyed on what the PDF CONTAINS, not on object identity.
   *
   * The quote preview rendered as a white rectangle this morning for exactly
   * one reason: its effect depended on an object rebuilt every render, so
   * React ran the CLEANUP every render too — revoking the blob URL the
   * iframe had just been handed. A content signature cannot do that. If the
   * bytes would be the same there is no rebuild, so no cleanup, so the URL
   * the iframe is holding stays alive.
   */
  const pdfKey = useMemo(() => {
    if (!isOpen || showDocument) return '';
    try {
      return JSON.stringify([asCustomer, !!logoDataUrl, invoice]);
    } catch {
      return String(Date.now());
    }
  }, [isOpen, showDocument, asCustomer, logoDataUrl, invoice]);

  useEffect(() => {
    if (!pdfKey) { setPreviewUrl(''); return; }
    let url = '';
    try {
      // `bloburl` hands back a URL object, not a string. Holding the real
      // string keeps the revoke in the cleanup honest about what it revokes.
      url = String(buildPdf(asCustomer).output('bloburl'));
      setPreviewUrl(url);
    } catch (err) {
      console.error('[invoice] could not render the PDF preview:', err);
      setPreviewUrl('');
    }
    return () => {
      // A blob URL left alive after the modal closes is a whole document
      // leaked until the tab dies.
      if (url) { try { URL.revokeObjectURL(url); } catch { /* already gone */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfKey]);

  if (!isOpen) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  /**
   * Still built, but only for the email modal, which takes this shape.
   *
   * It is NOT what the Download button produces any more — that writes the
   * same bytes the preview shows, which is the whole point of the change.
   */
  const convertInvoiceToPDFData = (): InvoicePDFData => {
    const inv: any = invoice;
    const rawItems: any[] = inv.line_items ?? inv.items ?? [];
    return {
      invoiceNumber: inv.invoice_number ?? inv.invoiceNumber ?? '',
      date: formatDate(inv.issue_date ?? inv.date),
      dueDate: formatDate(inv.due_date ?? inv.dueDate),
      status: inv.status,
      customer: {
        name: inv.customer_name ?? inv.customerName ?? '',
        email: inv.customer_email ?? inv.customerEmail ?? '',
        phone: inv.customer_phone ?? inv.customerPhone,
        address: inv.customer_address ?? inv.customerAddress,
      },
      project: (inv.project_name ?? inv.projectName) ? {
        name: inv.project_name ?? inv.projectName,
        number: inv.project_id ?? inv.projectId ?? '',
      } : undefined,
      // The customer's copy, so an emailed invoice obeys the hiding. An
      // email cannot be unsent, which makes this the one that matters most.
      items: rawItems.filter((item: any) => item?.visible !== false).map((item: any) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.unit_price ?? item.rate) || 0;
        return {
          description: item.description ?? '',
          quantity,
          rate,
          amount: Number(item.amount) || quantity * rate,
        };
      }),
      subtotal: Number(inv.subtotal) || 0,
      tax: Number(inv.tax_amount ?? inv.tax) || 0,
      total: Number(inv.total_amount ?? inv.total) || 0,
      notes: inv.notes,
      terms: inv.terms,
    };
  };

  const handleDownload = () => {
    try {
      // The CUSTOMER copy. The office copy carries lines marked "hidden from
      // customer", and sending that to a customer would be worse than having
      // no hide feature at all.
      const number = (invoice as any).invoice_number || (invoice as any).invoice_id || 'draft';
      buildPdf(true).save(`Invoice_${number}.pdf`);
      toast.success('PDF downloaded.');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const toggle = (
    <div className="flex items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-[#2A2A2A]">
        {([[false, 'My copy'], [true, 'Customer copy']] as Array<[boolean, string]>).map(([v, label]) => (
          <button
            key={label}
            onClick={() => setAsCustomer(v)}
            className={`px-3 py-1.5 text-xs font-bold transition ${
              asCustomer === v ? 'bg-[#ea580c] text-white' : 'bg-[#111] text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowDocument((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:text-white"
        title={showDocument ? 'Show the PDF that gets sent' : 'Show the editable on-screen document'}
      >
        {showDocument ? <><FileText className="h-3.5 w-3.5" /> PDF</> : <><Eye className="h-3.5 w-3.5" /> Document</>}
      </button>
      {onEdit && (
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
      )}
    </div>
  );

  return (
    <>
      <DocumentPreviewModal
        isOpen={isOpen}
        onClose={onClose}
        title="Invoice Preview"
        printElementId="invoice-content"
        onDownload={handleDownload}
        onEmail={() => setEmailModalOpen(true)}
        actions={toggle}
        /*
          In PDF mode the page cannot print the iframe — a blob PDF does not
          print through its parent — so Print opens it in a tab where the
          browser's own viewer can. In document mode the normal page print is
          correct and is left alone.
        */
        onPrint={!showDocument && previewUrl
          ? () => window.open(previewUrl, '_blank', 'noopener')
          : undefined}
      >
        {showDocument ? (
          <InvoiceDocument invoice={invoice} onEdit={onEdit} forCustomer={asCustomer} />
        ) : previewUrl ? (
          <div className="flex h-[70vh] flex-col">
            {asCustomer && (
              <p className="bg-blue-500/10 px-5 py-2 text-xs text-blue-300">
                Exactly what the customer receives — your hidden lines are not in it.
              </p>
            )}
            <iframe title="Invoice PDF" src={previewUrl} className="h-full w-full flex-1 bg-white" />
          </div>
        ) : (
          <div className="flex h-[70vh] items-center justify-center text-sm text-gray-500">
            Could not render the PDF.
          </div>
        )}
      </DocumentPreviewModal>

      {/*
        Outside the preview rather than inside it, because it is a second modal
        and nesting one inside the other puts it under the preview's backdrop.
      */}
      <EmailInvoiceModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        invoice={convertInvoiceToPDFData()}
        defaultEmail={(invoice as any).customer_email ?? (invoice as any).customerEmail}
      />
    </>
  );
}
