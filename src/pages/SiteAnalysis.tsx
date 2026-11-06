import { useState } from 'react'
import React from 'react'
import type { ParamKey, Site } from '../types'
import { SOURCE_LABELS } from '../types'
import {
  DRINKING_RULES, FISH_RULES, FORM_KEYS, IRRIGATION_RULES, PARAM_META, evaluate, worst,
} from '../lib/rules'
import type { Rule } from '../lib/rules'
import { JAR_TEST_STEPS, alumBand, jarSeries, treatmentPlan } from '../lib/treatment'
import { outlook } from '../lib/outlook'
import { Badge, Disclaimer, FindingList } from '../ui'

type Tab = 'drinking' | 'ground' | 'irrigation' | 'fish' | 'jar'

const TABS: { id: Tab; label: string; icon: () => React.ReactElement }[] = [
  { id: 'drinking',   label: 'Drinking & Treatment', icon: IconDroplet },
  { id: 'ground',     label: 'Groundwater Outlook',  icon: IconLayers  },
  { id: 'irrigation', label: 'Irrigation',            icon: IconLeaf    },
  { id: 'fish',       label: 'Fish Pond',             icon: IconFish    },
  { id: 'jar',        label: 'Jar Test',              icon: IconFlask   },
]

const GROUPS = ['Core', 'Mineral', 'Contaminants', 'Biological', 'Aquaculture']

/* ── Icons ─────────────────────────────────────────────────────────── */
function IconDroplet() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-6 5-6 10a6 6 0 0 0 12 0c0-5-6-10-6-10z"/></svg>
}
function IconLayers() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
}
function IconLeaf() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
}
function IconFish() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/></svg>
}
function IconFlask() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M9 3v7l-5 8a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 18l-5-8V3"/></svg>
}

