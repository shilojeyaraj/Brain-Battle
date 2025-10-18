/**
 * Production-safe logging utility
 * Only logs in development environment
 */

export const logger = {
  log: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, ...args)
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(message, ...args)
    }
  },
  
  error: (message: string, ...args: any[]) => {
    // Always log errors, even in production
    console.error(message, ...args)
  },
  
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(message, ...args)
    }
  }
}
