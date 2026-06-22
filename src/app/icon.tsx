import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Identical gradient IDs and stops as AccessShieldLogo.tsx */}
            <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Shield body — same dark fill as AccessShieldLogo fillGrad */}
          <path
            d="M50 8 L86 21 V48 C86 70 71 88 50 94 C29 88 14 70 14 48 V21 L50 8 Z"
            fill="#1a1740"
          />

          {/* Shield stroke — exact same path & stroke as AccessShieldLogo */}
          <path
            d="M50 8 L86 21 V48 C86 70 71 88 50 94 C29 88 14 70 14 48 V21 L50 8 Z"
            fill="none"
            stroke="url(#shieldGrad)"
            strokeWidth="6.5"
            strokeLinejoin="round"
          />

          {/* Letter A — EXACT same path as AccessShieldLogo.tsx */}
          <path
            d="M50 22 L72 73 H60.5 L56 59 C57.5 57 58.5 54.5 58.5 52 C58.5 47.3 54.7 43.5 50 43.5 C45.3 43.5 41.5 47.3 41.5 52 C41.5 54.5 42.5 57 44 59 L39.5 73 H28 L50 22 Z"
            fill="url(#shieldGrad)"
          />

          <circle cx="50" cy="52" r="5" fill="#1a1740" />
          <polygon points="47.5,52 52.5,52 54,67 46,67" fill="#1a1740" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
