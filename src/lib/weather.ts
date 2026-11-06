/** Open-Meteo weather integration — no API key required. */

// ── Types ──────────────────────────────────────────────────────────────────

export interface GeoLocation {
  id: number
  name: string
  latitude: number
  longitude: number
  country: string
  admin1?: string  // state / province
}

export interface CurrentWeather {
  temp: number          // °C
  feelsLike: number     // °C
  humidity: number      // %
  windSpeed: number     // km/h
  windDir: number       // degrees
  precipitation: number // mm last hour
  code: number          // WMO weather code
  isDay: boolean
  time: string          // ISO
}

export interface DayForecast {
  date: string         // YYYY-MM-DD
  tempMax: number
  tempMin: number
  precipSum: number    // mm
  precipProb: number   // %
  code: number
  uvIndex: number
  evaporation: number  // mm — reference ET₀ (FAO-56)
}

export interface WeatherData {
  location: GeoLocation
  current: CurrentWeather
  forecast: DayForecast[]
  fetchedAt: number  // Date.now()
}

// ── WMO code map ───────────────────────────────────────────────────────────

interface WmoInfo {
  label: string
  faIcon: string  // Font Awesome icon name (free-solid)
  isRain: boolean
  isStorm: boolean
  isSnow: boolean
}

const WMO: Record<number, WmoInfo> = {
  0:  { label: 'Clear sky',            faIcon: 'sun',              isRain: false, isStorm: false, isSnow: false },
  1:  { label: 'Mainly clear',         faIcon: 'sun',              isRain: false, isStorm: false, isSnow: false },
  2:  { label: 'Partly cloudy',        faIcon: 'cloud-sun',        isRain: false, isStorm: false, isSnow: false },
  3:  { label: 'Overcast',             faIcon: 'cloud',            isRain: false, isStorm: false, isSnow: false },
  45: { label: 'Fog',                  faIcon: 'smog',             isRain: false, isStorm: false, isSnow: false },
  48: { label: 'Icy fog',              faIcon: 'smog',             isRain: false, isStorm: false, isSnow: false },
  51: { label: 'Light drizzle',        faIcon: 'cloud-rain',       isRain: true,  isStorm: false, isSnow: false },
  53: { label: 'Moderate drizzle',     faIcon: 'cloud-rain',       isRain: true,  isStorm: false, isSnow: false },
  55: { label: 'Heavy drizzle',        faIcon: 'cloud-rain',       isRain: true,  isStorm: false, isSnow: false },
  61: { label: 'Light rain',           faIcon: 'cloud-rain',       isRain: true,  isStorm: false, isSnow: false },
  63: { label: 'Moderate rain',        faIcon: 'cloud-showers-heavy', isRain: true, isStorm: false, isSnow: false },
  65: { label: 'Heavy rain',           faIcon: 'cloud-showers-heavy', isRain: true, isStorm: false, isSnow: false },
  71: { label: 'Light snow',           faIcon: 'snowflake',        isRain: false, isStorm: false, isSnow: true  },
  73: { label: 'Moderate snow',        faIcon: 'snowflake',        isRain: false, isStorm: false, isSnow: true  },
  75: { label: 'Heavy snow',           faIcon: 'snowflake',        isRain: false, isStorm: false, isSnow: true  },
  77: { label: 'Snow grains',          faIcon: 'snowflake',        isRain: false, isStorm: false, isSnow: true  },
  80: { label: 'Light showers',        faIcon: 'cloud-rain',       isRain: true,  isStorm: false, isSnow: false },
  81: { label: 'Moderate showers',     faIcon: 'cloud-showers-heavy', isRain: true, isStorm: false, isSnow: false },
  82: { label: 'Violent showers',      faIcon: 'cloud-showers-heavy', isRain: true, isStorm: true,  isSnow: false },
  85: { label: 'Snow showers',         faIcon: 'snowflake',        isRain: false, isStorm: false, isSnow: true  },
  86: { label: 'Heavy snow showers',   faIcon: 'snowflake',        isRain: false, isStorm: false, isSnow: true  },
  95: { label: 'Thunderstorm',         faIcon: 'bolt',             isRain: true,  isStorm: true,  isSnow: false },
  96: { label: 'Thunderstorm + hail',  faIcon: 'bolt',             isRain: true,  isStorm: true,  isSnow: false },
  99: { label: 'Thunderstorm + hail',  faIcon: 'bolt',             isRain: true,  isStorm: true,  isSnow: false },
}

