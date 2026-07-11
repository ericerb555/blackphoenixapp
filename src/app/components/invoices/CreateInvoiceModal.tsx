import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, Search, User, Calendar, DollarSign } from 'lucide-react';
import { InvoiceService, type InvoiceFormData, type InvoiceLineItem } from '../../lib/services/invoiceService';
import { getCustomers, type Customer } from '../../lib/services/customerService';
import { companyInfo } from '../../lib/config/companyInfo';
import CompanyHeader from '../branding/CompanyHeader';
import { toast } from 'sonner@2.0.3';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId?: string;
  projectId?: string;
  projectData?: any;
  invoice?: any; // pass existing invoice to edit it
}

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  projectId,
  projectData,
  invoice,
}: CreateInvoiceModalProps) {
  const isEditMode = !!invoice;
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(!customerId);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    project_id: projectId || '',
    customer_name: '',
    customer_email: '',
    status: 'draft' as 'draft' | 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled',
    is_draft: true,
    tax_rate: 0,
    discount_amount: 0,
    due_date: '',
    issue_date: new Date().toISOString().split('T')[0],
    notes: '',
    terms: companyInfo.legal.terms,
    internal_notes: '',
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { line_number: 1, description: '', quantity: 1, unit_price: 0, is_taxable: true },
  ]);

  useEffect(() => {
    if (isOpen && !customerId) {
      loadCustomers();
    }
    // Pre-fill form from existing invoice when editing
    if (isOpen && invoice) {
      setFormData({
        customer_id: invoice.customer_id || '',
        project_id: invoice.project_id || '',
        customer_name: invoice.customer_name || '',
        customer_email: invoice.customer_email || '',
        status: invoice.status || 'draft',
        is_draft: invoice.is_draft ?? false,
        tax_rate: invoice.tax_rate || 0,
        discount_amount: invoice.discount_amount || 0,
        due_date: invoice.due_date || '',
        issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
        notes: invoice.notes || '',
        terms: invoice.terms || companyInfo.legal.terms,
        internal_notes: invoice.internal_notes || '',
      });
      if (invoice.line_items && invoice.line_items.length > 0) {
        setLineItems(invoice.line_items);
      }
      setShowCustomerSearch(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (customerId && isOpen) {
      loadCustomerData(customerId);
    }
  }, [customerId, isOpen]);

  // Pre-fill form with project data if provided
  useEffect(() => {
    if (projectData && isOpen) {
      setFormData(prev => ({
        ...prev,
        project_id: projectData.id || prev.project_id,
        customer_name: projectData.customerName || prev.customer_name,
        customer_email: projectData.customerEmail || prev.customer_email,
        notes: projectData.title ? `Project: ${projectData.title}\n\n${projectData.description || ''}` : prev.notes,
      }));
      
      // Pre-fill a line item with the project amount if available
      if (projectData.amount) {
        setLineItems([
          {
            line_number: 1,
            description: projectData.title || 'Project Work',
            quantity: 1,
            unit_price: projectData.amount,
            is_taxable: true,
          },
        ]);
      }
      
      toast.info(`Pre-filled with project data: ${projectData.itemNumber || 'Project'}`);
    }
  }, [projectData, isOpen]);

  const loadCustomers = async () => {
    try {
      const customerData = await getCustomers();
      setCustomers(customerData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadCustomerData = async (id: string) => {
    try {
      const customerData = await getCustomers();
      const customer = customerData.find(c => c.id === id);
      if (customer) {
        setSelectedCustomer(customer);
        setFormData(prev => ({
          ...prev,
          customer_id: customer.id,
          customer_name: `${customer.first_name} ${customer.last_name}`,
          customer_email: customer.email,
        }));
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      customer_email: customer.email,
    });
    setShowCustomerSearch(false);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        line_number: lineItems.length + 1,
        description: '',
        quantity: 1,
        unit_price: 0,
        is_taxable: true,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * (formData.tax_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - formData.discount_amount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Only require customer for non-draft invoices
    if (!formData.customer_id && formData.status !== 'draft') {
      toast.error('Please select a customer or save as draft');
      return;
    }

    if (lineItems.some(item => !item.description.trim())) {
      toast.error('Please fill in all line item descriptions');
      return;
    }

    // Auto-set to draft if no customer selected
    const isDraft = !formData.customer_id;
    const finalStatus = isDraft ? 'draft' : formData.status;

    setLoading(true);
    try {
      const invoiceData: InvoiceFormData = {
        ...formData,
        status: finalStatus,
        is_draft: isDraft,
        line_items: lineItems,
      };

      let error: any;
      if (isEditMode && invoice?.id) {
        ({ error } = await InvoiceService.updateInvoice(invoice.id, invoiceData));
      } else {
        ({ error } = await InvoiceService.createInvoice(invoiceData));
      }

      if (error) throw error;

      if (isEditMode) {
        toast.success('Invoice updated successfully!');
      } else if (isDraft) {
        toast.success('Draft invoice saved! You can assign a customer later.');
      } else {
        toast.success('Invoice created successfully!');
      }
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      customer_id: '',
      project_id: '',
      customer_name: '',
      customer_email: '',
      status: 'draft',
      is_draft: true,
      tax_rate: 0,
      discount_amount: 0,
      due_date: '',
      issue_date: new Date().toISOString().split('T')[0],
      notes: '',
      terms: 'Payment due within 30 days',
      internal_notes: '',
    });
    setLineItems([
      { line_number: 1, description: '', quantity: 1, unit_price: 0, is_taxable: true },
    ]);
    setSelectedCustomer(null);
    setShowCustomerSearch(false);
    onClose();
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      searchQuery === '' ||
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{isEditMode ? 'Edit Invoice' : 'Create Invoice'}</h2>
              <p className="text-sm text-orange-100">Add line items and customer details</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company Branding Header */}
          <CompanyHeader variant="invoice" showFullDetails={true} />

          {/* Customer Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-400" />
              Customer
            </h3>

            {selectedCustomer ? (
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center text-white font-semibold">
                    {selectedCustomer.first_name.charAt(0)}{selectedCustomer.last_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                    <p className="text-sm text-gray-400">{selectedCustomer.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setShowCustomerSearch(true);
                    setFormData({ ...formData, customer_id: '', customer_name: '', customer_email: '' });
                  }}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg text-sm font-semibold transition"
                >
                  Change
                </button>
              </div>
            ) : showCustomerSearch ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search customers by name, email, or company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerSearch(false);
                      setFormData({ ...formData, is_draft: true, status: 'draft' });
                    }}
                    className="ml-3 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-xl text-sm font-semibold transition"
                  >
                    Skip (Save as Draft)
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleCustomerSelect(customer)}
                        className="w-full flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition text-left"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                          {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-sm text-gray-400">{customer.email}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No customers found</p>
                      <p className="text-sm mt-1">Try a different search or save as draft</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomerSearch(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-[#2A2A2A] rounded-xl text-gray-400 hover:border-orange-500/30 hover:text-orange-400 transition flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                <span>Select Customer (Optional - can save as draft)</span>
              </button>
            )}
          </div>

          {/* Invoice Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-400" />
              Invoice Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_draft"
                  checked={formData.is_draft}
                  onChange={(e) => setFormData({ ...formData, is_draft: e.target.checked })}
                  className="w-5 h-5 rounded bg-[#0A0A0A] border border-[#2A2A2A] text-orange-600 focus:ring-2 focus:ring-orange-500/50"
                />
                <label htmlFor="is_draft" className="text-sm font-medium text-gray-300">
                  Save as Draft
                </label>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-400" />
                Line Items
              </h3>
              <button
                type="button"
                onClick={addLineItem}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Description <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="Service or product name"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Amount</label>
                      <div className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-orange-400 font-semibold text-sm">
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="w-full px-2 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-semibold">${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-gray-400">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <span className="ml-auto text-white font-semibold">${calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-gray-400">Discount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <span className="ml-auto text-white font-semibold">-${formData.discount_amount.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
                <span className="text-lg font-semibold text-white">Total</span>
                <span className="text-2xl font-bold text-orange-400">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Customer Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                placeholder="Notes visible to customer..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Internal Notes</label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                placeholder="Private notes for your team..."
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms</label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
              placeholder="Payment terms and conditions..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-[#2A2A2A]">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}