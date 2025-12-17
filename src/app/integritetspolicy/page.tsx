import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "Privacy Policy",
        description: "Privacy policy and information about how we handle your personal data.",
        alternates: { canonical: "/integritetspolicy" },
      }
    : {
        title: "Integritetspolicy",
        description: "Integritetspolicy och information om hur vi hanterar dina personuppgifter.",
        alternates: { canonical: "/integritetspolicy" },
      };
}

export default function IntegritetspolicyPage() {
  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-24 md:py-32">
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
              <li>• Information om vad du är intresserad av, till exempel typ av hemsida, tidsplan och budget</li>
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
            <p className="text-slate-300 leading-relaxed mb-3">Vi behandlar dina personuppgifter för att:</p>
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
              <li>• <span className="text-white font-medium">Berättigat intresse</span>, för att kunna kommunicera med dig och hantera förfrågningar</li>
              <li>• <span className="text-white font-medium">Avtal</span>, om vi ingår avtal eller behöver ta steg innan avtal</li>
              <li>• <span className="text-white font-medium">Samtycke</span>, när det gäller vissa cookies eller marknadsföring där samtycke krävs</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Hur länge vi sparar uppgifterna</h2>
            <p className="text-slate-300 leading-relaxed mb-3">Vi sparar uppgifter bara så länge det behövs för syftet:</p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>• Förfrågningar som inte leder till uppdrag sparas normalt upp till 12 månader</li>
              <li>• Kundärenden kan sparas längre på grund av bokföringskrav och hantering av avtal</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Vilka vi kan dela uppgifter med</h2>
            <p className="text-slate-300 leading-relaxed mb-3">
              Vi kan dela personuppgifter med betrodda leverantörer som hjälper oss att driva verksamheten, till exempel:
            </p>
            <ul className="text-slate-300 space-y-1 ml-4">
              <li>• E-post och kommunikationsverktyg</li>
              <li>• Webbhotell och drift</li>
              <li>• CRM eller system för leadhantering</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-4">
              När du fyller i formulär via Facebook eller Instagram behandlar Meta också informationen enligt sina villkor och sin policy.
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
              Vissa leverantörer kan behandla uppgifter utanför EU och EES. Om det sker använder vi skyddsåtgärder som EU standardavtalsklausuler eller motsvarande.
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
              Vi vidtar rimliga tekniska och organisatoriska åtgärder för att skydda personuppgifter mot obehörig åtkomst, förlust och missbruk.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Klagomål</h2>
            <p className="text-slate-300 leading-relaxed">
              Om du anser att vi hanterar dina personuppgifter fel kan du kontakta oss. Du har också rätt att klaga hos Integritetsskyddsmyndigheten.
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
              GDPR är EU-regler som styr hur företag får samla in och använda personuppgifter. Personuppgifter är allt som kan kopplas till en person, till exempel namn, e-post, telefonnummer, IP-adress och online-identifierare.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Vi behandlar bara personuppgifter när vi har en laglig grund, till exempel för att svara på en förfrågan, fullfölja ett avtal, följa lagkrav eller när du har gett samtycke.
            </p>
          </section>

          {/* Data Sources */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Varifrån vi samlar in uppgifter</h2>
            <p className="text-slate-300 leading-relaxed mb-4">Vi kan samla in uppgifter från följande källor:</p>

            <div className="space-y-6">
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2">1. Direkt från dig</h3>
                <p className="text-slate-300">
                  När du fyller i formulär på vår webbplats, kontaktar oss via e-post, telefon eller sociala medier, eller bokar möte.
                </p>
              </div>

              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2">2. Meta, Facebook och Instagram</h3>
                <p className="text-slate-300">
                  När du skickar in ett leadformulär via Facebook eller Instagram kan vi få uppgifter som namn, e-post, telefonnummer och dina svar i formuläret. Meta behandlar också informationen enligt sin egen integritetspolicy.
                </p>
              </div>

              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2">3. Google-tjänster</h3>
                <p className="text-slate-300 mb-3">
                  Vi kan använda Google-verktyg som innebär att data samlas in på vår webbplats:
                </p>
                <ul className="text-slate-400 space-y-2 text-sm">
                  <li>• <span className="text-slate-300">Google Analytics:</span> statistik om besök och användning</li>
                  <li>• <span className="text-slate-300">Google Ads:</span> mäter om annonser leder till kontakt eller köp</li>
                  <li>• <span className="text-slate-300">Google Tag Manager:</span> hanterar taggar på webbplatsen</li>
                  <li>• <span className="text-slate-300">Google Search Console:</span> sökstatistik och tekniska insikter</li>
                  <li>• <span className="text-slate-300">Google reCAPTCHA:</span> skyddar formulär mot spam</li>
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
              <li>• <span className="text-white font-medium">Berättigat intresse</span>, till exempel för att kunna svara på förfrågningar och förbättra tjänsten</li>
              <li>• <span className="text-white font-medium">Avtal</span>, när vi behöver uppgifter för att leverera eller förbereda ett uppdrag</li>
              <li>• <span className="text-white font-medium">Samtycke</span>, främst för analys och marknadsföringscookies när samtycke krävs</li>
              <li>• <span className="text-white font-medium">Rättslig förpliktelse</span>, till exempel bokföring</li>
            </ul>
          </section>

          {/* Storage time */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Lagringstid</h2>
            <p className="text-slate-300 leading-relaxed">
              Vi sparar uppgifter bara så länge det behövs. Leads som inte blir kund sparas normalt upp till 12 månader. Kunduppgifter kan sparas längre om det behövs för avtal och bokföring.
            </p>
          </section>

          {/* Third parties */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Tredje parter och personuppgiftsbiträden</h2>
            <p className="text-slate-300 leading-relaxed">
              Vi kan använda externa leverantörer för drift och analys, till exempel Meta och Google. När vi använder leverantörer kan uppgifter behandlas utanför EU och EES. Om det sker använder vi skyddsåtgärder som EU standardavtalsklausuler eller motsvarande.
            </p>
          </section>

          {/* Your rights summary */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Dina rättigheter</h2>
            <p className="text-slate-300 leading-relaxed">
              Du har rätt att begära tillgång, rättelse, radering, invända, begränsa behandling och i vissa fall få ut data. Du kan också återkalla samtycke när behandling bygger på samtycke.
            </p>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-slate-800">
            <p className="text-sm text-slate-500">
              Senast uppdaterad: December 2025
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
