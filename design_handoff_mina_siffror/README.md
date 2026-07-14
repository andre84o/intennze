# Handoff: "Mina siffror" — säljar-dashboard (Intenzze /admin)

## Overview
En personlig försäljnings- & provisionsvy ("Mina siffror") för inloggad säljare/admin.
Visar KPI:er, årlig försäljningskurva, provision per månad och en kundtabell för
aktuell månad. Desktop + mobil. All text är på svenska. Valuta = SEK ("kr"),
tusental med **punkt** (t.ex. `82.500 kr`).

Målet är att ersätta/komplettera nuvarande innehåll på `/admin`-dashboarden
(komponenten `MyCommission` som renderas från `src/app/admin/page.tsx`).

## About the Design Files
Filerna i detta paket är **designreferenser skapade i HTML** — en prototyp som visar
avsett utseende och beteende, **inte** produktionskod att kopiera rakt av.
Uppgiften är att **återskapa designen i det befintliga projektet** (Next.js App
Router + React + Tailwind + Supabase) med projektets etablerade mönster.

`Sales Dashboard.dc.html` är en "Design Component" och laddar en runtime (`support.js`).
Det är bara för förhandsvisning — ignorera `support.js`, `<x-dc>`, `sc-for`, `{{ }}`
och `renderVals()`. Läs den som en visuell spec: markup + inline-stilar.

## Fidelity
**Hi-fi.** Färger, typografi, spacing, radier och skuggor är slutgiltiga och ska
återskapas pixel-nära med Tailwind. Diagrammen är enkla inline-SVG och kan
återskapas som SVG-komponenter eller med befintligt chart-bibliotek.

## Target codebase & integration point
- Repo: `andre84o/intennze` — Next.js (App Router), React, Tailwind, Supabase.
- Renderas idag via `src/app/admin/page.tsx` → `<MyCommission initialMonth={...} />`
  (från `src/app/admin/sales/SalesClient.tsx`), inlindad i en `bg-[#f6f5fb]`-behållare,
  endast för `profiles.commission_eligible === true`.
- Sidomeny/header/utloggning finns redan i `AdminSidebar.tsx` / `AdminHeader.tsx` —
  **återanvänd dem**. Sidomenyn och "Logga ut" i HTML-prototypen är bara med för att
  visa helheten; bygg INTE en ny sidomeny. Fokusera på själva "Mina siffror"-innehållet
  (header-rad med titel/status/månadsväljare, KPI-grid, diagram, kundtabell).

## Data mapping (ersätt demo-siffrorna med riktig data)
Källor finns redan i `src/app/admin/sales/actions.ts`:

- `getMyCommissionSummary(month)` → `CommissionFigures`:
  - Betald omsättning ex moms → `revenueExVat`
  - Intjänad provision → `earnedCommission`
  - Aktuell provisionsnivå → `tierRatePercent` (%)
  - Utbetald provision → `paidCommission`
  - Ej utbetald provision → `unpaidCommission`
  - Kvar till nästa nivå → `kvarTillNastaNiva` (progress = revenue / (revenue + kvar))
  - Status-badge (Godkänd/…) → `status` (`open`/`approved`/`paid`)
- `getSalesTrend("me", month, 8)` → stapeldiagrammet "Provision per månad" (`points[].commission`).
  Årskurvan kan använda `getSalesTrend("me", month, 12)` (`points[].revenue`).
- `getMyCommissionBreakdown(month)` → kundtabellen "Kunder denna månad":
  `entries[]` → rad per faktura (kund/företag via `customer_id`-join, paket, datum
  `paidAt`, belopp `amountExVat`). `adjustments[]` kan visas som extra rader om ni vill.
- `%`-badgarna (▲12% osv.) i KPI-korten är demo — beräkna mot föregående månad
  eller ta bort om data saknas.

Tomt läge: när ingen `commission_periods`-rad finns returnerar summariet nollor —
visa 0-värden snyggt (inte en felruta).

