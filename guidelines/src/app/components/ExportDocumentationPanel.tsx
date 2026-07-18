/**
 * Export Documentation Panel
 * 
 * Comprehensive export system for structural design documentation
 */

import { useState } from 'react';
import {
  Download, FileText, Image as ImageIcon, File, Printer,
  Settings, CheckCircle, Zap, Layers, FileCheck, Grid,
  Box, Building, AlertCircle, ChevronDown, X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface StructuralElement {
  id: string;
  type: 'beam' | 'column' | 'wall' | 'foundation' | 'connection';
  properties: Record<string, any>;
}

interface ExportDocumentationPanelProps {
  elements: StructuralElement[];
  projectName: string;
}

type ExportFormat = 'pdf' | 'dwg' | 'png' | 'svg' | 'excel' | 'word';
type DocumentType = 'full-set' | 'calculations' | 'drawings' | 'specifications' | 'bom' | 'schedule';

export function ExportDocumentationPanel({ elements, projectName }: ExportDocumentationPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentType[]>(['full-set']);
  const [includeStamps, setIncludeStamps] = useState(true);
  const [includeRevisions, setIncludeRevisions] = useState(true);
  const [pageSize, setPageSize] = useState<'letter' | 'legal' | 'tabloid' | 'A4' | 'A3'>('letter');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportFormats = [
    { value: 'pdf', label: 'PDF Document', icon: FileText, description: 'Professional PDF with all documentation' },
    { value: 'dwg', label: 'AutoCAD DWG', icon: FileCheck, description: 'CAD file for editing in AutoCAD' },
    { value: 'png', label: 'PNG Images', icon: ImageIcon, description: 'High-resolution raster images' },
    { value: 'svg', label: 'SVG Vector', icon: Layers, description: 'Scalable vector graphics' },
    { value: 'excel', label: 'Excel Spreadsheet', icon: Grid, description: 'Material lists and calculations' },
    { value: 'word', label: 'Word Document', icon: File, description: 'Editable specifications document' }
  ] as const;

  const documentTypes = [
    { value: 'full-set', label: 'Complete Construction Set', description: 'All documents packaged together' },
    { value: 'calculations', label: 'Structural Calculations', description: 'Engineering calculations and analysis' },
    { value: 'drawings', label: 'Construction Drawings', description: 'Detailed structural drawings' },
    { value: 'specifications', label: 'Technical Specifications', description: 'Material and construction specs' },
    { value: 'bom', label: 'Bill of Materials', description: 'Complete materials list with quantities' },
    { value: 'schedule', label: 'Project Schedule', description: 'Construction timeline and milestones' }
  ] as const;

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success('Documentation exported successfully!', {
      description: `${selectedDocuments.length} document(s) exported as ${selectedFormat.toUpperCase()}`
    });
    
    setIsExporting(false);
    setShowExportModal(false);
  };

  const toggleDocumentType = (type: DocumentType) => {
    if (type === 'full-set') {
      setSelectedDocuments(['full-set']);
    } else {
      setSelectedDocuments(prev => {
        const filtered = prev.filter(t => t !== 'full-set');
        if (filtered.includes(type)) {
          return filtered.filter(t => t !== type);
        } else {
          return [...filtered, type];
        }
      });
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-[#ea580c]" />
          <h3 className="text-white font-bold">Export Documentation</h3>
        </div>
        <span className="text-sm text-gray-400">{elements.length} elements</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {exportFormats.slice(0, 4).map(format => {
          const Icon = format.icon;
          return (
            <button
              key={format.value}
              onClick={() => setSelectedFormat(format.value as ExportFormat)}
              className={`p-3 rounded-lg border transition-all ${
                selectedFormat === format.value
                  ? 'bg-[#ea580c]/10 border-[#ea580c] text-white'
                  : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:border-[#ea580c]/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{format.label}</span>
              </div>
              <p className="text-xs opacity-70">{format.description}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={includeStamps}
              onChange={(e) => setIncludeStamps(e.target.checked)}
              className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] checked:bg-[#ea580c]"
            />
            Include Professional Stamps
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={includeRevisions}
              onChange={(e) => setIncludeRevisions(e.target.checked)}
              className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] checked:bg-[#ea580c]"
            />
            Include Revision History
          </label>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Page Size</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
          >
            <option value="letter">Letter (8.5" × 11")</option>
            <option value="legal">Legal (8.5" × 14")</option>
            <option value="tabloid">Tabloid (11" × 17")</option>
            <option value="A4">A4 (210mm × 297mm)</option>
            <option value="A3">A3 (297mm × 420mm)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowExportModal(true)}
          className="flex-1 px-4 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Now
        </button>
        <button
          onClick={() => toast.info('Print preview opening...')}
          className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white transition-colors"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#1A1A1A] z-10">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Export Documentation</h2>
                <p className="text-sm text-gray-400">{projectName}</p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Document Selection */}
              <div>
                <h3 className="text-white font-semibold mb-3">Select Documents to Export</h3>
                <div className="space-y-2">
                  {documentTypes.map(doc => (
                    <label
                      key={doc.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedDocuments.includes(doc.value as DocumentType)
                          ? 'bg-[#ea580c]/10 border-[#ea580c]'
                          : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-[#ea580c]/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.value as DocumentType)}
                        onChange={() => toggleDocumentType(doc.value as DocumentType)}
                        className="w-4 h-4 mt-0.5 rounded border-[#2A2A2A] bg-[#0A0A0A] checked:bg-[#ea580c]"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium mb-1">{doc.label}</div>
                        <div className="text-sm text-gray-400">{doc.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Preview */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Export Summary</h4>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>• Format: {selectedFormat.toUpperCase()}</div>
                      <div>• Documents: {selectedDocuments.length} selected</div>
                      <div>• Page Size: {pageSize.toUpperCase()}</div>
                      <div>• Total Elements: {elements.length}</div>
                      {includeStamps && <div>• Professional stamps included</div>}
                      {includeRevisions && <div>• Revision history included</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#2A2A2A] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || selectedDocuments.length === 0}
                className="px-6 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Documentation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
