import React, { useState } from 'react';
import { X, FileText, Phone, Save } from 'lucide-react';

interface CreateInvoiceModalProps {
  newInvoiceForm: any;
  setNewInvoiceForm: (form: any) => void;
  allEmergencyCalls: any[];
  userAssignments: any[];
  onClose: () => void;
  onSave: () => void;
}

export default function CreateInvoiceModal({
  newInvoiceForm,
  setNewInvoiceForm,
  allEmergencyCalls,
  userAssignments,
  onClose,
  onSave
}: CreateInvoiceModalProps) {
  const [showCallSelector, setShowCallSelector] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);

  const handleToggleCallSelection = (callId: string) => {
    setSelectedCalls(prev => 
      prev.includes(callId) 
        ? prev.filter(id => id !== callId)
        : [...prev, callId]
    );
  };

  const handleAddSelectedCalls = () => {
    const newLineItems = selectedCalls.map((callId, index) => {
      const call = allEmergencyCalls.find(c => c.id === callId);
      if (!call) return null;

      return {
        id: Date.now() + index,
        callId: call.id,
        date: call.date,
        description: call.description,
        category: call.category,
        contractor: call.contractor,
        hours: call.hours,
        rate: call.rate,
        amount: call.hours * call.rate,
        materials: call.materials,
        total: (call.hours * call.rate) + call.materials
      };
    }).filter(Boolean);

    // Auto-fill customer info from first selected call if customer fields are empty
    if (!newInvoiceForm.customer.name && selectedCalls.length > 0) {
      const firstCall = allEmergencyCalls.find(c => c.id === selectedCalls[0]);
      if (firstCall) {
        const customer = userAssignments.find(u => u.property === firstCall.customer);
        if (customer) {
          setNewInvoiceForm({
            ...newInvoiceForm,
            customer: {
              name: customer.property,
              contact: customer.name,
              email: customer.email,
              phone: customer.phone,
              address: customer.address
            },
            lineItems: [...newInvoiceForm.lineItems, ...newLineItems]
          });
        } else {
          setNewInvoiceForm({
            ...newInvoiceForm,
            lineItems: [...newInvoiceForm.lineItems, ...newLineItems]
          });
        }
      }
    } else {
      setNewInvoiceForm({
        ...newInvoiceForm,
        lineItems: [...newInvoiceForm.lineItems, ...newLineItems]
      });
    }

    setShowCallSelector(false);
    setSelectedCalls([]);
  };

  const handleAddManualItem = () => {
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
    setNewInvoiceForm({
      ...newInvoiceForm,
      lineItems: [...newInvoiceForm.lineItems, newLineItem]
    });
  };

  const updateLineItem = (itemId: number, updates: any) => {
    setNewInvoiceForm({
      ...newInvoiceForm,
      lineItems: newInvoiceForm.lineItems.map((li: any) =>
        li.id === itemId ? { ...li, ...updates } : li
      )
    });
  };

  const removeLineItem = (itemId: number) => {
    setNewInvoiceForm({
      ...newInvoiceForm,
      lineItems: newInvoiceForm.lineItems.filter((li: any) => li.id !== itemId)
    });
  };

  const subtotal = newInvoiceForm.lineItems.reduce((sum: number, item: any) => sum + item.total, 0);
  const discount = newInvoiceForm.discount || 0;
  const tax = (subtotal - discount) * 0.09;
  const total = (subtotal - discount) + tax;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-7xl w-full my-8">
          {/* Header */}
          <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] p-6 flex items-center justify-between rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Create New Invoice</h2>
              <p className="text-gray-400">Build a custom invoice from scratch or select emergency calls</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white transition">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer Info Section */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={newInvoiceForm.customer.name}
                    onChange={(e) => setNewInvoiceForm({
                      ...newInvoiceForm,
                      customer: { ...newInvoiceForm.customer, name: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                    placeholder="Property or Company Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Contact Person *</label>
                  <input
                    type="text"
                    value={newInvoiceForm.customer.contact}
                    onChange={(e) => setNewInvoiceForm({
                      ...newInvoiceForm,
                      customer: { ...newInvoiceForm.customer, contact: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                    placeholder="Contact Person Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newInvoiceForm.customer.email}
                    onChange={(e) => setNewInvoiceForm({
                      ...newInvoiceForm,
                      customer: { ...newInvoiceForm.customer, email: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newInvoiceForm.customer.phone}
                    onChange={(e) => setNewInvoiceForm({
                      ...newInvoiceForm,
                      customer: { ...newInvoiceForm.customer, phone: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Address</label>
                  <input
                    type="text"
                    value={newInvoiceForm.customer.address}
                    onChange={(e) => setNewInvoiceForm({
                      ...newInvoiceForm,
                      customer: { ...newInvoiceForm.customer, address: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                    placeholder="Full Address"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Line Items ({newInvoiceForm.lineItems.length})</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCallSelector(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition"
                  >
                    <Phone className="w-4 h-4" />
                    Add from Emergency Calls
                  </button>
                  <button
                    onClick={handleAddManualItem}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition"
                  >
                    <FileText className="w-4 h-4" />
                    Add Manual Item
                  </button>
                </div>
              </div>

              {newInvoiceForm.lineItems.length === 0 ? (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No line items added yet</p>
                  <p className="text-gray-500 text-sm">Add items from emergency calls or create manual entries</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {newInvoiceForm.lineItems.map((item: any) => (
                    <div key={item.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-400 mb-2">Call ID</label>
                          <input
                            type="text"
                            value={item.callId}
                            onChange={(e) => updateLineItem(item.id, { callId: e.target.value })}
                            className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-400 mb-2">Date</label>
                          <input
                            type="text"
                            value={item.date}
                            onChange={(e) => updateLineItem(item.id, { date: e.target.value })}
                            className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-gray-400 mb-2">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                            className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-400 mb-2">Contractor</label>
                          <input
                            type="text"
                            value={item.contractor}
                            onChange={(e) => updateLineItem(item.id, { contractor: e.target.value })}
                            className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-400 mb-2">Hours</label>
                          <input
                            type="number"
                            step="0.5"
                            value={item.hours}
                            onChange={(e) => {
                              const hours = parseFloat(e.target.value) || 0;
                              updateLineItem(item.id, {
                                hours,
                                amount: hours * item.rate,
                                total: (hours * item.rate) + item.materials
                              });
                            }}
                            className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-400 mb-2">Rate</label>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value) || 0;
                              updateLineItem(item.id, {
                                rate,
                                amount: item.hours * rate,
                                total: (item.hours * rate) + item.materials
                              });
                            }}
                            className="w-full px-2 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-green-500/50 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-400 mb-2">Materials</label>
                          <input
                            type="number"
                            value={item.materials}
                            onChange={(e) => {
                              const materials = parseFloat(e.target.value) || 0;
                              updateLineItem(item.id, {
                                materials,
                                total: item.amount + materials
                              });
                            }}
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
                            onClick={() => removeLineItem(item.id)}
                            className="w-full px-2 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition"
                          >
                            <X className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice Totals */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4">Invoice Totals</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Subtotal ({newInvoiceForm.lineItems.length} items)</span>
                  <span className="text-white font-bold text-lg">
                    ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Discount</span>
                    <input
                      type="number"
                      value={newInvoiceForm.discount}
                      onChange={(e) => setNewInvoiceForm({
                        ...newInvoiceForm,
                        discount: parseFloat(e.target.value) || 0
                      })}
                      className="w-32 px-3 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:border-orange-500/50 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <span className="text-orange-400 font-bold text-lg">
                    -${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Tax (9%)</span>
                  <span className="text-white font-bold text-lg">
                    ${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg">
                  <span className="text-white font-bold text-xl">TOTAL</span>
                  <span className="text-green-400 font-bold text-3xl">
                    ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes & Due Date */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Invoice Notes</h3>
                <textarea
                  value={newInvoiceForm.notes}
                  onChange={(e) => setNewInvoiceForm({
                    ...newInvoiceForm,
                    notes: e.target.value
                  })}
                  rows={5}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none resize-none"
                  placeholder="Add any notes or special instructions..."
                />
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Payment Terms</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Due Date</label>
                    <input
                      type="text"
                      value={newInvoiceForm.dueDate}
                      onChange={(e) => setNewInvoiceForm({
                        ...newInvoiceForm,
                        dueDate: e.target.value
                      })}
                      className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-green-500/50 focus:outline-none"
                      placeholder="Mar 09, 2026"
                    />
                  </div>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-400">
                      <span className="font-semibold">💡 Tip:</span> Invoice will be created as a draft. You can send it to the customer after review.
                    </p>
                  </div>
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
                disabled={!newInvoiceForm.customer.name || !newInvoiceForm.customer.email || newInvoiceForm.lineItems.length === 0}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Call Selector Modal */}
      {showCallSelector && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Select Emergency Calls</h2>
                <p className="text-gray-400">Choose calls to add to this invoice ({selectedCalls.length} selected)</p>
              </div>
              <button
                onClick={() => {
                  setShowCallSelector(false);
                  setSelectedCalls([]);
                }}
                className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Calls List */}
              <div className="space-y-3">
                {allEmergencyCalls.filter(call => !call.invoiced).map((call) => {
                  const isSelected = selectedCalls.includes(call.id);
                  const total = (call.hours * call.rate) + call.materials;

                  return (
                    <div
                      key={call.id}
                      onClick={() => handleToggleCallSelection(call.id)}
                      className={`bg-[#1A1A1A] rounded-xl border p-4 cursor-pointer transition ${
                        isSelected
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-[#2A2A2A] hover:border-green-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleCallSelection(call.id)}
                            className="mt-1 w-5 h-5 rounded border-gray-600 text-green-600 focus:ring-green-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                                {call.id}
                              </span>
                              <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
                                {call.category}
                              </span>
                              <span className="text-sm text-gray-400">{call.date}</span>
                            </div>
                            <p className="text-white font-semibold mb-1">{call.description}</p>
                            <p className="text-sm text-gray-400 mb-2">
                              {call.customer} • {call.contact}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>Contractor: <span className="text-white">{call.contractor}</span></span>
                              <span>•</span>
                              <span>{call.hours} hrs × ${call.rate}</span>
                              <span>•</span>
                              <span>Materials: ${call.materials}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-green-400">${total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => {
                    setShowCallSelector(false);
                    setSelectedCalls([]);
                  }}
                  className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelectedCalls}
                  disabled={selectedCalls.length === 0}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-bold transition"
                >
                  Add {selectedCalls.length} Call{selectedCalls.length !== 1 ? 's' : ''} to Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
