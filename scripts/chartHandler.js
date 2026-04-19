function resolveLabelMeta(labelText) {
  if (!labelText) return null;
  if (typeof labelText === 'object' && labelText.key) return labelText;
  if (typeof labelText === 'string') return { key: labelText };
  return null;
}

let crosshairPluginRegistered = false;
let enhancementPluginsRegistered = false;

function getCssVar(name, fallback = '#000') {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return hex || fallback;
}

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: getCssVar('--text', isDark ? '#fff' : '#000'),
    muted: getCssVar('--muted', '#888'),
    border: getCssVar('--border', '#ddd'),
    primary: getCssVar('--primary', '#3b7a57'),
    info: getCssVar('--info', '#2f6fb5'),
    success: getCssVar('--success', '#198b63'),
    warning: getCssVar('--pending', '#c38b21'),
    danger: getCssVar('--danger', '#c94f4f')
  };
}

const CITY_COORDS = {
  'Pune': { x: 30, y: 70 },
  'Nashik': { x: 25, y: 50 },
  'Nagpur': { x: 80, y: 40 },
  'Aurangabad': { x: 45, y: 55 },
  'Kolhapur': { x: 30, y: 85 },
  'Solapur': { x: 55, y: 80 },
  'Amravati': { x: 70, y: 45 },
  'Latur': { x: 60, y: 70 }
};

function ensureCrosshairPlugin() {
  if (crosshairPluginRegistered || typeof Chart === 'undefined') return;
  const crosshairPlugin = {
    id: 'crosshairLine',
    afterDraw(chart, args, options) {
      const tooltip = chart.tooltip;
      if (!tooltip || !tooltip.getActiveElements || !tooltip.getActiveElements().length) return;
      const activePoint = tooltip.getActiveElements()[0];
      if (!activePoint) return;
      const { ctx, chartArea } = chart;
      const x = activePoint.element.x;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.lineWidth = options?.lineWidth || 1;
      ctx.strokeStyle = options?.color || 'rgba(90, 209, 151, 0.6)';
      ctx.setLineDash(options?.dash || [4, 4]);
      ctx.stroke();
      ctx.restore();
    }
  };
  Chart.register(crosshairPlugin);
  crosshairPluginRegistered = true;
}

function getAllCharts() {
  const charts = [];
  document.querySelectorAll('canvas').forEach(canvas => {
    if (canvas && canvas.__chart) charts.push(canvas.__chart);
  });
  return charts;
}

function syncHover(sourceChart, activeEls = []) {
  if (!sourceChart || sourceChart.__syncing) return;
  const charts = getAllCharts().filter(c => c !== sourceChart);
  const hasActive = activeEls && activeEls.length;
  const targetIndex = hasActive ? activeEls[0].index : null;
  charts.forEach(chart => {
    if (!chart || !chart.data || !chart.data.labels) return;
    chart.__syncing = true;
    if (!hasActive || targetIndex == null || targetIndex >= chart.data.labels.length) {
      chart.setActiveElements([]);
      if (chart.tooltip) chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chart.update('none');
      chart.__syncing = false;
      return;
    }
    const elements = chart.data.datasets.map((_, datasetIndex) => ({
      datasetIndex,
      index: targetIndex
    }));
    chart.setActiveElements(elements);
    if (chart.tooltip) chart.tooltip.setActiveElements(elements, { x: 0, y: 0 });
    chart.update('none');
    chart.__syncing = false;
  });
}

