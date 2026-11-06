import type { SourceType } from '../types'

/** All volumes are m³ per month. 1 mm of water over 1 ha = 10 m³. */

export type OperationType = 'crop' | 'livestock' | 'mining'

export interface DemandSource {
  id: string
  name: string
  type: SourceType
  volume: number
  /** recycled or return water counts as reuse, not new abstraction */
  recycled?: boolean
  /** share of this source that is actually metered, 0-100 */
  meteredPct?: number
}

export type Activity =
  | { id: string; kind: 'crop'; name: string; areaHa: number; mmPerMonth: number; efficiencyPct: number }
  | { id: string; kind: 'livestock'; name: string; heads: number; litresPerHeadDay: number }
  | { id: string; kind: 'process'; name: string; tonnesPerMonth: number; m3PerTonne: number }
  | { id: string; kind: 'fixed'; name: string; m3PerMonth: number }
  | { id: string; kind: 'camp'; name: string; people: number; litresPerPersonDay: number }

export interface DemandInput {
  operation: OperationType
  sources: DemandSource[]
  activities: Activity[]
  /** % of abstracted water lost in canals, pipes and unlined channels before use */
  conveyanceLossPct: number
  /** open storage (dam, pond) surface area and evaporation */
  storageAreaHa: number
  evaporationMmPerMonth: number
}

export const DAYS = 30

export const IRRIGATION_EFFICIENCY: Record<string, number> = {
  'Drip': 90,
  'Sprinkler / pivot': 75,
  'Furrow / flood': 55,
}

export const CROP_PRESETS: { name: string; mm: number }[] = [
  { name: 'Maize', mm: 110 },
  { name: 'Wheat', mm: 100 },
  { name: 'Soya bean', mm: 95 },
  { name: 'Tomatoes', mm: 140 },
  { name: 'Leafy vegetables', mm: 120 },
  { name: 'Irrigated pasture', mm: 90 },
]

export const LIVESTOCK_PRESETS: { name: string; l: number }[] = [
  { name: 'Cattle (beef)', l: 45 },
  { name: 'Dairy cows', l: 90 },
  { name: 'Goats / sheep', l: 6 },
  { name: 'Pigs', l: 15 },
  { name: 'Poultry', l: 0.3 },
]

export interface ActivityResult {
  /** water the activity actually needs (productive use) */
  net: number
  /** water that must be supplied, including application losses */
  gross: number
}

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

export function activityDemand(a: Activity): ActivityResult {
  switch (a.kind) {
    case 'crop': {
      const net = pos(a.areaHa) * pos(a.mmPerMonth) * 10
      const eff = Math.min(Math.max(a.efficiencyPct, 1), 100) / 100
      return { net, gross: net / eff }
    }
    case 'livestock': {
      const net = (pos(a.heads) * pos(a.litresPerHeadDay) * DAYS) / 1000
      return { net, gross: net }
    }
    case 'process': {
      const net = pos(a.tonnesPerMonth) * pos(a.m3PerTonne)
      return { net, gross: net }
    }
    case 'fixed': {
      const net = pos(a.m3PerMonth)
      return { net, gross: net }
    }
    case 'camp': {
      const net = (pos(a.people) * pos(a.litresPerPersonDay) * DAYS) / 1000
      return { net, gross: net }
    }
  }
}

export interface DemandResult {
  totalIn: number
  recycled: number
  newWater: number
  productive: number
  applicationLoss: number
  grossDemand: number
  conveyanceLoss: number
  evaporation: number
  availableAtPoint: number
  /** positive = shortfall, as m³/month */
  shortfall: number
  surplus: number
  coveragePct: number
  /** productive use / total water in */
  efficiencyPct: number
  recycledPct: number
  /** share of the inflow that is metered, volume weighted */
  meteredPct: number
  status: 'surplus' | 'balanced' | 'shortfall'
}

