"use client";

import CookieConsent from "react-cookie-consent";
import Link from "next/link";

/*
  CookieBanner
  - Svensk text
  - Matchar sajtens färger (gradient accenter, rundade, glassy)
  - Consent sparas i cookie 'intenzze-consent' i 180 dagar
  - Knapparna ligger inne i samma ruta (box)
*/

export default function CookieBanner() {
  return (
    <CookieConsent
      location="bottom"
      cookieName="intenzze-consent"
      expires={180}
      disableStyles
      overlay={false}
      containerClasses="fixed left-0 right-0 bottom-3 sm:bottom-6 z-40 mx-auto max-w-4xl rounded-2xl border border-black/10 bg-white/80 backdrop-blur-md shadow-lg"
      contentClasses="p-4 sm:p-6"
      buttonWrapperClasses="flex items-center justify-end gap-3 px-4 pb-4 sm:px-6 sm:pb-6"
      buttonText="Acceptera"
      buttonClasses="inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-rose-500 hover:to-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
      declineButtonText="Avvisa"
      enableDeclineButton
      declineButtonClasses="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-5 py-2.5 text-sm font-medium text-black/80 backdrop-blur hover:bg-white/90"
      ariaAcceptLabel="Acceptera cookies"
      ariaDeclineLabel="Avvisa cookies"
    >
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-fuchsia-500 rounded-t-2xl"
          aria-hidden
        />
        <h2 className="text-base font-semibold">Vi använder cookies</h2>
        <p className="mt-1 text-sm text-black/70">
          Vi använder nödvändiga cookies för att sidan ska fungera och valfria
          för att förbättra upplevelsen. Du kan ändra ditt val senare.
        </p>
        <div className="mt-3 text-xs text-black/60">
          Läs mer i vår {" "}
          <Link
            href="/cookies"
            className="underline decoration-fuchsia-600 underline-offset-2 hover:text-black"
          >
            policy
          </Link>
          .
        </div>
      </div>
    </CookieConsent>
  );
}
