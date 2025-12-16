import { Metadata } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brain-battle.app'

export const metadata: Metadata = {
  title: "Create Quiz from PDF - AI Quiz Generator | Brain Battle",
  description: "Upload your PDF documents and instantly generate AI-powered quiz questions. Create personalized study quizzes in seconds.",
  keywords: ["create quiz", "quiz generator", "PDF to quiz", "AI quiz maker", "study quiz creator"],
  alternates: {
    canonical: `${siteUrl}/create-quiz`,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteUrl}/create-quiz`,
    siteName: 'Brain Battle',
    title: 'Create Quiz from PDF - AI Quiz Generator',
    description: 'Upload your PDF documents and instantly generate AI-powered quiz questions. Create personalized study quizzes in seconds.',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Brain Battle - Create Quiz from PDF',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Quiz from PDF - AI Quiz Generator',
    description: 'Upload your PDF documents and instantly generate AI-powered quiz questions.',
    images: ['/og-image.png'],
  },
}

export default function CreateQuizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

