import { useState } from 'react'
import type { Level, Site, SourceType, WaterBalanceInput } from '../types'
import { SOURCE_LABELS } from '../types'
import { DRINKING_RULES, FISH_RULES, IRRIGATION_RULES, evaluate, worst } from '../lib/rules'
import { computeWaterBalance, DEFAULT_WATER_BALANCE } from '../lib/waterBalance'
import { Badge } from '../ui'
import { DEMO_SITES } from '../demo'

interface Props {
  sites: Site[]
  setSites: (s: Site[]) => void
  water: WaterBalanceInput
  open: (id: string) => void
  goBalance: () => void
}

const statusFor = (site: Site, rules: typeof DRINKING_RULES): Level | 'none' =>
  worst(evaluate(rules, site.sample))

/* ── Inline SVG icons ─────────────────────────────────────────────── */
function IconSources() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
    </svg>
  )
}
function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
    </svg>
  )
}
function IconTrendDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconOpen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

export default function Dashboard({ sites, setSites, water, open, goBalance }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<SourceType>('borehole')
  const wb = computeWaterBalance(water)

  const rows = sites.map((s) => ({
    site: s,
    drinking:   statusFor(s, DRINKING_RULES),
    irrigation: statusFor(s, IRRIGATION_RULES),
    fish:       statusFor(s, FISH_RULES),
  }))

  const ready = rows.filter((r) => r.drinking === 'good').length
  const treat = rows.filter((r) => r.drinking === 'watch' || r.drinking === 'poor').length
  const poor  = rows.filter((r) => r.drinking === 'poor').length

  const hasSites = sites.length > 0
  const hasDemo = sites.some((s) => s.id.startsWith('demo-'))
  // The utility-balance dataset is seeded with sample data; only show its
  // derived metric on the dashboard once the user has actually edited it,
  // so we never present sample numbers as if they were measured results.
  const sampleWater = JSON.stringify(water) === JSON.stringify(DEFAULT_WATER_BALANCE)

  function focusAddForm() {
    const el = document.getElementById('new-name') as HTMLInputElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => el?.focus(), 300)
  }

  function clearDemo() {
    setSites(sites.filter((s) => !s.id.startsWith('demo-')))
  }

  function loadDemo() {
    setSites([...sites, ...DEMO_SITES.filter((d) => !sites.some((s) => s.id === d.id))])
  }

  function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    const site: Site = {
      id:     crypto.randomUUID(),
      name:   trimmed,
      type,
      sample: {},
      date:   new Date().toISOString().slice(0, 10),
    }
    setSites([...sites, site])
    setName('')
    open(site.id)
  }

  return (
    <div className="grid" style={{ gap: 20 }}>

      {/* ── KPI cards ───────────────────────────────────────────── */}
      <div className="grid cards" style={{ gap: 14 }}>

        {/* Hero card */}
        <div className="card stat-hero card-accent">
          <div className="card-icon">
            <IconSources />
          </div>
          <div className="card-label">Water Sources</div>
          <div className="card-value">{sites.length}</div>
          <div className="card-sub">Total monitored sources</div>
        </div>

        <div className="card card-accent">
          <div className="card-icon">
            <IconCheck />
          </div>
          <div className="card-label">Drinking-Ready</div>
          <div className="card-value" style={{ color: hasSites ? 'var(--good)' : 'var(--muted)' }}>
            {hasSites ? ready : 'Not assessed'}
          </div>
          <div className="card-sub">{hasSites ? 'Meet assessed drinking limits' : 'Add a source to assess'}</div>
        </div>

        <div className="card card-accent">
          <div className="card-icon" style={{ background: hasSites ? 'var(--watch-bg)' : 'var(--panel-2)', color: hasSites ? 'var(--watch)' : 'var(--muted)' }}>
            <IconAlert />
          </div>
          <div className="card-label">Need Treatment</div>
          <div className="card-value" style={{ color: hasSites ? (poor > 0 ? 'var(--poor)' : 'var(--watch)') : 'var(--muted)' }}>
            {hasSites ? treat : 'Not assessed'}
          </div>
          <div className="card-sub">{hasSites ? `${poor} of these need action now` : 'Add a source to assess'}</div>
        </div>

        <div
          className="card card-accent"
          style={{ cursor: 'pointer' }}
          onClick={goBalance}
          title={sampleWater ? 'Open the utility water balance to enter your data' : 'Open water balance'}
        >
          <div className="card-icon" style={{ background: sampleWater ? 'var(--panel-2)' : 'var(--green-dim)', color: sampleWater ? 'var(--muted)' : 'var(--green)' }}>
            <IconTrendDown />
          </div>
          <div className="card-label">Non-Revenue Water</div>
          <div className="card-value" style={{ color: sampleWater ? 'var(--muted)' : 'var(--text)' }}>
            {sampleWater ? '—' : `${wb.nrwPct.toFixed(0)}%`}
          </div>
          <div className="card-sub">{sampleWater ? 'Add utility balance data to calculate' : 'From your utility balance · Open →'}</div>
        </div>
      </div>

      {/* ── Sources table ────────────────────────────────────────── */}
      <div className="panel">
        <div className="section-header">
          <div>
            <h2>Water Sources</h2>
            {sites.length > 0 && (
              <p className="muted small" style={{ marginTop: 2, marginBottom: 0 }}>
                Click <b>Open</b> on any row to enter water quality results.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {hasDemo && (
              <>
                <span className="chip demo-chip" title="Demo data is loaded">Demo data</span>
                <button className="btn sm ghost" onClick={clearDemo} title="Remove demo data, keeping any sources you added">
                  Clear demo
                </button>
              </>
            )}
            {sites.length > 0 && (
              <span className="chip">{sites.length} source{sites.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state empty-cta-state">
            <div className="empty-cta-icon"><IconSources /></div>
            <h2 className="empty-cta-heading">Add your first water source</h2>
            <p className="empty-cta-text">Add a source to start monitoring water quality and tracking treatment needs.</p>
            <div className="empty-cta-actions">
              <button className="btn" onClick={focusAddForm}>
                <IconPlus /> Add water source
              </button>
              <button className="btn ghost" onClick={loadDemo}>
                Explore demo data
              </button>
            </div>
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Drinking</th>
                  <th>Irrigation</th>
                  <th>Fish Pond</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.site.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{r.site.name}</div>
                      <div className="muted small">Sampled {r.site.date}</div>
                    </td>
                    <td>
                      <span className="chip">{SOURCE_LABELS[r.site.type]}</span>
                    </td>
                    <td><Badge level={r.drinking} /></td>
                    <td><Badge level={r.irrigation} /></td>
                    <td><Badge level={r.fish} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn sm ghost" onClick={() => open(r.site.id)}>
                          <IconOpen /> Open
                        </button>
                        <button
                          className="btn sm danger"
                          onClick={() => setSites(sites.filter((x) => x.id !== r.site.id))}
                        >
                          <IconTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add a source ─────────────────────────────────────────── */}
      <div className="panel">
        <div className="section-header" style={{ marginBottom: 14 }}>
          <h2>Add a Source</h2>
        </div>
        <div className="row">
          <div>
            <label htmlFor="new-name">Source name</label>
            <input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. School borehole"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
          </div>
          <div>
            <label htmlFor="new-type">Source type</label>
            <select id="new-type" value={type} onChange={(e) => setType(e.target.value as SourceType)}>
              {(Object.keys(SOURCE_LABELS) as SourceType[]).map((t) => (
                <option key={t} value={t}>{SOURCE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={add} disabled={!name.trim()}>
            <IconPlus /> Add &amp; Enter Results
          </button>
          <button
            className="btn ghost"
            onClick={loadDemo}
          >
            Load Demo Data
          </button>
        </div>
      </div>

    </div>
  )
}
