import { DocSection, DocCallout, DocStats, DocTable, DocSteps, DocLink, P, UL, Bold } from './DocComponents';
import { BookOpen, FileText, ClipboardCheck, ExternalLink } from 'lucide-react';

export default function BundleLandlordStarter() {
  const nav = (id: string) => (window as any).__navigateApp?.(`/document?id=${id}`);
  return (
    <div>
      <div className="mb-10 p-8 bg-gradient-to-br from-orange-950/60 to-[#111] border border-orange-500/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-xs font-bold text-orange-300">BUNDLE — SAVE $121</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-2">Landlord Starter Bundle</h1>
        <p className="text-orange-300 text-lg mb-4">Everything a new NH landlord needs — in one complete package</p>
        <DocStats stats={[
          { label: 'Products Included', value: '3', color: 'text-orange-400' },
          { label: 'Total Pages', value: '165+', color: 'text-orange-400' },
          { label: 'You Save', value: '$121', color: 'text-green-400' },
          { label: 'NH RSA Compliance', value: '100%', color: 'text-teal-400' },
        ]} />
      </div>

      <DocSection id="contents" title="What's Included">
        <div className="grid gap-4 my-4">
          {[
            {
              icon: BookOpen, color: 'text-teal-400', border: 'border-teal-500/30', bg: 'bg-teal-500/10',
              id: 'eb-landlord-ops', title: 'NH Landlord Operations Manual', pages: '85 pages',
              desc: 'Complete RSA 540 guide covering tenant screening, leases, security deposits, habitability, and the full eviction process.',
              value: '$29',
            },
            {
              icon: FileText, color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10',
              id: 'tmpl-nh-lease', title: 'NH Lease Agreement Template Pack', pages: '3 templates + addenda',
              desc: 'Standard 12-month, month-to-month, and room rental agreements — all RSA 540-compliant with pet addendum, move-in checklist, and security deposit receipt.',
              value: '$49',
            },
            {
              icon: ClipboardCheck, color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10',
              id: 'tmpl-inspection', title: 'Property Inspection Report Template', pages: 'Interactive form',
              desc: '16-area move-in/move-out inspection form with condition ratings, photo documentation log, and dual-party signatures.',
              value: '$19',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={`p-5 rounded-xl border ${item.border} ${item.bg}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
                    <div>
                      <p className="font-bold text-white text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.pages}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{item.desc}</p>
                <button onClick={() => nav(item.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
                  <ExternalLink className="w-3 h-3" /> Open document →
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl mt-4">
          <div>
            <p className="text-sm text-gray-400 line-through">Individual total: <span className="font-bold">$97</span></p>
            <p className="text-xl font-black text-orange-400">Bundle price: $89 — save $8</p>
            <p className="text-xs text-gray-500 mt-0.5">Plus $113 in time saved vs. researching NH law yourself</p>
          </div>
        </div>
      </DocSection>

      <DocSection id="quick-start" title="Quick Start Guide" subtitle="New landlord? Do these 5 things first">
        <DocSteps steps={[
          { title: 'Read the Operations Manual cover-to-cover', body: 'Before listing your unit, read the full NH Landlord Operations Manual. Understanding RSA 540 before your first tenant prevents costly mistakes.', badge: 'Start Here' },
          { title: 'Write your screening criteria', body: 'Before taking a single application, document your screening criteria in writing. Income threshold, credit minimum, rental history requirements. Give this document to every applicant.', badge: 'Legal Protection' },
          { title: 'Customize your lease template', body: 'Open the NH Lease Agreement template, fill in your property details, rent amount, and any property-specific rules. Have an attorney review if your situation is complex.' },
          { title: 'Do a move-in inspection', body: 'Use the Inspection Report Template at move-in with your tenant present. Both parties sign. Take photos of every room. This document protects your security deposit.' },
          { title: 'Set up your records system', body: 'Create a folder (physical or digital) for each tenant: signed lease, inspection report, payment records, maintenance requests. This documentation is your legal protection.' },
        ]} />
      </DocSection>

      <DocSection id="landlord-ops" title="NH Landlord Operations Manual">
        <P>The complete 85-page guide to NH landlord law and operations. Click below to open the full interactive document.</P>
        <button onClick={() => nav('eb-landlord-ops')}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600/20 border border-teal-500/30 text-teal-300 hover:text-white rounded-lg text-sm font-semibold transition">
          <BookOpen className="w-4 h-4" /> Open NH Landlord Operations Manual →
        </button>
      </DocSection>

      <DocSection id="lease-pack" title="Lease Agreement Pack">
        <P>Three RSA 540-compliant lease templates plus addenda. Fill, print, and sign.</P>
        <button onClick={() => nav('tmpl-nh-lease')}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 border border-green-500/30 text-green-300 hover:text-white rounded-lg text-sm font-semibold transition">
          <FileText className="w-4 h-4" /> Open NH Lease Template Pack →
        </button>
      </DocSection>

      <DocSection id="inspection" title="Inspection Report Template">
        <P>Interactive move-in/move-out inspection with room-by-room checklists and condition ratings.</P>
        <button onClick={() => nav('tmpl-inspection')}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg text-sm font-semibold transition">
          <ClipboardCheck className="w-4 h-4" /> Open Inspection Report Template →
        </button>
      </DocSection>
    </div>
  );
}
