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
  title: {
    default: "Brain Battle - AI-Powered Study Battles & Quiz Generator",
    template: "%s | Brain Battle"
  },
  description:
    "Upload PDFs, generate AI-powered quizzes, and compete with friends in real-time study battles. Transform your study materials into interactive quizzes instantly. Free to try.",
  keywords: [
    "AI quiz generator",
    "study with friends",
    "PDF to quiz",
    "multiplayer study app",
    "AI study notes",
    "competitive learning",
    "gamified study platform",
    "quiz generator from PDF",
    "study battle app",
    "online study groups"
  ],
  authors: [{ name: "Brain Battle" }],
  creator: "Brain Battle",
  publisher: "Brain Battle",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com',
    siteName: 'Brain Battle',
    title: 'Brain Battle - AI-Powered Study Battles',
    description: 'Upload PDFs, generate AI quizzes, and compete with friends. Make studying fun and competitive.',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Brain Battle - AI-Powered Study Platform',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brain Battle - AI-Powered Study Battles',
    description: 'Transform your study materials into interactive quizzes. Compete with friends in real-time.',
    images: ['/og-image.png'],
    creator: '@brainbattle', // Update with actual Twitter handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com',
  },
  other: {
    "preload-image": "/brain-battle-logo.png",
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
