/* ============================================================
   scrollSections.js — Section trigger logic
   Maps scroll steps to visualization updates
   ============================================================ */

/**
 * Update the visualization based on the current scroll step.
 *
 * For steps 1–6: show the corresponding static PNG.
 * For step 7: hide the static image and show the interactive D3 panel.
 * For step 8 (takeaway): optional final D3 state.
 */
function updateVisualization(step) {
  const vizImg = document.getElementById('viz-img');
  const vizD3 = document.getElementById('viz-d3');

  // Update step indicator on body (for debugging / CSS hooks)
  document.body.dataset.currentStep = step;
  document.querySelectorAll('.step').forEach((stepEl) => {
    stepEl.classList.toggle('active', parseInt(stepEl.dataset.step, 10) === step);
  });

  if (isInteractiveStep(step)) {
    // Hide static image, show interactive D3
    vizImg.style.display = 'none';
    vizD3.style.display = 'flex';

    // Initialize D3 visualizations only once
    if (!window.d3Initialized) {
      window.d3Initialized = true;
      initInteractiveVisualizations();
    }

    // Optionally update D3 state based on step
    onInteractiveStep(step);
  } else {
    // Show the corresponding static image
    const imgSrc = getStepImage(step);
    if (imgSrc) {
      vizImg.src = imgSrc;
      vizImg.style.display = 'block';
      vizD3.style.display = 'none';
    }
  }
}

/**
 * Initialize all interactive D3 charts (called once on first interactive step).
 */
function initInteractiveVisualizations() {
  const container = document.getElementById('viz-d3');
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
    });
  });

  // Store map reference for later use
  window.__choroplethMap = map;
}

/**
 * Called on every interactive step transition.
 * @param {number} step - The current scroll step number
 */
function onInteractiveStep(step) {
  // TODO Phase 3: Animate D3 charts to reflect the current step context
  // Step 7: full exploration mode
  // Step 8: final annotated state
}
