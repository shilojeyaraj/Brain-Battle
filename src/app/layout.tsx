import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Fredoka } from "next/font/google";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";
import { AppProviders } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BrainBattle - Study Battles Made Fun!",
  description: "The ultimate multiplayer study game",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} antialiased`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <AppProviders>
            {children}
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
