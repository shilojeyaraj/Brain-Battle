"use client"

import { Button } from "@/components/ui/button"
import { motion } from "@/components/ui/motion"
import {
  Brain,
  Users,
  Zap,
  Trophy,
  Crown,
  Loader2,
  TrendingUp,
  Upload,
  Clock,
  Award,
  BookOpen,
  Gamepad2,
  Sparkles,
  Play,
  ShieldCheck,
  Globe2,
  Lock,
  Flame,
} from "lucide-react"
import {
  UploadSimple,
  Sparkle,
  UsersThree,
  Lightning,
  ChartLineUp,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { HomePageSchema, FAQSchema, OrganizationSchema } from "@/components/seo/schema-markup"
import { Accordion } from "@/components/ui/accordion"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const features = [
  {
    icon: BookOpen,
    title: "Upload & Study",
    description: "Add your PDFs or materials and learn new concepts quickly",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Brain,
    title: "AI Questions",
    description: "Generate personalized questions to master any topic instantly",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: Users,
    title: "Multiplayer",
    description: "Battle against your friends in real-time competitions",
    color: "from-green-500 to-green-600",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description: "Climb the ranks and dominate the global leaderboard",
    color: "from-yellow-500 to-yellow-600",
  },
  {
    icon: Zap,
    title: "XP & Rewards",
    description: "Gain XP, unlock achievements, and level up your brain",
    color: "from-pink-500 to-pink-600",
  },
  {
    icon: Gamepad2,
    title: "Custom Lobbies",
    description: "Create private battles with your friends and custom rules",
    color: "from-purple-500 to-purple-600",
  },
]

interface FeatureCard {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  borderColor: string
}

const featureCards: FeatureCard[] = [
  {
    title: "Battle your Friends",
    subtitle: "VS",
    icon: Users,
    gradient: "from-blue-500/30 to-blue-600/20",
    borderColor: "border-blue-400/40"
  },
  {
    title: "Level Up Your Study Game",
    subtitle: "+500 XP",
    icon: TrendingUp,
    gradient: "from-orange-500/30 to-orange-600/20",
    borderColor: "border-orange-400/40"
  },
  {
    title: "AI-Powered Questions",
    subtitle: "Smart",
    icon: Brain,
    gradient: "from-purple-500/30 to-purple-600/20",
    borderColor: "border-purple-400/40"
  },
  {
    title: "Earn Achievements",
    subtitle: "🏆",
    icon: Trophy,
    gradient: "from-yellow-500/30 to-yellow-600/20",
    borderColor: "border-yellow-400/40"
  },
  {
    title: "Master Any Subject",
    subtitle: "Study",
    icon: BookOpen,
    gradient: "from-emerald-500/30 to-teal-500/20",
    borderColor: "border-emerald-400/40"
  },
  {
    title: "Climb the Leaderboard",
    subtitle: "Rank #1",
    icon: Crown,
    gradient: "from-pink-500/30 to-pink-600/20",
    borderColor: "border-pink-400/40"
  }
]

interface LeaderboardPlayer {
  rank: number
  user_id: string
  username: string
  xp: number
  level: number
  wins: number
  trend: 'up' | 'down'
  avatar_url?: string
}

export default function HomePage() {
  const router = useRouter()
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [loadingButton, setLoadingButton] = useState<string | null>(null)

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true)
      const response = await fetch('/api/leaderboard-preview')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.players) {
          setLeaderboardPlayers(data.players)
        }
      } else {
        console.error('Failed to fetch leaderboard')
        // Keep placeholder data on error
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      // Keep placeholder data on error
    } finally {
      setLeaderboardLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-rotate feature cards
  useEffect(() => {
    const cardInterval = setInterval(() => {
      setCurrentCardIndex((prev) => (prev + 1) % featureCards.length)
    }, 3200)

    return () => clearInterval(cardInterval)
  }, [])

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Default placeholder data if no real data (top 3 only)
  const placeholderPlayers = [
    { rank: 1, username: "Alex", xp: 12500, trend: "up" as const, level: 13, wins: 45, user_id: "placeholder-1" },
    { rank: 2, username: "Sarah", xp: 11200, trend: "up" as const, level: 12, wins: 38, user_id: "placeholder-2" },
    { rank: 3, username: "Mike", xp: 9800, trend: "down" as const, level: 10, wins: 32, user_id: "placeholder-3" },
  ]
  
  // Limit to top 3 players only
  const displayPlayers = (leaderboardPlayers.length > 0 ? leaderboardPlayers : placeholderPlayers).slice(0, 3)
  const demoProgress = {
    level: 12,
    currentXP: 8420,
    nextLevelXP: 10000,
    streak: 5,
    winRate: 0.72,
  }
  const demoProgressPct = Math.min(Math.round((demoProgress.currentXP / demoProgress.nextLevelXP) * 100), 100)
  
  // FAQ data for schema markup
  const homepageFAQs = [
    {
      question: "How does Brain Battle generate quizzes from PDFs?",
      answer: "Brain Battle uses AI to analyze your PDF documents, extract key concepts, and automatically generate personalized quiz questions based on the actual content. Simply upload your PDF, and the AI creates multiple-choice and open-ended questions in seconds."
    },
    {
      question: "Can I study with friends on Brain Battle?",
      answer: "Yes! Brain Battle offers multiplayer study battles where you can create private rooms, invite friends with a room code, and compete in real-time quizzes. You can also join study groups (clans) for classroom-style sessions."
    },
    {
      question: "Is Brain Battle free to use?",
      answer: "Brain Battle offers a free tier with 10 documents per month and 10 questions per quiz. Pro plans unlock unlimited documents, unlimited questions, and classroom/clan creation features."
    },
    {
      question: "Is Brain Battle good for teachers?",
      answer: "Yes! Brain Battle is perfect for teachers and educators. Create classroom clans (study groups) where students can join for free. Host Kahoot-style quiz sessions for your entire class, track student progress, and make learning engaging through gamification. One Pro account can manage up to 10 clans with 50 members each."
    },
    {
      question: "How accurate are the AI-generated questions?",
      answer: "Brain Battle generates questions directly from your document content. Questions are based on actual text, examples, and concepts from your uploaded PDFs, ensuring high accuracy and relevance to your study materials."
    }
  ]

  return (
    <>
      {/* Schema Markup for SEO */}
      <HomePageSchema />
      <OrganizationSchema />
      <FAQSchema faqs={homepageFAQs} />
      
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-980 to-slate-900">
      {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-float" />
          <div
            className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-500/12 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
            style={{
              backgroundImage:
                "linear-gradient(18deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.0) 35%, rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.0) 100%), linear-gradient(198deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.015) 65%, rgba(255,255,255,0.0) 100%)",
              backgroundSize: "220% 220%, 200% 200%",
              backgroundPosition: "center",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(22deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0) 12px, rgba(255,255,255,0) 22px)",
            }}
          />
        </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-6 md:px-8 lg:px-12 border-b-4 border-slate-700/50">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <div className="text-2xl font-black bg-gradient-to-r from-blue-300 to-orange-400 bg-clip-text text-transparent">
                BRAIN BATTLE
              </div>
            </div>
          </motion.div>
          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              variant="outline"
              className="border-4 border-blue-400 text-blue-300 hover:bg-blue-500/20 bg-transparent font-bold text-sm h-10"
              loading={loadingButton === 'login'}
              loadingText="Loading..."
              onClick={async () => {
                setLoadingButton('login')
                try {
                  await router.push('/login')
                  // Loading state will persist until component unmounts (page navigation completes)
                } catch (error) {
                  console.error("Navigation error:", error)
                  setLoadingButton(null)
                }
              }}
            >
              Sign In
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold border-2 border-blue-400 h-10 text-sm"
              loading={loadingButton === 'signup'}
              loadingText="Loading..."
              onClick={async () => {
                setLoadingButton('signup')
                try {
                  await router.push('/signup')
                  // Loading state will persist until component unmounts (page navigation completes)
                } catch (error) {
                  console.error("Navigation error:", error)
                  setLoadingButton(null)
                }
              }}
            >
              Join Now
            </Button>
          </motion.div>
        </header>

        {/* Hero Section */}
        <main className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] items-start justify-between min-h-[calc(100vh-80px)] px-6 py-20 relative gap-10 max-w-7xl mx-auto">
          <motion.div className="max-w-2xl md:max-w-3xl text-left md:text-left" variants={container} initial="hidden" animate="show">
            {/* Badge */}
            <motion.div
              variants={item}
              className="mb-8 inline-flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-black px-6 py-3 rounded-full font-black text-sm border-2 border-orange-300"
            >
              <Zap className="w-5 h-5" />
              Study Battles Made FUN!
            </motion.div>

            {/* Main Headline */}
            <motion.h1 variants={item} className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-balance">
              <span className="text-white inline-block">Upload a PDF.</span>
              <br />
              <span className="bg-gradient-to-r from-blue-300 to-orange-300 bg-clip-text text-transparent inline-block">
                Quiz-ready in 60 seconds.
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={item}
              className="text-lg md:text-xl text-blue-100/80 mb-12 max-w-2xl leading-relaxed"
            >
              AI builds the quiz, friends join with a code, and XP tracks who’s winning. No manual flashcards, no waiting.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-start items-start">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-white text-lg h-14 px-8 font-black border-2 border-blue-400 shadow-lg shadow-blue-900/50"
                >
                  <Lightning className="w-5 h-5 mr-2" weight="fill" />
                  Start free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={scrollToHowItWorks}
                className="border-2 border-orange-300 text-orange-200 hover:bg-orange-500/10 text-lg h-14 px-8 bg-transparent font-black"
              >
                See how it works
              </Button>
            </motion.div>

            {/* Demo-ready credibility strip */}
            <motion.div variants={item} className="mt-8 w-full max-w-3xl space-y-4">
              <div className="rounded-2xl border-2 border-blue-400/25 bg-slate-900/80 p-4 shadow-lg shadow-blue-950/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-300" />
                    <span className="text-sm font-black text-white">Demo Progress</span>
                  </div>
                  <span className="text-xs font-bold text-blue-200/80">Lv {demoProgress.level}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-700/80 border border-slate-600/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-orange-400"
                    style={{ width: `${demoProgressPct}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-blue-100/80">
                  <span>{demoProgress.currentXP.toLocaleString()} XP</span>
                  <span>{demoProgressPct}% to next level</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-blue-100/70 font-bold">
                  <span className="px-2 py-1 rounded-full bg-blue-500/20 border border-blue-400/40">Streak {demoProgress.streak}d</span>
                  <span className="px-2 py-1 rounded-full bg-orange-500/15 border border-orange-400/40">Win rate {(demoProgress.winRate * 100).toFixed(0)}%</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right rail: demo video, leaderboard, streak, carousel */}
          <motion.div
            className="w-full lg:w-[420px] xl:w-[460px] flex flex-col gap-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {/* Demo video holder */}
            <div className="rounded-2xl border-2 border-blue-400/30 bg-slate-900/80 shadow-2xl p-4 backdrop-blur overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-blue-100/70 font-semibold">Demo preview</p>
                  <h3 className="text-lg font-black text-white">See Brain Battle in action</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
                  <Play className="w-4 h-4 text-blue-200" />
                </div>
              </div>
              <div className="relative w-full overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/70 aspect-video">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-transparent to-orange-400/10 animate-pulse" />
                <div className="absolute inset-3 rounded-lg border border-slate-600/50 bg-slate-900/60 flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-100/80">Video placeholder</span>
                </div>
              </div>
            </div>

            {/* Climb leaderboard + live leaderboard */}
            <div className="bg-gradient-to-br from-slate-850 to-slate-900 rounded-2xl border-2 border-orange-300/40 shadow-2xl p-4 backdrop-blur space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-200" />
                <div>
                  <p className="text-xs text-orange-100/70 font-semibold">Climb the leaderboard</p>
                  <h3 className="text-base font-black text-white">Battle, earn XP, rank up</h3>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-300 to-orange-400"
                  initial={{ width: "0%" }}
                  animate={{ width: `${demoProgressPct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-blue-100/80 font-semibold">
                <span>{demoProgress.currentXP.toLocaleString()} XP</span>
                <span>{demoProgressPct}% to next level</span>
              </div>
              <div className="space-y-2">
                {leaderboardLoading ? (
                  [...Array(3)].map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-600/50 animate-pulse" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-24 bg-slate-600/50 rounded" />
                        <div className="h-2 w-16 bg-slate-600/50 rounded" />
                      </div>
                    </div>
                  ))
                ) : displayPlayers.length === 0 ? (
                  <div className="text-center py-3 text-sm text-blue-100/70">No players yet. Be the first!</div>
                ) : (
                  displayPlayers.map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-orange-400 flex items-center justify-center text-white font-black text-sm border border-white/20">
                        {player.rank === 1 ? <Crown className="w-4 h-4" /> : player.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{player.username}</div>
                        <div className="text-[11px] text-blue-200/70">{player.xp.toLocaleString()} XP</div>
                      </div>
                      <div className={`text-xs font-bold ${player.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                        {player.trend === "up" ? "▲" : "▼"}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2">
                <Link href="/signup">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm h-10 font-bold border border-blue-300">
                    Join the Battle
                  </Button>
                </Link>
              </div>
            </div>

            {/* Streak card */}
            <div className="rounded-2xl border-2 border-amber-300/40 bg-gradient-to-br from-slate-850 to-slate-900 shadow-2xl p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-amber-100/80 font-semibold">Keep your streak</p>
                  <h3 className="text-base font-black text-white">Multiply your points daily</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-300/50 flex items-center justify-center animate-pulse">
                  <Flame className="w-5 h-5 text-amber-200" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/40 to-orange-500/20 border border-amber-300/40 flex items-center justify-center shadow-inner shadow-amber-900/50">
                  <span className="text-lg font-black text-white">5</span>
                  <div className="absolute inset-0 rounded-full border border-amber-200/30 animate-ping" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-amber-100/90 font-semibold">5 day streak</p>
                  <p className="text-xs text-amber-100/70">Stay hot to boost XP multipliers.</p>
                </div>
              </div>
            </div>

            {/* Feature Carousel */}
            <div className="relative rounded-2xl border-2 border-slate-700/50 bg-slate-900/85 backdrop-blur shadow-xl overflow-hidden">
              <div className="relative h-[170px]">
                {featureCards.map((card, index) => {
                  const Icon = card.icon
                  const isActive = index === currentCardIndex
                  return (
                    <motion.div
                      key={card.title}
                      className={`absolute inset-0 bg-gradient-to-br ${card.gradient} rounded-2xl border ${card.borderColor} backdrop-blur px-4 py-3 flex flex-col`}
                      initial={false}
                      animate={{
                        x: isActive ? 0 : index > currentCardIndex ? "100%" : "-100%",
                        opacity: isActive ? 1 : 0,
                        scale: isActive ? 1 : 0.98,
                      }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-white" />
                          <span className="text-sm font-black text-white">{card.title}</span>
                        </div>
                        <span className="text-xs text-white/80">{index + 1}/{featureCards.length}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-3xl md:text-4xl font-black text-white drop-shadow">{card.subtitle}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {featureCards.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${idx === currentCardIndex ? "bg-white w-6" : "bg-white/30 w-2"}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute top-1/3 right-10 md:right-20 opacity-30 md:opacity-50 lg:hidden"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <div
              className="w-48 h-48 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl border-4 border-orange-400/30 backdrop-blur animate-float p-4"
              style={{ animationDelay: "1.5s" }}
            >
              <div className="text-xs font-bold text-orange-300">Level Up and Gain Rewards</div>
              <div className="mt-8 text-3xl font-black text-transparent bg-gradient-to-r from-orange-300 to-orange-200 bg-clip-text">
                +500
              </div>
            </div>
          </motion.div>
        </main>

        {/* How It Works Section */}
        <section id="how-it-works" className="px-6 py-20 md:px-8 lg:px-12 max-w-7xl mx-auto scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-blue-300 to-orange-300 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-lg text-blue-100/70">Get started in 4 simple steps</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                step: "1",
                title: "Upload Your PDF",
                description: "Add your study materials, textbooks, or lecture notes. Our AI supports PDFs up to 5MB.",
              },
              {
                step: "2",
                title: "AI Generates Questions",
                description: "Our AI analyzes your document and creates personalized quiz questions in seconds.",
              },
              {
                step: "3",
                title: "Compete with Friends",
                description: "Create a room, invite friends, and battle in real-time quizzes. See who knows more!",
              },
              {
                step: "4",
                title: "Level Up & Win",
                description: "Earn XP, unlock achievements, climb leaderboards, and build your study streak!",
              },
            ].map((step, idx) => {
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{
                    y: -8,
                    transition: {
                      type: "spring",
                      stiffness: 100,
                      damping: 10,
                    },
                  }}
                  className="relative rounded-2xl p-6 border border-slate-700/60 bg-slate-900/85 hover:border-blue-300/50 transition-colors shadow-lg shadow-black/20"
                >
                  {/* Step Number Badge */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 border-4 border-slate-900 flex items-center justify-center font-black text-white text-lg">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 mt-6">{step.title}</h3>
                  <p className="text-sm text-blue-100/70 leading-relaxed">{step.description}</p>
                  
                  {/* Arrow connector (hidden on last item) */}
                  {idx < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 translate-x-full z-10">
                      <div className="w-6 h-0.5 bg-gradient-to-r from-blue-400 to-orange-400"></div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-orange-400 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Features Section - Combined */}
        <section id="features" className="px-6 py-20 md:px-8 lg:px-12 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-blue-300 to-orange-300 bg-clip-text text-transparent">
                Packed with Features
              </span>
            </h2>
            <p className="text-lg text-blue-100/70">Everything you need for epic study battles</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{
                    y: -8,
                    transition: {
                      type: "spring",
                      stiffness: 100,
                      damping: 10,
                    },
                  }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-4 border-slate-600/50 hover:border-blue-400/50 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 border-2 border-white/20`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-blue-100/70">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-6 py-20 md:px-8 lg:px-12 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-blue-300 to-orange-300 bg-clip-text text-transparent">
                Frequently Asked Questions
              </span>
            </h2>
            <p className="text-lg text-blue-100/70">Everything you need to know about Brain Battle</p>
          </motion.div>

          <Accordion items={homepageFAQs} />
        </section>

        {/* CTA Section */}
        <section className="px-6 py-16 md:px-8 lg:px-12 max-w-4xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-600 to-orange-500 rounded-3xl p-8 md:p-12 border-4 border-orange-300"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Ready to Battle?</h2>
            <p className="text-lg text-blue-100 mb-8">Transform your study experience with AI-powered quizzes and multiplayer battles</p>
            <Link href="/signup">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 text-lg h-14 px-8 font-black border-2 border-white animate-pulse-ring">
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        </section>
      </div>
    </div>
    </>
  )
}