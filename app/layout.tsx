import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dream On The Paper | Cinematic Visualization Wallpapers",
  description:
    "Create a personalized cinematic visualization wallpaper for the future you are building. Preview your concept, then download a clean high-resolution wallpaper.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  openGraph: {
    title: "Dream On The Paper | Cinematic Visualization Wallpapers",
    description:
      "Create a personalized cinematic visualization wallpaper for the future you are building. Preview your concept, then download a clean high-resolution wallpaper.",
    url: SITE_URL,
    siteName: "Dream On The Paper",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Dream On The Paper cinematic future-self wallpaper preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dream On The Paper | Cinematic Visualization Wallpapers",
    description:
      "Create a personalized cinematic visualization wallpaper for the future you are building. Preview your concept, then download a clean high-resolution wallpaper.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${cormorant.variable} font-sans antialiased`}
      >
        {children}
        <MicrosoftClarity />
      </body>
    </html>
  );
}