function applyGlobalChartTheme() {
  if (typeof Chart === 'undefined') return;
  const colors = getThemeColors();

  Chart.defaults.color = colors.text;
  Chart.defaults.borderColor = colors.border;

  if (Chart.defaults.scale) {
    Chart.defaults.scale.grid = Chart.defaults.scale.grid || {};
    Chart.defaults.scale.grid.color = colors.border;
    Chart.defaults.scale.ticks = Chart.defaults.scale.ticks || {};
    Chart.defaults.scale.ticks.color = colors.muted;
  }

  // For Chart.js v3+
  if (Chart.defaults.scales) {
    const scales = Chart.defaults.scales;
    ['x', 'y'].forEach(axis => {
      if (!scales[axis]) scales[axis] = {};
      scales[axis].grid = scales[axis].grid || {};
      scales[axis].grid.color = colors.border;
      scales[axis].ticks = scales[axis].ticks || {};
      scales[axis].ticks.color = colors.muted;
    });
  }

  // Update existing charts
  getAllCharts().forEach(chart => {
    if (chart.options.scales) {
      Object.keys(chart.options.scales).forEach(key => {
        const scale = chart.options.scales[key];
        if (scale.grid) scale.grid.color = colors.border;
        if (scale.ticks) scale.ticks.color = colors.muted;
      });
    }
    chart.options.plugins = chart.options.plugins || {};
    if (chart.options.plugins.legend && chart.options.plugins.legend.labels) {
      chart.options.plugins.legend.labels.color = colors.text;
    }
    chart.update('none');
  });
}

function ensureEnhancementPlugins() {
  if (enhancementPluginsRegistered || typeof Chart === 'undefined') return;
  if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
  }
  if (typeof ChartZoom !== 'undefined') {
    Chart.register(ChartZoom);
  }
  if (typeof ChartAnnotation !== 'undefined') {
    Chart.register(ChartAnnotation);
  }
  applyGlobalChartTheme();
  enhancementPluginsRegistered = true;
}

function attachDownloadButton(canvas, labelText = 'Download PNG') {
  if (!canvas || !canvas.parentElement) return;
  const container = canvas.closest('.chart-body') || canvas.parentElement;
  if (!container || container.querySelector('.chart-download-btn')) return;
  container.style.position = container.style.position || 'relative';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chart-download-btn';
  btn.textContent = labelText;
  btn.addEventListener('click', () => {
    try {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${canvas.id || 'chart'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('Chart export failed', e);
    }
  });
  container.appendChild(btn);
}

function createGradient(ctx, area, colorTop, colorBottom) {
  if (!area) return colorTop;
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);
  return gradient;
}

function shouldShowDataLabel(ctx) {
  const total = ctx.chart?.data?.labels?.length || 0;
  if (total <= 10) return true;
  return ctx.dataIndex === total - 1;
}

function buildAvgAnnotation(values = [], label = 'Avg') {
  const nums = values.map(v => Number(v)).filter(v => !Number.isNaN(v));
  if (!nums.length) return null;
  const avg = nums.reduce((s, v) => s + v, 0) / nums.length;
  return {
    type: 'line',
    yMin: avg,
    yMax: avg,
    borderColor: 'rgba(90, 209, 151, 0.6)',
    borderWidth: 1,
    borderDash: [6, 6],
    label: {
      display: true,
      content: `${label}: ${avg.toFixed(1)}`,
      color: 'rgba(90, 209, 151, 0.9)',
      backgroundColor: 'rgba(15, 20, 26, 0.7)',
      position: 'end',
      padding: 4
    }
  };
}

function translateLabelMeta(meta) {
  if (!meta || !meta.key) return '';
  return typeof t === 'function' ? t(meta.key, meta.vars) : meta.key;
}

function translateLabels(labels = []) {
  return labels.map(label => (typeof t === 'function' ? t(label) : label));
}

function updateChartTranslations(chart) {
  if (!chart || !chart.__i18n) return;
  const meta = chart.__i18n;
  if (meta.labels) {
    chart.data.labels = translateLabels(meta.labels);
  }
  if (meta.datasetLabels && chart.data && chart.data.datasets) {
    chart.data.datasets.forEach((ds, idx) => {
      const labelMeta = meta.datasetLabels[idx];
      if (labelMeta) ds.label = translateLabelMeta(labelMeta);
    });
  }
  if (meta.yTitle && chart.options && chart.options.scales && chart.options.scales.y && chart.options.scales.y.title) {
    chart.options.scales.y.title.text = translateLabelMeta(meta.yTitle);
  }
  chart.update();
}

function refreshAllChartTranslations() {
  document.querySelectorAll('canvas').forEach(canvas => {
    if (canvas && canvas.__chart) {
      updateChartTranslations(canvas.__chart);
    }
  });
}