## Screens / Views

### 1. Desktop — "Mina siffror"
- **Layout**: 2 kolumner. Vänster sidomeny (256px, hopfällbar till 84px) — **finns redan**.
  Höger `main`: padding 34px 38px, kolumn-flöde med tre sektioner.
- **Header-rad**: vänster = H1 "Mina siffror" (28px/800, letter-spacing -0.9px, färg `#211D33`)
  + status-badge "Godkänd" (pill, bg `#E9FBF2`, text `#0E9E63`, 6px prick `#12b371`).
  Underrubrik 13.5px `#8A87A0`. Höger = månadsväljare (vit pill, chevrons, "Juli 2026",
  700), notis-ikon-knapp, avatar 42px (violett gradient, initialer "EL").
- **KPI-grid**: `grid-template-columns: repeat(3,1fr); gap:22px`. 6 kort. **Inga ikoner** i korten.
  Varje kort: vit bg, border `1px #ECE9F4`, radius 24px, padding 22px 24px,
  skugga `0 1px 2px rgba(31,26,58,.04), 0 20px 44px -26px rgba(74,58,130,.3)`. **Ingen hover-rörelse.**
  Innehåll: liten etikett 12.5px/600 `#8A87A0`, stort tal 28px/800 `#211D33`
  letter-spacing -1.1px + enhet ("kr"/"%") 16px/700 `#B4B0C7`. Tabellsiffror.
  - Kort 1–3 (Betald omsättning, Intjänad provision, Aktuell provisionsnivå): grön
    procent-badge uppe till höger + liten sparkline-SVG i botten (stroke i kortets
    accentfärg, dubbel med 0.15 opacity för glöd). Accenter: `#6E5CF3`, `#8B5CF6`, `#14B8C4`.
  - Kort 4–5 (Utbetald, Ej utbetald): bara etikett + tal.
  - Kort 6 (Kvar till nästa nivå): ljust violett kort (bg `linear-gradient(155deg,#F6F3FF,#FFF)`,
    border `#E7E2F8`), progress-bar (spår `#EAE5FA`, fyllning `linear-gradient(90deg,#6E5CF3,#9E8CFF)`,
    82.5%, med vit knapp Ø13 + violett 3px border), undertext "82.500 kr av 100.000 kr mål".
- **Diagram-rad**: `grid-template-columns: 1.55fr 1fr; gap:22px`.
  - Årlig försäljning: area+linjekurva (stroke `#6E5CF3` 3px + glöd 8px/0.12, area-gradient
    `#6E5CF3` 0.24→0), streckade hjälplinjer (`#F0EFF7`, dash 2 6), markör-punkt med halo
    (r10 fill 0.16 + r5 fill vit-ring) på nuvarande månad. X-etiketter Jan–Dec 10.5px `#B4B0C7`.
    Titel 16px/800, värde uppe till höger 21px/800 + grön delta.
  - Provision per månad: 8 staplar, `linear-gradient(180deg,#7c6cf8,#d7d1fb)`, radius 11px,
    max-bredd 22px, skugga `0 8px 16px -8px rgba(109,94,246,.45)`, värdelabel ovanför
    10px/700 `#8578E8`, månadslabel under 10px `#B4B0C7`.
- **Kundtabell**: vitt kort, radius 24px. Rubrikrad: "Kunder denna månad" 16px/800 +
  undertext + pill "N affärer" (`#6E5CF3` på `#F2EFFE`). Kolumn-headers 10.5px/700
  `#B4B0C7` uppercase, letter-spacing .6px: Kund | Företag | Paket | Säljdatum | Belopp ex moms.
  Grid `1.3fr 1.4fr 1.1fr 0.9fr 1fr`, radhöjd padding 15px 28px, radavdelare `1px #F7F6FB`,
  hover-bg `#FBFAFE`. Kund = avatar 34px (gradient, initialer) + namn 13.5px/700.
  Paket = tonad chip (färg/bg per paket). Belopp högerställt 13.5px/700 tabellsiffror.
  Total-rad: bg `linear-gradient(180deg,#FBFAFE,#F7F5FD)`, "Totalt" + summa 15.5px/800 `#6E5CF3`.

