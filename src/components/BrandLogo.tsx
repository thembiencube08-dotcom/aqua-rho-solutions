/**
 * AquaRho Solutions brand logo.
 *
 * Exact brand palette (from official SVG asset):
 *   #0D3349  Deep navy   — "Aqua", SOLUTIONS, rules, outer arc
 *   #C93917  Red-orange  — "Rho"
 *   #4EA3CA  Aqua blue   — inner arc
 */
import React from 'react'

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'horizontal' | 'mark-only'
  className?: string
  onClick?: () => void
}

// Scale multipliers per size
const SCALE: Record<string, number> = { sm: 1, md: 1.3, lg: 1.75 }

export default function BrandLogo({
  size = 'sm',
  variant = 'full',
  className = '',
  onClick,
}: BrandLogoProps) {
  const s = SCALE[size] ?? 1
  const idPrefix = React.useId().replace(/:/g, '')

  // Sizes derived from the native 280×90 viewBox
  const arcW  = Math.round(154 * s)   // arc crest width
  const arcH  = Math.round(32 * s)    // arc crest height
  const wordH = Math.round(46 * s)    // wordmark height (AquaRho text)
  const wordSize = Math.round(38 * s) // font-size in px (visual estimate)
  const subSize  = Math.round(10 * s) // SOLUTIONS font-size
  const ruleW    = Math.round(24 * s) // width of flanking rules

  const showSub = variant === 'full'

  return (
    <div
      className={`aquarho-brand-lockup aquarho-brand-${size} aquarho-brand-${variant} ${className}`}
      onClick={onClick}
      style={{
        cursor:       onClick ? 'pointer' : 'default',
        display:      'inline-flex',
        flexDirection: 'column',
        alignItems:   'flex-start',
        userSelect:   'none',
        lineHeight:   1,
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="AquaRho Solutions"
    >
      {/* ── Arc crest SVG ─────────────────────────────────────────── */}
      <svg
        width={arcW}
        height={arcH}
        viewBox="0 0 154 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'block', flexShrink: 0 }}
      >
        {/* Outer arc — deep navy, from the official SVG */}
        <path
          d="M 1 30 C 17 28, 33 5, 64 2 C 80 1, 93 11, 103 22"
          stroke="#0D3349"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner arc — aqua blue */}
        <path
          d="M 11 30 C 26 25, 40 10, 68 7 C 83 6, 96 14, 103 25"
          stroke="#4EA3CA"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Gradient defs kept for future use — arcs are flat color per brand spec */}
        <defs>
          <linearGradient id={`${idPrefix}-unused`} />
        </defs>
      </svg>

      {/* ── Wordmark: AquaRho ──────────────────────────────────────── */}
      <div
        style={{
          display:    'flex',
          alignItems: 'baseline',
          height:     wordH,
          marginTop:  Math.round(-6 * s),
        }}
      >
        <span
          style={{
            fontFamily:    "'Montserrat', 'Plus Jakarta Sans', 'Geist', system-ui, sans-serif",
            fontSize:      wordSize,
            fontWeight:    800,
            color:         '#0D3349',
            letterSpacing: '-0.03em',
            lineHeight:    1,
          }}
        >
          Aqua
        </span>
        <span
          style={{
            fontFamily:    "'Montserrat', 'Plus Jakarta Sans', 'Geist', system-ui, sans-serif",
            fontSize:      wordSize,
            fontWeight:    800,
            color:         '#C93917',
            letterSpacing: '-0.03em',
            lineHeight:    1,
          }}
        >
          Rho
        </span>
      </div>

      {/* ── SOLUTIONS + flanking rules (full variant only) ─────────── */}
      {showSub && (
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        Math.round(5 * s),
            marginTop:  Math.round(4 * s),
            width:      '100%',
          }}
        >
          <div style={{ height: 1.5, width: ruleW, background: '#0D3349', opacity: 0.55, flexShrink: 0 }} />
          <span
            style={{
              fontFamily:    "'Montserrat', 'Plus Jakarta Sans', 'Geist', system-ui, sans-serif",
              fontSize:      subSize,
              fontWeight:    700,
              letterSpacing: '0.30em',
              color:         '#0D3349',
              textTransform: 'uppercase',
              whiteSpace:    'nowrap',
            }}
          >
            SOLUTIONS
          </span>
          <div style={{ height: 1.5, flex: 1, background: '#0D3349', opacity: 0.55 }} />
        </div>
      )}
    </div>
  )
}

/**
 * Arc-only mark for favicon / small icon contexts.
 */
export function AquaRhoMark({
  size = 36,
  withBackdrop = false,
  className = '',
}: {
  size?: number
  withBackdrop?: boolean
  className?: string
}) {
  return (
    <svg
      width={size * 3}
      height={size}
      viewBox="0 0 180 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`aquarho-arc-mark ${className}`}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {withBackdrop && <rect width="180" height="60" rx="10" fill="white" />}
      <path
        d="M 4 54 C 28 50, 55 10, 110 5 C 135 3, 158 18, 175 32"
        stroke="#0D3349"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 22 54 C 46 46, 68 16, 115 12 C 138 10, 160 22, 175 36"
        stroke="#4EA3CA"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
