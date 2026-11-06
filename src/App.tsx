import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faRightFromBracket, faUserCircle, faGear } from '@fortawesome/free-solid-svg-icons'
import type { Site, WaterBalanceInput } from './types'
import { useLocalStorage } from './lib/useLocalStorage'
import { DEFAULT_WATER_BALANCE } from './lib/waterBalance'
import Dashboard from './pages/Dashboard'
import SiteAnalysis from './pages/SiteAnalysis'
import WaterBalance from './pages/WaterBalance'
import WaterDemand from './pages/WaterDemand'
import WeatherPanel from './components/WeatherPanel'
import NewsPage from './pages/NewsPage'
import MapPage from './pages/MapPage'
import SplashScreen from './components/SplashScreen'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import SettingsPage from './pages/SettingsPage'
import { DEFAULT_DEMAND, type DemandInput } from './lib/demand'
import BrandLogo from './components/BrandLogo'
import BrandGuideModal from './components/BrandGuideModal'
import AiPromptBar from './components/AiPromptBar'
import { getSession, clearSession, type Session } from './lib/auth'
import './styles.css'
import { supabase } from './lib/supabase'

supabase.from('water_sources').select('*').then(({ data, error }) => {
  console.log('Supabase test:', data, error)
})

type View = 'dashboard' | 'site' | 'demand' | 'balance' | 'weather' | 'news' | 'map' | 'settings'

/* ── Inline SVG icons (no extra dep) ──────────────────────────────── */
function IconGrid() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function IconFlask() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M9 3v7l-5 8a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 18l-5-8V3"/>
    </svg>
  )
}
function IconDroplets() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
    </svg>
  )
}
function IconCloud() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
    </svg>
  )
}
function IconNewspaper() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>
    </svg>
  )
}
function IconMap() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  )
}

