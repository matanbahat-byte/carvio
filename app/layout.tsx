import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ProductAnalytics } from "@/components/product-analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://carvio-pi.vercel.app"),
  title: "Carvio — Your job-search command center",
  description: "Track opportunities, make clearer decisions, and always know your next move.",
  openGraph: {
    title: "Carvio — Your job-search command center",
    description: "Track opportunities, make clearer decisions, and always know your next move.",
    url: "/",
    siteName: "Carvio",
    images: [{ url: "/carvio-og.png", width: 1200, height: 630, alt: "Carvio job-search command center" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carvio — Your job-search command center",
    description: "Track opportunities, make clearer decisions, and always know your next move.",
    images: ["/carvio-og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ProductAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
