import type { Metadata } from "next";
import { cookies } from "next/headers";
import ContactContent from "../components/ContactContent";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "Contact",
        description: "Contact Intenzze — we will get back to you as soon as we can.",
        alternates: { canonical: "/kontakt" },
      }
    : {
        title: "Kontakt",
        description: "Kontakta Intenzze – vi hör av oss så snart vi kan.",
        alternates: { canonical: "/kontakt" },
      };
}

const ContactPage = async () => {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  const base = "https://intenzze.com";
    const contactLd = {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Kontakt",
      url: `${base}/kontakt`,
    };
    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "Start", item: base },
        { "@type": "ListItem", position: 2, name: lang === "en" ? "Contact" : "Kontakt", item: `${base}/kontakt` },
      ],
    };
    return (
      <>
        <ContactContent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      </>
    );
}


export default ContactPage;