"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, FileText, Brain, Target, BookOpen, TrendingUp } from "lucide-react"

interface DocumentInsightsProps {
  userId: string
  onSelectDocument?: (document: any) => void
}

interface DocumentStats {
  total_documents: number
  total_chunks: number
  subjects: string[]
  topics: string[]
  file_types: string[]
}

interface SearchResult {
  file_name: string
  relevance_score: number
  chunks_found: number
  subject_tags: string[]
  course_topics: string[]
  difficulty_levels: string[]
  chunks: Array<{
    chunk_text: string
    similarity_score: number
    chunk_metadata: any
  }>
}

export default function DocumentInsights({ userId, onSelectDocument }: DocumentInsightsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)

  // Load document statistics on mount
  useEffect(() => {
    loadDocumentStats()
  }, [userId])

  const loadDocumentStats = async () => {
    try {
      const response = await fetch(`/api/semantic-search?userId=${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setDocumentStats(result.statistics)
      }
    } catch (error) {
      console.error('Error loading document stats:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          userId: userId,
          limit: 10,
          threshold: 0.6
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSearchResults(result.results)
      } else {
        console.error('Search failed:', result.error)
      }
    } catch (error) {
      console.error('Error performing search:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-chart-3 text-foreground'
      case 'intermediate':
        return 'bg-primary text-primary-foreground'
      case 'advanced':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      {/* Document Statistics */}
      {documentStats && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center cartoon-border">
              <TrendingUp className="w-5 h-5 text-primary" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-foreground">Your Document Library</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50 cartoon-border">
              <div className="text-2xl font-black text-primary">{documentStats.total_documents}</div>
              <div className="text-sm text-muted-foreground font-bold">Documents</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50 cartoon-border">
              <div className="text-2xl font-black text-primary">{documentStats.total_chunks}</div>
              <div className="text-sm text-muted-foreground font-bold">Chunks</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50 cartoon-border">
              <div className="text-2xl font-black text-primary">{documentStats.subjects.length}</div>
              <div className="text-sm text-muted-foreground font-bold">Subjects</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50 cartoon-border">
              <div className="text-2xl font-black text-primary">{documentStats.topics.length}</div>
              <div className="text-sm text-muted-foreground font-bold">Topics</div>
            </div>
          </div>

          {/* Subject Tags */}
          {documentStats.subjects.length > 0 && (
            <div className="mt-4">
              <h4 className="font-black text-foreground mb-2">Subjects Found:</h4>
              <div className="flex flex-wrap gap-2">
                {documentStats.subjects.slice(0, 10).map((subject, index) => (
                  <Badge key={index} className="cartoon-border bg-secondary text-secondary-foreground font-bold">
                    {subject}
                  </Badge>
                ))}
                {documentStats.subjects.length > 10 && (
                  <Badge className="cartoon-border bg-muted text-muted-foreground font-bold">
                    +{documentStats.subjects.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Semantic Search */}
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center cartoon-border">
            <Search className="w-5 h-5 text-secondary" strokeWidth={3} />
          </div>
          <h3 className="text-xl font-black text-foreground">Semantic Search</h3>
        </div>

        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Search your documents by meaning, not just keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 h-12 text-lg font-bold cartoon-border"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black px-6 cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
            ) : (
              <Search className="h-5 w-5" strokeWidth={3} />
            )}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground font-bold">
          Find documents by concept, topic, or meaning. The AI understands the content, not just keywords.
        </p>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center cartoon-border">
              <Brain className="w-5 h-5 text-chart-3" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-foreground">Search Results</h3>
            <Badge className="cartoon-border bg-chart-3 text-foreground font-black">
              {searchResults.length} documents found
            </Badge>
          </div>

          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  selectedResult?.file_name === result.file_name
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
                onClick={() => {
                  setSelectedResult(result)
                  onSelectDocument?.(result)
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" strokeWidth={3} />
                    <div>
                      <h4 className="font-black text-foreground">{result.file_name}</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground font-bold">
                          {result.chunks_found} relevant chunks
                        </span>
                        <span className="text-primary font-black">
                          {(result.relevance_score * 100).toFixed(1)}% match
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cartoon-border"
                  >
                    <Target className="h-4 w-4 mr-1" strokeWidth={3} />
                    Select
                  </Button>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {result.subject_tags.slice(0, 3).map((tag, tagIndex) => (
                    <Badge key={tagIndex} className="cartoon-border bg-secondary text-secondary-foreground font-bold text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {result.course_topics.slice(0, 2).map((topic, topicIndex) => (
                    <Badge key={topicIndex} className="cartoon-border bg-primary text-primary-foreground font-bold text-xs">
                      {topic}
                    </Badge>
                  ))}
                  {result.difficulty_levels.map((difficulty, diffIndex) => (
                    <Badge key={diffIndex} className={`cartoon-border font-bold text-xs ${getDifficultyColor(difficulty)}`}>
                      {difficulty}
                    </Badge>
                  ))}
                </div>

                {/* Preview of most relevant chunk */}
                {result.chunks.length > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/30 cartoon-border">
                    <p className="text-sm text-muted-foreground font-bold line-clamp-3">
                      {result.chunks[0].chunk_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Selected Document Details */}
      {selectedResult && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center cartoon-border">
              <BookOpen className="w-5 h-5 text-primary" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-foreground">Selected Document</h3>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-black text-foreground mb-2">{selectedResult.file_name}</h4>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground font-bold">
                  Relevance: <span className="text-primary font-black">{(selectedResult.relevance_score * 100).toFixed(1)}%</span>
                </span>
                <span className="text-muted-foreground font-bold">
                  Chunks: <span className="text-primary font-black">{selectedResult.chunks_found}</span>
                </span>
              </div>
            </div>

            {/* All relevant chunks */}
            <div className="space-y-3">
              <h5 className="font-black text-foreground">Relevant Content:</h5>
              {selectedResult.chunks.map((chunk, index) => (
                <div key={index} className="p-3 rounded-lg bg-secondary/30 cartoon-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-bold">Chunk {index + 1}</span>
                    <span className="text-xs text-primary font-black">
                      {(chunk.similarity_score * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-sm text-foreground font-bold">
                    {chunk.chunk_text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
