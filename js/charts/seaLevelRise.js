/* ============================================================
   seaLevelRise.js — Thermometer + Building Comparison
   Drag a temperature thermometer (0–8°C) and watch sea-level
   rise estimated from global temperature anomaly animate
   against a building + person scene.

   Uses estimateSLR() from utils.js
   ============================================================ */

function seaLevelRiseChart(container) {
  'use strict';

  // ---- Internal State ----
  var state = {
    currentTemp: 0,        // current temperature in °C
    targetTemp: 0,         // target for smooth animation
    animFrameId: null,     // requestAnimationFrame id
  };

  // ---- Dimensions ----
  var rect = container.getBoundingClientRect();
  var totalWidth = Math.max(rect.width || container.clientWidth || 900, 320);
  var totalHeight = 560;

  // Responsive layout: side-by-side on wide screens, stacked on narrow
  var isNarrow = totalWidth < 700;
  var thermoWidth = isNarrow ? totalWidth : Math.round(totalWidth * 0.28);
  var sceneWidth = isNarrow ? totalWidth : Math.round(totalWidth * 0.72);
  var thermoHeight = isNarrow ? 200 : totalHeight;
  var sceneHeight = isNarrow ? 340 : totalHeight;

  // Margins
  var thermoMargin = { top: 30, right: 10, bottom: 30, left: 50 };
  var sceneMargin = { top: 20, right: 20, bottom: 20, left: 10 };

  // ---- SVG Setup ----
  var wrapper = document.createElement('div');
  wrapper.className = 'slr-chart-wrapper';
  container.appendChild(wrapper);

  // Thermometer SVG
  var thermoSvg = d3.select(wrapper).append('svg')
    .attr('class', 'slr-thermo-svg')
    .attr('width', thermoWidth)
    .attr('height', thermoHeight)
    .attr('viewBox', [0, 0, thermoWidth, thermoHeight])
    .style('display', 'block');

  // Scene SVG
  var sceneSvg = d3.select(wrapper).append('svg')
    .attr('class', 'slr-scene-svg')
    .attr('width', sceneWidth)
    .attr('height', sceneHeight)
    .attr('viewBox', [0, 0, sceneWidth, sceneHeight])
    .style('display', 'block');

  // ---- Thermometer ----
  var thermoInnerW = thermoWidth - thermoMargin.left - thermoMargin.right;
  var thermoInnerH = thermoHeight - thermoMargin.top - thermoMargin.bottom;

  var thermoG = thermoSvg.append('g')
    .attr('transform', 'translate(' + thermoMargin.left + ',' + thermoMargin.top + ')');

  // Temp scale
  var tempScale = d3.scaleLinear()
    .domain([TEMP_RANGE.max, TEMP_RANGE.min])  // 8 at top, 0 at bottom
    .range([0, thermoInnerH]);

  var tempAxis = d3.axisRight(tempScale)
    .ticks(8)
    .tickFormat(function (d) { return d + '°C'; });

  // Thermo tube background
  var tubeWidth = 28;
  var tubeX = thermoInnerW / 2 - tubeWidth / 2;

  thermoG.append('rect')
    .attr('class', 'slr-tube-bg')
    .attr('x', tubeX)
    .attr('y', 0)
    .attr('width', tubeWidth)
    .attr('height', thermoInnerH)
    .attr('rx', tubeWidth / 2)
    .attr('ry', tubeWidth / 2);

  // Mercury fill (clipped to tube)
  var mercuryClipId = 'mercury-clip-' + Math.random().toString(36).slice(2, 8);
  var defs = thermoSvg.append('defs');
  defs.append('clipPath').attr('id', mercuryClipId)
    .append('rect')
    .attr('x', tubeX)
    .attr('y', 0)
    .attr('width', tubeWidth)
    .attr('height', thermoInnerH)
    .attr('rx', tubeWidth / 2);

  var mercuryG = thermoG.append('g').attr('clip-path', 'url(#' + mercuryClipId + ')');

  // Mercury fill rect (driven by temp)
  var mercuryRect = mercuryG.append('rect')
    .attr('class', 'slr-mercury-fill')
    .attr('x', tubeX)
    .attr('y', thermoInnerH)  // start from bottom
    .attr('width', tubeWidth)
    .attr('height', 0)
    .attr('rx', tubeWidth / 2);

  // Mercury gradient
  var mercGrad = defs.append('linearGradient')
    .attr('id', 'mercury-grad').attr('x1', '0%').attr('y1', '100%').attr('x2', '0%').attr('y2', '0%');
  mercGrad.append('stop').attr('offset', '0%').attr('stop-color', '#d44');
  mercGrad.append('stop').attr('offset', '40%').attr('stop-color', '#f66');
  mercGrad.append('stop').attr('offset', '100%').attr('stop-color', '#c11');
  mercuryRect.attr('fill', 'url(#mercury-grad)');

  // Bulb at bottom
  thermoG.append('circle')
    .attr('class', 'slr-bulb')
    .attr('cx', thermoInnerW / 2)
    .attr('cy', thermoInnerH + 14)
    .attr('r', 18)
    .attr('fill', 'url(#mercury-grad)')
    .attr('stroke', '#8b1a1a')
    .attr('stroke-width', 1.5);

  // Tube border
  thermoG.append('rect')
    .attr('class', 'slr-tube-border')
    .attr('x', tubeX)
    .attr('y', 0)
    .attr('width', tubeWidth)
    .attr('height', thermoInnerH)
    .attr('rx', tubeWidth / 2)
    .attr('ry', tubeWidth / 2)
    .attr('fill', 'none')
    .attr('stroke', '#8b1a1a')
    .attr('stroke-width', 2);

  // Temperature value label at top
  var tempLabel = thermoG.append('text')
    .attr('class', 'slr-temp-label')
    .attr('x', thermoInnerW / 2)
    .attr('y', -8)
    .attr('text-anchor', 'middle')
    .attr('font-size', '22px')
    .attr('font-weight', '850')
    .attr('fill', '#d44')
    .text('+0.0°C');

  // Tick marks on left side
  thermoG.append('g')
    .attr('class', 'slr-ticks')
    .attr('transform', 'translate(' + (tubeX - 6) + ',0)')
    .call(d3.axisLeft(tempScale).ticks(8).tickSize(6).tickFormat(''));

  // Tick labels
  thermoG.append('g')
    .attr('class', 'slr-tick-labels')
    .attr('transform', 'translate(' + (tubeX - 10) + ',0)')
    .call(d3.axisLeft(tempScale).ticks(8).tickSize(0).tickPadding(4).tickFormat(function (d) { return d + '°'; }))
    .selectAll('text').attr('font-size', '10px').attr('fill', '#556');

  // SSP reference marks on right side
  var sspEntries = Object.entries(SSP_2100_TEMPS);
  var sspMarkColors = {
    ssp126: SCENARIO_COLORS.ssp126,
    ssp245: SCENARIO_COLORS.ssp245,
    ssp370: SCENARIO_COLORS.ssp370,
    ssp585: SCENARIO_COLORS.ssp585,
  };
  var sspLabels = {
    ssp126: 'SSP1',
    ssp245: 'SSP2',
    ssp370: 'SSP3',
    ssp585: 'SSP5',
  };

  var sspMarksG = thermoG.append('g').attr('class', 'slr-ssp-marks');

  sspEntries.forEach(function (entry) {
    var key = entry[0];
    var t = entry[1];
    var y = tempScale(t);
    var markX = tubeX + tubeWidth + 8;

    // Connecting line
    sspMarksG.append('line')
      .attr('class', 'slr-ssp-line')
      .attr('x1', tubeX + tubeWidth)
      .attr('x2', markX + 12)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', sspMarkColors[key])
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3 3')
      .attr('opacity', 0.5);

    // Colored dot
    sspMarksG.append('circle')
      .attr('class', 'slr-ssp-dot')
      .attr('cx', markX + 12)
      .attr('cy', y)
      .attr('r', 4.5)
      .attr('fill', sspMarkColors[key])
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Label
    sspMarksG.append('text')
      .attr('class', 'slr-ssp-label')
      .attr('x', markX + 18)
      .attr('y', y + 4)
      .attr('fill', sspMarkColors[key])
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text(sspLabels[key]);
  });

  // ---- Thermometer Dragging ----
  var isDragging = false;

  function setTemperature(tempC, animate) {
    var clamped = Math.max(TEMP_RANGE.min, Math.min(TEMP_RANGE.max, tempC));
    if (animate) {
      state.targetTemp = clamped;
      if (!state.animFrameId) animateToTarget();
    } else {
      state.currentTemp = clamped;
      state.targetTemp = clamped;
      updateMercury(clamped);
      updateScene(clamped);
      updateReadout(clamped);
    }
  }

  function animateToTarget() {
    var diff = state.targetTemp - state.currentTemp;
    if (Math.abs(diff) < 0.02) {
      state.currentTemp = state.targetTemp;
      updateMercury(state.currentTemp);
      updateScene(state.currentTemp);
      updateReadout(state.currentTemp);
      state.animFrameId = null;
      return;
    }
    state.currentTemp += diff * 0.18; // easing factor
    updateMercury(state.currentTemp);
    updateScene(state.currentTemp);
    updateReadout(state.currentTemp);
    state.animFrameId = requestAnimationFrame(animateToTarget);
  }

  function updateMercury(tempC) {
    var frac = tempC / TEMP_RANGE.max; // 0 at bottom, 1 at top
    var fillH = frac * thermoInnerH;
    var fillY = thermoInnerH - fillH;

    mercuryRect
      .attr('y', fillY)
      .attr('height', fillH);

    tempLabel
      .attr('fill', tempC > 4 ? '#b71c1c' : tempC > 2 ? '#e53935' : '#d44')
      .text('+' + tempC.toFixed(1) + '°C');
  }

  // ---- Building Scene ----
  var sceneG = sceneSvg.append('g')
    .attr('transform', 'translate(' + sceneMargin.left + ',' + sceneMargin.top + ')');

  var sceneInnerW = sceneWidth - sceneMargin.left - sceneMargin.right;
  var sceneInnerH = sceneHeight - sceneMargin.top - sceneMargin.bottom;

  // SLR height scale (meters → pixels). 0m = scene bottom, 2m = ~60% up
  var slrScale = d3.scaleLinear()
    .domain([0, 2.0])
    .range([sceneInnerH, sceneInnerH * 0.15]);

  // Ground line
  var groundY = sceneInnerH;
  sceneG.append('line')
    .attr('class', 'slr-ground')
    .attr('x1', 0).attr('x2', sceneInnerW)
    .attr('y1', groundY).attr('y2', groundY)
    .attr('stroke', '#5d7d6a')
    .attr('stroke-width', 2);

  // Sea-level baseline (0m = current)
  var baselineY = slrScale(0);
  sceneG.append('line')
    .attr('class', 'slr-baseline')
    .attr('x1', 0).attr('x2', sceneInnerW)
    .attr('y1', baselineY).attr('y2', baselineY)
    .attr('stroke', '#1d6b7a')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '6 4');

  sceneG.append('text')
    .attr('class', 'slr-baseline-label')
    .attr('x', 5)
    .attr('y', baselineY - 5)
    .attr('fill', '#1d6b7a')
    .attr('font-size', '11px')
    .attr('font-weight', '700')
    .text('Current sea level (0 m)');

  // Ground fill (brown/dirt below baseline)
  sceneG.append('rect')
    .attr('class', 'slr-ground-fill')
    .attr('x', 0)
    .attr('y', baselineY)
    .attr('width', sceneInnerW)
    .attr('height', groundY - baselineY)
    .attr('fill', '#e8dcc8');

  // Reference marks (dashed lines + labels)
  var refMarksG = sceneG.append('g').attr('class', 'slr-ref-marks');

  SLR_REFERENCE_MARKS.forEach(function (mark) {
    var y = slrScale(mark.height);
    var labelX = 5;
    var labelText = mark.height.toFixed(2) + 'm — ' + mark.label;

    // Dashed line
    refMarksG.append('line')
      .attr('x1', 0).attr('x2', sceneInnerW)
      .attr('y1', y).attr('y2', y)
      .attr('stroke', '#9eb0b6')
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '5 4');

    // White background pill for readability
    var textMetrics = { width: labelText.length * 7.5 };
    refMarksG.append('rect')
      .attr('x', labelX - 4)
      .attr('y', y - 10)
      .attr('width', textMetrics.width + 8)
      .attr('height', 18)
      .attr('rx', 3)
      .attr('fill', 'rgba(255, 255, 255, 0.85)')
      .attr('stroke', 'rgba(155, 175, 180, 0.3)')
      .attr('stroke-width', 0.5);

    // Text label
    refMarksG.append('text')
      .attr('x', labelX)
      .attr('y', y + 4)
      .attr('fill', '#1a2a36')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .text(labelText);
  });

  // Person positioned on the right side, clear of labels
  var personX = sceneInnerW * 0.72;
  var personBaseY = baselineY;
  var personH = slrScale(0) - slrScale(1.7);

  var personG = sceneG.append('g').attr('class', 'slr-person');

  // Scale everything relative to person height
  var headR = personH * 0.09;
  var neckY = personH * 0.22;
  var shoulderY = personH * 0.25;
  var waistY = personH * 0.55;
  var groinY = personH * 0.58;
  var kneeY = personH * 0.75;
  var footY = personH;
  var armSpan = personH * 0.2;

  var pTopY = personBaseY - personH;

  // Head
  personG.append('circle')
    .attr('cx', personX)
    .attr('cy', pTopY + headR)
    .attr('r', headR)
    .attr('fill', '#2d3b47');

  // Neck
  personG.append('rect')
    .attr('x', personX - headR * 0.35)
    .attr('y', pTopY + headR * 1.6)
    .attr('width', headR * 0.7)
    .attr('height', neckY - headR * 1.6)
    .attr('fill', '#2d3b47');

  // Torso (trapezoid for shoulders → waist)
  personG.append('polygon')
    .attr('points',
      (personX - armSpan * 0.85) + ',' + (pTopY + shoulderY) + ' ' +
      (personX + armSpan * 0.85) + ',' + (pTopY + shoulderY) + ' ' +
      (personX + armSpan * 0.6) + ',' + (pTopY + waistY) + ' ' +
      (personX - armSpan * 0.6) + ',' + (pTopY + waistY))
    .attr('fill', '#2d3b47');

  // Arms (upper + lower)
  // Left arm
  personG.append('path')
    .attr('d',
      'M' + (personX - armSpan * 0.85) + ',' + (pTopY + shoulderY + 2) +
      'Q' + (personX - armSpan * 1.3) + ',' + (pTopY + waistY * 0.7) + ' ' +
      (personX - armSpan * 0.9) + ',' + (pTopY + groinY))
    .attr('fill', 'none')
    .attr('stroke', '#2d3b47')
    .attr('stroke-width', headR * 0.6)
    .attr('stroke-linecap', 'round');
  // Right arm
  personG.append('path')
    .attr('d',
      'M' + (personX + armSpan * 0.85) + ',' + (pTopY + shoulderY + 2) +
      'Q' + (personX + armSpan * 1.3) + ',' + (pTopY + waistY * 0.7) + ' ' +
      (personX + armSpan * 0.9) + ',' + (pTopY + groinY))
    .attr('fill', 'none')
    .attr('stroke', '#2d3b47')
    .attr('stroke-width', headR * 0.6)
    .attr('stroke-linecap', 'round');

  // Legs
  // Left leg
  personG.append('path')
    .attr('d',
      'M' + (personX - armSpan * 0.4) + ',' + (pTopY + groinY) +
      'L' + (personX - armSpan * 0.35) + ',' + (pTopY + kneeY) +
      'L' + (personX - armSpan * 0.3) + ',' + (pTopY + footY))
    .attr('fill', 'none')
    .attr('stroke', '#2d3b47')
    .attr('stroke-width', headR * 0.7)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round');
  // Right leg
  personG.append('path')
    .attr('d',
      'M' + (personX + armSpan * 0.4) + ',' + (pTopY + groinY) +
      'L' + (personX + armSpan * 0.35) + ',' + (pTopY + kneeY) +
      'L' + (personX + armSpan * 0.3) + ',' + (pTopY + footY))
    .attr('fill', 'none')
    .attr('stroke', '#2d3b47')
    .attr('stroke-width', headR * 0.7)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round');

  // Feet
  personG.append('ellipse')
    .attr('cx', personX - armSpan * 0.3)
    .attr('cy', pTopY + footY - 1)
    .attr('rx', headR * 0.5)
    .attr('ry', headR * 0.2)
    .attr('fill', '#2d3b47');
  personG.append('ellipse')
    .attr('cx', personX + armSpan * 0.3)
    .attr('cy', pTopY + footY - 1)
    .attr('rx', headR * 0.5)
    .attr('ry', headR * 0.2)
    .attr('fill', '#2d3b47');

  // Person label
  sceneG.append('text')
    .attr('x', personX)
    .attr('y', pTopY - 10)
    .attr('text-anchor', 'middle')
    .attr('fill', '#2d3b47')
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .text('1.7m person');

  // ---- Water Layer ----
  var waterG = sceneG.append('g').attr('class', 'slr-water-group');

  // Water fill rect
  var waterRect = waterG.append('rect')
    .attr('class', 'slr-water-fill')
    .attr('x', 0)
    .attr('y', baselineY)  // start at baseline
    .attr('width', sceneInnerW)
    .attr('height', 0)
    .attr('fill', 'rgba(30, 120, 200, 0.55)');

  // Water surface accent line
  var waterLine = waterG.append('line')
    .attr('class', 'slr-water-line')
    .attr('x1', 0).attr('x2', sceneInnerW)
    .attr('y1', baselineY).attr('y2', baselineY)
    .attr('stroke', '#4a90d9')
    .attr('stroke-width', 2.5);

  // SLR value label (moves with water line)
  var slrValueLabel = waterG.append('text')
    .attr('class', 'slr-value-label')
    .attr('x', sceneInnerW - 8)
    .attr('y', baselineY - 8)
    .attr('text-anchor', 'end')
    .attr('font-size', '16px')
    .attr('font-weight', '850')
    .attr('fill', '#1d6b7a');

  // ---- Scene Update ----
  function updateScene(tempC) {
    var slr = estimateSLR(tempC);
    var waterTopY = slrScale(slr);

    waterRect
      .attr('y', waterTopY)
      .attr('height', groundY - waterTopY);

    waterLine
      .attr('y1', waterTopY)
      .attr('y2', waterTopY);

    slrValueLabel
      .attr('y', waterTopY - 8)
      .text('≈ ' + slr.toFixed(2) + ' m');
  }

  // ---- Readout Panel ----
  var readout = document.createElement('div');
  readout.className = 'slr-readout';
  wrapper.appendChild(readout);

  function updateReadout(tempC) {
    var slr = estimateSLR(tempC);
    var riskLevel = slr < 0.3 ? 'low' : slr < 0.6 ? 'moderate' : slr < 1.0 ? 'high' : 'extreme';
    readout.innerHTML =
      '<span class="slr-readout-temp">At <strong>+' + tempC.toFixed(1) + '°C</strong> of warming</span>' +
      '<span class="slr-readout-slr">sea levels rise approximately <strong>' + slr.toFixed(2) + ' m</strong></span>' +
      '<span class="slr-readout-risk slr-risk-' + riskLevel + '">(' + riskLevel + ' risk)</span>';
  }

  // ---- Dragging Interaction ----
  thermoSvg.on('mousedown touchstart', function (event) {
    isDragging = true;
    thermoSvg.style('cursor', 'grabbing');
    handlePointer(event);
  });

  d3.select(window).on('mousemove.slr touchmove.slr', function (event) {
    if (!isDragging) return;
    handlePointer(event);
  });

  d3.select(window).on('mouseup.slr touchend.slr', function () {
    isDragging = false;
    thermoSvg.style('cursor', 'grab');
  });

  function handlePointer(event) {
    var coords = d3.pointer(event, thermoSvg.node());
    var svgY = coords[1];
    // Convert mouse Y to temperature (invert scale)
    var rawTemp = tempScale.invert(svgY - thermoMargin.top);
    var clamped = Math.max(TEMP_RANGE.min, Math.min(TEMP_RANGE.max, rawTemp));
    setTemperature(clamped, false); // snap, no animation during drag
  }

  // Click (without drag) to set temperature
  thermoSvg.on('click', function (event) {
    if (isDragging) return; // handled by drag
    handlePointer(event);
  });

  thermoSvg.style('cursor', 'grab');

  // ---- Initialize ----
  setTemperature(0, false);
  updateReadout(0);

  // ---- Public API ----
  return {
    setTemperature: function (tempC, animate) {
      setTemperature(tempC, animate !== false);
    },
    getState: function () {
      return { currentTemp: state.currentTemp, slr: estimateSLR(state.currentTemp) };
    },
    destroy: function () {
      if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
      d3.select(window).on('mousemove.slr', null);
      d3.select(window).on('mouseup.slr', null);
      d3.select(window).on('touchmove.slr', null);
      d3.select(window).on('touchend.slr', null);
      container.innerHTML = '';
    },
  };
}
