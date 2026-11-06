import type { WaterBalanceInput } from '../types'

export interface WaterBalanceResult {
  siv: number
  billedAuthorised: number
  unbilledAuthorised: number
  authorised: number
  apparent: number
  real: number
  losses: number
  revenueWater: number
  nrw: number
  nrwPct: number
  lossPct: number
  consistent: boolean
}

/** IWA standard water balance. Real losses (leakage) are the remainder. */
export function computeWaterBalance(w: WaterBalanceInput): WaterBalanceResult {
  const siv = w.sources.reduce((sum, s) => sum + (s.volume || 0), 0)
  const billedAuthorised = w.billedMetered + w.billedUnmetered
  const unbilledAuthorised = w.unbilledMetered + w.unbilledUnmetered
  const authorised = billedAuthorised + unbilledAuthorised
  const apparent = w.unauthorised + w.meterErrors
  const real = siv - authorised - apparent
  const losses = apparent + real
  const revenueWater = billedAuthorised
  const nrw = siv - revenueWater
  return {
    siv,
    billedAuthorised,
    unbilledAuthorised,
    authorised,
    apparent,
    real,
    losses,
    revenueWater,
    nrw,
    nrwPct: siv > 0 ? (nrw / siv) * 100 : 0,
    lossPct: siv > 0 ? (losses / siv) * 100 : 0,
    consistent: real >= 0,
  }
}

export const DEFAULT_WATER_BALANCE: WaterBalanceInput = {
  sources: [
    { id: 's1', name: 'Borehole 1', type: 'borehole', volume: 6000 },
    { id: 's2', name: 'Dam off-take', type: 'dam', volume: 4000 },
  ],
  billedMetered: 6200,
  billedUnmetered: 400,
  unbilledMetered: 250,
  unbilledUnmetered: 350,
  unauthorised: 300,
  meterErrors: 250,
}
