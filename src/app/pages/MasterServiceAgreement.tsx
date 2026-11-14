/**
 * Master Service Agreement — DRAFT, for review.
 *
 * Eric: "can we make the docs u flagged."
 *
 * WHAT MAKES THIS DRAFT WORTH ANYTHING
 *
 * Not the boilerplate — anybody can buy that. The value is that the clauses
 * describing how work is actually priced and changed here were written from
 * the software rather than from a template:
 *
 *   section 3   an estimate from photographs is not a quote and is not
 *               binding, because that is precisely how the junk and demo
 *               estimator behaves
 *   section 5   the change order flow, including the right to decline, which
 *               matches what ChangeOrderApproval actually does
 *   section 6   deposits at 30%, which is DEPOSIT_RATE in the code
 *   section 9   concealed conditions, carried over from the clause already
 *               shown on the quote approval page
 *
 * A lawyer reviewing this is checking consequences, not discovering facts.
 *
 * Route keys: msa, master-service-agreement.
 */
import { FileSignature, Home } from 'lucide-react';
import DraftNotice from '../components/legal/DraftNotice';

const COMPANY = 'Black Phoenix Builds';
const CONTACT_EMAIL = 'blackphoenixbuilds@proton.me';
const LAST_UPDATED = 'November 14, 2026';
const STATE = 'New Hampshire';

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="text-lg font-semibold text-white mb-2">{n}. {title}</h2>
    <div className="space-y-2">{children}</div>
  </section>
);

