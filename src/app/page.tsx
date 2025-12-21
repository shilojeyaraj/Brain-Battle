"use client"

// Disable static generation - this page uses client-side features
// Note: Client components ("use client") are automatically dynamic

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
  RefreshCw,
} from "lucide-react"
// DailyStreakFlame imported dynamically below for lazy loading
import {
  UploadSimple,
  Sparkle,
  UsersThree,
  Lightning,
  ChartLineUp,
} from "@phosphor-icons/react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useCallback, useMemo, memo } from "react"
import { useRouter } from "next/navigation"
// 🚀 OPTIMIZATION: Import schema components normally (needed for SEO/SSR)
import { HomePageSchema, FAQSchema, OrganizationSchema, WebSiteSchema, ServiceSchema, SiteNavigationElementSchema } from "@/components/seo/schema-markup"
// 🚀 OPTIMIZATION: Import Accordion normally (lazy loading was causing build issues)
import { Accordion } from "@/components/ui/accordion"

// 🚀 OPTIMIZATION: Memoize animation configs to prevent recreation
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

// 🚀 OPTIMIZATION: Memoize common animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const fadeInUpViewport = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
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
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description: "Climb the ranks and dominate the global leaderboard",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: Zap,
    title: "XP & Rewards",
    description: "Gain XP, unlock achievements, and level up your brain",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Gamepad2,
    title: "Custom Lobbies",
    description: "Create private battles with your friends and custom rules",
    color: "from-orange-500 to-orange-600",
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
  trend: 'up' | 'down' | 'stable'
  avatar_url?: string
  streak?: number
  longestStreak?: number
}

// Import DailyStreakFlame directly (dynamic import was causing build issues)
import { DailyStreakFlame } from "@/components/dashboard/daily-streak-flame"

// 🚀 OPTIMIZATION: Memoized Feature Card Component
const FeatureCard = memo(function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  const Icon = feature.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{
        y: -8,
        transition: {
          type: "spring",
          stiffness: 100,
          damping: 10,
        },
      }}
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-4 border-slate-600/50 hover:border-blue-400/50 transition-colors cursor-pointer"
      style={{ willChange: 'transform' }}
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
})

// 🚀 OPTIMIZATION: Memoize StreakFlameAnimation to prevent unnecessary re-renders
const StreakFlameAnimation = memo(function StreakFlameAnimation() {
  const [animatedStreak, setAnimatedStreak] = useState(6)
  const [isAnimating, setIsAnimating] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    // Guard against SSR - only run in browser
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setIsAnimating(true)
            setHasAnimated(true)
            
            // Animate from 6 to 7
            const startValue = 6
            const endValue = 7
            const duration = 1500 // 1.5 seconds
            const steps = 30
            const stepDuration = duration / steps
            let currentStep = 0

            const interval = setInterval(() => {
              currentStep++
              const progress = currentStep / steps
              // Ease out animation
              const easedProgress = 1 - Math.pow(1 - progress, 3)
              const currentValue = Math.floor(startValue + (easedProgress * (endValue - startValue)))
              setAnimatedStreak(currentValue)

              if (currentStep >= steps) {
                clearInterval(interval)
                setAnimatedStreak(endValue)
                // Keep animation state for a bit longer for visual effect
                setTimeout(() => setIsAnimating(false), 500)
              }
            }, stepDuration)
          }
        })
      },
      { threshold: 0.3 }
    )

    const element = document.getElementById('streak-section')
    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [hasAnimated])

  return (
    <div className="relative">
      <DailyStreakFlame 
        streak={animatedStreak} 
        isAnimating={isAnimating}
        className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96"
      />
    </div>
  )
})

