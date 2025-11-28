import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Quiz from PDF - AI Quiz Generator | Brain Battle",
  description: "Upload your PDF documents and instantly generate AI-powered quiz questions. Create personalized study quizzes in seconds.",
  keywords: ["create quiz", "quiz generator", "PDF to quiz", "AI quiz maker", "study quiz creator"],
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com'}/create-quiz`,
  },
}

export default function CreateQuizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

