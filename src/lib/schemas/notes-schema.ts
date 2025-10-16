export const notesSchema = {
  type: "object",
  properties: {
    title: { 
      type: "string",
      description: "Main topic or subject title"
    },
    outline: { 
      type: "array", 
      items: { type: "string" },
      description: "5-10 bullet points summarizing the main topics"
    },
    key_terms: { 
      type: "array", 
      items: { type: "string" },
      description: "6-10 important terms and definitions"
    },
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          bullets: { type: "array", items: { type: "string" } }
        },
        required: ["heading", "bullets"],
        additionalProperties: false
      },
      description: "3-6 main concept sections with detailed explanations"
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
      description: "3-8 high-value diagrams and figures"
    },
    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          a: { type: "string" }
        },
        required: ["q", "a"],
        additionalProperties: false
      },
      description: "5-8 flashcard-style question/answer pairs"
    }
  },
  required: ["title", "outline", "key_terms", "concepts", "diagrams", "quiz"],
  additionalProperties: false
} as const

export type StudyNotes = {
  title: string
  outline: string[]
  key_terms: string[]
  concepts: {
    heading: string
    bullets: string[]
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
  quiz: {
    q: string
    a: string
  }[]
}
