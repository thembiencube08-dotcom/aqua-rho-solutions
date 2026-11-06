import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faCheck, faDownload, faCopy } from '@fortawesome/free-solid-svg-icons'
import BrandLogo from './BrandLogo'

interface Props {
  isOpen: boolean
  onClose: () => void
}

/* Standalone SVG export of the full wordmark — faithful to the official logo. */
const LOGO_SVG = `<svg width="280" height="90" viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Arc crest: outer navy, inner aqua -->
  <g transform="translate(35, 0)">
    <path d="M 1 30 C 20 28, 38 5, 74 2 C 92 1, 108 11, 119 22"
          stroke="#0D3349" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M 12 30 C 30 25, 46 10, 78 7 C 96 6, 110 14, 119 25"
          stroke="#4EA3CA" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  </g>

  <!-- Wordmark -->
  <text x="35" y="72"
        font-family="Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
        font-weight="800" font-size="38" letter-spacing="-1"
        fill="#0D3349">Aqua</text>
  <text x="133" y="72"
        font-family="Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
        font-weight="800" font-size="38" letter-spacing="-1"
        fill="#C93917">Rho</text>

  <!-- SOLUTIONS rule + label -->
  <line x1="35"  y1="82" x2="58"  y2="82" stroke="#0D3349" stroke-width="1.5" opacity="0.55"/>
  <text x="65" y="85"
        font-family="Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
        font-weight="700" font-size="10" letter-spacing="3.5"
        fill="#0D3349">SOLUTIONS</text>
  <line x1="212" y1="82" x2="244" y2="82" stroke="#0D3349" stroke-width="1.5" opacity="0.55"/>
</svg>`

export default function BrandGuideModal({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  if (!isOpen) return null

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2500)
  }

  function downloadSvg(svgContent: string, filename: string) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="brand-modal-backdrop" onClick={onClose}>
      <div className="brand-modal-content" onClick={(e) => e.stopPropagation()}>

        <div className="brand-modal-header">
          <div>
            <div className="brand-modal-subtitle">Brand System & Identity</div>
            <h2 className="brand-modal-title">AquaRho Solutions</h2>
          </div>
          <button className="brand-modal-close" onClick={onClose} aria-label="Close modal">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="brand-modal-body">

          {/* ── Logo Showcase ───────────────────────────────────────── */}
          <div className="brand-showcase-grid">

            {/* Full wordmark on white */}
            <div className="brand-card">
              <div className="brand-card-header">
                <span className="brand-card-tag">Primary Lockup</span>
                <span className="muted small">Sidebar & Header</span>
              </div>
              <div className="brand-card-preview light" style={{ padding: '28px 32px' }}>
                <BrandLogo size="lg" variant="full" />
              </div>
              <div className="brand-card-actions">
                <button className="btn ghost sm" onClick={() => downloadSvg(LOGO_SVG, 'aquarho-logo.svg')}>
                  <FontAwesomeIcon icon={faDownload} /> Download SVG
                </button>
                <button className="btn sm" onClick={() => handleCopy(LOGO_SVG, 'svg')}>
                  {copied === 'svg'
                    ? <><FontAwesomeIcon icon={faCheck} /> Copied</>
                    : <><FontAwesomeIcon icon={faCopy} /> Copy SVG</>}
                </button>
              </div>
            </div>

            {/* Horizontal compact (sidebar-sm size) */}
            <div className="brand-card">
              <div className="brand-card-header">
                <span className="brand-card-tag">Compact — No Tagline</span>
                <span className="muted small">App icon & small UI contexts</span>
              </div>
              <div className="brand-card-preview light" style={{ background: '#f8fafc', padding: '28px 32px' }}>
                <BrandLogo size="md" variant="horizontal" />
              </div>
              <div className="brand-card-actions">
                <button className="btn ghost sm" onClick={() => handleCopy('AquaRho Solutions', 'text')}>
                  {copied === 'text'
                    ? <><FontAwesomeIcon icon={faCheck} /> Copied</>
                    : <><FontAwesomeIcon icon={faCopy} /> Copy Name</>}
                </button>
              </div>
            </div>
          </div>

          {/* ── Logo Anatomy ─────────────────────────────────────────── */}
          <div className="brand-philosophy-box">
            <h4>Logo Anatomy</h4>
            <div className="brand-points-grid">

              <div className="brand-point">
                <div className="brand-point-icon">〜</div>
                <div>
                  <strong>Fluid Arc Crest</strong>
                  <p>
                    The sweeping arc above the wordmark represents a water surface in motion —
                    it transitions from deep navy on the left to light aqua on the right, conveying
                    flow, clarity, and precision engineering.
                  </p>
                </div>
              </div>

              <div className="brand-point">
                <div className="brand-point-icon" style={{ color: '#0D3349', background: '#edf5f8' }}>Aq</div>
                <div>
                  <strong>"Aqua" in Deep Navy (#0D3349)</strong>
                  <p>
                    The first half of the wordmark uses the deep navy to signal trust,
                    authority, and the depth of water.
                  </p>
                </div>
              </div>

              <div className="brand-point">
                <div className="brand-point-icon" style={{ color: '#C93917', background: '#fae9e6' }}>Rh</div>
                <div>
                  <strong>"Rho" in Red-Orange (#C93917)</strong>
                  <p>
                    Rho (ρ) is the physics symbol for water density. Its red-orange colour
                    signals energy, urgency, and action — the engineering side of the brand.
                  </p>
                </div>
              </div>

              <div className="brand-point">
                <div className="brand-point-icon">—</div>
                <div>
                  <strong>SOLUTIONS Wordmark</strong>
                  <p>
                    Letter-spaced small-caps flanked by thin rules. Grounds the mark as a
                    professional solutions brand rather than a product name alone.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* ── Colour Palette ───────────────────────────────────────── */}
          <div className="brand-colors-section">
            <h4>Official Brand Palette</h4>
            <div className="brand-swatches">
              <div className="brand-swatch">
                <div className="swatch-color" style={{ background: '#0D3349' }} />
                <div className="swatch-info">
                  <strong>Deep Navy</strong>
                  <code>#0D3349</code>
                  <span className="muted small">Primary wordmark</span>
                </div>
              </div>
              <div className="brand-swatch">
                <div className="swatch-color" style={{ background: '#C93917' }} />
                <div className="swatch-info">
                  <strong>Red-Orange</strong>
                  <code>#C93917</code>
                  <span className="muted small">"Rho" + action states</span>
                </div>
              </div>
              <div className="brand-swatch">
                <div className="swatch-color" style={{ background: '#4EA3CA' }} />
                <div className="swatch-info">
                  <strong>Aqua Blue</strong>
                  <code>#4EA3CA</code>
                  <span className="muted small">Arc tip + UI accent</span>
                </div>
              </div>
              <div className="brand-swatch">
                <div className="swatch-color" style={{ background: '#F28C28' }} />
                <div className="swatch-info">
                  <strong>Mandarin</strong>
                  <code>#F28C28</code>
                  <span className="muted small">Texture + warmth</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="brand-modal-footer">
          <div className="muted small">
            Vector logo SVG is embedded in the app. Update <code>/public/favicon.svg</code> to use the new logo as the browser icon.
          </div>
          <button className="btn" onClick={onClose}>Done</button>
        </div>

      </div>
    </div>
  )
}
