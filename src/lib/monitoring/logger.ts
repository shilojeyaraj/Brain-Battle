/**
 * Structured Logging Utility
 * Centralized logging with levels and structured output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private minLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

  private formatMessage(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.message,
    ]

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context))
    }

    if (entry.error) {
      parts.push(`\nError: ${entry.error.message}`)
      if (entry.error.stack) {
        parts.push(`\nStack: ${entry.error.stack}`)
      }
    }

    return parts.join(' ')
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    }

    const formatted = this.formatMessage(entry)

    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }

    // In production, you might want to send to a logging service
    // if (process.env.NODE_ENV === 'production' && level === 'error') {
    //   // Send to external logging service
    // }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error)
  }

  /**
   * Log API request
   */
  apiRequest(method: string, path: string, statusCode: number, duration: number, userId?: string) {
    this.info('API Request', {
      method,
      path,
      statusCode,
      duration,
      userId,
    })
  }

  /**
   * Log database query
   */
  dbQuery(table: string, operation: string, duration: number, success: boolean) {
    this.debug('Database Query', {
      table,
      operation,
      duration,
      success,
    })
  }

  /**
   * Log authentication event
   */
  authEvent(event: string, userId?: string, success: boolean = true) {
    this.info('Auth Event', {
      event,
      userId,
      success,
    })
  }

  /**
   * Log security event
   */
  securityEvent(event: string, details: Record<string, any>) {
    this.warn('Security Event', {
      event,
      ...details,
    })
  }
}

// Singleton instance
export const logger = new Logger()

// Export for use in other modules
export default logger

