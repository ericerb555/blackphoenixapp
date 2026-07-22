import { DocSection, DocCallout, DocStats, DocSteps, P } from './DocComponents';
import { BookOpen, Calendar, Calculator, ExternalLink } from 'lucide-react';

export default function BundleCondoComplete() {
  const nav = (id: string) => (window as any).__navigateApp?.(`/document?id=${id}`);
  const items = [
    { icon: BookOpen, color: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-500/10', id: 'eb-condo-board', title: 'Condo Board Governance Handbook', detail: '72 pages · RSA 356-B guide', value: '$24', desc: 'Complete guide to board roles, fiduciary duties, meeting procedures, financials, reserves, vendor management, and owner relations.' },
    { icon: Calendar, color: 'text-violet-300', border: 'border-violet-400/20', bg: 'bg-violet-400/5', id: 'tmpl-board-meeting', title: 'Board Meeting Package', detail: '6 templates', value: '$24', desc: 'Agenda, minutes, action tracker, owner notice, proxy form, and annual meeting package — all RSA 356-B compliant.' },
    { icon: Calculator, color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', id: 'calc-reserve', title: 'Reserve Fund Adequacy Calculator', detail: 'Interactive Excel-style', value: '$29', desc: 'Calculate your percent-funded score, project depletion, and model 3 contribution scenarios.' },
  ];

  return (
    <div>
      <div className="mb-10 p-8 bg-gradient-to-br from-violet-950/60 to-[#111] border border-violet-500/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-violet-500/20 border border-violet-500/30 rounded-full text-xs font-bold text-violet-300">BUNDLE — SAVE $28</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-2">Condo Board Complete Bundle</h1>
        <p className="text-violet-300 text-lg mb-4">The full governance toolkit for NH condominium association boards</p>
        <DocStats stats={[
          { label: 'Products', value: '3', color: 'text-violet-400' },
          { label: 'Templates', value: '6', color: 'text-violet-400' },
          { label: 'You Save', value: '$28', color: 'text-green-400' },
          { label: 'RSA 356-B', value: 'Covered', color: 'text-teal-400' },
        ]} />
      </div>

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
        <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl mt-4">
          <p className="text-sm text-gray-400 line-through">Individual total: $77</p>
          <p className="text-xl font-black text-violet-400">Bundle price: $149 — includes all three</p>
        </div>
      </DocSection>

      <DocSection id="quick-start" title="Quick Start for New Board Members">
        <DocSteps steps={[
          { title: 'Read the Governance Handbook', body: 'Start with the Condo Board Governance Handbook. Pay special attention to the fiduciary duty section — this is your legal responsibility as a board member.', badge: 'Week 1' },
          { title: 'Run your reserve fund assessment', body: 'Open the Reserve Fund Calculator, enter your component inventory and current balance. Know your percent-funded score before your next board meeting.', badge: 'Week 2' },
          { title: 'Standardize your meetings', body: 'Use the Board Meeting Package templates for every meeting going forward. Consistent minutes and agendas protect the board legally and build owner confidence.', badge: 'Week 3' },
        ]} />
      </DocSection>

      {items.map(item => {
        const Icon = item.icon;
        return (
          <DocSection key={item.id} id={item.id.replace('eb-', '').replace('tmpl-', '').replace('calc-', '')} title={item.title}>
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
