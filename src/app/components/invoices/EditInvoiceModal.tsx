/**
 * Edit Invoice Modal Component
 * Complete invoice editing form with validation and Supabase integration
 */

import { useState, useEffect, FormEvent } from 'react';
import { Plus, Trash2, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import InvoiceService, { InvoiceLineItem, InvoiceFormData, ValidationError } from '../../lib/services/invoiceService';
import { TextArea } from '../ui/input/TextArea';
import { FormModal } from '../ui/modal';

interface EditInvoiceModalProps {
  isOpen: boolean;
  invoice: any; // The invoice to edit
  onClose: () => void;
  onInvoiceUpdated: (invoice: any) => void;
}

export default function EditInvoiceModal({ isOpen, invoice, onClose, onInvoiceUpdated }: EditInvoiceModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    contact_id: invoice?.contact_id || null,
    customer_name: invoice?.customer_name || invoice?.customer || '',
    customer_email: invoice?.customer_email || invoice?.customerEmail || '',
    status: invoice?.status || 'draft',
    is_draft: invoice?.is_draft !== undefined ? invoice.is_draft : invoice?.isDraft !== undefined ? invoice.isDraft : true,
    tax_rate: invoice?.tax_rate || 0,
    discount_amount: invoice?.discount_amount || 0,
    due_date: invoice?.due_date || invoice?.dueDate || '',
    issue_date: invoice?.issue_date || invoice?.createdDate || new Date().toISOString().split('T')[0],
    notes: invoice?.notes || '',
    terms: invoice?.terms || '',
    internal_notes: invoice?.internal_notes || '',
    line_items: invoice?.line_items || invoice?.lineItems || []
  });

  // Convert old format line items to new format if needed
  useEffect(() => {
    if (invoice && isOpen) {
      const convertedLineItems = (invoice.line_items || invoice.lineItems || []).map((item: any, index: number) => ({
        id: item.id,
        line_number: index + 1,
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.rate || item.unit_price || 0,
        is_taxable: item.is_taxable !== undefined ? item.is_taxable : true,
        tax_rate: item.tax_rate || 0
      }));
      
      setFormData({
        contact_id: invoice.contact_id || null,
        customer_name: invoice.customer_name || invoice.customer || '',
        customer_email: invoice.customer_email || invoice.customerEmail || '',
        status: invoice.status || 'draft',
        is_draft: invoice.is_draft !== undefined ? invoice.is_draft : invoice.isDraft !== undefined ? invoice.isDraft : true,
        tax_rate: invoice.tax_rate || 0,
        discount_amount: invoice.discount_amount || 0,
        due_date: invoice.due_date || invoice.dueDate || '',
        issue_date: invoice.issue_date || invoice.createdDate || new Date().toISOString().split('T')[0],
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        internal_notes: invoice.internal_notes || '',
        line_items: convertedLineItems
      });
    }
  }, [invoice, isOpen]);

  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      line_number: formData.line_items.length + 1,
      description: '',
      quantity: 1,
      unit_price: 0,
      is_taxable: true,
      tax_rate: 0
    };
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, newItem]
    }));
  };

  const handleRemoveLineItem = (index: number) => {
    if (formData.line_items.length > 1) {
      setFormData(prev => ({
        ...prev,
        line_items: prev.line_items.filter((_, i) => i !== index)
      }));
    }
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
    
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(e => !e.field.startsWith(`line_items.${index}`)));
  };

  const calculateSubtotal = () => {
    return formData.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (formData.tax_rate! / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - (formData.discount_amount || 0);
  };

  const handleSaveInvoice = async (e: FormEvent) => {
    try {
      setIsSaving(true);
      setValidationErrors([]);

      // Validate before saving
      const validation = InvoiceService.validateInvoice(formData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast.error('Please fix the errors before saving');
        return;
      }

      // Update in Supabase
      const { data, error } = await InvoiceService.updateInvoice(invoice.id, formData);

      if (error) {
        throw error;
      }

      if (data) {
        toast.success('Invoice updated successfully!');
        onInvoiceUpdated(data);
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast.error(error.message || 'Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(e => e.field === field)?.message;
  };

  if (!invoice) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSaveInvoice}
      title="Edit Invoice"
      subtitle={
        <>
          {invoice.invoice_id || invoice.id}
          {formData.is_draft && <span className="ml-2 text-orange-400">(Draft)</span>}
        </>
      }
      icon={FileText}
      submitText="Save Changes"
      isLoading={isSaving}
      size="xl"
    >
      <div className="space-y-6">
        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Issue Date
            </label>
            <input
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className={`w-full px-4 py-2 bg-[#0A0A0A] border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                getFieldError('due_date') ? 'border-red-500' : 'border-[#2A2A2A]'
              }`}
              disabled={isSaving}
            />
            {getFieldError('due_date') && (
              <p className="text-xs text-red-400 mt-1">{getFieldError('due_date')}</p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white">Line Items</h4>
            <button
              type="button"
              onClick={handleAddLineItem}
              disabled={isSaving}
              className="px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-600/30 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {formData.line_items.map((item, index) => (
              <div key={item.id || index} className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-5">
                    <label className="block text-xs text-gray-500 mb-1">Description *</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className={`w-full px-3 py-2 bg-[#1A1A1A] border rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                        getFieldError(`line_items.${index}.description`) ? 'border-red-500' : 'border-[#2A2A2A]'
                      }`}
                      disabled={isSaving}
                    />
                    {getFieldError(`line_items.${index}.description`) && (
                      <p className="text-xs text-red-400 mt-1">{getFieldError(`line_items.${index}.description`)}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 bg-[#1A1A1A] border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                        getFieldError(`line_items.${index}.quantity`) ? 'border-red-500' : 'border-[#2A2A2A]'
                      }`}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Price</label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 bg-[#1A1A1A] border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                        getFieldError(`line_items.${index}.unit_price`) ? 'border-red-500' : 'border-[#2A2A2A]'
                      }`}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Amount</label>
                    <p className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm font-semibold">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </p>
                  </div>
                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      disabled={formData.line_items.length === 1 || isSaving}
                      className="p-2 hover:bg-red-600/10 rounded-lg transition border border-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getFieldError('line_items') && (
            <p className="text-sm text-red-400 mt-2">{getFieldError('line_items')}</p>
          )}
          {getFieldError('total') && (
            <p className="text-sm text-red-400 mt-2">{getFieldError('total')}</p>
          )}
        </div>

        {/* Totals */}
        <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Subtotal</span>
              <span className="text-white font-semibold">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Tax Rate</span>
                <input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-20 px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm"
                  disabled={isSaving}
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
              <span className="text-white font-semibold">${calculateTax().toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Discount</span>
                <input
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.01"
                  className="w-24 px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm"
                  disabled={isSaving}
                />
              </div>
              <span className="text-white font-semibold">-${(formData.discount_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A]">
              <span className="text-base font-bold text-white">Total</span>
              <span className="text-xl font-bold text-orange-400">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <TextArea
          label="Notes"
          value={formData.notes}
          onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
          rows={3}
          placeholder="Add notes for the customer..."
          disabled={isSaving}
        />
      </div>
    </FormModal>
  );
}
