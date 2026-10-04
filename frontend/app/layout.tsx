import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://greencart.vercel.app"),
  title: {
    default: "CropKart | Direct Farmer Marketplace",
    template: "%s | CropKart",
  },
  description:
    "A full-stack farmer marketplace where growers sell directly to households, wholesalers, and retailers with live mandi and crop insights.",
  keywords: [
    "farmer marketplace",
    "agriculture ecommerce",
    "mandi rates",
    "farm fresh groceries",
    "next.js marketplace",
  ],
  openGraph: {
    title: "CropKart | Direct Farmer Marketplace",
    description:
      "Buy fresh produce, grains, dairy, seeds, and farm inputs directly from verified Indian farmers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${fraunces.variable} min-h-screen bg-white font-sans text-ink-900 antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
