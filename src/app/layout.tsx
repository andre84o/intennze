import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import CookieBanner from "@/app/components/CookieBanner";
import ConditionalLayout from "@/app/components/ConditionalLayout";
import { LanguageProvider } from "@/app/i18n/LanguageProvider";
import TrackingScripts from "@/app/components/TrackingScripts";
import { CONSENT_COOKIE, parseConsent } from "@/lib/consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.intenzze.com"),
  title: {
    default: "Web development by intenzze",
    template: "%s | intenzze",
  },
  description:
    "Snabba, tillgängliga och skräddarsydda webbplatser som driver affärsvärde.",
  icons: {
    icon: "/favicon20.png",
    shortcut: "/favicon20.png",
    apple: "/favicon20.png",
  },
  openGraph: {
    title: "intenzze webbstudio",
    description:
      "Snabba, tillgängliga och skräddarsydda webbplatser som driver affärsvärde.",
    url: "https://www.intenzze.com",
    siteName: "intenzze",
    locale: "sv_SE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "intenzze webbstudio",
    description:
      "Snabba, tillgängliga och skräddarsydda webbplatser som driver affärsvärde.",
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
  // Read consent server-side so already-consented returning visitors load
  // tracking on first paint, and everyone else loads nothing until they accept.
  const initialConsent = parseConsent(cookieStore.get(CONSENT_COOKIE)?.value);
  return (
    <html lang={lang}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-950`}
      >
        <LanguageProvider>
          <ConditionalLayout
            header={
              <div className="relative z-10">
                <Header />
              </div>
            }
            footer={<Footer />}
          >
            {children}
          </ConditionalLayout>
          <CookieBanner />
        </LanguageProvider>

        <Script id="ld-org" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "intenzze",
            url: "https://www.intenzze.com",
            logo: "https://www.intenzze.com/logo.png",
            sameAs: [],
          })}
        </Script>

        {/* All analytics/marketing tags + route trackers, gated on consent. */}
        <TrackingScripts initialConsent={initialConsent} />
      </body>
    </html>
  );
}
