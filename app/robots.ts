import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments are useful for QA, never for organic discovery.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/*?*workspace=*"],
    },
    sitemap: "https://carvio-pi.vercel.app/sitemap.xml",
  };
}
