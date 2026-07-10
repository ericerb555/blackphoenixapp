import React from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';

interface SendInvoiceModalProps {
  invoice: any;
  onClose: () => void;
  onConfirmSend: () => void;
}

export default function SendInvoiceModal({ invoice, onClose, onConfirmSend }: SendInvoiceModalProps) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full">
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Send Invoice</h2>
              <p className="text-gray-400">Confirm invoice details before sending</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Summary */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Invoice ID</p>
                <p className="text-lg font-bold text-white">{invoice.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-green-400">
                  ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-[#2A2A2A]">
              <p className="text-sm text-gray-400 mb-1">Customer</p>
              <p className="text-lg font-bold text-white">{invoice.customer.name}</p>
              <p className="text-sm text-gray-400">{invoice.customer.contact}</p>
            </div>
          </div>

          {/* Email Details */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4">Email Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">To:</label>
                <div className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                  <p className="text-white">{invoice.customer.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Subject:</label>
                <div className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                  <p className="text-white">Invoice {invoice.id} - Emergency Services</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Message:</label>
                <div className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                  <p className="text-white text-sm leading-relaxed">
                    Dear {invoice.customer.contact},<br /><br />
                    Please find attached invoice {invoice.id} for emergency services provided during {invoice.weekRange}.<br /><br />
                    <strong>Amount Due: ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><br />
                    <strong>Due Date: {invoice.dueDate}</strong><br /><br />
                    Thank you for your business!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Message */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 font-semibold mb-1">Ready to Send</p>
                <p className="text-sm text-gray-400">
                  Invoice will be sent to {invoice.customer.email} and status will be updated to "Sent"
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmSend}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send Invoice Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
