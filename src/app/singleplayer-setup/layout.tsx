import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Singleplayer Quiz Setup - Brain Battle",
  description: "Set up a singleplayer quiz session. Upload PDFs, generate AI-powered questions, and test your knowledge.",
  keywords: ["singleplayer quiz", "practice quiz", "study quiz", "solo quiz", "quiz practice"],
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com'}/singleplayer-setup`,
  },
}

export default function SingleplayerSetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

