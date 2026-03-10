import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YieldKeeper - Smart Portfolio Management for Landlords",
  description:
    "Monitor, manage, and optimise your property portfolio. Track rent, maintenance, compliance, and profitability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
