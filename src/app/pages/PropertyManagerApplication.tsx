/**
 * Property Manager Application — Apply to join as a Property Management partner.
 *
 * Dedicated, role-specific onboarding form (not a generic template). Captures
 * portfolio details relevant to property managers and submits to the shared
 * /applications endpoint, which syncs the applicant into the CRM + starts the
 * onboarding intake checklist.
 */

import { useState } from 'react';
import {
  Building2, User, Mail, Phone, MapPin, Home, Layers, Wrench,
  ClipboardList, CheckCircle, Clock, ArrowRight, Shield, TrendingUp, Users,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PageHeader } from '../components/PageHeader';
import ApplicationPlanBuilderSection from '../components/ApplicationPlanBuilderSection';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

interface PropertyManagerApplicationProps {
  onNavigate?: (page: string) => void;
}

interface FormState {
  // Contact
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  title: string;
  // Portfolio
  managerType: string;
  unitsManaged: string;
  propertyTypes: string[];
  primaryCity: string;
  primaryState: string;
  serviceArea: string;
  currentSoftware: string;
  // Needs
  servicesNeeded: string[];
  monthlyMaintenanceSpend: string;
  painPoints: string;
  timeline: string;
  agreedToTerms: boolean;
  planPreference?: any;
}

const PROPERTY_TYPES = ['Single-family', 'Multi-family', 'Condos / HOA', 'Apartments', 'Commercial', 'Mixed-use', 'Short-term rentals'];
const SERVICES = ['Turn / make-ready', 'On-demand repairs', 'Preventive maintenance', 'Emergency response', 'Capital projects / renovations', 'Inspections', 'Landscaping / exterior'];

