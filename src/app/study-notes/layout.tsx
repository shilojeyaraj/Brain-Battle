import { Metadata } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brain-battle.app'

export const metadata: Metadata = {
  title: "AI Study Notes Generator - From PDF to Study Guide | Brain Battle",
  description: "Upload your PDF documents and generate comprehensive AI-powered study notes. Get key concepts, summaries, and practice questions instantly.",
  keywords: ["study notes generator", "AI study notes", "PDF to notes", "study guide generator", "automatic study notes"],
  alternates: {
    canonical: `${siteUrl}/study-notes`,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteUrl}/study-notes`,
    siteName: 'Brain Battle',
    title: 'AI Study Notes Generator - From PDF to Study Guide',
    description: 'Upload your PDF documents and generate comprehensive AI-powered study notes. Get key concepts, summaries, and practice questions instantly.',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Brain Battle - AI Study Notes Generator',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Study Notes Generator - From PDF to Study Guide',
    description: 'Upload your PDF documents and generate comprehensive AI-powered study notes.',
    images: ['/og-image.png'],
  },
}

export default function StudyNotesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

