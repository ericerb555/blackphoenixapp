/**
 * Start Quote Modal
 *
 * Lets an owner start a brand-new quote from scratch: fill in the customer and
 * project details, let the AI generate a comprehensive itemized estimate, then
 * drop straight into the full Quote to Contract Editor to refine and send.
 *
 * This is opened from the "Create Quote" button in the Command Center so the
 * user never has to hunt through the pipeline to begin a quote.
 */

import { useState } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Wrench,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { generateDemoQuote } from '../../lib/demoQuoteGenerator';
import { QuoteToContractEditor } from '../QuoteToContractEditor';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

interface StartQuoteModalProps {
  onClose: () => void;
}

const SERVICE_TYPES = [
  'Kitchen Remodel',
  'Bathroom Remodel',
  'Roofing',
  'Flooring',
  'Painting',
  'Deck / Patio',
  'Windows & Doors',
  'HVAC',
  'Electrical',
  'Plumbing',
  'General Construction',
];

export function StartQuoteModal({ onClose }: StartQuoteModalProps) {
  const [phase, setPhase] = useState<'form' | 'editor'>('form');
  const [generating, setGenerating] = useState(false);
  const [workRequest, setWorkRequest] = useState<any>(null);

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    location: '',
    serviceType: SERVICE_TYPES[0],
    title: '',
    description: '',
    estimatedValue: '',
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    if (!form.customerName.trim() || !form.title.trim()) {
      toast.error('Add a customer name and a project title to generate a quote.');
      return;
    }

    setGenerating(true);
    toast.loading('🤖 AI is building a detailed estimate...', { id: 'start-quote' });

    try {
      // Generate a comprehensive, itemized quote from the project details.
      const generated = generateDemoQuote({
        id: `wr-${Date.now()}`,
        title: form.title,
        description: form.description,
        serviceType: form.serviceType,
        estimatedValue: Number(form.estimatedValue) || 10000,
      });

      const quote = {
        id: `qt-${Date.now()}`,
        quoteNumber: `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(
          Math.floor(Math.random() * 9999),
        ).padStart(4, '0')}`,
        materials: generated.materials,
        labor: generated.labor,
        processSteps: generated.processSteps,
        materialsSubtotal: generated.materialsSubtotal,
        laborSubtotal: generated.laborSubtotal,
        taxRate: generated.taxRate,
        taxAmount: generated.taxAmount,
        totalCost: generated.totalCost,
        generatedAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
      };

      const request = {
        id: `wr-${Date.now()}`,
        requestNumber: `WR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(
          Math.floor(Math.random() * 9999),
        ).padStart(4, '0')}`,
        serviceType: form.serviceType,
        title: form.title,
        description: form.description,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        location: form.location,
        quote,
      };

      // Persist the new quote so it shows up across the app.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: quote.id,
            number: quote.quoteNumber,
            clientName: request.customerName,
            clientEmail: request.customerEmail,
            clientPhone: request.customerPhone,
            items: [...quote.materials, ...quote.labor],
            notes: request.description,
            status: 'draft',
            workRequestId: request.id,
            total: quote.totalCost,
          }),
        });
      } catch (persistErr) {
        console.error('Could not persist new quote to backend (continuing with local editor):', persistErr);
      }

      setWorkRequest(request);
      setPhase('editor');
      toast.success('Quote generated — review and refine it below.', {
        id: 'start-quote',
        description: `${quote.materials.length} materials and ${quote.labor.length} labor items ready.`,
      });
    } catch (error: any) {
      console.error('Failed to generate quote in StartQuoteModal:', error);
      toast.error(error?.message || 'Could not generate the quote. Please try again.', { id: 'start-quote' });
    } finally {
      setGenerating(false);
    }
  };

  if (phase === 'editor' && workRequest) {
    return (
      <QuoteToContractEditor
        workRequest={workRequest}
        onClose={onClose}
        onSave={(updated) => setWorkRequest(updated)}
        onSendToCustomer={() => {}}
        onConvertToContract={() => {}}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-fuchsia-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Start a New Quote</h2>
              <p className="text-sm text-gray-400">Fill in the details and let AI build the estimate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#1A1A1A] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-5 p-6">
          {/* Customer */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer Name" icon={<User className="h-4 w-4" />} required>
              <input
                value={form.customerName}
                onChange={(e) => update('customerName', e.target.value)}
                placeholder="Jane Homeowner"
                style={{ paddingLeft: '2.75rem' }}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] pr-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </Field>
            <Field label="Customer Email" icon={<Mail className="h-4 w-4" />}>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => update('customerEmail', e.target.value)}
                placeholder="jane@example.com"
                style={{ paddingLeft: '2.75rem' }}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] pr-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </Field>
            <Field label="Customer Phone" icon={<Phone className="h-4 w-4" />}>
              <input
                value={form.customerPhone}
                onChange={(e) => update('customerPhone', e.target.value)}
                placeholder="(555) 123-4567"
                style={{ paddingLeft: '2.75rem' }}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] pr-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </Field>
            <Field label="Job Location" icon={<MapPin className="h-4 w-4" />}>
              <input
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="123 Main St, City, ST"
                style={{ paddingLeft: '2.75rem' }}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] pr-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </Field>
          </div>

          {/* Project */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Service Type" icon={<Wrench className="h-4 w-4" />}>
              <select
                value={form.serviceType}
                onChange={(e) => update('serviceType', e.target.value)}
                style={{ paddingLeft: '2.75rem' }}
                className="w-full appearance-none rounded-lg border border-[#2A2A2A] bg-[#050505] pr-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated Budget (optional)" icon={<DollarSign className="h-4 w-4" />}>
              <input
                type="number"
                value={form.estimatedValue}
                onChange={(e) => update('estimatedValue', e.target.value)}
                placeholder="10000"
                style={{ paddingLeft: '2.75rem' }}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] pr-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </Field>
          </div>

          <Field label="Project Title" icon={<FileText className="h-4 w-4" />} required>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Full Kitchen Remodel"
              style={{ paddingLeft: '2.75rem' }}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] pr-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </Field>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Project Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              placeholder="Describe the scope of work — the more detail you provide, the more accurate the AI estimate."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#2A2A2A] p-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2A2A2A] px-5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-[#1A1A1A]"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:from-fuchsia-600 hover:to-orange-500 disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generating...' : 'Generate Quote with AI'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">
        {label} {required && <span className="text-orange-500">*</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>
        {children}
      </div>
    </div>
  );
}
