import type { Finding, Level, ParamKey, Sample } from '../types'

export const PARAM_META: Record<ParamKey, { label: string; unit: string; step: number; group: string }> = {
  ph: { label: 'pH', unit: '', step: 0.1, group: 'Core' },
  turbidity: { label: 'Turbidity', unit: 'NTU', step: 0.1, group: 'Core' },
  ec: { label: 'Electrical conductivity', unit: 'µS/cm', step: 1, group: 'Core' },
  tds: { label: 'Total dissolved solids', unit: 'mg/L', step: 1, group: 'Core' },
  temp: { label: 'Temperature', unit: '°C', step: 0.1, group: 'Core' },
  hardness: { label: 'Total hardness (as CaCO₃)', unit: 'mg/L', step: 1, group: 'Mineral' },
  alkalinity: { label: 'Alkalinity (as CaCO₃)', unit: 'mg/L', step: 1, group: 'Mineral' },
  calcium: { label: 'Calcium (Ca)', unit: 'mg/L', step: 0.1, group: 'Mineral' },
  magnesium: { label: 'Magnesium (Mg)', unit: 'mg/L', step: 0.1, group: 'Mineral' },
  sodium: { label: 'Sodium (Na)', unit: 'mg/L', step: 0.1, group: 'Mineral' },
  chloride: { label: 'Chloride (Cl)', unit: 'mg/L', step: 1, group: 'Mineral' },
  iron: { label: 'Iron (Fe)', unit: 'mg/L', step: 0.01, group: 'Contaminants' },
  manganese: { label: 'Manganese (Mn)', unit: 'mg/L', step: 0.01, group: 'Contaminants' },
  nitrate: { label: 'Nitrate (as NO₃)', unit: 'mg/L', step: 0.1, group: 'Contaminants' },
  fluoride: { label: 'Fluoride (F)', unit: 'mg/L', step: 0.01, group: 'Contaminants' },
  arsenic: { label: 'Arsenic (As)', unit: 'mg/L', step: 0.001, group: 'Contaminants' },
  ecoli: { label: 'E. coli', unit: 'CFU/100 mL', step: 1, group: 'Biological' },
  do: { label: 'Dissolved oxygen', unit: 'mg/L', step: 0.1, group: 'Aquaculture' },
  ammonia: { label: 'Total ammonia (TAN)', unit: 'mg/L', step: 0.01, group: 'Aquaculture' },
  nitrite: { label: 'Nitrite (NO₂)', unit: 'mg/L', step: 0.01, group: 'Aquaculture' },
  sar: { label: 'Sodium adsorption ratio', unit: '', step: 0.1, group: 'Derived' },
}

export const FORM_KEYS: ParamKey[] = (Object.keys(PARAM_META) as ParamKey[]).filter(
  (k) => PARAM_META[k].group !== 'Derived',
)

export interface Rule {
  key: ParamKey
  watchMin?: number
  poorMin?: number
  watchMax?: number
  poorMax?: number
  good: string
  high?: string
  low?: string
}

function levelOf(v: number, r: Rule): Level {
  if ((r.poorMax !== undefined && v > r.poorMax) || (r.poorMin !== undefined && v < r.poorMin)) return 'poor'
  if ((r.watchMax !== undefined && v > r.watchMax) || (r.watchMin !== undefined && v < r.watchMin)) return 'watch'
  return 'good'
}

/** Fill in values that can be derived from other measurements. */
export function derive(s: Sample): Sample {
  const d: Sample = { ...s }
  if (d.tds === undefined && d.ec !== undefined) d.tds = Math.round(d.ec * 0.65)
  if (d.ec === undefined && d.tds !== undefined) d.ec = Math.round(d.tds / 0.65)
  if (d.hardness === undefined && d.calcium !== undefined && d.magnesium !== undefined) {
    d.hardness = Math.round(d.calcium * 2.497 + d.magnesium * 4.118)
  }
  if (d.sodium !== undefined && d.calcium !== undefined && d.magnesium !== undefined) {
    const na = d.sodium / 22.99
    const ca = d.calcium / 20.04
    const mg = d.magnesium / 12.15
    const denom = Math.sqrt((ca + mg) / 2)
    if (denom > 0) d.sar = Math.round((na / denom) * 10) / 10
  }
  return d
}

