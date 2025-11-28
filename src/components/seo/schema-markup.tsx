/**
 * Schema Markup Components
 * 
 * Provides structured data (JSON-LD) for search engines and AI systems.
 * Helps with rich results, AI Overviews, and better understanding of content.
 */

interface HomePageSchemaProps {
  siteUrl?: string
}

/**
 * Product/SoftwareApplication Schema for Homepage
 * Tells search engines this is a software application with specific features
 */
export function HomePageSchema({ siteUrl = 'https://brainbattle.com' }: HomePageSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Brain Battle",
    "description": "AI-powered study platform that converts PDFs into interactive quizzes and enables multiplayer study battles. Upload study materials, generate personalized questions with AI, and compete with friends in real-time.",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "url": siteUrl,
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    },
    "featureList": [
      "AI Quiz Generation from PDFs",
      "Multiplayer Study Battles",
      "Real-time Competition",
      "Study Notes Generator",
      "Gamified Learning",
      "Achievement System",
      "Classroom/Clan Management",
      "Daily Streak Tracking",
      "XP and Leveling System"
    ],
    "screenshot": `${siteUrl}/screenshot.png`
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * FAQ Schema Component
 * Use on pages with frequently asked questions
 */
interface FAQSchemaProps {
  faqs: Array<{
    question: string
    answer: string
  }>
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * How-To Schema Component
 * Use for tutorial/guide pages
 */
interface HowToSchemaProps {
  name: string
  description: string
  steps: Array<{
    name: string
    text: string
    image?: string
  }>
  siteUrl?: string
}

export function HowToSchema({ name, description, steps, siteUrl = 'https://brainbattle.com' }: HowToSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      ...(step.image && { "image": step.image.startsWith('http') ? step.image : `${siteUrl}${step.image}` })
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Article Schema Component
 * Use for blog posts
 */
interface ArticleSchemaProps {
  headline: string
  description: string
  image: string
  datePublished: string
  dateModified?: string
  author?: string
  siteUrl?: string
}

export function ArticleSchema({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  author = "Brain Battle",
  siteUrl = 'https://brainbattle.com'
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": headline,
    "description": description,
    "image": image.startsWith('http') ? image : `${siteUrl}${image}`,
    "datePublished": datePublished,
    "dateModified": dateModified || datePublished,
    "author": {
      "@type": "Organization",
      "name": author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Brain Battle",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Organization Schema
 * Use on homepage or about page
 */
interface OrganizationSchemaProps {
  siteUrl?: string
}

export function OrganizationSchema({ siteUrl = 'https://brainbattle.com' }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Brain Battle",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "description": "AI-powered study platform that makes learning fun through gamification, multiplayer competition, and intelligent quiz generation.",
    "sameAs": [
      // Add social media links when available
      // "https://twitter.com/brainbattle",
      // "https://linkedin.com/company/brainbattle"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "email": "support@brainbattle.com" // Update with actual email
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

