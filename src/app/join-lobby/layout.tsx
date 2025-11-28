import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Join Study Lobby - Brain Battle",
  description: "Join a multiplayer study battle room with a room code. Compete with friends in real-time quizzes.",
  keywords: ["join study room", "multiplayer quiz", "study lobby", "room code", "brain battle"],
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com'}/join-lobby`,
  },
}

export default function JoinLobbyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

