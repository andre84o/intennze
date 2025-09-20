export type Lang = "sv" | "en";

export const dict: Record<Lang, Record<string, string>> = {
  sv: {
    nav_home: "Hem",
    nav_about: "Om oss",
    nav_contact: "Kontakt",
    cta_title: "Låt oss ta din webb till nästa nivå",
    cta_body:
      "Vi hjälper dig prioritera rätt – struktur först, glitter sen. Snabbt, stabilt och snyggt.",
    cta_button: "Prata med oss",
    // Cookie banner
    cookie_title: "Vi använder cookies",
    cookie_body:
      "Vi använder nödvändiga cookies för att sidan ska fungera och valfria för att förbättra upplevelsen. Du kan ändra ditt val senare.",
    cookie_more_prefix: "Läs mer i vår",
    cookie_policy_link: "policy",
    cookie_accept: "Acceptera",
    cookie_decline: "Avvisa",
    cookie_aria_accept: "Acceptera cookies",
    cookie_aria_decline: "Avvisa cookies",
    // Contact form
    contact_title: "Kontakta oss",
    contact_subtitle: "Vi återkommer så snart vi kan.",
    name_label: "Namn",
    name_placeholder: "Ditt namn",
    email_label: "E-post",
    email_placeholder: "namn@exempel.se",
    phone_label: "Telefon",
    phone_placeholder: "Ditt telefonnummer",
    message_label: "Meddelande",
    message_placeholder: "Berätta kort vad du behöver hjälp med",
    submit: "Skicka",
    sending: "Skickar…",
    sent: "Skickat!",
    sent_msg: "Tack! Ditt meddelande har skickats.",
    error_msg: "Något gick fel. Försök igen.",
    // Home page
    home_hero_tagline: "Struktur före glitter",
    home_intro:
      "Vi skapar snabba, tillgängliga och vackra webbupplevelser som driver affärsvärde. Från idé till drift, med fokus på struktur, prestanda och långsiktig hållbarhet.",
    home_cta_book_meeting: "Boka ett möte",
    home_cta_read_more: "Läs mer",
    home_service_design: "Design",
    home_service_design_desc: "Från skiss till färdig upplevelse som driver engagemang.",
    home_service_dev: "Utveckling",
    home_service_dev_desc: "Moderna hemsidor som skalar med din verksamhet.",
    home_service_ops: "Drift",
    home_service_ops_desc: "Säker drift med regelbundna uppdateringar och optimeringar.",

    // About page
    about_title: "Om oss",
    about_intro_1:
      "intenzze bygger hemsidor som är snygga, snabba och lätta att använda.",
    about_intro_2:
      "Vi har många års erfarenhet och har skapat flera lyckade sajter för små och stora företag. Du får en skräddarsydd hemsida som passar din verksamhet och dina mål. Vi lyssnar först och föreslår bara det du verkligen behöver.",
    about_why_title: "Varför välja oss",
    about_why_b1:
      "• Tydlig plan och tydliga leveranser så du vet vad som händer i varje steg.",
    about_why_b2: "• Texter och bilder optimeras så sidan laddar snabbt.",
    about_why_b3: "• Designen är enkel och klar så besökare hittar rätt direkt.",
    about_why_b4: "• Vi ser till att sidan fungerar på mobil, surfplatta och dator.",
    about_why_b5:
      "• Grundläggande sökmotoroptimering ingår så du syns bättre på Google.",
    about_why_b6:
      "• Vi kan koppla formulär, bokning, betalning och nyhetsbrev när du vill.",
    about_why_b7:
      "• Du får utbildning som gör att du enkelt kan uppdatera själv.",
    about_why_b8:
      "• Support och uppdateringar finns när du behöver oss, så du kan växa tryggt.",
    about_how_title: "Vårt arbetssätt",
    about_how_text:
      "Vi prioriterar struktur före glitter. Det betyder fokus på prestanda, tillgänglighet och tydlighet – och först därefter animationer och effekter. På så sätt får du en webb som både känns modern och levererar resultat.",
    about_gallery_title: "Bilder från vårt arbete",
    about_gallery_alt_1: "Projekt 1",
    about_gallery_alt_2: "Projekt 2",
    about_gallery_alt_3: "Projekt 3",
    about_gallery_alt_4: "Projekt 4",
    about_cta_title: "Redo att prata om din webb?",
    about_cta_text:
      "Vi lyssnar först och föreslår bara det du verkligen behöver. Låt oss skapa något snabbt, tydligt och vackert – tillsammans.",
    about_cta_button: "Kontakta oss",
  },
  en: {
    nav_home: "Home",
    nav_about: "About us",
    nav_contact: "Contact",
    cta_title: "Let’s take your website to the next level",
    cta_body:
      "We help you prioritize what matters — structure first, polish second. Fast, stable and beautiful.",
    cta_button: "Talk to us",
    // Cookie banner
    cookie_title: "We use cookies",
    cookie_body:
      "We use necessary cookies for core functionality and optional ones to improve your experience. You can change your choice later.",
    cookie_more_prefix: "Read more in our",
    cookie_policy_link: "policy",
    cookie_accept: "Accept",
    cookie_decline: "Decline",
    cookie_aria_accept: "Accept cookies",
    cookie_aria_decline: "Decline cookies",
    // Contact form
    contact_title: "Contact us",
    contact_subtitle: "We will get back to you as soon as we can.",
    name_label: "Name",
    name_placeholder: "Your name",
    email_label: "Email",
    email_placeholder: "name@example.com",
    phone_label: "Phone",
    phone_placeholder: "Your phone number",
    message_label: "Message",
    message_placeholder: "Briefly describe what you need help with",
    submit: "Send",
    sending: "Sending…",
    sent: "Sent!",
    sent_msg: "Thanks! Your message has been sent.",
    error_msg: "Something went wrong. Please try again.",
    // Home page
    home_hero_tagline: "Structure before glitter",
    home_intro:
      "We craft fast, accessible and beautiful web experiences that drive business value. From idea to operation, with focus on structure, performance and long-term sustainability.",
    home_cta_book_meeting: "Book a meeting",
    home_cta_read_more: "Learn more",
    home_service_design: "Design",
    home_service_design_desc: "From sketches to finished experiences that drive engagement.",
    home_service_dev: "Development",
    home_service_dev_desc: "Modern websites that scale with your business.",
    home_service_ops: "Operations",
    home_service_ops_desc: "Secure operations with regular updates and optimizations.",

    // About page
    about_title: "About us",
    about_intro_1:
      "intenzze builds websites that are beautiful, fast and easy to use.",
    about_intro_2:
      "We have many years of experience and have created successful sites for small and large companies. You get a tailored website that fits your business and goals. We listen first and only propose what you really need.",
    about_why_title: "Why choose us",
    about_why_b1:
      "• A clear plan and clear deliverables so you know what's happening at every step.",
    about_why_b2: "• Copy and images are optimized so the site loads quickly.",
    about_why_b3: "• The design is simple and clear so visitors find their way instantly.",
    about_why_b4: "• We ensure the site works on mobile, tablet and desktop.",
    about_why_b5:
      "• Basic search engine optimization included to improve your Google presence.",
    about_why_b6:
      "• We can connect forms, booking, payments and newsletters as needed.",
    about_why_b7:
      "• You get training so you can easily update content yourself.",
    about_why_b8:
      "• Support and updates whenever you need us so you can grow confidently.",
    about_how_title: "How we work",
    about_how_text:
      "We prioritize structure before glitter. That means focusing on performance, accessibility and clarity — and only then animations and effects. This gives you a website that feels modern and delivers results.",
    about_gallery_title: "Images from our work",
    about_gallery_alt_1: "Project 1",
    about_gallery_alt_2: "Project 2",
    about_gallery_alt_3: "Project 3",
    about_gallery_alt_4: "Project 4",
    about_cta_title: "Ready to talk about your website?",
    about_cta_text:
      "We listen first and only propose what you really need. Let's create something fast, clear and beautiful — together.",
    about_cta_button: "Contact us",
  },
};
