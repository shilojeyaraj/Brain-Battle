'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TutorialStep {
  id: string
  title: string
  description: string
  targetSelector: string // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  showSkip?: boolean
}

interface TutorialOverlayProps {
  steps: TutorialStep[]
  onComplete: () => void
  onSkip: () => void
  storageKey?: string
}

export function TutorialOverlay({ 
  steps, 
  onComplete, 
  onSkip,
  storageKey = 'tutorial_completed'
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)

  const step = steps[currentStep]

  // Find and highlight target element
  useEffect(() => {
    if (!step) return

    const findTarget = () => {
      const element = document.querySelector(step.targetSelector) as HTMLElement
      if (element) {
        setTargetElement(element)
        updateTargetRect(element)
        
        // Scroll element into view
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        })
        
        // Update rect after scroll
        setTimeout(() => updateTargetRect(element), 300)
      } else {
        // Retry after a short delay if element not found
        setTimeout(findTarget, 100)
      }
    }

    const updateTargetRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)
    }

    // Wait for DOM to be ready
    const timer = setTimeout(findTarget, 100)
    
    // Update on scroll/resize
    const handleUpdate = () => {
      const element = document.querySelector(step.targetSelector) as HTMLElement
      if (element) {
        updateTargetRect(element)
      }
    }
    
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [step, currentStep])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true')
    }
    onComplete()
  }

  const handleSkip = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true')
    }
    onSkip()
  }

  if (!step || !targetRect) {
    return null
  }

  // Calculate card position based on step position preference
  const getCardPosition = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }
    
    const padding = 20
    const cardWidth = 400
    const cardHeight = 250
    
    switch (step.position) {
      case 'top':
        return {
          top: `${targetRect.top - cardHeight - padding}px`,
          left: `${targetRect.left + (targetRect.width / 2) - (cardWidth / 2)}px`,
        }
      case 'bottom':
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + (targetRect.width / 2) - (cardWidth / 2)}px`,
        }
      case 'left':
        return {
          top: `${targetRect.top + (targetRect.height / 2) - (cardHeight / 2)}px`,
          left: `${targetRect.left - cardWidth - padding}px`,
        }
      case 'right':
        return {
          top: `${targetRect.top + (targetRect.height / 2) - (cardHeight / 2)}px`,
          left: `${targetRect.right + padding}px`,
        }
      case 'center':
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }
    }
  }

  const cardPosition = getCardPosition()

  return (
    <>
      {/* Dark overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998] bg-black/60"
        onClick={handleSkip}
      />
      
      {/* Spotlight highlight - positioned above overlay */}
      {targetRect && (
        <div
          ref={spotlightRef}
          className="fixed z-[9999] pointer-events-none transition-all duration-300"
          style={{
            top: `${targetRect.top - 4}px`,
            left: `${targetRect.left - 4}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
            borderRadius: '0.75rem',
            border: '4px solid',
            borderColor: 'hsl(var(--primary))',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.5)',
          }}
        />
      )}

      {/* Tutorial Card */}
      <div
        className="fixed z-[10000] bg-card rounded-2xl cartoon-border cartoon-shadow-lg p-6 max-w-md pointer-events-auto"
        style={{
          ...cardPosition,
          position: 'fixed',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" strokeWidth={3} />
            <span className="text-sm font-black text-primary">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </Button>
        </div>

        <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
          {step.title}
        </h3>
        <p className="text-base text-muted-foreground font-bold mb-6 leading-relaxed">
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="cartoon-border font-black"
              >
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
                Previous
              </Button>
            )}
            {step.showSkip && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="font-bold text-muted-foreground hover:text-foreground"
              >
                Skip Tutorial
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black cartoon-border cartoon-shadow cartoon-hover"
          >
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            <ArrowRight className="h-4 w-4 ml-2" strokeWidth={3} />
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-2 rounded-full transition-all',
                index === currentStep
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted'
              )}
            />
          ))}
        </div>
      </div>
    </>
  )
}

