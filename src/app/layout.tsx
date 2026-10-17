import type { Metadata, Viewport } from "next";
import { EnregistrementSW } from "@/components/EnregistrementSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "GK Service Auto",
  description: "Inspections de véhicules : Service Maintenance et Détailing Auto",
  appleWebApp: { capable: true, title: "GK Service", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA">
      <body className="min-h-dvh antialiased">
        {children}
        <EnregistrementSW />
      </body>
    </html>
  );
}
