import type { CSSProperties } from 'react'
import type { SourceType, WaterBalanceInput } from '../types'
import { SOURCE_LABELS } from '../types'
import { computeWaterBalance } from '../lib/waterBalance'

type NumKey = 'billedMetered' | 'billedUnmetered' | 'unbilledMetered' | 'unbilledUnmetered' | 'unauthorised' | 'meterErrors'

const FIELDS: { key: NumKey; label: string; group: 'billed' | 'unbilled' | 'loss' }[] = [
  { key: 'billedMetered',     label: 'Billed metered consumption',       group: 'billed'   },
  { key: 'billedUnmetered',   label: 'Billed unmetered consumption',     group: 'billed'   },
  { key: 'unbilledMetered',   label: 'Unbilled metered (e.g. flushing)', group: 'unbilled' },
  { key: 'unbilledUnmetered', label: 'Unbilled unmetered (e.g. firefighting)', group: 'unbilled' },
  { key: 'unauthorised',      label: 'Unauthorised consumption',         group: 'loss'     },
  { key: 'meterErrors',       label: 'Metering inaccuracies',            group: 'loss'     },
]

/* ── Icons ─────────────────────────────────────────────────────────── */
function IconInput() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
    </svg>
  )
}
function IconNRW() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
    </svg>
  )
}
function IconLoss() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
    </svg>
  )
}
function IconLeakage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 0-6 5-6 10a6 6 0 0 0 12 0c0-5-6-10-6-10z"/><line x1="12" y1="16" x2="12" y2="22"/>
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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

