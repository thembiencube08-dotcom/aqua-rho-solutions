import type { CSSProperties } from 'react'
import type { SourceType } from '../types'
import { SOURCE_LABELS } from '../types'
import {
  type Activity, type DemandInput, type OperationType,
  CROP_PRESETS, DEFAULT_DEMAND, IRRIGATION_EFFICIENCY, LIVESTOCK_PRESETS, MINING_DEMAND,
  activityDemand, computeDemand, demandFindings,
} from '../lib/demand'

const fmt = (n: number) => Math.round(n).toLocaleString()
const num = (v: string) => Number(v) || 0
const OPS: { key: OperationType; label: string }[] = [
  { key: 'crop', label: 'Crop & livestock farm' },
  { key: 'livestock', label: 'Livestock farm' },
  { key: 'mining', label: 'Mine' },
]

function Field({ label, value, onChange, step }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <div>
      <label>{label}</label>
      <input type="number" min={0} step={step} value={value} onChange={(e) => onChange(num(e.target.value))} />
    </div>
  )
}

export default function WaterDemand({ demand, setDemand }: { demand: DemandInput; setDemand: (d: DemandInput) => void }) {
  const r = computeDemand(demand)
  const findings = demandFindings(demand, r)
  const id = () => crypto.randomUUID()

  const setActivity = (aid: string, patch: Partial<Activity>) =>
    setDemand({ ...demand, activities: demand.activities.map((a) => (a.id === aid ? ({ ...a, ...patch } as Activity) : a)) })
  const setSource = (sid: string, patch: Partial<DemandInput['sources'][number]>) =>
    setDemand({ ...demand, sources: demand.sources.map((s) => (s.id === sid ? { ...s, ...patch } : s)) })
  const addActivity = (a: Activity) => setDemand({ ...demand, activities: [...demand.activities, a] })

  function switchOperation(op: OperationType) {
    if (op === demand.operation) return
    if (!confirm('Switching operation type replaces the current inputs with an example for that type. Continue?')) return
    setDemand(op === 'mining' ? MINING_DEMAND : { ...DEFAULT_DEMAND, operation: op, activities: op === 'livestock' ? DEFAULT_DEMAND.activities.filter((a) => a.kind === 'livestock') : DEFAULT_DEMAND.activities })
  }

  const statusColor = r.status === 'shortfall' ? 'var(--poor)' : r.status === 'surplus' ? 'var(--green)' : 'var(--watch)'
  const parts = [
    { label: 'Productive use', v: r.productive, c: 'var(--green)' },
    { label: 'Application loss', v: r.applicationLoss, c: 'var(--watch)' },
    { label: 'Conveyance loss', v: r.conveyanceLoss, c: 'var(--poor)' },
    { label: 'Evaporation', v: r.evaporation, c: '#4EA3CA' },
    { label: 'Unallocated surplus', v: r.surplus, c: 'var(--line-2)' },
  ].filter((p) => p.v > 0)
  const barStyle = (v: number, c: string): CSSProperties => ({ flex: v, background: c, minWidth: 4 })

  const showCrops = demand.operation !== 'mining' && demand.operation !== 'livestock'
  const showLivestock = demand.operation !== 'mining'
  const showMining = demand.operation === 'mining'

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="panel">
        <div className="section-header" style={{ marginBottom: 12 }}>
          <h2>Operation type</h2>
          <span className="chip">m³ / month</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {OPS.map((o) => (
            <button key={o.key} className={`btn ${demand.operation === o.key ? '' : 'ghost'}`} onClick={() => switchOperation(o.key)}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className="grid cards" style={{ gap: 14 }}>
        <div className="card card-accent stat-hero">
          <div className="card-label">Water in</div>
          <div className="card-value">{fmt(r.totalIn)}</div>
          <div className="card-sub">{r.recycledPct.toFixed(0)}% recycled</div>
        </div>
        <div className="card card-accent">
          <div className="card-label">Demand (gross)</div>
          <div className="card-value">{fmt(r.grossDemand)}</div>
          <div className="card-sub">{fmt(r.productive)} productive</div>
        </div>
        <div className="card card-accent">
          <div className="card-label">{r.status === 'shortfall' ? 'Shortfall' : r.status === 'surplus' ? 'Surplus' : 'Margin'}</div>
          <div className="card-value" style={{ color: statusColor }}>{fmt(r.status === 'shortfall' ? r.shortfall : r.surplus)}</div>
          <div className="card-sub">{r.coveragePct.toFixed(0)}% of demand covered</div>
        </div>
        <div className="card card-accent">
          <div className="card-label">Water efficiency</div>
          <div className="card-value">{r.efficiencyPct.toFixed(1)}%</div>
          <div className="card-sub">productive use ÷ water in</div>
        </div>
      </div>

      {r.totalIn > 0 && (
        <div className="panel">
          <div className="group-heading">Where the water goes</div>
          <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', margin: '10px 0' }}>
            {parts.map((p) => <div key={p.label} title={`${p.label}: ${fmt(p.v)} m³`} style={barStyle(p.v, p.c)} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }} className="muted small">
            {parts.map((p) => (
              <span key={p.label}><span style={{ display: 'inline-block', width: 10, height: 10, background: p.c, borderRadius: 2, marginRight: 6 }} />{p.label} {fmt(p.v)}</span>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="group-heading">Preliminary findings</div>
        <ul style={{ margin: '10px 0 0 18px', lineHeight: 1.7 }}>
          {findings.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="panel">
        <div className="group-heading">Water sources</div>
        {demand.sources.map((s) => (
          <div className="row" key={s.id} style={{ marginBottom: 10 }}>
            <div><label>Name</label><input value={s.name} onChange={(e) => setSource(s.id, { name: e.target.value })} /></div>
            <div>
              <label>Type</label>
              <select value={s.type} onChange={(e) => setSource(s.id, { type: e.target.value as SourceType })}>
                {(Object.keys(SOURCE_LABELS) as SourceType[]).map((t) => <option key={t} value={t}>{SOURCE_LABELS[t]}</option>)}
              </select>
            </div>
            <Field label="Volume (m³/month)" value={s.volume} onChange={(n) => setSource(s.id, { volume: n })} />
            <Field label="Metered (%)" value={s.meteredPct ?? 0} onChange={(n) => setSource(s.id, { meteredPct: Math.min(n, 100) })} />
            <div>
              <label>Recycled / return water</label>
              <select value={s.recycled ? 'y' : 'n'} onChange={(e) => setSource(s.id, { recycled: e.target.value === 'y' })}>
                <option value="n">No, new abstraction</option><option value="y">Yes, reused</option>
              </select>
            </div>
            <button className="btn sm danger" onClick={() => setDemand({ ...demand, sources: demand.sources.filter((x) => x.id !== s.id) })}>Remove</button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => setDemand({ ...demand, sources: [...demand.sources, { id: id(), name: 'New source', type: 'borehole', volume: 0, meteredPct: 0 }] })}>+ Add source</button>
      </div>

      <div className="panel">
        <div className="group-heading">Water uses</div>
        <p className="muted small" style={{ margin: '4px 0 14px' }}>Crop need is in mm per month for the season (1 mm over 1 ha = 10 m³). Presets are typical peak-season values, so adjust them for your area and planting date.</p>
        {demand.activities.map((a) => {
          const res = activityDemand(a)
          return (
            <div className="row" key={a.id} style={{ marginBottom: 10 }}>
              <div><label>Use</label><input value={a.name} onChange={(e) => setActivity(a.id, { name: e.target.value })} /></div>
              {a.kind === 'crop' && (<>
                <Field label="Area (ha)" value={a.areaHa} step={0.1} onChange={(n) => setActivity(a.id, { areaHa: n })} />
                <Field label="Crop need (mm/month)" value={a.mmPerMonth} onChange={(n) => setActivity(a.id, { mmPerMonth: n })} />
                <div>
                  <label>Irrigation efficiency (%)</label>
                  <input type="number" min={1} max={100} value={a.efficiencyPct} onChange={(e) => setActivity(a.id, { efficiencyPct: Math.min(num(e.target.value), 100) })} />
                </div>
              </>)}
              {a.kind === 'livestock' && (<>
                <Field label="Number of animals" value={a.heads} onChange={(n) => setActivity(a.id, { heads: n })} />
                <Field label="Litres / head / day" value={a.litresPerHeadDay} step={0.1} onChange={(n) => setActivity(a.id, { litresPerHeadDay: n })} />
              </>)}
              {a.kind === 'process' && (<>
                <Field label="Ore (tonnes/month)" value={a.tonnesPerMonth} onChange={(n) => setActivity(a.id, { tonnesPerMonth: n })} />
                <Field label="Water (m³/tonne)" value={a.m3PerTonne} step={0.1} onChange={(n) => setActivity(a.id, { m3PerTonne: n })} />
              </>)}
              {a.kind === 'fixed' && <Field label="Volume (m³/month)" value={a.m3PerMonth} onChange={(n) => setActivity(a.id, { m3PerMonth: n })} />}
              {a.kind === 'camp' && (<>
                <Field label="People" value={a.people} onChange={(n) => setActivity(a.id, { people: n })} />
                <Field label="Litres / person / day" value={a.litresPerPersonDay} onChange={(n) => setActivity(a.id, { litresPerPersonDay: n })} />
              </>)}
              <div><label>Needs (m³)</label><div style={{ padding: '9px 0', fontWeight: 600 }}>{fmt(res.gross)}</div></div>
              <button className="btn sm danger" onClick={() => setDemand({ ...demand, activities: demand.activities.filter((x) => x.id !== a.id) })}>Remove</button>
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {showCrops && (
            <select value="" onChange={(e) => {
              const p = CROP_PRESETS.find((c) => c.name === e.target.value); if (!p) return
              addActivity({ id: id(), kind: 'crop', name: p.name, areaHa: 1, mmPerMonth: p.mm, efficiencyPct: IRRIGATION_EFFICIENCY['Sprinkler / pivot'] })
            }} style={{ maxWidth: 220 }}>
              <option value="">+ Add crop…</option>{CROP_PRESETS.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          )}
          {showLivestock && (
            <select value="" onChange={(e) => {
              const p = LIVESTOCK_PRESETS.find((c) => c.name === e.target.value); if (!p) return
              addActivity({ id: id(), kind: 'livestock', name: p.name, heads: 10, litresPerHeadDay: p.l })
            }} style={{ maxWidth: 220 }}>
              <option value="">+ Add livestock…</option>{LIVESTOCK_PRESETS.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          )}
          {showMining && (<>
            <button className="btn ghost" onClick={() => addActivity({ id: id(), kind: 'process', name: 'Ore processing', tonnesPerMonth: 0, m3PerTonne: 1 })}>+ Ore processing</button>
            <button className="btn ghost" onClick={() => addActivity({ id: id(), kind: 'fixed', name: 'Dust suppression', m3PerMonth: 0 })}>+ Fixed use (dust, cooling…)</button>
            <button className="btn ghost" onClick={() => addActivity({ id: id(), kind: 'camp', name: 'Camp domestic use', people: 0, litresPerPersonDay: 150 })}>+ Camp</button>
          </>)}
        </div>
      </div>

      <div className="panel">
        <div className="group-heading">Physical losses</div>
        <div className="fields" style={{ marginTop: 10 }}>
          <Field label="Conveyance loss (% of water in)" value={demand.conveyanceLossPct} onChange={(n) => setDemand({ ...demand, conveyanceLossPct: n })} />
          <Field label="Open storage surface (ha)" value={demand.storageAreaHa} step={0.1} onChange={(n) => setDemand({ ...demand, storageAreaHa: n })} />
          <Field label="Evaporation (mm/month)" value={demand.evaporationMmPerMonth} onChange={(n) => setDemand({ ...demand, evaporationMmPerMonth: n })} />
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Water quality must also suit each use. Check the linked source in Site Analysis before relying on it for irrigation, fish or drinking.</p>
      </div>
    </div>
  )
}
