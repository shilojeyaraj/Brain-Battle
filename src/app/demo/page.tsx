import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Users, Zap, Trophy, ArrowLeft, Play } from "lucide-react"
import Link from "next/link"

export default function DemoPage() {
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
          <Link href="/">
            <Button className="bg-card hover:bg-muted text-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover">
              <ArrowLeft className="w-5 h-5 mr-2" strokeWidth={3} />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center space-y-8">
          <div className="inline-block">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground text-base font-black cartoon-border cartoon-shadow">
              <Play className="w-5 h-5" strokeWidth={3} />
              <span>Interactive Demo</span>
            </div>
          </div>

          <h1
            className="text-5xl lg:text-7xl font-black text-foreground text-balance leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            See BrainBattle
            <span className="block text-primary mt-2">In Action!</span>
          </h1>

          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed font-bold">
            Experience how easy it is to create study battles, upload documents, and compete with friends in real-time!
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-6 cartoon-border cartoon-shadow">
              <Users className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Step 1: Create a Room
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold mb-6">
              Start by creating a private study room and invite your friends with a simple room code.
            </p>
            <div className="p-4 rounded-xl bg-muted cartoon-border">
              <p className="text-sm font-mono text-foreground font-bold">Room Code: ABC123</p>
            </div>
          </Card>

          <Card className="p-8 bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center mb-6 cartoon-border cartoon-shadow">
              <Zap className="w-8 h-8 text-secondary-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Step 2: Upload Documents
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold mb-6">
              Upload your study materials - PDFs, notes, or any documents you want to be quizzed on.
            </p>
            <div className="p-4 rounded-xl bg-muted cartoon-border">
              <p className="text-sm font-bold text-foreground">📄 Math_Chapter_5.pdf</p>
              <p className="text-sm font-bold text-foreground">📄 Science_Notes.docx</p>
            </div>
          </Card>

          <Card className="p-8 bg-card cartoon-border cartoon-shadow-lg cartoon-hover">
            <div className="w-16 h-16 rounded-xl bg-chart-3 flex items-center justify-center mb-6 cartoon-border cartoon-shadow">
              <Trophy className="w-8 h-8 text-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Step 3: Battle & Win!
            </h3>
            <p className="text-muted-foreground leading-relaxed font-bold mb-6">
              Answer AI-generated questions in real-time and see who's the ultimate study champion!
            </p>
            <div className="p-4 rounded-xl bg-muted cartoon-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">You: 8/10</span>
                <span className="text-sm font-bold text-chart-3">🏆</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-primary via-secondary to-chart-3 p-12 lg:p-20 text-center cartoon-border cartoon-shadow-lg">
          <div className="space-y-6">
            <h2
              className="text-4xl lg:text-5xl font-black text-card text-balance"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Try It?
            </h2>
            <p className="text-xl text-card/90 max-w-2xl mx-auto text-pretty font-black">
              Join thousands of students who are already making studying fun!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-card hover:bg-card/90 text-foreground text-xl px-10 h-16 font-black cartoon-border cartoon-shadow-lg cartoon-hover"
                >
                  <Sparkles className="w-6 h-6 mr-3" strokeWidth={3} />
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-transparent hover:bg-card/20 text-card border-4 border-card text-xl px-10 h-16 font-black cartoon-shadow-lg cartoon-hover"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
