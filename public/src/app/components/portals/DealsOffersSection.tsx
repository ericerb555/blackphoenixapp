/**
 * DealsOffersSection — shared across Vendor, Subcontractor, and Advertiser portals.
 * Lets partners create deal offers for customers with two monetization paths:
 *   - Subscription plans (monthly / annual)
 *   - Pay-as-you-post (one-time fee per deal)
 */
import { useState } from 'react';
import {
  Tag, Plus, Trash2, Eye, EyeOff, CheckCircle, Star, Zap,
  Crown, RefreshCw, CreditCard, Calendar, Clock, BadgePercent,
  ChevronDown, ChevronUp, AlertCircle, X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useUserData } from '../../lib/hooks/useUserData';

interface Deal {
  id: string;
  title: string;
  description: string;
  discountType: 'percent' | 'dollar' | 'bogo' | 'free-service';
  discountValue: string;
  originalPrice: string;
  promoCode: string;
  expiresAt: string;
  imageUrl: string;
  active: boolean;
  plan: 'paypg' | 'starter' | 'growth' | 'pro';
  postedAt: string;
}

interface Props {
  portalType: 'vendor' | 'subcontractor' | 'advertiser';
  storageKey: string; // e.g. 'vendor_deals', 'sub_deals', 'advertiser_deals'
}

const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    period: '/mo',
    annualPrice: '$290',
    color: 'from-blue-600 to-blue-700',
    border: 'border-blue-500/40',
    badge: null,
    deals: 3,
    features: ['3 active deals at a time', 'Standard placement in deals feed', 'Basic analytics', '30-day deal duration'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$69',
    period: '/mo',
    annualPrice: '$690',
    color: 'from-orange-600 to-red-600',
    border: 'border-orange-500/40',
    badge: 'Most Popular',
    deals: 10,
    features: ['10 active deals at a time', 'Priority placement in deals feed', 'Full analytics + click tracking', '60-day deal duration', 'Featured on landing page'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$149',
    period: '/mo',
    annualPrice: '$1,490',
    color: 'from-purple-600 to-indigo-600',
    border: 'border-purple-500/40',
    badge: 'Best Value',
    deals: 999,
    features: ['Unlimited active deals', 'Top-tier placement + spotlight', 'Advanced analytics + ROI tracking', '90-day deal duration', 'Featured on landing page', 'Email blast to customer list', 'Dedicated support'],
  },
];

const PAYPG = {
  id: 'paypg',
  name: 'Pay As You Post',
  price: '$9',
  unit: 'per deal',
  features: ['1 deal post, live for 14 days', 'Standard placement', 'Basic view count', 'No commitment'],
};

