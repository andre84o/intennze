# Facebook Lead Ads Integration

Denna guide beskriver hur du konfigurerar Facebook Lead Ads för att automatiskt importera leads till ditt CRM.

## Översikt

När någon fyller i ett lead-formulär på din Facebook-annons skickas datan automatiskt till ditt CRM via en webhook. Leadsen får automatiskt märkningen "Facebook Ads" så att du enkelt kan se var de kommer ifrån.

## Miljövariabler

Lägg till följande i din `.env.local`:

```env
# Facebook Lead Ads
FACEBOOK_VERIFY_TOKEN=intenzze_leads_verify_token  # Valfri - ändra till något unikt
FACEBOOK_ACCESS_TOKEN=din_facebook_access_token     # Krävs för att hämta lead-data
SUPABASE_SERVICE_ROLE_KEY=din_supabase_service_role_key  # Krävs för att skriva till databasen
```

## Steg 1: Skapa en Facebook-app

1. Gå till [Facebook Developers](https://developers.facebook.com/)
2. Klicka på "My Apps" och sedan "Create App"
3. Välj "Business" som app-typ
4. Ge appen ett namn och anslut den till din Business Manager

## Steg 2: Konfigurera Webhooks

1. I din Facebook-app, gå till "Webhooks" under "Products"
2. Klicka på "Add Product" om Webhooks inte finns
3. Välj "Page" som objekttyp
4. Klicka på "Subscribe to this object"
5. Fyll i:
   - **Callback URL:** `https://din-domän.com/api/facebook/leads`
   - **Verify Token:** Samma som `FACEBOOK_VERIFY_TOKEN` i din `.env.local`
6. Välj "leadgen" under fälten att prenumerera på
7. Klicka på "Verify and Save"

## Steg 3: Anslut din Facebook-sida

1. Gå till "Page Access Tokens" i din app
2. Välj den sida som du kör annonserna från
3. Generera en access token och kopiera den
4. Lägg till den som `FACEBOOK_ACCESS_TOKEN` i din `.env.local`

## Steg 4: Skapa Lead Ads

1. Gå till [Facebook Ads Manager](https://www.facebook.com/adsmanager)
2. Skapa en ny kampanj med målet "Leads"
3. Konfigurera din annons som vanligt
4. Skapa ett lead-formulär med de fält du vill samla in

## Fältmappning

Facebook Lead Ads-fält mappas till CRM-fält enligt följande:

| Facebook-fält | CRM-fält |
|---------------|----------|
| `first_name` | Förnamn |
| `last_name` | Efternamn |
| `full_name` | Förnamn + Efternamn (om separata fält saknas) |
| `email` | E-post |
| `phone_number` / `phone` | Telefon |
| `company_name` / `company` | Företagsnamn |
| `city` | Stad |
| `message` / `question` / `comments` | Önskemål |

## Automatiska funktioner

När en lead importeras från Facebook:

1. **Status:** Sätts automatiskt till "Lead"
2. **Källa:** Sätts till "facebook_ads"
3. **Anteckningar:** Innehåller Facebook Lead ID, Form ID, och Ad ID
4. **Påminnelse:** En uppföljningspåminnelse skapas automatiskt för samma dag

## Felsökning

### Webhook verifieras inte
- Kontrollera att `FACEBOOK_VERIFY_TOKEN` matchar det du angav i Facebook
- Se till att din server är tillgänglig publikt (inte localhost)

### Leads importeras inte
- Kontrollera att `FACEBOOK_ACCESS_TOKEN` är giltig och har rätt behörigheter
- Se till att `SUPABASE_SERVICE_ROLE_KEY` är korrekt konfigurerad
- Kolla server-loggarna för felmeddelanden

### Dubbletter
- Systemet kontrollerar automatiskt om en lead med samma e-postadress redan finns
- Om den finns skapas ingen dubblett

## API-endpoint

**URL:** `POST /api/facebook/leads`

**Verifiering:** `GET /api/facebook/leads?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE`

## Testning

För att testa integrationen:

1. Skapa en Lead Ad-kampanj i testläge
2. Fyll i formuläret själv
3. Kontrollera att leadsen dyker upp i CRM:et under "Kunder"
4. Verifiera att Facebook-ikonen visas bredvid kundens namn