### 2. Mobil — "Mina siffror"
- Enkolumns, padding 18px. Toppbar (hälsning + avatar), rad med status-badge +
  månadsväljare.
- **Hero-kort** (mörkt): `linear-gradient(150deg,#2E2748,#453B72)`, radius 26px, en mjuk
  radiell violett glöd uppe till höger. Etikett `#C6C0E4`, stort tal 36px/800 vitt,
  delta-badge, progress-bar (spår vit 0.16, fyllning `linear-gradient(90deg,#9E8CFF,#d4ccff)`
  + vit knapp), undertext "17.500 kr till nästa nivå".
- **KPI-grid**: `1fr 1fr`, gap 13px, 4 vita kort (Intjänad/Provisionsnivå/Utbetald/Ej utbetald),
  radius 18px, **inga ikoner**, tal 19px/800.
- **Provision per månad**: vitt kort, 8 staplar (max-bredd 16px, radius 8px).
- **Kundlista**: vitt kort, rad = avatar 38px + namn/"företag · paket" + belopp/datum högerställt.
- **Botten-tabbar**: glas (`rgba(255,255,255,.9)` + blur), 4 flikar (Hem aktiv violett,
  Försäljning, Kunder, Inställningar).

## Design Tokens
- **Ink / text**: primär `#211D33`, sekundär `#67637E`, mut `#8A87A0`, svag `#B4B0C7`.
- **Accent (violett)**: `#6E5CF3` → `#9E8CFF` (gradient), mörk `#574fd6`.
- **Sekundära accenter (sparklines/avatarer)**: lila `#8B5CF6`, teal `#14B8C4`,
  grön `#10B981`, amber `#F59E0B`.
- **Positiv**: text `#0E9E63`, bg `#E9FBF2`/`#EAFBF3`, prick `#12b371`.
- **Logga ut**: `#C05470`, hover-bg `#FBEEF1`.
- **Ytor**: kort `#FFFFFF`; kort-border `#ECE9F4`; sidobg desktop
  `radial-gradient(120% 90% at 88% -12%, #F7F1FC, #F0EEF8 42%, #EBE9F4)`; body-fallback `#ECEAF4`.
- **Radier**: kort 24px, ikon/chip-rutor 12–13px, chip 9–10px, pill 20px, telefon 54px.
- **Skuggor**: kort `0 1px 2px rgba(31,26,58,.04), 0 20px 44px -26px rgba(74,58,130,.3)`;
  hero mobil `0 24px 44px -20px rgba(60,50,120,.75)`.
- **Spacing**: sektions-gap 22px; main-padding 34px 38px; kort-padding 22px 24px.
- **Typografi**:
  - Brödtext/etiketter: **Plus Jakarta Sans** (400–800).
  - **Alla siffror/belopp: Space Grotesk** (500–700) — ladda via `next/font/google`,
    applicera på tal-element (motsvarar `font-variant-numeric: tabular-nums` + Space Grotesk).
  - Stora tal: 28px/800 desktop, 36px/800 mobil-hero, letter-spacing ~ -1.1px.

## Assets
Inga bild-assets. Alla ikoner är inline-SVG (stroke, 24-viewBox). Avatarer är
gradient-rutor med initialer. Behåll gärna projektets befintliga ikonset (Heroicons
används redan i repo:t) istället för att kopiera SVG-sökvägarna rakt av.

## Files
- `Sales Dashboard.dc.html` — hela designen (desktop + mobil). Öppna i webbläsare för
  att se den live. Läs markup + inline-stilar som spec.
- `support.js` — endast preview-runtime, **ska inte** in i projektet.
