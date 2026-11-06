import { useState, useRef, useEffect, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSun, faCloud, faCloudSun, faSmog, faCloudRain, faCloudShowersHeavy,
  faSnowflake, faBolt, faWind, faDroplet, faArrowRotateRight,
  faMagnifyingGlass, faLocationDot, faTriangleExclamation, faCircleInfo,
  faTemperatureHalf,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  type WeatherData, type GeoLocation,
  wmoInfo, windDirLabel, waterNotes,
  geocode, fetchWeather, isStale,
} from '../lib/weather'
import { useLocalStorage } from '../lib/useLocalStorage'

/* ── FA icon lookup (maps string names from wmoInfo to real icons) ── */
const WX_FA: Record<string, IconDefinition> = {
  'sun':                  faSun,
  'cloud-sun':            faCloudSun,
  'cloud':                faCloud,
  'smog':                 faSmog,
  'cloud-rain':           faCloudRain,
  'cloud-showers-heavy':  faCloudShowersHeavy,
  'snowflake':            faSnowflake,
  'bolt':                 faBolt,
}
function WxIcon({ code, className = '' }: { code: number; className?: string }) {
  const info = wmoInfo(code)
  return (
    <FontAwesomeIcon
      icon={WX_FA[info.faIcon] ?? faCloud}
      className={className}
      aria-label={info.label}
      title={info.label}
    />
  )
}

function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

