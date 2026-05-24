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
 * Placeholder — will be fleshed out in Phase 3.
 */
function initInteractiveVisualizations() {
  const container = document.getElementById('viz-d3');
  container.innerHTML = '<p style="color:#4a5568; font-size:1.1rem;">Interactive D3 visualizations coming in Phase 3. Select a scenario above to explore.</p>';

  // TODO Phase 3: Initialize lineChart, barChart, scatterPlot, heatmap, choroplethMap
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
