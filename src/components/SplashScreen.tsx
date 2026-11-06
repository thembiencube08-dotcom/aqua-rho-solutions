import { useEffect, useState } from 'react'
import BrandLogo from './BrandLogo'

interface Props {
  onDone: () => void
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'fill' | 'ready' | 'exit'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fill'),   400)
    const t2 = setTimeout(() => setPhase('ready'),  2200)
    const t3 = setTimeout(() => handleExit(),       3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleExit() {
    setPhase('exit')
    setTimeout(onDone, 420)
  }

  return (
    <div
      className={`splash-root splash-${phase}`}
      onClick={phase === 'ready' ? handleExit : undefined}
    >
      {/* Decorative background rings — tinted with brand colors */}
      <div className="splash-ring splash-ring-1" />
      <div className="splash-ring splash-ring-2" />
      <div className="splash-ring splash-ring-3" />

      {/* Centre card */}
      <div className="splash-card">

        {/* Full-color logo — displayed at native colors on white background */}
        <div className="splash-logo">
          <BrandLogo size="lg" variant="full" />
        </div>

        {/* Tagline */}
        <p className="splash-tagline">
          Intelligent water management for every source.
        </p>

        {/* Water-fill progress bar */}
        <div className="splash-progress-track" role="progressbar" aria-label="Loading">
          <div
            className={`splash-progress-fill ${
              phase === 'fill' || phase === 'ready' ? 'splash-progress-fill--run' : ''
            }`}
          />
          <div className="splash-progress-wave" />
        </div>

        {/* Get Started — fades in when ready */}
        <button
          className={`splash-cta ${phase === 'ready' ? 'splash-cta--visible' : ''}`}
          onClick={handleExit}
          aria-label="Enter AquaRho Solutions"
        >
          Get Started →
        </button>

        {/* Version pill */}
        <span className="splash-version">v0.1 · Water Intelligence Platform</span>
      </div>
    </div>
  )
}
