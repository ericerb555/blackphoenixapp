/**
 * Terms of Service — public, standalone legal page.
 * Linked from the global footer. Route keys: terms, terms-of-service.
 */
import { FileText, Home } from 'lucide-react';

const COMPANY = 'Black Phoenix Builds';
const CONTACT_EMAIL = 'legal@blackphoenixbuilds.com';
const LAST_UPDATED = 'July 19, 2026';
const GOVERNING_STATE = 'Massachusetts';

interface TermsOfServiceProps {
  onNavigate?: (page: string) => void;
}

export default function TermsOfService({ onNavigate }: TermsOfServiceProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-[#ea580c]/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#ea580c]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
            <p className="text-sm text-gray-400">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="mt-6 space-y-8 text-[15px] leading-relaxed text-gray-300">
          <section>
            <p>
              These Terms of Service ("Terms") govern your access to and use of the websites,
              applications, and services (collectively, the "Services") provided by {COMPANY}{' '}
              ("we," "us," or "our"). By accessing or using the Services, you agree to be
              bound by these Terms. If you do not agree, do not use the Services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Eligibility &amp; Accounts</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You must be at least 18 years old and able to form a binding contract.</li>
              <li>
                You are responsible for the information you provide and for keeping your
                account credentials confidential.
              </li>
              <li>
                You are responsible for all activity that occurs under your account. Notify us
                immediately of any unauthorized use.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Use of the Services</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Violate any law or the rights of others.</li>
              <li>Submit false, misleading, or fraudulent information.</li>
              <li>
                Interfere with, disrupt, or attempt to gain unauthorized access to the
                Services or their systems.
              </li>
              <li>
                Copy, resell, or exploit any part of the Services except as expressly
                permitted.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Services, Quotes &amp; Estimates</h2>
            <p>
              Estimates, quotes, and project pricing provided through the Services are for
              informational purposes and may change based on scope, site conditions, materials,
              and other factors. A quote does not constitute a binding contract unless and
              until it is accepted in writing by both parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Orders, Payments &amp; Payouts</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Payments are processed securely by our payment provider (Stripe). By making a
                payment, you agree to their applicable terms.
              </li>
              <li>
                You authorize us to charge your selected payment method for the amounts you
                approve, including applicable taxes and fees.
              </li>
              <li>
                Refunds, cancellations, and deposits are handled according to the terms of your
                specific order, invoice, or service agreement.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Intellectual Property</h2>
            <p>
              The Services, including all content, software, logos, and trademarks, are owned
              by {COMPANY} or its licensors and are protected by law. We grant you a limited,
              non-exclusive, non-transferable license to use the Services for their intended
              purpose. You retain ownership of content you submit but grant us a license to
              use it as needed to operate and provide the Services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Third-Party Services</h2>
            <p>
              The Services may link to or rely on third-party products and services. We are
              not responsible for the content, policies, or practices of third parties, and
              your use of them is at your own risk and subject to their terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Disclaimer of Warranties</h2>
            <p>
              The Services are provided "as is" and "as available" without warranties of any
              kind, whether express or implied, including merchantability, fitness for a
              particular purpose, and non-infringement. We do not warrant that the Services
              will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, {COMPANY} and its affiliates will not be
              liable for any indirect, incidental, special, consequential, or punitive damages,
              or any loss of profits or data, arising from your use of the Services. Our total
              liability for any claim will not exceed the amount you paid to us for the Services
              giving rise to the claim during the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {COMPANY}, its affiliates, and their
              respective officers, employees, and agents from any claims, damages, losses, or
              expenses (including reasonable legal fees) arising from your use of the Services
              or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Termination</h2>
            <p>
              We may suspend or terminate your access to the Services at any time, with or
              without cause or notice. Upon termination, the provisions of these Terms that by
              their nature should survive will continue to apply.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of {GOVERNING_STATE}, without
              regard to its conflict-of-law rules. Any disputes will be resolved in the courts
              located in {GOVERNING_STATE}, unless otherwise required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we do, we will revise the
              "Last updated" date above. Your continued use of the Services after changes take
              effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">13. Contact Us</h2>
            <p>
              Questions about these Terms? Contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ea580c] hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-6 border-t border-[#2A2A2A]">
          <button
            onClick={() => onNavigate?.('directory-landing-page')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-gray-300 hover:text-white transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
