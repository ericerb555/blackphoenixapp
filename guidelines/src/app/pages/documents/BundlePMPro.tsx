import { DocSection, DocCallout, DocStats, DocSteps, P } from './DocComponents';
import { BookOpen, FileText, Calculator, Calendar, ExternalLink } from 'lucide-react';

export default function BundlePMPro() {
  const nav = (id: string) => (window as any).__navigateApp?.(`/document?id=${id}`);
  const items = [
    { icon: BookOpen, color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', id: 'eb-capital-planning', title: 'Capital Planning for Property Managers', detail: '45 pages', value: '$34', desc: '10-year capital planning framework with reserve study interpretation, funding models, and project execution guide.' },
    { icon: FileText, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', id: 'tmpl-vendor-contract', title: 'Vendor Contract Template Pack', detail: '5 contracts', value: '$59', desc: 'HVAC, landscaping/snow, cleaning, handyman, and property management agreement — all NH-specific.' },
    { icon: Calculator, color: 'text-lime-400', border: 'border-lime-500/30', bg: 'bg-lime-500/10', id: 'calc-roi', title: 'Property ROI Calculator', detail: 'Interactive', value: '$39', desc: 'Cash-on-cash return, cap rate, NOI, DSCR, and 10-year equity projection for any residential or commercial property.' },
    { icon: Calendar, color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10', id: 'maint-annual-planner', title: 'Annual Maintenance Planner', detail: '12-month + budget tracker', value: '$24', desc: 'Month-by-month checklists, vendor scheduling, and annual budget tracker — NH-specific seasonal timelines.' },
  ];

  return (
    <div>
      <div className="mb-10 p-8 bg-gradient-to-br from-orange-950/60 to-[#111] border border-orange-500/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-xs font-bold text-orange-300">BUNDLE — SAVE $100</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-2">Property Manager Pro Bundle</h1>
        <p className="text-orange-300 text-lg mb-4">The complete professional toolkit for NH property managers</p>
        <DocStats stats={[
          { label: 'Products', value: '4', color: 'text-orange-400' },
          { label: 'Total Value', value: '$156', color: 'text-gray-400' },
          { label: 'You Save', value: '$100', color: 'text-green-400' },
          { label: 'Bundle Price', value: '$199', color: 'text-orange-400' },
        ]} />
      </div>

      <DocCallout type="key" title="Who This Bundle is For">
        Professional property managers managing multiple units, condo associations, or commercial properties in NH. This toolkit covers capital planning, vendor relationships, investment analysis, and year-round maintenance — everything you need to operate at a professional level.
      </DocCallout>

      <DocSection id="contents" title="What's Included">
        <div className="grid gap-4 my-4">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={`p-5 rounded-xl border ${item.border} ${item.bg}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
                    <div>
                      <p className="font-bold text-white text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.detail}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{item.desc}</p>
                <button onClick={() => nav(item.id)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
                  <ExternalLink className="w-3 h-3" /> Open document →
                </button>
              </div>
            );
          })}
        </div>
        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl mt-4">
          <p className="text-sm text-gray-400">Individual value: <span className="line-through">$156</span></p>
          <p className="text-xl font-black text-orange-400">Bundle price: $199 — you save $100 vs. buying separately</p>
        </div>
      </DocSection>

      <DocSection id="quick-start" title="Getting Started with the Pro Bundle">
        <DocSteps steps={[
          { title: 'Run a capital plan for each property you manage', body: 'Open the Capital Planning Guide and use the component inventory section for each property. Know your reserve status across your entire portfolio.', badge: 'First Priority' },
          { title: 'Standardize all vendor contracts', body: 'Replace any verbal or informal vendor agreements with the contract templates. Use the vendor qualification checklist before renewing any major contract.' },
          { title: 'Analyze your portfolio ROI', body: 'Use the Property ROI Calculator to run the numbers on each property you manage. Identify underperformers and opportunities to improve returns.' },
          { title: 'Build your annual maintenance schedule', body: 'Customize the Annual Maintenance Planner for each property. Set calendar reminders for key seasonal tasks and vendor service calls.' },
        ]} />
      </DocSection>

      {items.map(item => {
        const Icon = item.icon;
        return (
          <DocSection key={item.id} id={item.id.replace(/^(eb|tmpl|calc|maint)-/, '')} title={item.title}>
            <P>{item.desc}</P>
            <button onClick={() => nav(item.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${item.bg} border ${item.border} ${item.color} hover:text-white`}>
              <Icon className="w-4 h-4" /> Open {item.title} →
            </button>
          </DocSection>
        );
      })}
    </div>
  );
}
