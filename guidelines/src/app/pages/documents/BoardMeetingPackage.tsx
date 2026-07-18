import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, DocTable, DocLink, P, UL, Bold, PageBreak } from './DocComponents';

function Field({ label, width = "medium" }: { label: string; width?: "small" | "medium" | "large" | "full" }) {
  const widths = { small: "w-20", medium: "w-40", large: "w-64", full: "w-full" };
  return (
    <span className={`inline-block ${widths[width]} border-b-2 border-orange-500/40 bg-orange-500/5 px-1.5 py-0.5 text-orange-300 text-xs font-mono rounded-sm`}>
      {label}
    </span>
  );
}

interface ActionItem {
  action: string;
  owner: string;
  due: string;
  status: 'open' | 'in-progress' | 'complete';
  notes: string;
}

const STATUS_COLORS = {
  open: 'bg-gray-500/20 text-gray-300',
  'in-progress': 'bg-yellow-500/20 text-yellow-300',
  complete: 'bg-green-500/20 text-green-300',
};

export default function BoardMeetingPackage() {
  const [items, setItems] = useState<ActionItem[]>([
    { action: "Get 3 bids for roof repair", owner: "Property Manager", due: "2025-02-15", status: "open", notes: "Priority item" },
    { action: "Update reserve fund analysis", owner: "Treasurer", due: "2025-03-01", status: "in-progress", notes: "" },
  ]);

  const addRow = () => {
    setItems(prev => [...prev, { action: "", owner: "", due: "", status: "open", notes: "" }]);
  };

  const updateItem = (i: number, field: keyof ActionItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  };

  const removeItem = (i: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <DocSection id="intro" title="Board Meeting Package" subtitle="Professional templates for HOA and condo board meetings">
        <DocCallout type="key" title="Why Proper Minutes Matter">
          Meeting minutes are the official legal record of board decisions. In the event of a lawsuit, dispute, or lender audit, minutes are the primary evidence of how decisions were made and whether proper authority existed. Incomplete or missing minutes expose boards and boards members personally.
        </DocCallout>

        <DocSubSection title="Robert's Rules Basics">
          <DocTable
            headers={["Term", "Definition", "Usage"]}
            rows={[
              ["Motion", "A formal proposal for the board to take action", '"I move that we approve the 2025 budget as presented"'],
              ["Second", "Another member agreeing the motion is worth discussing", '"Seconded" — must come from a different member than the mover'],
              ["Quorum", "Minimum number of members required to conduct business", "Defined in bylaws; typically majority of board members"],
              ["Amendment", "A proposed change to the motion before a vote", "Must be moved and seconded separately from main motion"],
              ["Table", "Postpone discussion of a motion to a later time", "Requires a motion and majority vote"],
              ["Call the Question", "End debate and proceed immediately to vote", "Requires 2/3 majority in most rules"],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Agenda Best Practices">
          <UL items={[
            "Distribute agenda to all board members at least 48 hours before the meeting",
            "Include time estimates for each agenda item to keep meetings on track",
            "Place financial report before action items — financial context drives decisions",
            "Limit open forum to 15 minutes total; have members sign up in advance",
            "Table items that need more research — don't make uninformed decisions",
            "End every meeting with action item review and next meeting date",
          ]} />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="agenda" title="Meeting Agenda Template" subtitle="Formal agenda for HOA/condo board meetings">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm">
          <div className="text-center mb-6">
            <p className="text-xl font-bold text-white"><Field label="Association Name" width="full" /></p>
            <p className="text-gray-400 font-bold mt-1">Board of Directors Meeting — Agenda</p>
            <div className="flex justify-center gap-8 mt-3 text-gray-400 text-xs">
              <span>Date: <Field label="Month DD, YYYY" /></span>
              <span>Time: <Field label="7:00 PM" width="small" /></span>
              <span>Location: <Field label="Meeting Location" width="large" /></span>
            </div>
          </div>

          <ol className="space-y-3 text-gray-300">
            {[
              ["Call to Order", "Board President calls meeting to order", "5 min"],
              ["Roll Call and Quorum Confirmation", "Secretary records attendance; President confirms quorum is present", "5 min"],
              ["Approval of Prior Meeting Minutes", "Motion to approve minutes from " + "___" + " meeting", "5 min"],
              ["Financial Report", "Treasurer presents: income statement, balance sheet, reserve fund status, aged receivables", "10 min"],
              ["Property Manager Report", "Manager presents: maintenance updates, occupancy, vendor issues, open items", "10 min"],
              ["Old Business", "A. [Item from prior meeting]\nB. [Item from prior meeting]", "15 min"],
              ["New Business", "A. [New item requiring board action]\nB. [New item requiring board action]", "20 min"],
              ["Owner Open Forum", "Owners may address the board (3 minutes per speaker, 15 minutes total)", "15 min"],
              ["Action Item Review", "Secretary reads back all action items with assigned owner and due date", "5 min"],
              ["Adjournment", "President adjourns the meeting; announces next meeting date", "2 min"],
            ].map(([item, desc, time], i) => (
              <li key={i} className="flex gap-4 py-2 border-b border-[#1E1E1E] last:border-0">
                <span className="font-bold text-orange-400 flex-shrink-0 w-5">{i + 1}.</span>
                <div className="flex-1">
                  <p className="font-bold text-white">{item}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
                <span className="text-gray-500 text-xs flex-shrink-0">{time}</span>
              </li>
            ))}
          </ol>

          <p className="text-xs text-gray-600 mt-4 text-center">This agenda is for informational purposes. Board members may add items under New Business at the meeting by majority vote.</p>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="minutes" title="Meeting Minutes Template" subtitle="Official record of board decisions">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm leading-relaxed">
          <div className="text-center mb-6">
            <p className="text-lg font-bold text-white"><Field label="Association Name" width="full" /></p>
            <p className="text-gray-400 font-bold">Board of Directors Meeting — Minutes</p>
            <p className="text-gray-500 text-xs mt-1">Date: <Field label="Date" /> | Time: <Field label="Time" width="small" /> | Location: <Field label="Location" width="large" /></p>
          </div>

          <p className="font-bold text-gray-200 mb-2">ATTENDEES</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {["Board President", "Vice President", "Treasurer", "Secretary", "Director at Large", "Property Manager (non-voting)"].map((role, i) => (
              <div key={i} className="flex gap-2 text-xs text-gray-400">
                <span className="text-gray-500 w-28 flex-shrink-0">{role}:</span>
                <Field label="Name" width="medium" />
              </div>
            ))}
          </div>

          <p className="text-gray-300 mb-3"><Bold>QUORUM:</Bold> <Field label="X of Y" width="small" /> board members present. Quorum of <Field label="___" width="small" /> confirmed. Meeting declared in order.</p>

          <p className="font-bold text-gray-200 mb-2 mt-4">MOTIONS MADE AT THIS MEETING</p>
          <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4 mb-4 space-y-4">
            {[1, 2].map(n => (
              <div key={n} className="pb-3 border-b border-[#1E1E1E] last:border-0">
                <p className="text-xs font-bold text-orange-400 mb-1">Motion {n}</p>
                <p className="text-gray-400 text-xs">Motion: <Field label="Full text of motion" width="full" /></p>
                <div className="flex gap-6 mt-1 text-xs text-gray-500">
                  <span>Moved by: <Field label="Name" /></span>
                  <span>Seconded by: <Field label="Name" /></span>
                  <span>Vote: <Field label="X-Y" width="small" /></span>
                  <span>Result: <Field label="Passed / Failed" width="small" /></span>
                </div>
              </div>
            ))}
          </div>

          <p className="font-bold text-gray-200 mb-2">ACTION ITEMS FROM THIS MEETING</p>
          <div className="space-y-2 mb-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex gap-4 text-xs text-gray-400">
                <span className="text-orange-400">{n}.</span>
                <Field label="Action item description" width="full" />
                <span>Owner: <Field label="Name" /></span>
                <span>Due: <Field label="Date" /></span>
              </div>
            ))}
          </div>

          <p className="text-gray-300 text-xs mb-4"><Bold>NEXT MEETING:</Bold> <Field label="Date, Time, Location" width="large" /></p>
          <p className="text-gray-300 text-xs mb-6">Meeting adjourned at <Field label="Time" width="small" /> by President <Field label="Name" />.</p>

          <div className="border-t border-[#3A3A3A] pt-4 flex gap-12">
            <div><div className="border-b border-gray-600 w-48 h-8 mb-1"></div><p className="text-xs text-gray-500">Secretary Signature / Date</p></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">Minutes approved at the <Field label="next meeting date" /> meeting of the Board of Directors.</p>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="action-items" title="Action Item Tracker" subtitle="Interactive table — add, edit, and track all board action items">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                {["Action", "Owner", "Due Date", "Status", "Notes", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-[#1E1E1E]">
                  <td className="px-3 py-2">
                    <input value={item.action} onChange={e => updateItem(i, 'action', e.target.value)}
                      className="w-full bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 min-w-32" placeholder="Describe action..." />
                  </td>
                  <td className="px-3 py-2">
                    <input value={item.owner} onChange={e => updateItem(i, 'owner', e.target.value)}
                      className="w-full bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 min-w-24" placeholder="Owner..." />
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" value={item.due} onChange={e => updateItem(i, 'due', e.target.value)}
                      className="bg-transparent text-gray-200 text-xs outline-none" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={item.status} onChange={e => updateItem(i, 'status', e.target.value as ActionItem['status'])}
                      className={`text-xs font-bold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLORS[item.status]} bg-transparent`}>
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="complete">Complete</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={item.notes} onChange={e => updateItem(i, 'notes', e.target.value)}
                      className="w-full bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 min-w-24" placeholder="Notes..." />
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRow}
          className="mt-3 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-xs font-bold rounded-lg transition">
          + Add Action Item
        </button>
      </DocSection>

      <PageBreak />

      <DocSection id="notice" title="Owner Notice Letter Template" subtitle="Formal meeting announcement">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm leading-relaxed">
          <div className="mb-6">
            <p className="font-bold text-white text-base"><Field label="Association Name" width="large" /></p>
            <p className="text-gray-400 text-xs"><Field label="Association Address" width="full" /></p>
          </div>

          <p className="text-gray-400 text-xs mb-4"><Field label="Date" /></p>

          <p className="text-gray-300 mb-1">Dear <Field label="[Unit Owner Name] / All Owners" width="large" />,</p>

          <p className="text-gray-300 mb-4"><Bold>RE: Notice of Board of Directors Meeting</Bold></p>

          <p className="text-gray-300 mb-4">
            You are hereby notified that the Board of Directors of <Field label="Association Name" width="large" /> will hold its <Field label="Regular / Special" width="small" /> meeting on <Field label="Date and Day" width="medium" /> at <Field label="Time" width="small" /> at the following location:
          </p>

          <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4 mb-4">
            <p className="text-gray-300"><Field label="Meeting Location Name and Address" width="full" /></p>
          </div>

          <p className="text-gray-300 mb-3">The agenda for this meeting will include:</p>
          <ul className="text-gray-400 text-sm space-y-1 mb-4 ml-4">
            <li>• Financial report for <Field label="period" /></li>
            <li>• Property manager update</li>
            <li>• Discussion of <Field label="key topic or project" width="large" /></li>
            <li>• Vote on <Field label="item requiring owner/board vote" width="large" /></li>
            <li>• Owner open forum</li>
          </ul>

          <p className="text-gray-300 mb-4"><Field label="If vote requires owner quorum: Owners are encouraged to attend in person or submit a Proxy Voting Form (attached) to ensure quorum is reached." width="full" /></p>

          <p className="text-gray-300 mb-6">Questions? Contact the management office at <Field label="phone/email" width="medium" />.</p>

          <p className="text-gray-300">Respectfully,</p>
          <div className="border-b border-gray-600 w-48 h-8 mt-4 mb-1"></div>
          <p className="text-xs text-gray-500"><Field label="Secretary Name" />, Secretary</p>
          <p className="text-xs text-gray-500"><Field label="Association Name" width="large" /></p>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="proxy" title="Proxy Voting Form" subtitle="Allow owners to vote without attending">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm leading-relaxed">
          <div className="text-center mb-6">
            <p className="text-lg font-bold text-white">PROXY VOTING FORM</p>
            <p className="text-gray-400 text-xs"><Field label="Association Name" width="large" /></p>
            <p className="text-gray-500 text-xs mt-1">Meeting Date: <Field label="Date" /> | Meeting Location: <Field label="Location" width="large" /></p>
          </div>

          <p className="text-gray-300 mb-4">I, the undersigned, being a Member (Owner) of <Field label="Association Name" width="large" />:</p>

          <div className="space-y-3 mb-6">
            <div className="flex gap-3 items-center">
              <span className="text-gray-400 text-xs w-28 flex-shrink-0">Member Name:</span>
              <Field label="Full Legal Name" width="large" />
            </div>
            <div className="flex gap-3 items-center">
              <span className="text-gray-400 text-xs w-28 flex-shrink-0">Unit / Address:</span>
              <Field label="Unit Number / Address" width="large" />
            </div>
            <div className="flex gap-3 items-center">
              <span className="text-gray-400 text-xs w-28 flex-shrink-0">Phone / Email:</span>
              <Field label="Contact Information" width="large" />
            </div>
          </div>

          <p className="text-gray-300 mb-2">hereby authorize and appoint:</p>
          <div className="bg-[#111] border border-orange-500/20 rounded-lg p-3 mb-4">
            <p className="text-orange-300 font-bold"><Field label="Proxy Holder Full Name" width="large" /></p>
            <p className="text-gray-500 text-xs mt-1">as my proxy to attend and vote on my behalf at the above-referenced meeting.</p>
          </div>

          <p className="font-bold text-gray-200 mb-2">VOTING INSTRUCTIONS</p>
          <p className="text-gray-400 text-xs mb-3">☐ My proxy holder is authorized to vote at their discretion on all matters.</p>
          <p className="text-gray-400 text-xs mb-1">☐ My proxy holder is authorized to vote as specifically instructed below:</p>
          <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-3 mb-6">
            <p className="text-gray-400 text-xs">Matter: <Field label="Describe item" width="full" /> — Vote: ☐ Yes ☐ No ☐ Abstain</p>
            <p className="text-gray-400 text-xs mt-2">Matter: <Field label="Describe item" width="full" /> — Vote: ☐ Yes ☐ No ☐ Abstain</p>
          </div>

          <p className="text-gray-500 text-xs mb-4">This proxy is valid only for the meeting identified above and must be received by the Association Secretary before the meeting is called to order.</p>

          <div className="grid grid-cols-2 gap-8 border-t border-[#3A3A3A] pt-4">
            <div>
              <div className="border-b border-gray-600 h-8 mb-1"></div>
              <p className="text-xs text-gray-500">Member Signature</p>
              <div className="border-b border-gray-600 h-6 mb-1 mt-3"></div>
              <p className="text-xs text-gray-500">Date</p>
            </div>
            <div className="text-xs text-gray-500 flex items-end">
              <p>Submit to: <Field label="Secretary Email/Address" width="large" /></p>
            </div>
          </div>
        </div>
      </DocSection>
    </div>
  );
}
