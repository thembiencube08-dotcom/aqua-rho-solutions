import assert from 'node:assert/strict'
import { DRINKING_RULES, evaluate, worst, derive } from '../src/lib/rules'
import { DEMO_SITES } from '../src/demo'
import { alumBand, treatmentPlan } from '../src/lib/treatment'
import { langelier, outlook } from '../src/lib/outlook'
import { computeWaterBalance, DEFAULT_WATER_BALANCE } from '../src/lib/waterBalance'
import { DEFAULT_DEMAND } from '../src/lib/demand'
import { generateLocalEngineResponse } from '../src/lib/aiAssistant'

const near = (a: number, b: number, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b} within ${tol}`)

// ── evaluate + worst ──────────────────────────────────────────────────────
const levelFor = (sample: object, key: string) =>
  evaluate(DRINKING_RULES, sample).find((f) => f.key === key)?.level

assert.equal(levelFor({ ecoli: 0 }, 'ecoli'), 'good')
assert.equal(levelFor({ ecoli: 1 }, 'ecoli'), 'poor')
assert.equal(levelFor({ ph: 7 }, 'ph'), 'good')
assert.equal(levelFor({ ph: 6.2 }, 'ph'), 'watch')
assert.equal(levelFor({ ph: 5.9 }, 'ph'), 'poor')
assert.equal(worst([]), 'none')

// ── derive ────────────────────────────────────────────────────────────────
const dHard = derive({ calcium: 70, magnesium: 25 })
assert.equal(dHard.hardness, Math.round(70 * 2.497 + 25 * 4.118))

const dSar = derive({ sodium: 55, calcium: 70, magnesium: 25 })
assert.ok(dSar.sar !== undefined, 'expected a derived SAR')
near(dSar.sar!, 1.4, 0.05)

// ── demo sites: worst drinking status ─────────────────────────────────────
const statuses = DEMO_SITES.map((s) => worst(evaluate(DRINKING_RULES, s.sample)))
assert.deepEqual(statuses, ['watch', 'poor', 'poor'])

// ── alumBand ──────────────────────────────────────────────────────────────
assert.deepEqual(alumBand(10), { low: 10, high: 20, mid: 15 })
assert.deepEqual(alumBand(10.1), { low: 20, high: 40, mid: 30 })
assert.equal(alumBand(500).high, 150)

// ── treatmentPlan ──────────────────────────────────────────────────────────
const demo1 = DEMO_SITES[0]
const plan = treatmentPlan(demo1.sample, demo1.type, demo1.flow)
const oxid = plan.find((s) => s.stage === 'Aeration and oxidation')
assert.ok(oxid, 'expected an aeration/oxidation step')
assert.ok(oxid!.detail.includes('1.0 mg/L chlorine'), `detail was: ${oxid!.detail}`)
assert.equal(plan[plan.length - 1].stage, 'Disinfection')

// pH above 8.5 must not suggest aeration "in reverse" (aeration raises pH)
const planPh = treatmentPlan({ ph: 9 }, 'borehole')
assert.ok(
  !planPh.some((s) => s.detail.includes('in reverse')),
  'pH>8.5 detail must not say "in reverse"'
)

// ── langelier + outlook ───────────────────────────────────────────────────
assert.equal(langelier({ ph: 7 }), null)
const lsi = langelier({ ph: 8, calcium: 80, alkalinity: 100, tds: 300, temp: 25 })
assert.ok(lsi, 'expected an LSI value')
assert.ok(Math.abs(lsi!.value) < 0.6, `LSI ${lsi!.value} not near balanced`)

const o3 = outlook(
  DEMO_SITES[2].sample,
  DEMO_SITES[2].type,
  evaluate(DRINKING_RULES, DEMO_SITES[2].sample)
)
assert.equal(o3.status, 'Advanced treatment or a different source needed')

// ── water balance ─────────────────────────────────────────────────────────
const wb = computeWaterBalance(DEFAULT_WATER_BALANCE)
assert.equal(wb.siv, wb.authorised + wb.apparent + wb.real)
assert.equal(wb.nrw, wb.unbilledAuthorised + wb.apparent + wb.real)
near(wb.nrwPct, 34, 0.5)
assert.equal(wb.consistent, true)

// ── assistant routing ─────────────────────────────────────────────────────
const ctx = {
  sites: [],
  activeSite: null,
  water: DEFAULT_WATER_BALANCE,
  demand: DEFAULT_DEMAND,
  view: 'dashboard' as const,
}
const ask = (prompt: string) => generateLocalEngineResponse(prompt, ctx)

const phAns = ask('How do I lower pH?')
assert.ok(phAns.text.includes('hydrogen ion activity'), `got: ${phAns.text}`)

const phosphate = ask('How do I remove phosphate?')
assert.ok(!phosphate.text.includes('hydrogen ion activity'), `got: ${phosphate.text}`)

const ingredient = ask('What is the active ingredient in tablets?')
assert.ok(!ingredient.text.includes('Microbiological safety'), `got: ${ingredient.text}`)

const pump = ask('What is the best pump for a borehole?')
assert.ok(pump.text.includes("can't answer"), `got: ${pump.text}`)

const permit = ask('Do I need to research a permit?')
assert.ok(permit.text.includes("can't answer"), `got: ${permit.text}`)

const smell = ask('Why does my water smell like rotten eggs?')
assert.ok(smell.text.includes('Hydrogen Sulfide'), `got: ${smell.text}`)

const ecoli = ask('Is E. coli dangerous?')
assert.ok(ecoli.text.includes('Microbiological safety'), `got: ${ecoli.text}`)

console.log('all core tests passed')