export function evaluate(rules: Rule[], sample: Sample): Finding[] {
  const s = derive(sample)
  const out: Finding[] = []
  for (const r of rules) {
    const v = s[r.key]
    if (v === undefined || Number.isNaN(v)) continue
    const level = levelOf(v, r)
    let message = r.good
    if (level !== 'good') {
      const above =
        (r.watchMax !== undefined && v > r.watchMax) || (r.poorMax !== undefined && v > r.poorMax)
      message = (above ? r.high : r.low) ?? r.good
    }
    const meta = PARAM_META[r.key]
    out.push({ key: r.key, label: meta.label, value: v, unit: meta.unit, level, message })
  }
  return out
}

export function worst(findings: Finding[]): Level | 'none' {
  if (findings.length === 0) return 'none'
  if (findings.some((f) => f.level === 'poor')) return 'poor'
  if (findings.some((f) => f.level === 'watch')) return 'watch'
  return 'good'
}

/* ------------------------------------------------------------------ */
/* WHO drinking-water guidelines (health-based and acceptability)      */
/* ------------------------------------------------------------------ */
export const DRINKING_RULES: Rule[] = [
  {
    key: 'ecoli',
    poorMax: 0,
    good: 'Not detected, which meets the WHO requirement.',
    high: 'E. coli must be absent in 100 mL. Indicates faecal contamination; disinfect and find the pathway.',
  },
  {
    key: 'ph',
    watchMin: 6.5,
    watchMax: 8.5,
    poorMin: 6.0,
    poorMax: 9.5,
    good: 'Within the 6.5–8.5 operational range.',
    high: 'High pH reduces chlorine effectiveness and causes scaling. Adjust before disinfection.',
    low: 'Low pH is corrosive to pipes and fittings. Raise with soda ash or lime.',
  },
  {
    key: 'turbidity',
    watchMax: 1,
    poorMax: 5,
    good: 'Below 1 NTU, so disinfection will be effective.',
    high: 'Above 1 NTU shields microbes from chlorine; above 5 NTU is visibly cloudy. Needs clarification.',
  },
  {
    key: 'tds',
    watchMax: 600,
    poorMax: 1000,
    good: 'Below 600 mg/L, rated good taste.',
    high: 'High dissolved solids affect taste. Above 1000 mg/L needs blending or desalination.',
  },
  {
    key: 'hardness',
    watchMax: 200,
    poorMax: 500,
    good: 'Soft to moderately hard.',
    high: 'Hard water causes scale and uses more soap. Not a health risk; soften if scale is a problem.',
  },
  {
    key: 'iron',
    watchMax: 0.3,
    poorMax: 2,
    good: 'Below the 0.3 mg/L taste/staining threshold.',
    high: 'Causes staining, metallic taste and clogging. Oxidise and filter.',
  },
  {
    key: 'manganese',
    watchMax: 0.1,
    poorMax: 0.4,
    good: 'Below the 0.1 mg/L staining threshold.',
    high: 'Black staining and a health concern above 0.4 mg/L. Oxidise and filter.',
  },
  {
    key: 'nitrate',
    watchMax: 25,
    poorMax: 50,
    good: 'Below half the 50 mg/L guideline.',
    high: 'Nitrate above 50 mg/L risks infant methaemoglobinaemia. Usually indicates sanitation or fertiliser contamination.',
  },
  {
    key: 'fluoride',
    watchMax: 1,
    poorMax: 1.5,
    good: 'Below the 1.5 mg/L guideline.',
    high: 'Above 1.5 mg/L risks dental and skeletal fluorosis with long-term use.',
  },
  {
    key: 'arsenic',
    watchMax: 0.005,
    poorMax: 0.01,
    good: 'Below the 0.01 mg/L guideline.',
    high: 'Arsenic above 0.01 mg/L is a long-term cancer risk. Needs specialised treatment or another source.',
  },
  {
    key: 'chloride',
    watchMax: 200,
    poorMax: 300,
    good: 'Below 200 mg/L, well under the 250 mg/L taste threshold.',
    high: 'Approaching or above the 250 mg/L taste threshold. Salty taste and corrosion. Blend or desalinate.',
  },
  {
    key: 'sodium',
    watchMax: 200,
    poorMax: 400,
    good: 'Below the 200 mg/L taste threshold.',
    high: 'Salty taste; a concern for low-sodium diets.',
  },
]