export default function MasterServiceAgreement({ onNavigate }: { onNavigate?: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#ea580c]/10 flex items-center justify-center">
            <FileSignature className="w-6 h-6 text-[#ea580c]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Master Service Agreement</h1>
            <p className="text-sm text-gray-400">Draft prepared {LAST_UPDATED}</p>
          </div>
        </div>

        <DraftNotice
          what="agreement"
          review={[
            'The limitation of liability in section 12 — the cap is set at fees paid, which a commercial client may refuse and which may not hold for personal injury or property damage.',
            'The indemnity in section 13, which is currently one-way.',
            `Whether ${STATE} home improvement and contractor licensing rules impose terms this does not contain, particularly for residential work.`,
            'Lien rights and the notices that must be given to preserve them.',
            'Whether the arbitration clause in section 16 is enforceable against consumers here, and whether you want it at all.',
            'Insurance limits in section 11 — the figures are blanks to be filled from your actual certificates.',
          ]}
        />

        <div className="mt-6 space-y-8 text-[15px] leading-relaxed text-gray-300">
          <Section n="1" title="The agreement">
            <p>
              This Master Service Agreement is between {COMPANY} ("we", "us") and the client
              named on the accepted quote or order ("you"). It governs every piece of work we
              do for you. A quote, contract or work order sets out the specific scope, price
              and dates; where one conflicts with this agreement, the quote governs for that
              job only.
            </p>
          </Section>

          <Section n="2" title="Services">
            <p>
              We provide construction, renovation, demolition, junk removal, property
              maintenance and related services, together with access to our online portal for
              requesting work, approving prices, signing documents and making payments.
            </p>
          </Section>

          <Section n="3" title="Estimates are not quotes">
            <p>
              Our portal can produce an <strong className="text-white">estimate</strong> from
              photographs and video you supply, usually within a minute and without anybody
              visiting. An estimate is an indication, not an offer, and we are not bound by it.
            </p>
            <p>
              A <strong className="text-white">quote</strong> is prepared by us, carries a
              reference number, states what is and is not included, and is capable of
              acceptance. Only a quote becomes a contract, and only once you accept it.
            </p>
            <p>
              An estimate states the basis it was produced on: what the pictures showed, what
              was assumed, what could not be seen, what is excluded, and the rates by which the
              price would change. Those statements form part of any quote that follows from it.
            </p>
          </Section>

          <Section n="4" title="Your responsibilities">
            <ul className="list-disc pl-5 space-y-1">
              <li>Give us safe and timely access to the site, and somewhere lawful to park and load.</li>
              <li>Tell us about anything we could not reasonably see — what is behind a stack, what is in a loft, where the services run.</li>
              <li>Hold the necessary permissions, and tell us where consent, a permit or a freeholder's agreement is needed.</li>
              <li>Remove or identify anything you do not want taken or disturbed.</li>
              <li>Where you supply photographs, ensure you are entitled to and that they show what needs doing.</li>
            </ul>
          </Section>

          <Section n="5" title="Changes on the day">
            <p>
              If what we find differs from what was priced — more volume, worse access, or
              something we are not permitted to carry — we will stop, photograph the
              difference, price it at the rates stated on the quote, and send it to you for
              approval before continuing.
            </p>
            <p>
              <strong className="text-white">You may decline.</strong> If you do, we complete
              what was agreed and leave the rest, and you pay only for what was done. Nothing
              extra is charged without your approval, and a change does not alter the price of
              anything already correctly priced.
            </p>
          </Section>

          <Section n="6" title="Prices, deposits and payment">
            <ul className="list-disc pl-5 space-y-1">
              <li>Prices are as stated on the accepted quote and exclude tax unless stated.</li>
              <li>A deposit of 30% is payable on acceptance of a quote unless we agree otherwise in writing.</li>
              <li>Invoices are payable on the terms stated on them.</li>
              <li>Gratuities are voluntary, are passed to the crew who did the work, and are never required.</li>
              <li>Where you supply materials, we are not responsible for their suitability or availability.</li>
            </ul>
          </Section>

          <Section n="7" title="Scheduling">
            <p>
              Dates are estimates unless expressly agreed as fixed. We will tell you promptly
              about delays caused by weather, access, supply or anything outside our reasonable
              control.
            </p>
          </Section>

          <Section n="8" title="What we will not take or do">
            <p>
              We will not transport pressurised cylinders, suspected asbestos or vermiculite,
              bulk paints, solvents or fuels, or medical or biological waste. Where such items
              are found, they are removed from scope and from the price, and we will tell you
              who can deal with them.
            </p>
            <p>
              Work requiring a licensed trade, engineering sign-off or a permit is not included
              unless the quote says so expressly.
            </p>
          </Section>

          <Section n="9" title="Concealed and unforeseen conditions">
            <p>
              Our prices are based on the conditions visible and accessible when they were
              prepared. If we find a concealed condition — rot, structural defect, unsafe
              wiring, contamination, or anything hidden behind a finished surface — we will
              stop work in that area, tell you in writing what we found and what it will cost
              to put right, and wait for your written approval before continuing.
            </p>
          </Section>

          <Section n="10" title="Warranty">
            <p>
              We warrant our workmanship for twelve months from completion. Manufacturers'
              warranties on materials pass to you. The warranty does not cover damage from
              misuse, neglect, alteration by others, or normal wear.
            </p>
          </Section>

          <Section n="11" title="Insurance">
            <p>
              We maintain general liability, workers' compensation as required by{' '}
              {STATE} law, commercial auto, and cyber liability insurance. Certificates are
              available on request.
            </p>
            <p className="text-sm text-amber-300/80">
              Limits are deliberately left blank in this draft. Fill them from your actual
              certificates, and do not state cover you do not hold — a client relying on this
              clause will ask for the certificate.
            </p>
          </Section>

          <Section n="12" title="Limitation of liability">
            <p>
              Neither party is liable for indirect, incidental or consequential loss, or for
              loss of profit, revenue or data. Our total liability arising out of or in
              connection with any job is limited to the fees paid for that job.
            </p>
            <p>
              Nothing in this agreement limits liability for death or personal injury caused by
              negligence, for fraud, or for anything else that cannot lawfully be limited.
            </p>
          </Section>

          <Section n="13" title="Indemnity">
            <p>
              You will indemnify us against claims arising from information you gave us that
              was inaccurate or incomplete, from your failure to obtain a necessary permission,
              or from conditions at the site that you knew about and did not disclose.
            </p>
          </Section>

          <Section n="14" title="Your data">
            <p>
              Our handling of personal data is described in our Privacy Policy. Where we
              process personal data on your behalf, the Data Processing Agreement applies and
              forms part of this agreement.
            </p>
            <p>
              Photographs and video you submit are retained as the record of what a price was
              based on. We may use anonymised images of completed work as examples unless you
              tell us in writing not to.
            </p>
          </Section>

          <Section n="15" title="Term and termination">
            <p>
              Either party may terminate on written notice if the other materially breaches and
              does not remedy it within 14 days. On termination you pay for work properly
              performed and for materials ordered that cannot be returned.
            </p>
          </Section>

          <Section n="16" title="Governing law and disputes">
            <p>
              This agreement is governed by the laws of the State of {STATE}. The parties will
              attempt to resolve any dispute in good faith before commencing proceedings.
            </p>
            <p className="text-sm text-amber-300/80">
              No arbitration clause has been drafted here. Whether to require arbitration, and
              whether it binds consumers in {STATE}, is a decision for you and your lawyer.
            </p>
          </Section>

          <Section n="17" title="General">
            <p>
              This agreement, together with the accepted quote and any document it incorporates,
              is the entire agreement between the parties. If a provision is unenforceable, the
              rest continues. Neither party may assign without the other's consent, except as
              part of a sale of the business.
            </p>
            <p>Questions: <span className="text-white">{CONTACT_EMAIL}</span></p>
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
