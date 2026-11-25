import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return [];
  // Explicit public pages only. No workspace, search criteria, user IDs, or
  // invented last-modified dates are included in discovery metadata.
  return [
    { url: "https://carvio-pi.vercel.app/" },
    { url: "https://carvio-pi.vercel.app/find" },
  ];
}