export function computeDemand(d: DemandInput): DemandResult {
  const totalIn = d.sources.reduce((s, x) => s + pos(x.volume), 0)
  const recycled = d.sources.filter((x) => x.recycled).reduce((s, x) => s + pos(x.volume), 0)
  const metered = d.sources.reduce(
    (s, x) => s + pos(x.volume) * (Math.min(Math.max(x.meteredPct ?? 0, 0), 100) / 100),
    0,
  )

  let productive = 0
  let grossDemand = 0
  for (const a of d.activities) {
    const r = activityDemand(a)
    productive += r.net
    grossDemand += r.gross
  }

  const conveyanceLoss = totalIn * (Math.min(pos(d.conveyanceLossPct), 100) / 100)
  const evaporation = Math.min(pos(d.storageAreaHa) * pos(d.evaporationMmPerMonth) * 10, totalIn - conveyanceLoss)
  const availableAtPoint = Math.max(totalIn - conveyanceLoss - evaporation, 0)
  const gap = availableAtPoint - grossDemand
  const shortfall = gap < 0 ? -gap : 0
  const surplus = gap > 0 ? gap : 0

  return {
    totalIn,
    recycled,
    newWater: totalIn - recycled,
    productive,
    applicationLoss: grossDemand - productive,
    grossDemand,
    conveyanceLoss,
    evaporation,
    availableAtPoint,
    shortfall,
    surplus,
    coveragePct: grossDemand > 0 ? Math.min((availableAtPoint / grossDemand) * 100, 100) : 100,
    efficiencyPct: totalIn > 0 ? (productive / totalIn) * 100 : 0,
    recycledPct: totalIn > 0 ? (recycled / totalIn) * 100 : 0,
    meteredPct: totalIn > 0 ? (metered / totalIn) * 100 : 0,
    status: shortfall > grossDemand * 0.02 ? 'shortfall' : surplus > grossDemand * 0.02 ? 'surplus' : 'balanced',
  }
}

/** Plain-language statements with the numbers behind them. */
export function demandFindings(d: DemandInput, r: DemandResult): string[] {
  const f = (n: number) => Math.round(n).toLocaleString()
  const out: string[] = []
  if (r.totalIn === 0) return ['Add at least one water source to start the assessment.']
  if (r.status === 'shortfall')
    out.push(`Supply covers ${r.coveragePct.toFixed(0)}% of demand. The shortfall is ${f(r.shortfall)} m³/month, so add a source, cut losses or reduce the irrigated area.`)
  else if (r.status === 'surplus')
    out.push(`Sources exceed demand by ${f(r.surplus)} m³/month. This could be stored, treated for another use, or used to expand.`)
  else out.push('Supply and demand are balanced, with little margin for a dry spell.')
  if (r.applicationLoss > r.grossDemand * 0.2)
    out.push(`${f(r.applicationLoss)} m³/month (${((r.applicationLoss / r.grossDemand) * 100).toFixed(0)}% of demand) is lost in application. Moving flood or furrow blocks to drip or sprinkler is the largest saving.`)
  if (r.conveyanceLoss > r.totalIn * 0.1)
    out.push(`Conveyance loses ${f(r.conveyanceLoss)} m³/month. Lining canals or piping the main run usually pays back quickly.`)
  if (r.evaporation > r.totalIn * 0.08)
    out.push(`Storage evaporation takes ${f(r.evaporation)} m³/month. Deeper, smaller or shaded storage cuts this.`)
  if (r.meteredPct < 50)
    out.push(`Only ${r.meteredPct.toFixed(0)}% of inflow is metered, so these numbers carry real uncertainty. Install meters on the largest sources first.`)
  if (d.operation === 'mining' && r.recycledPct < 30)
    out.push(`Recycled water is ${r.recycledPct.toFixed(0)}% of inflow. Mine processing plants commonly reuse most of their process water.`)
  return out
}

export const DEFAULT_DEMAND: DemandInput = {
  operation: 'crop',
  sources: [
    { id: 'src1', name: 'Borehole 1', type: 'borehole', volume: 6000, meteredPct: 100 },
    { id: 'src2', name: 'Farm dam', type: 'dam', volume: 9000, meteredPct: 0 },
  ],
  activities: [
    { id: 'a1', kind: 'crop', name: 'Maize, 8 ha', areaHa: 8, mmPerMonth: 110, efficiencyPct: 75 },
    { id: 'a2', kind: 'crop', name: 'Tomatoes, 2 ha', areaHa: 2, mmPerMonth: 140, efficiencyPct: 90 },
    { id: 'a3', kind: 'livestock', name: 'Cattle', heads: 80, litresPerHeadDay: 45 },
  ],
  conveyanceLossPct: 10,
  storageAreaHa: 1.5,
  evaporationMmPerMonth: 180,
}

export const MINING_DEMAND: DemandInput = {
  operation: 'mining',
  sources: [
    { id: 'm1', name: 'Mine borehole field', type: 'borehole', volume: 12000, meteredPct: 100 },
    { id: 'm2', name: 'Process water return', type: 'dam', volume: 18000, recycled: true, meteredPct: 100 },
  ],
  activities: [
    { id: 'p1', kind: 'process', name: 'Ore processing', tonnesPerMonth: 15000, m3PerTonne: 1.4 },
    { id: 'p2', kind: 'fixed', name: 'Dust suppression', m3PerMonth: 3500 },
    { id: 'p3', kind: 'fixed', name: 'Drilling and cooling', m3PerMonth: 1800 },
    { id: 'p4', kind: 'camp', name: 'Camp domestic use', people: 300, litresPerPersonDay: 150 },
  ],
  conveyanceLossPct: 5,
  storageAreaHa: 3,
  evaporationMmPerMonth: 200,
}
