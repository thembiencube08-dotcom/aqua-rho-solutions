import type { Site, WaterBalanceInput } from '../types'
import type { DemandInput } from './demand'
import { computeWaterBalance } from './waterBalance'
import { DRINKING_RULES, evaluate, worst } from './rules'
import { alumBand, treatmentPlan } from './treatment'
import { langelier } from './outlook'

export interface AiChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  highlights?: string[]
  metrics?: { label: string; value: string; badge?: 'good' | 'watch' | 'poor' | 'info' }[]
  steps?: { title: string; desc: string }[]
  suggestedAction?: { label: string; view: 'dashboard' | 'site' | 'demand' | 'balance' | 'weather' | 'news' | 'map' | 'settings' }
  timestamp: string
}

/**
 * Call cloud Gemini API if user configured an API key in localStorage,
 * otherwise fall back seamlessly to our local water intelligence engine.
 */
export async function getAiResponse(
  prompt: string,
  context: {
    sites: Site[]
    activeSite: Site | null
    water: WaterBalanceInput
    demand: DemandInput
    view: 'dashboard' | 'site' | 'demand' | 'balance' | 'weather' | 'news' | 'map' | 'settings'
  }
): Promise<AiChatMessage> {
  const apiKey = localStorage.getItem('aquarho.gemini_api_key')?.trim()

  if (apiKey) {
    try {
      const liveAnswer = await callGeminiApi(prompt, context, apiKey)
      if (liveAnswer) {
        return {
          id: 'gemini_' + Date.now(),
          sender: 'assistant',
          text: liveAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local engine:', err)
      const local = generateLocalEngineResponse(prompt, context)
      return {
        ...local,
        text: local.text + ' (Live AI unavailable, so this is the offline answer. Check your API key.)',
      }
    }
  }

  // Built-in offline water engineering reasoning engine
  return generateLocalEngineResponse(prompt, context)
}

async function callGeminiApi(
  prompt: string,
  context: {
    sites: Site[]
    activeSite: Site | null
    water: WaterBalanceInput
    demand: DemandInput
    view: string
  },
  apiKey: string
): Promise<string> {
  const activeDesc = context.activeSite
    ? `Active source is ${context.activeSite.name} (${context.activeSite.type}), pH: ${context.activeSite.sample.ph ?? 'unknown'}, turbidity: ${context.activeSite.sample.turbidity ?? 'unknown'} NTU, iron: ${context.activeSite.sample.iron ?? 'unknown'} mg/L.`
    : `Total sources monitored: ${context.sites.length}.`

  const systemContext = `You are the AquaRho Solutions AI Water Intelligence Engineer. You provide authoritative, practical, and mathematically sound answers on water quality (WHO standards), treatment trains (aeration, coagulation, filtration, softening, RO, disinfection), IWA utility water balances (NRW), and irrigation (FAO 29 SAR). Current telemetry context: ${activeDesc}. Provide concise, professional, highly actionable answers.`

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

  const payload = {
    systemInstruction: { parts: [{ text: systemContext }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return text || ''
}

/**
 * Offline rule-based answers for common water questions (keyword routing).
 */
export function generateLocalEngineResponse(
  prompt: string,
  context: {
    sites: Site[]
    activeSite: Site | null
    water: WaterBalanceInput
    demand: DemandInput
    view: 'dashboard' | 'site' | 'demand' | 'balance' | 'weather' | 'news' | 'map' | 'settings'
  }
): AiChatMessage {
  const q = prompt.toLowerCase().trim()
  const id = 'resp_' + Date.now()
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const { sites, activeSite, water } = context

  const wb = computeWaterBalance(water)

  // â”€â”€ 0. Greetings & Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (
    q === 'hi' ||
    q === 'hello' ||
    q === 'hey' ||
    q.includes('who are you') ||
    q.includes('what can you do') ||
    q.includes('help me')
  ) {
    return {
      id,
      sender: 'assistant',
      text: `Hello! I am your **AquaRho Water Copilot**. You can ask me any question about water quality, treatment design, chemical dosages, pipe maintenance, or water loss reduction.`,
      highlights: [
        'Diagnose your monitored boreholes, wells, dams, or rivers against WHO guidelines.',
        'Calculate alum, chlorine, and permanganate doses for coagulating turbidity or removing iron & manganese.',
        'Troubleshoot water issues (foul odor, red/black staining, pipe corrosion, scale build-up).',
        'Analyze non-revenue water (NRW) and suggest leak detection strategies.',
      ],
      metrics: [
        { label: 'Active Context', value: activeSite ? activeSite.name : 'Dashboard', badge: 'info' },
        { label: 'Monitored Sources', value: `${sites.length}`, badge: 'good' },
      ],
      steps: [
        { title: 'Try asking:', desc: '"Why does my water smell like rotten eggs?" or "How do I calculate alum dose?" or "Is borehole water safe to drink?"' },
      ],
      timestamp,
    }
  }

  // â”€â”€ 1. Rotten Egg Odor / Hydrogen Sulfide (H2S) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\b(smell|odou?r|rotten egg|h2s|sulph?ur|sulfide)/.test(q)) {
    return {
      id,
      sender: 'assistant',
      text: `A "rotten egg" smell in groundwater is caused by **Hydrogen Sulfide gas (Hâ‚‚S)**, produced by sulfur-reducing bacteria living in low-oxygen subterranean aquifers or within water heater anode reactions.`,
      highlights: [
        'Aesthetic threshold: Humans can detect Hâ‚‚S at concentrations as low as 0.05 mg/L.',
        'Corrosiveness: Hâ‚‚S oxidizes to sulfuric acid (Hâ‚‚SOâ‚„), rapidly corroding copper pipes, brass fittings, and concrete.',
        'If the smell occurs only with hot water, the hot water cylinder sacrificial magnesium anode is reacting with sulfates; replace it with an aluminum-zinc anode.',
      ],
      metrics: [
        { label: 'Odor Threshold', value: '0.05 mg/L', badge: 'watch' },
        { label: 'Primary Remedy', value: 'Aeration + Chlorination', badge: 'good' },
      ],
      steps: [
        { title: '1. Cascade Aeration', desc: 'Stripping the volatile Hâ‚‚S gas into the atmosphere before storage.' },
        { title: '2. Shock Chlorination', desc: 'Dose chlorine at 8.4 mg Clâ‚‚ per 1 mg Hâ‚‚S to chemically oxidize sulfide to sulfate (SOâ‚„Â²â»).' },
        { title: '3. Catalytic Carbon Filter', desc: 'Pass through activated carbon with catalytic surface to adsorb trace mercaptans and residual sulfur.' },
      ],
      timestamp,
    }
  }

  // â”€â”€ 2. pH Problems (Acidic / Alkaline Water) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\bph\b|\bacid|\balkalin|\bsoda ash|\blime\b/.test(q)) {
    const activePh = activeSite?.sample.ph
    return {
      id,
      sender: 'assistant',
      text: `Water **pH** measures the hydrogen ion activity on a logarithmic scale from 0 to 14. The **WHO recommended drinking water range is 6.5 to 8.5**${activePh !== undefined ? ` (your active site measures **${activePh}**)` : ''}.`,
      highlights: [
        'Acidic water (pH < 6.5): Highly corrosive to plumbing, leaching copper (blue-green stains) and lead from solder.',
        'High pH (pH > 8.5): Reduces chlorine disinfection efficacy significantly; imparts a bitter soda taste and promotes scale.',
        'For coagulation with Alum, the optimal target operating pH band is 6.5 to 7.5.',
      ],
      metrics: [
        { label: 'WHO Min pH', value: '6.5', badge: 'good' },
        { label: 'WHO Max pH', value: '8.5', badge: 'good' },
        { label: 'Current Site pH', value: activePh !== undefined ? `${activePh}` : 'Not set', badge: activePh && (activePh < 6.5 || activePh > 8.5) ? 'poor' : 'good' },
      ],
      steps: [
        { title: 'To Raise Low pH (< 6.5)', desc: 'Dose Hydrated Lime [Ca(OH)â‚‚] or Soda Ash (Naâ‚‚COâ‚ƒ), or install a calcite (calcium carbonate) neutralizing filter bed.' },
        { title: 'To Lower High pH (> 8.5)', desc: 'Inject dilute sulfuric acid (Hâ‚‚SOâ‚„), hydrochloric acid (HCl), or sparge carbon dioxide (COâ‚‚) gas.' },
      ],
      suggestedAction: { label: 'Check Site pH Analysis', view: 'site' },
      timestamp,
    }
  }

  // â”€â”€ 3. Hard Water, Limescale & Softening â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\bhard|\bscal(e|ing)\b|\bcalcium\b|\bsoften|\bboiler/.test(q)) {
    return {
      id,
      sender: 'assistant',
      text: `**Water hardness** is primarily caused by dissolved polyvalent metallic cations, predominantly **Calcium (CaÂ²âº)** and **Magnesium (MgÂ²âº)**. It causes white chalky crusts (limescale) in kettles, pipes, solar geysers, and boiler tubes.`,
      highlights: [
        'Soft water: < 60 mg/L as CaCOâ‚ƒ.',
        'Moderately hard: 60 - 120 mg/L.',
        'Hard water: 120 - 180 mg/L.',
        'Very hard: > 180 mg/L (causes severe scaling in pumps and membrane systems).',
      ],
      metrics: [
        { label: 'Ideal Drinking Hardness', value: '80 - 120 mg/L', badge: 'good' },
        { label: 'Severe Scaling Threshold', value: '> 180 mg/L', badge: 'poor' },
      ],
      steps: [
        { title: '1. Cation-Exchange Water Softener', desc: 'Pass water through a strong acid cation (SAC) resin in the sodium form (Naâº). Calcium and magnesium ions bind to resin beads and release benign sodium ions.' },
        { title: '2. Reverse Osmosis (RO)', desc: 'High-pressure semi-permeable membranes reject up to 99% of multivalent calcium and magnesium ions.' },
        { title: '3. Lime Softening (Municipal Scale)', desc: 'Add hydrated lime to precipitate calcium as insoluble calcium carbonate (CaCOâ‚ƒ) and magnesium as magnesium hydroxide.' },
      ],
      timestamp,
    }
  }

  // â”€â”€ 4. Bacteria, E. Coli & Coliform Disinfection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\bbacteria|\be\.? ?coli|\bcoliform|\bpathogen|\bdisinfect|\bchlorin|\buv\b|\bboil(ing)?\b/.test(q)) {
    return {
      id,
      sender: 'assistant',
      text: `**Microbiological safety** is the non-negotiable cornerstone of drinking water. Under WHO guidelines, **E. coli and total fecal coliforms must be ZERO (0 CFU/100 mL)** in any drinking water supply.`,
      highlights: [
        'Presence of E. coli indicates recent fecal contamination with risks of cholera, dysentery, typhoid, and hepatitis.',
        'Residual protection: Free chlorine residual must be maintained at 0.2 to 0.5 mg/L at consumer taps to prevent secondary regrowth in pipe networks.',
        'UV disinfection provides chemical-free inactivation without chlorine byproducts, but requires clear water (< 1 NTU turbidity).',
      ],
      metrics: [
        { label: 'WHO E. coli Limit', value: '0 CFU/100 mL', badge: 'good' },
        { label: 'Free Clâ‚‚ Target at Tap', value: '0.2 - 0.5 mg/L', badge: 'good' },
        { label: 'Turbidity for UV', value: '< 1.0 NTU', badge: 'watch' },
      ],
      steps: [
        { title: '1. Shock Disinfection / Boiling', desc: 'For immediate household emergencies, bring water to a rolling boil for 1 full minute to destroy all enteric pathogens.' },
        { title: '2. Continuous Chlorination', desc: 'Dose sodium hypochlorite (NaOCl) to meet water chlorine demand plus a 0.5 mg/L free chlorine residual after 30 minutes contact time.' },
        { title: '3. Germicidal UV Irradiation', desc: 'Deploy 254 nm wavelength UV lamps delivering â‰¥ 40 mJ/cmÂ² dose, preceded by a 5-micron pre-filter.' },
      ],
      suggestedAction: { label: 'Review Disinfection Train', view: 'site' },
      timestamp,
    }
  }

  // â”€â”€ 5. Can I drink borehole / well / river water? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (q.includes('can i drink') || q.includes('safe to drink') || q.includes('potable') || q.includes('drinkable')) {
    return {
      id,
      sender: 'assistant',
      text: `**Never assume raw borehole, well, or surface water is safe to drink without testing.** Even sparkling clear water can harbor invisible pathogens (E. coli), toxic heavy metals (arsenic, lead), or high nitrates.`,
      highlights: [
        'Groundwater often appears pristine but can have elevated arsenic, fluoride, radon, or high hardness.',
        'Surface water (rivers, dams, rainwater) almost always carries microbial contamination and seasonal turbidity.',
        'A comprehensive lab test should verify: Microbiological (E. coli), Core (pH, Turbidity, TDS, Nitrate), and Minerals (Iron, Manganese, Fluoride, Arsenic).',
      ],
      metrics: [
        { label: 'Minimum Tests Required', value: 'Microbiology + Core', badge: 'info' },
        { label: 'Standard Disinfection', value: 'Mandatory', badge: 'poor' },
      ],
      steps: [
        { title: 'Step 1: Water Test Sample', desc: 'Collect a sterile sample from the source head and enter results into AquaRho to evaluate against WHO guidelines.' },
        { title: 'Step 2: Install Multi-Barrier Protection', desc: 'Standard setup: 5-micron sediment pre-filter â†’ activated carbon block â†’ terminal UV or chlorine dosing.' },
      ],
      suggestedAction: { label: 'Analyze Source on Dashboard', view: 'dashboard' },
      timestamp,
    }
  }

  // â”€â”€ 6. Reverse Osmosis vs Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\breverse osmosis|\bro\b|\bultrafiltration|\bfilters?\b/.test(q)) {
    return {
      id,
      sender: 'assistant',
      text: `Different filtration technologies address distinct particle sizes and contaminants. Here is the operational comparison:`,
      highlights: [
        'Sediment / Sand Filters (5 - 50 microns): Removes dirt, silt, sand, rust flocs. Does NOT remove dissolved salts or bacteria.',
        'Activated Carbon (1 - 10 microns): Adsorbs chlorine, pesticides, odors, bad tastes, and organic chemicals.',
        'Ultrafiltration (UF, 0.01 - 0.1 microns): Retains suspended solids, bacteria, and large viruses; allows beneficial dissolved minerals to pass through.',
        'Reverse Osmosis (RO, 0.0001 microns): Strips virtually all dissolved minerals, salts, nitrates, fluoride, and heavy metals. Generates brine reject water (typically 20-40% recovery).',
      ],
      metrics: [
        { label: 'RO Salt Rejection', value: '95 - 99%', badge: 'good' },
        { label: 'RO Waste Ratio', value: '1:1 to 1:3', badge: 'watch' },
      ],
      steps: [
        { title: 'When to choose RO:', desc: 'Boreholes with TDS > 1000 mg/L, high fluoride (> 1.5 mg/L), nitrates (> 50 mg/L), or brackish/saline groundwater.' },
        { title: 'When to choose Media/UF:', desc: 'Water has low TDS but has turbidity, mud, iron flocs, or bacterial risk.' },
      ],
      timestamp,
    }
  }

  // â”€â”€ 7. Alum, Coagulation & Turbidity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\bturbid|\balum\b|\bcoagula|\bmuddy|\bjar test/.test(q)) {
    const rawTurb = activeSite?.sample.turbidity ?? 20
    const band = alumBand(rawTurb)
    return {
      id,
      sender: 'assistant',
      text: `For turbid water (**${rawTurb} NTU**), chemical coagulation destabilizes colloidal particles so they clump into settleable flocs. Standard starting alum [Alâ‚‚(SOâ‚„)â‚ƒÂ·14Hâ‚‚O] band is **${band.low} â€“ ${band.high} mg/L** (recommended midpoint: **${band.mid} mg/L**).`,
      highlights: [
        `WHO drinking water target: < 1.0 NTU for clean taste and reliable chlorination disinfection.`,
        `Alkalinity check: 1 mg/L alum consumes ~0.5 mg/L alkalinity as CaCOâ‚ƒ. If raw alkalinity is low, add soda ash or lime to avoid acidic drop.`,
        `Jar testing is essential to dial in the exact optimal coagulant dose without overdosing or underdosing.`,
      ],
      metrics: [
        { label: 'Recommended Starting Dose', value: `${band.mid} mg/L`, badge: 'good' },
        { label: 'Dose Range', value: `${band.low} - ${band.high} mg/L`, badge: 'info' },
        { label: 'Target Turbidity', value: '< 1.0 NTU', badge: 'good' },
      ],
      steps: [
        { title: '1. Flash Mixing (60s)', desc: '100-120 RPM rapid agitation upon chemical dosing.' },
        { title: '2. Flocculation (15 min)', desc: 'Gentle slow stirring (30-40 RPM) to grow heavy flocs.' },
        { title: '3. Sedimentation (20-30 min)', desc: 'Quiescent settling tank before rapid sand filtration.' },
      ],
      suggestedAction: { label: 'Open Jar Test Tool', view: 'site' },
      timestamp,
    }
  }

  // â”€â”€ 8. Iron and Manganese Removal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\biron\b|\bmanganese|\bbrown water|\bblack stain|\brust/.test(q)) {
    return {
      id,
      sender: 'assistant',
      text: `Iron and manganese precipitate out of solution when exposed to air, staining laundry, sinks, and causing bitter metallic tastes.`,
      highlights: [
        'Thresholds: Iron > 0.3 mg/L and Manganese > 0.1 mg/L cause complaints.',
        'Oxidant demand: 0.64 mg chlorine per 1 mg iron; 1.29 mg chlorine per 1 mg manganese.',
        'Manganese requires pH â‰¥ 8.0 or catalytic media (greensand, Birm, or pyrolusite) to oxidize efficiently.',
      ],
      metrics: [
        { label: 'Fe Max Aesthetic', value: '0.3 mg/L', badge: 'info' },
        { label: 'Mn Max Aesthetic', value: '0.1 mg/L', badge: 'info' },
      ],
      steps: [
        { title: '1. Aeration', desc: 'Spray or tray cascade aeration to oxidize dissolved FeÂ²âº into insoluble FeÂ³âº.' },
        { title: '2. Media Filtration', desc: 'Pass through catalytic manganese greensand media filter beds.' },
      ],
      suggestedAction: { label: 'View Treatment Steps', view: 'site' },
      timestamp,
    }
  }

  // â”€â”€ 9. Non-Revenue Water (NRW) & Utility Balances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\bnrw\b|\bleak|\bwater balance|\bnon[- ]?revenue|\bwater loss/.test(q)) {
    const nrwPct = wb.nrwPct.toFixed(1)
    return {
      id,
      sender: 'assistant',
      text: `Utility Non-Revenue Water (NRW) is water pumped into the distribution system that is not billed to customers due to physical leakage or commercial inaccuracies. Your system currently runs at **${nrwPct}% NRW**.`,
      highlights: [
        `Real physical losses: ${(wb.real / 1000).toFixed(1)}k mÂ³/month (buried pipe leaks, tank overflows).`,
        `Apparent/commercial losses: ${(wb.apparent / 1000).toFixed(1)}k mÂ³/month (meter under-registration and illegal consumption).`,
        `Billed revenue water: ${(wb.billedAuthorised / 1000).toFixed(1)}k mÂ³/month.`,
      ],
      metrics: [
        { label: 'Current NRW %', value: `${nrwPct}%`, badge: wb.nrwPct > 25 ? 'poor' : 'good' },
        { label: 'Real Leakage Volume', value: `${(wb.real / 1000).toFixed(1)}k mÂ³`, badge: 'watch' },
      ],
      steps: [
        { title: '1. District Metered Areas (DMAs)', desc: 'Isolate network sectors with flow meters to isolate high-night-flow leakage zones.' },
        { title: '2. Acoustic Leak Detection', desc: 'Deploy correlators and ground listening microphones along pipe routes.' },
        { title: '3. Pressure Management', desc: 'Install PRVs to reduce excessive night-time pressures that rupture aged pipes.' },
      ],
      suggestedAction: { label: 'Open Utility Water Balance', view: 'balance' },
      timestamp,
    }
  }

  // â”€â”€ 10. Irrigation, FAO 29 & SAR (Sodium Adsorption Ratio) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\birrigat|\bsar\b|\bcrops?\b|\bfarm|\bsalinity|\bsoil/.test(q)) {
    return {
      id,
      sender: 'assistant',
      text: `For agriculture and irrigation, **FAO 29 guidelines** evaluate water suitability based on **Salinity (ECw)** and **Sodium Adsorption Ratio (SAR)** to prevent soil infiltration failure and crop leaf burn.`,
      highlights: [
        'SAR formula: SAR = Naâº / âˆš((CaÂ²âº + MgÂ²âº) / 2). High sodium relative to calcium breaks down soil aggregates.',
        'SAR < 3: No infiltration restriction. SAR 3-6: Slight restriction. SAR > 9: Severe infiltration hazard.',
        'Salinity (EC): EC < 0.7 dS/m is safe for all crops; EC > 3.0 dS/m limits you to salt-tolerant crops (barley, date palm).',
      ],
      metrics: [
        { label: 'Ideal SAR', value: '< 3.0', badge: 'good' },
        { label: 'Severe SAR', value: '> 9.0', badge: 'poor' },
        { label: 'Ideal EC', value: '< 0.7 dS/m', badge: 'good' },
      ],
      steps: [
        { title: 'Remediation for High SAR:', desc: 'Apply agricultural gypsum (calcium sulfate, CaSOâ‚„) to water or soil to supply calcium and displace excess sodium.' },
      ],
      suggestedAction: { label: 'Check Farm Water Demand', view: 'demand' },
      timestamp,
    }
  }

  // â”€â”€ 11. Active Site Diagnostics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (/\bdiagnos|\bactive (site|source)|\bmy sample|\bcurrent sample/.test(q)) {
    if (activeSite) {
      const findings = evaluate(DRINKING_RULES, activeSite.sample)
      const level = worst(findings)
      const plans = treatmentPlan(activeSite.sample, activeSite.type, activeSite.flow)
      const lsi = langelier(activeSite.sample)

      return {
        id,
        sender: 'assistant',
        text: `Diagnostics for **${activeSite.name}** (${activeSite.type}): Sample evaluated against WHO Drinking Water Guidelines. Overall health status is **${level.toUpperCase()}**.`,
        highlights: [
          `Total evaluated parameters: ${findings.length}`,
          lsi ? `Langelier Saturation Index (LSI): ${lsi.value} (${lsi.text})` : 'LSI requires pH, Calcium, Alkalinity, and TDS.',
          `Requires ${plans.length} treatment train unit operation(s).`,
        ],
        metrics: [
          { label: 'Status', value: level.toUpperCase(), badge: level === 'poor' ? 'poor' : level === 'watch' ? 'watch' : 'good' },
          { label: 'Treatment Stages', value: `${plans.length} steps`, badge: 'info' },
        ],
        steps: plans.map((p) => ({ title: p.stage, desc: `${p.why} ${p.detail}` })),
        suggestedAction: { label: `Inspect ${activeSite.name}`, view: 'site' },
        timestamp,
      }
    } else {
      return {
        id,
        sender: 'assistant',
        text: `You have ${sites.length} water source(s) recorded in your system. Select one from the dashboard or load demo data to view automated site diagnostics.`,
        suggestedAction: { label: 'Go to Dashboard', view: 'dashboard' },
        timestamp,
      }
    }
  }

  // â”€â”€ 12. Offline fallback (question not covered by keyword routing) â”€â”€â”€â”€â”€â”€â”€â”€
  return {
    id,
    sender: 'assistant',
    text: `I can't answer "${prompt}" offline. The built-in assistant only covers common water topics â€” add a Gemini API key in the chat settings (the gear icon) to ask anything.`,
    highlights: [
      'Water quality â€” pH, turbidity, hardness, iron, manganese, bacteria and disinfection.',
      'Treatment â€” coagulation, filtration, softening, reverse osmosis and jar testing.',
      'Utilities and farms â€” non-revenue water, water balance, irrigation and SAR.',
    ],
    metrics: [
      { label: 'Monitored Sources', value: `${sites.length}`, badge: 'info' },
    ],
    suggestedAction: { label: 'Go to Dashboard', view: 'dashboard' },
    timestamp,
  }
}
