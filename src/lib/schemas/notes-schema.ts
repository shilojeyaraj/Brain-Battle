export const notesSchema = {
  type: "object",
  properties: {
    title: { 
      type: "string",
      description: "Main topic or subject title based on the content"
    },
    subject: {
      type: "string",
      description: "The academic subject or field (e.g., 'Biology', 'Mathematics', 'History')"
    },
    education_level: {
      type: "string",
      enum: ["elementary", "middle_school", "high_school", "college", "graduate", "professional"],
      description: "The target education level based on content analysis"
    },
    difficulty_level: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Difficulty level based on content complexity within the education level"
    },
    complexity_analysis: {
      type: "object",
      properties: {
        vocabulary_level: {
          type: "string",
          enum: ["basic", "intermediate", "advanced", "expert"],
          description: "Complexity of vocabulary used in the content"
        },
        concept_sophistication: {
          type: "string",
          enum: ["concrete", "abstract", "theoretical", "research"],
          description: "Level of conceptual sophistication required"
        },
        prerequisite_knowledge: {
          type: "array",
          items: { type: "string" },
          description: "List of prerequisite topics or knowledge areas needed"
        },
        reasoning_level: {
          type: "string",
          enum: ["memorization", "comprehension", "application", "analysis", "synthesis", "evaluation"],
          description: "Highest level of cognitive reasoning required"
        }
      },
      required: ["vocabulary_level", "concept_sophistication", "prerequisite_knowledge", "reasoning_level"],
      additionalProperties: false
    },
    outline: { 
      type: "array", 
      items: { type: "string" },
      description: "5-10 bullet points summarizing the main topics covered"
    },
    key_terms: { 
      type: "array", 
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          definition: { type: "string" },
          importance: { 
            type: "string", 
            enum: ["high", "medium", "low"],
            description: "How important this term is for understanding the topic"
          }
        },
        required: ["term", "definition", "importance"],
        additionalProperties: false
      },
      description: "8-12 important terms with definitions and importance levels"
    },
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          examples: { 
            type: "array", 
            items: { type: "string" },
            description: "Real-world examples or applications"
          },
          connections: {
            type: "array",
            items: { type: "string" },
            description: "How this concept connects to other topics"
          }
        },
        required: ["heading", "bullets"],
        additionalProperties: false
      },
      description: "4-8 main concept sections with detailed explanations, examples, and connections"
    },
    diagrams: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { 
            type: "string", 
            enum: ["file", "web"],
            description: "Whether the diagram comes from the uploaded file or web search"
          },
          title: { type: "string" },
          caption: { type: "string" },
          image_url: { 
            type: "string",
            description: "URL for web images or CDN path for extracted images"
          },
          image_data_b64: { 
            type: "string",
            description: "Base64 encoded image data for extracted file images"
          },
          credit: { 
            type: "string",
            description: "Attribution for web images (e.g., 'Unsplash: Jane Doe')"
          },
          page: { 
            type: "number",
            description: "Page number when source is 'file'"
          },
          bbox: { 
            type: "array",
            items: { type: "number" },
            description: "Bounding box coordinates [x0, y0, x1, y1] for highlighting"
          },
          keywords: {
            type: "array",
            items: { type: "string" },
            description: "Search keywords for web image enrichment when source is 'web'"
          }
        },
        required: ["source", "title", "caption"],
        additionalProperties: false
      },
      description: "3-8 high-value diagrams and figures relevant to the content"
    },
    practice_questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          type: { 
            type: "string", 
            enum: ["multiple_choice", "open_ended", "true_false", "fill_blank"],
            description: "Type of practice question"
          },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Answer options for multiple choice questions"
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
            description: "Question difficulty level"
          },
          explanation: {
            type: "string",
            description: "Detailed explanation of the answer"
          },
          topic: {
            type: "string",
            description: "Which topic/concept this question tests"
          }
        },
        required: ["question", "answer", "type", "difficulty", "explanation", "topic"],
        additionalProperties: false
      },
      description: "8-15 practice questions of varying types and difficulties"
    },
    resources: {
      type: "object",
      properties: {
        links: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              description: { type: "string" },
              type: { 
                type: "string", 
                enum: ["article", "video", "interactive", "simulation", "textbook", "research"],
                description: "Type of resource"
              },
              relevance: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "How relevant this resource is to the study topic"
              }
            },
            required: ["title", "url", "description", "type", "relevance"],
            additionalProperties: false
          },
          description: "5-10 high-quality external resources relevant to the study topic"
        },
        videos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              description: { type: "string" },
              duration: { type: "string" },
              platform: { type: "string" },
              relevance: {
                type: "string",
                enum: ["high", "medium", "low"]
              }
            },
            required: ["title", "url", "description", "duration", "platform", "relevance"],
            additionalProperties: false
          },
          description: "3-5 educational videos relevant to the topic"
        },
        simulations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              description: { type: "string" },
              type: { type: "string" },
              relevance: {
                type: "string",
                enum: ["high", "medium", "low"]
              }
            },
            required: ["title", "url", "description", "type", "relevance"],
            additionalProperties: false
          },
          description: "2-4 interactive simulations or tools"
        }
      },
      required: ["links", "videos", "simulations"],
      additionalProperties: false
    },
    study_tips: {
      type: "array",
      items: { type: "string" },
      description: "5-8 specific study tips for mastering this topic"
    },
    common_misconceptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          misconception: { type: "string" },
          correction: { type: "string" },
          why_common: { type: "string" }
        },
        required: ["misconception", "correction", "why_common"],
        additionalProperties: false
      },
      description: "3-5 common misconceptions students have about this topic"
    }
  },
  required: ["title", "subject", "education_level", "difficulty_level", "complexity_analysis", "outline", "key_terms", "concepts", "diagrams", "practice_questions", "resources", "study_tips", "common_misconceptions"],
  additionalProperties: false
} as const

