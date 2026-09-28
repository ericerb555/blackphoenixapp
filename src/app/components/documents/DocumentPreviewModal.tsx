/**
 * The chrome around a business document: see it, print it, save it, send it.
 *
 * WHY A SHELL RATHER THAN THREE MODALS
 *
 * Quotes, invoices and contracts need the same four things and differ only in
 * what is drawn inside. Three modals would be three sets of buttons to keep in
 * agreement, and the one that drifted would be the one nobody was looking at —
 * which is exactly how this codebase ended up with two `/quotes` routes and
 * three vendor price ladders.
 *
 * So the actions live here once, and the document is `children`.
 *
 * WHY `printElementId` IS A PROP AND NOT A CONSTANT
 *
 * The print rule works by hiding everything on the page and then un-hiding one
 * element and its descendants. That element has to be named, and it is a
 * different element for each document. Hardcoding `#invoice-content` — which is
 * what the invoice modal did — would print a blank page for a quote, silently:
 * the dialog opens, the paper comes out empty, and nothing anywhere reports a
 * fault.
 *
 * WHY THE PRINT RULE IS VISIBILITY AND NOT `display`
 *
 * `visibility: hidden` keeps layout intact for the element being shown, so a
 * document nested inside a modal still measures correctly. Switching the page
 * to `display: none` collapses the ancestors the document is positioned within
 * and the output shifts. Carried over from the invoice modal, where it worked;
 * worth stating so it is not "simplified" later.
 */
import type { ReactNode } from 'react';
import { X, Download, Mail, Printer } from 'lucide-react';

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Shown top-left: "Invoice Preview", "Quote Preview". */
  title: string;
  /**
   * The `id` of the element to print — the document's outer element.
   * Everything else on the page is hidden while printing.
   */
  printElementId: string;
  /** The document itself. */
  children: ReactNode;
  /**
   * Save a PDF. Omitted where a document has no generator yet, and the button
   * is then not shown at all — an action that appears and does nothing is
   * worse than one that is absent.
   */
  onDownload?: () => void;
  /** Send it to the customer. Omitted where sending is not offered. */
  onEmail?: () => void;
  /** Extra buttons for one caller — an Edit affordance, say. */
  actions?: ReactNode;
}

export default function DocumentPreviewModal({
  isOpen, onClose, title, printElementId, children, onDownload, onEmail, actions,
}: DocumentPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between z-10 print:hidden">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <div className="flex items-center gap-2">
            {actions}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            )}
            {onEmail && (
              <button
                onClick={onEmail}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg hover:bg-[#2A2A2A] flex items-center justify-center transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {children}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #${printElementId}, #${printElementId} * { visibility: visible; }
          #${printElementId} { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
