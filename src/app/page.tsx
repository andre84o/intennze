import type { Metadata } from "next";
import { cookies } from "next/headers";
import HomeContent from "./components/HomeContent";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  if (lang === "en") {
    return {
      title: "Web Agency Stockholm | Business Websites | Intenzze",
      description:
        "Intenzze is a web agency in Stockholm building modern, fast and SEO-ready websites for businesses across Sweden. Web design, development and support.",
      alternates: { canonical: "/" },
    };
  }
  return {
    title: "Webbyrå Stockholm | Hemsidor för företag | Intenzze",
    description:
      "Intenzze är en webbyrå i Stockholm som bygger moderna, snabba och SEO-optimerade hemsidor för företag i hela Sverige. Webbdesign, utveckling och drift.",
    alternates: { canonical: "/" },
  };
}

export default async function Home() {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  const base = "https://www.intenzze.com";
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "intenzze",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "Start", item: base },
    ],
  };
  return (
    <>
      <HomeContent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  );
}
