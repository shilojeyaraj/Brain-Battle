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
  onStepChange?: (step: number) => void // Callback when step changes
}

export function TutorialOverlay({ 
  steps, 
  onComplete, 
  onSkip,
  storageKey = 'tutorial_completed',
  onStepChange
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)

  const step = steps[currentStep]

  // Track viewport size for positioning calculations
  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }
    
    updateViewportSize()
    window.addEventListener('resize', updateViewportSize)
    
    return () => {
      window.removeEventListener('resize', updateViewportSize)
    }
  }, [])

  // Find and highlight target element
  useEffect(() => {
    if (!step) return

    let elementRef: HTMLElement | null = null
    let originalZIndex: string = ''
    let originalPosition: string = ''

    const updateTargetRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)
      
      // Include margins in the rect calculation for better coverage
      const marginTop = parseFloat(computedStyle.marginTop) || 0
      const marginBottom = parseFloat(computedStyle.marginBottom) || 0
      const marginLeft = parseFloat(computedStyle.marginLeft) || 0
      const marginRight = parseFloat(computedStyle.marginRight) || 0
      
      // Also check parent container for padding that might affect positioning
      const parent = element.parentElement
      let parentPaddingTop = 0
      let parentPaddingLeft = 0
      if (parent) {
        const parentStyle = window.getComputedStyle(parent)
        parentPaddingTop = parseFloat(parentStyle.paddingTop) || 0
        parentPaddingLeft = parseFloat(parentStyle.paddingLeft) || 0
      }
      
      // Create expanded rect that includes margins and ensures full coverage
      // Add extra padding (8px) for the border highlight
      const borderPadding = 8
      const expandedRect = new DOMRect(
        Math.max(0, rect.left - marginLeft - borderPadding),
        Math.max(0, rect.top - marginTop - borderPadding),
        rect.width + marginLeft + marginRight + (borderPadding * 2),
        rect.height + marginTop + marginBottom + (borderPadding * 2)
      )
      
      setTargetRect(expandedRect)
    }

    const findTarget = () => {
      const element = document.querySelector(step.targetSelector) as HTMLElement
      if (element) {
        elementRef = element
        setTargetElement(element)
        
        // Ensure target element is visible above overlay
        originalZIndex = element.style.zIndex
        originalPosition = element.style.position
        element.style.zIndex = '10001'
        if (getComputedStyle(element).position === 'static') {
          element.style.position = 'relative'
        }
        
        // Initial rect calculation before scroll
        updateTargetRect(element)
        
        // Scroll element into view with proper offset
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          // Scroll to center the element in viewport
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
          
          // Wait for scroll animation to complete, then update rect multiple times
          // Smooth scroll typically takes 300-500ms
          setTimeout(() => {
            updateTargetRect(element)
            // Update again after a short delay to catch any layout shifts
            setTimeout(() => {
              updateTargetRect(element)
              // Final check after another frame
              requestAnimationFrame(() => {
                updateTargetRect(element)
              })
            }, 100)
          }, 500)
        })
      } else {
        // Retry after a short delay if element not found
        setTimeout(findTarget, 100)
      }
    }

    // Wait for DOM to be ready, with longer delay for restart scenarios
    const timer = setTimeout(findTarget, currentStep === 0 ? 200 : 100)
    
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
      
      // Restore target element styles
      if (elementRef) {
        elementRef.style.zIndex = originalZIndex
        elementRef.style.position = originalPosition
      }
    }
  }, [step, currentStep])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      onStepChange?.(nextStep)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      onStepChange?.(prevStep)
    }
  }

  // Notify parent of initial step
  useEffect(() => {
    onStepChange?.(currentStep)
  }, []) // Only on mount

  const handleComplete = async () => {
    // Mark tutorial as complete in localStorage (for backwards compatibility)
    if (storageKey) {
      localStorage.setItem(storageKey, 'true')
    }
    
    // Mark tutorial as complete in database
    try {
      await fetch('/api/tutorial/complete', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Error marking tutorial as complete:', error)
      // Continue even if API call fails
    }
    
    onComplete()
  }

  const handleSkip = async () => {
    // Mark tutorial as complete in localStorage (for backwards compatibility)
    if (storageKey) {
      localStorage.setItem(storageKey, 'true')
    }
    
    // Mark tutorial as complete in database (even if skipped)
    try {
      await fetch('/api/tutorial/complete', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Error marking tutorial as complete:', error)
      // Continue even if API call fails
    }
    
    onSkip()
  }

  if (!step || !targetRect) {
    return null
  }

  // Calculate card position based on step position preference
  // Ensures card is always outside the target element's bounds
  const getCardPosition = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }
    
    const padding = 30 // Increased padding for better separation
    const cardWidth = 500
    const cardHeight = 300
    const viewportWidth = viewportSize.width || window.innerWidth
    const viewportHeight = viewportSize.height || window.innerHeight
    
    // Helper to clamp values within viewport bounds
    const clampLeft = (left: number) => Math.max(padding, Math.min(left, viewportWidth - cardWidth - padding))
    const clampTop = (top: number) => Math.max(padding, Math.min(top, viewportHeight - cardHeight - padding))
    
    // Helper to check if card overlaps with target
    const checkOverlap = (cardTop: number, cardLeft: number) => {
      const cardRight = cardLeft + cardWidth
      const cardBottom = cardTop + cardHeight
      
      return !(
        cardRight < targetRect.left - padding ||
        cardLeft > targetRect.right + padding ||
        cardBottom < targetRect.top - padding ||
        cardTop > targetRect.bottom + padding
      )
    }
    
    switch (step.position) {
      case 'top': {
        let top = targetRect.top - cardHeight - padding
        let left = clampLeft(targetRect.left + (targetRect.width / 2) - (cardWidth / 2))
        
        // Ensure no overlap
        if (checkOverlap(top, left)) {
          top = targetRect.top - cardHeight - padding - 10
        }
        
        // If card would be above viewport, position it below instead
        if (top < padding) {
          top = targetRect.bottom + padding
          left = clampLeft(targetRect.left + (targetRect.width / 2) - (cardWidth / 2))
          // Ensure still no overlap when repositioned
          if (checkOverlap(top, left)) {
            top = targetRect.bottom + padding + 10
          }
          return {
            top: `${clampTop(top)}px`,
            left: `${left}px`,
          }
        }
        return {
          top: `${clampTop(top)}px`,
          left: `${left}px`,
        }
      }
      case 'bottom': {
        let top = targetRect.bottom + padding
        let left = clampLeft(targetRect.left + (targetRect.width / 2) - (cardWidth / 2))
        
        // Ensure no overlap
        if (checkOverlap(top, left)) {
          top = targetRect.bottom + padding + 10
        }
        
        // If card would be below viewport, position it above instead
        if (top + cardHeight > viewportHeight - padding) {
          top = targetRect.top - cardHeight - padding
          left = clampLeft(targetRect.left + (targetRect.width / 2) - (cardWidth / 2))
          // Ensure still no overlap when repositioned
          if (checkOverlap(top, left)) {
            top = targetRect.top - cardHeight - padding - 10
          }
          return {
            top: `${clampTop(top)}px`,
            left: `${left}px`,
          }
        }
        return {
          top: `${clampTop(top)}px`,
          left: `${left}px`,
        }
      }
      case 'left': {
        let left = targetRect.left - cardWidth - padding
        let top = clampTop(targetRect.top + (targetRect.height / 2) - (cardHeight / 2))
        
        // Ensure no overlap
        if (checkOverlap(top, left)) {
          left = targetRect.left - cardWidth - padding - 10
        }
        
        // If card would be off left edge, position it to the right instead
        if (left < padding) {
          left = targetRect.right + padding
          top = clampTop(targetRect.top + (targetRect.height / 2) - (cardHeight / 2))
          // Ensure still no overlap when repositioned
          if (checkOverlap(top, left)) {
            left = targetRect.right + padding + 10
          }
          return {
            top: `${top}px`,
            left: `${clampLeft(left)}px`,
          }
        }
        return {
          top: `${top}px`,
          left: `${clampLeft(left)}px`,
        }
      }
      case 'right': {
        let left = targetRect.right + padding
        let top = clampTop(targetRect.top + (targetRect.height / 2) - (cardHeight / 2))
        
        // Ensure no overlap
        if (checkOverlap(top, left)) {
          left = targetRect.right + padding + 10
        }
        
        // If card would be off right edge, position it to the left instead
        if (left + cardWidth > viewportWidth - padding) {
          left = targetRect.left - cardWidth - padding
          top = clampTop(targetRect.top + (targetRect.height / 2) - (cardHeight / 2))
          // Ensure still no overlap when repositioned
          if (checkOverlap(top, left)) {
            left = targetRect.left - cardWidth - padding - 10
          }
          return {
            top: `${top}px`,
            left: `${clampLeft(left)}px`,
          }
        }
        return {
          top: `${top}px`,
          left: `${clampLeft(left)}px`,
        }
      }
      case 'center':
      default: {
        // For center, position outside the target area - prefer bottom right
        let left = targetRect.right + padding
        let top = targetRect.bottom + padding
        
        // If doesn't fit, try other positions
        if (left + cardWidth > viewportWidth - padding) {
          left = targetRect.left - cardWidth - padding
          if (left < padding) {
            // Center horizontally if both sides don't work
            left = Math.max(padding, (viewportWidth - cardWidth) / 2)
            top = targetRect.bottom + padding
          }
        }
        
        if (top + cardHeight > viewportHeight - padding) {
          top = targetRect.top - cardHeight - padding
          if (top < padding) {
            top = Math.max(padding, (viewportHeight - cardHeight) / 2)
          }
        }
        
        return {
          top: `${clampTop(top)}px`,
          left: `${clampLeft(left)}px`,
        }
      }
    }
  }

  const cardPosition = getCardPosition()

  return (
    <>
      {/* Dark overlay with spotlight cutout - using multiple divs for better performance */}
      {targetRect && (
        <>
          {/* Top dimmed area - covers everything above the target */}
          <div
            className="fixed z-[99998] bg-black/70 pointer-events-auto transition-all duration-300"
            onClick={handleSkip}
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: `${Math.max(0, targetRect.top - 8)}px`,
            }}
          />
          {/* Bottom dimmed area - covers everything below the target */}
          <div
            className="fixed z-[99998] bg-black/70 pointer-events-auto transition-all duration-300"
            onClick={handleSkip}
            style={{
              top: `${targetRect.bottom + 8}px`,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left dimmed area - covers everything to the left of the target */}
          <div
            className="fixed z-[99998] bg-black/70 pointer-events-auto transition-all duration-300"
            onClick={handleSkip}
            style={{
              top: `${Math.max(0, targetRect.top - 8)}px`,
              left: 0,
              width: `${Math.max(0, targetRect.left - 8)}px`,
              height: `${targetRect.height + 16}px`,
            }}
          />
          {/* Right dimmed area - covers everything to the right of the target */}
          <div
            className="fixed z-[99998] bg-black/70 pointer-events-auto transition-all duration-300"
            onClick={handleSkip}
            style={{
              top: `${Math.max(0, targetRect.top - 8)}px`,
              left: `${targetRect.right + 8}px`,
              right: 0,
              height: `${targetRect.height + 16}px`,
            }}
          />
        </>
      )}
      
      {/* Spotlight highlight border - positioned above overlay */}
      {targetRect && (
        <div
          ref={spotlightRef}
          className="fixed z-[99999] pointer-events-none transition-all duration-300"
          style={{
            top: `${Math.max(0, targetRect.top - 8)}px`,
            left: `${Math.max(0, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
            borderRadius: '0.75rem',
            border: '4px solid',
            borderColor: 'hsl(var(--primary))',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.2)',
          }}
        />
      )}

      {/* Tutorial Card */}
      <div
        className="fixed z-[99999] bg-card rounded-2xl cartoon-border cartoon-shadow-lg p-6 pointer-events-auto"
        style={{
          ...cardPosition,
          position: 'fixed',
          width: Math.min(500, viewportSize.width - 40) + 'px',
          maxWidth: '90vw',
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
            <X className="h-4 w-4 text-foreground" strokeWidth={3} />
          </Button>
        </div>

        <h3 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
          {step.title}
        </h3>
        <p className="text-base text-muted-foreground font-bold mb-6 leading-relaxed whitespace-normal break-words" style={{ lineHeight: '1.6' }}>
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
            <Button
              onClick={handleSkip}
              className="bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold border-4 border-slate-600/50 hover:border-slate-500/50 cartoon-border cartoon-shadow cartoon-hover"
            >
              Skip Tutorial
            </Button>
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

