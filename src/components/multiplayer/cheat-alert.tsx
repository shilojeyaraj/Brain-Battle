'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { Card } from '@/components/ui/card'

export interface CheatAlertData {
  user_id: string
  display_name: string
  violation_type: string
  duration_seconds: number
  timestamp: string
}

interface CheatAlertProps {
  alert: CheatAlertData
  onDismiss: () => void
  autoDismissMs?: number
}

export function CheatAlert({ alert, onDismiss, autoDismissMs = 7000 }: CheatAlertProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(Math.floor(autoDismissMs / 1000))

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissMs <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoDismissMs])

  const handleDismiss = () => {
    setIsVisible(false)
    // Small delay for exit animation
    setTimeout(onDismiss, 200)
  }

  const getViolationIcon = () => {
    switch (alert.violation_type) {
      case 'tab_switch':
        return <EyeOff className="h-5 w-5" />
      case 'window_blur':
        return <AlertTriangle className="h-5 w-5" />
      case 'visibility_change':
        return <Eye className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getViolationMessage = () => {
    const duration = alert.duration_seconds
    const durationText = duration < 60 
      ? `${duration} second${duration !== 1 ? 's' : ''}` 
      : `${Math.floor(duration / 60)} minute${Math.floor(duration / 60) !== 1 ? 's' : ''} ${duration % 60} second${duration % 60 !== 1 ? 's' : ''}`

    return `${alert.display_name} was away for ${durationText}`
  }

  if (!isVisible) return null

  return (
    <Card className="bg-yellow-50 border-yellow-200 shadow-lg animate-in slide-in-from-top-2 duration-300">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {getViolationIcon()}
              <span className="font-semibold text-yellow-800 text-sm">
                Cheat Detected
              </span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              {getViolationMessage()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {autoDismissMs > 0 && (
            <div className="text-xs text-yellow-600 font-medium">
              {timeRemaining}s
            </div>
          )}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-yellow-100 rounded-full transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4 text-yellow-600" />
          </button>
        </div>
      </div>
    </Card>
  )
}

interface CheatAlertContainerProps {
  alerts: CheatAlertData[]
  onAlertDismiss: (index: number) => void
}

export function CheatAlertContainer({ alerts, onAlertDismiss }: CheatAlertContainerProps) {
  if (alerts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 space-y-2">
      {alerts.map((alert, index) => (
        <CheatAlert
          key={`${alert.user_id}-${alert.timestamp}-${index}`}
          alert={alert}
          onDismiss={() => onAlertDismiss(index)}
          autoDismissMs={7000}
        />
      ))}
    </div>
  )
}
