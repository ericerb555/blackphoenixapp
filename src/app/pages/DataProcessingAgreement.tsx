/**
 * Data Processing Agreement — DRAFT, for review.
 *
 * Eric: "can we make the docs u flagged."
 *
 * WHY THIS ONE MATTERS MORE THAN IT LOOKS
 *
 * Black Phoenix is a processor of its customers' data and a SUB-processor
 * chain starts here: photographs of the inside of somebody's home go to
 * Anthropic and OpenAI, payments to Stripe, texts to Bird. Any commercial
 * client's procurement will ask for that list and for the right to object to
 * changes in it, and a contractor who cannot produce one loses the contract to
 * one who can.
 *
 * The list in section 5 is the same one now published in the privacy policy,
 * taken from the code rather than from memory. It is the part of this document
 * that is hardest to get right and the part least likely to be wrong.
 *
 * Route keys: dpa, data-processing-agreement.
 */
import { FileLock2, Home } from 'lucide-react';
import DraftNotice from '../components/legal/DraftNotice';

const COMPANY = 'Black Phoenix Builds';
const CONTACT_EMAIL = 'privacy@blackphoenixbuilds.com';
const LAST_UPDATED = 'November 14, 2026';

/**
 * Every company that receives personal data, and what for.
 *
 * Kept identical to the privacy policy's table on purpose: a client who finds
 * two different sub-processor lists on the same website has found a reason to
 * doubt both. If you add an outbound integration, it belongs in both places.
 */
const SUBPROCESSORS: Array<[string, string, string]> = [
  ['Supabase', 'United States', 'Database, authentication, and private file storage'],
  ['Vercel', 'United States', 'Hosting of the web application'],
  ['Cloudflare', 'United States', 'Security filtering and delivery; all traffic passes through'],
  ['Anthropic', 'United States', 'AI reading of photographs, video frames and job descriptions'],
  ['OpenAI', 'United States', 'AI reading of photographs, drawings and project descriptions'],
  ['Stripe', 'United States', 'Card and bank payment processing'],
  ['Resend', 'United States', 'Transactional email delivery'],
  ['Bird', 'United States', 'SMS delivery'],
  ['MapTiler / OpenStreetMap', 'EU / global', 'Mapping and geocoding of service addresses'],
  ['CJdropshipping', 'China / global', 'Fulfilment of store orders'],
];

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="text-lg font-semibold text-white mb-2">{n}. {title}</h2>
    <div className="space-y-2">{children}</div>
  </section>
);

