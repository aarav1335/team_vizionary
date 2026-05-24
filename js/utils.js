/* ============================================================
   utils.js — Shared constants, color scales, and formatters
   for the CMIP6 Climate Futures Explorer
   ============================================================ */

// ---- Scenario Configuration ----
const SCENARIOS = ['ssp126', 'ssp245', 'ssp370', 'ssp585'];

const SCENARIO_LABELS = {
  ssp126: 'SSP1-2.6 (Low)',
  ssp245: 'SSP2-4.5 (Middle)',
  ssp370: 'SSP3-7.0 (High)',
  ssp585: 'SSP5-8.5 (Very High)',
};

const SCENARIO_COLORS = {
  ssp126: '#4caf50',
  ssp245: '#ff9800',
  ssp370: '#e53935',
  ssp585: '#b71c1c',
};

// ---- Regions ----
const REGIONS = [
  'Arctic',
  'North America',
  'South America',
  'Europe',
  'Africa',
  'South Asia',
  'Australia',
  'Global',
];

// ---- Variables ----
const VARIABLES = {
  tas: { label: 'Temperature', unit: '°C' },
  pr: { label: 'Precipitation', unit: 'mm/day' },
};

// ---- Color Scales ----
function tempColorScale() {
  return d3.scaleSequential(d3.interpolateMagma)
    .domain([0, 8]);
}

function precipColorScale() {
  return d3.scaleDiverging(d3.interpolateBrBG)
    .domain([-3, 0, 3]);
}

// ---- Formatters ----
function formatTemp(val) {
  if (val == null) return '—';
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}°C`;
}

function formatPrecip(val) {
  if (val == null) return '—';
  return `${val > 0 ? '+' : ''}${val.toFixed(2)} mm/day`;
}

function formatYear(val) {
  return String(val);
}

// ---- Data Loading ----
async function loadCSV(url) {
  const data = await d3.csv(url);
  data.forEach(d => {
    d.year = +d.year;
    d.anomaly = +d.anomaly;
    d.midcentury_anomaly = +d.midcentury_anomaly;
    d.latecentury_anomaly = +d.latecentury_anomaly;
  });
  return data;
}

async function loadJSON(url) {
  return await d3.json(url);
}

// ---- Helpers ----
// Map step number to the image filename for static viz steps
function getStepImage(step) {
  const imageMap = {
    1: 'img/01_global_temperature_change_map.png',
    2: 'img/02_global_precipitation_change_map.png',
    3: 'img/03_scenario_temperature_lines.png',
    4: 'img/04_regional_warming_bars.png',
    5: 'img/05_temperature_precipitation_scatter.png',
    6: 'img/06_regional_temperature_heatmap.png',
  };
  return imageMap[step] || null;
}

// Check if a step uses the interactive D3 panel
function isInteractiveStep(step) {
  return step >= 7;
}
