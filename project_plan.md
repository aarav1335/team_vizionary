# CMIP6 Climate Scrollytelling Website — Project Plan

> **Course**: DSC 106 — Final Project  
> **Team**: Team Vizionary  
> **Due Dates**: Initial Prototype — May 26, 2026 · Final Deliverables — June 9, 2026  
> **Tech Stack**: Plain HTML/CSS/JS + D3.js v7 + Scrollama + TopoJSON · GitHub Pages

---

## Table of Contents

1. [Overview](#overview)
2. [Story Arc](#story-arc)
3. [Page Structure](#page-structure)
4. [Phase 1 — Data Preparation](#phase-1--data-preparation)
5. [Phase 2 — Website Scaffolding](#phase-2--website-scaffolding)
6. [Phase 3 — Interactive D3 Visualizations](#phase-3--interactive-d3-visualizations)
7. [Phase 4 — Narrative & Polish](#phase-4--narrative--polish)
8. [Phase 5 — Deployment & Deliverables](#phase-5--deployment--deliverables)
9. [Prototype Scope (May 26)](#prototype-scope-may-26)
10. [File Structure](#file-structure)
11. [Key Decisions](#key-decisions)
12. [Appendix: Course Rubric Checklist](#appendix-course-rubric-checklist)

---

## Overview

An **explorable explanation** that walks visitors through CMIP6 climate projections — from the accuracy of present-day climate models, to the diverging futures under different SSP scenarios, to an interactive D3 visualization where users explore the data themselves.

| Aspect | Detail |
|--------|--------|
| **Topic** | How different emissions scenarios (SSPs) shape regional climate futures |
| **Variables** | Near-surface air temperature (`tas`) and precipitation (`pr`) — start here, expand later |
| **Scenarios** | SSP1-2.6, SSP2-4.5, SSP3-7.0, SSP5-8.5 |
| **Regions** | Arctic, North America, South America, Europe, Africa, South Asia, Australia + Global |
| **Time Range** | 2015–2100 |
| **Narrative** | And-but-therefore structure |
| **Deployment** | GitHub Pages |

---

## Story Arc

Following the **and-but-therefore** structure required by the rubric:

1. **Hook (And)** — *"We have accurate climate models that can project the future with remarkable precision. Scientists at over 40 institutions worldwide have built the CMIP6 ensemble — the most comprehensive climate simulations ever created."*

2. **Tension (But)** — *"But most people only hear about 'climate change' as a single, vague concept. The reality is far more nuanced — different emissions pathways lead to dramatically different futures for different regions. The difference between 1.5°C and 4.5°C of warming isn't just a number — it's the difference between manageable adaptation and catastrophic transformation."*

3. **Resolution (Therefore)** — *"Therefore, explore the projections yourself. See how your choices and the choices of policymakers today shape the climate of tomorrow. This interactive visualization lets you compare scenarios, zoom into your region, and understand what each pathway really means."*

4. **Takeaway** — *"The future isn't written yet. Every fraction of a degree of warming prevented matters — especially for the Arctic, which warms four times faster than the global average, and for regions already on the edge of water security."*

---

## Page Structure

```
┌──────────────────────────────────────────────┐
│                HERO SECTION                   │
│  Full-screen · Tagline · Scroll-down prompt   │
├──────────────────────────────────────────────┤
│  ┌──────────┐  ┌────────────────────────┐    │
│  │  STICKY  │  │  SCROLLABLE TEXT       │    │
│  │  VIZ     │  │  Step 1: Context       │    │
│  │  PANEL   │  │  Step 2: Static Vizzes │    │
│  │           │  │  Step 3: SSP Deep Dive│    │
│  │ (updates  │  │  Step 4: Interactive  │    │
│  │  on each  │  │  Step 5: Takeaway     │    │
│  │  step)    │  │                        │    │
│  └──────────┘  └────────────────────────┘    │
├──────────────────────────────────────────────┤
│               TAKEAWAY SECTION                │
│  Clear final message + attribution             │
└──────────────────────────────────────────────┘
```

### Section Breakdown

| Scroll Step | Text Content | Viz Panel Shows |
|-------------|-------------|-----------------|
| **Hero** | Full-screen title + subtitle + scroll indicator | — (background image or gradient) |
| **1 — Context** | What is CMIP6? What are SSPs? Brief explainer of the four pathways | Static: existing temperature map PNG |
| **2 — Current State** | Present-day warming is already here (2015–2024 anomalies) | Static: existing precipitation map PNG |
| **3 — SSP5-8.5 (Worst Case)** | If emissions continue unchecked — the "business as usual" path | Static: line chart showing all 4 scenarios diverging |
| **4 — SSP3-7.0 (High)** | Regional breakdown — who gets hit hardest? | Static: regional warming bars |
| **5 — SSP2-4.5 (Middle)** | The middle path — still significant, but manageable | Static: temperature vs precipitation scatter |
| **6 — SSP1-2.6 (Best Case)** | What if we act aggressively? The hopeful path | Static: regional heatmap |
| **7 — Interactive Exploration** | *"Now you explore — toggle scenarios, compare regions, see what changes."* | **Interactive D3**: line chart + map + bar chart, coordinated |
| **8 — Takeaway** | Final message + what this means for the viewer | Interactive D3: final state with annotations |

> **Note**: For the prototype, scroll steps 1–6 will use the existing static PNGs from `figures/`. Steps 7–8 will be fleshed out with interactive D3 for the final.

---

## Phase 1 — Data Preparation

### 1.1 Export gridded CMIP6 fields as GeoJSON/TopoJSON

Modify `notebooks/cmip6_static_visualizations.ipynb` to add export cells that convert the xarray grids to GeoJSON FeatureCollections.

**Approach**: Instead of polygonizing every grid cell (complex), render gridded data as positioned SVG `<rect>` elements in D3. This means we export the grid values as a simple JSON array:

```python
# Idea — export grid as JSON
grid_data = future["ssp585"]["tas"].sel(year=2100).compute()
grid_df = grid_data.to_dataframe().reset_index()
grid_df.to_json("../data/processed/grids/ssp585_tas_2100.json", orient="records")
```

| File | Contents |
|------|----------|
| `data/processed/grids/ssp126_tas_2100.json` | Gridded temperature, late-century, SSP1-2.6 |
| `data/processed/grids/ssp245_tas_2100.json` | Gridded temperature, late-century, SSP2-4.5 |
| `data/processed/grids/ssp370_tas_2100.json` | Gridded temperature, late-century, SSP3-7.0 |
| `data/processed/grids/ssp585_tas_2100.json` | Gridded temperature, late-century, SSP5-8.5 |
| (repeat for `pr`) | ... |

### 1.2 Create/download world basemap TopoJSON

- Use [TopoJSON world-atlas](https://github.com/topojson/world-atlas) — provides `countries-110m.json` and `countries-50m.json`
- Save to `data/processed/world-110m.json`

### 1.3 Verify existing CSVs

Both `cmip6_anomaly_timeseries.csv` and `cmip6_region_summary.csv` are already clean and well-structured for D3. No changes needed.

### 1.4 (Optional) Additional statistics

- Year each region crosses 1.5°C, 2°C, 3°C thresholds per scenario
- Rate of warming (°C/decade) per region per scenario
- Extreme precipitation change (dry regions getting drier, wet regions getting wetter?)

---

## Phase 2 — Website Scaffolding

### 2.1 Initialize file structure

```
team_vizionary/
├── index.html            # Main page — all content in one file (or modular components)
├── README.md
├── css/
│   └── style.css         # All styles — typography, layout, sticky viz, responsive
├── js/
│   ├── main.js           # Entry point — data loading + Scrollama init
│   ├── scrollSections.js # Section trigger logic — maps steps to viz actions
│   ├── utils.js          # Shared constants (colors, regions, formatters)
│   └── charts/
│       ├── lineChart.js  # D3 scenario comparison line chart
│       ├── barChart.js   # D3 regional warming bar chart
│       ├── scatterPlot.js# D3 temperature vs precipitation scatter plot
│       ├── heatmap.js    # D3 regional warming heatmap
│       └── choroplethMap.js # D3 geographic choropleth map
├── data/
│   └── processed/        # Copy of CSV + JSON files (or symlink)
├── img/                  # Static PNGs from figures/
└── project_plan.md       # This file
```

### 2.2 Build HTML structure

Single `index.html` with:

- **Head**: meta tags, title, font imports, CSS + JS script loading (with `defer`)
- **Body**:
  - `<section id="hero">` — full-screen intro
  - `<div id="viz-container">` — sticky panel for the visualization
  - `<article id="scrolly">` — Scrollama container
    - `<div class="step" data-step="1">` — Context
    - `<div class="step" data-step="2">` — Current state
    - `<div class="step" data-step="3">` — SSP5-8.5
    - `<div class="step" data-step="4">` — SSP3-7.0
    - `<div class="step" data-step="5">` — SSP2-4.5
    - `<div class="step" data-step="6">` — SSP1-2.6
    - `<div class="step" data-step="7">` — Interactive exploration
  - `<section id="takeaway">` — final message

Use CDN scripts:
- D3.js v7: `https://d3js.org/d3.v7.min.js`
- Scrollama: `https://unpkg.com/scrollama`
- TopoJSON: `https://unpkg.com/topojson-client@3`

### 2.3 Set up Scrollama

```js
// Scrollama init (conceptual)
import scrollama from "scrollama";

const scroller = scrollama();
scroller
  .setup({
    step: ".step",
    offset: 0.5,
    debug: false,
  })
  .onStepEnter(response => {
    const step = response.element.dataset.step;
    updateVisualization(step);
  });
```

The `updateVisualization(step)` function will:
- For steps 1–6: show/hide the relevant static PNG
- For step 7: activate the interactive D3 dashboard
- Optionally transition between viz states with D3 transitions

### 2.4 CSS theming

| Element | Style |
|---------|-------|
| **Background** | Dark theme (`#0a0e1a` or `#111`) or clean light theme (`#fafafa`) — decide early |
| **Typography** | System font stack or Google Font (Inter, Source Sans Pro) |
| **Hero** | Full viewport height, centered, large heading + subtitle |
| **Viz container** | `position: sticky; top: 10vh; height: 80vh;` — fixed panel while text scrolls |
| **Step sections** | `min-height: 100vh;` — each occupies full screen with centered text card |
| **Text cards** | Semi-transparent background, max-width ~400px, good contrast |
| **Responsive** | Primarily laptop (~1280px–1920px), ensure text is legible and viz fits |

---

## Phase 3 — Interactive D3 Visualizations

### 3.1 Line Chart — Scenario Comparison (⭐ Easy)

- **Data**: `cmip6_anomaly_timeseries.csv` filtered to `variable === "tas"` and `region === "Global"`
- **Marks**: 4 lines (one per scenario), `x=year`, `y=anomaly`
- **Channels**: Color = scenario, position = year × anomaly
- **Interactions**:
  - Hover: vertical rule + tooltip showing values at that year
  - Click scenario in legend: highlight / dim
  - Play button: animate through years (optional)
- **Transitions**: Line drawing animation on initial render
- **Why**: Familiar chart type, quick to implement, immediately understandable

### 3.2 Bar Chart — Regional Warming (⭐ Easy)

- **Data**: `cmip6_region_summary.csv` filtered to `variable === "tas"`
- **Marks**: Horizontal bars, `x=latecentury_anomaly`, `y=region`
- **Channels**: Length = anomaly, color by magnitude (sequential)
- **Interactions**:
  - Dropdown / buttons to switch scenario
  - Hover tooltip with precise value
- **Transitions**: Bars re-sort and re-animate on scenario change

### 3.3 Choropleth Map — Regional Geographic (⭐⭐⭐ Hard — Centerpiece)

- **Data**: Region TopoJSON boundaries + `cmip6_region_summary.csv`
- **Marks**: Filled polygons for each region
- **Channels**: Color fill = anomaly value (diverging for precipitation, sequential for temperature)
- **Interactions**:
  - **Scenario toggle**: buttons to switch between SSPs
  - **Time toggle**: mid-century vs late-century
  - **Variable toggle**: temperature vs precipitation
  - **Hover**: tooltip showing region name + value
  - **Click**: select a region → updates other linked charts
- **Transitions**: D3 `transition()` on color fills when toggling scenario/time
- **Color scales**:
  - Temperature: `d3.scaleSequential(d3.interpolateYlOrRd)` or `d3.interpolateReds`
  - Precipitation: `d3.scaleDiverging(d3.interpolateBrBG)`
- **Linked views**: Clicking a region on the map filters the line chart to that region

### 3.4 Scatter Plot — Temperature vs Precipitation (⭐⭐ Medium)

- **Data**: `cmip6_region_summary.csv` with pivot (one row per region, columns for `tas` and `pr`)
- **Marks**: Circles, `x=tas_anomaly`, `y=pr_anomaly`
- **Channels**: Position (x, y), label = region name
- **Interactions**:
  - Scenario toggle
  - Hover: highlight region
- **Annotations**: Label outliers (e.g., "Arctic warms most, precipitation increases")

### 3.5 Heatmap — Regional Warming by Decade (⭐⭐ Medium)

- **Data**: `cmip6_anomaly_timeseries.csv` aggregated to decade
- **Marks**: Rectangular cells, `x=decade`, `y=region`, `fill=anomaly`
- **Channels**: Color intensity = anomaly magnitude
- **Interactions**: Scenario toggle, hover tooltip

### 3.6 Gridded Map — Pixel-Level View (⭐⭐⭐ Stretch Goal)

- **Data**: Gridded JSON arrays from Phase 1
- **Marks**: Small SVG `<rect>` elements positioned by D3 geo projection
- **Channels**: Color fill = anomaly value per grid cell
- **Interactions**: Same toggles as choropleth
- **Note**: This is the most computationally intensive — batch-render grid cells or use canvas

---

## Phase 4 — Narrative & Polish

### 4.1 Write narrative text

Each scroll step gets:
- **Headline** (1 line, bold) — grabs attention
- **Body** (2–4 sentences) — explains the concept
- **Callout** (optional) — a surprising fact or statistic

Example (Step 3 — SSP5-8.5):

> **Headline**: "Business as Usual — 4.5°C of Warming by 2100"
>
> **Body**: Under the highest emissions scenario, SSP5-8.5, global average temperatures could rise by over 4°C by the end of the century. But the burden isn't shared equally — the Arctic is projected to warm nearly 15°C, four times the global average, while tropical regions face less extreme warming but greater precipitation uncertainty.
>
> **Callout**: "The Arctic has already warmed nearly 4 times faster than the rest of the world since 1979."

### 4.2 Add annotations

Using D3 SVG annotations:
- Callout lines connecting to key data points
- Highlighted regions (e.g., Arctic bar in red on the bar chart)
- Threshold lines (1.5°C, 2°C) on the line chart
- Text labels for the most significant findings

### 4.3 Polish

- **Loading states**: Show skeleton/spinner while data loads
- **Error states**: Graceful fallback if data fails to load
- **Transitions**: D3 transitions between all state changes (no instant jumps)
- **Performance**: Throttle scroll events, use `requestAnimationFrame` for animations
- **Accessibility**: Alt text for images, `aria-label` on interactive elements

---

## Phase 5 — Deployment & Deliverables

### 5.1 GitHub Pages

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-org>/team_vizionary.git
git push -u origin main

# 2. Enable GitHub Pages
#    Repo → Settings → Pages → Deploy from main branch → / (root)
```

**Checklist**:
- [ ] All paths use relative URLs (start with `./` not `/`)
- [ ] Data files are small enough (<5MB each) to load in browser
- [ ] Verified on a different machine / network
- [ ] No console errors in Chrome DevTools

### 5.2 Demo Video (due June 2)

- 2 minutes MAX
- Structure: Hook → Motivation → Show features → Takeaway
- Use the [video production guide](https://dsc106.com/projects/video_guide/)
- Upload to YouTube (public, NOT YouTube Kids)
- Embed or link in the final website

### 5.3 Final Deliverables (due June 9)

- [ ] Website published on GitHub Pages
- [ ] Video linked/embedded on website
- [ ] Public GitHub repo
- [ ] All rubric requirements met (see appendix)

### 5.4 Showcase (June 11)

- Attend 11:30am–2:30pm
- Present with your team during your time slot

---

## Prototype Scope (May 26)

With only 4 days, the prototype focuses on meeting the rubric while setting up the foundation:

| Requirement | Prototype Target |
|-------------|------------------|
| **Webpage URL works** | ✅ GitHub Pages active, `index.html` loads |
| **GitHub repo public** | ✅ Repo is public with clear README |
| **Visualization** | ✅ At least 1 D3 interactive chart working (line chart with scenario toggle) |
| **Interaction** | ✅ Scenario toggle changes the chart state |
| **Writeup** | ✅ 8+ sentences answering "What have you done?" and "What's hardest to design?" |
| **Full scrollytelling** | ⏳ Basic structure (hero + sticky + steps) but text can be placeholder |
| **Geographic map** | ⏳ Prioritize for final, not prototype |
| **All 6 visualizations** | ⏳ Only line chart needed for prototype |

**Writeup questions for prototype** (put on the page or in README):

1. *What have you done so far?* — Created the CMIP6 data pipeline (temperature + precipitation, 4 SSP scenarios, 8 regions, 2015–2100), 6 static exploratory visualizations, project plan, and an interactive D3 line chart. Set up the scrollytelling page structure and deployed on GitHub Pages.

2. *What will be the most challenging of your project to design and why?* — The geographic choropleth map with linked views. Converting gridded NetCDF data to renderable web formats, projecting it onto a world map, and ensuring smooth transitions between scenarios and time periods while keeping file sizes reasonable for browser loading will be the hardest technical challenge. Coordinating clicks on the map to update the other charts adds further complexity.

---

## File Structure

```
team_vizionary/
│
├── index.html               # Main page — single HTML, CDN scripts
├── README.md                # Project description + writeup
├── project_plan.md          # This file
│
├── css/
│   └── style.css            # All styles
│
├── js/
│   ├── main.js              # Entry point — data loading, Scrollama init
│   ├── scrollSections.js    # Step → visualization mapping
│   ├── utils.js             # Constants, color scales, formatters
│   └── charts/
│       ├── lineChart.js     # D3 line chart
│       ├── barChart.js      # D3 bar chart
│       ├── scatterPlot.js   # D3 scatter plot
│       ├── heatmap.js       # D3 heatmap
│       └── choroplethMap.js # D3 geographic map
│
├── data/
│   └── processed/
│       ├── cmip6_anomaly_timeseries.csv   # (existing)
│       ├── cmip6_region_summary.csv        # (existing)
│       ├── world-110m.json                 # TopoJSON basemap
│       └── grids/                          # Gridded data exports
│           ├── ssp126_tas_2100.json
│           ├── ssp245_tas_2100.json
│           └── ...
│
├── img/                     # Static PNG fallbacks
│   ├── 01_global_temperature_change_map.png
│   ├── 02_global_precipitation_change_map.png
│   ├── 03_scenario_temperature_lines.png
│   ├── 04_regional_warming_bars.png
│   ├── 05_temperature_precipitation_scatter.png
│   └── 06_regional_temperature_heatmap.png
│
├── notebooks/
│   └── cmip6_static_visualizations.ipynb   # Data processing notebook
│
├── figures/                 # (kept for reference)
│
└── data/                    # (kept for reference)
```

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Build system** | None (plain HTML/JS) | No build step, easy GitHub Pages, everyone can edit |
| **Geographic approach** | Choropleth first, gridded as stretch | Region data is ready; gridded needs extra processing |
| **Grid rendering** | SVG `<rect>` positioning over polygonization | Avoids complex GeoJSON polygon generation |
| **Scroll library** | Scrollama (not custom) | Well-tested, handles sticky + scroll triggers |
| **D3 version** | v7 | Latest stable, CDN available |
| **Variables** | tas + pr, expandable | Data already processed; add more by modifying notebook |
| **Prototype focus** | Line chart + scenario toggle | Meets rubric with minimal complexity |
| **Data loading** | `d3.csv()` / `d3.json()` at page load | Simpler than lazy loading; cache in browser |
| **Color palettes** | Sequential (temp) and diverging (precip) | Matches existing matplotlib conventions |

---

## Appendix: Course Rubric Checklist

### Final Deliverables (20 pts)

| Criterion | Points | Status | Notes |
|-----------|--------|--------|-------|
| Web page URL, video URL, repo | 1 | ☐ | GitHub Pages + YouTube + public repo |
| Hook | 1 | ☐ | Opening attention-grabber (step 1) |
| Storytelling | 3 | ☐ | And-but-therefore structure |
| Visual Encodings | 3 | ☐ | No expressiveness violations |
| Interaction | 3 | ☐ | Beyond what static could show |
| Annotations | 1 | ☐ | Text/shading drawing attention to findings |
| Takeaways | 2 | ☐ | Clear final message |
| Viewing experience | 1 | ☐ | Legible on laptop screen |
| Video: URL & Length | 1 | ☐ | ≤2 min, YouTube |
| Video: Explanation | 2 | ☐ | Shows all features + interesting parts |
| Video: Takeaways | 2 | ☐ | Ends with takeaway |

### Initial Prototype (3 pts)

| Criterion | Points | Status | Notes |
|-----------|--------|--------|-------|
| Webpage | 0.5 | ☐ | URL loads |
| GitHub Repo | 0.5 | ☐ | Public, visible |
| Visualization | 1 | ☐ | 1+ viz with 1+ interaction |
| Writeup | 1 | ☐ | 8+ sentences answering both questions |
