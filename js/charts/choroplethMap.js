/* ============================================================
   choroplethMap.js — 3D Orthographic Globe (D3)
   Data: world-110m.json (TopoJSON) + cmip6 grid JSONs
   Renders gridded data as colored circles on a rotatable globe
   ============================================================ */

/**
 * Create a 3D orthographic globe in the given container.
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
    currentDecadeIndex: 8,
    decadesData: null,
    decadeLabels: [],
    selectedRegion: null,
    gridData: null,
    loading: false,
    isPlaying: false,
    playbackTimer: null,
    rotation: [0, -10, 0],
    globeScale: 1,
    isAutoRotating: false,
    autoRotateTimer: null,
  };

  // ---- Dimensions ----
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const rect = container.getBoundingClientRect();
  const width = Math.max(rect.width || container.clientWidth || 1000, 320);
  const height = Math.max(rect.height || container.clientHeight || 500, 300);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // ---- Projection ----
  const projection = d3.geoOrthographic()
    .fitSize([innerWidth, innerHeight], { type: 'Sphere' })
    .rotate(state.rotation);

  const baseScale = projection.scale();
  // Zero out projection translate — we use globeG transform for centering
  projection.translate([0, 0]);
  const geoPath = d3.geoPath().projection(projection);

  // ---- Visibility: use D3's own clipAngle (guaranteed correct) ----
  // D3's geoOrthographic clips at 90° by default. geoPath returns null for
  // back-face geometry. This is the single source of truth — zero custom math.
  function isDotVisible(lon, lat) {
    return geoPath({ type: 'Point', coordinates: [lon, lat] }) !== null;
  }

// ---- Color Scales ----
  function getColorScale(variable) {
    if (variable === 'pr') {
      return d3.scaleDiverging(d3.interpolateBrBG).domain([-3, 0, 3]);
    }
    return d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 15]);
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
    .style('background', 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 100%)');

  const defs = svg.append('defs');

  // Atmosphere glow
  const atmosGrad = defs.append('radialGradient')
    .attr('id', 'atmosphere-glow').attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
  atmosGrad.append('stop').attr('offset', '85%').attr('stop-color', '#4a90d9').attr('stop-opacity', 0.15);
  atmosGrad.append('stop').attr('offset', '95%').attr('stop-color', '#4a90d9').attr('stop-opacity', 0.35);
  atmosGrad.append('stop').attr('offset', '100%').attr('stop-color', '#4a90d9').attr('stop-opacity', 0);

  // Shadow
  const shadowFilter = defs.append('filter').attr('id', 'globe-shadow');
  shadowFilter.append('feDropShadow')
    .attr('dx', 0).attr('dy', 4).attr('stdDeviation', 12)
    .attr('flood-color', '#000').attr('flood-opacity', 0.4);

  // Blur for heatmap (subtle — too much blur + low opacity = invisible dots)
  defs.append('filter').attr('id', 'heatmap-blur')
    .append('feGaussianBlur').attr('stdDeviation', 1.5);

  // Ocean gradient
  const oceanGrad = defs.append('radialGradient')
    .attr('id', 'ocean-fill').attr('cx', '40%').attr('cy', '40%').attr('r', '60%');
  oceanGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1e3a5f');
  oceanGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0d1f3c');

  // Clip path
  const clipPath = defs.append('clipPath').attr('id', 'globe-clip');
  clipPath.append('path').attr('d', geoPath({ type: 'Sphere' }));

  // ---- Main Globe Group ----
  const globeG = svg.append('g')
    .attr('transform', `translate(${margin.left + innerWidth / 2},${margin.top + innerHeight / 2})`)
    .attr('filter', 'url(#globe-shadow)');

  // Atmosphere halo
  const atmosCircle = globeG.append('circle')
    .attr('class', 'atmosphere')
    .attr('r', projection.scale() * 1.12)
    .attr('fill', 'url(#atmosphere-glow)')
    .attr('pointer-events', 'none');

  // Ocean sphere
  const oceanSphere = globeG.append('circle')
    .attr('class', 'ocean')
    .attr('r', projection.scale())
    .attr('fill', 'url(#ocean-fill)');

  // Clipped content group
  const clipG = globeG.append('g').attr('clip-path', 'url(#globe-clip)');

  // Graticule
  const graticule = d3.geoGraticule();
  const graticulePath = clipG.append('path')
    .attr('class', 'graticule').attr('fill', 'none')
    .attr('stroke', '#3a5a80').attr('stroke-width', 0.3).attr('opacity', 0.5);

  // ---- Countries ----
  const countriesG = clipG.append('g').attr('class', 'countries');
  if (data.worldTopo) {
    const countriesData = topojson.feature(data.worldTopo, data.worldTopo.objects.countries);
    countriesG.selectAll('path').data(countriesData.features)
      .join('path').attr('d', geoPath)
      .attr('fill', '#1a3a5c').attr('stroke', '#6baeff').attr('stroke-width', 0.8);
  }

  // ---- Heatmap ----
  const heatmapG = clipG.append('g').attr('class', 'grid-heatmap')
    .attr('filter', 'url(#heatmap-blur)');

  const heatGlow = clipG.append('circle')
    .attr('class', 'heat-glow').attr('fill', '#f8fafc')
    .attr('stroke', '#fbbf24').attr('stroke-width', 2)
    .attr('opacity', 0).attr('pointer-events', 'none');

  // ---- Drag-to-Rotate ----
  let dragging = false;
  let dragStartRotation = [0, 0, 0];
  let dragStartPos = [0, 0];

  function handleMouseDown(event) {
    dragging = true;
    dragStartRotation = [...state.rotation];
    const [mx, my] = d3.pointer(event, svg.node());
    dragStartPos = [mx, my];
    svg.style('cursor', 'grabbing');
    stopAutoRotate();
  }

  function handleMouseMove(event) {
    if (!dragging) return;
    const [mx, my] = d3.pointer(event, svg.node());
    const dx = mx - dragStartPos[0];
    const dy = my - dragStartPos[1];
    const sens = 0.25;
    state.rotation = [
      dragStartRotation[0] + dx * sens,
      dragStartRotation[1] - dy * sens,
      dragStartRotation[2],
    ];
    state.rotation[1] = Math.max(-90, Math.min(90, state.rotation[1]));
    updateProjection();
    renderAll();
  }

  function handleMouseUp() {
    dragging = false;
    svg.style('cursor', 'grab');
  }

  svg.on('mousedown', handleMouseDown);
  svg.on('mousemove', handleMouseMove);
  d3.select(window).on('mouseup', handleMouseUp);

  function handleTouchStart(event) {
    if (event.touches.length === 1) {
      dragging = true;
      dragStartRotation = [...state.rotation];
      dragStartPos = [event.touches[0].clientX, event.touches[0].clientY];
      stopAutoRotate();
    }
  }

  function handleTouchMove(event) {
    if (!dragging || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - dragStartPos[0];
    const dy = touch.clientY - dragStartPos[1];
    const sens = 0.25;
    state.rotation = [
      dragStartRotation[0] + dx * sens,
      dragStartRotation[1] - dy * sens,
      dragStartRotation[2],
    ];
    state.rotation[1] = Math.max(-90, Math.min(90, state.rotation[1]));
    updateProjection();
    renderAll();
  }

  function handleTouchEnd() { dragging = false; }

  svg.on('touchstart', handleTouchStart);
  svg.on('touchmove', handleTouchMove);
  svg.on('touchend', handleTouchEnd);

  // ---- Wheel to Scale ----
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    state.globeScale = Math.max(0.6, Math.min(2.5, state.globeScale + delta));
    updateProjection();
    renderAll();
  }, { passive: false });

  svg.style('cursor', 'grab');

  // ---- Buttons ----
  const resetBtn = d3.select(container).append('button')
    .attr('class', 'map-reset-btn').text('Reset')
    .on('click', () => {
      stopAutoRotate();
      state.rotation = [0, -10, 0];
      state.globeScale = 1;
      updateProjection();
      renderAll();
    });

  const autoRotateBtn = d3.select(container).append('button')
    .attr('class', 'map-autorotate-btn').text('Spin')
    .on('click', toggleAutoRotate);

  // ---- Tooltip ----
  const tooltip = d3.select(container).append('div')
    .attr('class', 'map-tooltip')
    .style('position', 'absolute').style('pointer-events', 'none').style('opacity', 0);

  // ---- Legend ----
  const legendG = svg.append('g').attr('class', 'map-legend')
    .attr('transform', `translate(${width - 220}, ${height - 60})`);

  function renderLegend(variable, colorScale) {
    legendG.selectAll('*').remove();
    const legendWidth = 180, legendHeight = 12, legendN = 50;
    const domain = colorScale.domain();
    const legendSvgScale = d3.scaleLinear().domain(domain).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendSvgScale).ticks(4)
      .tickFormat(d => variable === 'tas' ? `${d}°C` : `${d.toFixed(1)}`);

    legendG.append('rect').attr('x', -6).attr('y', -22)
      .attr('width', legendWidth + 12).attr('height', 50).attr('rx', 4)
      .attr('fill', 'rgba(15, 15, 26, 0.75)');

    legendG.append('text').attr('x', 0).attr('y', -8)
      .attr('fill', '#cbd5e1').attr('font-size', '11px').attr('font-weight', '600')
      .text(variable === 'tas' ? 'Temperature anomaly (°C)' : 'Precip. anomaly (mm/day)');

    const defsEl = legendG.append('defs');
    const linearGrad = defsEl.append('linearGradient')
      .attr('id', 'legend-gradient').attr('x1', '0%').attr('x2', '100%').attr('y1', '0%').attr('y2', '0%');

    linearGrad.selectAll('stop')
      .data(d3.range(legendN).map(i => {
        const t = i / (legendN - 1);
        const val = domain[0] + t * (domain[domain.length - 1] - domain[0]);
        return { offset: `${t * 100}%`, color: colorScale(val) };
      }))
      .join('stop').attr('offset', d => d.offset).attr('stop-color', d => d.color);

    legendG.append('rect').attr('width', legendWidth).attr('height', legendHeight)
      .attr('rx', 3).attr('fill', 'url(#legend-gradient)');

    legendG.append('g').attr('transform', `translate(0, ${legendHeight + 2})`)
      .call(legendAxis).selectAll('text').attr('fill', '#cbd5e1').attr('font-size', '9px');
  }

  // ---- Update Projection ----
  function updateProjection() {
    projection.scale(baseScale * state.globeScale).rotate(state.rotation);
    oceanSphere.attr('r', projection.scale());
    atmosCircle.attr('r', projection.scale() * 1.12);
    clipPath.select('path').attr('d', geoPath({ type: 'Sphere' }));
  }

  // ---- Render all geographic elements (called during rotation) ----
  function renderAll() {
    graticulePath.attr('d', geoPath(graticule()));
    if (data.worldTopo) countriesG.selectAll('path').attr('d', geoPath);
    if (state.gridData && state.gridData.length > 0) renderHeatmapPositions();
    renderLegend(state.variable, getColorScale(state.variable));
  }

  // ---- Data Loading ----
  async function loadGridData(scenario, variable) {
    state.loading = true;
    var url = 'data/processed/grids/' + scenario + '_' + variable + '_decades.json';
    try {
      var compactData = await d3.json(url);
      state.decadesData = compactData;
      state.decadeLabels = compactData.decades || [];
      state.gridData = getGridDataForDecade(state.currentDecadeIndex);
    } catch (err) {
      console.warn('Failed to load grid data:', url, err.message);
      state.decadesData = null;
      state.decadeLabels = [];
      state.gridData = [];
    }
    state.loading = false;
    return state.gridData;
  }

  function getGridDataForDecade(decadeIndex) {
    if (!state.decadesData || !state.decadesData.cells) return [];
    var idx = Math.max(0, Math.min(decadeIndex, (state.decadeLabels.length || 1) - 1));
    var cells = state.decadesData.cells;
    var result = [];
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.values[idx] != null) {
        result.push({ lat: c.lat, lon: c.lon, value: c.values[idx] });
      }
    }
    return result;
  }

  // ---- Compute visible grid points (D3 geoPath for visibility) ----
  function computeVisiblePoints() {
    if (!state.gridData || state.gridData.length === 0) return [];
    projection.rotate(state.rotation);
    // isDotVisible now uses D3's own geoPath + clipAngle — guaranteed correct.
    var result = [];
    var latStep = 5;
    var refPts = {};
    var maxDist = projection.scale() * 1.02;
    var total = state.gridData.length;
    var passCount = 0, failCount = 0;
    for (var i = 0; i < total; i++) {
      var d = state.gridData[i];
      if (!isDotVisible(d.lon, d.lat)) { failCount++; continue; }
      passCount++;
      var pos = projection([d.lon, d.lat]);
      if (!pos || isNaN(pos[0]) || isNaN(pos[1])) continue;
      var cx = pos[0], cy = pos[1];
      if (cx * cx + cy * cy > maxDist * maxDist) continue;
      var latKey = Math.round(d.lat / latStep) * latStep;
      if (!(latKey in refPts)) {
        var adj = projection([d.lon, d.lat + latStep]);
        refPts[latKey] = (adj && !isNaN(adj[0]) && !isNaN(adj[1]))
          ? Math.abs(cy - adj[1]) * 0.95 : 8;
      }
      var r = Math.max(refPts[latKey], 3);
      result.push({
        lon: d.lon, lat: d.lat, value: d.value,
        cx: cx, cy: cy, r: r, visible: 1,
      });
    }
    if (!computeVisiblePoints._cnt) computeVisiblePoints._cnt = 0;
    if (++computeVisiblePoints._cnt % 15 === 1) {
      console.log('dots: ' + passCount + ' visible / ' + total +
        '  |  rot=[' + state.rotation.map(function(v){return v.toFixed(1);}).join(',') + ']');
    }
    return result;
  }

  // ---- Tooltip HTML ----
  function tooltipHTML(d) {
    const regionName = findRegion(d.lat, d.lon);
    const val = d.value;
    const unit = state.variable === 'tas' ? '°C' : ' mm/day';
    const sign = val > 0 ? '+' : '';
    const decade = state.decadeLabels[state.currentDecadeIndex] || '';
    return `<strong>${regionName}</strong><br><span style="font-size:1.1rem;font-weight:700;">${sign}${val.toFixed(2)}${unit}</span><br><span style="font-size:0.75rem;color:#94a3b8;">${SCENARIO_LABELS[state.scenario]} · ${VARIABLES[state.variable].label}<br>${decade}</span>`;
  }

  // ---- Delaunay ----
  let delaunay = null, delaunayPoints = [];

  function renderHeatmapPositions() {
    var visiblePoints = computeVisiblePoints();
    delaunayPoints = visiblePoints;
    delaunay = visiblePoints.length >= 3
      ? d3.Delaunay.from(visiblePoints.map(function (d) { return [d.cx, d.cy]; }))
      : null;

    // Only keep visible dots in the DOM — back-face dots are removed entirely
    var circles = heatmapG.selectAll('.heat-dot')
      .data(visiblePoints, function (d) { return d.lat + ',' + d.lon; });

    circles.join(
      function (enter) {
        return enter.append('circle')
          .attr('class', 'heat-dot')
          .attr('stroke', 'none')
          .attr('cx', function (d) { return d.cx; })
          .attr('cy', function (d) { return d.cy; })
          .attr('r', function (d) { return d.r; })
          .attr('fill', function (d) {
            
            return getColor(d.value, state.variable);
          })
          .attr('opacity', function (d) { return 0.18 * d.visible; });
      },
      function (update) {
        return update
          .attr('cx', function (d) { return d.cx; })
          .attr('cy', function (d) { return d.cy; })
          .attr('r', function (d) { return d.r; })
          .attr('fill', function (d) {
            
            return getColor(d.value, state.variable);
          })
          .attr('opacity', function (d) { return 0.18 * d.visible; });
      },
      function (exit) {
        return exit.remove();
      }
    );
  }

  function renderGrid(transitionDuration) {
    if (transitionDuration === undefined) transitionDuration = 0;
    var visiblePoints = computeVisiblePoints();
    delaunayPoints = visiblePoints;
    delaunay = visiblePoints.length >= 3
      ? d3.Delaunay.from(visiblePoints.map(function (d) { return [d.cx, d.cy]; }))
      : null;

    var circles = heatmapG.selectAll('.heat-dot')
      .data(visiblePoints, function (d) { return d.lat + ',' + d.lon; });

    if (transitionDuration > 0) {
      circles.join(
        function (enter) {
          return enter.append('circle').attr('class', 'heat-dot').attr('stroke', 'none')
            .attr('opacity', 0)
            .attr('cx', function (d) { return d.cx; })
            .attr('cy', function (d) { return d.cy; })
            .attr('r', function (d) { return d.r; })
            .attr('fill', function (d) {  return getColor(d.value, state.variable); })
            .transition().duration(transitionDuration).ease(d3.easeCubicInOut)
            .attr('opacity', function (d) { return 0.18 * d.visible; });
        },
        function (update) {
          return update.transition().duration(transitionDuration).ease(d3.easeCubicInOut)
            .attr('cx', function (d) { return d.cx; })
            .attr('cy', function (d) { return d.cy; })
            .attr('r', function (d) { return d.r; })
            .attr('fill', function (d) {  return getColor(d.value, state.variable); })
            .attr('opacity', function (d) { return 0.18 * d.visible; });
        },
        function (exit) {
          return exit.remove();
        }
      );
    } else {
      circles.join(
        function (enter) {
          return enter.append('circle').attr('class', 'heat-dot').attr('stroke', 'none')
            .attr('cx', function (d) { return d.cx; })
            .attr('cy', function (d) { return d.cy; })
            .attr('r', function (d) { return d.r; })
            .attr('fill', function (d) {  return getColor(d.value, state.variable); })
            .attr('opacity', function (d) { return 0.18 * d.visible; });
        },
        function (update) {
          return update
            .attr('cx', function (d) { return d.cx; })
            .attr('cy', function (d) { return d.cy; })
            .attr('r', function (d) { return d.r; })
            .attr('fill', function (d) {  return getColor(d.value, state.variable); })
            .attr('opacity', function (d) { return 0.18 * d.visible; });
        },
        function (exit) {
          return exit.remove();
        }
      );
    }

    renderLegend(state.variable, getColorScale(state.variable));
  }

  // ---- Hover/click ----
  function handleMapPointer(event) {
    const [mx, my] = d3.pointer(event, clipG.node());
    if (!delaunay || !delaunayPoints.length) return;
    const i = delaunay.find(mx, my);
    const d = delaunayPoints[i];
    if (!d) return;
    tooltip.style('opacity', 1).html(tooltipHTML(d))
      .style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 10}px`);
    heatGlow.attr('cx', d.cx).attr('cy', d.cy).attr('r', d.r * 1.8).attr('opacity', 0.4);
  }

  function handleMapLeave() {
    tooltip.style('opacity', 0);
    heatGlow.attr('opacity', 0);
  }

  function handleMapClick(event) {
    const [mx, my] = d3.pointer(event, clipG.node());
    if (!delaunay || !delaunayPoints.length) return;
    const i = delaunay.find(mx, my);
    const d = delaunayPoints[i];
    if (!d) return;
    const region = findRegion(d.lat, d.lon);
    state.selectedRegion = region;
    container.dispatchEvent(new CustomEvent('regionSelected', {
      detail: { region, scenario: state.scenario, variable: state.variable }, bubbles: true,
    }));
  }

  clipG.on('mousemove', handleMapPointer);
  clipG.on('mouseleave', handleMapLeave);
  clipG.on('click', handleMapClick);

  // ---- Region lookup ----
  function findRegion(lat, lon) {
    const regionCenters = {
      'Arctic': { lat: 75, lon: 0 }, 'North America': { lat: 45, lon: -100 },
      'South America': { lat: -15, lon: -60 }, 'Europe': { lat: 50, lon: 10 },
      'Africa': { lat: 5, lon: 20 }, 'South Asia': { lat: 25, lon: 80 },
      'Australia': { lat: -25, lon: 135 },
    };
    if (lat > 65) return 'Arctic';
    let closest = 'Global', minDist = Infinity;
    for (const [region, center] of Object.entries(regionCenters)) {
      const dLat = lat - center.lat, dLon = lon - center.lon;
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist < minDist) { minDist = dist; closest = region; }
    }
    return minDist < 45 ? closest : 'Global';
  }

  // ---- Decade Label ----
  const decadeLabel = svg.append('text').attr('class', 'map-decade-label')
    .attr('x', width / 2).attr('y', height - 18).attr('text-anchor', 'middle')
    .attr('fill', '#94a3b8').attr('font-size', '12px').attr('font-weight', '600')
    .attr('pointer-events', 'none').text('');

  function updateDecadeLabel() {
    const label = state.decadeLabels[state.currentDecadeIndex] || '';
    decadeLabel.text(label ? `Showing: ${label}` : '');
  }

  // ---- Auto-Rotate ----
  function startAutoRotate() {
    if (state.isAutoRotating) return;
    state.isAutoRotating = true;
    autoRotateBtn.text('Stop').classed('active', true);
    function step() {
      if (!state.isAutoRotating) return;
      state.rotation[0] = (state.rotation[0] + 0.15) % 360;
      updateProjection();
      renderAll();
      state.autoRotateTimer = requestAnimationFrame(step);
    }
    state.autoRotateTimer = requestAnimationFrame(step);
  }

  function stopAutoRotate() {
    state.isAutoRotating = false;
    if (state.autoRotateTimer) { cancelAnimationFrame(state.autoRotateTimer); state.autoRotateTimer = null; }
    autoRotateBtn.text('Spin').classed('active', false);
  }

  function toggleAutoRotate() {
    if (state.isAutoRotating) stopAutoRotate(); else startAutoRotate();
  }

  // ---- Init ----
  async function init() {
    await loadGridData(state.scenario, state.variable);
    updateProjection();
    updateDecadeLabel();
    renderGrid(0);
  }

  // ---- Decade Switching ----
  async function updateDecade(index) {
    if (!state.decadesData) return;
    var newIndex = Math.max(0, Math.min(index, state.decadeLabels.length - 1));
    if (newIndex === state.currentDecadeIndex) return;
    state.currentDecadeIndex = newIndex;
    state.gridData = getGridDataForDecade(newIndex);
    updateDecadeLabel();
    renderGrid(600);
  }

  // ---- Auto-Play (Decades) ----
  function startPlayback() {
    if (state.isPlaying) return;
    state.isPlaying = true;
    const intervalMs = 2500;
    function advance() {
      if (!state.isPlaying) return;
      let next = state.currentDecadeIndex + 1;
      if (next >= state.decadeLabels.length) next = 0;
      updateDecade(next).then(() => { state.playbackTimer = setTimeout(advance, intervalMs); });
    }
    state.playbackTimer = setTimeout(advance, intervalMs);
  }

  function stopPlayback() {
    state.isPlaying = false;
    if (state.playbackTimer) { clearTimeout(state.playbackTimer); state.playbackTimer = null; }
  }

  function togglePlayback() {
    if (state.isPlaying) stopPlayback(); else startPlayback();
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
    stopAutoRotate();
    svg.remove();
    tooltip.remove();
  }

  init();

  return {
    updateScenario, updateVariable, updateDecade,
    startPlayback, stopPlayback, togglePlayback,
    destroy,
    getState: () => ({ ...state }),
  };
}