export default function PropertyManagerApplication({ onNavigate }: PropertyManagerApplicationProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    firstName: '', lastName: '', email: '', phone: '', companyName: '', title: '',
    managerType: '', unitsManaged: '', propertyTypes: [], primaryCity: '', primaryState: '',
    serviceArea: '', currentSoftware: '', servicesNeeded: [], monthlyMaintenanceSpend: '',
    painPoints: '', timeline: '', agreedToTerms: false,
  });

  const update = (field: keyof FormState, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const toggleArray = (field: 'propertyTypes' | 'servicesNeeded', value: string) =>
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value],
    }));

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.companyName) {
      toast.error('Please complete your contact and company details.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!formData.agreedToTerms) { toast.error('Please agree to the terms to continue.'); return; }
    if (!validateStep1()) { setStep(1); return; }

    setIsSubmitting(true);
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const payload = {
      applicationType: 'property_manager',
      applicationTitle: 'Property Manager Application',
      name: fullName,
      contact_name: fullName,
      email: formData.email,
      contact_email: formData.email,
      phone: formData.phone,
      contact_phone: formData.phone,
      company_name: formData.companyName,
      title: formData.title,
      city: formData.primaryCity,
      state: formData.primaryState,
      manager_type: formData.managerType,
      units_managed: formData.unitsManaged,
      property_types: formData.propertyTypes,
      service_area: formData.serviceArea,
      current_software: formData.currentSoftware,
      services_needed: formData.servicesNeeded,
      monthly_maintenance_spend: formData.monthlyMaintenanceSpend,
      pain_points: formData.painPoints,
      timeline: formData.timeline,
      planPreference: formData.planPreference || null,
      source: 'property_manager_application',
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/applications`,
        {
          method: 'POST',
          headers: await authedHeadersOrAnon(publicAnonKey),
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.error || `Submission failed (HTTP ${response.status})`);
      }
      setSubmitted(true);
      toast.success('Application submitted — welcome aboard! We\'ll be in touch shortly.');
    } catch (error) {
      const pending = JSON.parse(localStorage.getItem('property_manager_applications_pending') || '[]');
      pending.push({ id: `PM-APP-${Date.now()}`, ...payload, _offline: true, submittedAt: new Date().toISOString() });
      localStorage.setItem('property_manager_applications_pending', JSON.stringify(pending));
      console.error('Property manager application submission failed; queued locally:', error);
      toast.error('We could not reach our application system. Your application is saved on this device and has not been submitted yet. Please try again shortly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]';

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <PageHeader title="Property Manager Application" description="Partner with Black Phoenix" onBack={() => onNavigate?.('landing')} />
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/10 border border-green-500/30 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Application Received!</h2>
            <p className="text-lg text-zinc-300 mb-6">
              Thanks for applying to manage your properties with Black Phoenix. Our team will review your portfolio and reach out to {formData.email} within 1–2 business days to start onboarding.
            </p>
            <button onClick={() => onNavigate?.('landing')} className="px-8 py-4 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2">
              Return to Home <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <PageHeader title="Property Manager Application" description="Streamline maintenance across your entire portfolio" onBack={() => onNavigate?.('landing')} />
      <div className="max-w-5xl mx-auto p-6">
        {/* Value banner */}
        <div className="bg-gradient-to-r from-[#ea580c]/20 to-orange-600/10 border border-[#ea580c]/30 rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center"><Wrench className="w-9 h-9 text-[#ea580c] mx-auto mb-2" /><p className="text-sm text-zinc-400">One vendor for</p><p className="text-xl font-bold text-white">Every property</p></div>
          <div className="text-center"><Shield className="w-9 h-9 text-blue-400 mx-auto mb-2" /><p className="text-sm text-zinc-400">Licensed & insured</p><p className="text-xl font-bold text-white">Vetted pros</p></div>
          <div className="text-center"><TrendingUp className="w-9 h-9 text-green-400 mx-auto mb-2" /><p className="text-sm text-zinc-400">Portfolio dashboard</p><p className="text-xl font-bold text-white">Full visibility</p></div>
        </div>

        {/* Steps */}
        <div className="mb-8 flex items-center justify-between max-w-2xl mx-auto">
          {[{ n: 1, l: 'Contact' }, { n: 2, l: 'Portfolio' }, { n: 3, l: 'Needs' }, { n: 4, l: 'Review' }].map(({ n, l }, i) => (
            <div key={n} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= n ? 'bg-[#ea580c] text-white' : 'bg-zinc-800 text-zinc-500'}`}>{n}</div>
                <p className={`text-sm mt-2 ${step >= n ? 'text-white' : 'text-zinc-500'}`}>{l}</p>
              </div>
              {i < 3 && <div className={`h-0.5 flex-1 ${step > n ? 'bg-[#ea580c]' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div><h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><User className="w-6 h-6 text-[#ea580c]" />Contact Information</h2><p className="text-zinc-400">Tell us about you and your company</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-white mb-2">First Name *</label><input className={inputCls} value={formData.firstName} onChange={e => update('firstName', e.target.value)} placeholder="John" /></div>
                <div><label className="block text-sm font-medium text-white mb-2">Last Name *</label><input className={inputCls} value={formData.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Smith" /></div>
                <div><label className="block text-sm font-medium text-white mb-2 flex items-center gap-2"><Mail className="w-4 h-4" />Email *</label><input type="email" className={inputCls} value={formData.email} onChange={e => update('email', e.target.value)} placeholder="john@pmcompany.com" /></div>
                <div><label className="block text-sm font-medium text-white mb-2 flex items-center gap-2"><Phone className="w-4 h-4" />Phone *</label><input type="tel" className={inputCls} value={formData.phone} onChange={e => update('phone', e.target.value)} placeholder="(603) 555-0123" /></div>
                <div><label className="block text-sm font-medium text-white mb-2 flex items-center gap-2"><Building2 className="w-4 h-4" />Company Name *</label><input className={inputCls} value={formData.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Acme Property Management" /></div>
                <div><label className="block text-sm font-medium text-white mb-2">Your Title</label><input className={inputCls} value={formData.title} onChange={e => update('title', e.target.value)} placeholder="Portfolio Manager" /></div>
              </div>
              <div className="flex justify-end"><button onClick={() => { if (validateStep1()) setStep(2); }} className="px-8 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium flex items-center gap-2">Continue <ArrowRight className="w-5 h-5" /></button></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div><h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Layers className="w-6 h-6 text-[#ea580c]" />Your Portfolio</h2><p className="text-zinc-400">Help us understand what you manage</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-white mb-2">Manager Type</label>
                  <select className={inputCls} value={formData.managerType} onChange={e => update('managerType', e.target.value)}>
                    <option value="">Select...</option><option>Independent property manager</option><option>Property management company</option><option>Landlord / owner-operator</option><option>HOA / condo association</option><option>REIT / institutional</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-white mb-2">Units Under Management</label>
                  <select className={inputCls} value={formData.unitsManaged} onChange={e => update('unitsManaged', e.target.value)}>
                    <option value="">Select...</option><option>1–10</option><option>11–50</option><option>51–200</option><option>201–500</option><option>500+</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-white mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" />Primary City</label><input className={inputCls} value={formData.primaryCity} onChange={e => update('primaryCity', e.target.value)} placeholder="Manchester" /></div>
                <div><label className="block text-sm font-medium text-white mb-2">State</label><input className={inputCls} value={formData.primaryState} onChange={e => update('primaryState', e.target.value)} placeholder="NH" /></div>
              </div>
              <div><label className="block text-sm font-medium text-white mb-3 flex items-center gap-2"><Home className="w-4 h-4" />Property Types Managed</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PROPERTY_TYPES.map(pt => (
                    <button key={pt} type="button" onClick={() => toggleArray('propertyTypes', pt)} className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${formData.propertyTypes.includes(pt) ? 'border-[#ea580c] bg-[#ea580c]/10 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>{pt}</button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-white mb-2">Current Software (optional)</label><input className={inputCls} value={formData.currentSoftware} onChange={e => update('currentSoftware', e.target.value)} placeholder="AppFolio, Buildium, Yardi..." /></div>
              <div><label className="block text-sm font-medium text-white mb-2">Service Area / Notes</label><textarea rows={3} className={inputCls} value={formData.serviceArea} onChange={e => update('serviceArea', e.target.value)} placeholder="Cities/regions where your properties are located" /></div>
              <div className="flex justify-between"><button onClick={() => setStep(1)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium">Back</button><button onClick={() => setStep(3)} className="px-8 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium flex items-center gap-2">Continue <ArrowRight className="w-5 h-5" /></button></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div><h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-[#ea580c]" />Your Maintenance Needs</h2><p className="text-zinc-400">What would you like Black Phoenix to handle?</p></div>
              <div><label className="block text-sm font-medium text-white mb-3">Services Needed</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SERVICES.map(s => (
                    <button key={s} type="button" onClick={() => toggleArray('servicesNeeded', s)} className={`px-4 py-3 rounded-lg border text-sm text-left transition-all flex items-center gap-2 ${formData.servicesNeeded.includes(s) ? 'border-[#ea580c] bg-[#ea580c]/10 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                      {formData.servicesNeeded.includes(s) && <CheckCircle className="w-4 h-4 text-[#ea580c]" />}{s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-white mb-2">Est. Monthly Maintenance Spend</label>
                  <select className={inputCls} value={formData.monthlyMaintenanceSpend} onChange={e => update('monthlyMaintenanceSpend', e.target.value)}>
                    <option value="">Select...</option><option>Under $2,500</option><option>$2,500–$10,000</option><option>$10,000–$50,000</option><option>$50,000+</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-white mb-2">Timeline to Start</label>
                  <select className={inputCls} value={formData.timeline} onChange={e => update('timeline', e.target.value)}>
                    <option value="">Select...</option><option>Immediately</option><option>Within 30 days</option><option>1–3 months</option><option>Just exploring</option>
                  </select></div>
              </div>
              <div><label className="block text-sm font-medium text-white mb-2">Biggest Pain Points (optional)</label><textarea rows={3} className={inputCls} value={formData.painPoints} onChange={e => update('painPoints', e.target.value)} placeholder="Slow vendor response, inconsistent quality, too many contractors to manage..." /></div>
              <div className="flex justify-between"><button onClick={() => setStep(2)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium">Back</button><button onClick={() => setStep(4)} className="px-8 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium flex items-center gap-2">Review <ArrowRight className="w-5 h-5" /></button></div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div><h2 className="text-2xl font-bold text-white mb-2">Review & Submit</h2><p className="text-zinc-400">Please verify your information</p></div>
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-zinc-400">Name</p><p className="text-white font-medium">{formData.firstName} {formData.lastName}</p></div>
                <div><p className="text-zinc-400">Company</p><p className="text-white font-medium">{formData.companyName || '—'}</p></div>
                <div><p className="text-zinc-400">Email</p><p className="text-white font-medium">{formData.email}</p></div>
                <div><p className="text-zinc-400">Phone</p><p className="text-white font-medium">{formData.phone}</p></div>
                <div><p className="text-zinc-400">Units Managed</p><p className="text-white font-medium">{formData.unitsManaged || '—'}</p></div>
                <div><p className="text-zinc-400">Property Types</p><p className="text-white font-medium">{formData.propertyTypes.join(', ') || '—'}</p></div>
                <div className="col-span-2"><p className="text-zinc-400">Services Needed</p><p className="text-white font-medium">{formData.servicesNeeded.join(', ') || '—'}</p></div>
              </div>
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.agreedToTerms} onChange={e => update('agreedToTerms', e.target.checked)} className="w-5 h-5 rounded border-zinc-700 bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c] mt-0.5" />
                  <div><span className="text-white font-medium">I agree to the terms and authorize Black Phoenix to contact me *</span><p className="text-sm text-zinc-400 mt-1">Your information is used to set up your property management partner account and onboarding.</p></div>
                </label>
              </div>
              <div className="mt-2">
                <ApplicationPlanBuilderSection portalType="property_manager" ownerName={formData.companyName || `${formData.firstName} ${formData.lastName}`.trim()} onPlanDraftChange={(planPreference) => update('planPreference', planPreference)} />
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(3)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium">Back</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !formData.agreedToTerms} className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30">
                  {isSubmitting ? (<><Clock className="w-5 h-5 animate-spin" />Submitting...</>) : (<><CheckCircle className="w-5 h-5" />Submit Application</>)}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6"><Users className="w-9 h-9 text-blue-400 mb-3" /><h3 className="text-lg font-bold text-white mb-2">One point of contact</h3><p className="text-sm text-zinc-400">Replace a rolodex of contractors with a single accountable partner.</p></div>
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6"><Wrench className="w-9 h-9 text-[#ea580c] mb-3" /><h3 className="text-lg font-bold text-white mb-2">24/7 dispatch</h3><p className="text-sm text-zinc-400">Emergency and routine work orders handled across your whole portfolio.</p></div>
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6"><TrendingUp className="w-9 h-9 text-green-400 mb-3" /><h3 className="text-lg font-bold text-white mb-2">Transparent reporting</h3><p className="text-sm text-zinc-400">Track spend, status, and history per property in your dashboard.</p></div>
        </div>
      </div>
    </div>
  );
}
