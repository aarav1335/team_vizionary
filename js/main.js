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
    if (!document.querySelector('.step') || typeof scrollama !== 'function' || typeof updateVisualization !== 'function') {
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

  // ---- Intersection Observer for Sea Level Rise Section ---- */
  function initSeaLevelObserver() {
    var vizContainer = document.getElementById('viz-sea-level-rise');
    if (!vizContainer || typeof seaLevelRiseChart !== 'function') return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var chart = seaLevelRiseChart(vizContainer);
            window.__seaLevelChart = chart;
            observer.unobserve(vizContainer);
            console.log('🌊 Sea-level rise chart initialized.');
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(vizContainer);
  }

  // ---- Bootstrap ----
  async function init() {
    // Load data in the background
    await loadAllData();

    if (window.__CHART_DATA && window.renderEvidenceCharts) {
      await window.renderEvidenceCharts(window.__CHART_DATA);
    }

    // Initialize Scrollama only when the old step-based story exists
    initScrollama();

    if (document.querySelector('.step') && typeof updateVisualization === 'function') {
      updateVisualization(1);
    }

    // Watch for the centered interactive section
    initInteractiveObserver();

    // Watch for the sea-level rise section
    initSeaLevelObserver();

    console.log('🚀 Climate Futures Explorer ready.');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// SSP Tab switcher
document.querySelectorAll('.ssp-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.ssp-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.ssp-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById('panel-' + target).classList.add('active');
  });
});

document.querySelectorAll('.ssp-next-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.next;
    document.querySelector(`.ssp-tab[data-tab="${next}"]`).click();
  });
});
