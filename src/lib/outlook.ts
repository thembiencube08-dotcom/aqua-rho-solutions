import { SOURCE_LABELS } from '../types'
import type { Finding, ParamKey, Sample, SourceType } from '../types'
import { derive } from './rules'

export type OutlookStatus =
  | 'Good'
  | 'Acceptable with minor treatment'
  | 'Treatable with conventional treatment'
  | 'Advanced treatment or a different source needed'

export interface Lsi {
  value: number
  text: string
}

/** Langelier Saturation Index. Needs pH, calcium, alkalinity and TDS (temperature defaults to 25 °C). */
export function langelier(raw: Sample): Lsi | null {
  const s = derive(raw)
  if (s.ph === undefined || s.calcium === undefined || s.alkalinity === undefined || s.tds === undefined) return null
  const temp = s.temp ?? 25
  const caAsCaCO3 = s.calcium * 2.497
  if (caAsCaCO3 <= 0 || s.alkalinity <= 0 || s.tds <= 0) return null
  const A = (Math.log10(s.tds) - 1) / 10
  const B = -13.12 * Math.log10(temp + 273) + 34.55
  const C = Math.log10(caAsCaCO3) - 0.4
  const D = Math.log10(s.alkalinity)
  const phs = 9.3 + A + B - (C + D)
  const value = Math.round((s.ph - phs) * 100) / 100
  const text =
    value > 0.5
      ? 'Scale-forming: calcium carbonate will deposit in pipes and on heaters.'
      : value < -0.5
        ? 'Corrosive: the water will attack metal pipes and fittings. Raise pH and alkalinity.'
        : 'Close to balanced: little scaling or corrosion expected.'
  return { value, text }
}

const ADVANCED: ParamKey[] = ['tds', 'chloride', 'sodium', 'nitrate', 'fluoride', 'arsenic']

export const SOURCE_RISKS: Record<SourceType, string[]> = {
  borehole: ['Iron and manganese in reducing aquifers', 'Fluoride and hardness depending on geology', 'Nitrate if pits or fields are close', 'Pump drawdown can raise salinity'],
  well: ['Shallow water is easily contaminated by latrines and runoff', 'Microbial risk (test E. coli regularly)', 'Nitrate', 'Seasonal water-level swings'],
  dam: ['Turbidity after rain', 'Algae and organic matter (taste, odour, disinfection by-products)', 'Livestock and catchment pollution', 'Stratification in deep dams'],
  lake: ['Algal blooms', 'Variable turbidity', 'Catchment pollution'],
  river: ['Highly variable turbidity', 'Pathogens from upstream settlements and livestock', 'Pollutant spills', 'Always needs full treatment'],
  spring: ['Often good, but vulnerable to surface contamination at the spring box', 'Seasonal discharge', 'Protect the catchment above the spring'],
  rainwater: ['Low pH and alkalinity (aggressive to pipes)', 'Bird and animal droppings on roofs', 'First-flush diversion needed', 'Check roof and tank materials'],
  reticulation: ['Loss of chlorine residual along long mains', 'Biofilm and regrowth', 'Pressure transients and cross-connections', 'Leakage ingress at low pressure'],
}

export interface Outlook {
  status: OutlookStatus
  reasons: string[]
  improvements: string[]
  lsi: Lsi | null
  risks: string[]
}

export function outlook(sample: Sample, type: SourceType, drinking: Finding[]): Outlook {
  const poor = drinking.filter((f) => f.level === 'poor')
  const watch = drinking.filter((f) => f.level === 'watch')
  const hasAdvanced = poor.some((f) => ADVANCED.includes(f.key))

  let status: OutlookStatus = 'Good'
  if (hasAdvanced) status = 'Advanced treatment or a different source needed'
  else if (poor.length > 0) status = 'Treatable with conventional treatment'
  else if (watch.length > 0) status = 'Acceptable with minor treatment'

  const reasons = [...poor, ...watch].map((f) => `${f.label} ${f.value}${f.unit ? ' ' + f.unit : ''}: ${f.message}`)

  const improvements: string[] = []
  const s = derive(sample)
  if ((s.ecoli ?? 0) > 0) improvements.push('Protect the source: seal the wellhead or spring box, divert surface runoff, and keep latrines and livestock well away.')
  if ((s.nitrate ?? 0) > 25) improvements.push('Move or improve sanitation near the source and check fertiliser use in the recharge area.')
  if ((s.tds ?? 0) > 600) improvements.push('Test other boreholes or sources and blend; reduce pumping rate if drawdown draws saline water.')
  if ((s.iron ?? 0) > 0.3 || (s.manganese ?? 0) > 0.1) improvements.push('Install aeration and a sand filter; check the borehole screen and casing for corrosion.')
  if ((s.fluoride ?? 0) > 1) improvements.push('Test neighbouring boreholes at different depths; a deeper or shallower screen may change fluoride.')
  if ((s.arsenic ?? 0) > 0.005) improvements.push('Confirm arsenic with a laboratory test before relying on the source.')
  if (improvements.length === 0 && status === 'Good') improvements.push('Keep sampling at least seasonally and after heavy rain to catch change early.')

  return { status, reasons, improvements, lsi: langelier(sample), risks: SOURCE_RISKS[type] }
}

export function sourceName(t: SourceType): string {
  return SOURCE_LABELS[t]
}
