export type SourceType =
  | 'borehole'
  | 'well'
  | 'dam'
  | 'lake'
  | 'river'
  | 'spring'
  | 'rainwater'
  | 'reticulation'

export const SOURCE_LABELS: Record<SourceType, string> = {
  borehole: 'Borehole',
  well: 'Shallow well',
  dam: 'Dam',
  lake: 'Lake',
  river: 'River / stream',
  spring: 'Spring',
  rainwater: 'Rainwater harvest',
  reticulation: 'Reticulation system',
}

export const SURFACE_TYPES: SourceType[] = ['dam', 'lake', 'river']

export type ParamKey =
  | 'ph'
  | 'turbidity'
  | 'ec'
  | 'tds'
  | 'hardness'
  | 'alkalinity'
  | 'iron'
  | 'manganese'
  | 'nitrate'
  | 'fluoride'
  | 'arsenic'
  | 'chloride'
  | 'sodium'
  | 'calcium'
  | 'magnesium'
  | 'ecoli'
  | 'do'
  | 'temp'
  | 'ammonia'
  | 'nitrite'
  | 'sar'

export type Sample = Partial<Record<ParamKey, number>>

export interface Site {
  id: string
  name: string
  type: SourceType
  sample: Sample
  date: string
  /** treated flow in m3/day, used to turn doses into kg/day */
  flow?: number
  /** GPS coordinates — set when the user searches a location on the map */
  lat?: number
  lng?: number
}

export type Level = 'good' | 'watch' | 'poor'

export interface Finding {
  key: ParamKey
  label: string
  value: number
  unit: string
  level: Level
  message: string
}

export interface WaterBalanceInput {
  sources: { id: string; name: string; type: SourceType; volume: number }[]
  billedMetered: number
  billedUnmetered: number
  unbilledMetered: number
  unbilledUnmetered: number
  unauthorised: number
  meterErrors: number
}
