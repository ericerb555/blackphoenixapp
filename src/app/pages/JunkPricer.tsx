/**
 * The junk pricer, for somebody who has never been here before.
 *
 * Eric, in `anonPricer.ts`: *"Some Should not have to login to use the junk
 * remaval picer until they decied to create an account and get 5 percent
 * off.. anyone can try the pricer."*
 *
 * THE SERVER HAS ALLOWED THIS FOR A WHILE. NOTHING ON THE SITE REACHED IT.
 *
 * `trash-estimator` names three kinds of caller — signed in, a texted link,
 * and "nobody — allowed, and counted per address per day". `anonPricer.ts`
 * exists solely to make that third one affordable, and goes to some length
 * over why an IP ceiling cannot run through `aiSpend`. `TrashEstimatePanel`
 * sends `authedHeadersOrAnon` for the same reason: *"Anybody may price a job,
 * so this never throws for want of a session."*
 *
 * And the only way into the pricer was the Junk Removal button, which sends a
 * signed-out visitor to `sign-up?next=trash-estimate`. So the one requirement
 * the anonymous path was built for — try it before you make an account — was
 * the one thing a visitor could not do. Found by trying to use the site as a
 * new customer rather than by reading it.
 *
 * This page is the missing entry. It is the same panel the portal and the
 * texted link already render, with no token and no session.
 *
 * WHY NOT REUSE /junk-quote
 *
 * That page exists for a link that was texted to somebody, and when it finds
 * no token it says so — because a truncated text message is the likely cause
 * and a person whose link got cut short otherwise concludes the site is
 * broken. Turning its empty state into a pricer would take that explanation
 * away from the people who need it.
 */
import { useEffect } from 'react';
import TrashEstimatePanel from '../components/portals/TrashEstimatePanel';

interface JunkPricerProps {
  onNavigate?: (page: string) => void;
}

export default function JunkPricer({ onNavigate }: JunkPricerProps) {
  useEffect(() => {
    document.title = 'Junk & Demo Removal — price it from your photos | Black Phoenix';
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            Junk, demo and haul-away
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Photograph the pile and we will price it. No account needed to get a
            number — make one when you want to book, and the job is 5% less.
          </p>
        </header>

        {/*
          * `onNavigate` is not optional in practice, whatever the prop type
          * says. The panel's account button calls `onNavigate?.('signup')`,
          * and rendering it without one made that button a no-op on the
          * texted-link page: it looked live, did nothing, and reported
          * nothing. That shipped once already.
          *
          * The app's router when there is one, a hard load otherwise, so this
          * works whether it is reached inside the shell or cold from a QR
          * code on a van.
          */}
        <TrashEstimatePanel
          onNavigate={(page) => {
            if (onNavigate) onNavigate(page);
            else window.location.href = `/${page}`;
          }}
        />
      </div>
    </div>
  );
}
