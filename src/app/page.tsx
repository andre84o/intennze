import type { Metadata } from "next";
import { cookies } from "next/headers";
import HomeContent from "./components/HomeContent";
import PageViewTracker from "@/components/PageViewTracker";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  if (lang === "en") {
    return {
      title: "Home",
      description: "Intenzze builds fast, accessible and tailored websites that drive business value.",
      alternates: { canonical: "/" },
    };
  }
  return {
    title: "Start",
    description: "Intenzze bygger snabba, tillgängliga och skräddarsydda webbplatser som driver affärsvärde.",
    alternates: { canonical: "/" },
  };
}

export default async function Home() {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  const base = "https://intenzze.com";
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
      <PageViewTracker pageName="Startsida" />
      <HomeContent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  );
}
