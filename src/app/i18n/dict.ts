export type Lang = "sv" | "en";

export const dict: Record<Lang, Record<string, string>> = {
  sv: {
    nav_home: "Hem",
    nav_about: "Om oss",
    nav_contact: "Kontakt",
    nav_services: "Tjänster",

    pricing_title: "Priser",
    pricing_toggle_onetime: "Hemsida",
    pricing_toggle_monthly: "Månad",
    pricing_notice_prefix: "*Obs:",
    pricing_notice_text:
      "Texter, bilder och webbhotell ingår inte om det inte anges. Innehåll och extra funktioner köps som tillval. Domän ingår inte. SSL-certifikat hanteras av ditt webbhotell eller leverantör. Alla priser exkl. moms.",
    pricing_package_label: "Komplett paket",
    pricing_monthly_label: "Månadspris",
    pricing_onetime_label: "Engångskostnad",
    pricing_cta_onetime: "Beställ",
    pricing_cta_monthly: "Välj",
    tier_name_budget: "Hemsida Budget",
    tier_name_small: "Hemsida Liten",
    tier_name_medium: "Hemsida Mellan",
    tier_name_large: "Hemsida Stor",
    pricing_prefill_template:
      "Jag är intresserad av {product} {price}, kontakta mig",

    contact_page_hero_title: "Vi hjälper dig att hitta rätt väg",
    contact_page_hero_body:
      "och göra det enkelt att lyckas. Hör av dig så tar vi första steget tillsammans.",
    contact_bullet_1: "Boka möte med våra experter",
    contact_bullet_2: "Gör en nulägesanalys.",
    contact_note:
      "Har du särskilda önskemål som inte täcks av våra paket? Hör av dig, vi lämnar gärna en gratis offert anpassad efter dina behov.",
    cta_title: "Låt oss ta din webb till nästa nivå",
    cta_body:
      "Vi hjälper dig prioritera rätt – struktur först, glitter sen. Snabbt, stabilt och snyggt.",
    cta_button: "Prata med oss",

    cookie_title: "Vi använder cookies",
    cookie_body:
      "Vi använder nödvändiga cookies för att sidan ska fungera och valfria för att förbättra upplevelsen. Du kan ändra ditt val senare.",
    cookie_more_prefix: "Läs mer i vår",
    cookie_policy_link: "policy",
    cookie_accept: "Acceptera",
    cookie_decline: "Avvisa",
    cookie_aria_accept: "Acceptera cookies",
    cookie_aria_decline: "Avvisa cookies",

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
  },
  en: {
    nav_home: "Home",
    nav_about: "About us",
    nav_contact: "Contact",
    nav_services: "Services",

    pricing_title: "Prices",
    pricing_toggle_onetime: "One-time",
    pricing_toggle_monthly: "Monthly",
    pricing_notice_prefix: "*Note:",
    pricing_notice_text:
      "Texts, images and web hosting are not included unless stated. Content and extra features are purchased as add-ons. Domain is not included. SSL certificates are handled by your web host or provider. All prices excl. VAT.",
    pricing_package_label: "Complete package",
    pricing_monthly_label: "Monthly price",
    pricing_onetime_label: "One-time cost",
    pricing_cta_onetime: "Order",
    pricing_cta_monthly: "Choose",
    tier_name_budget: "Website Budget",
    tier_name_small: "Website Small",
    tier_name_medium: "Website Medium",
    tier_name_large: "Website Large",
    pricing_prefill_template:
      "I'm interested in {product} {price}, please contact me",

    contact_page_hero_title: "We help you find the right path",
    contact_page_hero_body:
      "and make it easy to succeed. Get in touch and we'll take the first step together.",
    contact_bullet_1: "Book a meeting with our experts",
    contact_bullet_2: "Do a current state analysis.",
    contact_note:
      "Do you have specific needs not covered by our packages? Get in touch; we'll gladly provide a free quote tailored to your needs.",
    cta_title: "Let’s take your website to the next level",
    cta_body:
      "We help you prioritize what matters — structure first, polish second. Fast, stable and beautiful.",
    cta_button: "Talk to us",

    cookie_title: "We use cookies",
    cookie_body:
      "We use necessary cookies for core functionality and optional ones to improve your experience. You can change your choice later.",
    cookie_more_prefix: "Read more in our",
    cookie_policy_link: "policy",
    cookie_accept: "Accept",
    cookie_decline: "Decline",
    cookie_aria_accept: "Accept cookies",
    cookie_aria_decline: "Decline cookies",

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
  },
};
