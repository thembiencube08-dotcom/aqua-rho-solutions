import { useState } from 'react'
import type { ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser, faFileContract, faHandshake, faBookOpen, faSitemap,
  faFloppyDisk, faShieldHalved, faTrash, faCircleCheck,
  faEnvelope, faIdBadge, faCalendarDays, faChevronRight,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import type { Session } from '../lib/auth'
import { getAccounts, hashPassword, AUTH_ERROR_MESSAGES } from '../lib/auth'

type Tab = 'profile' | 'legal' | 'agreements' | 'guide' | 'sitemap'

const TABS: { id: Tab; label: string; icon: typeof faUser }[] = [
  { id: 'profile',    label: 'Profile',          icon: faUser },
  { id: 'legal',      label: 'Legal Documents',  icon: faFileContract },
  { id: 'agreements', label: 'User Agreements',  icon: faHandshake },
  { id: 'guide',      label: 'User Guide',       icon: faBookOpen },
  { id: 'sitemap',    label: 'Site Map',         icon: faSitemap },
]

interface Props {
  session: Session
  onLogout: () => void
}

export default function SettingsPage({ session, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <div className="settings-shell">
      {/* ── Sidebar tab list ────────────────────────────────────────── */}
      <aside className="settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`settings-tab-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <FontAwesomeIcon icon={t.icon} className="settings-tab-icon" />
            <span>{t.label}</span>
            <FontAwesomeIcon icon={faChevronRight} className="settings-tab-arrow" />
          </button>
        ))}
      </aside>

      {/* ── Content panel ────────────────────────────────────────────── */}
      <div className="settings-content">
        {tab === 'profile'    && <ProfileTab    session={session} onLogout={onLogout} />}
        {tab === 'legal'      && <LegalTab />}
        {tab === 'agreements' && <AgreementsTab />}
        {tab === 'guide'      && <GuideTab />}
        {tab === 'sitemap'    && <SiteMapTab />}
      </div>
    </div>
  )
}

// ── Profile ────────────────────────────────────────────────────────────────

