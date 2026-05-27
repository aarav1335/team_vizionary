/* ============================================================
   choroplethMap.js — D3 Geographic Choropleth Map
   Data: world-110m.json (TopoJSON) + cmip6 grid JSONs
   Renders gridded data as positioned SVG rects over world map
   ============================================================ */

/**
 * Create or update the choropleth map in the given container.
 *
 * @param {HTMLElement} container - DOM element to render into
 * @param {object} data - Loaded data { summary, worldTopo }
 * @returns {object} Public API { updateScenario, updateVariable, destroy }
 */
function choroplethMap(container, data) {
  'use strict';

  // ---- State ----
  let state = {
    scenario: 'ssp126',
    variable: 'tas',
    timePeriod: 'latecentury',
    selectedRegion: null,
    gridData: null,
    loading: false,
  };

  // ---- Dimensions ----
  const margin = { top: 10, right: 10, bottom: 10, left: 10 };
  const rect = container.getBoundingClientRect();
  const width = Math.max(rect.width || container.clientWidth || 1000, 400);
  const height = Math.max(rect.height || container.clientHeight || 500, 300);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // ---- Projection ----
  const projection = d3.geoNaturalEarth1()
    .fitSize([innerWidth, innerHeight], { type: 'Sphere' });

  const geoPath = d3.geoPath().projection(projection);

  // ---- Color Scales ----
  function getColorScale(variable) {
    if (variable === 'pr') {
      return d3.scaleDiverging(d3.interpolateBrBG)
        .domain([-3, 0, 3]);
    }
    // temperature — sequential
    return d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 15]);
  }

  function getColor(value, variable) {
    const scale = getColorScale(variable);
    if (value == null || isNaN(value)) return '#e2e8f0';
    return scale(value);
  }

  // ---- SVG Setup ----
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('display', 'block')
    .style('background', '#f0f4f8');

  const defs = svg.append('defs');

  // Blur filter for smooth heatmap blending
  defs.append('filter')
    .attr('id', 'heatmap-blur')
    .append('feGaussianBlur')
    .attr('stdDeviation', 3);

  // Clip path for globe
  defs.append('clipPath')
    .attr('id', 'map-clip')
    .append('path')
    .attr('d', geoPath({ type: 'Sphere' }));

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .attr('clip-path', 'url(#map-clip)');

  // Graticule (lat/lon grid lines)
  const graticule = d3.geoGraticule();

  g.append('path')
    .attr('class', 'graticule')
    .attr('d', geoPath(graticule()))
    .attr('fill', 'none')
    .attr('stroke', '#dce3ed')
    .attr('stroke-width', 0.3);

  // ---- World Map Basemap ----
  const countriesG = g.append('g').attr('class', 'countries');

  if (data.worldTopo) {
    const countriesData = topojson.feature(data.worldTopo, data.worldTopo.objects.countries);
    countriesG.selectAll('path')
      .data(countriesData.features)
      .join('path')
      .attr('d', geoPath)
      .attr('fill', '#e2e8f0')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 0.4);
  }

  // ---- Grid Cells Layer (colored heatmap) ----
  const heatmapG = g.append('g')
    .attr('class', 'grid-heatmap')
    .attr('filter', 'url(#heatmap-blur)');

  // ---- Voronoi hit targets (invisible, for interaction) ----
  const hitG = g.append('g').attr('class', 'grid-hitzone');

  // Hover highlight ring (shown beneath cursor)
  const heatGlow = g.append('circle')
    .attr('class', 'heat-glow')
    .attr('fill', '#f8fafc')
    .attr('stroke', '#1e293b')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0);

  // ---- Tooltip ----
  const tooltip = d3.select(container)
    .append('div')
    .attr('class', 'map-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('opacity', 0);

  // ---- Legend ----
  const legendG = svg.append('g')
    .attr('class', 'map-legend')
    .attr('transform', `translate(${width - 220}, ${height - 60})`);

  function renderLegend(variable, colorScale) {
    legendG.selectAll('*').remove();

    const legendWidth = 180;
    const legendHeight = 12;
    const legendN = 50;

    const domain = colorScale.domain();
    const legendSvgScale = d3.scaleLinear()
      .domain(domain)
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendSvgScale)
      .ticks(4)
      .tickFormat(d => variable === 'tas' ? `${d}°C` : `${d.toFixed(1)}`);

    legendG.append('text')
      .attr('x', 0)
      .attr('y', -6)
      .attr('fill', '#475569')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(variable === 'tas' ? 'Temperature anomaly (°C)' : 'Precip. anomaly (mm/day)');

    const defsEl = legendG.append('defs');
    const linearGrad = defsEl.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%').attr('x2', '100%')
      .attr('y1', '0%').attr('y2', '0%');

    linearGrad.selectAll('stop')
      .data(d3.range(legendN).map(i => {
        const t = i / (legendN - 1);
        const val = domain[0] + t * (domain[domain.length - 1] - domain[0]);
        return { offset: `${t * 100}%`, color: colorScale(val) };
      }))
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    legendG.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 3)
      .attr('fill', 'url(#legend-gradient)');

    legendG.append('g')
      .attr('transform', `translate(0, ${legendHeight + 2})`)
      .call(legendAxis)
      .selectAll('text')
      .attr('fill', '#475569')
      .attr('font-size', '9px');
  }

  // ---- Data Loading ----
  async function loadGridData(scenario, variable) {
    state.loading = true;
    const url = `data/processed/grids/${scenario}_${variable}_latecentury.json`;
    try {
      state.gridData = await d3.json(url);
    } catch (err) {
      console.warn('⚠️ Failed to load grid data:', url, err.message);
      state.gridData = [];
    }
    state.loading = false;
    return state.gridData;
  }

  // ---- Compute grid point projected positions ----
  function computeGridPoints(gridData) {
    if (!gridData || gridData.length === 0) return [];

    // Determine grid spacing for circle radius
    const lats = [...new Set(gridData.map(d => d.lat))].sort((a, b) => b - a);
    const lons = [...new Set(gridData.map(d => d.lon))].sort((a, b) => a - b);
    const latStep = lats.length > 1 ? Math.abs(lats[1] - lats[0]) : 5;

    return gridData.map(d => {
      const pos = projection([d.lon, d.lat]);
      if (!pos) return null;

      // Compute radius from projected grid spacing (overlap slightly for smoothness)
      const adj = projection([d.lon, d.lat + latStep]);
      const r = adj ? Math.abs(pos[1] - adj[1]) * 0.6 : 6;

      return {
        lat: d.lat,
        lon: d.lon,
        value: d.value,
        cx: pos[0],
        cy: pos[1],
        r: Math.max(r, 3),
      };
    }).filter(d => d && !isNaN(d.cx) && !isNaN(d.cy));
  }

  // ---- Build tooltip HTML ----
  function tooltipHTML(d) {
    const regionName = findRegion(d.lat, d.lon);
    const val = d.value;
    const unit = state.variable === 'tas' ? '°C' : ' mm/day';
    const sign = val > 0 ? '+' : '';
    return `
      <strong>${regionName}</strong><br>
      <span style="font-size:1.1rem; font-weight:700;">${sign}${val.toFixed(2)}${unit}</span><br>
      <span style="font-size:0.75rem; color:#64748b;">
        ${SCENARIO_LABELS[state.scenario]} · ${VARIABLES[state.variable].label}
      </span>`;
  }

  // ---- Render colored heatmap circles + invisible Voronoi hit targets ----
  function renderGrid() {
    const points = computeGridPoints(state.gridData);
    const colorScale = getColorScale(state.variable);

    // Remove old elements
    heatmapG.selectAll('*').remove();
    hitG.selectAll('*').remove();

    if (points.length < 3) return;

    // --- Colored circles (visual layer) ---
    heatmapG.selectAll('.heat-dot')
      .data(points)
      .join('circle')
      .attr('class', 'heat-dot')
      .attr('cx', d => d.cx)
      .attr('cy', d => d.cy)
      .attr('r', d => d.r)
      .attr('fill', d => getColor(d.value, state.variable))
      .attr('stroke', 'none')
      .attr('opacity', 0.35);

    // --- Voronoi diagram (invisible hit detection) ---
    const delaunay = d3.Delaunay.from(points.map(d => [d.cx, d.cy]));
    const voronoi = delaunay.voronoi([0, 0, innerWidth, innerHeight]);

    hitG.selectAll('.hit-cell')
      .data(points)
      .join('path')
      .attr('class', 'hit-cell')
      .attr('d', (d, i) => voronoi.renderCell(i))
      .attr('fill', 'none')
      .attr('stroke', 'none')
      .attr('pointer-events', 'all')
      .on('mouseenter', function (event, d) {
        tooltip.style('opacity', 1).html(tooltipHTML(d));
        // Highlight hovered area via enlarged circle
        heatGlow.transition().duration(150)
          .attr('cx', d.cx).attr('cy', d.cy)
          .attr('r', d.r * 1.8)
          .attr('opacity', 0.25);
      })
      .on('mousemove', function (event, d) {
        tooltip
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function () {
        tooltip.style('opacity', 0);
        heatGlow.transition().duration(200).attr('opacity', 0);
      })
      .on('click', function (event, d) {
        const region = findRegion(d.lat, d.lon);
        state.selectedRegion = region;
        container.dispatchEvent(new CustomEvent('regionSelected', {
          detail: { region, scenario: state.scenario, variable: state.variable },
          bubbles: true,
        }));
      });

    // Update legend
    renderLegend(state.variable, colorScale);
  }

  // ---- Find region from lat/lon (nearest neighbor) ----
  function findRegion(lat, lon) {
    const regionCenters = {
      'Arctic': { lat: 75, lon: 0 },
      'North America': { lat: 45, lon: -100 },
      'South America': { lat: -15, lon: -60 },
      'Europe': { lat: 50, lon: 10 },
      'Africa': { lat: 5, lon: 20 },
      'South Asia': { lat: 25, lon: 80 },
      'Australia': { lat: -25, lon: 135 },
    };
    if (lat > 65) return 'Arctic';
    let closest = 'Global';
    let minDist = Infinity;
    for (const [region, center] of Object.entries(regionCenters)) {
      const dLat = lat - center.lat;
      const dLon = lon - center.lon;
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist < minDist) { minDist = dist; closest = region; }
    }
    return minDist < 45 ? closest : 'Global';
  }

  // ---- Initialize ----
  async function init() {
    await loadGridData(state.scenario, state.variable);
    renderGrid();
  }

  // ---- Public API ----
  async function updateScenario(scenario) {
    state.scenario = scenario;
    state.selectedRegion = null;
    await loadGridData(scenario, state.variable);
    renderGrid();
  }

  async function updateVariable(variable) {
    state.variable = variable;
    state.selectedRegion = null;
    await loadGridData(state.scenario, variable);
    renderGrid();
  }

  function destroy() {
    svg.remove();
    tooltip.remove();
  }

  // Kick off
  init();

  return {
    updateScenario,
    updateVariable,
    destroy,
    getState: () => ({ ...state }),
  };
}
