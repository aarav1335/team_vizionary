# Climate Futures Explorer — CMIP6 Scrollytelling

**Team Vizionary · DSC 106 Final Project · UC San Diego**

An explorable explanation website that walks visitors through CMIP6 climate projections — from the accuracy of present-day climate models, to diverging futures under different SSP scenarios, to an interactive D3 visualization.

## Tech Stack

- Plain HTML/CSS/JS
- D3.js v7
- Scrollama (scrollytelling)
- TopoJSON (world basemap)
- Deployed on GitHub Pages

## Project Structure

```
├── index.html            # Main page
├── css/
│   └── style.css         # All styling
├── js/
│   ├── main.js           # Entry point — data loading + Scrollama
│   ├── scrollSections.js # Section trigger logic
│   ├── utils.js          # Shared constants & helpers
│   └── charts/           # D3 chart modules (Phase 3)
├── data/processed/       # CSV + JSON data exports
├── img/                  # Static PNG figures
└── project_plan.md       # Full project plan & rubric checklist
```

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Data preparation (notebook → CSVs + JSON grids) | ✅ Complete |
| 2 | Website scaffolding (HTML, CSS, Scrollama) | ✅ Complete |
| 3 | Interactive D3 visualizations | 🔜 In progress |
| 4 | Narrative & polish | ⬜ Pending |
| 5 | Deployment & deliverables | ⬜ Pending |

## Data Source

CMIP6 multi-model ensemble data accessed via the Pangeo CMIP6 cloud catalog ([Google Storage](https://console.cloud.google.com/marketplace/product/noaa-public/cmip6)).
