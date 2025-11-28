import { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Study Notes Generator - From PDF to Study Guide | Brain Battle",
  description: "Upload your PDF documents and generate comprehensive AI-powered study notes. Get key concepts, summaries, and practice questions instantly.",
  keywords: ["study notes generator", "AI study notes", "PDF to notes", "study guide generator", "automatic study notes"],
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com'}/study-notes`,
  },
}

export default function StudyNotesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

