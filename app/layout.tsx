import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter, matching the mobile app and the marketing site — was Geist before,
// loaded but never actually applied (globals.css hardcoded a plain system
// font stack instead of referencing the loaded font variable).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyCove Admin",
  description: "Resident and guard account administration for MyCove",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