export default function SiteAnalysis({ site, update }: { site: Site; update: (s: Site) => void }) {
  const [tab, setTab] = useState<Tab>('drinking')
  // Raw text buffers so users can type decimals (e.g. 6.9) without the
  // intermediate "." being stripped by number round-tripping on every keystroke.
  const [raw, setRaw] = useState<Record<string, string>>({})

  const displayFor = (k: ParamKey) =>
    raw[k] !== undefined ? raw[k] : site.sample[k] !== undefined ? String(site.sample[k]) : ''
  const flowDisplay = raw['__flow'] !== undefined ? raw['__flow'] : site.flow !== undefined ? String(site.flow) : ''

  function setParam(key: ParamKey, text: string) {
    setRaw((prev) => ({ ...prev, [key]: text }))
    const sample = { ...site.sample }
    if (text === '') delete sample[key]
    else {
      const n = Number(text)
      if (!Number.isNaN(n)) sample[key] = n
    }
    update({ ...site, sample })
  }

  const drinking   = evaluate(DRINKING_RULES,   site.sample)
  const irrigation = evaluate(IRRIGATION_RULES, site.sample)
  const fish       = evaluate(FISH_RULES,       site.sample)

  const missingFor = (rules: Rule[], found: { key: ParamKey }[]) =>
    rules.filter((r) => !found.some((f) => f.key === r.key)).map((r) => PARAM_META[r.key].label)

  const hasData = Object.keys(site.sample).length > 0
  const filledCount = Object.keys(site.sample).length

  return (
    <div className="grid" style={{ gap: 20 }}>

      {/* ── Site metadata + parameter inputs ────────────────────── */}
      <div className="panel">
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>{site.name}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="chip">{SOURCE_LABELS[site.type]}</span>
              <span className="muted small">Sampled {site.date}</span>
              {filledCount > 0 && (
                <span className="chip" style={{ color: 'var(--green)', borderColor: 'var(--green-mid)', background: 'var(--green-dim)' }}>
                  {filledCount} param{filledCount !== 1 ? 's' : ''} entered
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta fields */}
        <div className="row" style={{ marginBottom: 18 }}>
          <div>
            <label htmlFor="site-name">Source name</label>
            <input
              id="site-name"
              value={site.name}
              onChange={(e) => update({ ...site, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="site-date">Sample date</label>
            <input
              id="site-date"
              type="date"
              value={site.date}
              onChange={(e) => update({ ...site, date: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="site-flow">Treated flow (m³/day)</label>
            <input
              id="site-flow"
              type="number"
              min={0}
              value={flowDisplay}
              onChange={(e) => {
                const text = e.target.value
                setRaw((prev) => ({ ...prev, __flow: text }))
                update({ ...site, flow: text === '' ? undefined : Number(text) })
              }}
            />
          </div>
        </div>

        <p className="muted small" style={{ marginBottom: 16 }}>
          Enter whatever you measured and leave the rest blank. EC and TDS convert to each other,
          and hardness and SAR are derived from calcium, magnesium and sodium.
        </p>

        {/* Parameter groups */}
        {GROUPS.map((g) => {
          const keys = FORM_KEYS.filter((k) => PARAM_META[k].group === g)
          if (!keys.length) return null
          return (
            <div key={g}>
              <div className="group-heading">{g}</div>
              <div className="fields" style={{ marginBottom: 8 }}>
                {keys.map((k) => (
                  <div key={k}>
                    <label htmlFor={`p-${k}`}>
                      {PARAM_META[k].label}
                      {PARAM_META[k].unit ? ` (${PARAM_META[k].unit})` : ''}
                    </label>
                    <input
                      id={`p-${k}`}
                      type="number"
                      step={PARAM_META[k].step}
                      value={displayFor(k)}
                      onChange={(e) => setParam(k, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Analysis tabs ────────────────────────────────────────── */}
      <div>
        {/* Tab bar */}
        <div className="subtab-bar">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                className={`subtab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon />
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>

        {!hasData && tab !== 'jar' && (
          <div className="panel">
            <div className="empty-state">
              <p>Enter at least one test result above to see analysis results.</p>
            </div>
          </div>
        )}

        {tab === 'drinking'   && hasData && <Drinking site={site} findings={drinking} />}
        {tab === 'ground'     && hasData && <Ground site={site} />}
        {tab === 'irrigation' && hasData && (
          <div className="panel">
            <div className="section-header">
              <h2>Irrigation Suitability</h2>
              <Badge level={worst(irrigation)} />
            </div>
            <FindingList
              findings={irrigation}
              missing={missingFor(IRRIGATION_RULES, irrigation)}
              empty="Add EC/TDS, pH, chloride or sodium with calcium and magnesium (for SAR) to assess irrigation suitability."
            />
            <Disclaimer />
          </div>
        )}
        {tab === 'fish' && hasData && (
          <div className="panel">
            <div className="section-header">
              <h2>Fish Pond Suitability</h2>
              <Badge level={worst(fish)} />
            </div>
            <p className="muted small" style={{ marginTop: -8, marginBottom: 14 }}>
              Ranges for warm-water species such as tilapia and catfish.
            </p>
            <FindingList
              findings={fish}
              missing={missingFor(FISH_RULES, fish)}
              empty="Add temperature, pH, dissolved oxygen, ammonia or nitrite to assess pond suitability."
            />
            <Disclaimer />
          </div>
        )}
        {tab === 'jar' && <JarTest site={site} />}
      </div>

    </div>
  )
}

/* ── Sub-panels ─────────────────────────────────────────────────────── */

function Drinking({ site, findings }: { site: Site; findings: ReturnType<typeof evaluate> }) {
  const steps   = treatmentPlan(site.sample, site.type, site.flow)
  const overall = worst(findings)

  return (
    <div className="grid grid-2" style={{ gap: 16 }}>
      <div className="panel">
        <div className="section-header">
          <h2>Water Quality vs WHO Guidelines</h2>
          <Badge level={overall} />
        </div>
        <FindingList findings={findings} empty="No drinking-water parameters entered yet." />
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 16 }}>Treatment Needed</h2>
        {overall === 'good' && (
          <p className="muted">
            All entered parameters are within guideline values. Keep a disinfectant residual and re-test regularly.
          </p>
        )}
        {steps.map((s, i) => (
          <div className="step" key={s.stage}>
            <div className="step-title">{i + 1}. {s.stage}</div>
            <div className="step-why">{s.why}</div>
            <div style={{ fontSize: '.875rem' }}>{s.detail}</div>
          </div>
        ))}
        <Disclaimer />
      </div>
    </div>
  )
}

function Ground({ site }: { site: Site }) {
  const drinking = evaluate(DRINKING_RULES, site.sample)
  const o        = outlook(site.sample, site.type, drinking)
  const level    = o.status === 'Good' ? 'good' : o.status.startsWith('Advanced') ? 'poor' : 'watch'

  return (
    <div className="grid grid-2" style={{ gap: 16 }}>
      <div className="panel">
        <div className="section-header">
          <h2>Predicted Status</h2>
          <Badge level={level} />
        </div>
        <p style={{ fontWeight: 600, marginBottom: 10 }}>{o.status}</p>
        {o.reasons.length > 0 && (
          <ul className="clean">
            {o.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: 10 }}>Scaling &amp; Corrosion (Langelier Index)</h3>
        {o.lsi ? (
          <p style={{ fontSize: '.875rem' }}>LSI {o.lsi.value}. {o.lsi.text}</p>
        ) : (
          <p className="muted small">
            Enter pH, calcium, alkalinity and TDS (or EC) to calculate scaling versus corrosion tendency.
          </p>
        )}
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: 10 }}>How to Improve this Source</h3>
        <ul className="clean">
          {o.improvements.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: 10 }}>Typical Risks — {SOURCE_LABELS[site.type]}</h3>
        <ul className="clean">
          {o.risks.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <p className="muted small" style={{ marginTop: 12 }}>
          This outlook is rule-based, not a trained model. Add more samples over seasons to track how the source behaves.
        </p>
      </div>
    </div>
  )
}

function JarTest({ site }: { site: Site }) {
  const turb = site.sample.turbidity
  const band = alumBand(turb ?? 20)
  const [center, setCenter] = useState<number | null>(null)
  const c      = center ?? band.mid
  const series = jarSeries(c)

  return (
    <div className="grid grid-2" style={{ gap: 16 }}>
      <div className="panel">
        <h2 style={{ marginBottom: 14 }}>Jar Test Guideline</h2>
        <ol className="clean">
          {JAR_TEST_STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: 12 }}>Dose Planner — 1% Alum Stock</h3>
        <div className="row" style={{ marginBottom: 14 }}>
          <div>
            <label htmlFor="jar-center">Central alum dose (mg/L)</label>
            <input
              id="jar-center"
              type="number"
              min={1}
              value={c}
              onChange={(e) => setCenter(Number(e.target.value) || null)}
            />
          </div>
        </div>
        <p className="muted small" style={{ marginBottom: 14 }}>
          {turb !== undefined
            ? `Suggested from turbidity ${turb} NTU: ${band.low}–${band.high} mg/L.`
            : 'No turbidity entered — a mid-range starting value is shown.'}
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Jar</th>
                <th>Alum dose (mg/L)</th>
                <th>Stock to add (mL)</th>
              </tr>
            </thead>
            <tbody>
              {series.map((j, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{j.dose}</td>
                  <td>{j.mL.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Disclaimer />
      </div>
    </div>
  )
}
