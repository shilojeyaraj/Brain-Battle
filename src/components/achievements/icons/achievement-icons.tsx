export type AchievementIconProps = {
  size?: number
  className?: string
}

// Win-Based Achievement Icons

export function FirstVictoryIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 20L72 44H96L76 58L84 82L64 68L44 82L52 58L32 44H56L64 20Z"
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="3"
      />
      <rect x="58" y="68" width="12" height="32" fill="#94a3b8" stroke="#475569" strokeWidth="3" />
      <path d="M48 100H80L76 110H52L48 100Z" fill="#94a3b8" stroke="#475569" strokeWidth="3" />
    </svg>
  )
}

export function DecadeWarriorIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 20L72 44H96L76 58L84 82L64 68L44 82L52 58L32 44H56L64 20Z"
        fill="#60a5fa"
        stroke="#2563eb"
        strokeWidth="3"
      />
      <rect x="58" y="68" width="12" height="32" fill="#60a5fa" stroke="#2563eb" strokeWidth="3" />
      <path d="M48 100H80L76 110H52L48 100Z" fill="#60a5fa" stroke="#2563eb" strokeWidth="3" />
      <text x="64" y="55" fontSize="20" fontWeight="bold" fill="#1e40af" textAnchor="middle">
        10
      </text>
    </svg>
  )
}

export function CenturyChampionIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 25C50 25 40 35 40 45C40 55 50 60 64 70C78 60 88 55 88 45C88 35 78 25 64 25Z"
        fill="#a855f7"
        stroke="#7c3aed"
        strokeWidth="3"
      />
      <path d="M44 42L38 50L42 52L48 44L44 42Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <path d="M84 42L90 50L86 52L80 44L84 42Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <path d="M34 50L28 62L32 64L38 52L34 50Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <path d="M94 50L100 62L96 64L90 52L94 50Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <rect x="56" y="62" width="16" height="8" rx="4" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <path d="M50 70H78L74 100H54L50 70Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <text x="64" y="92" fontSize="16" fontWeight="bold" fill="#581c87" textAnchor="middle">
        100
      </text>
    </svg>
  )
}

export function UndefeatedIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 20L90 35V65C90 85 64 100 64 100C64 100 38 85 38 65V35L64 20Z"
        fill="#60a5fa"
        stroke="#2563eb"
        strokeWidth="3"
      />
      <path d="M52 60L60 68L76 48" stroke="#1e40af" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function UnbeatableIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 25C50 25 40 35 40 45C40 55 50 60 64 70C78 60 88 55 88 45C88 35 78 25 64 25Z"
        fill="#a855f7"
        stroke="#7c3aed"
        strokeWidth="3"
      />
      <path d="M44 42L38 50L42 52L48 44L44 42Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <path d="M84 42L90 50L86 52L80 44L84 42Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <path d="M34 50L28 62L32 64L38 52L34 50Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <path d="M94 50L100 62L96 64L90 52L94 50Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <circle cx="50" cy="55" r="4" fill="#fbbf24" />
      <circle cx="64" cy="48" r="4" fill="#fbbf24" />
      <circle cx="78" cy="55" r="4" fill="#fbbf24" />
    </svg>
  )
}

// Streak-Based Achievement Icons