function renderBarChart(canvasId, labels = [], values = [], labelText = '') {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  ensureEnhancementPlugins();
  ensureCrosshairPlugin();
  if (canvas.__chart) {
    canvas.__chart.destroy();
  }
  const labelMeta = resolveLabelMeta(labelText);
  const displayLabel = labelMeta ? translateLabelMeta(labelMeta) : '';
  const displayLabels = translateLabels(labels);
  const isCurrency = /₹|Commission|Amount|Earnings/i.test(labelMeta ? labelMeta.key : labelText);
  const avgAnnotation = buildAvgAnnotation(values, typeof t === 'function' ? t('Avg') : 'Avg');
  canvas.__chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: displayLabels,
      datasets: [{
        label: displayLabel || (typeof t === 'function' ? t('Data') : 'Data'),
        data: values,
        backgroundColor: (ctx) => createGradient(ctx.chart.ctx, ctx.chart.chartArea, 'rgba(90, 209, 151, 0.7)', 'rgba(90, 209, 151, 0.15)'),
        borderColor: 'rgba(59, 122, 87, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      scales: { y: { beginAtZero: true } },
      interaction: { mode: 'index', intersect: false },
      onHover: (event, activeEls, chart) => syncHover(chart, activeEls),
      plugins: {
        legend: { display: !!labelText },
        crosshairLine: {},
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          },
          pan: { enabled: true, mode: 'x' }
        },
        annotation: avgAnnotation ? { annotations: { avg: avgAnnotation } } : {},
        datalabels: {
          display: shouldShowDataLabel,
          color: 'rgba(229, 231, 235, 0.85)',
          align: 'end',
          anchor: 'end',
          formatter: (val) => (isCurrency ? `₹${Number(val).toFixed(0)}` : `${val}`)
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const val = context.parsed.y;
              if (isCurrency) return `₹${Number(val).toFixed(2)}`;
              return `${val}`;
            }
          }
        }
      }
    }
  });
  attachDownloadButton(canvas, typeof t === 'function' ? t('Download PNG') : 'Download PNG');
  canvas.__chart.__i18n = {
    labels: labels.slice(),
    datasetLabels: labelMeta ? [labelMeta] : [],
    yTitle: null
  };
}

function renderLineChart(canvasId, labels = [], values = [], labelText = '') {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  ensureEnhancementPlugins();
  ensureCrosshairPlugin();
  if (canvas.__chart) canvas.__chart.destroy();
  const labelMeta = resolveLabelMeta(labelText);
  const displayLabel = labelMeta ? translateLabelMeta(labelMeta) : (typeof t === 'function' ? t('Trend') : 'Trend');
  const displayLabels = translateLabels(labels);
  const yTitleMeta = { key: '₹/kg' };
  const avgAnnotation = buildAvgAnnotation(values, typeof t === 'function' ? t('Avg') : 'Avg');
  canvas.__chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: displayLabels,
      datasets: [{
        label: displayLabel,
        data: values,
        borderColor: 'rgba(59, 122, 87, 1)',
        backgroundColor: (ctx) => createGradient(ctx.chart.ctx, ctx.chart.chartArea, 'rgba(90, 209, 151, 0.35)', 'rgba(90, 209, 151, 0.05)'),
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      scales: { y: { beginAtZero: true, title: { display: true, text: translateLabelMeta(yTitleMeta) } } },
      interaction: { mode: 'index', intersect: false },
      onHover: (event, activeEls, chart) => syncHover(chart, activeEls),
      plugins: {
        legend: { display: true },
        crosshairLine: {},
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          },
          pan: { enabled: true, mode: 'x' }
        },
        annotation: avgAnnotation ? { annotations: { avg: avgAnnotation } } : {},
        datalabels: {
          display: shouldShowDataLabel,
          color: 'rgba(229, 231, 235, 0.85)',
          align: 'top',
          anchor: 'end',
          formatter: (val) => `₹${Number(val).toFixed(0)}`
        },
        tooltip: {
          callbacks: {
            label: (context) => `₹${Number(context.parsed.y || 0).toFixed(2)}/${typeof t === 'function' ? t('kg') : 'kg'}`
          }
        }
      }
    }
  });
  attachDownloadButton(canvas, typeof t === 'function' ? t('Download PNG') : 'Download PNG');
  canvas.__chart.__i18n = {
    labels: labels.slice(),
    datasetLabels: labelMeta ? [labelMeta] : [],
    yTitle: yTitleMeta
  };
}

