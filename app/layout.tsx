import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream On The Paper",
  description:
    "Create a personalized AI phone, desktop, or tablet wallpaper from your dreams, goals, and vision.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://dreamonthepaper.com",
  ),
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
