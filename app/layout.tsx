import type { Metadata, Viewport } from "next";
import { ProductAnalytics } from "@/components/product-analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carvio — Career tracker",
  description: "Keep your applications, contacts, and next steps organized.",
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
      </body>
    </html>
  );
}
