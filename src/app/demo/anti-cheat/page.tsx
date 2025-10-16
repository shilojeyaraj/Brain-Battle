'use client'

import { useState, useEffect } from 'react'
import { useAntiCheat, CheatEvent } from '@/hooks/use-anti-cheat'
import { CheatAlertContainer, CheatAlertData } from '@/components/multiplayer/cheat-alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff, AlertTriangle, Clock, TestTube } from 'lucide-react'

export default function AntiCheatDemoPage() {
  const [isGameActive, setIsGameActive] = useState(false)
  const [cheatAlerts, setCheatAlerts] = useState<CheatAlertData[]>([])
  const [detectedEvents, setDetectedEvents] = useState<CheatEvent[]>([])
  const [awayTime, setAwayTime] = useState(0)

  // Anti-cheat hook
  const { isAway } = useAntiCheat({
    isGameActive,
    thresholdMs: 2500,
    onCheatDetected: (event) => {
      console.log('Cheat detected:', event)
      setDetectedEvents(prev => [...prev, event])
      
      // Create a mock alert for demo purposes
      const mockAlert: CheatAlertData = {
        user_id: 'demo-user',
        display_name: 'Demo Player',
        violation_type: event.type,
        duration_seconds: Math.round(event.duration / 1000),
        timestamp: new Date().toISOString()
      }
      
      setCheatAlerts(prev => [...prev, mockAlert])
    }
  })

  // Track away time for demo
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isAway) {
      interval = setInterval(() => {
        setAwayTime(prev => prev + 100)
      }, 100)
    } else {
      setAwayTime(0)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isAway])

  const handleAlertDismiss = (index: number) => {
    setCheatAlerts(prev => prev.filter((_, i) => i !== index))
  }

  const clearEvents = () => {
    setDetectedEvents([])
    setCheatAlerts([])
  }

  const simulateCheat = () => {
    const mockEvent: CheatEvent = {
      type: 'tab_switch',
      duration: 3000,
      timestamp: Date.now()
    }
    
    const mockAlert: CheatAlertData = {
      user_id: 'demo-user',
      display_name: 'Demo Player',
      violation_type: 'tab_switch',
      duration_seconds: 3,
      timestamp: new Date().toISOString()
    }
    
    setDetectedEvents(prev => [...prev, mockEvent])
    setCheatAlerts(prev => [...prev, mockAlert])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Cheat Alert Container */}
      <CheatAlertContainer 
        alerts={cheatAlerts}
        onAlertDismiss={handleAlertDismiss}
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <TestTube className="h-8 w-8 text-indigo-600" />
            Anti-Cheat System Demo
          </h1>
          <p className="text-gray-600">
            Test the anti-cheat detection system. Toggle game mode and try switching tabs or opening new windows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Controls */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Controls
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Game Active:</span>
                <Badge className={isGameActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {isGameActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Detection Status:</span>
                <div className="flex items-center gap-2">
                  {isAway ? (
                    <>
                      <EyeOff className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 font-medium">Away ({Math.round(awayTime / 1000)}s)</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">Present</span>
                    </>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={() => setIsGameActive(!isGameActive)}
                className={isGameActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {isGameActive ? "Stop Game" : "Start Game"}
              </Button>
              
              <Button 
                onClick={simulateCheat}
                variant="outline"
                className="w-full"
              >
                Simulate Cheat Event
              </Button>
              
              <Button 
                onClick={clearEvents}
                variant="outline"
                className="w-full"
              >
                Clear Events
              </Button>
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              How to Test
            </h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium">Start the game</p>
                  <p className="text-gray-600">Click "Start Game" to activate anti-cheat monitoring</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">2</span>
                </div>
                <div>
                  <p className="font-medium">Switch tabs or windows</p>
                  <p className="text-gray-600">Try switching to another tab or opening a new window for 2.5+ seconds</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">3</span>
                </div>
                <div>
                  <p className="font-medium">Observe detection</p>
                  <p className="text-gray-600">Watch for cheat alerts and detection events below</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Detection Events */}
        <Card className="p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Detection Events ({detectedEvents.length})</h2>
          
          {detectedEvents.length === 0 ? (
            <p className="text-gray-500 italic">No cheat events detected yet. Try switching tabs when the game is active!</p>
          ) : (
            <div className="space-y-3">
              {detectedEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">
                        {event.type.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-sm text-red-600">
                        Duration: {Math.round(event.duration / 1000)}s
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
