import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream On The Paper | AI Vision Board Wallpapers",
  description:
    "Create personalized AI-generated phone, desktop, and tablet wallpapers based on your goals, dreams, and vision.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.dreamonthepaper.com",
  ),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Dream On The Paper | AI Vision Board Wallpapers",
    description:
      "Create personalized AI-generated phone, desktop, and tablet wallpapers based on your goals, dreams, and vision.",
    url: "/",
    siteName: "Dream On The Paper",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dream On The Paper | AI Vision Board Wallpapers",
    description:
      "Create personalized AI-generated phone, desktop, and tablet wallpapers based on your goals, dreams, and vision.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
