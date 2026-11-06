import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLocationDot,
  faMagnifyingGlass,
  faLayerGroup,
  faCircleInfo,
  faArrowUpRightFromSquare,
  faCrosshairs,
  faPlus,
  faXmark,
  faBolt,
  faExpand,
} from '@fortawesome/free-solid-svg-icons'
import type { Site, SourceType } from '../types'
import { SOURCE_LABELS } from '../types'
import { DRINKING_RULES, evaluate, worst } from '../lib/rules'
import { geocode } from '../lib/weather'
import { DEMO_SITES } from '../demo'

// ── Fix Leaflet default icon path broken by Vite ──────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

;(L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl = undefined
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

// ── Status colours ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  good: '#4EA3CA',
  watch: '#d97706',
  poor: '#C93917',
  none: '#64748b',
}

const STATUS_LABEL: Record<string, string> = {
  good: 'Meets assessed limits',
  watch: 'Watch — review needed',
  poor: 'Action needed',
  none: 'Not yet assessed',
}

function makePinIcon(color: string, isSelected = false) {
  return L.divIcon({
    className: 'custom-map-pin-wrapper',
    html: `
      <div class="custom-map-pin ${isSelected ? 'selected' : ''}">
        <div class="map-pin-pulse" style="background:${color};"></div>
        <div class="map-pin-inner" style="background:${color};"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  })
}

// ── Tile layers ────────────────────────────────────────────────────────────
const TILES = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    label: 'Street',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: 'Tiles © <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>',
    label: 'Satellite',
  },
}
type TileKey = keyof typeof TILES

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  sites: Site[]
  setSites: (s: Site[]) => void
  onOpenSite: (id: string) => void
}

export default function MapPage({ sites, setSites, onOpenSite }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.FeatureGroup | null>(null)
  const markerMap = useRef<Map<string, L.Marker>>(new Map())
  const initialFittedRef = useRef(false)

  // Modes & interactive state
  const [tileKey, setTileKey] = useState<TileKey>('street')
  const [searchQ, setSearchQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [selected, setSelected] = useState<Site | null>(null)

  // Pinning workflows
  const [placingSite, setPlacingSite] = useState<Site | null>(null)
  const [isDroppingNew, setIsDroppingNew] = useState(false)
  const [newSiteModalCoords, setNewSiteModalCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [newSiteName, setNewSiteName] = useState('')
  const [newSiteType, setNewSiteType] = useState<SourceType>('borehole')

  // Keep ref copies for event handlers
  const placingSiteRef = useRef<Site | null>(null)
  placingSiteRef.current = placingSite

  const isDroppingNewRef = useRef(false)
  isDroppingNewRef.current = isDroppingNew

  const sitesRef = useRef<Site[]>(sites)
  sitesRef.current = sites

  // ── Fly to location ───────────────────────────────────────────────────
  const flyTo = useCallback((lat: number, lng: number, zoom = 14) => {
    mapRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 })
  }, [])

  // ── Initialize Map ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [-20.15, 28.58], // Centered around Matabeleland / Bulawayo
      zoom: 10,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    tileRef.current = L.tileLayer(TILES.street.url, {
      attribution: TILES.street.attr,
      maxZoom: 19,
    }).addTo(map)

    const markersGroup = L.featureGroup().addTo(map)
    markersLayerRef.current = markersGroup

    // Handle map click for placement modes
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Math.round(e.latlng.lat * 1e6) / 1e6
      const lng = Math.round(e.latlng.lng * 1e6) / 1e6

      if (placingSiteRef.current) {
        const target = placingSiteRef.current
        const updated = { ...target, lat, lng }
        setSites(sitesRef.current.map((s) => (s.id === target.id ? updated : s)))
        setPlacingSite(null)
        setSelected(updated)
        flyTo(lat, lng, 14)
        return
      }

      if (isDroppingNewRef.current) {
        setNewSiteModalCoords({ lat, lng })
        setIsDroppingNew(false)
        return
      }
    })

    // ResizeObserver ensures leaflet tiles calculate size correctly
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(containerRef.current)

    // Warm-up invalidateSize calls to eliminate grey tiles
    setTimeout(() => map.invalidateSize(), 150)
    setTimeout(() => map.invalidateSize(), 400)

    mapRef.current = map

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [flyTo, setSites])

  // ── Swap tile layer ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    tileRef.current?.remove()
    tileRef.current = L.tileLayer(TILES[tileKey].url, {
      attribution: TILES[tileKey].attr,
      maxZoom: 19,
    }).addTo(map)
  }, [tileKey])

  // ── Update cursor when in placement modes ─────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    if (placingSite || isDroppingNew) {
      containerRef.current.style.cursor = 'crosshair'
    } else {
      containerRef.current.style.cursor = ''
    }
  }, [placingSite, isDroppingNew])

  // ── Sync markers with sites list ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const markersGroup = markersLayerRef.current
    if (!map || !markersGroup) return

    const livePlaced = sites.filter((s) => s.lat != null && s.lng != null)
    const liveIds = new Set(livePlaced.map((s) => s.id))

    // Remove stale markers
    markerMap.current.forEach((marker, id) => {
      if (!liveIds.has(id)) {
        marker.remove()
        markerMap.current.delete(id)
      }
    })

    // Add or update markers
    livePlaced.forEach((site) => {
      const findings = evaluate(DRINKING_RULES, site.sample)
      const status = worst(findings)
      const color = STATUS_COLOR[status]
      const isSel = selected?.id === site.id
      const icon = makePinIcon(color, isSel)

      let marker = markerMap.current.get(site.id)

      if (marker) {
        marker.setLatLng([site.lat!, site.lng!])
        marker.setIcon(icon)
      } else {
        marker = L.marker([site.lat!, site.lng!], { icon })
        marker.addTo(markersGroup)
        marker.on('click', () => {
          setSelected(site)
        })
        markerMap.current.set(site.id, marker)
      }

      // Bind rich popup
      const popupCard = document.createElement('div')
      popupCard.className = 'map-popup-card'
      popupCard.innerHTML = `
        <div class="map-popup-header">
          <span class="map-popup-title">${site.name}</span>
          <span class="map-popup-badge" style="background:${color}20; color:${color}; border: 1px solid ${color}40;">
            ${STATUS_LABEL[status]}
          </span>
        </div>
        <div class="map-popup-sub">${SOURCE_LABELS[site.type]} · Sampled ${site.date}</div>
        <div class="map-popup-coords">${site.lat!.toFixed(4)}°, ${site.lng!.toFixed(4)}°</div>
        <button class="map-popup-btn" type="button">
          Open Analysis →
        </button>
      `
      const actionBtn = popupCard.querySelector('.map-popup-btn')
      actionBtn?.addEventListener('click', () => {
        onOpenSite(site.id)
      })
      marker.bindPopup(popupCard)
    })

    // Fit bounds on initial load if sites have coordinates
    if (!initialFittedRef.current && livePlaced.length > 0) {
      initialFittedRef.current = true
      const bounds = markersGroup.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
      }
    }
  }, [sites, selected, onOpenSite])

  // ── Fit All Sites Helper ──────────────────────────────────────────────
  function handleFitAll() {
    if (!mapRef.current || !markersLayerRef.current) return
    const bounds = markersLayerRef.current.getBounds()
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }

  // ── Auto-locate demo sites helper ─────────────────────────────────────
  function handleAutoLocateDemo() {
    const updated = sites.map((s) => {
      if (s.lat == null || s.lng == null) {
        const match = DEMO_SITES.find(
          (d) => d.id === s.id || d.name.toLowerCase() === s.name.toLowerCase()
        )
        if (match && match.lat && match.lng) {
          return { ...s, lat: match.lat, lng: match.lng }
        }
      }
      return s
    })
    setSites(updated)
    setSearchErr(null)

    setTimeout(() => {
      if (mapRef.current && markersLayerRef.current) {
        const bounds = markersLayerRef.current.getBounds()
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
        }
      }
    }, 150)
  }

  // ── Location search ───────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQ.trim()) return
    setSearching(true)
    setSearchErr(null)
    try {
      const results = await geocode(searchQ.trim())
      if (!results.length) {
        setSearchErr(`No location found for "${searchQ.trim()}".`)
        return
      }
      const loc = results[0]
      flyTo(loc.latitude, loc.longitude, 12)
    } catch {
      setSearchErr('Search failed — check your internet connection.')
    } finally {
      setSearching(false)
    }
  }

  // ── Device GPS ────────────────────────────────────────────────────────
  function useMyLocation() {
    if (!navigator.geolocation) {
      setSearchErr('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setSearchErr(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyTo(pos.coords.latitude, pos.coords.longitude, 13)
        setLocating(false)
      },
      () => {
        setSearchErr('Could not retrieve your location. Check browser permissions.')
        setLocating(false)
      }
    )
  }

  // ── Modal submit: Add new source ──────────────────────────────────────
  function handleCreateNewSite(e: React.FormEvent) {
    e.preventDefault()
    if (!newSiteModalCoords || !newSiteName.trim()) return

    const newSite: Site = {
      id: crypto.randomUUID(),
      name: newSiteName.trim(),
      type: newSiteType,
      sample: {},
      date: new Date().toISOString().slice(0, 10),
      lat: newSiteModalCoords.lat,
      lng: newSiteModalCoords.lng,
    }

    setSites([...sites, newSite])
    setSelected(newSite)
    setNewSiteModalCoords(null)
    setNewSiteName('')
    flyTo(newSite.lat!, newSite.lng!, 14)
  }

  // ── Remove pin from map (keeps site data) ─────────────────────────────
  function handleUnpin(site: Site) {
    const updated = sites.map((s) => (s.id === site.id ? { ...s, lat: undefined, lng: undefined } : s))
    setSites(updated)
    if (selected?.id === site.id) {
      setSelected({ ...site, lat: undefined, lng: undefined })
    }
  }

  // ── Computations ──────────────────────────────────────────────────────
  const sitesWithCoords = sites.filter((s) => s.lat != null && s.lng != null)
  const sitesNoCoords = sites.filter((s) => s.lat == null || s.lng == null)

  const hasUnplacedDemo = sitesNoCoords.some((s) =>
    DEMO_SITES.some((d) => d.id === s.id || d.name.toLowerCase() === s.name.toLowerCase())
  )

  const selectedFindings = selected ? evaluate(DRINKING_RULES, selected.sample) : []
  const selectedStatus = selected ? worst(selectedFindings) : 'none'
  const selectedColor = STATUS_COLOR[selectedStatus]

  return (
    <div className="map-page">
      {/* ── Toolbar: Search + Action Buttons ────────────────────────────── */}
      <div className="map-toolbar">
        <form onSubmit={handleSearch} className="map-search-form">
          <div className="map-search-wrap">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="map-search-ico" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search city, district or region…"
              className="map-search-input"
              aria-label="Search location"
            />
          </div>
          <button type="submit" className="btn sm" disabled={searching || !searchQ.trim()}>
            {searching ? 'Searching…' : 'Go'}
          </button>
        </form>

        <div className="map-ctrl-group">
          <button
            type="button"
            className="btn sm ghost"
            onClick={useMyLocation}
            disabled={locating}
            title="Locate my position via device GPS"
          >
            <FontAwesomeIcon icon={faLocationDot} spin={locating} />
            <span>{locating ? 'Locating…' : 'My Location'}</span>
          </button>

          <button
            type="button"
            className={`btn sm ${isDroppingNew ? 'primary' : 'ghost'}`}
            onClick={() => {
              setPlacingSite(null)
              setIsDroppingNew((prev) => !prev)
            }}
            title="Drop a new source pin directly onto the map"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>{isDroppingNew ? 'Cancel Pin' : 'Add Source'}</span>
          </button>

          <button
            type="button"
            className="btn sm ghost"
            onClick={() => setTileKey((k) => (k === 'street' ? 'satellite' : 'street'))}
            title="Switch map layer"
          >
            <FontAwesomeIcon icon={faLayerGroup} />
            <span>{TILES[tileKey === 'street' ? 'satellite' : 'street'].label}</span>
          </button>

          {hasUnplacedDemo && (
            <button
              type="button"
              className="btn sm ghost"
              onClick={handleAutoLocateDemo}
              title="Automatically place demo water sources in Matabeleland"
              style={{ color: 'var(--brand-blue)' }}
            >
              <FontAwesomeIcon icon={faBolt} />
              <span>Locate Demo Sites</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Active Placement Mode Banner ─────────────────────────────────── */}
      {placingSite && (
        <div className="map-mode-banner">
          <div className="map-mode-banner-text">
            <FontAwesomeIcon icon={faCrosshairs} />
            <span>
              <strong>Repositioning Mode:</strong> Click anywhere on the map to set the location for{' '}
              <em>"{placingSite.name}"</em>
            </span>
          </div>
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => setPlacingSite(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {isDroppingNew && (
        <div className="map-mode-banner">
          <div className="map-mode-banner-text">
            <FontAwesomeIcon icon={faCrosshairs} />
            <span>
              <strong>New Source Mode:</strong> Click anywhere on the map to place a new water source.
            </span>
          </div>
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => setIsDroppingNew(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Error Notification ───────────────────────────────────────────── */}
      {searchErr && (
        <div className="map-err">
          <FontAwesomeIcon icon={faCircleInfo} />
          <span>{searchErr}</span>
          <button
            type="button"
            className="btn sm ghost"
            style={{ marginLeft: 'auto', padding: '2px 8px' }}
            onClick={() => setSearchErr(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Two-Column Layout: Leaflet Canvas + Sidebar ──────────────── */}
      <div className="map-layout">
        {/* Leaflet Map Canvas */}
        <div className="map-canvas-container">
          <div ref={containerRef} className="map-canvas" />

          {/* Floating Map Controls */}
          {sitesWithCoords.length > 0 && (
            <div className="map-floating-overlay">
              <button
                type="button"
                className="map-floating-btn"
                onClick={handleFitAll}
                title="Fit all pinned sites in view"
              >
                <FontAwesomeIcon icon={faExpand} />
                <span>Fit All ({sitesWithCoords.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar Panel */}
        <div className="map-sidebar">
          {/* Selected Site Detail Card */}
          {selected && (
            <div className="map-site-card" style={{ borderLeftColor: selectedColor }}>
              <div className="map-site-card-header">
                <div>
                  <div className="map-site-name">{selected.name}</div>
                  <div className="map-site-meta">
                    {SOURCE_LABELS[selected.type]} · Sampled {selected.date}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn sm ghost"
                  style={{ padding: '2px 6px' }}
                  onClick={() => setSelected(null)}
                  aria-label="Close details"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>

              <div className="map-site-status" style={{ color: selectedColor }}>
                <span
                  className="map-site-dot"
                  style={{ background: selectedColor, marginRight: 6 }}
                />
                {STATUS_LABEL[selectedStatus]}
              </div>

              {selected.lat != null && selected.lng != null && (
                <div className="map-site-coords">
                  {selected.lat.toFixed(4)}°, {selected.lng.toFixed(4)}°
                </div>
              )}

              {/* Quick sample highlights */}
              {selected.sample && Object.keys(selected.sample).length > 0 && (
                <div className="map-site-metrics">
                  {selected.sample.ph != null && (
                    <span className="map-metric-pill">pH {selected.sample.ph}</span>
                  )}
                  {selected.sample.turbidity != null && (
                    <span className="map-metric-pill">Turb {selected.sample.turbidity} NTU</span>
                  )}
                  {selected.sample.ec != null && (
                    <span className="map-metric-pill">EC {selected.sample.ec} µS</span>
                  )}
                </div>
              )}

              <div className="map-site-actions">
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => onOpenSite(selected.id)}
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Open Site Analysis
                </button>

                <div style={{ display: 'flex', gap: 6 }}>
                  {selected.lat != null && selected.lng != null ? (
                    <>
                      <button
                        type="button"
                        className="btn sm ghost"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setPlacingSite(selected)
                          setIsDroppingNew(false)
                        }}
                        title="Reposition this site on the map"
                      >
                        <FontAwesomeIcon icon={faCrosshairs} /> Move Pin
                      </button>
                      <button
                        type="button"
                        className="btn sm ghost"
                        onClick={() => handleUnpin(selected)}
                        title="Remove pin coordinates from map"
                      >
                        Unpin
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn sm ghost"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setPlacingSite(selected)
                        setIsDroppingNew(false)
                      }}
                    >
                      <FontAwesomeIcon icon={faCrosshairs} /> Place on Map
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Placed Sites List */}
          <div className="map-sidebar-section">
            <div className="map-sidebar-heading">
              <span>Sites on map</span>
              <span className="chip" style={{ fontSize: '.7rem', padding: '2px 8px' }}>
                {sitesWithCoords.length}
              </span>
            </div>

            {sitesWithCoords.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  background: 'var(--panel-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--line)',
                  fontSize: '.8rem',
                  color: 'var(--muted)',
                }}
              >
                No sites located on the map yet.{' '}
                {hasUnplacedDemo ? (
                  <span>
                    Click{' '}
                    <strong
                      style={{ color: 'var(--brand-blue)', cursor: 'pointer' }}
                      onClick={handleAutoLocateDemo}
                    >
                      Locate Demo Sites
                    </strong>{' '}
                    or pin an unplaced source below.
                  </span>
                ) : (
                  <span>
                    Click <strong>Add Source</strong> or select an unplaced source below.
                  </span>
                )}
              </div>
            ) : (
              sitesWithCoords.map((site) => {
                const st = worst(evaluate(DRINKING_RULES, site.sample))
                const isSel = selected?.id === site.id
                return (
                  <button
                    key={site.id}
                    type="button"
                    className={`map-site-row ${isSel ? 'active' : ''}`}
                    onClick={() => {
                      setSelected(site)
                      flyTo(site.lat!, site.lng!, 14)
                      const marker = markerMap.current.get(site.id)
                      marker?.openPopup()
                    }}
                  >
                    <span className="map-site-dot" style={{ background: STATUS_COLOR[st] }} />
                    <span className="map-site-row-name">{site.name}</span>
                    <span className="map-site-row-type">{SOURCE_LABELS[site.type]}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* Unplaced Sites List */}
          {sitesNoCoords.length > 0 && (
            <div className="map-sidebar-section">
              <div className="map-sidebar-heading">
                <span>Not yet placed</span>
                <span className="chip" style={{ fontSize: '.7rem', padding: '2px 8px' }}>
                  {sitesNoCoords.length}
                </span>
              </div>

              {sitesNoCoords.map((site) => (
                <div key={site.id} className="map-site-row--unplaced">
                  <div className="map-unplaced-left">
                    <span className="map-site-dot" style={{ background: '#cbd7e6' }} />
                    <span className="map-site-row-name" title={site.name}>
                      {site.name}
                    </span>
                    <span className="map-site-row-type">{SOURCE_LABELS[site.type]}</span>
                  </div>
                  <button
                    type="button"
                    className="map-unplaced-pin-btn"
                    onClick={() => {
                      setPlacingSite(site)
                      setIsDroppingNew(false)
                    }}
                    title={`Place ${site.name} onto the map`}
                  >
                    <FontAwesomeIcon icon={faCrosshairs} /> Place
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Status Legend */}
          <div className="map-legend">
            <div className="map-legend-heading">Status Legend</div>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <div key={key} className="map-legend-row">
                <span className="map-site-dot" style={{ background: STATUS_COLOR[key] }} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <p className="muted small" style={{ marginTop: 'auto', opacity: 0.65, fontSize: '.72rem' }}>
            Map data ©{' '}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">
              OpenStreetMap
            </a>{' '}
            contributors. Satellite imagery © Esri.
          </p>
        </div>
      </div>

      {/* ── Modal: Add New Source from Clicked Map Location ─────────────── */}
      {newSiteModalCoords && (
        <div className="map-modal-backdrop" onClick={() => setNewSiteModalCoords(null)}>
          <div className="map-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="map-modal-header">
              <h3 className="map-modal-title">New Water Source</h3>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setNewSiteModalCoords(null)}
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleCreateNewSite} className="map-modal-form">
              <div className="map-field-group">
                <label className="map-field-label" htmlFor="new-site-name">
                  Source Name
                </label>
                <input
                  id="new-site-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. North Borehole #4"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="map-field-input"
                />
              </div>

              <div className="map-field-group">
                <label className="map-field-label" htmlFor="new-site-type">
                  Source Type
                </label>
                <select
                  id="new-site-type"
                  value={newSiteType}
                  onChange={(e) => setNewSiteType(e.target.value as SourceType)}
                  className="map-field-select"
                >
                  {Object.entries(SOURCE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="map-field-group">
                <label className="map-field-label">Pinned Location</label>
                <div className="map-site-coords">
                  {newSiteModalCoords.lat.toFixed(5)}°, {newSiteModalCoords.lng.toFixed(5)}°
                </div>
              </div>

              <div className="map-modal-actions">
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setNewSiteModalCoords(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn sm" disabled={!newSiteName.trim()}>
                  Create & Place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
