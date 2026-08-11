import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { appUrl } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const description =
  "Structured learning paths, verified certificates, and one-on-one career guidance to help you become a certified medical coder — from Medical Coding Global.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "MCG Learn — Build a Medical Coding Career",
    template: "%s | MCG Learn",
  },
  description,
  openGraph: {
    title: "MCG Learn — Build a Medical Coding Career",
    description,
    siteName: "MCG Learn",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MCG Learn — Build a Medical Coding Career",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
