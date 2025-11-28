import { MetadataRoute } from 'next'

/**
 * Robots.txt Configuration
 * 
 * Controls which pages search engines can crawl and index.
 * This is a courtesy to search engines, not a security measure.
 * 
 * @see https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brainbattle.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // API routes - no need to index
          '/api/',
          
          // Admin pages - private
          '/admin/',
          
          // User dashboards - require authentication, not useful in search
          '/dashboard/',
          
          // Private game rooms - session-specific, not useful in search
          '/room/',
          '/join-room/',
          '/create-room/',
          
          // Battle pages - session-specific, dynamic content
          '/singleplayer/battle/',
          '/room/*/battle/',
          
          // Testing/development pages
          '/loading-test/',
          '/test/',
          
          // Authentication pages - can index login/signup, but not user-specific pages
          // Note: We allow /login and /signup (they're public)
        ],
      },
      // Allow Googlebot to access more for better indexing
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/room/',
          '/singleplayer/battle/',
          '/room/*/battle/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

