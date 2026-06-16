import React from 'react'

interface AccessShieldLogoProps {
  className?: string
  iconSize?: number | string
  showText?: boolean
  textClassName?: string
}

export function AccessShieldLogo({
  className = '',
  iconSize = 36,
  showText = false,
  textClassName = '',
}: AccessShieldLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform group-hover:scale-105 duration-200"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" /> {/* Purple */}
            <stop offset="50%" stopColor="#6366f1" /> {/* Indigo */}
            <stop offset="100%" stopColor="#3b82f6" /> {/* Blue */}
          </linearGradient>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
          </linearGradient>
          <mask id="keyholeMask">
            {/* White keeps the underlying shape */}
            <rect x="0" y="0" width="100" height="100" fill="white" />
            {/* Black cuts a hole out of the shape */}
            <circle cx="50" cy="52" r="5" fill="black" />
            <polygon points="47.5,52 52.5,52 54,67 46,67" fill="black" />
          </mask>
        </defs>

        {/* Outer Shield */}
        <path
          d="M50 8 L86 21 V48 C86 70 71 88 50 94 C29 88 14 70 14 48 V21 L50 8 Z"
          stroke="url(#shieldGrad)"
          strokeWidth="6.5"
          strokeLinejoin="round"
          fill="url(#fillGrad)"
        />

        {/* Letter A with keyhole mask */}
        <path
          d="M50 22 L72 73 H60.5 L56 59 C57.5 57 58.5 54.5 58.5 52 C58.5 47.3 54.7 43.5 50 43.5 C45.3 43.5 41.5 47.3 41.5 52 C41.5 54.5 42.5 57 44 59 L39.5 73 H28 L50 22 Z"
          fill="url(#shieldGrad)"
          mask="url(#keyholeMask)"
        />
      </svg>

      {showText && (
        <span className={`text-xl font-bold tracking-tight text-white transition-colors ${textClassName}`}>
          Access<span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">Shield</span>
        </span>
      )}
    </div>
  )
}
