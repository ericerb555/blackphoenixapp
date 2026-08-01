import { useState } from 'react';
import { X, Mail, Send, AlertCircle, CheckCircle2, Loader2, UserPlus, Smartphone } from 'lucide-react';
import { EmailService } from '../../lib/services/emailService';
import { PDFService, type InvoicePDFData } from '../../lib/services/pdfService';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface EmailInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoicePDFData;
  defaultEmail?: string;
}

export default function EmailInvoiceModal({ isOpen, onClose, invoice, defaultEmail }: EmailInvoiceModalProps) {
  const [email, setEmail] = useState(defaultEmail || invoice.customer.email || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [inviteToApp, setInviteToApp] = useState(false);
  const [invitePhone, setInvitePhone] = useState(invoice.customer.phone || '');
  const [inviteBySms, setInviteBySms] = useState(false);

  if (!isOpen) return null;

  // Optionally invite the invoice recipient to join the app (customer portal).
  const sendAppInvite = async (): Promise<string | null> => {
    const phone = invitePhone.trim();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      const res = await fetch(`${SERVER}/owner-provisioning/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: invoice.customer.name || email,
          email,
          phone,
          portalType: 'customer',
          fullAccess: true,
          sendEmail: true,
          sendSms: inviteBySms && !!phone,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409) return 'already has an account/invite';
      if (!res.ok || !data?.success) {
        console.error('[EmailInvoiceModal] invite failed:', res.status, data);
        toast.error(data?.error || `Could not send app invite (${res.status}).`);
        return null;
      }
      const inv = data.invite || {};
      const parts: string[] = [];
      if (inv.invitationSent) parts.push('email');
      if (inv.smsSent) parts.push('SMS');
      if (parts.length) return `invite sent by ${parts.join(' + ')}`;
      const why = inv.inviteNotice || inv.smsNotice || 'no channel delivered';
      toast.warning(`Invoice sent, but the app invite did not deliver: ${why}`);
      return null;
    } catch (err: any) {
      console.error('[EmailInvoiceModal] invite error:', err);
      toast.error(err.message || 'Could not send the app invite.');
      return null;
    }
  };

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (inviteToApp && inviteBySms && !invitePhone.trim()) {
      toast.error('A phone number is required to send the invite by SMS.');
      return;
    }

    try {
      setSending(true);

      // Generate PDF as base64
      const pdfBase64 = PDFService.getInvoicePDFBase64(invoice);

      // Send email
      const result = await EmailService.sendInvoiceEmail(
        email,
        invoice,
        pdfBase64,
        message || undefined
      );

      if (result.success) {
        setSent(true);
        let inviteStatus: string | null = null;
        if (inviteToApp) inviteStatus = await sendAppInvite();
        toast.success(`Invoice email sent successfully!${inviteToApp && inviteStatus ? ` · ${inviteStatus}` : ''}`);
        setTimeout(() => {
          onClose();
          setSent(false);
          setMessage('');
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
      setSent(false);
      setMessage('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Email Invoice</h2>
              <p className="text-sm text-gray-400">Invoice #{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={sending}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {sent && (
            <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-400">Email sent successfully!</p>
                <p className="text-sm text-green-300/80">The invoice has been sent to {email}</p>
              </div>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Recipient Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending || sent}
              placeholder="customer@example.com"
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
            />
          </div>

          {/* Invoice Summary */}
          <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
            <h3 className="text-sm font-semibold text-white mb-3">Invoice Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <span className="text-white font-medium">{invoice.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Invoice Date:</span>
                <span className="text-white">{invoice.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Due Date:</span>
                <span className="text-white">{invoice.dueDate}</span>
              </div>
              {invoice.project && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Project:</span>
                  <span className="text-white">{invoice.project.name}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#2A2A2A] flex justify-between">
                <span className="text-gray-400 font-semibold">Total Amount:</span>
                <span className="text-orange-400 font-bold text-lg">${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending || sent}
              placeholder="Add a personal message to include in the email..."
              rows={4}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-2">
              This message will be included in the email body along with the invoice details.
            </p>
          </div>

          {/* Invite to app */}
          <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={inviteToApp}
                onChange={(e) => setInviteToApp(e.target.checked)}
                disabled={sending || sent}
                className="mt-0.5 w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <UserPlus className="w-4 h-4" /> Also invite this customer to join the app
                </span>
                <span className="text-emerald-300/70">Sends a portal invite so they can view invoices, quotes, and projects online.</span>
              </span>
            </label>
            {inviteToApp && (
              <div className="mt-3 pl-7 space-y-2">
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  disabled={sending || sent}
                  placeholder="Customer phone (for SMS invite)"
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                />
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteBySms}
                    onChange={(e) => setInviteBySms(e.target.checked)}
                    disabled={sending || sent}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <Smartphone className="w-4 h-4 text-gray-400" /> Also text the invite by SMS
                </label>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-400 font-medium mb-1">Email will include:</p>
              <ul className="text-blue-300/80 space-y-1">
                <li>• Professional branded email template</li>
                <li>• Invoice PDF attachment</li>
                <li>• Payment information and instructions</li>
                <li>• Your custom message (if provided)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#2A2A2A]">
          <button
            onClick={handleClose}
            disabled={sending}
            className="px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-xl font-semibold transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent || !email}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : sent ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Sent!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {inviteToApp ? 'Send Invoice & Invite' : 'Send Invoice'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