export function ConsistencyStarterIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 90C64 90 50 75 50 60C50 45 64 30 64 30C64 30 78 45 78 60C78 75 64 90 64 90Z"
        fill="url(#flame-gray)"
        stroke="#475569"
        strokeWidth="3"
      />
      <defs>
        <linearGradient id="flame-gray" x1="64" y1="30" x2="64" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function WeekWarriorIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 85C64 85 52 72 52 60C52 48 64 35 64 35C64 35 76 48 76 60C76 72 64 85 64 85Z"
        fill="url(#flame-blue)"
        stroke="#2563eb"
        strokeWidth="3"
      />
      <path d="M64 70C64 70 58 64 58 58C58 52 64 46 64 46C64 46 70 52 70 58C70 64 64 70 64 70Z" fill="#fbbf24" />
      <text x="64" y="105" fontSize="16" fontWeight="bold" fill="#1e40af" textAnchor="middle">
        7
      </text>
      <defs>
        <linearGradient id="flame-blue" x1="64" y1="35" x2="64" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function FortnightFighterIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 85C64 85 52 72 52 60C52 48 64 35 64 35C64 35 76 48 76 60C76 72 64 85 64 85Z"
        fill="url(#flame-blue2)"
        stroke="#2563eb"
        strokeWidth="3"
      />
      <path d="M64 70C64 70 58 64 58 58C58 52 64 46 64 46C64 46 70 52 70 58C70 64 64 70 64 70Z" fill="#fbbf24" />
      <text x="64" y="105" fontSize="16" fontWeight="bold" fill="#1e40af" textAnchor="middle">
        14
      </text>
      <defs>
        <linearGradient id="flame-blue2" x1="64" y1="35" x2="64" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function MonthlyMasterIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 80C64 80 50 68 50 55C50 42 64 30 64 30C64 30 78 42 78 55C78 68 64 80 64 80Z"
        fill="url(#flame-purple)"
        stroke="#7c3aed"
        strokeWidth="3"
      />
      <path d="M64 66C64 66 56 60 56 53C56 46 64 40 64 40C64 40 72 46 72 53C72 60 64 66 64 66Z" fill="#fbbf24" />
      <path d="M64 56C64 56 60 52 60 48C60 44 64 40 64 40C64 40 68 44 68 48C68 52 64 56 64 56Z" fill="#fef3c7" />
      <text x="64" y="100" fontSize="16" fontWeight="bold" fill="#581c87" textAnchor="middle">
        30
      </text>
      <defs>
        <linearGradient id="flame-purple" x1="64" y1="30" x2="64" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function CenturionIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 75C64 75 48 64 48 50C48 36 64 25 64 25C64 25 80 36 80 50C80 64 64 75 64 75Z"
        fill="url(#flame-legendary)"
        stroke="#ea580c"
        strokeWidth="3"
      />
      <path d="M64 62C64 62 54 56 54 48C54 40 64 34 64 34C64 34 74 40 74 48C74 56 64 62 64 62Z" fill="#fbbf24" />
      <path d="M64 52C64 52 58 48 58 43C58 38 64 34 64 34C64 34 70 38 70 43C70 48 64 52 64 52Z" fill="#fef3c7" />
      <circle cx="48" cy="42" r="3" fill="#fbbf24" />
      <circle cx="80" cy="42" r="3" fill="#fbbf24" />
      <circle cx="40" cy="54" r="3" fill="#fbbf24" />
      <circle cx="88" cy="54" r="3" fill="#fbbf24" />
      <text x="64" y="95" fontSize="14" fontWeight="bold" fill="#9a3412" textAnchor="middle">
        100
      </text>
      <defs>
        <linearGradient id="flame-legendary" x1="64" y1="25" x2="64" y2="75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Accuracy-Based Achievement Icons

export function SharpShooterIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="64" cy="64" r="35" fill="none" stroke="#60a5fa" strokeWidth="3" />
      <circle cx="64" cy="64" r="25" fill="none" stroke="#60a5fa" strokeWidth="3" />
      <circle cx="64" cy="64" r="15" fill="none" stroke="#60a5fa" strokeWidth="3" />
      <circle cx="64" cy="64" r="6" fill="#2563eb" />
      <path d="M64 30L70 50L64 64L58 50L64 30Z" fill="#1e40af" stroke="#2563eb" strokeWidth="2" />
    </svg>
  )
}

export function MarksmanIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="64" cy="64" r="35" fill="none" stroke="#a855f7" strokeWidth="3" />
      <circle cx="64" cy="64" r="25" fill="none" stroke="#a855f7" strokeWidth="3" />
      <circle cx="64" cy="64" r="15" fill="none" stroke="#a855f7" strokeWidth="3" />
      <circle cx="64" cy="64" r="6" fill="#7c3aed" />
      <path d="M64 30L70 50L64 64L58 50L64 30Z" fill="#581c87" stroke="#7c3aed" strokeWidth="2" />
      <path d="M30 64L50 70L64 64L50 58L30 64Z" fill="#581c87" stroke="#7c3aed" strokeWidth="2" />
      <path d="M98 64L78 70L64 64L78 58L98 64Z" fill="#581c87" stroke="#7c3aed" strokeWidth="2" />
    </svg>
  )
}