export default function WeatherPanel() {
  const [saved, setSaved] = useLocalStorage<WeatherData | null>('aquarho.weather', null)
  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [geoLoading, setGeoLoading]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  /* Auto-refresh stale cache on mount */
  const refresh = useCallback(async (loc: GeoLocation) => {
    setLoading(true)
    setError(null)
    try { setSaved(await fetchWeather(loc)) }
    catch { setError('Could not refresh. Check your connection.') }
    finally { setLoading(false) }
  }, [setSaved])

  useEffect(() => {
    if (saved && isStale(saved.fetchedAt)) void refresh(saved.location)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Debounced as-you-type geocode */
  function handleQueryChange(val: string) {
    setQuery(val)
    if (debounce.current) clearTimeout(debounce.current)
    if (val.trim().length < 2) { setSuggestions([]); setShowSuggest(false); return }
    debounce.current = setTimeout(async () => {
      setGeoLoading(true)
      try {
        const r = await geocode(val.trim())
        setSuggestions(r)
        setShowSuggest(r.length > 0)
      } catch { setSuggestions([]) }
      finally { setGeoLoading(false) }
    }, 360)
  }

  async function pickLocation(loc: GeoLocation) {
    setShowSuggest(false)
    setSuggestions([])
    setQuery(`${loc.name}, ${loc.country}`)
    setLoading(true)
    setError(null)
    try { setSaved(await fetchWeather(loc)) }
    catch { setError('Could not fetch weather for that location.') }
    finally { setLoading(false) }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setShowSuggest(false)
    setGeoLoading(true)
    setError(null)
    try {
      const r = await geocode(query.trim())
      if (!r.length) { setError('No location found — try a nearby city name.'); return }
      await pickLocation(r[0])
    } catch { setError('Geocoding failed. Check your connection.') }
    finally { setGeoLoading(false) }
  }

  const wx    = saved
  const notes = wx ? waterNotes(wx.current, wx.forecast) : []
  const updatedAt = wx
    ? new Date(wx.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="panel wx-panel">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FontAwesomeIcon icon={faCloudSun} style={{ color: 'var(--mandarin)' }} />
            Weather &amp; Conditions
          </h2>
          {wx && (
            <p className="muted small" style={{ margin: 0 }}>
              <FontAwesomeIcon icon={faLocationDot} style={{ marginRight: 4, color: 'var(--brand-blue)' }} />
              {wx.location.name}
              {wx.location.admin1 ? `, ${wx.location.admin1}` : ''}
              , {wx.location.country}
              {updatedAt && <span style={{ opacity: .65 }}> · Updated {updatedAt}</span>}
            </p>
          )}
        </div>
        {wx && (
          <button
            className="btn sm ghost"
            onClick={() => refresh(wx.location)}
            disabled={loading}
            aria-label="Refresh weather"
            title="Refresh"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} spin={loading} />
            {!loading && <> Refresh</>}
          </button>
        )}
      </div>

      {/* ── Location search ─────────────────────────────────────────── */}
      <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: wx ? 18 : 0 }}>
        <div className="wx-search-row">
          <div className="wx-search-wrap">
            <span className="wx-search-ico">
              <FontAwesomeIcon icon={geoLoading ? faMagnifyingGlass : faLocationDot} spin={geoLoading} />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
              placeholder="Search city or region (e.g. Bulawayo, Harare)…"
              className="wx-search-input"
              aria-label="Search for a location"
              aria-autocomplete="list"
              aria-expanded={showSuggest}
            />
          </div>
          <button type="submit" className="btn" disabled={loading || geoLoading || !query.trim()}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            {loading ? ' Loading…' : ' Search'}
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggest && (
          <ul className="wx-suggestions" role="listbox">
            {suggestions.map((loc) => (
              <li
                key={loc.id}
                className="wx-suggestion-item"
                role="option"
                aria-selected={false}
                onMouseDown={() => pickLocation(loc)}
              >
                <FontAwesomeIcon icon={faLocationDot} style={{ color: 'var(--brand-blue)', flexShrink: 0 }} />
                <span>
                  <strong>{loc.name}</strong>
                  {loc.admin1 ? `, ${loc.admin1}` : ''}, {loc.country}
                  <span style={{ color: 'var(--muted)', fontSize: '.75rem', marginLeft: 6 }}>
                    {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </form>

      {/* ── Error state ──────────────────────────────────────────────── */}
      {error && (
        <div className="wx-error">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {error}
        </div>
      )}

      {/* ── Empty state (no location yet) ────────────────────────────── */}
      {!wx && !error && !loading && (
        <div className="empty-state" style={{ padding: '28px 0 10px' }}>
          <FontAwesomeIcon
            icon={faCloudSun}
            style={{ fontSize: '2rem', color: 'var(--mandarin)', marginBottom: 10, display: 'block', margin: '0 auto 10px' }}
          />
          <p>Search for a city above to see current conditions and a 3-day forecast with water-management notes.</p>
        </div>
      )}

      {/* ── Loading spinner (first load) ─────────────────────────────── */}
      {loading && !wx && (
        <div className="empty-state" style={{ padding: '28px 0 10px' }}>
          <FontAwesomeIcon icon={faArrowRotateRight} spin style={{ fontSize: '1.5rem', color: 'var(--brand-blue)', marginBottom: 10 }} />
          <p className="muted">Fetching weather…</p>
        </div>
      )}

      {/* ── Main weather display ─────────────────────────────────────── */}
      {wx && (
        <>
          {/* Current conditions */}
          <div className="wx-current">
            <div className="wx-current-main">
              <WxIcon code={wx.current.code} className="wx-big-icon" />
              <div className="wx-temp-block">
                <span className="wx-temp">{Math.round(wx.current.temp)}°</span>
                <span className="wx-feels">Feels {Math.round(wx.current.feelsLike)}°</span>
              </div>
              <div className="wx-condition">{wmoInfo(wx.current.code).label}</div>
            </div>

            <div className="wx-current-stats">
              <div className="wx-stat">
                <FontAwesomeIcon icon={faDroplet} className="wx-stat-icon" />
                <span className="wx-stat-label">Humidity</span>
                <span className="wx-stat-value">{wx.current.humidity}%</span>
              </div>
              <div className="wx-stat">
                <FontAwesomeIcon icon={faWind} className="wx-stat-icon" />
                <span className="wx-stat-label">Wind</span>
                <span className="wx-stat-value">{Math.round(wx.current.windSpeed)} km/h {windDirLabel(wx.current.windDir)}</span>
              </div>
              <div className="wx-stat">
                <FontAwesomeIcon icon={faCloudRain} className="wx-stat-icon" />
                <span className="wx-stat-label">Precip</span>
                <span className="wx-stat-value">{wx.current.precipitation.toFixed(1)} mm</span>
              </div>
              <div className="wx-stat">
                <FontAwesomeIcon icon={faTemperatureHalf} className="wx-stat-icon" />
                <span className="wx-stat-label">ET₀ today</span>
                <span className="wx-stat-value">
                  {wx.forecast[0]?.evaporation.toFixed(1) ?? '—'} mm
                </span>
              </div>
            </div>
          </div>

          {/* 3-day forecast strip (days 1-3, skip today at index 0) */}
          <div className="wx-forecast">
            {wx.forecast.slice(1, 4).map((day, i) => (
              <div key={day.date} className="wx-day">
                <span className="wx-day-label">{dayLabel(day.date, i + 1)}</span>
                <WxIcon code={day.code} className="wx-day-icon" />
                <span className="wx-day-temps">
                  <span className="wx-day-hi">{Math.round(day.tempMax)}°</span>
                  <span className="wx-day-lo">{Math.round(day.tempMin)}°</span>
                </span>
                <div className="wx-day-precip">
                  <FontAwesomeIcon icon={faCloudRain} style={{ fontSize: '.65rem', opacity: .6 }} />
                  {' '}{day.precipSum.toFixed(1)} mm
                  {day.precipProb > 0 && <span className="wx-day-prob"> {day.precipProb}%</span>}
                </div>
                <div className="wx-day-evap" title="Reference evapotranspiration (FAO-56)">
                  ET₀ {day.evaporation.toFixed(1)} mm
                </div>
              </div>
            ))}
          </div>

          {/* Water-relevance notes */}
          {notes.length > 0 && (
            <div className="wx-notes">
              <div className="wx-notes-heading">
                <FontAwesomeIcon icon={faCircleInfo} style={{ color: 'var(--brand-blue)' }} />
                Water-management implications
              </div>
              {notes.map((n, i) => (
                <div key={i} className={`wx-note wx-note--${n.level}`}>
                  <FontAwesomeIcon
                    icon={n.level === 'action' ? faTriangleExclamation : n.level === 'watch' ? faTriangleExclamation : faCircleInfo}
                    className="wx-note-icon"
                  />
                  <span>{n.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Attribution */}
          <p className="muted small" style={{ marginTop: 14, marginBottom: 0, opacity: .65 }}>
            Weather data from{' '}
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-blue)' }}>
              Open-Meteo
            </a>
            {' '}· ET₀ = FAO-56 reference evapotranspiration.
          </p>
        </>
      )}
    </div>
  )
}