/* ------------------------------------------------------------------ */
/* FAO Irrigation & Drainage Paper 29 (Ayers & Westcot) guidelines     */
/* ------------------------------------------------------------------ */
export const IRRIGATION_RULES: Rule[] = [
  {
    key: 'ec',
    watchMax: 700,
    poorMax: 3000,
    good: 'Below 0.7 dS/m, with no salinity restriction.',
    high: 'Salinity reduces water uptake by crops. Choose tolerant crops, leach, or blend.',
  },
  {
    key: 'tds',
    watchMax: 450,
    poorMax: 2000,
    good: 'Below 450 mg/L, with no restriction.',
    high: 'Slight to moderate restriction above 450 mg/L; severe above 2000 mg/L.',
  },
  {
    key: 'sar',
    watchMax: 3,
    poorMax: 9,
    good: 'Low sodium hazard.',
    high: 'Sodium degrades soil structure and slows infiltration. Add gypsum and improve drainage.',
  },
  {
    key: 'chloride',
    watchMax: 140,
    poorMax: 350,
    good: 'Below 140 mg/L, with no root-uptake issue.',
    high: 'Chloride toxicity to sensitive crops (citrus, avocado, beans). Avoid overhead sprinklers on foliage.',
  },
  {
    key: 'ph',
    watchMin: 6.5,
    watchMax: 8.4,
    poorMin: 5.5,
    poorMax: 9,
    good: 'Normal range 6.5–8.4.',
    high: 'High pH signals bicarbonate or carbonate and can raise soil pH and clog drip emitters.',
    low: 'Acidic water can corrode equipment and affect nutrient availability.',
  },
  {
    key: 'iron',
    watchMax: 0.1,
    poorMax: 1.5,
    good: 'Low risk of emitter clogging.',
    high: 'Iron precipitates and clogs drip emitters. Aerate and filter, or use sprinklers.',
  },
  {
    key: 'manganese',
    watchMax: 0.1,
    poorMax: 1.5,
    good: 'Low clogging risk.',
    high: 'Manganese can clog emitters and, at high levels, is toxic to sensitive crops.',
  },
  {
    key: 'nitrate',
    watchMax: 22,
    poorMax: 133,
    good: 'Below 5 mg/L as N. Counts towards crop nitrogen.',
    high: 'Nitrogen in the water can over-stimulate growth. Reduce fertiliser accordingly.',
  },
]

/* ------------------------------------------------------------------ */
/* Warm-water pond fish (tilapia / catfish) ranges                     */
/* ------------------------------------------------------------------ */
export const FISH_RULES: Rule[] = [
  {
    key: 'temp',
    watchMin: 25,
    watchMax: 30,
    poorMin: 18,
    poorMax: 35,
    good: 'In the 25–30 °C optimum for tilapia and catfish.',
    high: 'Too warm; oxygen drops and stress rises.',
    low: 'Too cool; growth slows and feeding falls.',
  },
  {
    key: 'ph',
    watchMin: 6.5,
    watchMax: 9,
    poorMin: 5.5,
    poorMax: 10,
    good: 'Within the 6.5–9 safe range.',
    high: 'High pH makes ammonia far more toxic.',
    low: 'Acidic water stresses fish and can liberate metals.',
  },
  {
    key: 'do',
    watchMin: 5,
    poorMin: 3,
    good: 'Above 5 mg/L.',
    low: 'Low oxygen. Add aeration, reduce feeding and stocking density.',
  },
  {
    key: 'ammonia',
    watchMax: 1,
    poorMax: 2,
    good: 'Low ammonia.',
    high: 'Ammonia is toxic, more so at high pH and temperature. Reduce feeding and exchange water.',
  },
  {
    key: 'nitrite',
    watchMax: 0.1,
    poorMax: 0.5,
    good: 'Low nitrite.',
    high: 'Nitrite blocks oxygen transport in the blood. Add salt (chloride) and exchange water.',
  },
  {
    key: 'alkalinity',
    watchMin: 50,
    poorMin: 20,
    good: 'Adequate buffering.',
    low: 'Poor buffering means pH swings. Add agricultural lime.',
  },
  {
    key: 'iron',
    watchMax: 0.5,
    poorMax: 1,
    good: 'Low iron.',
    high: 'Iron can coat gills. Aerate and settle the water before filling ponds.',
  },
  {
    key: 'turbidity',
    watchMax: 30,
    poorMax: 100,
    good: 'Acceptable for a pond.',
    high: 'Heavy suspended clay or algae reduces light and oxygen.',
  },
]
