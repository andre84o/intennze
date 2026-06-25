"use client";

import Script from "next/script";
import { Suspense } from "react";
import { type ConsentState } from "@/lib/consent";
import { useConsent } from "@/lib/useConsent";
import GAListener from "../GAListener";
import MetaRouteListener from "../MetaRouteListener";
import Analytics from "../Analytics";

// Every analytics/marketing tag (GTM, Meta Pixel, GA4, Google Ads) plus the
// first-party page-view tracker live here and render ONLY after the visitor
// accepts cookies. Declining — or not choosing yet — loads nothing, so no
// tracking cookie, pixel or persistent visitor id is set without prior consent
// (GDPR / ePrivacy). Consent flips this live via the useConsent event listener.
export default function TrackingScripts({
  initialConsent,
}: {
  initialConsent: ConsentState;
}) {
  const consent = useConsent(initialConsent);
  if (consent !== "granted") return null;

  return (
    <>
      {/* Google Tag Manager */}
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NFH22L5G');`}
      </Script>

      {/* Meta Pixel */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '1537867027358765');
    if (!/^\\/(offert|formular|admin|login|demo)\\//.test(window.location.pathname)) {
      fbq('track', 'PageView');
    }
  `}
      </Script>

      {/* GA4 + Google Ads */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-EQ9TD4N13S"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            // Suppress automatic page_view on initial load — GAListener emits
            // it manually and skips token-bearing paths to avoid token leaks.
            gtag('config', 'G-EQ9TD4N13S', { send_page_view: false });
            gtag('config', 'AW-17863845026');
          `}
      </Script>

      {/* Route-change trackers — only meaningful once the tags above exist */}
      <Suspense fallback={null}>
        <GAListener />
      </Suspense>
      <Suspense fallback={null}>
        <MetaRouteListener />
      </Suspense>
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </>
  );
}
