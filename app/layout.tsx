import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/github.css";
import { Analytics } from "@vercel/analytics/react";

// Metadata moved from app/page.tsx
export const metadata: Metadata = {
  title: "Performative Male Contest: An AI Vibe Check",
  description:
    "Is he trying too hard? Upload a photo and our AI will score his performativity. Tote bags, iced coffee, and ironic t-shirts welcome.",
  openGraph: {
    title: "Performative Male Contest: An AI Vibe Check",
    description:
      "Is he trying too hard? Upload a photo and our AI will score his performativity. Tote bags, iced coffee, and ironic t-shirts welcome.",
    url: "https://cliptagger.inference.net",
    siteName: "Performative Male Contest",
    images: [
      {
        url: "https://cliptagger.inference.net/og.png",
        width: 1200,
        height: 630,
        alt: "An AI-powered contest to rate performative males.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Performative Male Contest: An AI Vibe Check",
    description:
      "Is he trying too hard? Upload a photo and our AI will score his performativity. Tote bags, iced coffee, and ironic t-shirts welcome.",
    images: ["https://cliptagger.inference.net/og.png"],
  },
  metadataBase: new URL("https://cliptagger.inference.net"),
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
