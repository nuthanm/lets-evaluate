import type { Metadata } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import { BrandTheme } from "@/components/BrandTheme";
import { Providers } from "@/components/Providers";
import { getBrand } from "@/lib/brand";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const brand = getBrand();

export const metadata: Metadata = {
  title: `${brand.appTitle} — ${brand.orgName}`,
  description: brand.description,
  ...(brand.faviconUrl ? { icons: { icon: brand.faviconUrl } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable}`} suppressHydrationWarning>
      <head>
        <BrandTheme />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <Providers brand={brand}>{children}</Providers>
      </body>
    </html>
  );
}
