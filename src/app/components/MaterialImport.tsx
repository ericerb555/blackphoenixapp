import { useState } from 'react';
import {
  Upload, Download, FileText, CheckCircle2, AlertCircle, X,
  Table, FileSpreadsheet, Database, Zap, Brain, TrendingUp,
  RefreshCw, Eye, ArrowRight, Check, AlertTriangle
} from 'lucide-react';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

interface MaterialImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (count: number) => void;
}

interface ImportRow {
  row: number;
  sku: string;
  name: string;
  category: string;
  cost: string;
  unit: string;
  status: 'valid' | 'warning' | 'error';
  issues?: string[];
}

export default function MaterialImport({ isOpen, onClose, onImportComplete }: MaterialImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'validation' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, success: 0, warnings: 0, errors: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const csvTemplate = `SKU,Name,Description,Category,Subcategory,Manufacturer,Brand,Model,Unit Cost,MSRP,Unit,Minimum Order,Stock Level,Reorder Point,Supplier Name,Supplier Part Number,Supplier Cost,Lead Time Days,Tags
HVAC-REF-R410A-001,R-410A Refrigerant,EPA-approved R-410A refrigerant,HVAC,Refrigerants,Honeywell,Genetron,AZ-20,85.00,149.99,lbs,1,150,50,HVAC Supply Co,HSC-R410A-25,85.00,2,"refrigerant,HVAC,EPA"
HVAC-FIL-MER11-001,Air Filter - MERV 11,High-efficiency pleated filter,HVAC,Filters,Filtrete,3M,MPR 1000,18.00,29.99,ea,2,500,100,FilterBuy,FB-3M-2025-M11,18.00,1,"filter,HVAC,MERV11"`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      // Simulate file processing
      setIsProcessing(true);
      setTimeout(() => {
        const mockPreview: ImportRow[] = [
          { row: 1, sku: 'HVAC-REF-R410A-001', name: 'R-410A Refrigerant', category: 'HVAC', cost: '85.00', unit: 'lbs', status: 'valid' },
          { row: 2, sku: 'HVAC-FIL-MER11-001', name: 'Air Filter - MERV 11', category: 'HVAC', cost: '18.00', unit: 'ea', status: 'valid' },
          { row: 3, sku: 'PLB-PIP-PVC-001', name: 'PVC Pipe Schedule 40', category: 'Plumbing', cost: '12.50', unit: 'ea', status: 'valid' },
          { row: 4, sku: 'ELC-WIR-ROM-001', name: 'Romex Wire 12/2', category: 'Electrical', cost: '89.00', unit: 'roll', status: 'valid' },
          { row: 5, sku: '', name: 'Unnamed Item', category: 'HVAC', cost: '15.00', unit: 'ea', status: 'error', issues: ['SKU is required'] },
          { row: 6, sku: 'HVAC-CAP-DR-001', name: 'Dual Run Capacitor', category: 'HVAC', cost: 'invalid', unit: 'ea', status: 'warning', issues: ['Cost format invalid, will use 0.00'] }
        ];
        setPreviewData(mockPreview);
        setImportStats({
          total: 6,
          success: 4,
          warnings: 1,
          errors: 1
        });
        setIsProcessing(false);
        setStep('validation');
      }, 2000);
    }
  };

  const handleImport = () => {
    setStep('importing');
    setIsProcessing(true);
    
    // Simulate import process
    setTimeout(() => {
      setIsProcessing(false);
      setStep('complete');
      onImportComplete?.(importStats.success);
    }, 3000);
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPreviewData([]);
    setImportStats({ total: 0, success: 0, warnings: 0, errors: 0 });
    setIsProcessing(false);
  };

  // Material Import Preview Table Columns
  const importColumns: DataTableColumn<ImportRow>[] = [
    {
      key: 'row',
      header: 'Row',
      render: (row) => (
        <span className="text-sm text-gray-400">{row.row}</span>
      )
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (row) => (
        <span className="text-sm font-mono text-white">
          {row.sku || <span className="text-red-400">Missing</span>}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <span className="text-sm text-gray-300">{row.name}</span>
      )
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="text-sm text-gray-300">{row.category}</span>
      )
    },
    {
      key: 'cost',
      header: 'Cost',
      render: (row) => (
        <span className="text-sm font-semibold text-white">${row.cost}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div>
          {row.status === 'valid' && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Valid</span>
            </div>
          )}
          {row.status === 'warning' && (
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Warning</span>
            </div>
          )}
          {row.status === 'error' && (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Error</span>
            </div>
          )}
          {row.issues && (
            <p className="text-xs text-gray-500 mt-1">{row.issues.join(', ')}</p>
          )}
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[#2A2A2A]">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-gradient-to-r from-orange-600 to-orange-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Import Materials</h2>
                <p className="text-sm text-orange-100">Bulk upload materials from CSV or Excel file</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            {[
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'validation', label: 'Validate', icon: CheckCircle2 },
              { id: 'importing', label: 'Import', icon: Database }
            ].map((stepItem, index) => {
              const Icon = stepItem.icon;
              const isActive = step === stepItem.id;
              const isPast = ['upload', 'mapping', 'validation', 'importing', 'complete'].indexOf(step) > 
                             ['upload', 'mapping', 'validation', 'importing', 'complete'].indexOf(stepItem.id);
              
              return (
                <div key={stepItem.id} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive ? 'bg-blue-600 text-white shadow-lg' :
                    isPast ? 'bg-green-100 text-green-700' :
                    'bg-white text-slate-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{stepItem.label}</span>
                  </div>
                  {index < 2 && (
                    <ArrowRight className={`w-5 h-5 ${isPast ? 'text-green-600' : 'text-slate-300'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="max-w-3xl mx-auto">
              {/* Download Template */}
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-xl p-6 mb-6 border border-orange-500/30">
                <div className="flex items-start gap-4">
                  <FileSpreadsheet className="w-8 h-8 text-orange-400" />
                  <div className="flex-1">
                    <h3 className="font-bold text-orange-300 mb-2">Download CSV Template</h3>
                    <p className="text-sm text-orange-400/80 mb-4">
                      Use our template to ensure your data is formatted correctly. Required fields: SKU, Name, Category, Unit Cost, Unit.
                    </p>
                    <button
                      onClick={() => {
                        const blob = new Blob([csvTemplate], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'materials_template.csv';
                        a.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-12 text-center hover:border-orange-500/50 hover:bg-orange-500/5 transition-all">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-10 h-10 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {file ? file.name : 'Drop your file here or click to browse'}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Supports CSV, Excel (.xlsx, .xls) files
                  </p>
                  {!file && (
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors">
                      <Upload className="w-5 h-5" />
                      Choose File
                    </div>
                  )}
                </label>
              </div>

              {/* Supported Formats */}
              <div className="mt-6 bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                <h4 className="font-semibold text-white mb-3">Supported Fields</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">SKU <span className="text-red-600">*</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Name <span className="text-red-600">*</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Category <span className="text-red-600">*</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Unit Cost <span className="text-red-600">*</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Description</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Manufacturer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Supplier Info</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700">Stock Levels</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  <span className="text-red-600">*</span> Required fields
                </p>
              </div>

              {isProcessing && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-xl">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-blue-900 font-medium">Processing file...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'validation' && (
            <div>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <p className="text-sm text-blue-400 mb-1">Total Rows</p>
                  <p className="text-2xl font-bold text-blue-300">{importStats.total}</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <p className="text-sm text-green-400 mb-1">Valid</p>
                  <p className="text-2xl font-bold text-green-300">{importStats.success}</p>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                  <p className="text-sm text-yellow-400 mb-1">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-300">{importStats.warnings}</p>
                </div>
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                  <p className="text-sm text-red-400 mb-1">Errors</p>
                  <p className="text-2xl font-bold text-red-300">{importStats.errors}</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
                <div className="px-4 py-3 bg-[#0A0A0A] border-b border-[#2A2A2A] flex items-center justify-between">
                  <h3 className="font-semibold text-white">Data Preview</h3>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm text-gray-300">
                    <Eye className="w-4 h-4" />
                    View All
                  </button>
                </div>
                <DataTable
                  columns={importColumns}
                  data={previewData}
                  emptyMessage="No preview data available"
                  rowHoverEffect={true}
                  containerClassName="bg-[#1A1A1A] border-none"
                  getRowClassName={(row) => 
                    row.status === 'error' ? 'bg-red-500/10' :
                    row.status === 'warning' ? 'bg-yellow-500/10' :
                    ''
                  }
                />
              </div>

              {importStats.errors > 0 && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-300">Errors must be fixed before importing</p>
                      <p className="text-sm text-red-400 mt-1">
                        Please correct the errors in your file and re-upload, or remove the error rows to continue.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-10 h-10 text-orange-400 animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Importing Materials...</h3>
              <p className="text-gray-400 mb-6">Please wait while we add materials to your database</p>
              
              <div className="bg-[#0A0A0A] rounded-xl p-6 border border-[#2A2A2A]">
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Validating data...</span>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Creating material records...</span>
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                  <div className="flex items-center justify-between opacity-50">
                    <span>Updating inventory...</span>
                    <div className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between opacity-50">
                    <span>Indexing for search...</span>
                    <div className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Import Complete!</h3>
              <p className="text-gray-400 mb-6">
                Successfully imported {importStats.success} materials to your database
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <p className="text-sm text-green-400 mb-1">Imported</p>
                  <p className="text-3xl font-bold text-green-300">{importStats.success}</p>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                  <p className="text-sm text-yellow-400 mb-1">Warnings</p>
                  <p className="text-3xl font-bold text-yellow-300">{importStats.warnings}</p>
                </div>
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                  <p className="text-sm text-red-400 mb-1">Skipped</p>
                  <p className="text-3xl font-bold text-red-300">{importStats.errors}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 border border-[#2A2A2A] rounded-xl text-gray-300 hover:bg-[#1A1A1A] transition-colors"
                >
                  Import More
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
                >
                  View Materials
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'validation') && (
          <div className="p-6 border-t border-[#2A2A2A] bg-[#0A0A0A] flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-300 hover:bg-gray-500/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-[#2A2A2A] rounded-lg text-gray-300 hover:bg-[#1A1A1A] transition-colors"
              >
                Upload Different File
              </button>
              <button
                onClick={handleImport}
                disabled={importStats.errors > 0}
                className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4" />
                Import {importStats.success} Materials
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