export default function WaterBalance({
  water,
  setWater,
}: {
  water: WaterBalanceInput
  setWater: (w: WaterBalanceInput) => void
}) {
  const r   = computeWaterBalance(water)
  const min = Math.max(r.siv * 0.04, 1)
  const f   = (v: number): CSSProperties => ({ flex: Math.max(v, min) })
  const fmt = (n: number) => Math.round(n).toLocaleString()

  function setSource(id: string, patch: Partial<WaterBalanceInput['sources'][number]>) {
    setWater({ ...water, sources: water.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  }

  const billedFields   = FIELDS.filter((f) => f.group === 'billed')
  const unbilledFields = FIELDS.filter((f) => f.group === 'unbilled')
  const lossFields     = FIELDS.filter((f) => f.group === 'loss')

  return (
    <div className="grid" style={{ gap: 20 }}>

      {/* ── KPI summary cards ────────────────────────────────────── */}
      <div className="grid cards" style={{ gap: 14 }}>
        <div className="card card-accent stat-hero">
          <div className="card-icon"><IconInput /></div>
          <div className="card-label">System Input</div>
          <div className="card-value">{fmt(r.siv)}</div>
          <div className="card-sub">m³ per month</div>
        </div>

        <div className="card card-accent">
          <div className="card-icon" style={{ background: r.nrwPct > 25 ? 'var(--poor-bg)' : 'var(--watch-bg)', color: r.nrwPct > 25 ? 'var(--poor)' : 'var(--watch)' }}>
            <IconNRW />
          </div>
          <div className="card-label">Non-Revenue Water</div>
          <div className="card-value" style={{ color: r.nrwPct > 25 ? 'var(--poor)' : 'var(--watch)' }}>
            {r.nrwPct.toFixed(1)}%
          </div>
          <div className="card-sub">of system input</div>
        </div>

        <div className="card card-accent">
          <div className="card-icon" style={{ background: 'var(--watch-bg)', color: 'var(--watch)' }}>
            <IconLoss />
          </div>
          <div className="card-label">Water Losses</div>
          <div className="card-value" style={{ color: 'var(--watch)' }}>{r.lossPct.toFixed(1)}%</div>
          <div className="card-sub">apparent + real</div>
        </div>

        <div className="card card-accent">
          <div className="card-icon" style={{ background: r.consistent ? 'var(--green-dim)' : 'var(--poor-bg)', color: r.consistent ? 'var(--green)' : 'var(--poor)' }}>
            <IconLeakage />
          </div>
          <div className="card-label">Leakage (Real Losses)</div>
          <div className="card-value" style={{ color: r.consistent ? 'var(--text)' : 'var(--poor)' }}>
            {fmt(r.real)}
          </div>
          <div className="card-sub">m³ per month</div>
        </div>
      </div>

      {/* ── Inconsistency warning ─────────────────────────────────── */}
      {!r.consistent && (
        <div
          className="panel"
          style={{ borderColor: 'var(--poor)', background: 'var(--poor-bg)', color: 'var(--poor)' }}
        >
          <strong>Data inconsistency:</strong> Consumption plus apparent losses exceed the system input
          by {fmt(-r.real)} m³. Check source volumes, meter readings and billing figures.
        </div>
      )}

      {/* ── Input form ───────────────────────────────────────────── */}
      <div className="panel">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <h2>Water Balance Inputs</h2>
          <span className="chip">m³ / month</span>
        </div>

        {/* Sources */}
        <div className="group-heading">System Input by Source</div>
        <p className="muted small" style={{ marginBottom: 14 }}>
          All source volumes add to the system input volume. Leakage is what remains after consumption and apparent losses.
        </p>

        {water.sources.map((s) => (
          <div className="row" key={s.id} style={{ marginBottom: 10 }}>
            <div>
              <label htmlFor={`n-${s.id}`}>Name</label>
              <input
                id={`n-${s.id}`}
                value={s.name}
                onChange={(e) => setSource(s.id, { name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor={`t-${s.id}`}>Type</label>
              <select
                id={`t-${s.id}`}
                value={s.type}
                onChange={(e) => setSource(s.id, { type: e.target.value as SourceType })}
              >
                {(Object.keys(SOURCE_LABELS) as SourceType[]).map((t) => (
                  <option key={t} value={t}>{SOURCE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`v-${s.id}`}>Volume (m³)</label>
              <input
                id={`v-${s.id}`}
                type="number"
                min={0}
                value={s.volume}
                onChange={(e) => setSource(s.id, { volume: Number(e.target.value) || 0 })}
              />
            </div>
            <button
              className="btn sm danger"
              onClick={() => setWater({ ...water, sources: water.sources.filter((x) => x.id !== s.id) })}
            >
              <IconTrash /> Remove
            </button>
          </div>
        ))}

        <button
          className="btn ghost"
          style={{ marginBottom: 24 }}
          onClick={() =>
            setWater({
              ...water,
              sources: [
                ...water.sources,
                { id: crypto.randomUUID(), name: 'New source', type: 'borehole', volume: 0 },
              ],
            })
          }
        >
          <IconPlus /> Add Source
        </button>

        {/* Consumption & Losses — split into labelled groups */}
        <div className="group-heading">Billed Consumption</div>
        <div className="fields" style={{ marginBottom: 18 }}>
          {billedFields.map((fl) => (
            <div key={fl.key}>
              <label htmlFor={fl.key}>{fl.label}</label>
              <input
                id={fl.key}
                type="number"
                min={0}
                value={water[fl.key]}
                onChange={(e) => setWater({ ...water, [fl.key]: Number(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>

        <div className="group-heading">Unbilled Consumption</div>
        <div className="fields" style={{ marginBottom: 18 }}>
          {unbilledFields.map((fl) => (
            <div key={fl.key}>
              <label htmlFor={fl.key}>{fl.label}</label>
              <input
                id={fl.key}
                type="number"
                min={0}
                value={water[fl.key]}
                onChange={(e) => setWater({ ...water, [fl.key]: Number(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>

        <div className="group-heading">Apparent Losses</div>
        <div className="fields">
          {lossFields.map((fl) => (
            <div key={fl.key}>
              <label htmlFor={fl.key}>{fl.label}</label>
              <input
                id={fl.key}
                type="number"
                min={0}
                value={water[fl.key]}
                onChange={(e) => setWater({ ...water, [fl.key]: Number(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── IWA Water Balance diagram ─────────────────────────────── */}
      <div className="panel">
        <div className="section-header" style={{ marginBottom: 4 }}>
          <h2>IWA Water Balance</h2>
          <span className="chip">proportional blocks</span>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Block heights are proportional to volume, with a minimum so small items stay readable.
        </p>

        <div className="wb-scroll-wrap">
          <div className="wb">
            {/* Col 1: System Input */}
            <div className="wb-col" style={{ flex: 1 }}>
              <div className="wb-block wb-input" style={{ flex: 1 }}>
                <b>System Input Volume</b>
                {fmt(r.siv)} m³
              </div>
            </div>

            {/* Col 2: Authorised / Losses */}
            <div className="wb-col" style={{ flex: 1.1 }}>
              <div className="wb-block wb-auth" style={f(r.authorised)}>
                <b>Authorised Consumption</b>
                {fmt(r.authorised)} m³
              </div>
              <div className={`wb-block wb-loss ${r.consistent ? '' : 'wb-neg'}`} style={f(r.losses)}>
                <b>Water Losses</b>
                {fmt(r.losses)} m³
              </div>
            </div>

            {/* Col 3: Billed / Unbilled / Apparent / Real */}
            <div className="wb-col" style={{ flex: 1.2 }}>
              <div className="wb-block wb-auth" style={f(r.billedAuthorised)}>
                <b>Billed Authorised</b>
                {fmt(r.billedAuthorised)} m³
              </div>
              <div className="wb-block wb-auth" style={f(r.unbilledAuthorised)}>
                <b>Unbilled Authorised</b>
                {fmt(r.unbilledAuthorised)} m³
              </div>
              <div className="wb-block wb-loss" style={f(r.apparent)}>
                <b>Apparent Losses</b>
                {fmt(r.apparent)} m³
              </div>
              <div className={`wb-block wb-loss ${r.consistent ? '' : 'wb-neg'}`} style={f(r.real)}>
                <b>Real Losses (Leakage)</b>
                {fmt(r.real)} m³
              </div>
            </div>

            {/* Col 4: Line items */}
            <div className="wb-col" style={{ flex: 1.3 }}>
              <div className="wb-block wb-auth" style={f(water.billedMetered)}>
                Billed metered {fmt(water.billedMetered)}
              </div>
              <div className="wb-block wb-auth" style={f(water.billedUnmetered)}>
                Billed unmetered {fmt(water.billedUnmetered)}
              </div>
              <div className="wb-block wb-auth" style={f(water.unbilledMetered)}>
                Unbilled metered {fmt(water.unbilledMetered)}
              </div>
              <div className="wb-block wb-auth" style={f(water.unbilledUnmetered)}>
                Unbilled unmetered {fmt(water.unbilledUnmetered)}
              </div>
              <div className="wb-block wb-loss" style={f(water.unauthorised)}>
                Unauthorised {fmt(water.unauthorised)}
              </div>
              <div className="wb-block wb-loss" style={f(water.meterErrors)}>
                Meter errors {fmt(water.meterErrors)}
              </div>
              <div className="wb-block wb-loss" style={f(r.real)}>
                Leakage {fmt(r.real)}
              </div>
            </div>

            {/* Col 5: Revenue / NRW */}
            <div className="wb-col" style={{ flex: 1 }}>
              <div className="wb-block wb-rev" style={f(r.revenueWater)}>
                <b>Revenue Water</b>
                {fmt(r.revenueWater)} m³
              </div>
              <div className="wb-block wb-nrw" style={f(r.nrw)}>
                <b>Non-Revenue Water</b>
                {fmt(r.nrw)} m³
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
