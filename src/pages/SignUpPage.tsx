import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser, faEnvelope, faLock, faEye, faEyeSlash,
  faUserPlus, faShieldHalved,
} from '@fortawesome/free-solid-svg-icons'
import BrandLogo from '../components/BrandLogo'
import {
  createAccount, createSession,
  AUTH_ERROR_MESSAGES, type Session,
} from '../lib/auth'

interface Props {
  onAuth:     (session: Session) => void
  onGoLogin:  () => void
}

export default function SignUpPage({ onAuth, onGoLogin }: Props) {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [showCf,    setShowCf]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  // Live password strength
  const strength = passwordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await createAccount(name, email, password, confirm)
      if (!result.ok) {
        setError(AUTH_ERROR_MESSAGES[result.error])
      } else {
        onAuth(createSession(result.account))
      }
    } finally {
      setLoading(false)
    }
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
            Join AquaRho Solutions today.
          </h1>
          <p className="auth-brand-sub">
            Your account keeps your water sources, quality assessments, and utility
            data private to you — stored securely in this browser.
          </p>
          <div className="auth-feature-list">
            {[
              'Your data stays in your browser — no cloud sync',
              'Password protected with SHA-256 hashing',
              'First account automatically becomes admin',
              'Switch accounts without losing any data',
            ].map((f) => (
              <div key={f} className="auth-feature-item">
                <span className="auth-feature-dot" />
                {f}
              </div>
            ))}
          </div>
          <div className="auth-security-note">
            <FontAwesomeIcon icon={faShieldHalved} />
            <span>
              Passwords are hashed with SHA-256 and never leave your device.
            </span>
          </div>
        </div>
        <p className="auth-brand-footer">
          © {new Date().getFullYear()} AquaRho Solutions · Water Intelligence Platform
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <BrandLogo size="md" variant="full" />
          </div>

          <div className="auth-form-header">
            <h2 className="auth-form-title">Create your account</h2>
            <p className="auth-form-sub">Free — no email verification required.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="auth-form">
            {/* Full name */}
            <div className="auth-field">
              <label htmlFor="su-name">Full name</label>
              <div className="auth-input-wrap">
                <FontAwesomeIcon icon={faUser} className="auth-input-icon" />
                <input
                  id="su-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null) }}
                  placeholder="Jane Moyo"
                  className="auth-input auth-input--icon"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="su-email">Email address</label>
              <div className="auth-input-wrap">
                <FontAwesomeIcon icon={faEnvelope} className="auth-input-icon" />
                <input
                  id="su-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  placeholder="you@example.com"
                  className="auth-input auth-input--icon"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="su-password">Password</label>
              <div className="auth-input-wrap">
                <FontAwesomeIcon icon={faLock} className="auth-input-icon" />
                <input
                  id="su-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  placeholder="Min. 8 characters"
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
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="auth-strength">
                  <div className="auth-strength-track">
                    <div
                      className={`auth-strength-fill auth-strength-fill--${strength.level}`}
                      style={{ width: `${strength.pct}%` }}
                    />
                  </div>
                  <span className={`auth-strength-label auth-strength-label--${strength.level}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="auth-field">
              <label htmlFor="su-confirm">Confirm password</label>
              <div className="auth-input-wrap">
                <FontAwesomeIcon icon={faLock} className="auth-input-icon" />
                <input
                  id="su-confirm"
                  type={showCf ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                  placeholder="Repeat password"
                  className="auth-input auth-input--icon auth-input--pw"
                  required
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowCf((v) => !v)}
                  aria-label={showCf ? 'Hide password' : 'Show password'}
                >
                  <FontAwesomeIcon icon={showCf ? faEyeSlash : faEye} />
                </button>
              </div>
              {/* Match indicator */}
              {confirm.length > 0 && (
                <p className={`auth-match ${password === confirm ? 'auth-match--ok' : 'auth-match--no'}`}>
                  {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="auth-error" role="alert">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn auth-submit-btn"
              disabled={loading || !name || !email || !password || !confirm}
            >
              {loading ? (
                'Creating account…'
              ) : (
                <><FontAwesomeIcon icon={faUserPlus} /> Create Account</>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="auth-switch-text">
            Already have an account?{' '}
            <button type="button" className="auth-link" onClick={onGoLogin}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Password strength helper ──────────────────────────────────────────────

function passwordStrength(pw: string): { pct: number; level: 'weak' | 'fair' | 'strong'; label: string } {
  if (pw.length === 0) return { pct: 0, level: 'weak', label: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 2) return { pct: 33,  level: 'weak',   label: 'Weak' }
  if (score <= 3) return { pct: 66,  level: 'fair',   label: 'Fair' }
  return              { pct: 100, level: 'strong', label: 'Strong' }
}