export function PerfectScoreIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 30L72 54L96 54L76 68L84 92L64 78L44 92L52 68L32 54L56 54L64 30Z"
        fill="url(#star-purple-gold)"
        stroke="#7c3aed"
        strokeWidth="3"
      />
      <text x="64" y="72" fontSize="16" fontWeight="bold" fill="#581c87" textAnchor="middle">
        100%
      </text>
      <defs>
        <linearGradient id="star-purple-gold" x1="64" y1="30" x2="64" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function PerfectionistIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 25L70 45L90 45L74 56L80 76L64 65L48 76L54 56L38 45L58 45L64 25Z"
        fill="#fbbf24"
        stroke="#ea580c"
        strokeWidth="3"
      />
      <path d="M44 52L48 64L38 72L30 68L32 56L44 52Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="2" />
      <path d="M84 52L80 64L90 72L98 68L96 56L84 52Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="2" />
      <path d="M56 85L60 95L50 100L44 96L46 86L56 85Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="2" />
      <path d="M72 85L68 95L78 100L84 96L82 86L72 85Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="2" />
    </svg>
  )
}

// Activity-Based Achievement Icons

export function KnowledgeSeekerIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M35 40H93C95 40 97 42 97 44V96C97 98 95 100 93 100H35C33 100 31 98 31 96V44C31 42 33 40 35 40Z"
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="3"
      />
      <path d="M35 40L64 55L93 40" fill="none" stroke="#475569" strokeWidth="3" />
      <line x1="45" y1="65" x2="75" y2="65" stroke="#64748b" strokeWidth="2" />
      <line x1="45" y1="75" x2="75" y2="75" stroke="#64748b" strokeWidth="2" />
      <line x1="45" y1="85" x2="60" y2="85" stroke="#64748b" strokeWidth="2" />
    </svg>
  )
}

export function ScholarIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M35 40H93C95 40 97 42 97 44V96C97 98 95 100 93 100H35C33 100 31 98 31 96V44C31 42 33 40 35 40Z"
        fill="#60a5fa"
        stroke="#2563eb"
        strokeWidth="3"
      />
      <path d="M35 40L64 55L93 40" fill="none" stroke="#2563eb" strokeWidth="3" />
      <line x1="45" y1="65" x2="75" y2="65" stroke="#3b82f6" strokeWidth="2" />
      <line x1="45" y1="75" x2="75" y2="75" stroke="#3b82f6" strokeWidth="2" />
      <line x1="45" y1="85" x2="60" y2="85" stroke="#3b82f6" strokeWidth="2" />
      <circle cx="80" cy="35" r="6" fill="#fbbf24" />
      <circle cx="90" cy="50" r="4" fill="#fbbf24" />
      <circle cx="75" cy="50" r="4" fill="#fbbf24" />
    </svg>
  )
}

export function MasterStudentIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M30 55L64 40L98 55L64 70L30 55Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <path d="M64 70V95" stroke="#7c3aed" strokeWidth="3" />
      <path d="M98 55V75C98 85 81 95 64 95C47 95 30 85 30 75V55" fill="none" stroke="#7c3aed" strokeWidth="3" />
      <circle cx="64" cy="95" r="8" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
    </svg>
  )
}

