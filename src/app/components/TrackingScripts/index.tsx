"use client";

import Script from "next/script";
import { Suspense, useEffect } from "react";
import { type ConsentState } from "@/lib/consent";
import { useConsent } from "@/lib/useConsent";
import GAListener from "../GAListener";
import MetaRouteListener from "../MetaRouteListener";
import Analytics from "../Analytics";

// Google tags (Consent Mode v2 default, GA4, Google Ads, GTM) load immediately
// for EVERY visitor, but storage defaults to "denied" — GA4 sends only cookieless
// pings until the visitor accepts cookies, then consent is updated to "granted".
// This lets GA4 measure all traffic (fixing the Ads-clicks-vs-GA4-users
// undercount) while staying GDPR-compliant: no cookies or PII are stored before
// consent.
//
// Meta Pixel and the first-party (persistent-id) analytics stay fully blocked
// until consent is granted — their behaviour is unchanged.
export default function TrackingScripts({
  initialConsent,
}: {
  initialConsent: ConsentState;
}) {
  const consent = useConsent(initialConsent);
  const granted = consent === "granted";

  // Upgrade Google Consent Mode when consent is granted — covers both the
  // accept-click and returning visitors who consented on a previous visit.
  // gtag() may not be ready yet on first paint, so poll briefly like GAListener.
  useEffect(() => {
    if (!granted || typeof window === "undefined") return;
    let done = false;
    const update = () => {
      if (done || typeof window.gtag !== "function") return false;
      done = true;
      window.gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      });
      return true;
    };
    if (update()) return;
    const interval = setInterval(() => {
      if (update()) clearInterval(interval);
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [granted]);

  return (
    <>
      {/* Consent Mode v2 default (denied) + GA4/Google Ads config. Loaded for
          everyone. The consent 'default' is pushed BEFORE any 'config' so gtag.js
          applies denied storage from the very first hit. */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              wait_for_update: 500
            });
            gtag('js', new Date());
            // Suppress automatic page_view — GAListener emits exactly one
            // manually and skips token-bearing paths to avoid token leaks.
            gtag('config', 'G-EQ9TD4N13S', { send_page_view: false });
            gtag('config', 'AW-17863845026');
          `}
      </Script>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-EQ9TD4N13S"
        strategy="afterInteractive"
      />

      {/* Google Tag Manager — consent-mode aware, loaded for everyone */}
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NFH22L5G');`}
      </Script>

      {/* GA4 page_view on initial load + App Router route changes. Always
          rendered so cookieless pings are counted even before consent. */}
      <Suspense fallback={null}>
        <GAListener />
      </Suspense>

      {/* Meta Pixel + first-party analytics — BLOCKED until consent granted.
          Behaviour unchanged from before. */}
      {granted && (
        <>
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
          <Suspense fallback={null}>
            <MetaRouteListener />
          </Suspense>
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
        </>
      )}
    </>
  );
}
