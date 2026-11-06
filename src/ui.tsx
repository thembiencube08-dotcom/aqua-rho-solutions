import type { Finding, Level } from './types'

const LABELS: Record<Level | 'none', string> = {
  good:  'Good',
  watch: 'Watch',
  poor:  'Action needed',
  none:  'No data',
}

export function Badge({ level }: { level: Level | 'none' }) {
  return <span className={`badge ${level}`}>{LABELS[level]}</span>
}

export function FindingList({
  findings,
  empty,
  missing = [],
}: {
  findings: Finding[]
  empty: string
  missing?: string[]
}) {
  if (findings.length === 0) return <p className="muted">{empty}</p>

  return (
    <div>
      {missing.length > 0 && (
        <p className="muted small" style={{ marginBottom: 12 }}>
          Not yet assessed (no value entered): {missing.join(', ')}.
        </p>
      )}
      {findings.map((f) => (
        <div className="finding" key={f.key}>
          <div>
            <div className="finding-label">{f.label}</div>
            <div className="finding-val">
              <span>
                {f.value} {f.unit}
              </span>
              <Badge level={f.level} />
            </div>
          </div>
          <div className="muted" style={{ fontSize: '.85rem', lineHeight: 1.55 }}>
            {f.message}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Disclaimer() {
  return (
    <div className="disclaimer">
      Indicative guidance from WHO drinking-water guidelines and FAO irrigation guidelines. Doses are
      starting points for jar tests and bench trials, not final design. Confirm critical results
      (arsenic, fluoride, microbiology) with an accredited laboratory before putting water into service.
    </div>
  )
}
