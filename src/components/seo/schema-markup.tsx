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
export function HomePageSchema({ siteUrl = 'https://brain-battle.app' }: HomePageSchemaProps) {
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
      suppressHydrationWarning
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
      suppressHydrationWarning
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

export function HowToSchema({ name, description, steps, siteUrl = 'https://brain-battle.app' }: HowToSchemaProps) {
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
      suppressHydrationWarning
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
  siteUrl = 'https://brain-battle.app'
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
      suppressHydrationWarning
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

export function OrganizationSchema({ siteUrl = 'https://brain-battle.app' }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Brain Battle",
    "url": siteUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${siteUrl}/logo.png`,
      "width": 512,
      "height": 512
    },
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
      suppressHydrationWarning
    />
  )
}

/**
 * WebSite Schema - Helps Google understand site structure for sitelinks
 * Add to homepage for better search result appearance
 */
interface WebSiteSchemaProps {
  siteUrl?: string
  searchActionUrl?: string
}

export function WebSiteSchema({ 
  siteUrl = 'https://brain-battle.app',
  searchActionUrl 
}: WebSiteSchemaProps) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Brain Battle",
    "url": siteUrl,
    "description": "AI-powered study platform that converts PDFs into interactive quizzes and enables multiplayer study battles.",
    "publisher": {
      "@type": "Organization",
      "name": "Brain Battle",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": searchActionUrl || `${siteUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}

/**
 * Service Schema - Describes the services offered
 */
interface ServiceSchemaProps {
  siteUrl?: string
}

export function ServiceSchema({ siteUrl = 'https://brain-battle.app' }: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "AI-Powered Educational Quiz Generation",
    "provider": {
      "@type": "Organization",
      "name": "Brain Battle",
      "url": siteUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    },
    "areaServed": {
      "@type": "Place",
      "name": "Worldwide"
    },
    "description": "AI-powered quiz generation from PDF documents, multiplayer study battles, and comprehensive study notes creation.",
    "offers": [
      {
        "@type": "Offer",
        "name": "Free Plan",
        "price": "0",
        "priceCurrency": "USD",
        "description": "10 document uploads per month, quizzes with up to 10 questions"
      },
      {
        "@type": "Offer",
        "name": "Pro Plan",
        "price": "9.99",
        "priceCurrency": "USD",
        "description": "Unlimited documents, unlimited questions, multiplayer battles, and advanced features"
      }
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}

/**
 * SiteNavigationElement Schema - Helps Google understand site navigation
 */
interface SiteNavigationElementSchemaProps {
  siteUrl?: string
}

export function SiteNavigationElementSchema({ siteUrl = 'https://brain-battle.app' }: SiteNavigationElementSchemaProps) {
  const navigationItems = [
    { name: "Create Quiz", url: `${siteUrl}/create-quiz` },
    { name: "Study Notes", url: `${siteUrl}/study-notes` },
    { name: "Pricing", url: `${siteUrl}/pricing` },
    { name: "Join Lobby", url: `${siteUrl}/join-lobby` }
  ]

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": navigationItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "url": item.url
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}