function renderMultiLineChart(canvasId, labels = [], datasets = [], options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  ensureEnhancementPlugins();
  ensureCrosshairPlugin();
  if (canvas.__chart) canvas.__chart.destroy();
  const yTitleMeta = { key: options.yTitle || '₹/kg' };
  const displayLabels = translateLabels(labels);
  const datasetLabels = datasets.map(ds => resolveLabelMeta(ds.label));
  const displayDatasets = datasets.map((ds, idx) => {
    const meta = datasetLabels[idx];
    const label = meta ? translateLabelMeta(meta) : (ds.label || '');
    return {
      ...ds,
      label,
      tension: ds.tension ?? 0.35,
      pointRadius: ds.pointRadius ?? 3,
      pointHoverRadius: ds.pointHoverRadius ?? 5,
      backgroundColor: ds.backgroundColor || ((ctx) => createGradient(ctx.chart.ctx, ctx.chart.chartArea, 'rgba(96, 165, 250, 0.28)', 'rgba(96, 165, 250, 0.05)'))
    };
  });
  const primaryValues = (datasets[0] && datasets[0].data) ? datasets[0].data : [];
  const avgAnnotation = buildAvgAnnotation(primaryValues, typeof t === 'function' ? t('Avg') : 'Avg');
  canvas.__chart = new Chart(canvas, {
    type: 'line',
    data: { labels: displayLabels, datasets: displayDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      scales: { y: { beginAtZero: true, title: { display: true, text: translateLabelMeta(yTitleMeta) } } },
      interaction: { mode: 'index', intersect: false },
      onHover: (event, activeEls, chart) => syncHover(chart, activeEls),
      plugins: {
        legend: { display: true },
        crosshairLine: {},
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          },
          pan: { enabled: true, mode: 'x' }
        },
        annotation: avgAnnotation ? { annotations: { avg: avgAnnotation } } : {},
        datalabels: {
          display: shouldShowDataLabel,
          color: 'rgba(229, 231, 235, 0.85)',
          align: 'top',
          anchor: 'end',
          formatter: (val) => `₹${Number(val).toFixed(0)}`
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const val = Number(context.parsed.y || 0).toFixed(2);
              const unit = typeof t === 'function' ? t('kg') : 'kg';
              return `₹${val}/${unit}`;
            }
          }
        }
      }
    }
  });
  attachDownloadButton(canvas, typeof t === 'function' ? t('Download PNG') : 'Download PNG');
  canvas.__chart.__i18n = {
    labels: labels.slice(),
    datasetLabels,
    yTitle: yTitleMeta
  };
}

