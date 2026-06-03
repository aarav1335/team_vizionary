/* ============================================================
   scrollSections.js — Section trigger logic
   Maps scroll steps 1-6 to live D3 evidence charts.
   Interactive globe is in a separate centered section below.
   ============================================================ */

/**
 * Update the visualization based on the current scroll step.
 *
 * For steps 1-6: render the corresponding D3 chart in the sticky viz panel.
 * The interactive globe panel is a separate centered section below the scrolly.
 */
function updateVisualization(step) {
  const vizImg = document.getElementById('viz-img');
  const vizD3 = document.getElementById('viz-d3');

  // Update step indicator on body (for debugging / CSS hooks)
  document.body.dataset.currentStep = step;
  document.querySelectorAll('.step').forEach((stepEl) => {
    stepEl.classList.toggle('active', parseInt(stepEl.dataset.step, 10) === step);
  });

  // Prefer live D3 story charts. Keep the PNGs as a fallback if data loading fails.
  if (vizD3 && window.renderStoryChart && window.__CHART_DATA) {
    vizImg.style.display = 'none';
    vizD3.style.display = 'flex';
    window.renderStoryChart(step, vizD3, window.__CHART_DATA);
    return;
  }

  const imgSrc = getStepImage(step);
  if (imgSrc) {
    vizImg.src = imgSrc;
    vizImg.style.display = 'block';
    if (vizD3) {
      vizD3.style.display = 'none';
    }
  }
}

/**
 * Initialize all interactive D3 charts in the centered section.
 * Called once when the interactive section scrolls into view.
 */
function initCenteredInteractiveVisualizations() {
  const container = document.getElementById('viz-d3-centered');
  if (!container || container.dataset.initialized === 'true') return;
  container.dataset.initialized = 'true';
  container.innerHTML = '';

  // Create controls bar
  const controls = document.createElement('div');
  controls.className = 'map-controls';
  controls.innerHTML = `
    <div class="control-group">
      <span class="control-label">Scenario:</span>
      <div class="btn-group" id="scenario-buttons">
        <button class="btn btn-scenario active" data-scenario="ssp126">SSP1-2.6</button>
        <button class="btn btn-scenario" data-scenario="ssp245">SSP2-4.5</button>
        <button class="btn btn-scenario" data-scenario="ssp370">SSP3-7.0</button>
        <button class="btn btn-scenario" data-scenario="ssp585">SSP5-8.5</button>
      </div>
    </div>
    <div class="control-group">
      <span class="control-label">Variable:</span>
      <div class="btn-group" id="variable-buttons">
        <button class="btn btn-variable active" data-variable="tas">Temperature</button>
        <button class="btn btn-variable" data-variable="pr">Precipitation</button>
      </div>
    </div>
    <div class="control-group">
      <span class="control-label">Click a region</span>
      <span class="control-hint">to explore</span>
    </div>
    <div class="control-group control-group-slider">
      <span class="control-label">Time:</span>
      <input type="range" id="decade-slider" class="decade-slider" min="0" max="8" value="8" step="1">
      <span id="decade-label" class="decade-label">2091-2100</span>
      <button id="play-btn" class="btn btn-play" title="Auto-play through decades">▶</button>
    </div>
  `;

  // Create map container
  const mapDiv = document.createElement('div');
  mapDiv.className = 'choropleth-map-container';
  mapDiv.id = 'choropleth-map';

  container.appendChild(controls);
  container.appendChild(mapDiv);

  // Initialize the choropleth map
  const map = choroplethMap(mapDiv, {
    summary: window.__CHART_DATA?.summary,
    worldTopo: window.__CHART_DATA?.worldTopo,
  });

  // Wire up scenario buttons
  controls.querySelectorAll('.btn-scenario').forEach(btn => {
    btn.addEventListener('click', async () => {
      controls.querySelectorAll('.btn-scenario').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await map.updateScenario(btn.dataset.scenario);
    });
  });

  // Wire up variable buttons
  controls.querySelectorAll('.btn-variable').forEach(btn => {
    btn.addEventListener('click', async () => {
      controls.querySelectorAll('.btn-variable').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await map.updateVariable(btn.dataset.variable);
      // Reset slider to last decade after variable change
      const slider = document.getElementById('decade-slider');
      const label = document.getElementById('decade-label');
      if (slider) slider.value = 8;
      if (label) label.textContent = '2091-2100';
    });
  });

  // Wire up decade slider
  const decadeSlider = controls.querySelector('#decade-slider');
  const decadeLabelEl = controls.querySelector('#decade-label');
  if (decadeSlider) {
    decadeSlider.addEventListener('input', () => {
      const idx = parseInt(decadeSlider.value, 10);
      const label = DECADE_LABELS[idx] || '';
      if (decadeLabelEl) decadeLabelEl.textContent = label;
      if (map.updateDecade) map.updateDecade(idx);
    });
    decadeSlider.addEventListener('change', () => {
      // Stop auto-play if user manually changes slider
      if (map.stopPlayback && map.getState().isPlaying) {
        map.stopPlayback();
        updatePlayButton(false);
      }
    });
  }

  // Wire up play/pause button
  const playBtn = controls.querySelector('#play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (map.togglePlayback) {
        map.togglePlayback();
        updatePlayButton(map.getState().isPlaying);
      }
    });
  }

  // Helper to update play button icon
  function updatePlayButton(isPlaying) {
    if (playBtn) {
      playBtn.textContent = isPlaying ? '⏸' : '▶';
      if (isPlaying) {
        playBtn.classList.add('active');
      } else {
        playBtn.classList.remove('active');
      }
    }
  }

  // Sync slider when decade changes externally (e.g. auto-play)
  // Periodically check map state (lightweight polling)
  let lastDecadeIndex = 8;
  setInterval(() => {
    const st = map.getState();
    if (st.currentDecadeIndex !== lastDecadeIndex) {
      lastDecadeIndex = st.currentDecadeIndex;
      if (decadeSlider) decadeSlider.value = lastDecadeIndex;
      if (decadeLabelEl) decadeLabelEl.textContent = DECADE_LABELS[lastDecadeIndex] || '';
      updatePlayButton(st.isPlaying);
    }
  }, 200);

  // Store map reference for later use
  window.__choroplethMap = map;
}
