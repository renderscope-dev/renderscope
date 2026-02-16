import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RenderScope",
    template: "%s | RenderScope",
  },
  description:
    "An open-source platform for cataloging, comparing, benchmarking, and understanding open-source rendering engines.",
  keywords: [
    "rendering engines",
    "computer graphics",
    "benchmarking",
    "path tracing",
    "ray tracing",
    "rasterization",
    "neural rendering",
    "3D Gaussian Splatting",
    "NeRF",
    "open source",
  ],
  authors: [{ name: "Ashutosh Mishra" }],
  openGraph: {
    title: "RenderScope",
    description:
      "Catalog, compare, and benchmark 50+ open-source rendering engines.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
