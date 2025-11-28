"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const allItems = [
    { label: "Home", href: "/" },
    ...items,
  ]

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      <ol className="flex items-center gap-2" itemScope itemType="https://schema.org/BreadcrumbList">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const position = index + 1

          return (
            <li
              key={item.href || item.label}
              className="flex items-center gap-2"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index === 0 ? (
                <Link
                  href={item.href || "/"}
                  className="flex items-center gap-1 text-blue-300/70 hover:text-blue-300 transition-colors"
                  itemProp="item"
                >
                  <Home className="h-4 w-4" strokeWidth={3} />
                  <span className="sr-only" itemProp="name">Home</span>
                </Link>
              ) : isLast ? (
                <span className="font-bold text-white" itemProp="name">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href || "#"}
                  className="text-blue-300/70 hover:text-blue-300 transition-colors font-bold"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(position)} />
              {!isLast && (
                <ChevronRight className="h-4 w-4 text-blue-300/50" strokeWidth={3} aria-hidden="true" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Generate BreadcrumbList schema markup for SEO
 */
export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const allItems = [
    { label: "Home", href: "/" },
    ...items,
  ]

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://brainbattle.com"

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? `${baseUrl}${item.href}` : undefined,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

