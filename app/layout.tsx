import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

// Metadata moved from app/page.tsx
export const metadata: Metadata = {
  title: "ClipTagger-12b Playground",
  description: "Upload or paste an image, then annotate using Inference.net",
  openGraph: {
    title: "ClipTagger-12b Playground",
    description: "Upload or paste an image, then annotate using Inference.net",
    url: "https://cliptagger.inference.net",
    siteName: "ClipTagger-12b Playground",
    images: [
      {
        url: "https://cliptagger.inference.net/og.png",
        width: 1200,
        height: 630,
        alt: "ClipTagger-12b Playground",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipTagger-12b Playground",
    description: "Upload or paste an image, then annotate using Inference.net",
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
