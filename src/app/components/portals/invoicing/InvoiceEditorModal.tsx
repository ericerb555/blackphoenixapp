import React from 'react';
import { X, Save, Download, FileText } from 'lucide-react';

interface InvoiceEditorModalProps {
  invoice: any;
  setInvoice: (invoice: any) => void;
  onClose: () => void;
  onSave: () => void;
  onDownloadPDF: () => void;
}

export default function InvoiceEditorModal({
  invoice,
  setInvoice,
  onClose,
  onSave,
  onDownloadPDF
}: InvoiceEditorModalProps) {
  const handleUpdateLineItem = (lineItemId: number, field: string, value: any) => {
    const updatedLineItems = invoice.lineItems.map((item: any) => {
      if (item.id === lineItemId) {
        const updated = { ...item, [field]: value };
        
        if (field === 'hours' || field === 'rate' || field === 'materials') {
          updated.amount = updated.hours * updated.rate;
          updated.total = updated.amount + updated.materials;
        }
        
        return updated;
      }
      return item;
    });

    setInvoice({
      ...invoice,
      lineItems: updatedLineItems
    });
  };

  const handleAddLineItem = () => {
    const newLineItem = {
      id: Date.now(),
      callId: 'MANUAL',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      description: 'New Line Item',
      category: 'General',
      contractor: '',
      hours: 0,
      rate: 125,
      amount: 0,
      materials: 0,
      total: 0
    };

    setInvoice({
      ...invoice,
      lineItems: [...invoice.lineItems, newLineItem]
    });
  };

  const handleRemoveLineItem = (lineItemId: number) => {
    setInvoice({
      ...invoice,
      lineItems: invoice.lineItems.filter((item: any) => item.id !== lineItemId)
    });
  };

  const calculateInvoiceTotals = () => {
    const subtotal = invoice.lineItems.reduce((sum: number, item: any) => sum + item.total, 0);
    const discount = invoice.discount || 0;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * 0.09;
    const total = subtotalAfterDiscount + tax;

    return { subtotal, tax, discount, total };
  };

  const totals = calculateInvoiceTotals();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-7xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Edit Invoice: {invoice.id}</h2>
            <p className="text-gray-400">{invoice.customer.name} • {invoice.weekRange}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info Section */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={invoice.customer.name}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, name: e.target.value }
                  })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Contact Person</label>
                <input
                  type="text"
                  value={invoice.customer.contact}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, contact: e.target.value }
                  })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={invoice.customer.email}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, email: e.target.value }
                  })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Phone</label>
                <input
                  type="tel"
                  value={invoice.customer.phone}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, phone: e.target.value }
                  })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-400 mb-2">Address</label>
                <input
                  type="text"
                  value={invoice.customer.address}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, address: e.target.value }
                  })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Line Items</h3>
              <button
                onClick={handleAddLineItem}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition"
              >
                <FileText className="w-4 h-4" />
                Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {invoice.lineItems.map((item: any) => (
                <div key={item.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Call ID</label>
                      <input
                        type="text"
                        value={item.callId}
                        onChange={(e) => handleUpdateLineItem(item.id, 'callId', e.target.value)}
                        className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Date</label>
                      <input
                        type="text"
                        value={item.date}
                        onChange={(e) => handleUpdateLineItem(item.id, 'date', e.target.value)}
                        className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                        className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Contractor</label>
                      <input
                        type="text"
                        value={item.contractor}
                        onChange={(e) => handleUpdateLineItem(item.id, 'contractor', e.target.value)}
                        className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={item.hours}
                        onChange={(e) => handleUpdateLineItem(item.id, 'hours', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Rate</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleUpdateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Materials</label>
                      <input
                        type="number"
                        value={item.materials}
                        onChange={(e) => handleUpdateLineItem(item.id, 'materials', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Total</label>
                      <div className="px-2 py-2 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm font-bold text-center">
                        ${item.total.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1 flex items-end">
                      <button
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="w-full px-2 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition"
                      >
                        <X className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4">Invoice Totals</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <span className="text-gray-400">Subtotal ({invoice.lineItems.length} items)</span>
                <span className="text-white font-bold text-lg">
                  ${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Discount</span>
                  <input
                    type="number"
                    value={invoice.discount}
                    onChange={(e) => setInvoice({
                      ...invoice,
                      discount: parseFloat(e.target.value) || 0
                    })}
                    className="w-32 px-3 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-orange-500/50 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <span className="text-orange-400 font-bold text-lg">
                  -${totals.discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                <span className="text-gray-400">Tax (9%)</span>
                <span className="text-white font-bold text-lg">
                  ${totals.tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg">
                <span className="text-white font-bold text-xl">TOTAL</span>
                <span className="text-green-400 font-bold text-3xl">
                  ${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4">Invoice Notes</h3>
            <textarea
              value={invoice.notes}
              onChange={(e) => setInvoice({
                ...invoice,
                notes: e.target.value
              })}
              rows={3}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none resize-none"
              placeholder="Add any notes or special instructions for this invoice..."
            />
          </div>

          {/* Due Date */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4">Payment Terms</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Due Date</label>
                <input
                  type="text"
                  value={invoice.dueDate}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    dueDate: e.target.value
                  })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                  placeholder="Mar 09, 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Invoice Status</label>
                <select
                  value={invoice.status}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    status: e.target.value
                  })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Invoice
            </button>
            <button
              onClick={() => {
                onSave();
                onDownloadPDF();
              }}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Save & Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
