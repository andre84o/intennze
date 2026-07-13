import type { Metadata } from "next";
import { cookies } from "next/headers";
import ContactContent from "../components/ContactContent";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "Contact | Get a website quote | Intenzze",
        description:
          "Contact Intenzze for a free quote on a business website, booking system, customer portal or another digital solution.",
        alternates: { canonical: "/kontakt" },
      }
    : {
        title: "Kontakt | Få offert på hemsida | Intenzze",
        description:
          "Kontakta Intenzze för en kostnadsfri offert på företagshemsida, bokningssystem, kundportal eller annan digital lösning.",
        alternates: { canonical: "/kontakt" },
      };
}

const ContactPage = async () => {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  const base = "https://www.intenzze.com";
    const contactLd = {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: lang === "en" ? "Contact" : "Kontakt",
      description:
        lang === "en"
          ? "Contact Intenzze for websites, booking systems, customer portals and tailored digital solutions."
          : "Kontakta Intenzze för hemsidor, bokningssystem, kundportaler och skräddarsydda digitala lösningar.",
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