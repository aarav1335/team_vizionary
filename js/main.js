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

  // ---- Bootstrap ----
  async function init() {
    // Load data in the background
    await loadAllData();

    // Initialize Scrollama
    initScrollama();

    // Set initial visualization state
    updateVisualization(1);

    console.log('🚀 Climate Futures Explorer ready.');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