function ProfileTab({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const accounts = getAccounts()
  const account  = accounts.find((a) => a.id === session.accountId)

  const [name,    setName]    = useState(session.name)
  const [newPw,   setNewPw]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)

  async function handleSaveProfile() {
    setPwError(null)
    if (!name.trim()) return

    // Update name in localStorage
    const all = getAccounts()
    const updated = all.map((a) =>
      a.id === session.accountId ? { ...a, name: name.trim() } : a
    )
    localStorage.setItem('aquarho.accounts', JSON.stringify(updated))

    // Optionally update password
    if (newPw) {
      if (newPw.length < 8) { setPwError(AUTH_ERROR_MESSAGES.PASSWORD_TOO_SHORT); return }
      if (newPw !== confirmPw) { setPwError(AUTH_ERROR_MESSAGES.PASSWORDS_DO_NOT_MATCH); return }
      const hash = await hashPassword(newPw)
      const withPw = updated.map((a) =>
        a.id === session.accountId ? { ...a, passwordHash: hash } : a
      )
      localStorage.setItem('aquarho.accounts', JSON.stringify(withPw))
    }

    // Refresh session name
    const sess = JSON.parse(localStorage.getItem('aquarho.session') || '{}')
    localStorage.setItem('aquarho.session', JSON.stringify({ ...sess, name: name.trim() }))

    setSaved(true)
    setNewPw(''); setConfirmPw('')
    setTimeout(() => setSaved(false), 3000)
  }

  function handleDeleteAccount() {
    const all = getAccounts().filter((a) => a.id !== session.accountId)
    localStorage.setItem('aquarho.accounts', JSON.stringify(all))
    onLogout()
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2>Profile</h2>
        <p className="muted small">Manage your account name, password, and account data.</p>
      </div>

      {/* Account summary */}
      <div className="settings-account-card">
        <div className="settings-account-avatar">
          <FontAwesomeIcon icon={faUser} />
        </div>
        <div>
          <div className="settings-account-name">{session.name}</div>
          {session.isGuest
            ? <div className="muted small">Guest session — no account saved</div>
            : <div className="muted small">{session.email}</div>
          }
          <div className="muted small" style={{ marginTop: 2 }}>
            Role: <strong>{session.role}</strong>
          </div>
        </div>
      </div>

      {session.isGuest ? (
        <div className="settings-info-box">
          <FontAwesomeIcon icon={faShieldHalved} style={{ color: 'var(--brand-blue)' }} />
          <span>You are browsing as a guest. Create an account to save your profile and data between sessions.</span>
        </div>
      ) : (
        <>
          {/* Info row */}
          <div className="settings-info-grid">
            <div className="settings-info-item">
              <FontAwesomeIcon icon={faEnvelope} className="settings-info-icon" />
              <div>
                <div className="settings-info-label">Email</div>
                <div className="settings-info-value">{account?.email ?? session.email}</div>
              </div>
            </div>
            <div className="settings-info-item">
              <FontAwesomeIcon icon={faIdBadge} className="settings-info-icon" />
              <div>
                <div className="settings-info-label">Role</div>
                <div className="settings-info-value" style={{ textTransform: 'capitalize' }}>{session.role}</div>
              </div>
            </div>
            <div className="settings-info-item">
              <FontAwesomeIcon icon={faCalendarDays} className="settings-info-icon" />
              <div>
                <div className="settings-info-label">Member since</div>
                <div className="settings-info-value">
                  {account ? new Date(account.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Edit name */}
          <div className="settings-section">
            <div className="settings-section-title">Display Name</div>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="s-name">Full name</label>
                <input id="s-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Change password */}
          <div className="settings-section">
            <div className="settings-section-title">Change Password</div>
            <div className="fields" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label htmlFor="s-newpw">New password</label>
                <input id="s-newpw" type="password" value={newPw} placeholder="Min. 8 characters"
                  onChange={(e) => { setNewPw(e.target.value); setPwError(null) }} />
              </div>
              <div>
                <label htmlFor="s-confirmpw">Confirm new password</label>
                <input id="s-confirmpw" type="password" value={confirmPw} placeholder="Repeat password"
                  onChange={(e) => { setConfirmPw(e.target.value); setPwError(null) }} />
              </div>
            </div>
            {pwError && <p className="auth-error" style={{ marginTop: 8 }} role="alert">{pwError}</p>}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <button className="btn" onClick={handleSaveProfile} disabled={!name.trim()}>
              <FontAwesomeIcon icon={faFloppyDisk} /> Save Changes
            </button>
            {saved && (
              <span style={{ color: 'var(--good-text)', fontSize: '.85rem', fontWeight: 600 }}>
                <FontAwesomeIcon icon={faCircleCheck} /> Saved
              </span>
            )}
          </div>

          {/* Danger zone */}
          <div className="settings-danger-zone">
            <div className="settings-section-title" style={{ color: 'var(--poor)' }}>
              <FontAwesomeIcon icon={faTriangleExclamation} /> Danger Zone
            </div>
            <p className="muted small">Permanently delete your account and all associated data from this browser. This cannot be undone.</p>
            {!delConfirm ? (
              <button className="btn danger sm" onClick={() => setDelConfirm(true)}>
                <FontAwesomeIcon icon={faTrash} /> Delete Account
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="muted small">Are you sure?</span>
                <button className="btn danger sm" onClick={handleDeleteAccount}>Yes, delete</button>
                <button className="btn ghost sm" onClick={() => setDelConfirm(false)}>Cancel</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Legal Documents ────────────────────────────────────────────────────────

function LegalTab() {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2>Legal Documents</h2>
        <p className="muted small">Important legal information governing your use of AquaRho Solutions.</p>
      </div>

      <LegalSection title="Privacy Policy" lastUpdated="1 November 2026">
        <p>AquaRho Solutions is a <strong>local-first, client-side application</strong>. All data you enter — water sources, quality measurements, utility balances, and account credentials — is stored exclusively in your browser's <code>localStorage</code>. No data is transmitted to any server operated by AquaRho Solutions.</p>
        <h4>Data We Do Not Collect</h4>
        <ul className="clean">
          <li>Personal identifiable information beyond what you voluntarily enter</li>
          <li>Location data (GPS coordinates are stored locally only when you pin a site on the map)</li>
          <li>Usage analytics, telemetry, or crash reports</li>
          <li>Cookies for tracking purposes</li>
        </ul>
        <h4>Third-Party Services</h4>
        <ul className="clean">
          <li><strong>Open-Meteo</strong> (weather) — requests are made directly from your browser to open-meteo.com. Open-Meteo's own privacy policy applies.</li>
          <li><strong>OpenStreetMap / Esri</strong> (map tiles) — tile requests are made to their servers. Their respective policies apply.</li>
          <li><strong>Google Gemini / GNews</strong> — only if you optionally configure API keys. These keys are stored in your browser only.</li>
          <li><strong>RSS2JSON / Google News RSS</strong> (news feed) — requests are made directly from your browser.</li>
        </ul>
        <h4>Data Deletion</h4>
        <p>To delete all your data, use Settings → Profile → Delete Account, or clear your browser's site data for this origin.</p>
      </LegalSection>

      <LegalSection title="Disclaimer of Warranties" lastUpdated="1 November 2026">
        <p>AquaRho Solutions is provided <strong>"as is"</strong> without warranty of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement.</p>
        <p>Water quality assessments, treatment recommendations, chemical dosages, and all other outputs are <strong>indicative guidance only</strong>. They are generated from rule-based algorithms and publicly available guideline values (WHO, FAO). They do not constitute professional engineering advice, certified laboratory analysis, or regulatory compliance certification.</p>
        <p><strong>Critical decisions regarding drinking water safety, public health, or infrastructure must be made by qualified professionals and confirmed by accredited laboratory testing.</strong></p>
      </LegalSection>

      <LegalSection title="Limitation of Liability" lastUpdated="1 November 2026">
        <p>To the fullest extent permitted by applicable law, AquaRho Solutions and its developers shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages arising from your use of, or inability to use, this application — including damages for loss of profits, data, goodwill, or other intangible losses.</p>
      </LegalSection>

      <LegalSection title="Intellectual Property" lastUpdated="1 November 2026">
        <p>The AquaRho Solutions name, logo, brand mark, and all original software code are the intellectual property of AquaRho Solutions. The SVG logo and brand assets embedded in this application may not be reproduced or used without written permission.</p>
        <p>Third-party libraries used in this application are governed by their respective open-source licences (MIT, Apache 2.0, etc.).</p>
      </LegalSection>
    </div>
  )
}

// ── User Agreements ────────────────────────────────────────────────────────

function AgreementsTab() {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2>User Agreements</h2>
        <p className="muted small">Terms you accept when using AquaRho Solutions.</p>
      </div>

      <div className="settings-agreement-accept">
        <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'var(--good-text)', fontSize: '1.2rem' }} />
        <div>
          <strong>Terms accepted</strong>
          <p className="muted small" style={{ margin: 0 }}>By creating an account or continuing as a guest you accepted the terms below.</p>
        </div>
      </div>

      <LegalSection title="Terms of Use" lastUpdated="1 November 2026">
        <p>By using AquaRho Solutions you agree to the following:</p>
        <ol className="clean">
          <li><strong>Permitted Use.</strong> You may use this application for lawful water management, monitoring, and educational purposes. You may not use it to generate misleading public health claims.</li>
          <li><strong>Accuracy of Data.</strong> You are responsible for the accuracy of data you enter. AquaRho Solutions is not liable for decisions made based on incorrect input data.</li>
          <li><strong>No Professional Advice.</strong> Outputs from this application do not substitute for advice from licensed engineers, hydrogeologists, or public health professionals.</li>
          <li><strong>Account Security.</strong> Your account credentials are stored locally in your browser. You are responsible for keeping your device secure. AquaRho Solutions cannot recover lost passwords.</li>
          <li><strong>Acceptable Use.</strong> You agree not to attempt to reverse-engineer, decompile, or redistribute this application or its source code without authorisation.</li>
          <li><strong>Changes to Terms.</strong> AquaRho Solutions may update these terms. Continued use after an update constitutes acceptance.</li>
        </ol>
      </LegalSection>

      <LegalSection title="Data Processing Agreement" lastUpdated="1 November 2026">
        <p>Because all processing occurs in your browser and no personal data is transmitted to AquaRho Solutions servers, this application does not require a formal Data Processing Agreement under GDPR or similar frameworks for its core functionality.</p>
        <p>If you configure third-party API keys (Gemini, GNews), the respective providers' data processing agreements apply to those interactions.</p>
      </LegalSection>

      <LegalSection title="Cookie Policy" lastUpdated="1 November 2026">
        <p>AquaRho Solutions does not use browser cookies. Application state is managed exclusively through <code>localStorage</code> and <code>sessionStorage</code>, which are not transmitted to any server.</p>
      </LegalSection>
    </div>
  )
}

// ── User Guide ─────────────────────────────────────────────────────────────

function GuideTab() {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2>User Guide</h2>
        <p className="muted small">Everything you need to get the most out of AquaRho Solutions.</p>
      </div>

      <GuideSection icon="💧" title="Getting Started">
        <ol className="clean">
          <li><strong>Create an account</strong> or continue as a guest from the login screen.</li>
          <li>On the <strong>Dashboard</strong>, click <em>Add water source</em> or <em>Explore demo data</em> to begin.</li>
          <li>Click <strong>Open</strong> on any source row to go to Site Analysis and enter your water quality results.</li>
          <li>The dashboard KPIs — Drinking-Ready, Need Treatment, Non-Revenue Water — update automatically as you add data.</li>
        </ol>
      </GuideSection>

      <GuideSection icon="🔬" title="Site Analysis">
        <p>Enter raw lab or field test values in the parameter form. You only need to fill in the measurements you have — leave the rest blank.</p>
        <ul className="clean">
          <li><strong>Drinking & Treatment tab</strong> — evaluates each parameter against WHO drinking water guidelines and generates a treatment train with chemical dosages.</li>
          <li><strong>Groundwater Outlook tab</strong> — predicts source suitability, calculates the Langelier Saturation Index (scaling/corrosion tendency), and lists typical risks for your source type.</li>
          <li><strong>Irrigation tab</strong> — assesses water for agricultural use using FAO 29 guidelines and calculates the Sodium Adsorption Ratio (SAR).</li>
          <li><strong>Fish Pond tab</strong> — evaluates dissolved oxygen, pH, ammonia, and nitrite for aquaculture.</li>
          <li><strong>Jar Test tab</strong> — calculates a 6-jar alum dosing series from your turbidity reading.</li>
        </ul>
      </GuideSection>

      <GuideSection icon="⚖️" title="Utility Water Balance">
        <p>The Utility Balance page implements the <strong>IWA standard water balance</strong>. Enter your system input volume, authorised consumption, and loss components to calculate Non-Revenue Water (NRW) percentage.</p>
        <ul className="clean">
          <li>Real losses = physical pipe leakage and tank overflows.</li>
          <li>Apparent losses = meter under-registration and unauthorised consumption.</li>
          <li>NRW = Real + Apparent + Unbilled authorised consumption.</li>
        </ul>
      </GuideSection>

      <GuideSection icon="🌾" title="Water Demand">
        <p>Model farm, mine, and municipal water demand. Enter source capacities, use allocations, conveyance losses, and evaporation to see whether supply meets demand and by how much.</p>
      </GuideSection>

      <GuideSection icon="🤖" title="AI Water Assistant">
        <p>The AI assistant answers questions about water quality, treatment, and utility management.</p>
        <ul className="clean">
          <li><strong>Offline mode</strong> — built-in keyword engine covers pH, turbidity, iron, bacteria, hardness, NRW, irrigation, H₂S, and more. No setup needed.</li>
          <li><strong>Live Gemini mode</strong> — add a free Google Gemini API key via the ⚙ icon in the chat header to ask any question. The key is stored in your browser only.</li>
          <li>Click the orange <em>Ask AI</em> button to open the assistant. On desktop it expands to a dock bar with quick-prompt chips.</li>
        </ul>
      </GuideSection>

      <GuideSection icon="☁️" title="Weather & Conditions">
        <p>Search for any city to see current weather, a 3-day forecast, and <strong>water-management implications</strong> — including storm warnings, rainfall impacts on turbidity, and daily evapotranspiration (ET₀) for irrigation scheduling.</p>
        <p>Data is from <strong>Open-Meteo</strong> (free, no key required) and cached for 30 minutes.</p>
      </GuideSection>

      <GuideSection icon="📰" title="Industry News">
        <p>Curated headlines across five categories: Water &amp; Sanitation, Agriculture, Environment, Water Tech, and Public Health.</p>
        <ul className="clean">
          <li>Without a key — uses Google News RSS (free, no signup).</li>
          <li>With a free GNews API key (Settings → News) — faster, more targeted results.</li>
          <li>Articles are cached for 2 hours per category.</li>
        </ul>
      </GuideSection>

      <GuideSection icon="🗺️" title="Map">
        <p>View all your water sources on an interactive OpenStreetMap. Click <em>Drop site</em> then click on the map to pin a new source at that location.</p>
        <ul className="clean">
          <li>Marker colours reflect the drinking water assessment status (teal = good, amber = watch, red = action needed).</li>
          <li>Toggle between Street and Satellite imagery.</li>
          <li>Use <em>My Location</em> to fly the map to your device's GPS position.</li>
        </ul>
      </GuideSection>
    </div>
  )
}

// ── Site Map ───────────────────────────────────────────────────────────────

function SiteMapTab() {
  const pages = [
    {
      group: 'Main Pages',
      items: [
        { name: 'Dashboard',              desc: 'Overview of all water sources, KPI cards, and quick actions.',                          view: 'dashboard' },
        { name: 'Site Analysis',          desc: 'Water quality assessment, treatment train, irrigation and fish pond suitability.',        view: 'site' },
        { name: 'Water Demand',           desc: 'Farm and mine demand modelling — sources, uses, losses, and surplus/shortfall.',           view: 'demand' },
        { name: 'Utility Balance',        desc: 'IWA water balance — system input, authorised consumption, real and apparent losses.',     view: 'balance' },
        { name: 'Weather & Conditions',   desc: '3-day forecast and water-management implications powered by Open-Meteo.',                 view: 'weather' },
        { name: 'Industry News',          desc: 'Water, agriculture, environment, tech, and health headlines via GNews / Google RSS.',     view: 'news' },
        { name: 'Map',                    desc: 'Interactive site map — pin water sources, view status markers, toggle satellite view.',   view: 'map' },
      ],
    },
    {
      group: 'Settings',
      items: [
        { name: 'Profile',           desc: 'Update your display name, change password, or delete your account.',          view: null },
        { name: 'Legal Documents',   desc: 'Privacy Policy, Disclaimer, Limitation of Liability, and Intellectual Property.', view: null },
        { name: 'User Agreements',   desc: 'Terms of Use, Data Processing Agreement, and Cookie Policy.',                view: null },
        { name: 'User Guide',        desc: 'Step-by-step help for every feature in the application.',                     view: null },
        { name: 'Site Map',          desc: 'This page — a structured overview of all pages and sections.',                view: null },
      ],
    },
    {
      group: 'Auth',
      items: [
        { name: 'Login',   desc: 'Sign in with your email and password, or continue as a guest.', view: null },
        { name: 'Sign Up', desc: 'Create a new account with name, email, and password.',          view: null },
      ],
    },
  ]

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2>Site Map</h2>
        <p className="muted small">A structured overview of every page and section in AquaRho Solutions.</p>
      </div>

      {pages.map((group) => (
        <div key={group.group} className="settings-section">
          <div className="settings-section-title">{group.group}</div>
          <div className="sitemap-grid">
            {group.items.map((item) => (
              <div key={item.name} className="sitemap-card">
                <div className="sitemap-card-name">{item.name}</div>
                <div className="sitemap-card-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────

function LegalSection({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="settings-legal-section">
      <button className="settings-legal-header" onClick={() => setOpen((v) => !v)}>
        <span className="settings-legal-title">{title}</span>
        <span className="settings-legal-meta">Last updated {lastUpdated}</span>
        <FontAwesomeIcon
          icon={faChevronRight}
          className="settings-legal-chevron"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>
      {open && <div className="settings-legal-body">{children}</div>}
    </div>
  )
}

function GuideSection({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="settings-legal-section">
      <button className="settings-legal-header" onClick={() => setOpen((v) => !v)}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span className="settings-legal-title" style={{ marginLeft: 8 }}>{title}</span>
        <FontAwesomeIcon
          icon={faChevronRight}
          className="settings-legal-chevron"
          style={{ marginLeft: 'auto', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>
      {open && <div className="settings-legal-body">{children}</div>}
    </div>
  )
}
