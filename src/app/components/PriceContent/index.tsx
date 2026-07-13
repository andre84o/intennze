"use client";
import { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import ContactForm from "../contactForm";

export default function PriceContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";
  const [showContactModal, setShowContactModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const T = {
    // Hero
    heroLabel: sv ? "Tjänster" : "Services",
    heroTitle: sv
      ? "Hemsidor och digitala lösningar byggda för ditt företag"
      : "Websites and digital solutions built for your business",
    heroIntro: sv
      ? "Från professionella företagssidor till bokningssystem, kundportaler och betalningslösningar. Vi hjälper dig med design, utveckling, lansering och teknisk drift."
      : "From professional business websites to booking systems, customer portals and payment solutions. We help with design, development, launch and technical operations.",
    heroPrimary: sv ? "Få en kostnadsfri offert" : "Get a free quote",
    heroSecondary: sv ? "Se våra tjänster" : "Explore our services",

    // Services
    servicesLabel: sv ? "Vad vi erbjuder" : "What we offer",
    servicesTitle: sv
      ? "Lösningar anpassade efter ditt företag"
      : "Solutions tailored to your business",
    servicesIntro: sv
      ? "Vi bygger både enkla företagssidor och mer avancerade system. Lösningen anpassas efter dina mål, funktioner och budget."
      : "We build both straightforward business websites and more advanced systems. Each solution is adapted to your goals, required features and budget.",
    services: sv
      ? [
          {
            icon: "website",
            title: "Företagshemsidor",
            desc: "Snabba, mobilanpassade och professionella hemsidor som presenterar ditt företag tydligt och gör det enkelt för besökare att kontakta dig.",
          },
          {
            icon: "booking",
            title: "Bokningssystem och kundportaler",
            desc: "Digitala lösningar med bokningskalender, kundregister, administration och skydd mot dubbelbokningar.",
          },
          {
            icon: "ecommerce",
            title: "E-handel och betalningar",
            desc: "Webbutiker och betalningslösningar för engångsköp, bokningar och återkommande betalningar.",
          },
          {
            icon: "integrations",
            title: "Integrationer och automatisering",
            desc: "Kopplingar till externa system, CRM, e-posttjänster, API:er och automatiserade arbetsflöden.",
          },
          {
            icon: "multilingual",
            title: "Flerspråkiga webbplatser",
            desc: "Webbplatser på svenska, engelska och andra språk med en tydlig struktur för både besökare och sökmotorer.",
          },
          {
            icon: "operations",
            title: "Drift och teknisk support",
            desc: "Hosting, säkerhetsuppdateringar, backup och teknisk support samlat i en enkel löpande tjänst.",
          },
        ]
      : [
          {
            icon: "website",
            title: "Business websites",
            desc: "Fast, mobile-friendly and professional websites that present your business clearly and make it easy for visitors to contact you.",
          },
          {
            icon: "booking",
            title: "Booking systems and customer portals",
            desc: "Digital solutions with booking calendars, customer records, administration and protection against double bookings.",
          },
          {
            icon: "ecommerce",
            title: "E-commerce and payments",
            desc: "Online stores and payment solutions for one-time purchases, bookings and recurring payments.",
          },
          {
            icon: "integrations",
            title: "Integrations and automation",
            desc: "Connections to external systems, CRM platforms, email services, APIs and automated workflows.",
          },
          {
            icon: "multilingual",
            title: "Multilingual websites",
            desc: "Websites in Swedish, English and other languages with a clear structure for both visitors and search engines.",
          },
          {
            icon: "operations",
            title: "Operations and technical support",
            desc: "Hosting, security updates, backups and technical support combined in one straightforward ongoing service.",
          },
        ],

    // What is included
    includedLabel: sv ? "Det här ingår" : "What is included",
    includedTitle: sv
      ? "En komplett lösning från idé till lansering"
      : "A complete solution from idea to launch",
    includedIntro: sv
      ? "Vi hjälper dig genom hela processen och ser till att lösningen är tydlig, snabb och enkel att använda."
      : "We guide you through the entire process and make sure the solution is clear, fast and easy to use.",
    included: sv
      ? [
          "Design anpassad efter ditt företag",
          "Mobilanpassad och snabb webbplats",
          "Tydlig struktur och användarvänlig navigation",
          "Teknisk SEO och korrekt sidstruktur",
          "Kontaktformulär och nödvändiga integrationer",
          "Bildoptimering och säker publicering",
          "Granskning före lansering",
          "Personlig kontakt under projektet",
          "Tydlig offert och definierad omfattning",
          "Möjlighet till fortsatt drift och support",
        ]
      : [
          "Design tailored to your business",
          "Fast and mobile-friendly website",
          "Clear structure and user-friendly navigation",
          "Technical SEO and correct page structure",
          "Contact forms and required integrations",
          "Image optimization and secure deployment",
          "Review before launch",
          "Personal contact throughout the project",
          "Clear quote and defined scope",
          "Optional ongoing operations and support",
        ],

    // Technology
    techLabel: sv ? "Teknik" : "Technology",
    techTitle: sv
      ? "Modern teknik när den gör verklig nytta"
      : "Modern technology where it adds real value",
    techIntro: sv
      ? "Vi väljer teknik efter projektets behov. Målet är inte att använda flest verktyg, utan att bygga en snabb, säker och lättskött lösning."
      : "We choose technology based on the needs of each project. The goal is not to use the most tools, but to build a fast, secure and maintainable solution.",
    techGroups: [
      {
        title: "Front-end",
        accent: "cyan" as const,
        items: ["nextjs", "react", "typescript"],
      },
      {
        title: sv ? "Back-end och data" : "Back-end & data",
        accent: "purple" as const,
        items: ["supabase", "postgresql", "api"],
      },
      {
        title: sv ? "Betalning och kommunikation" : "Payments & communication",
        accent: "fuchsia" as const,
        items: ["stripe", "resend"],
      },
      {
        title: "Hosting",
        accent: "cyan" as const,
        items: ["vercel"],
      },
    ],
    techNote: sv
      ? "För projekt där en färdig plattform är ett bättre val kan vi även arbeta med WordPress, WooCommerce och Shopify."
      : "For projects where an established platform is the better choice, we can also work with WordPress, WooCommerce and Shopify.",

    // Process
    processLabel: sv ? "Så arbetar vi" : "How we work",
    processTitle: sv
      ? "En tydlig process utan onödiga överraskningar"
      : "A clear process without unnecessary surprises",
    processIntro: sv
      ? "Du vet vad som ska byggas, vad som ingår och vad nästa steg är under hela projektet."
      : "You know what is being built, what is included and what happens next throughout the project.",
    process: sv
      ? [
          {
            step: "01",
            title: "Behovsanalys",
            desc: "Vi går igenom ditt företag, dina mål, ditt innehåll och vilka funktioner du behöver.",
          },
          {
            step: "02",
            title: "Förslag och offert",
            desc: "Du får ett tydligt förslag med omfattning, pris och plan för projektet.",
          },
          {
            step: "03",
            title: "Design och utveckling",
            desc: "Vi bygger lösningen och stämmer av viktiga delar med dig under arbetets gång.",
          },
          {
            step: "04",
            title: "Granskning och lansering",
            desc: "Du får granska lösningen innan den testas, färdigställs och publiceras.",
          },
          {
            step: "05",
            title: "Drift och support",
            desc: "Efter lanseringen kan vi fortsätta hantera hosting, säkerhet, backup och teknisk support.",
          },
        ]
      : [
          {
            step: "01",
            title: "Needs assessment",
            desc: "We review your business, goals, content and the features you need.",
          },
          {
            step: "02",
            title: "Proposal and quote",
            desc: "You receive a clear proposal covering scope, price and the project plan.",
          },
          {
            step: "03",
            title: "Design and development",
            desc: "We build the solution and review important parts with you throughout the process.",
          },
          {
            step: "04",
            title: "Review and launch",
            desc: "You review the solution before it is tested, finalized and published.",
          },
          {
            step: "05",
            title: "Operations and support",
            desc: "After launch, we can continue managing hosting, security, backups and technical support.",
          },
        ],

    // FAQ
    faqLabel: sv ? "Vanliga frågor" : "Frequently asked questions",
    faqTitle: sv
      ? "Det här brukar företag vilja veta"
      : "What businesses usually want to know",
    faq: sv
      ? [
          {
            q: "Hur mycket kostar en hemsida?",
            a: "Priset beror på sidans omfattning och vilka funktioner som behövs. Du får alltid en tydlig offert innan arbetet börjar.",
          },
          {
            q: "Ingår domän?",
            a: "Domän ingår inte, men vi hjälper dig att välja, köpa och koppla din domän till webbplatsen.",
          },
          {
            q: "Ingår hosting?",
            a: "Hosting ingår när du väljer vår tjänst för drift och support. Då hanterar vi även säkerhet, backup och tekniska uppdateringar.",
          },
          {
            q: "Kan jag redigera texter och bilder själv?",
            a: "Ja, lösningar som behöver löpande innehållsuppdateringar kan byggas med en enkel administration för texter och bilder.",
          },
          {
            q: "Hur lång tid tar ett projekt?",
            a: "Tiden beror på projektets omfattning, innehåll och funktioner. Du får en uppskattad tidsplan innan projektet startar.",
          },
          {
            q: "Går det att bygga specialfunktioner?",
            a: "Ja. Vi kan bygga exempelvis bokningssystem, kundportaler, betalningar, CRM-funktioner och integrationer mot externa tjänster.",
          },
          {
            q: "Går det att få hjälp med en befintlig webbplats?",
            a: "Ja. Vi kan hjälpa till med förbättringar, flytt, tekniska problem eller en fullständig ombyggnad av en befintlig webbplats.",
          },
        ]
      : [
          {
            q: "How much does a website cost?",
            a: "The price depends on the scope of the website and the required features. You always receive a clear quote before work begins.",
          },
          {
            q: "Is the domain included?",
            a: "The domain is not included, but we can help you choose, purchase and connect it to your website.",
          },
          {
            q: "Is hosting included?",
            a: "Hosting is included when you choose our operations and support service. We then also manage security, backups and technical updates.",
          },
          {
            q: "Can I edit text and images myself?",
            a: "Yes. Solutions that require ongoing content updates can include a straightforward administration area for text and images.",
          },
          {
            q: "How long does a project take?",
            a: "The timeline depends on the scope, content and required features. You receive an estimated schedule before the project starts.",
          },
          {
            q: "Can you build custom features?",
            a: "Yes. We can build booking systems, customer portals, payments, CRM features and integrations with external services.",
          },
          {
            q: "Can you help with an existing website?",
            a: "Yes. We can help with improvements, migrations, technical issues or a complete rebuild of an existing website.",
          },
        ],

    // Closing CTA
    ctaTitle: sv
      ? "Har du en idé eller ett konkret behov?"
      : "Do you have an idea or a specific need?",
    ctaText: sv
      ? "Berätta kort om ditt företag och vad du behöver hjälp med. Vi återkommer med frågor, rekommendationer och nästa steg."
      : "Tell us briefly about your business and what you need help with. We will get back to you with questions, recommendations and the next step.",
    ctaBtn: sv ? "Få en kostnadsfri offert" : "Get a free quote",
  };

  const serviceIcons: Record<string, React.ReactNode> = {
    website: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4M2 8h20" /></svg>
    ),
    booking: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" /></svg>
    ),
    ecommerce: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
    ),
    integrations: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" /></svg>
    ),
    multilingual: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
    ),
    operations: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><path d="M6 6h.01M6 18h.01" /></svg>
    ),
  };

  const techIcons: Record<string, { name: string; svg: React.ReactNode }> = {
    nextjs: {
      name: "Next.js",
      svg: (
        <svg viewBox="0 0 24 24" className="w-10 h-10" fill="white"><path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 01-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 00-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.251 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 00-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 01-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 01-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 01.174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 004.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 002.466-2.163 11.944 11.944 0 002.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 00-2.499-.523A33.119 33.119 0 0011.572 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 01.237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 01.233-.296c.096-.05.13-.054.5-.054z" /></svg>
      ),
    },
    react: {
      name: "React",
      svg: (
        <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#61DAFB"><path d="M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 01-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68 0 1.69-1.83 2.93-4.37 3.68.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68 0-1.69 1.83-2.93 4.37-3.68-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26 0-.73-1.18-1.63-3.28-2.26-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26 0 .73 1.18 1.63 3.28 2.26.25-.76.55-1.51.89-2.26m9 2.26l-.3.51c.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.29.51m-2.89 4.04c1.59 1.5 2.97 2.08 3.59 1.7.64-.35.83-1.82.32-3.96-.77.16-1.58.28-2.4.36-.48.67-.99 1.31-1.51 1.9M8.08 9.74l.3-.51c-.31.05-.61.1-.88.16.07.28.18.57.29.86l.29-.51m2.89-4.04C9.38 4.2 8 3.62 7.37 4c-.63.35-.82 1.82-.31 3.96a22.7 22.7 0 012.4-.36c.48-.67.99-1.31 1.51-1.9z" /></svg>
      ),
    },
    typescript: {
      name: "TypeScript",
      svg: (
        <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#3178C6"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 011.306.34v2.458a3.95 3.95 0 00-.643-.361 5.093 5.093 0 00-.717-.26 5.453 5.453 0 00-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 00-.623.242c-.17.104-.3.229-.393.374a.888.888 0 00-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 01-1.012 1.085 4.38 4.38 0 01-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 01-1.84-.164 5.544 5.544 0 01-1.512-.493v-2.63a5.033 5.033 0 003.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 00-.074-1.089 2.12 2.12 0 00-.537-.5 5.597 5.597 0 00-.807-.444 27.72 27.72 0 00-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 011.47-.629 7.536 7.536 0 011.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" /></svg>
      ),
    },
    supabase: {
      name: "Supabase",
      svg: (
        <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#3ECF8E"><path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.261.401-.562a1.04 1.04 0 0 0-.836-1.66z" /></svg>
      ),
    },
    postgresql: {
      name: "PostgreSQL",
      svg: (
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-sky-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" /></svg>
      ),
    },
    api: {
      name: "API integrations",
      svg: (
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6M14 4l-4 16" /></svg>
      ),
    },
    stripe: {
      name: "Stripe",
      svg: (
        <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#635BFF"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.007z" /></svg>
      ),
    },
    resend: {
      name: "Resend",
      svg: (
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-9.4 5.6a2 2 0 0 1-2.2 0L2 7" /></svg>
      ),
    },
    vercel: {
      name: "Vercel",
      svg: (
        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="white"><path d="M24 22.525H0l12-21.05 12 21.05z" /></svg>
      ),
    },
  };

  const accentBorder: Record<string, string> = {
    cyan: "group-hover:border-cyan-500/50",
    purple: "group-hover:border-purple-500/50",
    fuchsia: "group-hover:border-fuchsia-500/50",
  };

  const scrollToServices = () => {
    document.getElementById("tjanster")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white overflow-x-hidden">
      {/* Hero */}
      <section className="relative pt-32 md:pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-40 left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-purple-400 font-mono mb-6">
            {T.heroLabel}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            {T.heroTitle}
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {T.heroIntro}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowContactModal(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full font-bold hover:scale-105 transition-transform"
            >
              {T.heroPrimary}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <a
              href="#tjanster"
              onClick={(e) => {
                e.preventDefault();
                scrollToServices();
              }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
            >
              {T.heroSecondary}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="tjanster" className="scroll-mt-24 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-cyan-400 font-mono mb-6">
              {T.servicesLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">{T.servicesTitle}</h2>
            <p className="mt-4 text-slate-400 leading-relaxed">{T.servicesIntro}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {T.services.map((item, i) => (
              <div key={i} className="group p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-purple-500/50 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500/20 to-transparent rounded-2xl text-purple-400 mb-4">
                  {serviceIcons[item.icon]}
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is included */}
      <section className="py-24 px-6 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-fuchsia-400 font-mono mb-6">
              {T.includedLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">{T.includedTitle}</h2>
            <p className="mt-4 text-slate-400 leading-relaxed">{T.includedIntro}</p>
          </div>

          <ul className="grid sm:grid-cols-2 gap-4">
            {T.included.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl"
              >
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0 text-cyan-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Technology */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-cyan-400 font-mono mb-6">
              {T.techLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">{T.techTitle}</h2>
            <p className="mt-4 text-slate-400 leading-relaxed">{T.techIntro}</p>
          </div>

          <div className="space-y-14">
            {T.techGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-xl font-semibold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {group.title}
                </h3>
                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                  {group.items.map((key) => (
                    <div key={key} className="flex flex-col items-center gap-2 group">
                      <div
                        className={`w-16 h-16 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 transition-colors ${accentBorder[group.accent]}`}
                      >
                        {techIcons[key].svg}
                      </div>
                      <span className="text-sm text-slate-400">{techIcons[key].name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-14 text-center text-sm text-slate-500 max-w-2xl mx-auto">
            {T.techNote}
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-purple-400 font-mono mb-6">
              {T.processLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">{T.processTitle}</h2>
            <p className="mt-4 text-slate-400 leading-relaxed">{T.processIntro}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {T.process.map((item, i) => (
              <div key={i} className="relative">
                {i < T.process.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                )}
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-cyan-400 font-mono mb-6">
              {T.faqLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">{T.faqTitle}</h2>
          </div>

          <div className="space-y-4">
            {T.faq.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
                >
                  <h3>
                    <button
                      type="button"
                      id={`faq-btn-${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-800/40 transition-colors"
                    >
                      <span className="font-semibold">{item.q}</span>
                      <svg
                        className={`w-5 h-5 flex-shrink-0 text-cyan-400 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    hidden={!isOpen}
                    className="px-5 pb-5"
                  >
                    <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
              {T.ctaTitle}
            </span>
          </h2>
          <p className="mt-6 text-slate-400 text-lg max-w-xl mx-auto">{T.ctaText}</p>
          <button
            onClick={() => setShowContactModal(true)}
            className="mt-10 inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full font-bold text-lg hover:scale-105 transition-transform"
          >
            {T.ctaBtn}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* Contact Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors"
              aria-label={sv ? "Stäng" : "Close"}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <ContactForm onSent={() => setShowContactModal(false)} />
          </div>
        </div>
      )}
    </main>
  );
}