export function QuizMasterIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M35 40H93C95 40 97 42 97 44V96C97 98 95 100 93 100H35C33 100 31 98 31 96V44C31 42 33 40 35 40Z"
        fill="#60a5fa"
        stroke="#2563eb"
        strokeWidth="3"
      />
      <path d="M35 40L64 55L93 40" fill="none" stroke="#2563eb" strokeWidth="3" />
      <path d="M48 70L56 78L76 60" stroke="#1e40af" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DedicatedLearnerIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M30 50H75C77 50 79 52 79 54V96C79 98 77 100 75 100H30C28 100 26 98 26 96V54C26 52 28 50 30 50Z"
        fill="#a855f7"
        stroke="#7c3aed"
        strokeWidth="3"
      />
      <path
        d="M40 60H85C87 60 89 62 89 64V100C89 102 87 104 85 104H40C38 104 36 102 36 100V64C36 62 38 60 40 60Z"
        fill="#a855f7"
        stroke="#7c3aed"
        strokeWidth="3"
      />
      <path
        d="M50 70H95C97 70 99 72 99 74V104C99 106 97 108 95 108H50C48 108 46 106 46 104V74C46 72 48 70 50 70Z"
        fill="#a855f7"
        stroke="#7c3aed"
        strokeWidth="3"
      />
    </svg>
  )
}

// Level-Based Achievement Icons

export function RisingStarIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 35L70 55L90 55L74 66L80 86L64 75L48 86L54 66L38 55L58 55L64 35Z"
        fill="url(#star-gray-gold)"
        stroke="#475569"
        strokeWidth="3"
      />
      <defs>
        <linearGradient id="star-gray-gold" x1="64" y1="35" x2="64" y2="86" gradientUnits="userSpaceOnUse">
          <stop stopColor="#94a3b8" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function ExperiencedIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 30L70 50L90 50L74 61L80 81L64 70L48 81L54 61L38 50L58 50L64 30Z"
        fill="#60a5fa"
        stroke="#2563eb"
        strokeWidth="3"
      />
      <circle cx="64" cy="95" r="12" fill="#60a5fa" stroke="#2563eb" strokeWidth="3" />
      <text x="64" y="100" fontSize="12" fontWeight="bold" fill="#1e40af" textAnchor="middle">
        LV
      </text>
    </svg>
  )
}

export function VeteranIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 25L70 45L90 45L74 56L80 76L64 65L48 76L54 56L38 45L58 45L64 25Z"
        fill="#a855f7"
        stroke="#7c3aed"
        strokeWidth="3"
      />
      <path d="M44 60L48 72L38 80L30 76L32 64L44 60Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
      <path d="M84 60L80 72L90 80L98 76L96 64L84 60Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="2" />
    </svg>
  )
}

export function LegendIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 25C50 25 40 35 40 45C40 55 50 60 64 70C78 60 88 55 88 45C88 35 78 25 64 25Z"
        fill="url(#crown-legendary)"
        stroke="#ea580c"
        strokeWidth="3"
      />
      <path d="M44 42L38 50L42 52L48 44L44 42Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="2" />
      <path d="M84 42L90 50L86 52L80 44L84 42Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="2" />
      <path d="M34 50L28 62L32 64L38 52L34 50Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="2" />
      <path d="M94 50L100 62L96 64L90 52L94 50Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="2" />
      <circle cx="45" cy="50" r="4" fill="#fef3c7" />
      <circle cx="64" cy="45" r="4" fill="#fef3c7" />
      <circle cx="83" cy="50" r="4" fill="#fef3c7" />
      <path
        d="M64 30L70 45L90 45L74 56L80 76L64 65L48 76L54 56L38 45L58 45L64 30Z"
        fill="#fef3c7"
        stroke="#ea580c"
        strokeWidth="2"
        opacity="0.5"
      />
      <defs>
        <linearGradient id="crown-legendary" x1="64" y1="25" x2="64" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Special Achievement Icons

export function FirstStepsIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <ellipse
        cx="50"
        cy="55"
        rx="12"
        ry="18"
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="3"
        transform="rotate(-15 50 55)"
      />
      <ellipse
        cx="70"
        cy="75"
        rx="12"
        ry="18"
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="3"
        transform="rotate(15 70 75)"
      />
      <circle cx="50" cy="45" r="3" fill="#64748b" />
      <circle cx="70" cy="65" r="3" fill="#64748b" />
    </svg>
  )
}

