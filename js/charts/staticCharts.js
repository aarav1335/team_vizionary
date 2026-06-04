/* ============================================================
   staticCharts.js
   D3 versions of the six notebook reference visualizations.
   ============================================================ */

(function () {
  'use strict';

  const gridCache = new Map();
  let renderCounter = 0;

  const scenarioOrder = ['ssp126', 'ssp245', 'ssp370', 'ssp585'];
  const scenarioNames = {
    ssp126: 'SSP1-2.6',
    ssp245: 'SSP2-4.5',
    ssp370: 'SSP3-7.0',
    ssp585: 'SSP5-8.5',
  };
  const scenarioDescriptions = {
    ssp126: 'low emissions',
    ssp245: 'middle path',
    ssp370: 'high emissions',
    ssp585: 'very high emissions',
  };
  const scenarioPalette = {
    ssp126: '#2f8f70',
    ssp245: '#d29a2d',
    ssp370: '#d45b3f',
    ssp585: '#9c2f45',
  };

  const fmt1 = d3.format('.1f');
  const fmt2 = d3.format('.2f');

  function signed(value, digits) {
    const format = digits === 2 ? fmt2 : fmt1;
    return `${value > 0 ? '+' : ''}${format(value)}`;
  }

  function parseDecade(label) {
    const parts = label.split('-').map(Number);
    return { start: parts[0], end: parts[1] };
  }

  function medianStep(values) {
    const unique = Array.from(new Set(values)).sort((a, b) => a - b);
    const diffs = d3.pairs(unique).map(([a, b]) => b - a).filter(d => d > 0);
    return d3.median(diffs) || 1;
  }

  function loadGrid(path) {
    if (!gridCache.has(path)) {
      gridCache.set(path, d3.json(path));
    }
    return gridCache.get(path);
  }

  function createShell(container, step, className) {
    container.innerHTML = '';
    container.dataset.chartStep = String(step);
    return d3.select(container)
      .append('div')
      .attr('class', `story-chart-shell ${className || ''}`);
  }

  function createSvg(shell, width = 1080, height = 620) {
    return shell.append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('preserveAspectRatio', 'xMidYMid meet');
  }

  function addHeader(svg, title, subtitle) {
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', 40)
      .attr('y', 42)
      .text(title);

    if (subtitle) {
      svg.append('text')
        .attr('class', 'chart-subtitle')
        .attr('x', 40)
        .attr('y', 68)
        .text(subtitle);
    }
  }

  function addSource(svg, text, width = 1080, y = 596) {
    svg.append('text')
      .attr('class', 'chart-source')
      .attr('x', width - 40)
      .attr('y', y)
      .attr('text-anchor', 'end')
      .text(text);
  }

  function drawGrid(svg, x, y, plot) {
    svg.append('g')
      .attr('class', 'chart-grid')
      .attr('transform', `translate(0,${plot.bottom})`)
      .call(d3.axisBottom(x).tickSize(-(plot.bottom - plot.top)).tickFormat('').ticks(6));

    svg.append('g')
      .attr('class', 'chart-grid')
      .attr('transform', `translate(${plot.left},0)`)
      .call(d3.axisLeft(y).tickSize(-(plot.right - plot.left)).tickFormat('').ticks(5));
  }

  function drawContinuousLegend(svg, scale, options) {
    const {
      x,
      y,
      width,
      height,
      label,
      format = d => d,
      id,
      ticks = 5,
    } = options;

    const domain = scale.domain();
    const min = domain[0];
    const max = domain[domain.length - 1];
    const gradientId = `legend-${id}-${Math.random().toString(36).slice(2)}`;
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    d3.range(80).forEach(i => {
      const t = i / 79;
      const value = min + t * (max - min);
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', scale(value));
    });

    svg.append('text')
      .attr('class', 'legend-label')
      .attr('x', x)
      .attr('y', y - 10)
      .text(label);

    svg.append('rect')
      .attr('class', 'legend-ramp')
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', `url(#${gradientId})`);

    const axisScale = d3.scaleLinear().domain([min, max]).range([x, x + width]);
    svg.append('g')
      .attr('class', 'chart-axis legend-axis')
      .attr('transform', `translate(0,${y + height})`)
      .call(d3.axisBottom(axisScale).ticks(ticks).tickSize(4).tickFormat(format));
  }

  function drawAxes(svg, x, y, plot, xLabel, yLabel, axisOptions = {}) {
    const xAxis = d3.axisBottom(x).ticks(axisOptions.xTicks || 6);
    if (axisOptions.xTickValues) {
      xAxis.tickValues(axisOptions.xTickValues);
    }
    if (axisOptions.xTickFormat) {
      xAxis.tickFormat(axisOptions.xTickFormat);
    }

    svg.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0,${plot.bottom})`)
      .call(xAxis);

    svg.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(${plot.left},0)`)
      .call(d3.axisLeft(y).ticks(5));

    svg.append('text')
      .attr('class', 'axis-label')
      .attr('x', (plot.left + plot.right) / 2)
      .attr('y', plot.bottom + 48)
      .attr('text-anchor', 'middle')
      .text(xLabel);

    svg.append('text')
      .attr('class', 'axis-label')
      .attr('transform', `translate(${plot.left - 56},${(plot.top + plot.bottom) / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .text(yLabel);
  }

  async function drawLatLonMap(container, step, options) {
    const token = container.dataset.renderToken;
    const records = await loadGrid(options.path);
    if (container.dataset.renderToken !== token) return;

    const shell = createShell(container, step, 'map-chart');
    const width = 1080;
    const height = 620;
    const svg = createSvg(shell, width, height);
    addHeader(svg, options.title, options.subtitle);

    const plot = { left: 82, top: 102, right: 890, bottom: 520 };
    const x = d3.scaleLinear().domain([-180, 180]).range([plot.left, plot.right]);
    const y = d3.scaleLinear().domain([-90, 90]).range([plot.bottom, plot.top]);
    const lonStep = medianStep(records.map(d => d.lon));
    const latStep = medianStep(records.map(d => d.lat));

    const values = records.map(d => d.value).filter(Number.isFinite);
    let colorScale;
    let legendFormat;
    if (options.variable === 'pr') {
      const absValues = values.map(Math.abs).sort((a, b) => a - b);
      const limit = d3.quantile(absValues, 0.98) || d3.max(absValues) || 1;
      colorScale = d3.scaleDiverging(d3.interpolateBrBG).domain([-limit, 0, limit]).clamp(true);
      legendFormat = d => fmt1(d);
    } else {
      const max = Math.ceil((d3.quantile(values, 0.99) || d3.max(values) || 20) / 2) * 2;
      colorScale = d3.scaleSequential(d3.interpolateMagma).domain([0, max]).clamp(true);
      legendFormat = d => `${fmt0(d)}C`;
    }

    const clipId = `map-clip-${step}`;
    svg.append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', plot.left)
      .attr('y', plot.top)
      .attr('width', plot.right - plot.left)
      .attr('height', plot.bottom - plot.top);

    svg.append('rect')
      .attr('class', 'plot-frame')
      .attr('x', plot.left)
      .attr('y', plot.top)
      .attr('width', plot.right - plot.left)
      .attr('height', plot.bottom - plot.top);

    drawGrid(svg, x, y, plot);

    const cells = svg.append('g')
      .attr('clip-path', `url(#${clipId})`);

    cells.selectAll('rect')
      .data(records)
      .join('rect')
      .attr('class', 'data-mark map-cell')
      .attr('x', d => x(d.lon - lonStep / 2))
      .attr('y', d => y(d.lat + latStep / 2))
      .attr('width', d => Math.max(0.5, x(d.lon + lonStep / 2) - x(d.lon - lonStep / 2) + 0.2))
      .attr('height', d => Math.max(0.5, y(d.lat - latStep / 2) - y(d.lat + latStep / 2) + 0.2))
      .attr('fill', d => colorScale(d.value))
      .append('title')
      .text(d => `${signed(d.value, options.variable === 'pr' ? 2 : 1)} ${options.unit} at ${fmt1(d.lat)}, ${fmt1(d.lon)}`);

    drawAxes(svg, x, y, plot, 'Longitude', 'Latitude');

    if (options.variable === 'tas') {
      svg.append('g')
        .attr('class', 'chart-callout')
        .call(g => {
          g.append('line')
            .attr('x1', x(-125))
            .attr('y1', y(72))
            .attr('x2', x(-88))
            .attr('y2', y(82));
          g.append('text')
            .attr('x', x(-176))
            .attr('y', y(78))
            .text('Arctic amplification');
          g.append('text')
            .attr('x', x(-176))
            .attr('y', y(70))
            .attr('class', 'chart-callout-small')
            .text('strongest warming appears at high latitudes');
        });
    } else {
      svg.append('g')
        .attr('class', 'chart-callout')
        .call(g => {
          g.append('line')
            .attr('x1', x(78))
            .attr('y1', y(16))
            .attr('x2', x(104))
            .attr('y2', y(31));
          g.append('text')
            .attr('x', x(64))
            .attr('y', y(44))
            .text('Wet and dry shifts diverge');
          g.append('text')
            .attr('x', x(64))
            .attr('y', y(36))
            .attr('class', 'chart-callout-small')
            .text('precipitation is not one global story');
        });
    }

    drawContinuousLegend(svg, colorScale, {
      x: 930,
      y: 438,
      width: 112,
      height: 14,
      label: options.legend,
      format: legendFormat,
      id: options.variable,
      ticks: 4,
    });

    addSource(svg, 'CMIP6 model output, anomaly vs. 1995-2014 baseline');
  }

  function fmt0(value) {
    return d3.format('.0f')(value);
  }

  function drawLineChart(container, step, data) {
    const shell = createShell(container, step, 'line-chart');
    const width = 1080;
    const height = 620;
    const svg = createSvg(shell, width, height);
    addHeader(
      svg,
      'Global temperature futures diverge by emissions scenario',
      'Annual global mean temperature anomaly, 2015-2100'
    );

    const plot = { left: 82, top: 105, right: 858, bottom: 520 };
    const rows = data.timeseries
      .filter(d =>
        d.variable === 'tas' &&
        d.region === 'Global' &&
        d.year <= 2100 &&
        scenarioOrder.includes(d.scenario)
      )
      .sort((a, b) => a.year - b.year);
    const yMax = d3.max(rows, d => d.anomaly) || 1;
    const x = d3.scaleLinear().domain(d3.extent(rows, d => d.year)).range([plot.left, plot.right]);
    const y = d3.scaleLinear().domain([0, yMax * 1.08]).nice().range([plot.bottom, plot.top]);

    drawGrid(svg, x, y, plot);
    drawAxes(svg, x, y, plot, 'Year', 'Global temperature anomaly (C)', {
      xTickFormat: d3.format('d'),
      xTickValues: [2020, 2040, 2060, 2080, 2100],
      xTicks: 6,
    });

    svg.append('line')
      .attr('class', 'zero-line')
      .attr('x1', plot.left)
      .attr('x2', plot.right)
      .attr('y1', y(0))
      .attr('y2', y(0));

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.anomaly))
      .curve(d3.curveMonotoneX);

    const grouped = scenarioOrder.map(scenario => ({
      scenario,
      rows: rows.filter(d => d.scenario === scenario),
    }));

    svg.append('g')
      .selectAll('path')
      .data(grouped)
      .join('path')
      .attr('class', 'scenario-line')
      .attr('fill', 'none')
      .attr('stroke', d => scenarioPalette[d.scenario])
      .attr('stroke-width', 3)
      .attr('d', d => line(d.rows));

    grouped.forEach(group => {
      const last = group.rows[group.rows.length - 1];
      svg.append('circle')
        .attr('class', 'line-endpoint')
        .attr('cx', x(last.year))
        .attr('cy', y(last.anomaly))
        .attr('r', 4.5)
        .attr('fill', scenarioPalette[group.scenario]);
    });

    const endpoints = grouped.map(group => {
      const last = group.rows[group.rows.length - 1];
      return {
        scenario: group.scenario,
        value: last.anomaly,
        y: y(last.anomaly),
      };
    }).sort((a, b) => a.y - b.y);

    let lastY = plot.top - 18;
    endpoints.forEach(d => {
      d.labelY = Math.max(d.y, lastY + 24);
      d.labelY = Math.min(d.labelY, plot.bottom - 12);
      lastY = d.labelY;
    });

    svg.append('g')
      .attr('class', 'line-labels')
      .selectAll('g')
      .data(endpoints)
      .join('g')
      .each(function (d) {
        const g = d3.select(this);
        g.append('line')
          .attr('x1', plot.right + 4)
          .attr('x2', plot.right + 22)
          .attr('y1', d.y)
          .attr('y2', d.labelY)
          .attr('stroke', scenarioPalette[d.scenario])
          .attr('stroke-width', 1.5);
        g.append('text')
          .attr('x', plot.right + 28)
          .attr('y', d.labelY + 4)
          .attr('fill', scenarioPalette[d.scenario])
          .text(`${scenarioNames[d.scenario]}  ${fmt1(d.value)}C`);
      });

    addSource(svg, 'CMIP6 annual anomaly time series');
  }

  function drawBarChart(container, step, data) {
    const shell = createShell(container, step, 'bar-chart');
    const width = 1080;
    const height = 620;
    const svg = createSvg(shell, width, height);
    addHeader(
      svg,
      'Projected 2100 warming is uneven across regions',
      'Late-century temperature anomaly under SSP5-8.5'
    );

    const rows = data.summary
      .filter(d => d.variable === 'tas' && d.scenario === 'ssp585')
      .sort((a, b) => d3.descending(a.latecentury_anomaly, b.latecentury_anomaly));
    const plot = { left: 180, top: 104, right: 910, bottom: 520 };
    const x = d3.scaleLinear()
      .domain([0, (d3.max(rows, d => d.latecentury_anomaly) || 1) * 1.12])
      .nice()
      .range([plot.left, plot.right]);
    const y = d3.scaleBand()
      .domain(rows.map(d => d.region))
      .range([plot.top, plot.bottom])
      .padding(0.22);
    const color = d3.scaleLinear()
      .domain(d3.extent(rows, d => d.latecentury_anomaly))
      .range(['#df9a3c', '#9c2f45']);

    svg.append('g')
      .attr('class', 'chart-grid')
      .attr('transform', `translate(0,${plot.bottom})`)
      .call(d3.axisBottom(x).tickSize(-(plot.bottom - plot.top)).tickFormat('').ticks(5));

    svg.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0,${plot.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}C`));

    svg.append('g')
      .attr('class', 'chart-axis region-axis')
      .attr('transform', `translate(${plot.left},0)`)
      .call(d3.axisLeft(y).tickSize(0));

    svg.append('text')
      .attr('class', 'axis-label')
      .attr('x', (plot.left + plot.right) / 2)
      .attr('y', plot.bottom + 48)
      .attr('text-anchor', 'middle')
      .text('Temperature anomaly by 2091-2100 (C)');

    const bars = svg.append('g')
      .selectAll('g')
      .data(rows)
      .join('g')
      .attr('class', 'bar-row');

    bars.append('rect')
      .attr('class', 'data-mark region-bar')
      .attr('x', plot.left)
      .attr('y', d => y(d.region))
      .attr('width', d => x(d.latecentury_anomaly) - plot.left)
      .attr('height', y.bandwidth())
      .attr('fill', d => color(d.latecentury_anomaly))
      .append('title')
      .text(d => `${d.region}: ${fmt1(d.latecentury_anomaly)}C`);

    bars.append('text')
      .attr('class', 'bar-value')
      .attr('x', d => x(d.latecentury_anomaly) + 9)
      .attr('y', d => y(d.region) + y.bandwidth() / 2 + 5)
      .text(d => `${fmt1(d.latecentury_anomaly)}C`);

    svg.append('g')
      .attr('class', 'chart-note')
      .call(g => {
        g.append('rect')
          .attr('x', 932)
          .attr('y', 122)
          .attr('width', 104)
          .attr('height', 116)
          .attr('rx', 8);
        g.append('text')
          .attr('x', 948)
          .attr('y', 150)
          .text('Regional');
        g.append('text')
          .attr('x', 948)
          .attr('y', 171)
          .text('exposure');
        g.append('text')
          .attr('class', 'chart-note-small')
          .attr('x', 948)
          .attr('y', 202)
          .text('same scenario,');
        g.append('text')
          .attr('class', 'chart-note-small')
          .attr('x', 948)
          .attr('y', 220)
          .text('different futures');
      });

    addSource(svg, 'CMIP6 regional summaries');
  }

  function drawScatter(container, step, data) {
    const shell = createShell(container, step, 'scatter-chart');
    const width = 1080;
    const height = 620;
    const svg = createSvg(shell, width, height);
    addHeader(
      svg,
      'Regions warm everywhere, but rainfall shifts differ',
      'Late-century temperature and precipitation anomalies under SSP5-8.5'
    );

    const grouped = d3.rollups(
      data.summary.filter(d => d.scenario === 'ssp585'),
      values => ({
        region: values[0].region,
        tas: values.find(d => d.variable === 'tas')?.latecentury_anomaly,
        pr: values.find(d => d.variable === 'pr')?.latecentury_anomaly,
      }),
      d => d.region
    ).map(([, value]) => value).filter(d => Number.isFinite(d.tas) && Number.isFinite(d.pr));

    const plot = { left: 98, top: 106, right: 862, bottom: 514 };
    const x = d3.scaleLinear()
      .domain([0, (d3.max(grouped, d => d.tas) || 1) * 1.12])
      .nice()
      .range([plot.left, plot.right]);
    const prExtent = d3.extent(grouped, d => d.pr);
    const prLimit = Math.max(Math.abs(prExtent[0] || 0), Math.abs(prExtent[1] || 0), 0.5) * 1.2;
    const y = d3.scaleLinear()
      .domain([-prLimit, prLimit])
      .nice()
      .range([plot.bottom, plot.top]);
    const color = d3.scaleDiverging(d3.interpolateBrBG).domain([-prLimit, 0, prLimit]);

    drawGrid(svg, x, y, plot);
    drawAxes(svg, x, y, plot, 'Temperature anomaly by 2091-2100 (C)', 'Precipitation anomaly (mm/day)');

    svg.append('line')
      .attr('class', 'zero-line')
      .attr('x1', plot.left)
      .attr('x2', plot.right)
      .attr('y1', y(0))
      .attr('y2', y(0));

    svg.append('text')
      .attr('class', 'quadrant-label')
      .attr('x', plot.left + 16)
      .attr('y', y(0) - 12)
      .text('wetter');
    svg.append('text')
      .attr('class', 'quadrant-label')
      .attr('x', plot.left + 16)
      .attr('y', y(0) + 24)
      .text('drier');

    const points = svg.append('g')
      .selectAll('g')
      .data(grouped)
      .join('g')
      .attr('class', 'scatter-point')
      .attr('transform', d => `translate(${x(d.tas)},${y(d.pr)})`);

    points.append('circle')
      .attr('class', 'data-mark')
      .attr('r', d => d.region === 'Arctic' ? 9 : 7)
      .attr('fill', d => color(d.pr))
      .append('title')
      .text(d => `${d.region}: ${fmt1(d.tas)}C, ${signed(d.pr, 2)} mm/day`);

    points.append('text')
      .attr('class', 'point-label')
      .attr('x', 12)
      .attr('y', 4)
      .text(d => d.region);

    drawContinuousLegend(svg, color, {
      x: 902,
      y: 438,
      width: 122,
      height: 14,
      label: 'Precip. anomaly',
      format: d => fmt1(d),
      id: 'scatter-pr',
      ticks: 3,
    });

    addSource(svg, 'CMIP6 regional summaries');
  }

  function drawHeatmap(container, step, data) {
    const shell = createShell(container, step, 'heatmap-chart');
    const width = 1080;
    const height = 620;
    const svg = createSvg(shell, width, height);
    addHeader(
      svg,
      'Regional warming accelerates through the century',
      'Decade averages under SSP5-8.5, excluding the global aggregate'
    );

    const tasRows = data.summary
      .filter(d => d.variable === 'tas' && d.scenario === 'ssp585')
      .sort((a, b) => d3.descending(a.latecentury_anomaly, b.latecentury_anomaly));
    const regions = tasRows.map(d => d.region);
    const decades = DECADE_LABELS;
    const source = data.timeseries.filter(d =>
      d.variable === 'tas' && d.scenario === 'ssp585' && regions.includes(d.region)
    );

    const cells = [];
    regions.forEach(region => {
      decades.forEach(label => {
        const { start, end } = parseDecade(label);
        const values = source
          .filter(d => d.region === region && d.year >= start && d.year <= end)
          .map(d => d.anomaly);
        cells.push({
          region,
          decade: label,
          value: d3.mean(values),
        });
      });
    });

    const plot = { left: 164, top: 108, right: 918, bottom: 512 };
    const x = d3.scaleBand().domain(decades).range([plot.left, plot.right]).padding(0.05);
    const y = d3.scaleBand().domain(regions).range([plot.top, plot.bottom]).padding(0.08);
    const color = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, d3.max(cells, d => d.value) || 1])
      .clamp(true);

    svg.append('g')
      .attr('class', 'chart-axis heatmap-x')
      .attr('transform', `translate(0,${plot.bottom})`)
      .call(d3.axisBottom(x).tickSize(0));

    svg.append('g')
      .attr('class', 'chart-axis region-axis')
      .attr('transform', `translate(${plot.left},0)`)
      .call(d3.axisLeft(y).tickSize(0));

    const cellGroups = svg.append('g')
      .selectAll('g')
      .data(cells)
      .join('g');

    cellGroups.append('rect')
      .attr('class', 'data-mark heat-cell')
      .attr('x', d => x(d.decade))
      .attr('y', d => y(d.region))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => color(d.value))
      .append('title')
      .text(d => `${d.region}, ${d.decade}: ${fmt1(d.value)}C`);

    cellGroups.append('text')
      .attr('class', 'heat-cell-value')
      .attr('x', d => x(d.decade) + x.bandwidth() / 2)
      .attr('y', d => y(d.region) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .text(d => fmt1(d.value));

    svg.append('text')
      .attr('class', 'axis-label')
      .attr('x', (plot.left + plot.right) / 2)
      .attr('y', plot.bottom + 58)
      .attr('text-anchor', 'middle')
      .text('Decade');

    drawContinuousLegend(svg, color, {
      x: 948,
      y: 438,
      width: 92,
      height: 14,
      label: 'Temp. anomaly',
      format: d => `${fmt0(d)}C`,
      id: 'heatmap-temp',
      ticks: 4,
    });

    addSource(svg, 'CMIP6 annual anomaly time series');
  }

  function renderFallback(container, message) {
    container.innerHTML = '';
    d3.select(container)
      .append('div')
      .attr('class', 'chart-error')
      .text(message);
  }

  async function renderStoryChart(step, container, data) {
    if (!container || !data) return;
    if (container.dataset.chartStep === String(step) && container.querySelector('svg')) return;

    const token = String(++renderCounter);
    container.dataset.renderToken = token;
    container.innerHTML = '<div class="chart-loading">Rendering D3 visualization...</div>';

    try {
      if (step === 1) {
        await drawLatLonMap(container, step, {
          path: 'data/processed/grids/ssp585_tas_latecentury.json',
          variable: 'tas',
          title: 'Projected temperature change by 2100 under SSP5-8.5',
          subtitle: 'Late-century warming relative to the 1995-2014 baseline',
          legend: 'Temperature anomaly',
          unit: 'C',
        });
      } else if (step === 2) {
        await drawLatLonMap(container, step, {
          path: 'data/processed/grids/ssp585_pr_latecentury.json',
          variable: 'pr',
          title: 'Projected precipitation change by 2100 under SSP5-8.5',
          subtitle: 'Late-century rainfall shifts relative to the 1995-2014 baseline',
          legend: 'Precipitation anomaly',
          unit: 'mm/day',
        });
      } else if (step === 3) {
        drawLineChart(container, step, data);
      } else if (step === 4) {
        drawBarChart(container, step, data);
      } else if (step === 5) {
        drawScatter(container, step, data);
      } else if (step === 6) {
        drawHeatmap(container, step, data);
      }
    } catch (err) {
      console.warn('Failed to render D3 story chart:', err);
      renderFallback(container, 'This visualization could not be rendered from data.');
    }
  }

  function renderEvidenceCharts(data) {
    const chartMap = [
      { id: 'evidence-line-chart', step: 3 },
      { id: 'evidence-region-chart', step: 4 },
      { id: 'evidence-risk-chart', step: 5 },
    ];

    chartMap.forEach(({ id, step }) => {
      const container = document.getElementById(id);
      if (container) {
        renderStoryChart(step, container, data);
      }
    });
  }

  window.renderStoryChart = renderStoryChart;
  window.renderEvidenceCharts = renderEvidenceCharts;
})();
