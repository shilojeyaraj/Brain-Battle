import { Button } from "@/components/ui/button"
import { Brain, Users, Zap, Trophy, Star, Rocket, Target, Award } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="cartoon-border border-b bg-card sticky top-0 z-50 cartoon-shadow">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center cartoon-border cartoon-shadow">
              <Brain className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <span className="text-4xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Brain<span className="text-primary">Battle</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
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
            AI-Powered Study
            <span className="block text-primary mt-2">Battles!</span>
          </h1>

          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed font-bold">
            Upload your study materials, generate personalized questions with AI, and compete with friends in real-time battles. Transform any subject into an engaging learning experience!
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

        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2
            className="text-5xl lg:text-6xl font-black text-foreground mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-bold">
            Transform any study material into engaging battles with AI-powered question generation
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Users className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Upload & Study
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Upload your PDFs, documents, or notes. Our AI analyzes your content and generates personalized study materials and questions.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Zap className="w-8 h-8 text-secondary-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              AI-Generated Questions
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Our AI creates multiple choice and open-ended questions based on your uploaded content, ensuring every question is relevant to your study material.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-chart-3 flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Trophy className="w-8 h-8 text-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Multiplayer Battles
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Create study rooms and compete with friends in real-time! Host study sessions with customizable timers and shared study materials.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-chart-4 flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Star className="w-8 h-8 text-card" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Smart Study Notes
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Get AI-generated study notes with key concepts, definitions, examples, and practice questions tailored to your uploaded content.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Target className="w-8 h-8 text-accent-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Progress Tracking
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Track your performance with XP, levels, and detailed statistics. See your improvement over time and identify areas to focus on.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4 cartoon-border cartoon-shadow">
              <Award className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Single & Multiplayer
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold">
              Study solo with AI-generated questions or create multiplayer rooms with friends. Flexible study modes for every learning style.
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
              Transform your study materials into engaging battles with AI-powered question generation!
            </p>
            <div className="pt-6">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-card hover:bg-card/90 text-foreground text-2xl px-12 h-20 font-black cartoon-border cartoon-shadow-lg cartoon-hover"
                >
                  <Brain className="w-7 h-7 mr-3" strokeWidth={3} />
                  Let's Go!
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="cartoon-border border-t bg-card mt-20 cartoon-shadow">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center cartoon-border cartoon-shadow">
                <Brain className="w-7 h-7 text-primary-foreground" strokeWidth={3} />
              </div>
              <div>
                <span className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Brain<span className="text-primary">Battle</span>
                </span>
                <p className="text-sm text-muted-foreground font-bold">AI-powered study battles from your own materials!</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/demo" className="text-sm text-muted-foreground font-bold hover:text-primary transition-colors">
                Demo
              </Link>
              <Link href="/login" className="text-sm text-muted-foreground font-bold hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link href="/signup">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm px-6 py-2 cartoon-border cartoon-shadow cartoon-hover">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          <div className="cartoon-border border-t mt-8 pt-8 text-center text-sm text-muted-foreground font-bold">
            <p>&copy; 2025 BrainBattle. AI-powered study battles!</p>
          </div>
        </div>
      </footer>
    </div>
  )
}