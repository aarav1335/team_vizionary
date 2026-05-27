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

## Prototype Writeup

### What have you done so far?

Created the CMIP6 data pipeline (temperature + precipitation, 4 SSP scenarios, 8 regions, 2015–2100), 6 static exploratory visualizations, project plan, and an interactive D3 line chart. Set up the scrollytelling page structure (hero section, sticky visualization panel, 7 scroll steps with static PNGs, and a takeaway section) with Scrollama integration. Deployed the scaffolding with a clean light theme using Inter font, responsive breakpoints, and smooth step-entrance animations. All data files (CSVs, TopoJSON world basemap, gridded JSON exports) are loaded and ready for Phase 3 interactive charts.

### What will be the most challenging of your project to design and why?

The geographic choropleth map with linked views. Converting gridded NetCDF data to renderable web formats, projecting it onto a world map, and ensuring smooth transitions between scenarios and time periods while keeping file sizes reasonable for browser loading will be the hardest technical challenge. Coordinating clicks on the map to update the other charts (line chart, bar chart, scatter plot) adds further complexity, as each linked view must respond to region selections across different data granularities.

## Data Source

CMIP6 multi-model ensemble data accessed via the Pangeo CMIP6 cloud catalog ([Google Storage](https://console.cloud.google.com/marketplace/product/noaa-public/cmip6)).
