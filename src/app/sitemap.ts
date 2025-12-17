import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://intenzze.com";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/om-oss`, lastModified: now },
    { url: `${base}/priser`, lastModified: now },
    { url: `${base}/kontakt`, lastModified: now },
    { url: `${base}/integritetspolicy`, lastModified: now },
  ];
}