export default function HomePage() {
  const router = useRouter()
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardRefreshing, setLeaderboardRefreshing] = useState(false)
  const [streakData, setStreakData] = useState<{ currentStreak: number; longestStreak: number; isActiveToday: boolean; daysUntilBreak: number } | null>(null)
  const [streakLoading, setStreakLoading] = useState(true)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [loadingButton, setLoadingButton] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setLeaderboardRefreshing(true)
      } else {
        setLeaderboardLoading(true)
      }
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
      setLeaderboardRefreshing(false)
    }
  }, [])

  const fetchStreakData = useCallback(async () => {
    try {
      setStreakLoading(true)
      const response = await fetch('/api/streak-preview')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStreakData({
            currentStreak: data.currentStreak || 0,
            longestStreak: data.longestStreak || 0,
            isActiveToday: data.isActiveToday || false,
            daysUntilBreak: data.daysUntilBreak || 0
          })
        }
      }
    } catch (error) {
      console.error('Error fetching streak data:', error)
      // Use fallback data
      setStreakData({
        currentStreak: 5,
        longestStreak: 12,
        isActiveToday: true,
        daysUntilBreak: 1
      })
    } finally {
      setStreakLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard()
    fetchStreakData()
  }, [fetchLeaderboard, fetchStreakData])

  // Auto-rotate feature cards
  useEffect(() => {
    const cardInterval = setInterval(() => {
      setCurrentCardIndex((prev) => (prev + 1) % featureCards.length)
    }, 3200)

    return () => clearInterval(cardInterval)
  }, [])

  const scrollToHowItWorks = useCallback(() => {
    if (typeof window === 'undefined') return
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // 🚀 OPTIMIZATION: Memoize expensive computations
  const displayPlayers = useMemo(() => {
    return leaderboardPlayers.slice(0, 5)
  }, [leaderboardPlayers])
  
  // Streak display data (use live data or fallback)
  const displayStreak = useMemo(() => {
    return streakData || {
      currentStreak: 5,
      longestStreak: 12,
      isActiveToday: true,
      daysUntilBreak: 1
    }
  }, [streakData])

  const demoProgress = useMemo(() => ({
    level: 12,
    currentXP: 8420,
    nextLevelXP: 10000,
    streak: 5,
    winRate: 0.72,
  }), [])

  const demoProgressPct = useMemo(() => {
    return Math.min(Math.round((demoProgress.currentXP / demoProgress.nextLevelXP) * 100), 100)
  }, [demoProgress])
  
  // 🚀 OPTIMIZATION: Memoize FAQ data (moved outside component would be better, but keeping here for now)
  const homepageFAQs = useMemo(() => [
    {
      question: "How does Brain Battle generate quizzes from PDFs?",
      answer: "Brain Battle uses advanced AI to intelligently analyze your PDF documents, extracting key concepts, definitions, and important information. The AI then automatically generates personalized quiz questions—including multiple-choice, true/false, and open-ended questions—tailored specifically to your document's content. Simply upload your PDF, and within seconds, you'll have a comprehensive quiz ready to help you master the material."
    },
    {
      question: "Can I study with friends on Brain Battle?",
      answer: "Absolutely! Brain Battle is built for social learning. Create private multiplayer rooms with a simple room code and invite your friends to compete in real-time quiz battles. You can also join or create study groups (clans) for ongoing classroom-style sessions. Compete head-to-head, climb the leaderboard together, and turn studying into an engaging social experience that keeps you motivated."
    },
    {
      question: "Is Brain Battle free to use?",
      answer: "Yes! Brain Battle offers a generous free tier that includes 10 document uploads per month and quizzes with up to 10 questions each. For power users, Pro plans unlock unlimited documents, unlimited questions per quiz, advanced AI features, and the ability to create and manage classroom clans. Start free and upgrade when you're ready for more."
    },
    {
      question: "Is Brain Battle good for teachers?",
      answer: "Brain Battle is perfect for educators! Create classroom clans (study groups) where students can join for free—no student accounts needed. Host live, Kahoot-style quiz sessions for your entire class, track individual and class-wide progress, and make learning fun through gamification with XP, levels, and leaderboards. One Pro teacher account can manage up to 10 clans with 50 members each, making it ideal for multiple classes or subjects."
    },
    {
      question: "How accurate are the AI-generated questions?",
      answer: "Brain Battle's AI generates questions directly from your uploaded document content, ensuring high accuracy and relevance. The AI analyzes the actual text, examples, formulas, and concepts from your PDFs—not generic information—so every question is tailored to what you're actually studying. This means you'll get questions that match your course material, textbook, or lecture notes perfectly."
    }
  ], [])

  return (
    <>
      {/* Schema Markup for SEO */}
      <HomePageSchema />
      <OrganizationSchema />
      <WebSiteSchema />
      <ServiceSchema />
      <SiteNavigationElementSchema />
      <FAQSchema faqs={homepageFAQs} />
      
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-980 to-slate-900">
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
        <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between pl-4 pr-6 py-6 md:pl-6 md:pr-8 lg:pl-8 lg:pr-12 border-b-4 border-slate-700/50 bg-gradient-to-br from-slate-950/98 via-blue-980/98 to-slate-900/98 backdrop-blur-md shadow-lg">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="text-2xl font-black bg-gradient-to-r from-blue-300 to-orange-400 bg-clip-text text-transparent">
                BRAIN BATTLE
              </div>
            </button>
          </motion.div>
          <motion.div
            className="flex items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <a
                href="#how-it-works"
                className="text-blue-100 hover:text-blue-300 font-semibold text-sm transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  if (typeof window !== 'undefined') {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                How it works
              </a>
              <a
                href="#features"
                className="text-blue-100 hover:text-blue-300 font-semibold text-sm transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  if (typeof window !== 'undefined') {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                Features
              </a>
            </nav>
            <Button
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
        <main className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] items-start justify-between min-h-[calc(100vh-80px)] pl-4 pr-6 md:pl-6 md:pr-8 lg:pl-8 lg:pr-12 pt-32 py-20 relative gap-10 max-w-7xl ml-0 mr-auto">
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
            <motion.h1 variants={item} className="text-4xl md:text-5xl lg:text-5xl font-black mb-6 leading-tight text-balance">
              <span className="text-white inline-block">Upload a PDF.</span>
              <br />
              <span className="bg-gradient-to-r from-blue-300 to-orange-300 bg-clip-text text-transparent inline-block text-3xl md:text-4xl lg:text-5xl">
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
                  className="bg-blue-500 hover:bg-blue-600 text-white text-lg h-14 px-8 font-black border-2 border-blue-400 shadow-lg shadow-blue-900/50"
                >
                  <Lightning className="w-5 h-5 mr-2" weight="fill" />
                  Start free
                </Button>
              </Link>
              <Button
                onClick={scrollToHowItWorks}
                className="border-2 border-orange-300 text-orange-200 hover:bg-orange-500/10 text-lg h-14 px-8 bg-transparent font-black"
              >
                See how it works
              </Button>
            </motion.div>

          </motion.div>

          {/* Right rail: demo video */}
          <motion.div
            className="w-full lg:w-[560px] xl:w-[640px] flex flex-col gap-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {/* Demo video holder */}
            <div className="rounded-2xl border-2 border-blue-400/30 bg-slate-900/80 shadow-2xl p-6 backdrop-blur overflow-hidden">
              <div className="relative w-full overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/70 aspect-video">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-transparent to-orange-400/10 animate-pulse" />
                <div className="absolute inset-3 rounded-lg border border-slate-600/50 bg-slate-900/60 flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-100/80">Demo: Create quiz in 60 seconds</span>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        {/* University Logos Carousel - Subtle Dark Mode Style */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="pt-8 pb-12 md:pt-10 md:pb-16 overflow-hidden border-y border-slate-800/30 -mt-4"
        >
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mb-6 px-6"
          >
            <h2 className="text-xl md:text-2xl font-bold text-blue-100/90 mb-2">
              Used by students at the following universities
            </h2>
            <p className="text-sm text-blue-200/60">
              Trusted by thousands of students across Canada
            </p>
          </motion.div>
          
          <div className="relative">
            {/* Gradient overlays for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-10 pointer-events-none" />
            
            {/* Carousel container */}
            <div 
              className="flex animate-scroll-left" 
              style={{ 
                willChange: 'transform', 
                width: 'max-content',
                transform: 'translateZ(0)', // Force hardware acceleration
              }}
            >
              {/* First set of logos - using logos from logos folder with greyscale */}
              {[
                { src: "/logos/uoftnobg.webp", alt: "University of Toronto", filter: 'grayscale(100%) brightness(0) invert(1) contrast(1.2)', width: 350, height: 140 },
                { src: "/logos/uwaterloonobg.png", alt: "University of Waterloo", filter: 'brightness(0) invert(1) brightness(3) contrast(1.3)' },
                { src: "/logos/McMaster-logo.png", alt: "McMaster University", filter: 'brightness(0) invert(1) contrast(1.2)' },
                { src: "/logos/lauriernobg.png", alt: "Wilfrid Laurier University", filter: 'brightness(0) invert(1)' },
                { src: "/logos/brocknobg.png", alt: "Brock University", filter: 'brightness(0) invert(1)' },
                { src: "/logos/yorklogo.png", alt: "York University", filter: 'brightness(0) invert(1)' },
              ].map((logo, idx) => (
                <div
                  key={`first-${idx}`}
                  className="flex-shrink-0 mx-8 flex items-center justify-center"
                >
                  <div className="px-6 py-4 min-w-[200px] max-w-[250px] flex items-center justify-center h-20 bg-transparent">
                    <div className="relative w-full h-full flex items-center justify-center bg-transparent">
                      <Image
                        src={logo.src}
                        alt={logo.alt || `${logo.src.split('/').pop()} logo`}
                        width={logo.width || (logo.src.includes('uoftnobg') ? 300 : 200)}
                        height={logo.height || (logo.src.includes('uoftnobg') ? 120 : 80)}
                        className={`object-contain w-auto opacity-60 hover:opacity-80 transition-opacity duration-300 ${
                          logo.src.includes('brocknobg') 
                            ? 'max-h-24 md:max-h-32 scale-125' 
                            : logo.src.includes('uoftnobg')
                            ? 'max-h-24 md:max-h-28'
                            : 'max-h-16 md:max-h-20'
                        }`}
                        style={{ 
                          filter: logo.filter,
                          backgroundColor: 'transparent',
                        }}
                        unoptimized
                        loading={logo.src.includes('uoftnobg') ? 'eager' : 'lazy'}
                        fetchPriority={logo.src.includes('uoftnobg') ? 'high' : 'low'}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Duplicate set for seamless loop */}
              {[
                { src: "/logos/uoftnobg.webp", alt: "University of Toronto", filter: 'grayscale(100%) brightness(0) invert(1) contrast(1.2)', width: 350, height: 140 },
                { src: "/logos/uwaterloonobg.png", alt: "University of Waterloo", filter: 'brightness(0) invert(1) brightness(3) contrast(1.3)' },
                { src: "/logos/McMaster-logo.png", alt: "McMaster University", filter: 'brightness(1.5) invert(1) contrast(1.1) saturate(0.8)' },
                { src: "/logos/lauriernobg.png", alt: "Wilfrid Laurier University", filter: 'brightness(0) invert(1)' },
                { src: "/logos/brocknobg.png", alt: "Brock University", filter: 'brightness(0) invert(1)' },
                { src: "/logos/yorklogo.png", alt: "York University", filter: 'brightness(0) invert(1)' },
              ].map((logo, idx) => (
                <div
                  key={`second-${idx}`}
                  className="flex-shrink-0 mx-8 flex items-center justify-center"
                >
                  <div className="px-6 py-4 min-w-[200px] max-w-[250px] flex items-center justify-center h-20 bg-transparent">
                    <div className="relative w-full h-full flex items-center justify-center bg-transparent">
                      <Image
                        src={logo.src}
                        alt={logo.alt || `${logo.src.split('/').pop()} logo`}
                        width={logo.width || (logo.src.includes('uoftnobg') ? 300 : 200)}
                        height={logo.height || (logo.src.includes('uoftnobg') ? 120 : 80)}
                        className={`object-contain w-auto opacity-60 hover:opacity-80 transition-opacity duration-300 ${
                          logo.src.includes('brocknobg') 
                            ? 'max-h-24 md:max-h-32 scale-125' 
                            : logo.src.includes('uoftnobg')
                            ? 'max-h-24 md:max-h-28'
                            : 'max-h-16 md:max-h-20'
                        }`}
                        style={{ 
                          filter: logo.filter,
                          backgroundColor: 'transparent',
                        }}
                        unoptimized
                        loading={logo.src.includes('uoftnobg') ? 'eager' : 'lazy'}
                        fetchPriority={logo.src.includes('uoftnobg') ? 'high' : 'low'}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Live Leaderboard Section - New Layout */}
        <section className="px-6 py-20 md:px-8 lg:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Live Leaderboard Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-slate-850 to-slate-900 rounded-2xl border-2 border-orange-300/40 shadow-2xl p-6 backdrop-blur order-1 lg:order-1"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-white">Live Leaderboard</h3>
                <Button
                  onClick={() => fetchLeaderboard(true)}
                  disabled={leaderboardRefreshing}
                  className="border-2 border-blue-400 text-blue-100 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-60"
                >
                  {leaderboardRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="space-y-2">
                {leaderboardLoading ? (
                  [...Array(5)].map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-600/50 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-slate-600/50 rounded" />
                        <div className="h-3 w-20 bg-slate-600/50 rounded" />
                      </div>
                    </div>
                  ))
                ) : displayPlayers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-orange-100/70">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-orange-300/50" />
                    <p className="font-semibold text-base">No players yet</p>
                    <p className="text-xs mt-1">Be the first to join the leaderboard!</p>
                  </div>
                ) : (
                  displayPlayers.map((player, index) => {
                    // Get initials for avatar
                    const initials = player.username
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || player.username.slice(0, 2).toUpperCase()
                    
                    // Highlight 3rd place (index 2)
                    const isHighlighted = index === 2
                    
                    return (
                      <div
                        key={player.user_id || player.rank}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isHighlighted 
                            ? "bg-slate-700/80 border border-slate-600/60" 
                            : "bg-slate-800/60 border border-slate-700/50"
                        }`}
                      >
                        {/* Rank Number */}
                        <div className="w-8 flex items-center justify-center text-sm font-black text-white">
                          {player.rank}
                        </div>
                        
                        {/* Avatar with Initials */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm border border-blue-300/30">
                          {initials}
                        </div>
                        
                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{player.username}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Zap className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs text-blue-200/90 font-semibold">{player.xp.toLocaleString()}</span>
                            {player.streak !== undefined && player.streak > 0 && (
                              <>
                                <Flame className="w-3.5 h-3.5 text-orange-400 ml-1" />
                                <span className="text-xs text-orange-300 font-semibold">{player.streak}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              
              {/* Live Rankings Indicator */}
              <div className="mt-4 flex items-center gap-2 text-xs text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-semibold">Live Rankings</span>
              </div>
            </motion.div>

            {/* Right: Descriptive Text */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 order-2 lg:order-2"
            >
              <div>
                <div className="inline-block mb-3">
                  <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold border border-blue-400/30">
                    Compete & Climb
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-4">
                  <span className="text-white">Live</span>{' '}
                  <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                    Leaderboard
                  </span>
                </h2>
                <p className="text-lg text-blue-100/80 leading-relaxed">
                  Watch the rankings shift in real-time as your friends battle it out. Every correct answer earns XP, and <span className="text-orange-300 font-semibold">streaks unlock special rewards</span>. Compete globally and prove you're the ultimate study champion.
                </p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-3xl font-black text-blue-400 mb-1">50K+</div>
                  <div className="text-sm text-blue-100/70 font-semibold">Active Players</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-3xl font-black text-orange-400 mb-1">2M+</div>
                  <div className="text-sm text-orange-100/70 font-semibold">Battles Daily</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Keep Your Streak Alive Section - Matching Leaderboard Layout */}
        <section id="streak-section" className="px-6 py-20 md:px-8 lg:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Title + Description */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 order-1 lg:order-1"
            >
              <div>
                <div className="inline-block mb-3">
                  <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs font-bold border border-orange-400/30">
                    Build Habits
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-4">
                  <span className="text-white">Keep Your Streak</span>{' '}
                  <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                    Alive
                  </span>
                </h2>
                <p className="text-lg text-blue-100/80 leading-relaxed mb-4">
                  Daily streaks are one of the most powerful engagement tools in gamified learning. By completing just one quiz battle per day, you build consistent study habits that compound over time.
                </p>
                <p className="text-base text-blue-100/70 leading-relaxed">
                  Our <span className="text-orange-300 font-semibold">48-hour grace period</span> gives you flexibility - miss one day and your streak continues. This design reduces anxiety while still encouraging daily practice. Research shows that streaks increase user retention by up to <span className="text-orange-300 font-semibold">40%</span> and create lasting learning habits.
                </p>
              </div>
              
              {/* Benefits */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-2xl font-black text-orange-400 mb-1">40%</div>
                  <div className="text-sm text-orange-100/70 font-semibold">Higher Retention</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-2xl font-black text-orange-400 mb-1">48hr</div>
                  <div className="text-sm text-orange-100/70 font-semibold">Grace Period</div>
                </div>
              </div>
            </motion.div>

            {/* Right: Big Flame Animation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center order-2 lg:order-2"
            >
              <StreakFlameAnimation />
            </motion.div>
          </div>
        </section>

        {/* Upload Any Document Section */}
        <section className="px-6 py-20 md:px-8 lg:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Document Upload Illustration */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center order-1 lg:order-1"
            >
              <div className="relative w-full max-w-md">
                {/* Document Stack Illustration */}
                <div className="relative">
                  {/* Background glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-orange-500/20 rounded-3xl blur-3xl" />
                  
                  {/* Document cards stack */}
                  <div className="relative space-y-4 p-8">
                    {/* PDF Document */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border-2 border-blue-400/30 shadow-xl transform rotate-[-2deg]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center">
                          <span className="text-xs font-black text-red-400">PDF</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-slate-700 rounded w-3/4 mb-1" />
                          <div className="h-2 bg-slate-700 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Word Document */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border-2 border-blue-400/30 shadow-xl transform rotate-[1deg] ml-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                          <span className="text-xs font-black text-blue-400">DOC</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-slate-700 rounded w-4/5 mb-1" />
                          <div className="h-2 bg-slate-700 rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                    
                    {/* PowerPoint Document */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border-2 border-orange-400/30 shadow-xl transform rotate-[-1deg] ml-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center">
                          <span className="text-xs font-black text-orange-400">PPT</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-slate-700 rounded w-full mb-1" />
                          <div className="h-2 bg-slate-700 rounded w-3/4" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Upload Arrow/Icon */}
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center border-4 border-slate-900 shadow-xl">
                        <UploadSimple className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Title + Description */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 order-2 lg:order-2"
            >
              <div>
                <div className="inline-block mb-3">
                  <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold border border-blue-400/30">
                    Multiple Formats
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-4">
                  <span className="text-white">Upload Any</span>{' '}
                  <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                    Document
                  </span>
                </h2>
                <p className="text-lg text-blue-100/80 leading-relaxed mb-4">
                  Brain Battle supports a wide variety of document formats, making it easy to study from any source. Upload PDFs, Word documents, PowerPoint presentations, and more - our AI extracts the content and creates personalized study materials.
                </p>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-orange-400" />
                      AI-Powered Study Notes
                    </h3>
                    <p className="text-base text-blue-100/70 leading-relaxed">
                      Transform your documents into comprehensive study notes with key concepts, formulas, definitions, and practice questions. Our AI analyzes your content and creates structured notes tailored to your education level and learning goals.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-orange-400" />
                      Instant Quiz Generation
                    </h3>
                    <p className="text-base text-blue-100/70 leading-relaxed">
                      Generate quiz questions directly from your documents in seconds. Battle friends in real-time, test your knowledge, and earn XP. Every question is based on your actual study materials, ensuring relevance and accuracy.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Supported Formats */}
              <div className="pt-4">
                <p className="text-sm text-blue-100/60 font-semibold mb-3">Supported Formats:</p>
                <div className="flex flex-wrap gap-2">
                  {['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'TXT', 'MD'].map((format) => (
                    <span
                      key={format}
                      className="px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-xs font-semibold text-blue-200/80"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
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
                  className="relative rounded-2xl p-6 pt-8 border border-slate-700/60 bg-slate-900/85 hover:border-blue-300/50 transition-colors shadow-lg shadow-black/20 flex flex-col"
                >
                  {/* Step Number Badge */}
                  <div className="absolute -top-5 left-6 w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 border-4 border-slate-900 flex items-center justify-center font-black text-white text-lg z-10">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-black text-white mb-3 mt-2">{step.title}</h3>
                  <p className="text-sm text-blue-100/70 leading-relaxed flex-1">{step.description}</p>
                  
                  {/* Arrow connector (hidden on last item) */}
                  {idx < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 -translate-y-1/2 translate-x-full z-10">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-orange-400"></div>
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
            {features.map((feature, idx) => (
              <FeatureCard key={`${feature.title}-${idx}`} feature={feature} index={idx} />
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-6 py-20 md:px-8 lg:px-12 max-w-4xl mx-auto">
          <motion.div
            {...fadeInUpViewport}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              <span className="text-blue-300">Frequently Asked</span>{' '}
              <span className="text-orange-400">Questions</span>
            </h2>
            <p className="text-lg text-blue-100/70">Everything you need to know about Brain Battle</p>
          </motion.div>

          <Accordion items={homepageFAQs} />
        </section>

        {/* CTA Section */}
        <section className="px-6 py-16 md:px-8 lg:px-12 max-w-4xl mx-auto text-center mb-20">
          <motion.div
            {...fadeInUpViewport}
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
    </main>
    </>
  )
}