export default function DataProcessingAgreement({ onNavigate }: { onNavigate?: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#ea580c]/10 flex items-center justify-center">
            <FileLock2 className="w-6 h-6 text-[#ea580c]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Data Processing Agreement</h1>
            <p className="text-sm text-gray-400">Draft prepared {LAST_UPDATED}</p>
          </div>
        </div>

        <DraftNotice
          what="agreement"
          review={[
            'Whether GDPR, UK GDPR or CCPA/CPRA apply to you at all, and which clauses change if they do.',
            'The transfer mechanism in section 7 — Standard Contractual Clauses are named but not attached or completed.',
            'Whether sending customer photographs to AI providers needs its own consent rather than contract terms.',
            'The liability position in section 11, which currently defers entirely to the Master Service Agreement.',
            'Breach notification timing in section 8 — 72 hours is the GDPR figure, not necessarily your obligation.',
          ]}
        />

        <div className="mt-6 space-y-8 text-[15px] leading-relaxed text-gray-300">
          <Section n="1" title="Parties and roles">
            <p>
              This agreement is between {COMPANY} ("Processor") and the customer identified in
              the Master Service Agreement or order it is attached to ("Controller").
            </p>
            <p>
              Where the Controller provides personal data about its own clients, tenants,
              employees or contacts, the Controller decides why and how that data is processed
              and the Processor acts only on the Controller's documented instructions. Where
              {' '}{COMPANY} collects data about its own customers directly, it acts as a
              controller in its own right and its Privacy Policy governs instead.
            </p>
          </Section>

          <Section n="2" title="Subject matter and duration">
            <p>
              Processing lasts for the term of the underlying agreement and for any retention
              period described in section 9. The subject matter is the provision of
              construction, property and related services and the software platform through
              which they are quoted, scheduled, invoiced and recorded.
            </p>
          </Section>

          <Section n="3" title="Categories of data subject">
            <ul className="list-disc pl-5 space-y-1">
              <li>The Controller's customers and prospective customers</li>
              <li>Tenants, leaseholders and property occupants</li>
              <li>The Controller's own staff, crew and subcontractors</li>
              <li>Anyone depicted or identifiable in photographs or video submitted</li>
            </ul>
          </Section>

          <Section n="4" title="Categories of personal data">
            <ul className="list-disc pl-5 space-y-1">
              <li>Identity and contact details — name, email, telephone, postal address</li>
              <li>Service address and location data, including approximate or precise geolocation where permitted</li>
              <li>Financial data — invoices, payments, deposits, gratuities; card details are handled by Stripe and are never held by {COMPANY}</li>
              <li>
                <strong className="text-white">Photographs and video of premises</strong>, including
                the interiors of private homes, submitted for estimating and job records
              </li>
              <li>Correspondence and free text submitted through the platform</li>
              <li>Employment-related data where crew are assigned to jobs, including gratuities payable</li>
            </ul>
            <p className="text-sm text-gray-400">
              No special category data is requested. Photographs of a home may nonetheless
              reveal it incidentally, which is why section 6 restricts what is done with them.
            </p>
          </Section>

          <Section n="5" title="Sub-processors">
            <p>
              The Controller authorises the following sub-processors. {COMPANY} remains liable
              for their performance.
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4 font-semibold">Sub-processor</th>
                    <th className="py-2 pr-4 font-semibold">Location</th>
                    <th className="py-2 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {SUBPROCESSORS.map(([name, where, why]) => (
                    <tr key={name} className="border-b border-white/10 align-top">
                      <td className="py-2 pr-4 font-semibold text-white whitespace-nowrap">{name}</td>
                      <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{where}</td>
                      <td className="py-2 text-gray-300">{why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              {COMPANY} will give the Controller at least 30 days' notice before adding or
              replacing a sub-processor. The Controller may object on reasonable data
              protection grounds, in which case the parties will discuss alternatives in good
              faith and, failing that, the Controller may terminate the affected service.
            </p>
          </Section>

          <Section n="6" title="Automated processing of images">
            <p>
              Photographs and video frames submitted for estimating are transmitted to the AI
              sub-processors named above so that their systems can describe the contents. The
              following restrictions apply and are enforced in the software, not only here:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The AI is asked what it can see. It is never asked what to charge; pricing is computed by {COMPANY}'s own code from its own rate card.</li>
              <li>Images are stored in private buckets and are reachable only through short-lived signed links.</li>
              <li>Images are retained with the estimate they produced, because they are the evidence of what a price was based on.</li>
              <li>No automated decision producing a legal or similarly significant effect is taken without human involvement; an estimate is not binding and a person confirms it.</li>
            </ul>
          </Section>

          <Section n="7" title="International transfers">
            <p>
              Sub-processors are located principally in the United States. Where personal data
              originating in the UK or EEA is transferred, the parties intend to rely on
              Standard Contractual Clauses together with any applicable UK Addendum.
            </p>
            <p className="text-sm text-amber-300/80">
              Those clauses are referenced but not attached or completed in this draft. They
              need to be selected, populated and appended before this is used.
            </p>
          </Section>

          <Section n="8" title="Security and breach notification">
            <p>
              {COMPANY} maintains technical and organisational measures appropriate to the
              risk, including transport encryption, private storage for uploaded media,
              role-based access control, and a firewall in front of the application.
            </p>
            <p>
              On becoming aware of a personal data breach affecting the Controller's data,
              {' '}{COMPANY} will notify the Controller without undue delay and in any event
              within 72 hours, with the information then available, and will supplement it as
              more becomes known.
            </p>
          </Section>

          <Section n="9" title="Retention, return and deletion">
            <p>
              On termination the Controller may request return or deletion of personal data.
              {' '}{COMPANY} will comply within 60 days, except where retention is required by
              law, or where a record is needed to defend a claim — including the photographs
              and estimates underlying a disputed price, and financial records retained for tax
              purposes.
            </p>
          </Section>

          <Section n="10" title="Assistance and audit">
            <p>
              {COMPANY} will assist the Controller in responding to data subject requests, in
              carrying out impact assessments, and in demonstrating compliance. It will make
              available the information reasonably necessary for that purpose and will allow
              audits on reasonable notice, no more than once in any twelve months unless
              required by a regulator or following a breach.
            </p>
          </Section>

          <Section n="11" title="Liability">
            <p>
              Liability under this agreement is governed by, and subject to, the limitations in
              the Master Service Agreement it is attached to.
            </p>
            <p className="text-sm text-amber-300/80">
              Whether that is acceptable, and whether it is even enforceable for statutory data
              protection claims, is a question for a lawyer.
            </p>
          </Section>

          <Section n="12" title="Contact">
            <p>
              Data protection enquiries: <span className="text-white">{CONTACT_EMAIL}</span>
            </p>
          </Section>
        </div>

        <button
          onClick={() => onNavigate?.('landing')}
          className="mt-10 inline-flex items-center gap-2 text-sm font-bold text-orange-400"
        >
          <Home className="w-4 h-4" /> Back to the site
        </button>
      </div>
    </div>
  );
}
