import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Study Room - Multiplayer Quiz | Brain Battle",
  description: "Create a multiplayer study room and invite friends to compete in real-time quiz battles. Perfect for study groups and classrooms.",
  keywords: ["create study room", "multiplayer quiz room", "study group", "quiz room creator", "brain battle"],
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com'}/create-room`,
  },
}

export default function CreateRoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