export type StudyNotes = {
  title: string
  subject: string
  education_level: "elementary" | "middle_school" | "high_school" | "college" | "graduate" | "professional"
  difficulty_level: "beginner" | "intermediate" | "advanced"
  complexity_analysis: {
    vocabulary_level: "basic" | "intermediate" | "advanced" | "expert"
    concept_sophistication: "concrete" | "abstract" | "theoretical" | "research"
    prerequisite_knowledge: string[]
    reasoning_level: "memorization" | "comprehension" | "application" | "analysis" | "synthesis" | "evaluation"
  }
  outline: string[]
  key_terms: {
    term: string
    definition: string
    importance: "high" | "medium" | "low"
  }[]
  concepts: {
    heading: string
    bullets: string[]
    examples?: string[]
    connections?: string[]
  }[]
  diagrams: {
    source: "file" | "web"
    title: string
    caption: string
    image_url?: string
    image_data_b64?: string
    credit?: string
    page?: number
    bbox?: number[]
    keywords?: string[]
  }[]
  practice_questions: {
    question: string
    answer: string
    type: "multiple_choice" | "open_ended" | "true_false" | "fill_blank"
    options?: string[]
    difficulty: "easy" | "medium" | "hard"
    explanation: string
    topic: string
  }[]
  resources: {
    links: {
      title: string
      url: string
      description: string
      type: "article" | "video" | "interactive" | "simulation" | "textbook" | "research"
      relevance: "high" | "medium" | "low"
    }[]
    videos: {
      title: string
      url: string
      description: string
      duration: string
      platform: string
      relevance: "high" | "medium" | "low"
    }[]
    simulations: {
      title: string
      url: string
      description: string
      type: string
      relevance: "high" | "medium" | "low"
    }[]
  }
  study_tips: string[]
  common_misconceptions: {
    misconception: string
    correction: string
    why_common: string
  }[]
}
