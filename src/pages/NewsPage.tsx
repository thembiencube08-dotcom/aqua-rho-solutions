import { useState, useEffect, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDroplet, faSeedling, faLeaf, faMicrochip, faHeartPulse,
  faArrowRotateRight, faNewspaper, faGear, faArrowUpRightFromSquare,
  faCircleInfo, faXmark, faCheck, faKey,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  type Article, type NewsCategory, type CategoryConfig,
  NEWS_CATEGORIES, fetchNews,
  loadCache, saveCache, isCacheStale, relativeTime,
} from '../lib/news'

// ── Icon lookup ────────────────────────────────────────────────────────────
const CAT_ICONS: Record<string, IconDefinition> = {
  'droplet':     faDroplet,
  'seedling':    faSeedling,
  'leaf':        faLeaf,
  'microchip':   faMicrochip,
  'heart-pulse': faHeartPulse,
}

export default function NewsPage() {
  const [activeTab, setActiveTab]       = useState<NewsCategory>('water')
  const [articles, setArticles]         = useState<Record<NewsCategory, Article[] | null>>({
    water: null, agriculture: null, environment: null, technology: null, health: null,
  })
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput]   = useState(
    () => localStorage.getItem('aquarho.gnews_api_key') ?? ''
  )
  const [keySaved, setKeySaved]         = useState(false)
  const [imgErrors, setImgErrors]       = useState<Set<string>>(new Set())

  const apiKey = localStorage.getItem('aquarho.gnews_api_key') ?? null

  const catConfig = (id: NewsCategory): CategoryConfig =>
    NEWS_CATEGORIES.find((c) => c.id === id)!

  const load = useCallback(async (cat: NewsCategory, force = false) => {
    // Check cache first
    if (!force) {
      const cached = loadCache(cat)
      if (cached && !isCacheStale(cached)) {
        setArticles((prev) => ({ ...prev, [cat]: cached.articles }))
        return
      }
    }
    setLoading(true)
    setError(null)
    try {
      const items = await fetchNews(catConfig(cat), apiKey)
      saveCache(cat, items)
      setArticles((prev) => ({ ...prev, [cat]: items }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch news. Try again.')
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  // Load on first render and on tab change
  useEffect(() => {
    void load(activeTab)
  }, [activeTab, load])

  function handleTabChange(cat: NewsCategory) {
    setActiveTab(cat)
    setError(null)
  }

  function saveApiKey() {
    const trimmed = apiKeyInput.trim()
    if (trimmed) localStorage.setItem('aquarho.gnews_api_key', trimmed)
    else         localStorage.removeItem('aquarho.gnews_api_key')
    setKeySaved(true)
    setShowSettings(false)
    // Invalidate cache for current tab to re-fetch with new key
    setTimeout(() => {
      setKeySaved(false)
      void load(activeTab, true)
    }, 1000)
  }

  const current = articles[activeTab]
  const hasApiKey = !!apiKey

  return (
    <div className="grid" style={{ gap: 20 }}>

      {/* ── Header panel ──────────────────────────────────────────── */}
      <div className="panel news-panel-header">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faNewspaper} style={{ color: 'var(--mandarin)' }} />
              Industry News
            </h2>
            <p className="muted small" style={{ margin: 0 }}>
              {hasApiKey
                ? 'Powered by GNews — 100 free requests/day.'
                : 'Showing Google News RSS results. Add a free GNews API key for better coverage.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn sm ghost"
              onClick={() => void load(activeTab, true)}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh news"
            >
              <FontAwesomeIcon icon={faArrowRotateRight} spin={loading} />
              {!loading && ' Refresh'}
            </button>
            <button
              className="btn sm ghost"
              onClick={() => setShowSettings(true)}
              title="News settings — add GNews API key"
              aria-label="News settings"
            >
              <FontAwesomeIcon icon={faGear} />
              {' '}Settings
            </button>
          </div>
        </div>

        {!hasApiKey && (
          <div className="news-key-nudge" onClick={() => setShowSettings(true)}>
            <FontAwesomeIcon icon={faKey} />
            <span>
              Add a free GNews API key for fresher, more accurate results — no credit card needed.
            </span>
            <span className="news-key-nudge-cta">Add key →</span>
          </div>
        )}
      </div>

      {/* ── Category tabs ─────────────────────────────────────────── */}
      <div className="subtab-bar">
        {NEWS_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`subtab ${activeTab === cat.id ? 'active' : ''}`}
            onClick={() => handleTabChange(cat.id)}
          >
            <FontAwesomeIcon
              icon={CAT_ICONS[cat.faIcon] ?? faNewspaper}
              style={{ marginRight: 5 }}
            />
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <div className="news-error">
          <FontAwesomeIcon icon={faCircleInfo} />
          <span>{error}</span>
          <button className="btn sm ghost" style={{ marginLeft: 'auto' }}
            onClick={() => void load(activeTab, true)}>
            Retry
          </button>
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {loading && (
        <div className="news-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="news-card news-card--skeleton">
              <div className="news-skeleton-img" />
              <div className="news-card-body">
                <div className="news-skeleton-line news-skeleton-line--wide" />
                <div className="news-skeleton-line" />
                <div className="news-skeleton-line news-skeleton-line--narrow" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!loading && !error && current !== null && current.length === 0 && (
        <div className="panel">
          <div className="empty-state">
            <FontAwesomeIcon icon={faNewspaper}
              style={{ fontSize: '2rem', color: 'var(--muted-light)', marginBottom: 10 }} />
            <p>No articles found for this category right now.</p>
            <button className="btn sm ghost" style={{ marginTop: 12 }}
              onClick={() => void load(activeTab, true)}>
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Article grid ──────────────────────────────────────────── */}
      {!loading && current && current.length > 0 && (
        <div className="news-grid">
          {current.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              imgError={imgErrors.has(article.id)}
              onImgError={(id) => setImgErrors((prev) => new Set(prev).add(id))}
            />
          ))}
        </div>
      )}

      {/* ── Null/first-load state ─────────────────────────────────── */}
      {!loading && !error && current === null && (
        <div className="panel">
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <FontAwesomeIcon icon={faArrowRotateRight} spin
              style={{ fontSize: '1.5rem', color: 'var(--brand-blue)', marginBottom: 10 }} />
            <p className="muted">Loading articles…</p>
          </div>
        </div>
      )}

      {/* ── Settings modal ────────────────────────────────────────── */}
      {showSettings && (
        <div className="brand-modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="brand-modal-content" style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="brand-modal-header">
              <div>
                <div className="brand-modal-subtitle">News Settings</div>
                <h3 style={{ margin: 0 }}>GNews API Key</h3>
              </div>
              <button className="brand-modal-close" onClick={() => setShowSettings(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="brand-modal-body" style={{ gap: 14 }}>
              <div className="news-info-box">
                <FontAwesomeIcon icon={faCircleInfo} style={{ flexShrink: 0, color: 'var(--brand-blue)' }} />
                <div>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '.875rem' }}>
                    Without a key — Google News RSS (free, no signup)
                  </p>
                  <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                    Articles are fetched from Google News RSS via a public proxy.
                    Coverage is good but limited to 10 articles per category.
                  </p>
                </div>
              </div>
              <div className="news-info-box">
                <FontAwesomeIcon icon={faKey} style={{ flexShrink: 0, color: 'var(--mandarin)' }} />
                <div>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '.875rem' }}>
                    With a GNews key — real-time, filtered results
                  </p>
                  <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--muted)' }}>
                    Free at{' '}
                    <a href="https://gnews.io" target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--brand-blue)' }}>gnews.io</a>
                    {' '}— no credit card needed. 100 requests/day on the free tier.
                    Key is stored in this browser only.
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="gnews-key" style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 4 }}>
                  GNews API Key
                </label>
                <input
                  id="gnews-key"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your GNews API key here…"
                  onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
                />
              </div>
            </div>
            <div className="brand-modal-footer">
              <button className="btn ghost sm"
                onClick={() => {
                  setApiKeyInput('')
                  localStorage.removeItem('aquarho.gnews_api_key')
                  setShowSettings(false)
                  void load(activeTab, true)
                }}>
                Clear Key
              </button>
              <button className="btn sm" onClick={saveApiKey}>
                {keySaved
                  ? <><FontAwesomeIcon icon={faCheck} /> Saved</>
                  : 'Save & Reload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Article Card ───────────────────────────────────────────────────────────

function ArticleCard({
  article, imgError, onImgError,
}: {
  article: Article
  imgError: boolean
  onImgError: (id: string) => void
}) {
  const showImage = !!article.image && !imgError

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card"
      aria-label={article.title}
    >
      {showImage && (
        <div className="news-card-img-wrap">
          <img
            src={article.image!}
            alt=""
            className="news-card-img"
            loading="lazy"
            onError={() => onImgError(article.id)}
          />
        </div>
      )}
      <div className="news-card-body">
        <div className="news-card-source">
          {article.source}
          {article.publishedAt && (
            <span className="news-card-time"> · {relativeTime(article.publishedAt)}</span>
          )}
        </div>
        <h3 className="news-card-title">{article.title}</h3>
        {article.description && (
          <p className="news-card-desc">{article.description}</p>
        )}
        <span className="news-card-read">
          Read article <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: '.7rem' }} />
        </span>
      </div>
    </a>
  )
}
