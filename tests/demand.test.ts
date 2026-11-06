import assert from 'node:assert/strict'
import { activityDemand, computeDemand, DEFAULT_DEMAND, MINING_DEMAND } from '../src/lib/demand'
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
// 8 ha x 110 mm = 8800 m3 net; at 75% efficiency gross = 11733.33
near(activityDemand(DEFAULT_DEMAND.activities[0]).net, 8800)
near(activityDemand(DEFAULT_DEMAND.activities[0]).gross, 8800 / 0.75)
// 80 cattle x 45 L x 30 d = 108 m3
near(activityDemand(DEFAULT_DEMAND.activities[2]).net, 108)
// camp: 300 x 150 x 30 / 1000 = 1350
near(activityDemand(MINING_DEMAND.activities[3]).net, 1350)
const r = computeDemand(DEFAULT_DEMAND)
near(r.totalIn, 15000)
near(r.conveyanceLoss, 1500)
near(r.evaporation, 1.5 * 180 * 10) // 2700
near(r.availableAtPoint, 15000 - 1500 - 2700)
// conservation: in = conveyance + evaporation + gross demand + (surplus - shortfall)
near(r.totalIn, r.conveyanceLoss + r.evaporation + r.grossDemand + r.surplus - r.shortfall)
assert.ok(r.efficiencyPct < 100 && r.efficiencyPct > 0)
// negative / NaN safety and zero sources
const z = computeDemand({ ...DEFAULT_DEMAND, sources: [], activities: [{ id: 'x', kind: 'crop', name: 'bad', areaHa: NaN, mmPerMonth: -5, efficiencyPct: 0 }] })
assert.equal(z.totalIn, 0); assert.equal(z.efficiencyPct, 0); assert.equal(z.shortfall, 0)
const m = computeDemand(MINING_DEMAND)
near(m.recycledPct, 60)
console.log('all demand tests passed')
