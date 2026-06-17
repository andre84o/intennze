# Meta Ads – Statusrapport

**Datum:** 2026-06-15
**Konto/sida:** Intenzzewebbstudio (Facebook-sid-ID: 101218482657252)
**Syfte:** Skapa en engagemangsmålgrupp av personer som interagerat med Facebook-sidan.

---

## Sammanfattning
Uppsättningen kunde **inte slutföras automatiskt** på grund av att Meta Ads-kopplingen
(connectorn) blockerar samtliga anrop. Målet kan dock genomföras manuellt i Meta Ads
Manager (instruktioner längst ner).

## Vad som testades
| Försök | Resultat |
|---|---|
| Hämta annonskonton (läsning) | ❌ `MCP tool call requires approval` |
| Skapa målgrupp | ❌ Ej möjligt – samma blockering |
| Godkänna via mobilapp | ❌ Endast felmeddelande visas, ingen godkännanderuta |
| Byta till webb/desktop | ❌ Samma fel |
| Återansluta connectorn | ❌ Samma fel |

## Identifierade hinder
1. **Connector-auktorisering:** Meta Ads-kopplingen svarar `requires approval` på
   varje anrop, även ofarliga läsningar. Behöver auktoriseras om på server-/connectornivå
   – kan inte lösas via en chattruta.
2. **Verktygsbegränsning:** Även med fungerande koppling stöder verktyget **inte**
   engagemangsmålgrupper byggda på en *Facebook-sida*. Endast Instagram-engagemang,
   webbplatsbesökare (pixel) eller kundlista (CSV) stöds via verktyget.

## Rekommenderade nästa steg
1. Be den som äger miljö-/connectoruppsättningen att **återauktorisera Meta Ads-kopplingen**
   med behörigheter för annonser, målgrupper och pages.
2. Alternativt – skapa målgruppen **manuellt** (se nedan). Detta fungerar oavsett connectorn.

## Manuell väg: FB-sidans engagemangsmålgrupp
1. Meta Ads Manager → **Målgrupper (Audiences)**
2. **Skapa målgrupp → Anpassad målgrupp**
3. Källa: **Facebook-sida**
4. Välj sidan **Intenzzewebbstudio**
5. Händelse: **Alla som interagerat med sidan**
6. Behåll i **365 dagar**
7. Namn: **Intenzze – FB-sidans engagerare (365 dagar)** → **Skapa**

### Tips
- Bygg gärna en **Lookalike** ovanpå målgruppen efteråt för att nå nya, liknande personer.
