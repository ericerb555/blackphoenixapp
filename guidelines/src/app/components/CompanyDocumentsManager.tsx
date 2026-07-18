import { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, Eye, EyeOff, Calendar, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { BrandingService, CompanyDocument } from '../lib/services/brandingService';
import { toast } from 'sonner';

interface CompanyDocumentsManagerProps {
  onClose?: () => void;
}

export default function CompanyDocumentsManager({ onClose }: CompanyDocumentsManagerProps) {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDoc, setNewDoc] = useState({
    name: '',
    type: 'other' as CompanyDocument['type'],
    description: '',
    isPublic: false,
    expiresAt: '',
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data: profile } = await BrandingService.getBrandingProfile();
      if (profile?.documents) {
        console.log('✅ Loaded documents from branding profile:', profile.documents.length);
        setDocuments(profile.documents);
        // Cache to localStorage for faster future loads
        localStorage.setItem('company_documents', JSON.stringify(profile.documents));
      } else {
        // Try loading from localStorage cache
        const cached = localStorage.getItem('company_documents');
        if (cached) {
          const cachedDocs = JSON.parse(cached);
          console.log('✅ Loaded documents from localStorage cache:', cachedDocs.length);
          setDocuments(cachedDocs);
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      // Try loading from localStorage cache as fallback
      const cached = localStorage.getItem('company_documents');
      if (cached) {
        const cachedDocs = JSON.parse(cached);
        console.log('✅ Loaded documents from localStorage fallback:', cachedDocs.length);
        setDocuments(cachedDocs);
      } else {
        toast.error('Failed to load documents');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);

      // Convert file to base64 for storage in branding profile
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        const document: CompanyDocument = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: newDoc.name || file.name,
          type: newDoc.type,
          fileUrl: base64, // Store as base64 data URL
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          expiresAt: newDoc.expiresAt || undefined,
          description: newDoc.description || undefined,
          isPublic: newDoc.isPublic,
        };

        // Get current branding profile
        const { data: profile } = await BrandingService.getBrandingProfile();
        if (!profile) {
          toast.error('Branding profile not found. Please set up your company branding first.');
          return;
        }

        // Add document to profile
        const updatedProfile = {
          ...profile,
          documents: [...(profile.documents || []), document],
        };

        // Save updated profile
        await BrandingService.updateBrandingProfile(updatedProfile);

        const savedDocs = updatedProfile.documents || [];
        setDocuments(savedDocs);
        // Update localStorage cache
        localStorage.setItem('company_documents', JSON.stringify(savedDocs));
        setShowUploadForm(false);
        setNewDoc({ name: '', type: 'other', description: '', isPublic: false, expiresAt: '' });
        toast.success('Document uploaded successfully');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { data: profile } = await BrandingService.getBrandingProfile();
      if (!profile) return;

      const updatedDocuments = (profile.documents || []).filter(d => d.id !== docId);
      const updatedProfile = {
        ...profile,
        documents: updatedDocuments,
      };

      await BrandingService.updateBrandingProfile(updatedProfile);
      setDocuments(updatedDocuments);
      // Update localStorage cache
      localStorage.setItem('company_documents', JSON.stringify(updatedDocuments));
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleTogglePublic = async (docId: string) => {
    try {
      const { data: profile } = await BrandingService.getBrandingProfile();
      if (!profile) return;

      const updatedDocuments = (profile.documents || []).map(d =>
        d.id === docId ? { ...d, isPublic: !d.isPublic } : d
      );

      const updatedProfile = {
        ...profile,
        documents: updatedDocuments,
      };

      await BrandingService.updateBrandingProfile(updatedProfile);
      setDocuments(updatedDocuments);
      // Update localStorage cache
      localStorage.setItem('company_documents', JSON.stringify(updatedDocuments));
      toast.success('Document visibility updated');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    }
  };

  const downloadDocument = (doc: CompanyDocument) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentTypeLabel = (type: CompanyDocument['type']): string => {
    const labels = {
      license: 'License',
      insurance: 'Insurance',
      certification: 'Certification',
      contract: 'Contract',
      policy: 'Policy',
      other: 'Other',
    };
    return labels[type];
  };

  const getDocumentTypeColor = (type: CompanyDocument['type']): string => {
    const colors = {
      license: 'bg-blue-500/20 text-blue-400',
      insurance: 'bg-green-500/20 text-green-400',
      certification: 'bg-purple-500/20 text-purple-400',
      contract: 'bg-orange-500/20 text-orange-400',
      policy: 'bg-pink-500/20 text-pink-400',
      other: 'bg-gray-500/20 text-gray-400',
    };
    return colors[type];
  };

  const isExpiringSoon = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    const daysUntilExpiry = Math.floor((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#ea580c]" />
                Company Documents
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Manage licenses, insurance, certifications, and other company documents
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Button */}
          {!showUploadForm && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-[#2A2A2A] rounded-lg hover:border-[#ea580c] transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-[#ea580c]"
            >
              <Plus className="w-5 h-5" />
              <span>Upload New Document</span>
            </button>
          )}

          {/* Upload Form */}
          {showUploadForm && (
            <div className="mb-6 p-6 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Upload Document</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={newDoc.name}
                    onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                    placeholder="e.g., General Liability Insurance"
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Document Type
                    </label>
                    <select
                      value={newDoc.type}
                      onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value as CompanyDocument['type'] })}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white"
                    >
                      <option value="license">License</option>
                      <option value="insurance">Insurance</option>
                      <option value="certification">Certification</option>
                      <option value="contract">Contract</option>
                      <option value="policy">Policy</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Expires On (Optional)
                    </label>
                    <input
                      type="date"
                      value={newDoc.expiresAt}
                      onChange={(e) => setNewDoc({ ...newDoc, expiresAt: e.target.value })}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newDoc.description}
                    onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                    placeholder="Brief description of this document..."
                    rows={2}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newDoc.isPublic}
                    onChange={(e) => setNewDoc({ ...newDoc, isPublic: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-300">
                    Show on public-facing pages (e.g., website, customer portal)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select File (Max 10MB)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    disabled={uploading}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#ea580c] file:text-white hover:file:bg-[#dc2626]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowUploadForm(false);
                      setNewDoc({ name: '', type: 'other', description: '', isPublic: false, expiresAt: '' });
                    }}
                    className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Documents List */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 hover:border-[#ea580c] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-[#ea580c]" />
                        <h3 className="text-white font-semibold">{doc.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getDocumentTypeColor(doc.type)}`}>
                          {getDocumentTypeLabel(doc.type)}
                        </span>
                        {doc.isPublic && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                            Public
                          </span>
                        )}
                        {isExpired(doc.expiresAt) && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Expired
                          </span>
                        )}
                        {isExpiringSoon(doc.expiresAt) && !isExpired(doc.expiresAt) && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Expires Soon
                          </span>
                        )}
                      </div>

                      {doc.description && (
                        <p className="text-gray-400 text-sm mb-2">{doc.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{doc.fileName}</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        {doc.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expires {new Date(doc.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => downloadDocument(doc)}
                        className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePublic(doc.id)}
                        className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
                        title={doc.isPublic ? 'Make Private' : 'Make Public'}
                      >
                        {doc.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
