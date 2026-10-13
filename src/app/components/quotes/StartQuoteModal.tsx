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
import { toast } from 'sonner';
import { generateDemoQuote } from '../../lib/demoQuoteGenerator';
import { QuotePricingBasisBanner } from './QuotePricingBasisBanner';
import { QuoteToContractEditor } from '../QuoteToContractEditor';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { authedHeaders } from '../../utils/authHeaders';
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
    // The job
    propertyType: '',
    workNature: '',
    // The place
    unitCount: '',
    storeys: '',
    accessNotes: '',
    // The size — the numbers a takeoff needs
    squareFootage: '',
    linearFootage: '',
    roomCount: '',
    ceilingHeight: '',
    // The conditions
    occupancy: '',
    parking: '',
    stairsOrLift: '',
    workingHours: '',
    // The timing
    urgency: '',
    preferredWindow: '',
    deadline: '',
    // What he actually wants, in his own words
    brief: '',
    exclusions: '',
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    if (!form.customerName.trim() || !form.title.trim()) {
      toast.error('Add a customer name and a project title to generate a quote.');
      return;
    }

    setGenerating(true);
    toast.loading('🤖 AI estimator is building a detailed, itemized quote...', { id: 'start-quote' });

    const requestId = `wr-${Date.now()}`;
    try {
      // 1) Try the estimator-grade AI engine on the server (real takeoff, waste
      //    factors, trade-based labor, permits/disposal, overhead/profit/tax).
      // 2) Fall back to the local demo generator only if the server is
      //    unreachable, so the button always produces something usable.
      let generated: any = null;
      let generatedByAI = false;
      /**
       * Whether the SERVER produced these numbers, which is not the same
       * question as whether the model did.
       *
       * `runEstimator` answers `usedAI: false` when the model or its key is
       * unavailable and it falls back to `heuristicEstimate` — the server's own
       * deterministic estimate, which is not repriced and carries no summary,
       * but is still a world away from the local demo generator. Deriving the
       * basis from `usedAI` alone would have labelled that legitimate server
       * estimate as demo figures.
       */
      let fromServer = false;
      let aiMeta: {
        confidence?: string;
        summary?: string;
        assumptions?: string[];
        regionalNote?: string;
        /**
         * What the server says about which of this quote's figures are real.
         *
         * `repriceEstimate` replaces the model's prices with the vendor
         * catalogue's and the model's rates with the company's, marks every
         * line `catalogue`, `your-rate` or `estimated`, and writes a sentence
         * that deliberately never overclaims. The route returns it as
         * `priceSummary` and this screen used to drop it on the floor, so the
         * one sentence telling the truth about a quote's numbers reached
         * nobody. It is rendered as written — a reassuring sentence of our own
         * would defeat the point of it.
         */
        priceSummary?: { note?: string; confidence?: number; onYourFigures?: number; settingsAreStandard?: boolean } | null;
        estimatorContext?: string | null;
      } = {};

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/auto-generate-quote`,
          {
            method: 'POST',
            headers: await authedHeaders(),
            body: JSON.stringify({
              /**
               * Everything that was typed, sent as it was typed.
               *
               * The server composes this into the estimator's context block —
               * fixed section order, blank fields omitted rather than sent as
               * "unknown", and `brief` passed through verbatim. Nothing is
               * summarised here, because the detail in the brief is the part
               * only the person who saw the job can supply.
               */
              workRequest: {
                id: requestId,
                title: form.title,
                serviceType: form.serviceType,
                description: form.description,
                location: form.location,
                estimatedValue: Number(form.estimatedValue) || undefined,

                propertyType: form.propertyType || undefined,
                workNature: form.workNature || undefined,

                unitCount: form.unitCount || undefined,
                storeys: form.storeys || undefined,
                accessNotes: form.accessNotes || undefined,

                squareFootage: form.squareFootage || undefined,
                linearFootage: form.linearFootage || undefined,
                roomCount: form.roomCount || undefined,
                ceilingHeight: form.ceilingHeight || undefined,

                occupancy: form.occupancy || undefined,
                parking: form.parking || undefined,
                stairsOrLift: form.stairsOrLift || undefined,
                workingHours: form.workingHours || undefined,

                urgency: form.urgency || undefined,
                preferredWindow: form.preferredWindow || undefined,
                deadline: form.deadline || undefined,

                brief: form.brief || undefined,
                exclusions: form.exclusions || undefined,
              },
            }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.success && (data.materials?.length || data.labor?.length)) {
            generated = {
              materials: data.materials,
              labor: data.labor,
              processSteps: data.processSteps || [],
              additionalCosts: data.additionalCosts || [],
              materialsSubtotal: data.materialsSubtotal,
              laborSubtotal: data.laborSubtotal,
              taxRate: data.taxRate,
              taxAmount: data.taxAmount,
              totalCost: data.totalCost,
              overheadAmount: data.overheadAmount,
              profitAmount: data.profitAmount,
              contingencyAmount: data.contingencyAmount,
            };
            fromServer = true;
            generatedByAI = !!data.usedAI;
            aiMeta = {
              confidence: data.confidence,
              summary: data.projectSummary,
              assumptions: data.assumptions,
              regionalNote: data.regionalNote,
              priceSummary: data.priceSummary ?? null,
              // Kept so the editor can show what the estimator was told. Verbatim.
              estimatorContext: data.estimatorContext ?? null,
            };
          }
        } else {
          console.error('AI quote endpoint returned non-OK status:', res.status, await res.text().catch(() => ''));
        }
      } catch (aiErr) {
        console.error('AI quote endpoint unreachable, using local demo generator:', aiErr);
      }

      if (!generated) {
        generated = generateDemoQuote({
          id: requestId,
          title: form.title,
          description: form.description,
          serviceType: form.serviceType,
          estimatedValue: Number(form.estimatedValue) || 10000,
        });
      }

      const quote = {
        id: `qt-${Date.now()}`,
        quoteNumber: `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(
          Math.floor(Math.random() * 9999),
        ).padStart(4, '0')}`,
        materials: generated.materials,
        labor: generated.labor,
        processSteps: generated.processSteps,
        additionalCosts: generated.additionalCosts || [],
        materialsSubtotal: generated.materialsSubtotal,
        laborSubtotal: generated.laborSubtotal,
        taxRate: generated.taxRate,
        taxAmount: generated.taxAmount,
        totalCost: generated.totalCost,
        aiConfidence: aiMeta.confidence,
        aiSummary: aiMeta.summary,
        aiAssumptions: aiMeta.assumptions,
        aiEstimatorContext: aiMeta.estimatorContext,
        aiRegionalNote: aiMeta.regionalNote,

        /**
         * WHICH ENGINE PRICED THIS, RECORDED RATHER THAN ANNOUNCED ONCE.
         *
         * When `/auto-generate-quote` is unreachable or answers non-OK, the
         * fallback below produces a complete, itemised, sendable-looking quote
         * out of `generateDemoQuote` — demo figures. The only thing that ever
         * said so was a toast reading "(offline mode)", and nothing was
         * stored: once it faded, a demo quote and a real estimate were
         * identical on every screen that showed them, including the pipeline
         * board and the quotes list. Somebody who missed the toast could send
         * demo numbers to a customer.
         *
         * So the basis travels with the quote. It is persisted through the
         * pipeline item, which carries this whole object.
         *
         *   estimator         the model's takeoff, repriced by the server
         *   server-heuristic  the server's deterministic fallback, not repriced
         *   offline-demo      the local demo generator; the server never answered
         */
        pricingBasis: (fromServer
          ? generatedByAI
            ? 'estimator'
            : 'server-heuristic'
          : 'offline-demo') as 'estimator' | 'server-heuristic' | 'offline-demo',
        priceSummary: aiMeta.priceSummary ?? null,

        generatedAt: new Date().toISOString(),
        approvalStatus: 'pending' as const,
      };

      const request = {
        id: requestId,
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
          headers: await authedHeaders(),
          body: JSON.stringify({
            id: quote.id,
            number: quote.quoteNumber,
            clientName: request.customerName,
            clientEmail: request.customerEmail,
            clientPhone: request.customerPhone,
            items: [...quote.materials, ...quote.labor],
            notes: request.description,
            status: 'draft',
            /**
             * Stored, because the send gate reads it.
             *
             * `POST /quotes/:id/send-to-customer` refuses an unpriced send
             * without an explicit acknowledgement, and it decides that from
             * the quote's own stored `pricingBasis`. Keeping the basis only in
             * the pipeline item would leave the gate looking at a quote record
             * that never knew what priced it.
             */
            pricingBasis: quote.pricingBasis,
            priceSummary: quote.priceSummary,
            workRequestId: request.id,
            total: quote.totalCost,
          }),
        });
      } catch (persistErr) {
        console.error('Could not persist new quote to backend (continuing with local editor):', persistErr);
      }

      // Also create a Pipeline item so the quote shows up on the Project Pipeline
      // board (stage: quote-draft) where it can be viewed and edited further.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const now = new Date().toISOString();
        await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/pipeline/items`, {
          method: 'POST',
          headers: await authedHeaders(),
          body: JSON.stringify({
            id: request.id,
            itemNumber: request.requestNumber,
            stage: 'quote-draft',
            customerName: request.customerName,
            customerEmail: request.customerEmail,
            customerPhone: request.customerPhone,
            location: request.location,
            serviceType: request.serviceType,
            title: request.title,
            description: request.description,
            estimatedValue: quote.totalCost,
            priority: 'medium',
            createdDate: now,
            lastModified: now,
            quote,
          }),
        });
      } catch (pipelineErr) {
        console.error('Could not add new quote to the pipeline (continuing with local editor):', pipelineErr);
      }

      setWorkRequest(request);
      setPhase('editor');
      const lineCount = `${quote.materials.length} materials · ${quote.labor.length} labor items`;

      if (quote.pricingBasis === 'offline-demo') {
        // Not a success. The quote exists and is demo figures, and the banner
        // in the editor says so for as long as it is open — a toast is not a
        // place to put something somebody must not forget.
        toast.warning('Demo figures — the estimator could not be reached.', {
          id: 'start-quote',
          description: `${lineCount}. Do not send this to a customer before repricing it.`,
        });
      } else {
        toast.success(
          generatedByAI ? 'Estimate ready — review and refine it below.' : 'Estimate ready (offline estimator) — review below.',
          {
            id: 'start-quote',
            description: `${lineCount}${aiMeta.confidence ? ` · confidence: ${aiMeta.confidence}` : ''}.`,
          },
        );
      }
    } catch (error: any) {
      console.error('Failed to generate quote in StartQuoteModal:', error);
      toast.error(error?.message || 'Could not generate the quote. Please try again.', { id: 'start-quote' });
    } finally {
      setGenerating(false);
    }
  };

  if (phase === 'editor' && workRequest) {
    return (
      <>
        <QuotePricingBasisBanner quote={workRequest.quote} />
        <QuoteToContractEditor
          workRequest={workRequest}
          onClose={onClose}
          onSave={(updated) => setWorkRequest(updated)}
          onSendToCustomer={() => {}}
          onConvertToContract={() => {}}
        />
      </>
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

          {/*
            Everything below is optional and the estimator is told nothing about
            a field left blank — an empty box sent as "unknown" would be a claim
            about the job rather than silence. So filling none of this is
            exactly as good as before, and filling any of it is better.
          */}
          <details className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-300">
              Job details — the numbers a takeoff needs
              <span className="ml-2 text-xs font-normal text-gray-500">optional, and all of it improves the estimate</span>
            </summary>
            <div className="space-y-4 border-t border-[#2A2A2A] p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <SmallField label="Square footage" value={form.squareFootage} onChange={(v) => update('squareFootage', v)} placeholder="320" />
                <SmallField label="Linear footage" value={form.linearFootage} onChange={(v) => update('linearFootage', v)} placeholder="72" />
                <SmallField label="Ceiling height (ft)" value={form.ceilingHeight} onChange={(v) => update('ceilingHeight', v)} placeholder="9" />
                <SmallField label="Rooms" value={form.roomCount} onChange={(v) => update('roomCount', v)} placeholder="1" />
                <SmallField label="Units covered" value={form.unitCount} onChange={(v) => update('unitCount', v)} placeholder="1" />
                <SmallField label="Storeys" value={form.storeys} onChange={(v) => update('storeys', v)} placeholder="2" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SmallField label="Property type" value={form.propertyType} onChange={(v) => update('propertyType', v)} placeholder="Single family, condo, commercial…" />
                <SmallField label="New work or a rebuild?" value={form.workNature} onChange={(v) => update('workNature', v)} placeholder="Replacing an existing deck" />
                <SmallField label="Occupancy" value={form.occupancy} onChange={(v) => update('occupancy', v)} placeholder="Occupied / vacant" />
                <SmallField label="Parking and staging" value={form.parking} onChange={(v) => update('parking', v)} placeholder="Driveway, no street parking" />
                <SmallField label="Stairs or lift" value={form.stairsOrLift} onChange={(v) => update('stairsOrLift', v)} placeholder="Third floor, stairs only" />
                <SmallField label="Working hours allowed" value={form.workingHours} onChange={(v) => update('workingHours', v)} placeholder="8–4 weekdays" />
                <SmallField label="Urgency" value={form.urgency} onChange={(v) => update('urgency', v)} placeholder="Within a month" />
                <SmallField label="Preferred window" value={form.preferredWindow} onChange={(v) => update('preferredWindow', v)} placeholder="Late October" />
                <SmallField label="Hard deadline" value={form.deadline} onChange={(v) => update('deadline', v)} placeholder="Before the first frost" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Access notes</label>
                <textarea
                  value={form.accessNotes}
                  onChange={(e) => update('accessNotes', e.target.value)}
                  rows={2}
                  placeholder="Side gate is narrow, no truck access to the back"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>
          </details>

          {/*
            The brief. Passed to the estimator verbatim and marked as the most
            authoritative description of the job, so where it contradicts a
            field above, it wins. This is the field worth filling in.
          */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Tell the estimator exactly what you want
              <span className="ml-2 text-xs font-normal text-orange-400">the most useful thing on this form</span>
            </label>
            <textarea
              value={form.brief}
              onChange={(e) => update('brief', e.target.value)}
              rows={7}
              placeholder={'Write it as you would explain it to a foreman. Materials you want, construction you expect, what is already there and staying, anything awkward about the job.\n\nE.g. 16x20 deck, pressure-treated frame, composite surface, hidden fasteners. Existing footings are sound and stay. Replacing the slider at the same time. Railing to match the front porch.'}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Sent word for word, and it outranks the fields above where they disagree.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Leave out of the quote</label>
            <textarea
              value={form.exclusions}
              onChange={(e) => update('exclusions', e.target.value)}
              rows={2}
              placeholder="No demolition. Customer is supplying the tile. Permit is already pulled."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <p className="mt-1 text-xs text-gray-500">
              These are not priced, not listed, and not added back as assumptions.
            </p>
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

/**
 * A plain labelled input for the optional job details.
 *
 * Separate from `Field` because that one carries an icon and a required marker
 * and is built for the customer block at the top. These are nine small boxes in
 * a grid, where an icon each would be noise rather than help.
 *
 * Every one of them is free text on purpose, including the measurements. The
 * server reads a number out of whatever is typed, so "1,250 sq ft" and "9'" both
 * work — a numeric input that rejected those would make somebody retype what
 * they already knew.
 */
function SmallField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
      />
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