function renderComparisonChart(canvasId, labels = [], datasets = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  ensureEnhancementPlugins();
  ensureCrosshairPlugin();
  if (canvas.__chart) canvas.__chart.destroy();
  const displayLabels = translateLabels(labels);
  const datasetLabels = datasets.map(ds => (ds && ds.label ? { key: ds.label } : null));
  const displayDatasets = datasets.map((ds, idx) => {
    if (!ds) return ds;
    const next = { ...ds };
    if (datasetLabels[idx]) next.label = translateLabelMeta(datasetLabels[idx]);
    return next;
  });
  const primaryValues = (datasets[0] && datasets[0].data) ? datasets[0].data : [];
  const avgAnnotation = buildAvgAnnotation(primaryValues, typeof t === 'function' ? t('Avg') : 'Avg');
  canvas.__chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: displayLabels, datasets: displayDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      scales: { y: { beginAtZero: true } },
      interaction: { mode: 'index', intersect: false },
      onHover: (event, activeEls, chart) => syncHover(chart, activeEls),
      plugins: {
        legend: { display: true },
        crosshairLine: {},
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x'
          },
          pan: { enabled: true, mode: 'x' }
        },
        annotation: avgAnnotation ? { annotations: { avg: avgAnnotation } } : {},
        datalabels: {
          display: shouldShowDataLabel,
          color: 'rgba(229, 231, 235, 0.85)',
          align: 'end',
          anchor: 'end'
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label || ''}: ${context.parsed.y}`
          }
        }
      }
    }
  });
  attachDownloadButton(canvas, typeof t === 'function' ? t('Download PNG') : 'Download PNG');
  canvas.__chart.__i18n = {
    labels: labels.slice(),
    datasetLabels,
    yTitle: null
  };
}

function getStatusCounts() {
  const listings = typeof getListings === 'function' ? getListings() : [];
  const statuses = ['Approved', 'Pending', 'Rejected', 'PurchaseRequested', 'Sold'];
  const counts = statuses.map(s => listings.filter(l => l.status === s).length);
  return { labels: statuses, counts };
}

function getOffersPerCity() {
  const offers = typeof getOffers === 'function' ? getOffers() : [];
  const cities = typeof ensureCities === 'function' ? ensureCities() : [];
  const counts = cities.map(city => offers.filter(o => {
    const listing = getListings().find(l => l.listingId === o.listingId);
    return listing && listing.city === city;
  }).length);
  return { labels: cities, counts };
}

function getAverageOfferVsListingPerCity() {
  const cities = typeof ensureCities === 'function' ? ensureCities() : [];
  const listings = typeof getListings === 'function' ? getListings() : [];
  const offers = typeof getOffers === 'function' ? getOffers() : [];
  const avgListing = cities.map(city => {
    const list = listings.filter(l => l.city === city);
    if (!list.length) return 0;
    return Math.round(list.reduce((s, l) => s + (Number(l.price) || 0), 0) / list.length);
  });
  const avgOffer = cities.map(city => {
    const listIds = listings.filter(l => l.city === city).map(l => l.listingId);
    const offs = offers.filter(o => listIds.includes(o.listingId));
    if (!offs.length) return 0;
    return Math.round(offs.reduce((s, o) => s + (Number(o.offeredPrice) || 0), 0) / offs.length);
  });
  return { labels: cities, avgListing, avgOffer };
}

function getApprovalsVsRejections() {
  const listings = typeof getListings === 'function' ? getListings() : [];
  const approved = listings.filter(l => l.status === 'Approved').length;
  const rejected = listings.filter(l => l.status === 'Rejected').length;
  return { labels: ['Approved', 'Rejected'], counts: [approved, rejected] };
}

function lazyRenderChart(canvasId, renderFn) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const isVisible = rect.top < window.innerHeight + 120 && rect.bottom > -120;
  if (isVisible) {
    renderFn();
    return;
  }
  if (typeof IntersectionObserver === 'undefined') {
    renderFn();
    return;
  }
  if (canvas.__lazyObserver) return;
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      canvas.__lazyObserver = null;
      renderFn();
    }
  }, { rootMargin: '150px' });
  canvas.__lazyObserver = observer;
  observer.observe(canvas);
}

function renderAllChartsForMiddleman() {
  try {
    const status = getStatusCounts();
    lazyRenderChart('middlemanChart', () => renderBarChart('middlemanChart', status.labels, status.counts, 'Listings by Status'));
  } catch (e) { }
  try {
    const transactions = typeof getTransactions === 'function' ? getTransactions() : [];
    const days = {};
    transactions.forEach(t => {
      const date = new Date(t.timestamp).toLocaleDateString();
      days[date] = (days[date] || 0) + t.commissionAmount;
    });
    const sortedDates = Object.keys(days).sort();
    lazyRenderChart('middlemanCommissionChart', () => renderBarChart('middlemanCommissionChart', sortedDates, sortedDates.map(d => days[d].toFixed(2)), 'Commission Earned (₹)'));
  } catch (e) { }
}

function renderAllChartsForBuyer(selectedCity) {
  try {
    const city = selectedCity || localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
    const crop = (typeof activeCropFilter !== 'undefined' && activeCropFilter) ? activeCropFilter : (typeof marketRateCropFilter !== 'undefined' ? marketRateCropFilter?.getSelectedValue?.() : null);
    const trend = computeTrend(city, crop, 30);
    const canvas = document.getElementById('buyerPriceChart');
    if (!canvas) return;
    if (!trend.sampleSize) {
      const parent = canvas.parentElement;
      if (parent) parent.innerHTML = typeof renderEmptyState === 'function' ? renderEmptyState('📉', 'No trend data yet', 'Complete some purchases to unlock trend insights.') : '<div class="muted">No trend data yet</div>';
      return;
    }
    const cropDisplay = crop && typeof renderCropWithMarathi === 'function' ? renderCropWithMarathi(crop) : crop;
    const label = city && crop ? { key: 'Crop in City (30d)', vars: { crop: cropDisplay, city } } : { key: '30-day Avg Sold Rate' };
    lazyRenderChart('buyerPriceChart', () => renderLineChart('buyerPriceChart', trend.labels, trend.values, label));
  } catch (e) { }
}

function renderDemandHeatmap(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  ensureEnhancementPlugins();
  if (canvas.__chart) canvas.__chart.destroy();

  const cities = typeof ensureCities === 'function' ? ensureCities() : Object.keys(CITY_COORDS);
  const listings = typeof getListings === 'function' ? getListings() : [];
  const offers = typeof getOffers === 'function' ? getOffers() : [];
  const transactions = typeof getTransactions === 'function' ? getTransactions() : [];
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const cityDemand = Object.fromEntries(cities.map(city => [city, 0]));
  const listingById = new Map(listings.map(l => [String(l.listingId || l.id || ''), l]));

  listings.forEach((listing) => {
    const city = listing?.city;
    if (!city || typeof cityDemand[city] === 'undefined') return;
    cityDemand[city] += listing.status === 'Approved' || listing.status === 'PurchaseRequested' ? 3 : 2;
  });

  offers.forEach((offer) => {
    const listing = listingById.get(String(offer?.listingId || ''));
    const city = listing?.city;
    if (!city || typeof cityDemand[city] === 'undefined') return;
    cityDemand[city] += offer.status === 'Accepted' || offer.status === 'Countered' ? 3 : 2;
  });

  transactions.forEach((txn) => {
    const city = txn?.city;
    if (!city || typeof cityDemand[city] === 'undefined') return;
    cityDemand[city] += 4;
  });

  let data = cities.map((city, idx) => {
    const coord = CITY_COORDS[city] || { x: 12 + (idx % 8) * 10, y: 20 + (idx % 6) * 12 };
    const intensity = Number(cityDemand[city] || 0);
    return {
      x: coord.x,
      y: coord.y,
      r: Math.min(30, Math.max(6, 6 + intensity * 1.2)),
      city,
      intensity
    };
  }).filter(d => d.intensity > 0);

  if (!data.length) {
    data = Object.entries(CITY_COORDS).slice(0, 6).map(([city, coord], idx) => ({
      x: coord.x,
      y: coord.y,
      r: 8 + (idx % 3) * 2,
      city,
      intensity: 2 + (idx % 4)
    }));
  }

  const maxIntensity = Math.max(...data.map(item => item.intensity), 1);
  const bubbleFill = (ratio) => {
    if (ratio > 0.75) return isDark ? 'rgba(74, 222, 128, 0.82)' : 'rgba(22, 163, 74, 0.72)';
    if (ratio > 0.45) return isDark ? 'rgba(45, 212, 191, 0.72)' : 'rgba(13, 148, 136, 0.62)';
    return isDark ? 'rgba(96, 165, 250, 0.64)' : 'rgba(37, 99, 235, 0.52)';
  };
  const bubbleStroke = (ratio) => {
    if (ratio > 0.75) return isDark ? '#86efac' : '#16a34a';
    if (ratio > 0.45) return isDark ? '#5eead4' : '#0f766e';
    return isDark ? '#93c5fd' : '#1d4ed8';
  };

  canvas.__chart = new Chart(canvas, {
    type: 'bubble',
    data: {
      datasets: [{
        label: typeof t === 'function' ? t('Market Demand') : 'Market Demand',
        data: data,
        backgroundColor: (ctx) => {
          const intensity = Number(ctx.raw?.intensity || 0);
          return bubbleFill(intensity / maxIntensity);
        },
        borderColor: (ctx) => {
          const intensity = Number(ctx.raw?.intensity || 0);
          return bubbleStroke(intensity / maxIntensity);
        },
        borderWidth: 1.4,
        hoverBorderWidth: 2.2,
        hoverRadius: (ctx) => Number(ctx.raw?.r || 8) + 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 8, right: 8, bottom: 8, left: 8 }
      },
      scales: {
        x: { display: false, min: 0, max: 100 },
        y: { display: false, min: 0, max: 100 }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          formatter: (value) => value?.intensity || '',
          color: isDark ? '#f0fdfa' : '#f8fafc',
          font: {
            family: "'Plus Jakarta Sans', sans-serif",
            weight: '800',
            size: 11
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const d = ctx.raw;
              return `${typeof t === 'function' ? t(d.city) : d.city}: ${d.intensity} ${typeof t === 'function' ? t('Signals') : 'Signals'}`;
            }
          }
        }
      },
      animation: {
        duration: 650,
        easing: 'easeOutQuart'
      }
    }
  });
}

function renderTopCropsTrend(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  ensureEnhancementPlugins();
  if (canvas.__chart) canvas.__chart.destroy();

  const crops = ['Alphonso Mango', 'Wheat', 'Onion', 'Soybean', 'Pomegranate'].slice(0, 5);
  const colors = [
    'rgba(255, 159, 64, 1)',
    'rgba(255, 205, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(153, 102, 255, 1)'
  ];

  const datasets = crops.map((crop, idx) => {
    const trend = computeTrend('', crop, 30);
    return {
      label: crop,
      data: trend.values,
      borderColor: colors[idx],
      backgroundColor: colors[idx].replace('1)', '0.1)'),
      tension: 0.3,
      pointRadius: 2
    };
  }).filter(ds => ds.data.some(v => v > 0));

  if (datasets.length === 0) return;

  const labels = computeTrend('', crops[0], 30).labels;

  renderMultiLineChart(canvasId, labels, datasets, { yTitle: '₹/kg' });
}

function renderTransactionVolume(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  ensureEnhancementPlugins();
  if (canvas.__chart) canvas.__chart.destroy();

  const txns = typeof getTransactions === 'function' ? getTransactions() : [];
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
  }

  const volumeByDay = new Array(7).fill(0);
  const now = Date.now();
  txns.forEach(t => {
    const ts = new Date(t.timestamp || t.createdAt || now).getTime();
    const daysAgo = Math.floor((now - ts) / 86400000);
    if (daysAgo >= 0 && daysAgo < 7) {
      volumeByDay[6 - daysAgo] += (Number(t.quantity) || 0);
    }
  });

  const labels = last7Days;
  const data = volumeByDay;

  const colors = getThemeColors();
  renderBarChart(canvasId, labels, data, {
    label: typeof t === 'function' ? t('Total Qty (kg)') : 'Total Qty (kg)',
    color: colors.info
  });
}

window.renderAllChartsForMiddleman = renderAllChartsForMiddleman;
window.renderAllChartsForBuyer = renderAllChartsForBuyer;
window.renderDemandHeatmap = renderDemandHeatmap;
window.renderTopCropsTrend = renderTopCropsTrend;
window.renderTransactionVolume = renderTransactionVolume;
window.refreshAllChartTranslations = refreshAllChartTranslations;

window.addEventListener('farmaLanguageChanged', () => {
  refreshAllChartTranslations();
});

window.addEventListener('farmaThemeChanged', () => {
  applyGlobalChartTheme();
  // Deep refresh for complex charts
  const trend = document.getElementById('farmerTrendChart');
  if (trend) renderTopCropsTrend('farmerTrendChart');
  const heat = document.getElementById('demandHeatmapChart');
  if (heat) renderDemandHeatmap('demandHeatmapChart');
  const vol = document.getElementById('transactionVolumeChart');
  if (vol) renderTransactionVolume('transactionVolumeChart');
});