export default function DealsOffersSection({ portalType, storageKey }: Props) {
  const [deals, setDeals] = useUserData<Deal[]>(storageKey, []);
  const [currentPlan, setCurrentPlan] = useUserData<string>(`${storageKey}_plan`, 'none');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showModal, setShowModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Deal>>({
    title: '', description: '', discountType: 'percent', discountValue: '',
    originalPrice: '', promoCode: '', expiresAt: '', imageUrl: '', active: true,
  });
  const [formError, setFormError] = useState('');

  const activePlan = SUBSCRIPTION_PLANS.find(p => p.id === currentPlan);
  const maxDeals = activePlan ? activePlan.deals : (currentPlan === 'paypg' ? 999 : 0);
  const activeDeals = deals.filter(d => d.active);
  const canPost = currentPlan !== 'none' && activeDeals.length < maxDeals;

  function handleSave() {
    if (!form.title?.trim()) { setFormError('Title is required.'); return; }
    if (!form.discountValue?.trim() && form.discountType !== 'bogo' && form.discountType !== 'free-service') {
      setFormError('Discount value is required.'); return;
    }
    if (currentPlan === 'none') { setFormError(''); setShowPricingModal(true); setShowModal(false); return; }

    const newDeal: Deal = {
      id: `deal_${Date.now()}`,
      title: form.title || '',
      description: form.description || '',
      discountType: (form.discountType as Deal['discountType']) || 'percent',
      discountValue: form.discountValue || '',
      originalPrice: form.originalPrice || '',
      promoCode: form.promoCode || '',
      expiresAt: form.expiresAt || '',
      imageUrl: form.imageUrl || '',
      active: true,
      plan: (currentPlan as Deal['plan']) || 'paypg',
      postedAt: new Date().toISOString(),
    };
    setDeals([newDeal, ...deals]);
    toast.success('Deal posted! Customers can now see it.');
    setShowModal(false);
    resetForm();
  }

  function resetForm() {
    setForm({ title: '', description: '', discountType: 'percent', discountValue: '', originalPrice: '', promoCode: '', expiresAt: '', imageUrl: '', active: true });
    setFormError('');
  }

  function toggleActive(id: string) {
    setDeals(deals.map(d => d.id === id ? { ...d, active: !d.active } : d));
  }

  function deleteDeal(id: string) {
    if (!confirm('Delete this deal?')) return;
    setDeals(deals.filter(d => d.id !== id));
    toast.success('Deal removed.');
  }

  function selectPlan(planId: string) {
    setCurrentPlan(planId);
    toast.success(planId === 'paypg' ? 'Pay-as-you-post selected. Create your first deal!' : `${SUBSCRIPTION_PLANS.find(p => p.id === planId)?.name} plan activated!`);
    setShowPricingModal(false);
    setShowModal(true);
  }

  function discountLabel(deal: Deal) {
    if (deal.discountType === 'percent') return `${deal.discountValue}% OFF`;
    if (deal.discountType === 'dollar') return `$${deal.discountValue} OFF`;
    if (deal.discountType === 'bogo') return 'BOGO';
    if (deal.discountType === 'free-service') return 'FREE SERVICE';
    return 'DEAL';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Tag className="w-6 h-6 text-orange-500" /> Deals & Offers
          </h2>
          <p className="text-sm text-gray-400">Create special deals visible to Black Phoenix customers. Choose a plan to get started.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPricingModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/40 text-gray-300 hover:text-white rounded-lg text-sm transition-all"
          >
            <CreditCard className="w-4 h-4" />
            {currentPlan === 'none' ? 'Choose a Plan' : `Plan: ${activePlan?.name || 'Pay-per-post'}`}
          </button>
          <button
            onClick={() => { if (currentPlan === 'none') { setShowPricingModal(true); } else { setShowModal(true); } }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Create Deal
          </button>
        </div>
      </div>

      {/* Current Plan Banner */}
      {currentPlan === 'none' ? (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-orange-300 font-semibold mb-1">No active plan — deals are not live yet</p>
            <p className="text-gray-400 text-sm">Select a subscription plan or pay per post to start showing deals to customers.</p>
          </div>
          <button onClick={() => setShowPricingModal(true)} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-all flex-shrink-0">
            View Plans
          </button>
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${activePlan?.color || 'from-gray-600 to-gray-700'} flex items-center justify-center`}>
              {activePlan ? <Crown className="w-4 h-4 text-white" /> : <Zap className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{activePlan?.name || 'Pay-as-you-post'} plan active</p>
              <p className="text-gray-500 text-xs">{activeDeals.length} of {maxDeals === 999 ? 'unlimited' : maxDeals} deals active</p>
            </div>
          </div>
          <button onClick={() => setShowPricingModal(true)} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">Change plan →</button>
        </div>
      )}

      {/* Deals Grid */}
      {deals.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#2A2A2A] rounded-2xl">
          <BadgePercent className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium mb-2">No deals yet</p>
          <p className="text-gray-600 text-sm mb-6">Create a deal to attract new customers and drive more business.</p>
          <button onClick={() => currentPlan === 'none' ? setShowPricingModal(true) : setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Create Your First Deal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => (
            <div key={deal.id} className={`bg-[#1A1A1A] border rounded-xl transition-all ${deal.active ? 'border-orange-500/30' : 'border-[#2A2A2A] opacity-60'}`}>
              <div className="p-4 flex items-start gap-4">
                {/* Discount badge */}
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex flex-col items-center justify-center text-white">
                  <span className="text-xs font-black leading-tight text-center px-1">{discountLabel(deal)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{deal.title}</p>
                      {deal.description && <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{deal.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {deal.promoCode && <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">{deal.promoCode}</span>}
                        {deal.expiresAt && <span className="text-xs text-gray-600">Expires {new Date(deal.expiresAt).toLocaleDateString()}</span>}
                        <span className="text-xs px-2 py-0.5 rounded bg-[#0A0A0A] text-gray-500 capitalize">{deal.plan === 'paypg' ? 'Pay-per-post' : deal.plan}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => toggleActive(deal.id)}
                        className={`p-1.5 rounded-lg transition ${deal.active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#2A2A2A] text-gray-500 hover:bg-[#353535]'}`}
                        title={deal.active ? 'Deactivate' : 'Activate'}>
                        {deal.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}
                        className="p-1.5 rounded-lg bg-[#2A2A2A] text-gray-400 hover:bg-[#353535] transition">
                        {expandedDeal === deal.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteDeal(deal.id)}
                        className="p-1.5 rounded-lg bg-[#2A2A2A] text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {expandedDeal === deal.id && (
                <div className="px-4 pb-4 pt-0 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#2A2A2A] mt-0 text-xs">
                  {deal.originalPrice && <div className="bg-[#0A0A0A] rounded-lg p-2"><p className="text-gray-500 mb-0.5">Original Price</p><p className="text-white font-medium">${deal.originalPrice}</p></div>}
                  <div className="bg-[#0A0A0A] rounded-lg p-2"><p className="text-gray-500 mb-0.5">Posted</p><p className="text-white font-medium">{new Date(deal.postedAt).toLocaleDateString()}</p></div>
                  <div className="bg-[#0A0A0A] rounded-lg p-2"><p className="text-gray-500 mb-0.5">Status</p><p className={deal.active ? 'text-green-400 font-medium' : 'text-gray-500 font-medium'}>{deal.active ? 'Live' : 'Paused'}</p></div>
                  {deal.imageUrl && <div className="col-span-2 sm:col-span-4"><img src={deal.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg" /></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE DEAL MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Tag className="w-5 h-5 text-orange-500" /> Create a Deal</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Title <span className="text-orange-500">*</span></label>
                <input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. 15% Off Any Electrical Job This Month"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  placeholder="What does this deal include? Any conditions?"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Discount Type</label>
                  <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                    <option value="percent">% Percent Off</option>
                    <option value="dollar">$ Dollar Off</option>
                    <option value="bogo">Buy One Get One</option>
                    <option value="free-service">Free Service</option>
                  </select>
                </div>
                {form.discountType !== 'bogo' && form.discountType !== 'free-service' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Value <span className="text-orange-500">*</span></label>
                    <input type="number" value={form.discountValue || ''} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                      placeholder={form.discountType === 'percent' ? '15' : '50'}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Original Price (optional)</label>
                  <input value={form.originalPrice || ''} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
                    placeholder="e.g. 200" className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Promo Code (optional)</label>
                  <input value={form.promoCode || ''} onChange={e => setForm(f => ({ ...f, promoCode: e.target.value.toUpperCase() }))}
                    placeholder="SAVE15" className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm font-mono outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Expires On</label>
                  <input type="date" value={form.expiresAt || ''} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Image URL (optional)</label>
                  <input value={form.imageUrl || ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="https://..." className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                </div>
              </div>
              {formError && <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2.5 bg-[#2A2A2A] hover:bg-[#353535] rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 rounded-lg text-sm font-bold transition-all">
                  Post Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRICING MODAL ── */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <div>
                <h3 className="text-lg font-bold text-white">Choose Your Plan</h3>
                <p className="text-gray-500 text-sm mt-0.5">Start posting deals to Black Phoenix customers</p>
              </div>
              <button onClick={() => setShowPricingModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Billing toggle */}
              <div className="flex items-center justify-center gap-3">
                <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
                <button onClick={() => setBillingCycle(c => c === 'monthly' ? 'annual' : 'monthly')}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${billingCycle === 'annual' ? 'bg-orange-600' : 'bg-[#2A2A2A]'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-white' : 'text-gray-500'}`}>Annual <span className="text-green-400 text-xs font-bold">Save 17%</span></span>
              </div>

              {/* Pay-as-you-post */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-gray-500/40 rounded-xl p-5 flex items-center gap-5 cursor-pointer transition-all" onClick={() => selectPlan('paypg')}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{PAYPG.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">No commitment</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PAYPG.features.map(f => <span key={f} className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-gray-500" />{f}</span>)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-black text-white">{PAYPG.price}</p>
                  <p className="text-xs text-gray-500">{PAYPG.unit}</p>
                </div>
              </div>

              {/* Subscription plans */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SUBSCRIPTION_PLANS.map(plan => (
                  <div key={plan.id} onClick={() => selectPlan(plan.id)}
                    className={`relative bg-[#1A1A1A] border ${plan.border} hover:brightness-110 rounded-xl p-5 cursor-pointer transition-all flex flex-col ${currentPlan === plan.id ? 'ring-2 ring-orange-500' : ''}`}>
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-full text-xs font-black text-white whitespace-nowrap">
                        {plan.badge}
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white font-bold mb-1">{plan.name}</p>
                    <div className="mb-3">
                      <span className="text-2xl font-black text-white">{billingCycle === 'annual' ? plan.annualPrice : plan.price}</span>
                      <span className="text-gray-500 text-xs">{billingCycle === 'annual' ? '/yr' : plan.period}</span>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="text-xs text-gray-400 flex items-start gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>
                    <button className={`mt-4 w-full py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${plan.color} transition-opacity hover:opacity-90`}>
                      {currentPlan === plan.id ? '✓ Current Plan' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-center text-gray-600 text-xs">Plans activate immediately. Cancel anytime. Questions? Contact us at info@theblackphoenixcompany.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
