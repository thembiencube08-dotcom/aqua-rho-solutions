# Aqua Rho Solutions

Water quality and treatment platform (MVP). React + TypeScript + Vite, data kept in the browser (localStorage) for now.

## Run

```
npm install
npm run dev
```

Open the local URL, press **Load demo data** on the dashboard, and open a source.

## What is in it

- **Dashboard**: all water sources (borehole, well, dam, lake, river, spring, rainwater, reticulation) with drinking / irrigation / fish pond status, plus non-revenue water.
- **Drinking and treatment**: enter test results, get findings against WHO guidelines and an ordered treatment train (aeration and oxidation, coagulation, filtration, pH, softening, advanced treatment, disinfection) with starting doses and kg/day when flow is given.
- **Groundwater outlook**: predicted status, Langelier scaling/corrosion index, improvement actions, typical risks by source type.
- **Irrigation**: FAO 29 guidelines including SAR from Na, Ca, Mg.
- **Fish pond**: warm-water species ranges.
- **Jar test**: step-by-step guideline and a dose planner for 1% alum stock.
- **Water balance**: IWA-style nested blocks, summing any number of sources.
- **Water demand**: farm and mine sources, uses, conveyance and evaporation losses, shortfall or surplus.
- **AI bar**: offline keyword answers; an optional Gemini API key stays in the browser.

## Structure

```
src/lib/rules.ts         thresholds and the evaluate() engine (edit limits here)
src/lib/treatment.ts     treatment train, doses, jar test
src/lib/outlook.ts       groundwater outlook, Langelier index, source risks
src/lib/waterBalance.ts  IWA water balance maths
src/lib/demand.ts        farm and mine water demand, uses and losses
src/lib/aiAssistant.ts   offline keyword routing + optional Gemini call
src/pages/               Dashboard, SiteAnalysis, WaterDemand, WaterBalance
tests/                   demand and core logic tests (node:assert)
```

## Notes

- Results are indicative. Doses are starting points for jar tests, and critical parameters (arsenic, fluoride, microbiology) need laboratory confirmation.
- Next steps: Supabase for saved sites and sample history, charts of results over time, report export (PDF), then the climate site and GIS weather layer.
