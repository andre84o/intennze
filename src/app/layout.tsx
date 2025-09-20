import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/Header";
import CookieBanner from "@/app/components/CookieBanner";


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
    icon: "/logo-favico-bild.svg",
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
        <div className="relative z-10">
          <Header />
        </div>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
