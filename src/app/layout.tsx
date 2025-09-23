import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/Header";
import CookieBanner from "@/app/components/CookieBanner";
import { LanguageProvider } from "@/app/i18n/LanguageProvider";
import GAListener from "./components/GAListener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://intenzze.com"),
  title: {
    default: "Web development by intenzze",
    template: "%s | intenzze",
  },
  description:
    "Snabba, tillgängliga och skräddarsydda webbplatser som driver affärsvärde.",
  icons: {
    icon: "/logoico-rosa.png",
    shortcut: "/logoico-rosa.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Web development by intenzze",
    description:
      "Snabba, tillgängliga och skräddarsydda webbplatser som driver affärsvärde.",
    url: "https://intenzze.com",
    siteName: "intenzze",
    images: [
      {
        url: "/home-pic.jpg",
        width: 1200,
        height: 630,
        alt: "intenzze website preview",
      },
    ],
    locale: "sv_SE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Web development by intenzze",
    description:
      "Snabba, tillgängliga och skräddarsydda webbplatser som driver affärsvärde.",
    images: ["/home-pic.jpg"],
    creator: "@intenzze",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value === "en" ? "en" : "sv";
  return (
    <html lang={lang} className="h-full">
      <head>
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
    fbq('init', '513551592511335'); 
    fbq('track', 'PageView');
  `}
        </Script>

        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=513551592511335&ev=PageView&noscript=1"
          />
        </noscript>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full min-h-dvh flex flex-col bag-shyne`}
      >
        <LanguageProvider>
          <div className="relative z-10">
            <Header />
          </div>
          {children}
          <CookieBanner />
        </LanguageProvider>

        <Script id="ld-org" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "intenzze",
            url: "https://intenzze.com",
            logo: "https://intenzze.com/logo.png",
            sameAs: [],
          })}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EQ9TD4N13S"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-EQ9TD4N13S');
          `}
        </Script>
        {/* Track client-side route changes */}
        <GAListener />
      </body>
    </html>
  );
}
