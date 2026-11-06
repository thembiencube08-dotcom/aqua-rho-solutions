import type { Site } from './types'

export const DEMO_SITES: Site[] = [
  {
    id: 'demo-1',
    name: 'Ntabazinduna borehole',
    type: 'borehole',
    date: '2026-10-20',
    flow: 120,
    lat: -20.0461,
    lng: 28.8468,
    sample: { ph: 6.9, turbidity: 3.2, ec: 820, temp: 24, alkalinity: 210, calcium: 70, magnesium: 25, sodium: 55, chloride: 80, iron: 1.1, manganese: 0.25, nitrate: 18, fluoride: 0.9, ecoli: 0 },
  },
  {
    id: 'demo-2',
    name: 'Community dam off-take',
    type: 'dam',
    date: '2026-10-21',
    flow: 300,
    lat: -20.3125,
    lng: 28.9241,
    sample: { ph: 7.8, turbidity: 45, ec: 310, temp: 27, alkalinity: 80, calcium: 22, magnesium: 8, sodium: 18, chloride: 25, iron: 0.4, manganese: 0.05, nitrate: 6, ecoli: 40, do: 6.2, ammonia: 0.3, nitrite: 0.05 },
  },
  {
    id: 'demo-3',
    name: 'Saline well, Plumtree road',
    type: 'well',
    date: '2026-10-22',
    lat: -20.2584,
    lng: 28.4527,
    sample: { ph: 8.4, turbidity: 1.5, ec: 3100, temp: 26, alkalinity: 360, calcium: 90, magnesium: 60, sodium: 520, chloride: 640, iron: 0.1, nitrate: 62, fluoride: 1.8, ecoli: 12 },
  },
]
