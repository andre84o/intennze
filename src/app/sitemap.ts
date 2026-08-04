import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now },
    { url: `${SITE_URL}/om-oss`, lastModified: now },
    { url: `${SITE_URL}/tjanster`, lastModified: now },
    { url: `${SITE_URL}/kontakt`, lastModified: now },
    { url: `${SITE_URL}/integritetspolicy`, lastModified: now },
  ];
}
