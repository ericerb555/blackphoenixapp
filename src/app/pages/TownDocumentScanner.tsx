/**
 * Standalone document scanner for anything going to a town.
 *
 * Variances, permit applications, deeds, surveys, certificates of occupancy —
 * the scanner holds no knowledge of what the document says, so it works for all
 * of them rather than being tied to one form.
 */
import DocumentScanner from '../components/DocumentScanner';
import DesignWorkspaceNav from '../components/DesignWorkspaceNav';

export default function TownDocumentScanner() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Town document scanner</h1>
          <p className="text-sm text-gray-400 mt-1">
            Photograph any document that has to be filed on paper, and get back a PDF at true page
            size. Nothing leaves this browser.
          </p>
        </div>
        <DesignWorkspaceNav current="scanner" />
        <DocumentScanner title="Scan a document" />
      </div>
    </div>
  );
}
