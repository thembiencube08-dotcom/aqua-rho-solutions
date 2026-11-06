import { SURFACE_TYPES } from '../types'
import type { Sample, SourceType } from '../types'
import { derive } from './rules'

export interface Step {
  stage: string
  why: string
  detail: string
}

export interface CoagulantPlan {
  low: number
  high: number
  mid: number
}

/** Starting alum dose band (mg/L) from raw-water turbidity. Always confirm with a jar test. */
export function alumBand(turbidity: number): CoagulantPlan {
  const [low, high] =
    turbidity <= 10 ? [10, 20] : turbidity <= 50 ? [20, 40] : turbidity <= 200 ? [40, 80] : [80, 150]
  return { low, high, mid: Math.round((low + high) / 2) }
}

const kgPerDay = (mgPerL: number, flow?: number) =>
  flow && flow > 0 ? ` At ${flow} m³/day that is about ${((mgPerL * flow) / 1000).toFixed(2)} kg/day.` : ''

export function treatmentPlan(raw: Sample, type: SourceType, flow?: number): Step[] {
  const s = derive(raw)
  const steps: Step[] = []
  const surface = SURFACE_TYPES.includes(type)
  const fe = s.iron ?? 0
  const mn = s.manganese ?? 0
  const turb = s.turbidity ?? 0

  /* 1. Oxidation of iron and manganese */
  let oxidantDemand = 0
  if (fe > 0.3 || mn > 0.1) {
    oxidantDemand = fe * 0.64 + mn * 1.29
    const kmno4 = fe * 0.94 + mn * 1.92
    steps.push({
      stage: 'Aeration and oxidation',
      why: `Iron ${fe} mg/L and manganese ${mn} mg/L exceed the staining thresholds.`,
      detail:
        `Aerate (cascade or spray) so dissolved iron oxidises, then settle and filter. ` +
        `Chemical oxidation needs at least ${oxidantDemand.toFixed(1)} mg/L chlorine ` +
        `(stoichiometric: 0.64 mg per mg Fe, 1.29 mg per mg Mn), or about ${kmno4.toFixed(1)} mg/L potassium permanganate. ` +
        `Manganese oxidises slowly below pH 8; if it persists, use manganese greensand or pyrolusite media.` +
        kgPerDay(oxidantDemand, flow),
    })
  }

  /* 2. Coagulation or direct filtration */
  let alumMid = 0
  if (turb > 5 || (surface && turb > 1)) {
    const band = alumBand(turb)
    alumMid = band.mid
    const alk = s.alkalinity
    const alkNeed = band.high * 0.5
    let alkNote = ''
    if (alk !== undefined && alk < alkNeed) {
      const soda = (alkNeed - alk) * 1.06
      alkNote = ` Alkalinity ${alk} mg/L is short of the ~${alkNeed.toFixed(0)} mg/L alum consumes; add about ${soda.toFixed(0)} mg/L soda ash.`
    } else if (alk === undefined) {
      alkNote = ' Measure alkalinity: alum consumes about 0.5 mg/L per mg/L dosed and may need soda ash.'
    }
    steps.push({
      stage: 'Coagulation, flocculation and settling',
      why: `Turbidity ${turb} NTU is too high for effective disinfection.`,
      detail:
        `Start jar tests with aluminium sulphate (alum) at ${band.low}–${band.high} mg/L. Rapid mix about 1 min, slow mix 15–20 min, settle 30 min.` +
        alkNote +
        kgPerDay(band.mid, flow),
    })
  }

  /* 3. Filtration */
  if (turb > 1 || fe > 0.3 || mn > 0.1) {
    steps.push({
      stage: 'Filtration',
      why: 'Remove floc, precipitated iron/manganese and remaining particles to under 1 NTU.',
      detail:
        turb > 20 && !alumMid
          ? 'Pre-settle first. Slow sand filtration only suits turbidity below about 10–20 NTU (0.1–0.4 m/h); rapid sand filters run at 5–10 m/h and need coagulation ahead of them.'
          : 'Small systems: slow sand filter (0.1–0.4 m/h) if raw turbidity stays low, otherwise a rapid sand filter (5–10 m/h) after coagulation. Target under 1 NTU before chlorine.',
    })
  }

  /* 4. pH correction */
  if (s.ph !== undefined && (s.ph < 6.5 || s.ph > 8.5)) {
    steps.push({
      stage: 'pH correction',
      why: `pH ${s.ph} is outside 6.5–8.5.`,
      detail:
        s.ph < 6.5
          ? 'Raise with soda ash or hydrated lime; titrate a sample to find the dose. Aim for pH 7–8 so chlorine stays effective and pipes are protected.'
          : 'Lower with CO₂ or a dilute acid; dose by titration. Chlorine works best at pH below 8.',
    })
  }

  /* 5. Hardness */
  if ((s.hardness ?? 0) > 200) {
    steps.push({
      stage: 'Softening (optional)',
      why: `Hardness ${s.hardness} mg/L as CaCO₃ will scale pipes and heaters.`,
      detail: 'Cation-exchange softener for small systems, or lime-soda softening at larger scale. Hardness is not a health risk, so this is a comfort decision.',
    })
  }

  /* 6. Contaminants that conventional treatment will not remove */
  const advanced: string[] = []
  if ((s.tds ?? 0) > 1000) advanced.push('high dissolved solids: reverse osmosis, or blend with a fresher source')
  if ((s.chloride ?? 0) > 300) advanced.push('chloride: reverse osmosis or blending')
  if ((s.sodium ?? 0) > 400) advanced.push('sodium: reverse osmosis or blending')
  if ((s.nitrate ?? 0) > 50) advanced.push('nitrate: anion-exchange or reverse osmosis; find and remove the pollution source')
  if ((s.fluoride ?? 0) > 1.5) advanced.push('fluoride: activated alumina or bone char; or use a different source')
  if ((s.arsenic ?? 0) > 0.01) advanced.push('arsenic: iron coagulation with adsorption, or activated alumina; confirm by laboratory test')
  if (advanced.length > 0) {
    steps.push({
      stage: 'Advanced treatment or a different source',
      why: 'These parameters are not removed by coagulation, filtration or chlorination.',
      detail: advanced.join('. ') + '.',
    })
  }

  /* 7. Disinfection (always) */
  const base = surface || (s.ecoli ?? 0) > 0 ? 3 : 2
  const total = base + oxidantDemand
  const hth = total / 0.7
  steps.push({
    stage: 'Disinfection',
    why: (s.ecoli ?? 0) > 0 ? `E. coli ${s.ecoli} CFU/100 mL detected.` : 'Final barrier against pathogens and protection in the pipe network.',
    detail:
      `First-guess chlorine dose ${total.toFixed(1)} mg/L${oxidantDemand > 0 ? ' (includes oxidation demand)' : ''}. ` +
      `Adjust with a chlorine-demand test so free residual is at least 0.5 mg/L after 30 min contact at pH below 8, ` +
      `and 0.2–0.5 mg/L at the tap. Calcium hypochlorite (70%) is about ${hth.toFixed(1)} g per m³.` +
      kgPerDay(hth, flow).replace('kg/day', 'kg/day of product'),
  })

  return steps
}

export const JAR_TEST_STEPS: string[] = [
  'Fill six 1 L beakers with raw water and note the starting turbidity, pH and alkalinity.',
  'Prepare a 1% alum stock (10 g in 1 L of water). Each 1 mL added to a 1 L jar equals 10 mg/L.',
  'Dose the jars across the range in the table below, all at the same moment if you can.',
  'Rapid mix at 100–120 rpm for 1 minute.',
  'Slow mix at 20–30 rpm for 15–20 minutes and watch when floc forms and how large it grows.',
  'Stop stirring and let the jars settle for 30 minutes.',
  'Draw supernatant from about 2 cm below the surface. Measure turbidity and pH.',
  'Choose the lowest dose that gives settled turbidity under 5 NTU (under 1 NTU after filtration) with good floc. Repeat with a narrower range around it, and with pH adjustment if the best jars struggle.',
]

export function jarSeries(centerDose: number): { dose: number; mL: number }[] {
  return [0.5, 0.75, 1, 1.25, 1.5, 2].map((f) => {
    const dose = Math.max(1, Math.round(centerDose * f))
    return { dose, mL: dose / 10 }
  })
}