export default function App() {
  // Show the splash screen once per browser session
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem('aquarho.splashed')
  )
  function dismissSplash() {
    sessionStorage.setItem('aquarho.splashed', '1')
    setShowSplash(false)
  }

  // Auth gate — check for existing session in localStorage
  const [session, setSession] = useState<Session | null>(() => getSession())
  const [authPage, setAuthPage] = useState<'login' | 'signup'>('login')

  function handleAuth(s: Session) {
    setSession(s)
  }
  function handleLogout() {
    clearSession()
    setSession(null)
    setAuthPage('login')
  }

  const [sites, setSites] = useLocalStorage<Site[]>('aquarho.sites', [])
  const [water, setWater] = useLocalStorage<WaterBalanceInput>('aquarho.water', DEFAULT_WATER_BALANCE)
  const [demand, setDemand] = useLocalStorage<DemandInput>('aquarho.demand', DEFAULT_DEMAND)
  const [history, setHistory] = useState<View[]>(['dashboard'])
  const [histIdx,  setHistIdx]  = useState(0)
  const view = history[histIdx]

  function navigate(targetView: View) {
    setHistory((prev) => {
      const trimmed = prev.slice(0, histIdx + 1)
      const next    = [...trimmed, targetView].slice(-50)
      return next
    })
    setHistIdx((prev) => Math.min(prev + 1, 49))
    setMobileMenuOpen(false)
  }

  function goBack() {
    if (histIdx > 0) setHistIdx((i) => i - 1)
    setMobileMenuOpen(false)
  }

  function goForward() {
    if (histIdx < history.length - 1) setHistIdx((i) => i + 1)
    setMobileMenuOpen(false)
  }

  const canBack    = histIdx > 0
  const canForward = histIdx < history.length - 1

  // Keep handleNavigate as an alias so all existing callers work unchanged
  function handleNavigate(targetView: View) { navigate(targetView) }

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showBrandGuide, setShowBrandGuide] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const active = sites.find((s) => s.id === activeId) ?? null

  function open(id: string) {
    setActiveId(id)
    navigate('site')
    setMobileMenuOpen(false)
  }

  function updateSite(next: Site) {
    setSites(sites.map((s) => (s.id === next.id ? next : s)))
  }

  function goToSite() {
    if (active) {
      handleNavigate('site')
    } else if (sites.length > 0) {
      setActiveId(sites[0].id)
      handleNavigate('site')
    } else {
      // No sources yet — guide the user to create one instead of a dead end.
      handleNavigate('dashboard')
      setTimeout(() => {
        const el = document.getElementById('new-name') as HTMLInputElement | null
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => el?.focus(), 300)
      }, 60)
    }
  }

  const siteLabel = 'Site Analysis'
  const siteDisabled = sites.length === 0

  const hasDemo = sites.some((s) => s.id.startsWith('demo-'))
  function clearDemo() {
    setSites(sites.filter((s) => !s.id.startsWith('demo-')))
  }

  const PAGE_TITLES: Record<View, { title: string; sub: string }> = {
    dashboard: { title: 'Dashboard', sub: 'Monitor and manage all your water sources at a glance.' },
    site:      { title: active?.name ?? 'Site Analysis', sub: active ? `${active.type} · Sampled ${active.date}` : 'Select a source from the dashboard.' },
    demand:    { title: 'Water Demand', sub: 'Sources, uses and losses for farms and mines.' },
    balance:   { title: 'Utility Water Balance', sub: 'IWA standard water balance for supply utilities — input, consumption and losses.' },
    weather:   { title: 'Weather & Conditions', sub: 'Current conditions and 3-day forecast with water-management implications.' },
    news:      { title: 'Industry News', sub: 'Water, agriculture, environment, technology and public health headlines.' },
    map:       { title: 'Site Map', sub: 'View and locate all your monitored water sources on an interactive map.' },
    settings:  { title: 'Settings', sub: 'Profile, legal documents, user agreements, and more.' },
  }

  const { title, sub } = PAGE_TITLES[view]

  return (
    <div className="shell">
      {showSplash && <SplashScreen onDone={dismissSplash} />}

      {/* ── Auth gate — shown once splash is dismissed and no session ── */}
      {!showSplash && !session && (
        authPage === 'login'
          ? <LoginPage  onAuth={handleAuth} onGoSignUp={() => setAuthPage('signup')} />
          : <SignUpPage onAuth={handleAuth} onGoLogin={() => setAuthPage('login')} />
      )}

      {/* ── Full app shell — only when session exists ──────────────── */}
      {!showSplash && session && (
        <>
      {/* Brand System & Identity Showcase Modal */}
      <BrandGuideModal isOpen={showBrandGuide} onClose={() => setShowBrandGuide(false)} />

      {/* ── Mobile Sticky Navigation Header (visible <= 900px) ─────── */}
      <header className="mobile-header">
        <div className="mobile-header-left">
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>

          <BrandLogo
            size="sm"
            variant="horizontal"
            onClick={() => setShowBrandGuide(true)}
            className="mobile-brand-logo"
          />
        </div>

        <div className="mobile-header-right">
          <button
            type="button"
            className="chip chip-action mobile-brand-chip"
            onClick={() => setShowBrandGuide(true)}
            title="Inspect Brand Identity"
          >
            <span className="chip-indicator" />
            <span className="mobile-chip-label">Brand</span>
          </button>
        </div>
      </header>

      {/* ── Mobile Sidebar Backdrop Overlay ───────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Lockup */}
        <div className="sidebar-brand">
          <BrandLogo
            size="sm"
            variant="full"
            onClick={() => {
              setShowBrandGuide(true)
              setMobileMenuOpen(false)
            }}
            className="brand-interactive"
          />
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>

          <button
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
          >
            <IconGrid />
            Dashboard
          </button>

          <button
            className={`nav-item ${view === 'site' ? 'active' : ''} ${siteDisabled ? 'is-locked' : ''}`}
            onClick={goToSite}
            aria-disabled={siteDisabled || undefined}
            aria-label={siteDisabled ? 'Site Analysis — add a source to unlock' : 'Site Analysis'}
            data-tip={siteDisabled ? 'Add a source to unlock' : undefined}
          >
            <IconFlask />
            {siteLabel}
          </button>

          <button
            className={`nav-item ${view === 'demand' ? 'active' : ''}`}
            onClick={() => handleNavigate('demand')}
          >
            <IconDroplets />
            Water Demand
          </button>

          <button
            className={`nav-item ${view === 'balance' ? 'active' : ''}`}
            onClick={() => handleNavigate('balance')}
          >
            <IconDroplets />
            Utility Balance
          </button>

          <button
            className={`nav-item ${view === 'weather' ? 'active' : ''}`}
            onClick={() => handleNavigate('weather')}
          >
            <IconCloud />
            Weather
          </button>

          <button
            className={`nav-item ${view === 'news' ? 'active' : ''}`}
            onClick={() => handleNavigate('news')}
          >
            <IconNewspaper />
            News
          </button>

          <button
            className={`nav-item ${view === 'map' ? 'active' : ''}`}
            onClick={() => handleNavigate('map')}
          >
            <IconMap />
            Map
          </button>
        </div>

        {/* User card + logout */}
        <div style={{ padding: '0 10px 8px' }}>
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              <FontAwesomeIcon icon={faUserCircle} />
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {session.name}
                {session.isGuest && <span className="sidebar-guest-badge">Guest</span>}
              </div>
              {!session.isGuest && (
                <div className="sidebar-user-email">{session.email}</div>
              )}
            </div>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
            </button>
          </div>
        </div>

      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="main">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            {/* Back / Forward navigation */}
            <div className="topbar-nav-btns">
              <button
                className="topbar-nav-btn"
                onClick={goBack}
                disabled={!canBack}
                aria-label="Go back"
                title="Back"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <button
                className="topbar-nav-btn"
                onClick={goForward}
                disabled={!canForward}
                aria-label="Go forward"
                title="Forward"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-sub">{sub}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-settings-btn"
              onClick={() => handleNavigate('settings')}
              title="Settings"
              aria-label="Settings"
            >
              <FontAwesomeIcon icon={faGear} />
            </button>
            {hasDemo && (
              <>
                <span className="chip demo-chip" title="Demo data is loaded">Demo data</span>
                <button
                  className="chip chip-action"
                  onClick={clearDemo}
                  title="Remove demo data, keeping any sources you added"
                >
                  Clear demo
                </button>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="content">
          {view === 'dashboard' && (
            <Dashboard sites={sites} setSites={setSites} water={water} open={open} goBalance={() => handleNavigate('balance')} />
          )}
          {view === 'site' && (
            active
              ? <SiteAnalysis key={active.id} site={active} update={updateSite} />
              : <p className="muted">Pick a source on the dashboard to open its analysis.</p>
          )}
          {view === 'demand' && <WaterDemand demand={demand} setDemand={setDemand} />}
          {view === 'balance' && <WaterBalance water={water} setWater={setWater} />}
          {view === 'weather' && (
            <div className="grid" style={{ gap: 20 }}>
              <WeatherPanel />
            </div>
          )}
          {view === 'news' && <NewsPage />}
          {view === 'map' && (
            <MapPage
              sites={sites}
              setSites={setSites}
              onOpenSite={(id) => { setActiveId(id); handleNavigate('site') }}
            />
          )}
          {view === 'settings' && session && (
            <SettingsPage session={session} onLogout={handleLogout} />
          )}
        </div>

        {/* Floating AI Prompt Bar below the screen */}
        <AiPromptBar
          sites={sites}
          activeSite={active}
          water={water}
          demand={demand}
          view={view}
          onNavigate={(targetView) => handleNavigate(targetView)}
        />
      </div>
        </> /* end session guard */
      )}
    </div>
  )
}
