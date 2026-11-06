/**
 * Client-side authentication — localStorage only.
 *
 * ⚠️  This is local-first auth suitable for a single-device personal app.
 *      It provides basic account separation and session persistence, but
 *      it is NOT a substitute for server-side auth in a multi-user or
 *      production environment. Password hashes never leave the browser.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface Account {
  id: string
  name: string
  email: string          // stored lowercase
  passwordHash: string   // hex SHA-256
  createdAt: string      // ISO date
  role: 'admin' | 'user'
}

export interface Session {
  accountId: string
  name: string
  email: string
  role: 'admin' | 'user'
  loginAt: string        // ISO date
  isGuest: boolean
}

export type AuthError =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'EMAIL_INVALID'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORDS_DO_NOT_MATCH'
  | 'NAME_REQUIRED'

// ── Storage keys ───────────────────────────────────────────────────────────

const ACCOUNTS_KEY = 'aquarho.accounts'
const SESSION_KEY  = 'aquarho.session'

// ── SHA-256 via Web Crypto ─────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  // Pepper keeps hashes app-specific even if localStorage is dumped
  const data   = encoder.encode('aquarho:' + password)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Account CRUD ───────────────────────────────────────────────────────────

function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    return raw ? (JSON.parse(raw) as Account[]) : []
  } catch {
    return []
  }
}

function saveAccounts(accounts: Account[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function getAccounts(): Account[] {
  return loadAccounts()
}

export async function createAccount(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): Promise<{ ok: true; account: Account } | { ok: false; error: AuthError }> {
  // Validation
  if (!name.trim())
    return { ok: false, error: 'NAME_REQUIRED' }
  if (!isValidEmail(email))
    return { ok: false, error: 'EMAIL_INVALID' }
  if (password.length < 8)
    return { ok: false, error: 'PASSWORD_TOO_SHORT' }
  if (password !== confirmPassword)
    return { ok: false, error: 'PASSWORDS_DO_NOT_MATCH' }

  const accounts = loadAccounts()
  if (accounts.some((a) => a.email === email.toLowerCase()))
    return { ok: false, error: 'EMAIL_TAKEN' }

  const account: Account = {
    id:           crypto.randomUUID(),
    name:         name.trim(),
    email:        email.toLowerCase().trim(),
    passwordHash: await hashPassword(password),
    createdAt:    new Date().toISOString(),
    role:         accounts.length === 0 ? 'admin' : 'user', // first account is admin
  }
  saveAccounts([...accounts, account])
  return { ok: true, account }
}

export async function login(
  email: string,
  password: string
): Promise<{ ok: true; account: Account } | { ok: false; error: AuthError }> {
  const accounts = loadAccounts()
  const account  = accounts.find((a) => a.email === email.toLowerCase().trim())
  if (!account)
    return { ok: false, error: 'INVALID_CREDENTIALS' }

  const hash = await hashPassword(password)
  if (hash !== account.passwordHash)
    return { ok: false, error: 'INVALID_CREDENTIALS' }

  return { ok: true, account }
}

// ── Session ────────────────────────────────────────────────────────────────

export function createSession(account: Account): Session {
  const session: Session = {
    accountId: account.id,
    name:      account.name,
    email:     account.email,
    role:      account.role,
    loginAt:   new Date().toISOString(),
    isGuest:   false,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function createGuestSession(): Session {
  const session: Session = {
    accountId: 'guest',
    name:      'Guest',
    email:     '',
    role:      'user',
    loginAt:   new Date().toISOString(),
    isGuest:   true,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export const AUTH_ERROR_MESSAGES: Record<AuthError, string> = {
  INVALID_CREDENTIALS:    'Incorrect email or password.',
  EMAIL_TAKEN:            'An account with this email already exists.',
  EMAIL_INVALID:          'Please enter a valid email address.',
  PASSWORD_TOO_SHORT:     'Password must be at least 8 characters.',
  PASSWORDS_DO_NOT_MATCH: 'Passwords do not match.',
  NAME_REQUIRED:          'Please enter your full name.',
}
