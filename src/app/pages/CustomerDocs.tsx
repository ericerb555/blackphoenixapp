/**
 * Customer Documents - Full Document Management
 * Admin+ can view, edit, print, save, import/export all customer documents
 */

import { useState } from 'react';
import {
  Search, FileText, Download, Eye, User, Calendar, Edit, Trash2,
  Printer, Upload, FileDown, FileUp, Plus, X, Save
} from 'lucide-react';

interface CustomerDocsProps {
  onNavigate?: (page: string) => void;
}

interface Document {
  id: string;
  customerName: string;
  customerId: string;
  docName: string;
  docType: string;
  uploadDate: string;
  fileSize: string;
  category: string;
  content?: string;
  isEditable: boolean;
}

export default function CustomerDocs({ onNavigate }: CustomerDocsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Demo documents with editable content
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      customerName: 'ABC Corporation',
      customerId: 'cust-001',
      docName: 'Service Contract 2026',
      docType: 'PDF',
      uploadDate: '2026-01-15',
      fileSize: '245 KB',
      category: 'Contract',
      content: 'Service Contract Agreement\n\nThis agreement is entered into on January 15, 2026...',
      isEditable: true
    },
    {
      id: '2',
      customerName: 'ABC Corporation',
      customerId: 'cust-001',
      docName: 'Invoice #2026-001',
      docType: 'PDF',
      uploadDate: '2026-02-10',
      fileSize: '128 KB',
      category: 'Invoice',
      content: 'INVOICE\n\nInvoice Number: 2026-001\nDate: February 10, 2026\nAmount Due: $5,250.00',
      isEditable: false
    },
    {
      id: '3',
      customerName: 'XYZ Industries',
      customerId: 'cust-002',
      docName: 'Quote Request',
      docType: 'PDF',
      uploadDate: '2026-03-05',
      fileSize: '89 KB',
      category: 'Quote',
      content: 'Quote Request\n\nProject: Office Renovation\nRequested Date: March 5, 2026',
      isEditable: true
    },
    {
      id: '4',
      customerName: 'Smith Construction',
      customerId: 'cust-003',
      docName: 'Payment Receipt',
      docType: 'PDF',
      uploadDate: '2026-04-12',
      fileSize: '56 KB',
      category: 'Receipt',
      content: 'Payment Receipt\n\nReceived from: Smith Construction\nAmount: $12,500.00',
      isEditable: false
    },
    {
      id: '5',
      customerName: 'Johnson LLC',
      customerId: 'cust-004',
      docName: 'Project Plans',
      docType: 'PDF',
      uploadDate: '2026-04-20',
      fileSize: '1.2 MB',
      category: 'Plans',
      content: 'Project Plans - Building Renovation\n\nScope: Complete interior renovation...',
      isEditable: true
    }
  ]);

  const filteredDocs = documents.filter(doc =>
    doc.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (doc: Document) => {
    setSelectedDoc(doc);
    setEditContent(doc.content || '');
    setIsEditMode(false);
  };

  const handleEdit = (doc: Document) => {
    if (!doc.isEditable) {
      alert('This document is not editable');
      return;
    }
    setSelectedDoc(doc);
    setEditContent(doc.content || '');
    setIsEditMode(true);
  };

  const handleSave = () => {
    if (selectedDoc) {
      setDocuments(documents.map(doc =>
        doc.id === selectedDoc.id ? { ...doc, content: editContent } : doc
      ));
      setIsEditMode(false);
      alert('Document saved successfully!');
    }
  };

  const handlePrint = (doc: Document) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print: ${doc.docName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #333; }
              .meta { color: #666; margin-bottom: 20px; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${doc.docName}</h1>
            <div class="meta">
              <p><strong>Customer:</strong> ${doc.customerName}</p>
              <p><strong>Date:</strong> ${doc.uploadDate}</p>
              <p><strong>Category:</strong> ${doc.category}</p>
            </div>
            <div class="content">${doc.content || ''}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDelete = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter(doc => doc.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      alert('Document deleted successfully!');
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(documents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-documents-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    alert('Documents exported successfully!');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          if (Array.isArray(imported)) {
            setDocuments([...documents, ...imported]);
            alert(`Imported ${imported.length} documents successfully!`);
          }
        } catch (error) {
          alert('Failed to import documents. Invalid file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Documents</h1>
          <p className="text-gray-600">View, edit, print, and manage all customer documents</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, document name, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Upload
            </button>

            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer">
              <FileUp className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Documents List */}
          <div className="col-span-2 bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Document</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedDoc?.id === doc.id ? 'bg-blue-50' : ''}`}
                      onClick={() => handleView(doc)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{doc.customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{doc.docName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {doc.uploadDate}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleView(doc); }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(doc); }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Edit"
                            disabled={!doc.isEditable}
                          >
                            <Edit className={`w-4 h-4 ${doc.isEditable ? 'text-gray-600' : 'text-gray-300'}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrint(doc); }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Print"
                          >
                            <Printer className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results count */}
            <div className="px-6 py-4 bg-gray-50 border-t text-sm text-gray-600">
              Showing {filteredDocs.length} of {documents.length} documents
            </div>
          </div>

          {/* Document Preview/Editor */}
          <div className="bg-white rounded-lg shadow p-6">
            {selectedDoc ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isEditMode ? 'Edit Document' : 'Document Preview'}
                  </h3>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Document Name</p>
                    <p className="font-medium">{selectedDoc.docName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium">{selectedDoc.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium">{selectedDoc.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Upload Date</p>
                    <p className="font-medium">{selectedDoc.uploadDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">File Size</p>
                    <p className="font-medium">{selectedDoc.fileSize}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Content</p>
                  {isEditMode ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={() => setIsEditMode(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {selectedDoc.content || 'No content available'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Select a document to view or edit</p>
              </div>
            )}
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => onNavigate?.('unified-dashboard')}
          className="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Upload Document</h3>
            <p className="text-gray-600 mb-4">Upload functionality would be implemented here with file picker and customer selection.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