export function SpeedDemonIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M64 30L70 60L90 50L68 70L75 95L64 75L53 95L60 70L38 50L58 60L64 30Z"
        fill="url(#lightning-blue-yellow)"
        stroke="#2563eb"
        strokeWidth="3"
      />
      <defs>
        <linearGradient id="lightning-blue-yellow" x1="64" y1="30" x2="64" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function SocialButterflyIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="50" cy="50" r="16" fill="#60a5fa" stroke="#2563eb" strokeWidth="3" />
      <circle cx="50" cy="44" r="4" fill="#1e40af" />
      <path d="M50 58C48 58 46 60 46 62C46 62 48 64 50 64C52 64 54 62 54 62C54 60 52 58 50 58Z" fill="#1e40af" />
      <circle cx="78" cy="50" r="16" fill="#60a5fa" stroke="#2563eb" strokeWidth="3" />
      <circle cx="78" cy="44" r="4" fill="#1e40af" />
      <path d="M78 58C76 58 74 60 74 62C74 62 76 64 78 64C80 64 82 62 82 62C82 60 80 58 78 58Z" fill="#1e40af" />
      <circle cx="64" cy="70" r="13" fill="#60a5fa" stroke="#2563eb" strokeWidth="3" />
      <circle cx="64" cy="65" r="3" fill="#1e40af" />
      <path d="M64 75C62 75 61 77 61 78C61 78 62 80 64 80C66 80 67 78 67 78C67 77 66 75 64 75Z" fill="#1e40af" />
    </svg>
  )
}

export function TeamPlayerIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="45" cy="45" r="12" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <path d="M45 50C48 50 50 52 50 55V65H40V55C40 52 42 50 45 50Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <circle cx="83" cy="45" r="12" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <path d="M83 50C86 50 88 52 88 55V65H78V55C78 52 80 50 83 50Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <circle cx="64" cy="60" r="12" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <path d="M64 65C67 65 69 67 69 70V80H59V70C59 67 61 65 64 65Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <path
        d="M64 85L70 99L90 99L74 110L80 124L64 113L48 124L54 110L38 99L58 99L64 85Z"
        fill="#a855f7"
        stroke="#7c3aed"
        strokeWidth="2"
      />
    </svg>
  )
}

export function EarlyAdopterIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M54 85L64 30L74 85H54Z" fill="url(#rocket-purple-orange)" stroke="#7c3aed" strokeWidth="3" />
      <path d="M45 85L35 105L64 95L93 105L83 85H45Z" fill="#a855f7" stroke="#7c3aed" strokeWidth="3" />
      <ellipse cx="64" cy="50" rx="6" ry="8" fill="#581c87" />
      <path d="M50 60L45 75H50V60Z" fill="#f97316" />
      <path d="M78 60L83 75H78V60Z" fill="#f97316" />
      <defs>
        <linearGradient id="rocket-purple-orange" x1="64" y1="30" x2="64" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Icon mapping object for easy lookup
export const ACHIEVEMENT_ICONS = {
  "first-victory": FirstVictoryIcon,
  "decade-warrior": DecadeWarriorIcon,
  "century-champion": CenturyChampionIcon,
  undefeated: UndefeatedIcon,
  unbeatable: UnbeatableIcon,
  "consistency-starter": ConsistencyStarterIcon,
  "week-warrior": WeekWarriorIcon,
  "fortnight-fighter": FortnightFighterIcon,
  "monthly-master": MonthlyMasterIcon,
  centurion: CenturionIcon,
  "sharp-shooter": SharpShooterIcon,
  marksman: MarksmanIcon,
  "perfect-score": PerfectScoreIcon,
  perfectionist: PerfectionistIcon,
  "knowledge-seeker": KnowledgeSeekerIcon,
  scholar: ScholarIcon,
  "master-student": MasterStudentIcon,
  "quiz-master": QuizMasterIcon,
  "dedicated-learner": DedicatedLearnerIcon,
  "rising-star": RisingStarIcon,
  experienced: ExperiencedIcon,
  veteran: VeteranIcon,
  legend: LegendIcon,
  "first-steps": FirstStepsIcon,
  "speed-demon": SpeedDemonIcon,
  "social-butterfly": SocialButterflyIcon,
  "team-player": TeamPlayerIcon,
  "early-adopter": EarlyAdopterIcon,
} as const

export type AchievementIconName = keyof typeof ACHIEVEMENT_ICONS

