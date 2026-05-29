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
    currentDecadeIndex: 8,     // default: 2091-2100 (last decade)
    decadesData: null,          // cached { decades: [...], cells: [...] } after load
    decadeLabels: [],           // ['2015-2020', '2021-2030', ...]
    selectedRegion: null,
    gridData: null,             // flattened { lat, lon, value } for current decade
    loading: false,
    isPlaying: false,
    playbackTimer: null,
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
    .attr('stdDeviation', 4);

  // Clip path for globe
  defs.append('clipPath')
    .attr('id', 'map-clip')
    .append('path')
    .attr('d', geoPath({ type: 'Sphere' }));

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .attr('clip-path', 'url(#map-clip)');

  // Zoom/pan layer — all geographic content goes here
  const zoomLayer = g.append('g').attr('class', 'zoom-layer');

  // Graticule (lat/lon grid lines)
  const graticule = d3.geoGraticule();

  zoomLayer.append('path')
    .attr('class', 'graticule')
    .attr('d', geoPath(graticule()))
    .attr('fill', 'none')
    .attr('stroke', '#dce3ed')
    .attr('stroke-width', 0.3);

  // ---- World Map Basemap ----
  const countriesG = zoomLayer.append('g').attr('class', 'countries');

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

  // ---- Heatmap circles (colored, blurred) ----
  const heatmapG = zoomLayer.append('g')
    .attr('class', 'grid-heatmap')
    .attr('filter', 'url(#heatmap-blur)');

  // Hover highlight ring (inside zoom layer)
  const heatGlow = zoomLayer.append('circle')
    .attr('class', 'heat-glow')
    .attr('fill', '#f8fafc')
    .attr('stroke', '#1e293b')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0);

  // ---- Zoom & Pan behavior ----
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([
      [-innerWidth * 0.5, -innerHeight * 0.5],
      [innerWidth * 1.5, innerHeight * 1.5],
    ])
    .filter(event => {
      // Allow zoom via: wheel, pinch, drag, or double-click
      if (event.type === 'dblclick') return true;
      if (event.type === 'wheel') return true;
      return !event.ctrlKey && !event.button;
    })
    .on('zoom', (event) => {
      zoomLayer.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Steal wheel events at the container level to prevent page scrolling
  // Must use native addEventListener with { passive: false } so preventDefault works
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });

  // Add a reset-zoom button to the container
  const resetBtn = d3.select(container)
    .append('button')
    .attr('class', 'map-reset-btn')
    .text('Reset')
    .on('click', () => {
      svg.transition()
        .duration(400)
        .call(zoom.transform, d3.zoomIdentity);
    });

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
    // Load compact per-decade file: { decades: [...], cells: [{lat, lon, values: [...]}] }
    const url = `data/processed/grids/${scenario}_${variable}_decades.json`;
    try {
      const compactData = await d3.json(url);
      state.decadesData = compactData;
      state.decadeLabels = compactData.decades || [];
      // Extract current decade's data as flat {lat, lon, value} array
      state.gridData = getGridDataForDecade(state.currentDecadeIndex);
    } catch (err) {
      console.warn('⚠️ Failed to load grid data:', url, err.message);
      state.decadesData = null;
      state.decadeLabels = [];
      state.gridData = [];
    }
    state.loading = false;
    return state.gridData;
  }

  // Extract flat {lat, lon, value} from compact format for a given decade index
  function getGridDataForDecade(decadeIndex) {
    if (!state.decadesData || !state.decadesData.cells) return [];
    const idx = Math.max(0, Math.min(decadeIndex, (state.decadeLabels.length || 1) - 1));
    return state.decadesData.cells
      .filter(c => c.values[idx] != null)
      .map(c => ({
        lat: c.lat,
        lon: c.lon,
        value: c.values[idx],
      }));
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

      // Compute radius from projected grid spacing (generous overlap)
      const adj = projection([d.lon, d.lat + latStep]);
      const r = adj ? Math.abs(pos[1] - adj[1]) * 0.95 : 8;

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
    const decade = state.decadeLabels[state.currentDecadeIndex] || '';
    return `
      <strong>${regionName}</strong><br>
      <span style="font-size:1.1rem; font-weight:700;">${sign}${val.toFixed(2)}${unit}</span><br>
      <span style="font-size:0.75rem; color:#64748b;">
        ${SCENARIO_LABELS[state.scenario]} · ${VARIABLES[state.variable].label}<br>
        ${decade}
      </span>`;
  }

  // ---- Delaunay index for gapless nearest-point lookup ----
  let delaunay = null;
  let delaunayPoints = [];

  // ---- Render heatmap circles (visual only) + setup Delaunay ----
  function renderGrid(transitionDuration = 0) {
    const points = computeGridPoints(state.gridData);
    const colorScale = getColorScale(state.variable);

    // Remove old elements (but keep for smooth transition if possible)
    delaunay = null;
    delaunayPoints = [];

    if (points.length < 3) { heatmapG.selectAll('*').remove(); return; }

    // Store points and build Delaunay index
    delaunayPoints = points;
    delaunay = d3.Delaunay.from(points.map(d => [d.cx, d.cy]));

    // --- Colored circles with optional transition ---
    const circles = heatmapG.selectAll('.heat-dot')
      .data(points, d => `${d.lat},${d.lon}`);  // key by lat/lon for stable transitions

    circles.exit().remove();

    const enterCircles = circles.enter()
      .append('circle')
      .attr('class', 'heat-dot')
      .attr('cx', d => d.cx)
      .attr('cy', d => d.cy)
      .attr('r', d => d.r)
      .attr('stroke', 'none')
      .attr('opacity', 0)
      .attr('fill', d => getColor(d.value, state.variable));

    const merged = enterCircles.merge(circles);

    if (transitionDuration > 0) {
      merged.transition().duration(transitionDuration).ease(d3.easeCubicInOut)
        .attr('fill', d => getColor(d.value, state.variable))
        .attr('r', d => d.r)
        .attr('opacity', 0.35);
    } else {
      merged
        .attr('fill', d => getColor(d.value, state.variable))
        .attr('r', d => d.r)
        .attr('opacity', 0.35);
    }

    // Update legend
    renderLegend(state.variable, colorScale);
  }

  // ---- Gapless hover/click via Delaunay nearest-point lookup ----
  let hoverActive = false;

  function handleMapPointer(event) {
    const [mx, my] = d3.pointer(event, zoomLayer.node());
    if (!delaunay || !delaunayPoints.length) return;

    const i = delaunay.find(mx, my);
    const d = delaunayPoints[i];

    // Show tooltip at the nearest point
    tooltip.style('opacity', 1)
      .html(tooltipHTML(d))
      .style('left', `${event.offsetX + 12}px`)
      .style('top', `${event.offsetY - 10}px`);

    heatGlow.attr('cx', d.cx).attr('cy', d.cy)
      .attr('r', d.r * 1.8)
      .attr('opacity', 0.25);

    hoverActive = true;
  }

  function handleMapLeave() {
    tooltip.style('opacity', 0);
    heatGlow.attr('opacity', 0);
    hoverActive = false;
  }

  function handleMapClick(event) {
    const [mx, my] = d3.pointer(event, zoomLayer.node());
    if (!delaunay || !delaunayPoints.length) return;

    const i = delaunay.find(mx, my);
    const d = delaunayPoints[i];
    const region = findRegion(d.lat, d.lon);
    state.selectedRegion = region;
    container.dispatchEvent(new CustomEvent('regionSelected', {
      detail: { region, scenario: state.scenario, variable: state.variable },
      bubbles: true,
    }));
  }

  // ---- Bind pointer events on the zoom layer (gapless) ----
  zoomLayer.on('mousemove', handleMapPointer);
  zoomLayer.on('mouseleave', handleMapLeave);
  zoomLayer.on('click', handleMapClick);

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

  // ---- Decade Label (bottom-center of map) ----
  const decadeLabel = svg.append('text')
    .attr('class', 'map-decade-label')
    .attr('x', width / 2)
    .attr('y', height - 18)
    .attr('text-anchor', 'middle')
    .attr('fill', '#475569')
    .attr('font-size', '12px')
    .attr('font-weight', '600')
    .attr('pointer-events', 'none')
    .text('');

  function updateDecadeLabel() {
    const label = state.decadeLabels[state.currentDecadeIndex] || '';
    decadeLabel.text(label ? `Showing: ${label}` : '');
  }

  // ---- Initialize ----
  async function init() {
    await loadGridData(state.scenario, state.variable);
    updateDecadeLabel();
    renderGrid(0);
  }

  // ---- Decade Switching ----
  async function updateDecade(index) {
    if (!state.decadesData) return;
    const newIndex = Math.max(0, Math.min(index, state.decadeLabels.length - 1));
    if (newIndex === state.currentDecadeIndex) return;
    state.currentDecadeIndex = newIndex;
    state.gridData = getGridDataForDecade(newIndex);
    updateDecadeLabel();
    renderGrid(600);  // smooth 600ms transition
  }

  // ---- Auto-Play ----
  function startPlayback() {
    if (state.isPlaying) return;
    state.isPlaying = true;
    const intervalMs = 2500;

    function advance() {
      if (!state.isPlaying) return;
      let next = state.currentDecadeIndex + 1;
      if (next >= state.decadeLabels.length) next = 0;
      updateDecade(next).then(() => {
        state.playbackTimer = setTimeout(advance, intervalMs);
      });
    }

    state.playbackTimer = setTimeout(advance, intervalMs);
  }

  function stopPlayback() {
    state.isPlaying = false;
    if (state.playbackTimer) {
      clearTimeout(state.playbackTimer);
      state.playbackTimer = null;
    }
  }

  function togglePlayback() {
    if (state.isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  // ---- Public API ----
  async function updateScenario(scenario) {
    stopPlayback();
    state.scenario = scenario;
    state.selectedRegion = null;
    state.currentDecadeIndex = state.decadeLabels.length > 0 ? state.decadeLabels.length - 1 : 0;
    await loadGridData(scenario, state.variable);
    updateDecadeLabel();
    renderGrid(0);
  }

  async function updateVariable(variable) {
    stopPlayback();
    state.variable = variable;
    state.selectedRegion = null;
    state.currentDecadeIndex = state.decadeLabels.length > 0 ? state.decadeLabels.length - 1 : 0;
    await loadGridData(state.scenario, variable);
    updateDecadeLabel();
    renderGrid(0);
  }

  function destroy() {
    stopPlayback();
    svg.remove();
    tooltip.remove();
  }

  // Kick off
  init();

  return {
    updateScenario,
    updateVariable,
    updateDecade,
    startPlayback,
    stopPlayback,
    togglePlayback,
    destroy,
    getState: () => ({ ...state }),
  };
}
