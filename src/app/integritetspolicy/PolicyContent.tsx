"use client";

import { useLanguage } from "@/app/i18n/LanguageProvider";

const getFormattedDate = (lang: "sv" | "en") => {
  const now = new Date();
  const year = now.getFullYear();

  const monthsSv = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December"
  ];
  const monthsEn = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const month = lang === "sv" ? monthsSv[now.getMonth()] : monthsEn[now.getMonth()];
  return `${month} ${year}`;
};

export default function PolicyContent() {
  const { lang } = useLanguage();

  if (lang === "en") {
    return (
      <>
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
            Privacy Policy
          </span>
        </h1>
        <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mb-12" />

        {/* Content */}
        <div className="space-y-10">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Data Controller</h2>
            <p className="text-slate-300 leading-relaxed">
              Intenzze is the data controller for the processing of your personal data.
            </p>
            <p className="text-slate-400 mt-2">Company: Intenzze</p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. What data we collect</h2>
            <p className="text-slate-300 leading-relaxed mb-3">
              We may collect the following information when you contact us or submit a form:
            </p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>• Name</li>
              <li>• Email address</li>
              <li>• Phone number</li>
              <li>• Information you provide in messages or free text fields</li>
              <li>
                • Information about what you are interested in, for example type of website, timeline and
                budget
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Where the data comes from</h2>
            <p className="text-slate-300 leading-relaxed mb-3">We collect data when you:</p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>• Contact us via email, phone or social media</li>
              <li>• Submit a lead form via Facebook or Instagram</li>
              <li>• Visit our website and accept cookies, if cookies are enabled in your browser</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Why we process your data</h2>
            <p className="text-slate-300 leading-relaxed mb-3">
              We process your personal data in order to:
            </p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>• Respond to your enquiry and contact you</li>
              <li>• Provide quotes or propose solutions</li>
              <li>• Plan a meeting or walkthrough</li>
              <li>• Follow up on previous contact</li>
              <li>• Improve our marketing and understand which ads work</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Legal basis under GDPR</h2>
            <p className="text-slate-300 leading-relaxed mb-3">We process personal data based on:</p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>
                • <span className="text-white font-medium">Legitimate interest</span>, to communicate with
                you and handle enquiries
              </li>
              <li>
                • <span className="text-white font-medium">Contract</span>, when we enter into an
                agreement or need to take steps prior to entering into one
              </li>
              <li>
                • <span className="text-white font-medium">Consent</span>, for certain cookies or
                marketing where consent is required
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. How long we store the data</h2>
            <p className="text-slate-300 leading-relaxed mb-3">
              We only store data for as long as necessary for the purpose:
            </p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>
                • Enquiries that do not lead to an assignment are normally stored for up to 12 months
              </li>
              <li>
                • Customer matters may be stored for a longer period due to accounting requirements and
                contract management
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Who we may share data with</h2>
            <p className="text-slate-300 leading-relaxed mb-3">
              We may share personal data with trusted providers that help us run our business, for
              example:
            </p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>• Email and communication tools</li>
              <li>• Web hosting and infrastructure</li>
              <li>• CRM or lead management systems</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-4">
              When you submit forms via Facebook or Instagram, Meta also processes the information
              according to its own terms and privacy policy.
            </p>
            <a
              href="https://www.facebook.com/privacy/policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Meta Privacy Policy →
            </a>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Transfers outside the EU/EEA</h2>
            <p className="text-slate-300 leading-relaxed">
              Some providers may process data outside the EU/EEA. If this happens, we use safeguards such
              as the EU Standard Contractual Clauses or equivalent.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Your rights</h2>
            <p className="text-slate-300 leading-relaxed mb-3">You have the right to:</p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>• Access the personal data we hold about you</li>
              <li>• Request rectification of inaccurate data</li>
              <li>• Request erasure in certain cases</li>
              <li>• Object to processing based on legitimate interest</li>
              <li>• Request restriction of processing</li>
              <li>• Request data portability where applicable</li>
              <li>• Withdraw consent when processing is based on consent</li>
            </ul>
            <p className="text-slate-400 mt-4">
              To exercise your rights, please contact us by email.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Security</h2>
            <p className="text-slate-300 leading-relaxed">
              We take reasonable technical and organisational measures to protect personal data from
              unauthorised access, loss and misuse.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Complaints</h2>
            <p className="text-slate-300 leading-relaxed">
              If you believe we are processing your personal data incorrectly, you can contact us. You also
              have the right to lodge a complaint with the Swedish Authority for Privacy Protection (IMY).
            </p>
            <a
              href="https://www.imy.se/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              IMY.se →
            </a>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Changes to this policy</h2>
            <p className="text-slate-300 leading-relaxed">
              We may update this policy when needed. The latest version is always available on our
              website.
            </p>
          </section>

          {/* Divider */}
          <div className="border-t border-slate-800 my-12" />

          {/* GDPR Summary */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">GDPR in brief</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              GDPR is EU legislation that regulates how companies may collect and use personal data.
              Personal data is anything that can be linked to an individual, such as name, email, phone
              number, IP address and online identifiers.
            </p>
            <p className="text-slate-300 leading-relaxed">
              We only process personal data when we have a legal basis, for example to respond to an
              enquiry, fulfil a contract, comply with legal obligations or when you have given consent.
            </p>
          </section>

          {/* Data Sources */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Where we collect data from</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We may collect data from the following sources:
            </p>

            <div className="space-y-6">
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2">1. Directly from you</h3>
                <p className="text-slate-300">
                  When you fill in forms on our website, contact us via email, phone or social media, or
                  book a meeting.
                </p>
              </div>

              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2">2. Meta, Facebook and Instagram</h3>
                <p className="text-slate-300">
                  When you submit a lead form via Facebook or Instagram, we may receive information such as
                  name, email, phone number and your answers in the form. Meta also processes the
                  information according to its own privacy policy.
                </p>
              </div>

              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2">3. Google services</h3>
                <p className="text-slate-300 mb-3">
                  We may use Google tools that involve data being collected on our website:
                </p>
                <ul className="text-slate-400 space-y-2 text-sm">
                  <li>
                    • <span className="text-slate-300">Google Analytics:</span> statistics about visits
                    and usage
                  </li>
                  <li>
                    • <span className="text-slate-300">Google Ads:</span> measures whether ads lead to
                    contact or purchases
                  </li>
                  <li>
                    • <span className="text-slate-300">Google Tag Manager:</span> manages tags on the
                    website
                  </li>
                  <li>
                    • <span className="text-slate-300">Google Search Console:</span> search statistics and
                    technical insights
                  </li>
                  <li>
                    • <span className="text-slate-300">Google reCAPTCHA:</span> protects forms from spam
                  </li>
                </ul>
              </div>

              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2">4. Cookies and similar technologies</h3>
                <p className="text-slate-300 mb-3">We may use cookies and similar technologies to:</p>
                <ul className="text-slate-400 space-y-1 text-sm">
                  <li>• Make the website function</li>
                  <li>• Measure traffic and improve the website</li>
                  <li>• Measure and improve advertising</li>
                </ul>
                <p className="text-slate-400 mt-3 text-sm">
                  You can often control cookies via our cookie banner or your browser settings.
                </p>
              </div>
            </div>
          </section>

          {/* Why we use data */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Why we use the data</h2>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>• Respond to your enquiry and contact you</li>
              <li>• Provide quotes and plan projects</li>
              <li>• Follow up on communication and customer matters</li>
              <li>• Improve the website and marketing</li>
              <li>• Prevent fraud and spam</li>
            </ul>
          </section>

          {/* Legal basis */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Legal basis</h2>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>
                • <span className="text-white font-medium">Legitimate interest</span>, for example to
                respond to enquiries and improve the service
              </li>
              <li>
                • <span className="text-white font-medium">Contract</span>, when we need data to deliver or
                prepare an assignment
              </li>
              <li>
                • <span className="text-white font-medium">Consent</span>, mainly for analytics and
                marketing cookies where consent is required
              </li>
              <li>
                • <span className="text-white font-medium">Legal obligation</span>, for example accounting
              </li>
            </ul>
          </section>

          {/* Storage time */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Retention period</h2>
            <p className="text-slate-300 leading-relaxed">
              We only store data for as long as needed. Leads that do not become customers are normally
              stored for up to 12 months. Customer data may be stored for a longer period if needed for
              contracts and accounting.
            </p>
          </section>

          {/* Third parties */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Third parties and processors</h2>
            <p className="text-slate-300 leading-relaxed">
              We may use external providers for hosting, operations and analytics, such as Meta and Google.
              When we use such providers, data may be processed outside the EU/EEA. If this happens, we use
              safeguards such as the EU Standard Contractual Clauses or equivalent.
            </p>
          </section>

          {/* Your rights summary */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Your rights</h2>
            <p className="text-slate-300 leading-relaxed">
              You have the right to request access, rectification, erasure, objection, restriction of
              processing and, in some cases, data portability. You can also withdraw consent when
              processing is based on consent.
            </p>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-slate-800">
            <p className="text-sm text-slate-500">Last updated: {getFormattedDate("en")}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
          Integritetspolicy
        </span>
      </h1>
      <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mb-12" />

      {/* Content */}
      <div className="space-y-10">
        {/* Section 1 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">1. Personuppgiftsansvarig</h2>
          <p className="text-slate-300 leading-relaxed">
            Intenzze är personuppgiftsansvarig för behandlingen av dina personuppgifter.
          </p>
          <p className="text-slate-400 mt-2">Företag: Intenzze</p>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">2. Vilka uppgifter vi samlar in</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Vi kan samla in följande uppgifter när du kontaktar oss eller fyller i ett formulär:
          </p>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>• Namn</li>
            <li>• E-postadress</li>
            <li>• Telefonnummer</li>
            <li>• Uppgifter du själv skriver i meddelanden eller fritextfält</li>
            <li>
              • Information om vad du är intresserad av, till exempel typ av hemsida, tidsplan och
              budget
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">3. Varifrån uppgifterna kommer</h2>
          <p className="text-slate-300 leading-relaxed mb-3">Vi samlar in uppgifter när du:</p>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>• Kontaktar oss via e-post, telefon eller sociala medier</li>
            <li>• Fyller i ett leadformulär via Facebook eller Instagram</li>
            <li>• Besöker vår webbplats och godkänner cookies, om du har cookies aktiverade</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">4. Varför vi behandlar dina uppgifter</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Vi behandlar dina personuppgifter för att:
          </p>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>• Svara på din förfrågan och kunna kontakta dig</li>
            <li>• Ge offert eller förslag på lösning</li>
            <li>• Planera ett möte eller en genomgång</li>
            <li>• Följa upp tidigare kontakt</li>
            <li>• Förbättra vår marknadsföring och förstå vilka annonser som fungerar</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">5. Rättslig grund enligt GDPR</h2>
          <p className="text-slate-300 leading-relaxed mb-3">Vi behandlar personuppgifter med stöd av:</p>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>
              • <span className="text-white font-medium">Berättigat intresse</span>, för att kunna
              kommunicera med dig och hantera förfrågningar
            </li>
            <li>
              • <span className="text-white font-medium">Avtal</span>, om vi ingår avtal eller behöver ta
              steg innan avtal
            </li>
            <li>
              • <span className="text-white font-medium">Samtycke</span>, när det gäller vissa cookies
              eller marknadsföring där samtycke krävs
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">6. Hur länge vi sparar uppgifterna</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Vi sparar uppgifter bara så länge det behövs för syftet:
          </p>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>
              • Förfrågningar som inte leder till uppdrag sparas normalt upp till 12 månader
            </li>
            <li>
              • Kundärenden kan sparas längre på grund av bokföringskrav och hantering av avtal
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">7. Vilka vi kan dela uppgifter med</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Vi kan dela personuppgifter med betrodda leverantörer som hjälper oss att driva verksamheten,
            till exempel:
          </p>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>• E-post och kommunikationsverktyg</li>
            <li>• Webbhotell och drift</li>
            <li>• CRM eller system för leadhantering</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mt-4">
            När du fyller i formulär via Facebook eller Instagram behandlar Meta också informationen enligt
            sina villkor och sin policy.
          </p>
          <a
            href="https://www.facebook.com/privacy/policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Meta integritetspolicy →
          </a>
        </section>

        {/* Section 8 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">8. Överföring till tredje land</h2>
          <p className="text-slate-300 leading-relaxed">
            Vissa leverantörer kan behandla uppgifter utanför EU och EES. Om det sker använder vi
            skyddsåtgärder som EU standardavtalsklausuler eller motsvarande.
          </p>
        </section>

        {/* Section 9 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">9. Dina rättigheter</h2>
          <p className="text-slate-300 leading-relaxed mb-3">Du har rätt att:</p>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>• Få tillgång till vilka uppgifter vi har om dig</li>
            <li>• Begära rättelse om något är fel</li>
            <li>• Begära radering i vissa fall</li>
            <li>• Invända mot behandling som baseras på berättigat intresse</li>
            <li>• Begära begränsning av behandling</li>
            <li>• Begära dataportabilitet när det är tillämpligt</li>
            <li>• Återkalla samtycke när behandling bygger på samtycke</li>
          </ul>
          <p className="text-slate-400 mt-4">
            För att använda dina rättigheter, kontakta oss via e-post.
          </p>
        </section>

        {/* Section 10 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">10. Säkerhet</h2>
          <p className="text-slate-300 leading-relaxed">
            Vi vidtar rimliga tekniska och organisatoriska åtgärder för att skydda personuppgifter mot
            obehörig åtkomst, förlust och missbruk.
          </p>
        </section>

        {/* Section 11 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">11. Klagomål</h2>
          <p className="text-slate-300 leading-relaxed">
            Om du anser att vi hanterar dina personuppgifter fel kan du kontakta oss. Du har också rätt att
            klaga hos Integritetsskyddsmyndigheten.
          </p>
          <a
            href="https://www.imy.se/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            IMY.se →
          </a>
        </section>

        {/* Section 12 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">12. Ändringar i policyn</h2>
          <p className="text-slate-300 leading-relaxed">
            Vi kan uppdatera denna policy vid behov. Den senaste versionen finns alltid på vår webbplats.
          </p>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-800 my-12" />

        {/* GDPR Summary */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">GDPR i korthet</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            GDPR är EU-regler som styr hur företag får samla in och använda personuppgifter.
            Personuppgifter är allt som kan kopplas till en person, till exempel namn, e-post,
            telefonnummer, IP-adress och online-identifierare.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Vi behandlar bara personuppgifter när vi har en laglig grund, till exempel för att svara på en
            förfrågan, fullfölja ett avtal, följa lagkrav eller när du har gett samtycke.
          </p>
        </section>

        {/* Data Sources */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Varifrån vi samlar in uppgifter</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Vi kan samla in uppgifter från följande källor:
          </p>

          <div className="space-y-6">
            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-2">1. Direkt från dig</h3>
              <p className="text-slate-300">
                När du fyller i formulär på vår webbplats, kontaktar oss via e-post, telefon eller sociala
                medier, eller bokar möte.
              </p>
            </div>

            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-2">2. Meta, Facebook och Instagram</h3>
              <p className="text-slate-300">
                När du skickar in ett leadformulär via Facebook eller Instagram kan vi få uppgifter som
                namn, e-post, telefonnummer och dina svar i formuläret. Meta behandlar också informationen
                enligt sin egen integritetspolicy.
              </p>
            </div>

            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-2">3. Google-tjänster</h3>
              <p className="text-slate-300 mb-3">
                Vi kan använda Google-verktyg som innebär att data samlas in på vår webbplats:
              </p>
              <ul className="text-slate-400 space-y-2 text-sm">
                <li>
                  • <span className="text-slate-300">Google Analytics:</span> statistik om besök och
                  användning
                </li>
                <li>
                  • <span className="text-slate-300">Google Ads:</span> mäter om annonser leder till
                  kontakt eller köp
                </li>
                <li>
                  • <span className="text-slate-300">Google Tag Manager:</span> hanterar taggar på
                  webbplatsen
                </li>
                <li>
                  • <span className="text-slate-300">Google Search Console:</span> sökstatistik och
                  tekniska insikter
                </li>
                <li>
                  • <span className="text-slate-300">Google reCAPTCHA:</span> skyddar formulär mot spam
                </li>
              </ul>
            </div>

            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-2">4. Cookies och liknande teknik</h3>
              <p className="text-slate-300 mb-3">Vi kan använda cookies och liknande teknik för att:</p>
              <ul className="text-slate-400 space-y-1 text-sm">
                <li>• Få webbplatsen att fungera</li>
                <li>• Mäta trafik och förbättra webbplatsen</li>
                <li>• Mäta och förbättra annonsering</li>
              </ul>
              <p className="text-slate-400 mt-3 text-sm">
                Du kan ofta styra cookies via vår cookie-banner eller via inställningar i din webbläsare.
              </p>
            </div>
          </div>
        </section>

        {/* Why we use data */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Varför vi använder uppgifterna</h2>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>• Svara på din förfrågan och kontakta dig</li>
            <li>• Lämna offert och planera projekt</li>
            <li>• Följa upp dialog och kundärenden</li>
            <li>• Förbättra webbplats och marknadsföring</li>
            <li>• Förebygga bedrägerier och spam</li>
          </ul>
        </section>

        {/* Legal basis */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Laglig grund</h2>
          <ul className="text-slate-300 space-y-1 ml-4">
            <li>
              • <span className="text-white font-medium">Berättigat intresse</span>, till exempel för att
              kunna svara på förfrågningar och förbättra tjänsten
            </li>
            <li>
              • <span className="text-white font-medium">Avtal</span>, när vi behöver uppgifter för att
              leverera eller förbereda ett uppdrag
            </li>
            <li>
              • <span className="text-white font-medium">Samtycke</span>, främst för analys och
              marknadsföringscookies när samtycke krävs
            </li>
            <li>
              • <span className="text-white font-medium">Rättslig förpliktelse</span>, till exempel
              bokföring
            </li>
          </ul>
        </section>

        {/* Storage time */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Lagringstid</h2>
          <p className="text-slate-300 leading-relaxed">
            Vi sparar uppgifter bara så länge det behövs. Leads som inte blir kund sparas normalt upp till
            12 månader. Kunduppgifter kan sparas längre om det behövs för avtal och bokföring.
          </p>
        </section>

        {/* Third parties */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Tredje parter och personuppgiftsbiträden</h2>
          <p className="text-slate-300 leading-relaxed">
            Vi kan använda externa leverantörer för drift och analys, till exempel Meta och Google. När vi
            använder leverantörer kan uppgifter behandlas utanför EU och EES. Om det sker använder vi
            skyddsåtgärder som EU standardavtalsklausuler eller motsvarande.
          </p>
        </section>

        {/* Your rights summary */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Dina rättigheter</h2>
          <p className="text-slate-300 leading-relaxed">
            Du har rätt att begära tillgång, rättelse, radering, invända, begränsa behandling och i vissa
            fall få ut data. Du kan också återkalla samtycke när behandling bygger på samtycke.
          </p>
        </section>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500">Senast uppdaterad: {getFormattedDate("sv")}</p>
        </div>
      </div>
    </>
  );
}
