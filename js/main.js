/* ============================================================
   main.js — Entry point
   Data loading + Scrollama initialization
   ============================================================ */

(function () {
  'use strict';

  // ---- State ----
  let data = {
    timeseries: null,
    summary: null,
    worldTopo: null,
  };

  let dataLoaded = false;

  // ---- Data Loading ----
  async function loadAllData() {
    try {
      const [timeseries, summary, worldTopo] = await Promise.all([
        loadCSV('data/processed/cmip6_anomaly_timeseries.csv'),
        loadCSV('data/processed/cmip6_region_summary.csv'),
        loadJSON('data/processed/world-110m.json'),
      ]);

      data.timeseries = timeseries;
      data.summary = summary;
      data.worldTopo = worldTopo;

      dataLoaded = true;
      // Expose data globally for chart modules
      window.__CHART_DATA = { timeseries, summary, worldTopo };
      console.log(`✅ Loaded ${timeseries.length} time series rows, ${summary.length} summary rows, and world basemap.`);
    } catch (err) {
      console.warn('⚠️ Data loading failed — some features may be unavailable:', err.message);
    }
  }

  // ---- Scrollama Setup ----
  function initScrollama() {
<<<<<<< Updated upstream
    if (!document.querySelector('.step')) {
=======
    if (!document.querySelector('.step') || typeof scrollama !== 'function' || typeof updateVisualization !== 'function') {
>>>>>>> Stashed changes
      return;
    }

    const scroller = scrollama();

    scroller
      .setup({
        step: '.step',
        offset: 0.5,
        debug: false,
      })
      .onStepEnter((response) => {
        const step = parseInt(response.element.dataset.step, 10);
        updateVisualization(step);
      })
      .onStepExit((response) => {
        // Optional: handle exit if needed
      });

    // Handle resize
    window.addEventListener('resize', () => {
      scroller.resize();
    });

    console.log('✅ Scrollama initialized.');
  }

  // ---- Intersection Observer for Centered Interactive Viz ---- */
  function initInteractiveObserver() {
    const vizSection = document.getElementById('interactive-viz-section');
    if (!vizSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            initCenteredInteractiveVisualizations();
            // Once initialized, no need to observe further
            observer.unobserve(vizSection);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(vizSection);
  }

  // ---- Bootstrap ----
  async function init() {
    // Load data in the background
    await loadAllData();

<<<<<<< Updated upstream
    if (window.renderEvidenceCharts && window.__CHART_DATA) {
      window.renderEvidenceCharts(window.__CHART_DATA);
    }

    // Initialize Scrollama for legacy step-based views if present.
    if (document.querySelector('.step')) {
      initScrollama();
=======
    if (window.__CHART_DATA && window.renderEvidenceCharts) {
      await window.renderEvidenceCharts(window.__CHART_DATA);
    }

    // Initialize Scrollama only when the old step-based story exists
    initScrollama();

    if (document.querySelector('.step') && typeof updateVisualization === 'function') {
>>>>>>> Stashed changes
      updateVisualization(1);
    }

    // Watch for the centered interactive section
    initInteractiveObserver();

    console.log('🚀 Climate Futures Explorer ready.');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
