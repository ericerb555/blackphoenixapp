/**
 * Privacy Policy — public, standalone legal page.
 * Linked from the global footer. Route keys: privacy, privacy-policy.
 */
import { Shield, Home } from 'lucide-react';

const COMPANY = 'Black Phoenix Builds';
const CONTACT_EMAIL = 'privacy@blackphoenixbuilds.com';
const LAST_UPDATED = 'July 19, 2026';

interface PrivacyPolicyProps {
  onNavigate?: (page: string) => void;
}

export default function PrivacyPolicy({ onNavigate }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-[#ea580c]/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#ea580c]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p className="text-sm text-gray-400">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="mt-6 space-y-8 text-[15px] leading-relaxed text-gray-300">
          <section>
            <p>
              {COMPANY} ("we," "us," or "our") respects your privacy and is committed to
              protecting the personal information you share with us. This Privacy Policy
              explains what we collect, how we use it, and the choices you have. By using
              our website, applications, and services (collectively, the "Services"), you
              agree to the practices described below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-white">Information you provide:</strong> name, email,
                phone number, billing/shipping address, company details, and any content you
                submit through forms, applications, or messages.
              </li>
              <li>
                <strong className="text-white">Payment information:</strong> payments are
                processed securely by our payment provider (Stripe). We do not store full
                card numbers on our servers.
              </li>
              <li>
                <strong className="text-white">Usage data:</strong> device, browser, IP
                address, pages viewed, and interactions, collected automatically to operate
                and improve the Services.
              </li>
              <li>
                <strong className="text-white">Location data:</strong> approximate or precise
                location, only when you grant permission (e.g., for field/job-site features).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Provide, maintain, and improve the Services.</li>
              <li>Process orders, payments, and payouts.</li>
              <li>Communicate with you about your account, orders, and support requests.</li>
              <li>Send updates, promotions, or marketing where you have opted in.</li>
              <li>Detect, prevent, and address fraud, security, or technical issues.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. How We Share Information</h2>
            <p>
              We do not sell your personal information. We share it only with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>
                <strong className="text-white">Service providers</strong> who help us operate
                the Services (e.g., payment processing, hosting, email, and SMS delivery),
                under contracts that require them to protect your data.
              </li>
              <li>
                <strong className="text-white">Legal and safety</strong> recipients when
                required by law or to protect our rights, users, or the public.
              </li>
              <li>
                <strong className="text-white">Business transfers</strong> in connection with
                a merger, acquisition, or sale of assets.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Data Security</h2>
            <p>
              We use administrative, technical, and physical safeguards designed to protect
              your information. However, no method of transmission or storage is completely
              secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Your Choices &amp; Rights</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Access, update, or delete your personal information.</li>
              <li>Opt out of marketing emails or SMS at any time.</li>
              <li>Disable location or notification permissions in your device settings.</li>
              <li>
                Depending on your location, you may have additional rights under laws such as
                the GDPR or CCPA. To exercise any right, contact us using the details below.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Cookies &amp; Tracking</h2>
            <p>
              We use cookies and similar technologies to keep you signed in, remember
              preferences, and understand how the Services are used. You can control cookies
              through your browser settings, though some features may not function properly if
              disabled.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Children's Privacy</h2>
            <p>
              The Services are not directed to children under 13, and we do not knowingly
              collect personal information from them. If you believe a child has provided us
              information, please contact us so we can remove it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will revise
              the "Last updated" date above. Material changes may be communicated through the
              Services or by email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your data, contact us at{' '}
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
