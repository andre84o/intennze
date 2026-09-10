import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/om-oss` },
    { url: `${SITE_URL}/tjanster` },
    { url: `${SITE_URL}/kontakt` },
    { url: `${SITE_URL}/integritetspolicy` },
  ];
}
