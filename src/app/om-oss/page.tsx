import type { Metadata } from "next";
import { cookies } from "next/headers";
import AboutContent from "../components/AboutContent";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "About us",
        description: "Get to know Intenzze — we create modern, fast and sustainable web experiences.",
        alternates: { canonical: "/om-oss" },
      }
    : {
        title: "Om oss",
        description: "Lär känna Intenzze – vi skapar moderna, snabba och hållbara webbupplevelser.",
        alternates: { canonical: "/om-oss" },
      };
}

export default async function AboutPage() {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  const base = "https://intenzze.com";
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Om oss",
    url: `${base}/om-oss`,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "Start", item: base },
      { "@type": "ListItem", position: 2, name: lang === "en" ? "About us" : "Om oss", item: `${base}/om-oss` },
    ],
  };
  return (
    <>
      <AboutContent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  );
}