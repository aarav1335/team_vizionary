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

// ---- Sea-Level Rise Estimation ----
/**
 * Convert a global temperature anomaly (°C above 1995–2014 baseline)
 * to estimated sea-level rise (meters).
 *
 * Calibrated to IPCC AR6 median projections:
 *   SSP1-2.6 (~1.6°C) → ~0.40 m
 *   SSP2-4.5 (~3.0°C) → ~0.55 m
 *   SSP3-7.0 (~4.0°C) → ~0.70 m
 *   SSP5-8.5 (~6.0°C) → ~1.00 m
 *
 * Uses: SLR = 0.1 + 0.08*T + 0.012*T²  (clamped to [0.05, 2.0])
 *
 * @param {number} tempAnomalyC — global temperature anomaly in °C
 * @returns {number} estimated sea-level rise in meters
 */
function estimateSLR(tempAnomalyC) {
  if (tempAnomalyC == null || isNaN(tempAnomalyC)) return 0.1;
  var t = Math.max(0, tempAnomalyC);
  var slr = 0.1 + 0.08 * t + 0.012 * t * t;
  return Math.max(0.05, Math.min(2.0, slr));
}

/** Temperature range for the thermometer (min, max in °C) */
var TEMP_RANGE = { min: 0, max: 8 };

/** SSP reference temperatures at 2100 (global mean temp anomaly) */
var SSP_2100_TEMPS = {
  ssp126: 1.6,
  ssp245: 3.0,
  ssp370: 4.0,
  ssp585: 6.0,
};

/** Reference marks for the sea-level rise scene */
var SLR_REFERENCE_MARKS = [
  { height: 0.05,  label: 'Ankle deep' },
  { height: 0.15,  label: 'Shin deep' },
  { height: 0.4,   label: 'Knee deep' },
  { height: 0.7,   label: 'Thigh deep' },
  { height: 0.9,   label: 'Waist deep' },
  { height: 1.2,   label: 'Chest deep' },
  { height: 1.5,   label: 'Chin deep' },
  { height: 1.7,   label: 'Overhead' },
];

// ---- Regions ----
var REGIONS = [
  'Arctic',
  'North America',
  'South America',
  'Europe',
  'Africa',
  'South Asia',
  'Australia',
  'Global',
];

// ---- Decade labels (matching DECADE_SLICES in notebook) ----
const DECADE_LABELS = [
  '2015-2020',
  '2021-2030',
  '2031-2040',
  '2041-2050',
  '2051-2060',
  '2061-2070',
  '2071-2080',
  '2081-2090',
  '2091-2100',
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
    2: 'img/01_global_temperature_change_map.png',
    3: 'img/02_global_precipitation_change_map.png',
    4: 'img/03_scenario_temperature_lines.png',
    5: 'img/04_regional_warming_bars.png',
    6: 'img/05_temperature_precipitation_scatter.png',
    7: 'img/06_regional_temperature_heatmap.png',
  };
  return imageMap[step] || null;
}

// Check if a step uses the interactive D3 panel
function isInteractiveStep(step) {
  return step >= 7;
}
