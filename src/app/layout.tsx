import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/Header";
import CookieBanner from "@/app/components/CookieBanner";
import { LanguageProvider } from "@/app/i18n/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "web development by intenzze",
  description: "web utveckling, skreddarsytt websidor",
  icons: {
    icon: "/logoico-rosa.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full">
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
      </body>
    </html>
  );
}
