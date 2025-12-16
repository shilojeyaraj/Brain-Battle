import { Metadata } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brain-battle.app'

export const metadata: Metadata = {
  title: "Pricing - Brain Battle Plans & Features",
  description: "Choose the perfect plan for your study needs. Free plan available with AI quiz generation. Upgrade to Pro for unlimited quizzes, multiplayer battles, and advanced features.",
  keywords: ["brain battle pricing", "study app pricing", "quiz generator pricing", "education app cost", "free quiz maker"],
  alternates: {
    canonical: `${siteUrl}/pricing`,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteUrl}/pricing`,
    siteName: 'Brain Battle',
    title: 'Pricing - Brain Battle Plans & Features',
    description: 'Choose the perfect plan for your study needs. Free plan available with AI quiz generation.',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Brain Battle - Pricing Plans',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing - Brain Battle Plans & Features',
    description: 'Choose the perfect plan for your study needs. Free plan available.',
    images: ['/og-image.png'],
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

