export type Lang = "sv" | "en";

export const dict: Record<Lang, Record<string, string>> = {
  sv: {
    nav_home: "Hem",
    nav_about: "Om oss",
    nav_contact: "Kontakt",
    // Contact page hero & copy
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
  },
  en: {
    nav_home: "Home",
    nav_about: "About us",
    nav_contact: "Contact",
    // Contact page hero & copy
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
  },
};
