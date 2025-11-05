# Tutorial System

A user-friendly onboarding tutorial system that guides new users through the application with interactive popup cards.

## Features

- ✨ Spotlight highlighting - Highlights specific UI elements
- 📱 Responsive positioning - Cards position intelligently around elements
- 🎯 Step-by-step guidance - Walks users through key features
- 💾 Progress tracking - Remembers if user completed tutorial
- ⏭️ Skip option - Users can exit at any time
- 🔄 Restart option - Users can restart tutorial from settings

## Usage

### Basic Tutorial

```tsx
import { DashboardTutorial } from '@/components/tutorial/dashboard-tutorial'

export default function DashboardPage() {
  return (
    <div>
      <DashboardTutorial />
      {/* Your page content */}
    </div>
  )
}
```

### Custom Tutorial

```tsx
import { TutorialOverlay, TutorialStep } from '@/components/tutorial/tutorial-overlay'

const steps: TutorialStep[] = [
  {
    id: 'step1',
    title: 'Welcome!',
    description: 'This is your first step.',
    targetSelector: '[data-tutorial="my-element"]',
    position: 'bottom',
  },
]

<TutorialOverlay
  steps={steps}
  onComplete={() => console.log('Done!')}
  onSkip={() => console.log('Skipped')}
  storageKey="my_tutorial_completed"
/>
```

## Tutorial Steps

Each step requires:
- `id`: Unique identifier
- `title`: Card title
- `description`: Explanation text
- `targetSelector`: CSS selector for element to highlight
- `position`: Card position (`top`, `bottom`, `left`, `right`, `center`)
- `showSkip`: Optional - show skip button

## Adding Tutorial Targets

Add `data-tutorial` attributes to elements you want to highlight:

```tsx
<button data-tutorial="create-lobby-button">
  Create Lobby
</button>
```

## Storage

Tutorial completion is stored in `localStorage` with the key specified in `storageKey`. To restart:
- Click Settings button in dashboard header, or
- Clear localStorage: `localStorage.removeItem('dashboard_tutorial_completed')`

