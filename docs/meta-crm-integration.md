# Meta ↔ CRM-integration

Denna guide beskriver hela kopplingen mellan CRM-tratten och Meta (Facebook/Instagram):
inkommande leads, offline-konverteringar för tratt-steg, och Custom Audiences.

## Översikt av flödet

```
Webbformulär ─┐
              ├─► CRM (customers) ──► Statusändring ──► Meta Conversions API
Lead Ads ─────┘                       (tratt-steg)      (offline-konvertering)
                                          │
                                          └──► Custom Audiences (retargeting/lookalikes)
```

1. **Inkommande leads**
   - Webbformuläret skickar Meta Pixel + CAPI `Lead`-event (deduplicerat via delat `event_id`).
   - Facebook Lead Ads skickas via webhook `/api/facebook/leads` och skapar en kund med
     `source = facebook_ads`. `leadgen_id` sparas både som `facebook_lead_id` och `meta_lead_id`
     så att senare tratt-events kan attribueras tillbaka till annonsen.

2. **Tratt-steg → Meta Conversions API** (`/api/meta/conversion`)
   När en kunds status ändras i CRM:t mappas steget till ett Meta-event:

   | CRM-status   | Meta-event         | Lead score | Värde (SEK) |
   |--------------|--------------------|-----------:|------------:|
   | `lead`       | `Lead`             | 1          | 1000        |
   | `contacted`  | `Contact`          | 2          | 2000        |
   | `negotiating`| `InitiateCheckout` | 3          | 3000        |
   | `customer`   | `Purchase`         | 4          | 4000        |
   | `churned`    | `Other`            | 0          | 0           |

   Eventen skickas som `action_source: system_generated` och matchas mot Meta via
   `lead_id` (Lead Ads), `external_id` (kund-id) samt hashad e-post/telefon/namn.

3. **Custom Audiences** (`/api/meta/audience/sync`)
   Synkar ett CRM-segment till en Data File Custom Audience (DFCA) för retargeting/lookalikes.

## Miljövariabler

```env
# Meta Conversions API (befintlig)
META_PIXEL_ID=din_pixel_id
META_CAPI_ACCESS_TOKEN=token_med_capi_behörighet
NEXT_PUBLIC_META_PIXEL_ID=din_pixel_id   # samma som ovan, för browser-pixeln

# Facebook Lead Ads (befintlig)
FACEBOOK_VERIFY_TOKEN=valfri_unik_sträng
FACEBOOK_ACCESS_TOKEN=page_access_token
FACEBOOK_APP_SECRET=app_secret           # används för webhook-signatur + appsecret_proof

# Custom Audiences (ny)
META_AD_ACCOUNT_ID=1234567890            # numeriskt, med eller utan "act_"-prefix
META_MARKETING_ACCESS_TOKEN=token_med_ads_management
# Faller tillbaka på META_CAPI_ACCESS_TOKEN / META_ACCESS_TOKEN om den saknas
```

> **OBS:** Custom Audiences kräver en access token med `ads_management`-scope, vilket
> normalt skiljer sig från CAPI-token. Ad-kontot måste dessutom ha accepterat Metas
> villkor för Custom Audiences.

## Custom Audiences – användning

1. Gå till **Admin → Inställningar → Meta Custom Audiences**.
2. Välj ett segment (t.ex. "Aktiva leads" = lead + kontaktade + förhandling).
3. Ange ett namn och klicka **Skapa & synka publik**.
4. Publikens ID sparas i webbläsaren (localStorage) per segment. Nästa gång visas
   **Synka igen**, vilket uppdaterar *samma* publik i stället för att skapa en ny.

### Säkerhet & integritet

- Segmentet läses **server-side** från den inloggade adminens kunder (RLS). Klienten
  skickar bara status-allowlistan, aldrig PII.
- All PII (e-post, telefon, namn, ort, postnummer, land) normaliseras och **SHA-256-hashas
  på servern** innan den lämnar systemet, enligt Metas krav. `EXTERN_ID` (kund-id) skickas
  ohashad som opak nyckel.
- Endast kunder med e-post eller telefon laddas upp (övriga kan inte matchas).
- Inga råa värden loggas.

## API-endpoints

| Endpoint                     | Metod | Beskrivning                                  |
|------------------------------|-------|----------------------------------------------|
| `/api/facebook/leads`        | GET   | Webhook-verifiering                          |
| `/api/facebook/leads`        | POST  | Tar emot Lead Ads-leads (signaturverifierad) |
| `/api/meta/conversion`       | POST  | Skickar tratt-steg till Conversions API      |
| `/api/meta/audience/sync`    | POST  | Synkar CRM-segment till Custom Audience       |

### `/api/meta/audience/sync`

```jsonc
// Request
{
  "statuses": ["lead", "contacted", "negotiating"], // allowlist, server-validerad
  "name": "CRM: Aktiva leads",                       // krävs för ny publik
  "audienceId": "1203...".                           // valfritt – uppdaterar befintlig
}

// Response
{
  "success": true,
  "audienceId": "1203...",
  "created": true,
  "segmentSize": 120,   // antal kunder i segmentet
  "matched": 98,        // antal med e-post/telefon (uppladdade)
  "numReceived": 98,    // antal Meta tog emot
  "numInvalid": 0
}
```

## Felsökning

- **"Meta audience not configured":** `META_AD_ACCOUNT_ID` eller token saknas.
- **"Kunde inte skapa publik i Meta":** token saknar `ads_management`, ad-kontot har inte
  accepterat Custom Audience-villkoren, eller fel ad-konto-id.
- **`numInvalid` > 0:** rader som inte kunde matchas/normaliseras (t.ex. ogiltigt format).
- **Tratt-events syns inte i Meta:** kontrollera `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN`
  och använd Metas Test Events / Events Manager för att se inkommande `system_generated`-event.
