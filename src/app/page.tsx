import { Button } from "@/components/ui/button"
import { Sparkles, Users, Zap, Trophy, Star, Rocket, Target, Award } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="cartoon-border border-b bg-card sticky top-0 z-50 cartoon-shadow">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center cartoon-border cartoon-shadow">
              <Sparkles className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <span className="text-4xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Brain<span className="text-primary">Battle</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className="text-foreground hover:text-primary font-bold text-lg cartoon-border bg-card cartoon-hover"
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/login">
              <Button className="cartoon-border bg-card hover:bg-muted text-foreground font-black text-lg cartoon-shadow cartoon-hover">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover">
                Join Now!
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center space-y-8">
          <div className="inline-block">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground text-base font-black cartoon-border cartoon-shadow">
              <Zap className="w-5 h-5" strokeWidth={3} />
              <span>Study Battles Made FUN!</span>
            </div>
          </div>

          <h1
            className="text-6xl lg:text-8xl font-black text-foreground text-balance leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Turn Studying Into
            <span className="block text-primary mt-2">Epic Showdowns!</span>
          </h1>

          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed font-bold">
            Challenge your friends, answer questions, and climb the leaderboards. Learning has never been this exciting!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-2xl px-12 h-20 font-black cartoon-border cartoon-shadow-lg cartoon-hover"
              >
                <Rocket className="w-7 h-7 mr-3" strokeWidth={3} />
                Start Playing!
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-2xl px-12 h-20 font-black cartoon-border cartoon-shadow-lg cartoon-hover"
              >
                <Star className="w-7 h-7 mr-3" strokeWidth={3} />
                See How It Works
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto pt-16">
            <div className="p-6 rounded-2xl bg-card cartoon-border cartoon-shadow-lg">
              <div className="text-5xl font-black text-primary" style={{ fontFamily: "var(--font-display)" }}>
                10K+
              </div>
              <div className="text-sm font-black text-foreground mt-2">Players</div>
            </div>
            <div className="p-6 rounded-2xl bg-card cartoon-border cartoon-shadow-lg">
              <div className="text-5xl font-black text-secondary" style={{ fontFamily: "var(--font-display)" }}>
                500K+
              </div>
              <div className="text-sm font-black text-foreground mt-2">Battles</div>
            </div>
            <div className="p-6 rounded-2xl bg-card cartoon-border cartoon-shadow-lg">
              <div className="text-5xl font-black text-chart-3" style={{ fontFamily: "var(--font-display)" }}>
                1M+
              </div>
              <div className="text-sm font-black text-foreground mt-2">Questions</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2
            className="text-5xl lg:text-6xl font-black text-foreground mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Why You'll Love It
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-bold">
            Everything you need for epic study sessions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Users className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Private Lobbies
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Create your own battle rooms! Invite friends, set the rules, and study together in style.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Zap className="w-8 h-8 text-secondary-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Lightning Fast
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Answer questions in real-time! Quick thinking wins battles and earns you bragging rights.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-chart-3 flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Trophy className="w-8 h-8 text-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Leaderboards
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Climb to the top! Track your progress and show everyone who's the ultimate brain champion.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-chart-4 flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Star className="w-8 h-8 text-card" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Any Subject
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Math, science, history, or anything else! Create custom question sets for any topic you're studying.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Target className="w-8 h-8 text-accent-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Track Progress
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              See how you improve over time! Detailed stats show your strengths and what to work on.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Award className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Multiple Modes
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Quick battles, team challenges, endurance rounds, and more! Never get bored with tons of game modes.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-primary via-secondary to-chart-3 p-12 lg:p-20 text-center cartoon-border cartoon-shadow-lg">
          <div className="space-y-6">
            <h2
              className="text-5xl lg:text-6xl font-black text-card text-balance"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Battle?
            </h2>
            <p className="text-2xl text-card/90 max-w-2xl mx-auto text-pretty font-black">
              Join thousands of students making studying actually fun!
            </p>
            <div className="pt-6">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-card hover:bg-card/90 text-foreground text-2xl px-12 h-20 font-black cartoon-border cartoon-shadow-lg cartoon-hover"
                >
                  <Sparkles className="w-7 h-7 mr-3" strokeWidth={3} />
                  Let's Go!
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="cartoon-border border-t bg-card mt-20 cartoon-shadow">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center cartoon-border cartoon-shadow">
                  <Sparkles className="w-7 h-7 text-primary-foreground" strokeWidth={3} />
                </div>
                <span className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  BrainBattle
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-bold">Making studying fun, one battle at a time!</p>
            </div>

            <div>
              <h4 className="font-black text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground font-bold">
                <li>
                  <Link href="/features" className="hover:text-primary transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-primary transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/demo" className="hover:text-primary transition-colors">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground font-bold">
                <li>
                  <Link href="/about" className="hover:text-primary transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-primary transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-primary transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground font-bold">
                <li>
                  <Link href="/help" className="hover:text-primary transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="cartoon-border border-t mt-12 pt-8 text-center text-sm text-muted-foreground font-bold">
            <p>&copy; 2025 BrainBattle. Making learning awesome!</p>
          </div>
        </div>
      </footer>
    </div>
  )
}