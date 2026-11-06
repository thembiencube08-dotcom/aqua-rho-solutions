import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEnvelope, faLock, faEye, faEyeSlash,
  faRightToBracket, faUserSecret,
} from '@fortawesome/free-solid-svg-icons'
import BrandLogo from '../components/BrandLogo'
import {
  login, createSession, createGuestSession,
  AUTH_ERROR_MESSAGES, type Session,
} from '../lib/auth'

interface Props {
  onAuth:     (session: Session) => void
  onGoSignUp: () => void
}

export default function LoginPage({ onAuth, onGoSignUp }: Props) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(email, password)
      if (!result.ok) {
        setError(AUTH_ERROR_MESSAGES[result.error])
      } else {
        onAuth(createSession(result.account))
      }
    } finally {
      setLoading(false)
    }
  }

  function handleGuest() {
    onAuth(createGuestSession())
  }

  return (
    <div className="auth-shell">
      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <BrandLogo size="lg" variant="full" />
          </div>
          <h1 className="auth-brand-headline">
            Smart water management for every source.
          </h1>
          <p className="auth-brand-sub">
            Monitor water quality, track treatment needs, manage utility balances,
            and get AI-powered insights — all in one place.
          </p>
          <div className="auth-feature-list">
            {[
              'WHO-standard water quality assessment',
              'Treatment train designer with dosing',
              'IWA utility water balance (NRW)',
              'Weather, news and interactive site map',
            ].map((f) => (
              <div key={f} className="auth-feature-item">
                <span className="auth-feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="auth-brand-footer">
          © {new Date().getFullYear()} AquaRho Solutions · Water Intelligence Platform
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          {/* Mobile logo (hidden on desktop) */}
          <div className="auth-mobile-logo">
            <BrandLogo size="md" variant="full" />
          </div>

          <div className="auth-form-header">
            <h2 className="auth-form-title">Welcome back</h2>
            <p className="auth-form-sub">Sign in to your AquaRho account.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="auth-form">
            {/* Email */}
            <div className="auth-field">
              <label htmlFor="login-email">Email address</label>
              <div className="auth-input-wrap">
                <FontAwesomeIcon icon={faEnvelope} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  placeholder="you@example.com"
                  className="auth-input auth-input--icon"
                  required
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="login-password">Password</label>
              </div>
              <div className="auth-input-wrap">
                <FontAwesomeIcon icon={faLock} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  className="auth-input auth-input--icon auth-input--pw"
                  required
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p id="login-error" className="auth-error" role="alert">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn auth-submit-btn"
              disabled={loading || !email || !password}
            >
              {loading ? (
                'Signing in…'
              ) : (
                <><FontAwesomeIcon icon={faRightToBracket} /> Sign In</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Guest */}
          <button
            type="button"
            className="btn ghost auth-guest-btn"
            onClick={handleGuest}
          >
            <FontAwesomeIcon icon={faUserSecret} />
            Continue as Guest
          </button>

          {/* Sign up link */}
          <p className="auth-switch-text">
            Don't have an account?{' '}
            <button type="button" className="auth-link" onClick={onGoSignUp}>
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