export function wmoInfo(code: number): WmoInfo {
  return WMO[code] ?? { label: 'Unknown', faIcon: 'cloud', isRain: false, isStorm: false, isSnow: false }
}

// ── Wind direction ─────────────────────────────────────────────────────────

export function windDirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

// ── Water-relevance notes ──────────────────────────────────────────────────

export interface WaterNote {
  level: 'info' | 'watch' | 'action'
  text: string
}

export function waterNotes(current: CurrentWeather, forecast: DayForecast[]): WaterNote[] {
  const notes: WaterNote[] = []
  const next3 = forecast.slice(0, 3)
  const totalRain = next3.reduce((s, d) => s + d.precipSum, 0)
  const maxEvap   = Math.max(...next3.map((d) => d.evaporation))
  const maxUV     = Math.max(...next3.map((d) => d.uvIndex))
  const anyStorm  = next3.some((d) => wmoInfo(d.code).isStorm)
  const highProb  = next3.some((d) => d.precipProb >= 70)

  if (anyStorm)
    notes.push({ level: 'action', text: 'Thunderstorms forecast — check dam spillways and secure open storage.' })

  if (totalRain > 40)
    notes.push({ level: 'action', text: `${totalRain.toFixed(0)} mm expected over 3 days — monitor borehole turbidity and dam inflows for flood-driven contamination.` })
  else if (totalRain > 10 && highProb)
    notes.push({ level: 'watch', text: `${totalRain.toFixed(0)} mm of rain likely — surface runoff may increase turbidity in open sources.` })
  else if (totalRain === 0 && next3.length === 3)
    notes.push({ level: 'info', text: 'No rain forecast — watch for falling borehole yields and rising TDS in shallow wells.' })

  if (maxEvap > 6)
    notes.push({ level: 'watch', text: `High evaporation (up to ${maxEvap.toFixed(1)} mm/day) — open storage and dam levels will drop faster than average.` })

  if (current.temp > 35)
    notes.push({ level: 'watch', text: 'High air temperature increases algal bloom risk in dams and open ponds.' })

  if (maxUV >= 8)
    notes.push({ level: 'info', text: `UV index up to ${maxUV} — beneficial for UV disinfection; reduce exposure time for operators working in open.` })

  return notes
}

// ── API fetch functions ─────────────────────────────────────────────────────

/** Geocode a place name using Open-Meteo's free geocoding API. */
export async function geocode(query: string): Promise<GeoLocation[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
  const data = await res.json() as { results?: GeoLocation[] }
  return data.results ?? []
}

/** Fetch current conditions + 3-day daily forecast from Open-Meteo. */
export async function fetchWeather(loc: GeoLocation): Promise<WeatherData> {
  const base = 'https://api.open-meteo.com/v1/forecast'
  const params = new URLSearchParams({
    latitude:  String(loc.latitude),
    longitude: String(loc.longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'precipitation',
      'weather_code',
      'is_day',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'weather_code',
      'uv_index_max',
      'et0_fao_evapotranspiration',
    ].join(','),
    forecast_days: '4',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  })

  const res = await fetch(`${base}?${params}`)
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await res.json() as any

  const c = d.current
  const current: CurrentWeather = {
    temp:          c.temperature_2m,
    feelsLike:     c.apparent_temperature,
    humidity:      c.relative_humidity_2m,
    windSpeed:     c.wind_speed_10m,
    windDir:       c.wind_direction_10m,
    precipitation: c.precipitation,
    code:          c.weather_code,
    isDay:         c.is_day === 1,
    time:          c.time,
  }

  const daily = d.daily
  // Skip index 0 (today already in current) — keep indices 0-3 as today + next 3
  const forecast: DayForecast[] = (daily.time as string[]).slice(0, 4).map((date: string, i: number) => ({
    date,
    tempMax:     daily.temperature_2m_max[i],
    tempMin:     daily.temperature_2m_min[i],
    precipSum:   daily.precipitation_sum[i],
    precipProb:  daily.precipitation_probability_max[i],
    code:        daily.weather_code[i],
    uvIndex:     daily.uv_index_max[i],
    evaporation: daily.et0_fao_evapotranspiration[i],
  }))

  return { location: loc, current, forecast, fetchedAt: Date.now() }
}

/** How stale is the cached data? Returns true if older than 30 min. */
export function isStale(fetchedAt: number): boolean {
  return Date.now() - fetchedAt > 30 * 60 * 1000
}
