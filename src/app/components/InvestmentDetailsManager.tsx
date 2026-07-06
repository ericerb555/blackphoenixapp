import { useState, useEffect } from 'react';
import {
  FileText, DollarSign, TrendingUp, Home, Users, Calendar,
  Plus, Edit, Save, X, Download, Eye, Lock, Unlock, Building2,
  Target, Percent, CheckCircle, AlertCircle, ArrowRight, Trash2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';
import { SecondaryButton } from './ui/button/SecondaryButton';

interface InvestmentDetails {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  createdDate: string;
  lastUpdated: string;

  // Financial Details
  totalProjectCost: number;
  acquisitionCost: number;
  renovationCost: number;
  holdingCosts: number;
  closingCosts: number;

  // Revenue Tracking
  monthlyRent?: number;
  occupancyRate?: number;
  annualRevenue: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  payoutFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'project_completion';

  // Property Particulars
  propertyType: string;
  address: string;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;

  // Sold/Rented Details
  status: 'under_construction' | 'rented' | 'sold' | 'available';
  rentedUnits?: Array<{
    unit: string;
    tenant: string;
    monthlyRent: number;
    leaseStart: string;
    leaseEnd: string;
  }>;
  soldUnits?: Array<{
    unit: string;
    buyer: string;
    salePrice: number;
    saleDate: string;
    profit: number;
  }>;

  // Distribution History
  distributions: Array<{
    date: string;
    amount: number;
    type: 'rental_income' | 'sale_proceeds' | 'capital_return';
    perShareAmount: number;
  }>;

  // Investor Access Control
  approvedInvestors: string[]; // Email addresses of approved investors

  // Documents
  documents: Array<{
    name: string;
    type: string;
    uploadDate: string;
    url: string;
  }>;

  // Notes
  ownerNotes: string;
  investorNotes: string;
}

export default function InvestmentDetailsManager() {
  const [investmentDetails, setInvestmentDetails] = useState<InvestmentDetails[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<InvestmentDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<InvestmentDetails | null>(null);
  const [showInvestorAccess, setShowInvestorAccess] = useState(false);
  const [newInvestorEmail, setNewInvestorEmail] = useState('');

  // Load investment details from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('investmentDetails');
    if (stored) {
      try {
        setInvestmentDetails(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading investment details:', e);
      }
    }
  }, []);

  // Save to localStorage whenever details change
  const saveToStorage = (details: InvestmentDetails[]) => {
    localStorage.setItem('investmentDetails', JSON.stringify(details));
    setInvestmentDetails(details);
  };

  const handleEdit = (detail: InvestmentDetails) => {
    setEditForm({ ...detail });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editForm) return;

    const updated = investmentDetails.map(d =>
      d.id === editForm.id ? { ...editForm, lastUpdated: new Date().toISOString() } : d
    );
    saveToStorage(updated);
    setSelectedDetail(editForm);
    setIsEditing(false);
    toast.success('Investment details updated successfully!');
  };

  const handleCancel = () => {
    setEditForm(null);
    setIsEditing(false);
  };

  const updateField = (field: string, value: any) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  const addDistribution = () => {
    if (!editForm) return;
    const newDistribution = {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      type: 'rental_income' as const,
      perShareAmount: 0
    };
    updateField('distributions', [...(editForm.distributions || []), newDistribution]);
  };

  const removeDistribution = (index: number) => {
    if (!editForm) return;
    const updated = editForm.distributions.filter((_, i) => i !== index);
    updateField('distributions', updated);
  };

  const updateDistribution = (index: number, field: string, value: any) => {
    if (!editForm) return;
    const updated = editForm.distributions.map((dist, i) =>
      i === index ? { ...dist, [field]: value } : dist
    );
    updateField('distributions', updated);
  };

  const addRentedUnit = () => {
    if (!editForm) return;
    const newUnit = {
      unit: '',
      tenant: '',
      monthlyRent: 0,
      leaseStart: '',
      leaseEnd: ''
    };
    updateField('rentedUnits', [...(editForm.rentedUnits || []), newUnit]);
  };

  const removeRentedUnit = (index: number) => {
    if (!editForm) return;
    const updated = (editForm.rentedUnits || []).filter((_, i) => i !== index);
    updateField('rentedUnits', updated);
  };

  const updateRentedUnit = (index: number, field: string, value: any) => {
    if (!editForm) return;
    const updated = (editForm.rentedUnits || []).map((unit, i) =>
      i === index ? { ...unit, [field]: value } : unit
    );
    updateField('rentedUnits', updated);
  };

  const addSoldUnit = () => {
    if (!editForm) return;
    const newUnit = {
      unit: '',
      buyer: '',
      salePrice: 0,
      saleDate: '',
      profit: 0
    };
    updateField('soldUnits', [...(editForm.soldUnits || []), newUnit]);
  };

  const removeSoldUnit = (index: number) => {
    if (!editForm) return;
    const updated = (editForm.soldUnits || []).filter((_, i) => i !== index);
    updateField('soldUnits', updated);
  };

  const updateSoldUnit = (index: number, field: string, value: any) => {
    if (!editForm) return;
    const updated = (editForm.soldUnits || []).map((unit, i) =>
      i === index ? { ...unit, [field]: value } : unit
    );
    updateField('soldUnits', updated);
  };

  const addApprovedInvestor = () => {
    if (!editForm || !newInvestorEmail.trim()) return;
    if (!editForm.approvedInvestors.includes(newInvestorEmail.toLowerCase())) {
      updateField('approvedInvestors', [...editForm.approvedInvestors, newInvestorEmail.toLowerCase()]);
      setNewInvestorEmail('');
      toast.success('Investor access granted');
    }
  };

  const removeApprovedInvestor = (email: string) => {
    if (!editForm) return;
    updateField('approvedInvestors', editForm.approvedInvestors.filter(e => e !== email));
    toast.success('Investor access revoked');
  };

  const data = isEditing && editForm ? editForm : selectedDetail;

  if (!selectedDetail && !isEditing) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Investment Details Manager</h3>
          <p className="text-gray-400 mb-6">
            Select an investment opportunity to view or edit detailed financial documents
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investmentDetails.map(detail => (
              <button
                key={detail.id}
                onClick={() => setSelectedDetail(detail)}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 hover:border-orange-500/50 transition-all text-left"
              >
                <h4 className="text-white font-bold mb-2">{detail.opportunityTitle}</h4>
                <p className="text-sm text-gray-400 mb-2">{detail.propertyType} • {detail.address}</p>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    detail.status === 'rented' ? 'bg-green-500/20 text-green-400' :
                    detail.status === 'sold' ? 'bg-blue-500/20 text-blue-400' :
                    detail.status === 'available' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {detail.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{detail.approvedInvestors.length} investors</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedDetail(null);
              setIsEditing(false);
              setEditForm(null);
            }}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
          >
            <ArrowRight className="w-5 h-5 text-gray-400 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">{data?.opportunityTitle}</h2>
            <p className="text-sm text-gray-400">Investment Details & Financials</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <SecondaryButton onClick={handleCancel} className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleSave} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </PrimaryButton>
            </>
          ) : (
            <>
              <SecondaryButton onClick={() => setShowInvestorAccess(!showInvestorAccess)} className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Investor Access ({data?.approvedInvestors.length || 0})
              </SecondaryButton>
              <PrimaryButton onClick={() => handleEdit(data!)} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Details
              </PrimaryButton>
            </>
          )}
        </div>
      </div>

      {/* Investor Access Panel */}
      {showInvestorAccess && data && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            Approved Investor Access
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Only these investors can view the detailed financial information for this opportunity
          </p>

          {isEditing && (
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={newInvestorEmail}
                onChange={(e) => setNewInvestorEmail(e.target.value)}
                placeholder="investor@email.com"
                className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
              />
              <PrimaryButton onClick={addApprovedInvestor} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Investor
              </PrimaryButton>
            </div>
          )}

          <div className="space-y-2">
            {data.approvedInvestors.map((email, index) => (
              <div key={index} className="flex items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white">{email}</span>
                </div>
                {isEditing && (
                  <button
                    onClick={() => removeApprovedInvestor(email)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {data.approvedInvestors.length === 0 && (
              <p className="text-center text-gray-500 py-4">No approved investors yet</p>
            )}
          </div>
        </div>
      )}

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-2">Total Project Cost</p>
          {isEditing ? (
            <input
              type="number"
              value={data?.totalProjectCost || ''}
              onChange={(e) => updateField('totalProjectCost', parseInt(e.target.value) || 0)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-2xl font-bold text-white focus:outline-none focus:border-orange-500/50"
            />
          ) : (
            <p className="text-3xl font-bold text-white">${((data?.totalProjectCost || 0) / 1000000).toFixed(2)}M</p>
          )}
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-2">Annual Revenue</p>
          {isEditing ? (
            <input
              type="number"
              value={data?.annualRevenue || ''}
              onChange={(e) => updateField('annualRevenue', parseInt(e.target.value) || 0)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-2xl font-bold text-white focus:outline-none focus:border-orange-500/50"
            />
          ) : (
            <p className="text-3xl font-bold text-green-400">${((data?.annualRevenue || 0) / 1000).toLocaleString()}K</p>
          )}
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-2">Net Operating Income</p>
          {isEditing ? (
            <input
              type="number"
              value={data?.netOperatingIncome || ''}
              onChange={(e) => updateField('netOperatingIncome', parseInt(e.target.value) || 0)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-2xl font-bold text-white focus:outline-none focus:border-orange-500/50"
            />
          ) : (
            <p className="text-3xl font-bold text-blue-400">${((data?.netOperatingIncome || 0) / 1000).toLocaleString()}K</p>
          )}
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-2">Payout Frequency</p>
          {isEditing ? (
            <select
              value={data?.payoutFrequency || 'quarterly'}
              onChange={(e) => updateField('payoutFrequency', e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="project_completion">At Completion</option>
            </select>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="w-8 h-8 text-purple-400" />
              <p className="text-lg font-bold text-purple-400">
                {data?.payoutFrequency === 'monthly' ? 'Monthly' :
                 data?.payoutFrequency === 'quarterly' ? 'Quarterly' :
                 data?.payoutFrequency === 'yearly' ? 'Yearly' :
                 data?.payoutFrequency === 'project_completion' ? 'At Completion' :
                 'Quarterly'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Cost Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-2">Acquisition Cost</label>
            {isEditing ? (
              <input
                type="number"
                value={data?.acquisitionCost || ''}
                onChange={(e) => updateField('acquisitionCost', parseInt(e.target.value) || 0)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-lg font-bold text-white">${((data?.acquisitionCost || 0) / 1000).toLocaleString()}K</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Renovation Cost</label>
            {isEditing ? (
              <input
                type="number"
                value={data?.renovationCost || ''}
                onChange={(e) => updateField('renovationCost', parseInt(e.target.value) || 0)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-lg font-bold text-white">${((data?.renovationCost || 0) / 1000).toLocaleString()}K</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Holding Costs</label>
            {isEditing ? (
              <input
                type="number"
                value={data?.holdingCosts || ''}
                onChange={(e) => updateField('holdingCosts', parseInt(e.target.value) || 0)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-lg font-bold text-white">${((data?.holdingCosts || 0) / 1000).toLocaleString()}K</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Closing Costs</label>
            {isEditing ? (
              <input
                type="number"
                value={data?.closingCosts || ''}
                onChange={(e) => updateField('closingCosts', parseInt(e.target.value) || 0)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-lg font-bold text-white">${((data?.closingCosts || 0) / 1000).toLocaleString()}K</p>
            )}
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-orange-400" />
          Property Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-2">Property Type</label>
            {isEditing ? (
              <select
                value={data?.propertyType || ''}
                onChange={(e) => updateField('propertyType', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              >
                <option value="Single Family">Single Family</option>
                <option value="Multi-Family">Multi-Family</option>
                <option value="Commercial">Commercial</option>
                <option value="Mixed-Use">Mixed-Use</option>
                <option value="Land">Land</option>
              </select>
            ) : (
              <p className="text-white font-semibold">{data?.propertyType}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-2">Address</label>
            {isEditing ? (
              <input
                type="text"
                value={data?.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-white font-semibold">{data?.address}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Square Feet</label>
            {isEditing ? (
              <input
                type="number"
                value={data?.sqft || ''}
                onChange={(e) => updateField('sqft', parseInt(e.target.value) || 0)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-white font-semibold">{data?.sqft?.toLocaleString() || 'N/A'} sqft</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Bedrooms</label>
            {isEditing ? (
              <input
                type="number"
                value={data?.bedrooms || ''}
                onChange={(e) => updateField('bedrooms', parseInt(e.target.value) || 0)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-white font-semibold">{data?.bedrooms || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Bathrooms</label>
            {isEditing ? (
              <input
                type="number"
                step="0.5"
                value={data?.bathrooms || ''}
                onChange={(e) => updateField('bathrooms', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-white font-semibold">{data?.bathrooms || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Year Built</label>
            {isEditing ? (
              <input
                type="number"
                value={data?.yearBuilt || ''}
                onChange={(e) => updateField('yearBuilt', parseInt(e.target.value) || 0)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            ) : (
              <p className="text-white font-semibold">{data?.yearBuilt || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Status</label>
            {isEditing ? (
              <select
                value={data?.status || ''}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500/50"
              >
                <option value="under_construction">Under Construction</option>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="sold">Sold</option>
              </select>
            ) : (
              <p className="text-white font-semibold">{data?.status.replace('_', ' ').toUpperCase()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Rented Units */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Home className="w-5 h-5 text-green-400" />
            Rented Units
          </h3>
          {isEditing && (
            <PrimaryButton onClick={addRentedUnit} className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Add Unit
            </PrimaryButton>
          )}
        </div>

        {(data?.rentedUnits && data.rentedUnits.length > 0) ? (
          <div className="space-y-3">
            {data.rentedUnits.map((unit, index) => (
              <div key={index} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Unit</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={unit.unit}
                        onChange={(e) => updateRentedUnit(index, 'unit', e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-white font-semibold text-sm">{unit.unit}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tenant</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={unit.tenant}
                        onChange={(e) => updateRentedUnit(index, 'tenant', e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-white font-semibold text-sm">{unit.tenant}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Monthly Rent</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={unit.monthlyRent || ''}
                        onChange={(e) => updateRentedUnit(index, 'monthlyRent', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-green-400 font-semibold text-sm">${unit.monthlyRent.toLocaleString()}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Lease Period</label>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <input
                          type="date"
                          value={unit.leaseStart}
                          onChange={(e) => updateRentedUnit(index, 'leaseStart', e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-1 py-1 text-white text-xs focus:outline-none focus:border-orange-500/50"
                        />
                      </div>
                    ) : (
                      <p className="text-white text-sm">{unit.leaseStart}</p>
                    )}
                  </div>

                  <div className="flex items-end gap-2">
                    {isEditing ? (
                      <input
                        type="date"
                        value={unit.leaseEnd}
                        onChange={(e) => updateRentedUnit(index, 'leaseEnd', e.target.value)}
                        className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded px-1 py-1 text-white text-xs focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-white text-sm flex-1">{unit.leaseEnd}</p>
                    )}
                    {isEditing && (
                      <button
                        onClick={() => removeRentedUnit(index)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-6">No rented units</p>
        )}
      </div>

      {/* Sold Units */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Sold Units
          </h3>
          {isEditing && (
            <PrimaryButton onClick={addSoldUnit} className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Add Sale
            </PrimaryButton>
          )}
        </div>

        {(data?.soldUnits && data.soldUnits.length > 0) ? (
          <div className="space-y-3">
            {data.soldUnits.map((unit, index) => (
              <div key={index} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Unit</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={unit.unit}
                        onChange={(e) => updateSoldUnit(index, 'unit', e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-white font-semibold text-sm">{unit.unit}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Buyer</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={unit.buyer}
                        onChange={(e) => updateSoldUnit(index, 'buyer', e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-white font-semibold text-sm">{unit.buyer}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sale Price</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={unit.salePrice || ''}
                        onChange={(e) => updateSoldUnit(index, 'salePrice', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-blue-400 font-semibold text-sm">${(unit.salePrice / 1000).toLocaleString()}K</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sale Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={unit.saleDate}
                        onChange={(e) => updateSoldUnit(index, 'saleDate', e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-white text-sm">{unit.saleDate}</p>
                    )}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Profit</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={unit.profit || ''}
                          onChange={(e) => updateSoldUnit(index, 'profit', parseInt(e.target.value) || 0)}
                          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                        />
                      ) : (
                        <p className="text-green-400 font-semibold text-sm">${(unit.profit / 1000).toLocaleString()}K</p>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => removeSoldUnit(index)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-6">No sold units</p>
        )}
      </div>

      {/* Distribution History */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            Distribution History
          </h3>
          {isEditing && (
            <PrimaryButton onClick={addDistribution} className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Add Distribution
            </PrimaryButton>
          )}
        </div>

        {(data?.distributions && data.distributions.length > 0) ? (
          <div className="space-y-3">
            {data.distributions.map((dist, index) => (
              <div key={index} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={dist.date}
                        onChange={(e) => updateDistribution(index, 'date', e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-white text-sm">{dist.date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    {isEditing ? (
                      <select
                        value={dist.type}
                        onChange={(e) => updateDistribution(index, 'type', e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      >
                        <option value="rental_income">Rental Income</option>
                        <option value="sale_proceeds">Sale Proceeds</option>
                        <option value="capital_return">Capital Return</option>
                      </select>
                    ) : (
                      <p className="text-white text-sm">{dist.type.replace('_', ' ')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Total Amount</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dist.amount || ''}
                        onChange={(e) => updateDistribution(index, 'amount', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="text-green-400 font-semibold text-sm">${dist.amount.toLocaleString()}</p>
                    )}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Per Share</label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={dist.perShareAmount || ''}
                          onChange={(e) => updateDistribution(index, 'perShareAmount', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                        />
                      ) : (
                        <p className="text-white font-semibold text-sm">${dist.perShareAmount.toFixed(2)}</p>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => removeDistribution(index)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-6">No distributions yet</p>
        )}
      </div>

      {/* Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Owner Notes (Private)</h3>
          {isEditing ? (
            <textarea
              value={data?.ownerNotes || ''}
              onChange={(e) => updateField('ownerNotes', e.target.value)}
              rows={6}
              placeholder="Private notes only visible to owners..."
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 resize-none"
            />
          ) : (
            <p className="text-gray-400 text-sm whitespace-pre-wrap">{data?.ownerNotes || 'No owner notes'}</p>
          )}
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Investor Notes (Visible to Investors)</h3>
          {isEditing ? (
            <textarea
              value={data?.investorNotes || ''}
              onChange={(e) => updateField('investorNotes', e.target.value)}
              rows={6}
              placeholder="Notes visible to approved investors..."
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 resize-none"
            />
          ) : (
            <p className="text-gray-400 text-sm whitespace-pre-wrap">{data?.investorNotes || 'No investor notes'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
