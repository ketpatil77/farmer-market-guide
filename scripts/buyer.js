let ROLE_IDS = {};
let lastRenderCity = null;
let activeCropFilter = null;
const offerInputState = {}; // Store input values by listingId
let activeEditingListingId = null; // Track which listing is being edited
let buyerCitySearch = null;
let buyerCropFilter = null;
let marketRateCitySearch = null;
let marketRateCropFilter = null;
let suggestCitySearch = null;
let suggestCropFilter = null;
let renderBuyerListingsDebounce = null;
let renderAnalyticsDebounce = null;
let buyerNotificationFilter = 'all';
let demoTimerBuyer = null;
let buyerRefreshTimer = null;
let lastBuyerSignature = '';
const offerLocks = new Set();

function getUnitPreference() {
  try { return localStorage.getItem('unitPref') || 'kg'; } catch (e) { return 'kg'; }
}

function formatQuantityDisplay(qty, unit = 'kg') {
  const pref = getUnitPreference();
  const numeric = Number(qty) || 0;
  if (pref === 'quintal') {
    return `${(numeric / 100).toFixed(2)} q`;
  }
  return `${numeric} ${unit || 'kg'}`;
}
const BUTTON_DEFAULT_TEXT = new WeakMap();
let buyerTrendRange = '7';
let activeOrderId = null;
let buyerAvatarOpen = false;
let buyerSavedCache = null;
let buyerVoiceRecognizer = null;
let buyerVoiceActive = false;
let externalPriceCache = [];
let externalPriceError = '';
let externalPriceRefreshTimer = null;
let replayEventsCache = [];
const buyerAlertState = {};
const BUYER_EXTERNAL_THRESHOLD_PCT = 12;
const externalThresholdAlertState = {};
const BUYER_DERIVED_NOTIFICATIONS_READ_KEY_PREFIX = 'buyerDerivedNotificationsRead:v1:';

function emitBuyerUiMetric(taskId, eventType, metadata = {}, durationMs = null) {
  if (typeof emitUiMetric !== 'function' || !taskId || !eventType) return;
  emitUiMetric({
    role: 'buyer',
    task_id: taskId,
    event_type: eventType,
    duration_ms: typeof durationMs === 'number' ? durationMs : undefined,
    screen_id: 'buyer-dashboard',
    metadata
  });
}

function getCropDisplayName(name) {
  if (typeof renderCropWithMarathi === 'function') return renderCropWithMarathi(name);
  return name || '';
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function commodityTokenFromCrop(cropName) {
  const token = String(cropName || '').trim().toUpperCase();
  const map = {
    WHEAT: 'WHEAT',
    RICE: 'RICE',
    ONION: 'ONION',
    TOMATO: 'TOMATO',
    COTTON: 'COTTON',
    SOYBEAN: 'SOYBEAN',
    MAIZE: 'MAIZE'
  };
  return map[token] || token;
}

function cropFromCommodity(commodity) {
  const token = String(commodity || '').trim().toUpperCase();
  if (!token) return '';
  const map = {
    WHEAT: 'Wheat',
    RICE: 'Rice',
    ONION: 'Onion',
    TOMATO: 'Tomato',
    COTTON: 'Cotton',
    SOYBEAN: 'Soybean',
    MAIZE: 'Maize'
  };
  return map[token] || token.charAt(0) + token.slice(1).toLowerCase();
}

function showBuyerToast({ title, body = '', tone = 'info' } = {}) {
  const container = document.getElementById('buyerToastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const toneClass = tone === 'success' ? 'success' : tone === 'error' ? 'error' : tone === 'warn' ? 'warn' : '';
  toast.className = `toast ${toneClass}`.trim();
  toast.innerHTML = `
    <div style="font-weight:700;">${title || 'Notification'}</div>
    ${body ? `<div class="muted" style="font-size:12px;margin-top:4px;">${body}</div>` : ''}
  `;
  container.appendChild(toast);
  while (container.children.length > 4) {
    container.removeChild(container.firstElementChild);
  }
  setTimeout(() => {
    toast.remove();
  }, 4200);
}

function renderBuyerAlerts() {
  const container = document.getElementById('buyerAlertContainer');
  if (!container) return;
  const items = Object.keys(buyerAlertState)
    .filter(key => buyerAlertState[key] && buyerAlertState[key].active)
    .map(key => buyerAlertState[key]);
  if (!items.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = items.map(item => {
    const tone = item.tone || 'warn';
    const label = typeof t === 'function' ? t(item.messageKey || item.message || '') : (item.message || '');
    return `<div class="alert-banner ${tone === 'error' ? 'is-error' : tone === 'info' ? 'is-info' : ''}" data-alert-key="${item.key}" data-i18n="${item.messageKey || ''}">${label || item.message || ''}</div>`;
  }).join('');
}

function setBuyerAlert(key, message, tone = 'warn', messageKey = '') {
  if (!key) return;
  buyerAlertState[key] = { key, message, tone, active: true, messageKey };
  renderBuyerAlerts();
}

function clearBuyerAlert(key) {
  if (!key || !buyerAlertState[key]) return;
  buyerAlertState[key].active = false;
  renderBuyerAlerts();
}

function getListingSmartGuidance(listing, city, offeredPrice = null) {
  if (!listing || !city || typeof computePreferredMarketRatesToday !== 'function') return null;
  const rates = computePreferredMarketRatesToday(city, listing.name);
  if (!rates || !Number(rates.avg)) return null;
  const avg = Number(rates.avg);
  const fairMin = Number(rates.fairMin || (avg * 0.92));
  const fairMax = Number(rates.fairMax || (avg * 1.08));
  const askPrice = Number(listing.approvedPrice || listing.price || 0);
  const suggestedPrice = askPrice > 0
    ? clampValue(askPrice, fairMin, fairMax)
    : avg;
  const offerPrice = Number.isFinite(Number(offeredPrice)) && Number(offeredPrice) > 0
    ? Number(offeredPrice)
    : suggestedPrice;

  const diffPct = avg > 0 ? ((offerPrice - avg) / avg) * 100 : 0;
  let gradeType = 'good';
  let gradeLabel = 'Fair Deal';
  if (offerPrice > fairMax * 1.1) {
    gradeType = 'risk';
    gradeLabel = 'Overpriced';
  } else if (offerPrice > fairMax || offerPrice < fairMin) {
    gradeType = 'warning';
    gradeLabel = 'Needs Review';
  }

  const score = clampValue(Math.round(100 - Math.abs(diffPct) * 4), 10, 99);
  return {
    avg,
    fairMin,
    fairMax,
    suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
    gradeType,
    gradeLabel,
    score,
    source: rates.source || 'Market rates'
  };
}

function getDealQualityPill(guidance) {
  if (!guidance) return '';
  return `<span class="deal-quality-pill is-${guidance.gradeType}" data-deal-quality-pill>${guidance.gradeLabel} (${guidance.score}/100)</span>`;
}

function getActiveBuyerId() {
  const stored = (typeof getStoreValue === 'function' && typeof STORAGE_KEYS !== 'undefined')
    ? getStoreValue(STORAGE_KEYS.currentBuyerId)
    : (typeof localStorage !== 'undefined' && typeof STORAGE_KEYS !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.currentBuyerId)
      : null);
  const fallbackTxn = getTransactions().find(t => t && t.buyerId);
  const fallbackOffer = getOffers().find(o => o && o.buyerId);
  const id = ROLE_IDS.buyerId || stored || (fallbackTxn && fallbackTxn.buyerId) || (fallbackOffer && fallbackOffer.buyerId) || null;
  if (!ROLE_IDS.buyerId && id) ROLE_IDS.buyerId = id;
  return id;
}

function getBuyerOffers() {
  const buyerId = getActiveBuyerId();
  if (!buyerId) return [];
  return getOffers().filter(o => String(o.buyerId || '') === String(buyerId));
}

function getBuyerTransactions() {
  const buyerId = getActiveBuyerId();
  if (!buyerId) return [];
  return getTransactions().filter(t => String(t.buyerId || '') === String(buyerId));
}

function getBuyerDerivedNotificationsReadIds(buyerId) {
  if (!buyerId) return new Set();
  try {
    const stored = localStorage.getItem(`${BUYER_DERIVED_NOTIFICATIONS_READ_KEY_PREFIX}${buyerId}`);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    return new Set();
  }
}

function markBuyerDerivedNotificationsRead(notificationIds, buyerId = getActiveBuyerId()) {
  if (!buyerId || !Array.isArray(notificationIds) || !notificationIds.length) return false;
  const existing = getBuyerDerivedNotificationsReadIds(buyerId);
  const before = existing.size;
  notificationIds.forEach(id => {
    if (id) existing.add(String(id));
  });
  if (existing.size === before) return false;
  try {
    localStorage.setItem(`${BUYER_DERIVED_NOTIFICATIONS_READ_KEY_PREFIX}${buyerId}`, JSON.stringify(Array.from(existing)));
  } catch (e) { }
  return true;
}

function getBuyerSavedCrops() {
  const buyerId = getActiveBuyerId();
  if (!buyerId) return [];
  if (buyerSavedCache && buyerSavedCache.buyerId === buyerId) return buyerSavedCache.items;
  const all = readJson(STORAGE_KEYS.buyerSavedCrops, []);
  const items = Array.isArray(all) ? all.filter(i => String(i.buyerId || '') === String(buyerId)) : [];
  buyerSavedCache = { buyerId, items };
  return items;
}

function saveBuyerSavedCrops(items) {
  const buyerId = getActiveBuyerId();
  if (!buyerId) return;
  const all = readJson(STORAGE_KEYS.buyerSavedCrops, []);
  const others = Array.isArray(all) ? all.filter(i => String(i.buyerId || '') !== String(buyerId)) : [];
  const next = others.concat(items);
  writeJson(STORAGE_KEYS.buyerSavedCrops, next);
  buyerSavedCache = { buyerId, items };
}

function toggleSavedCrop(cropName, city = '') {
  if (!cropName) return;
  const items = getBuyerSavedCrops();
  const exists = items.find(i => i.crop === cropName);
  let next = [];
  if (exists) {
    next = items.filter(i => i.crop !== cropName);
  } else {
    next = items.concat([{ buyerId: getActiveBuyerId(), crop: cropName, city, savedAt: new Date().toISOString() }]);
  }
  saveBuyerSavedCrops(next);
  renderBuyerSavedItems();
}

function setButtonLoading(btn, label = null) {
  if (!btn) return;
  if (!BUTTON_DEFAULT_TEXT.has(btn)) BUTTON_DEFAULT_TEXT.set(btn, btn.textContent);
  btn.disabled = true;
  btn.classList.add('is-loading');
  const labelText = typeof t === 'function' ? t(label || 'Working...') : (label || 'Working...');
  btn.textContent = labelText;
}

function clearButtonLoading(btn) {
  if (!btn) return;
  const original = BUTTON_DEFAULT_TEXT.get(btn);
  btn.disabled = false;
  btn.classList.remove('is-loading');
  if (original) btn.textContent = original;
}

try {
  buyerTrendRange = localStorage.getItem('buyerTrendRange') || '7';
} catch (e) { }

window.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  const init = initAppData();

  // Check for data integrity issues
  if (init.versionMismatch) {
    // Silent: data was reset due to version mismatch.
  }

  ROLE_IDS = init.roles;
  window.debugOffers = () => {
    const listings = getListings();
    const offers = getOffers();
    const notifications = getNotifications();
    const buyerId = getActiveBuyerId();
    console.log('currentRole = buyer');
    console.log('currentRoleId =', buyerId || localStorage.getItem(STORAGE_KEYS.currentBuyerId));
    console.log('listings count =', listings.length, 'sample =', listings[0] || null);
    console.log('offers count =', offers.length, 'sample =', offers[0] || null);
    console.log('notifications count =', notifications.length, 'sample =', notifications[0] || null);
    const farmerId = ROLE_IDS.farmerId || localStorage.getItem(STORAGE_KEYS.currentFarmerId);
    const farmerOffers = offers.filter(o => o.farmerId === farmerId);
    console.log(`Offers for this farmerId = ${farmerOffers.length}`);
  };

  // Initialize searchable city selector
  buyerCitySearch = renderCitySearch('buyerCitySearchContainer', (city) => {
    localStorage.setItem(STORAGE_KEYS.buyerCity, city);
    renderBuyerListings();
    renderBuyerAnalytics();
    renderPurchaseHistory();
  });

  // Initialize crop filter
  buyerCropFilter = renderCropSearch('buyerCropFilterContainer', (cropName) => {
    activeCropFilter = cropName;
    renderBuyerListings();
    renderBuyerAnalytics();
  });

  const rangeSelect = document.getElementById('buyerTrendRangeSelect');
  if (rangeSelect) {
    rangeSelect.value = buyerTrendRange;
    rangeSelect.addEventListener('change', () => {
      buyerTrendRange = rangeSelect.value || '7';
      try { localStorage.setItem('buyerTrendRange', buyerTrendRange); } catch (e) { }
      renderBuyerAnalytics();
    });
  }

  // Initialize market rates selectors
  marketRateCitySearch = renderCitySearch('marketRateCityContainer', () => {
    try { computeAndDisplayMarketRatesV2(); } catch (err) { }
  });
  marketRateCropFilter = renderCropSearch('marketRateCropContainer', () => {
    try { computeAndDisplayMarketRatesV2(); } catch (err) { }
  });
  const scheduleMarketRateUpdate = (() => {
    let timer = null;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { computeAndDisplayMarketRatesV2(); } catch (err) { }
        refreshExternalPrices();
      }, 250);
    };
  })();
  if (marketRateCitySearch?.input) marketRateCitySearch.input.addEventListener('input', scheduleMarketRateUpdate);
  if (marketRateCropFilter?.input) marketRateCropFilter.input.addEventListener('input', scheduleMarketRateUpdate);

  // Initialize suggest rate selectors
  initSuggestRateControls();

  bindOfferButtons();
  bindBuyerActions();
  initBuyerNotificationsInteractions();
  initBuyerSavedItemsInteractions();
  const clearFiltersBtn = document.getElementById('clearBuyerFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      clearBuyerFilters();
    });
  }
  const viewRatesBtn = document.getElementById('viewRatesBtn');
  if (viewRatesBtn) {
    viewRatesBtn.addEventListener('click', () => {
      computeAndDisplayMarketRatesV2();
    });
  }
  const submitRateBtn = document.getElementById('submitCommunityRateBtn');
  if (submitRateBtn) {
    submitRateBtn.addEventListener('click', () => {
      submitCommunityRate();
    });
  }
  initVoiceQuickActions();
  initAdvancedInsightsToggle();
  initBuyerOrderModal();
  const refreshExternalBtn = document.getElementById('refreshExternalPricesBtn');
  if (refreshExternalBtn) {
    refreshExternalBtn.addEventListener('click', () => {
      refreshExternalPrices(true);
    });
  }
  const replayBtn = document.getElementById('replayEventsBtn');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      replayEventSequence();
    });
  }
  renderBuyerListings();
  renderBuyerAnalytics();
  renderBuyerOrders();
  renderPurchaseHistory();
  renderBuyerNotifications();
  renderBuyerInsights();
  renderBuyerSavedItems();
  try { computeAndDisplayMarketRatesV2(); } catch (err) { }
  refreshExternalPrices();
  refreshReplayEvents();
  bindRoleSwitchClearImage();
  window.renderBuyerListings = renderBuyerListings;
  initAvatarMenu();

  // Same-tab hook: community market rates update (storage event doesn't fire in same window)
  window.addEventListener('farmaCommunityMarketRateUpdated', (e) => {
    const detail = e && e.detail ? e.detail : {};
    refreshOfferHintsForCityCrop(detail.city, detail.crop);
    try { computeAndDisplayMarketRatesV2(); } catch (err) { }
    scheduleBuyerRefresh(true);
  });

  window.addEventListener('farmaSyncApplied', () => {
    scheduleBuyerRefresh(true);
  });
  window.addEventListener('farmaDataReset', () => {
    try { computeAndDisplayMarketRatesV2(); } catch (err) { }
    scheduleBuyerRefresh(true);
  });

  window.addEventListener('farmaMarketRatesUpdated', () => {
    try { computeAndDisplayMarketRatesV2(); } catch (err) { }
    scheduleBuyerRefresh(true);
  });

  window.addEventListener('farmaTransactionFinalized', () => {
    try { computeAndDisplayMarketRatesV2(); } catch (err) { }
    refreshExternalPrices();
    refreshReplayEvents();
    scheduleBuyerRefresh(true);
  });

  window.addEventListener('farmaNewListing', (e) => {
    const listingId = e?.detail?.listingId || '';
    showBuyerToast({
      title: t('New listing received'),
      body: listingId ? `Listing ${listingId}` : t('New listing received'),
      tone: 'info'
    });
    refreshReplayEvents();
  });

  window.addEventListener('farmaOfferCreated', (e) => {
    const offerId = e?.detail?.offerId || '';
    showBuyerToast({
      title: t('New offer received!'),
      body: offerId ? `Offer ${offerId}` : t('New offer received!'),
      tone: 'info'
    });
    refreshReplayEvents();
  });

  window.addEventListener('farmaOfferStatusChanged', (e) => {
    const status = e?.detail?.status || '';
    if (status === 'Rejected') {
      setBuyerAlert('offer-rejected', t('Offer rejected. Review latest negotiation status.'), 'warn', 'Offer rejected. Review latest negotiation status.');
    } else {
      clearBuyerAlert('offer-rejected');
    }
    refreshReplayEvents();
  });

  window.addEventListener('farmaSseConnected', () => {
    clearBuyerAlert('network-disconnected');
  });
  window.addEventListener('farmaSseError', () => {
    setBuyerAlert('network-disconnected', t('Network disconnected. Reconnecting realtime stream...'), 'error', 'Network disconnected. Reconnecting realtime stream...');
  });
  window.addEventListener('farmaSseGivenUp', () => {
    setBuyerAlert('network-disconnected', t('Network disconnected. Realtime in polling mode.'), 'error', 'Network disconnected. Realtime in polling mode.');
  });
  window.addEventListener('offline', () => {
    setBuyerAlert('network-disconnected', t('Network disconnected. Realtime in polling mode.'), 'error', 'Network disconnected. Realtime in polling mode.');
  });
  window.addEventListener('online', () => {
    clearBuyerAlert('network-disconnected');
  });

  window.addEventListener('farmaDemoSetupReady', () => {
    scheduleBuyerRefresh(true);
  });

  // Polling fallback for sync (real-time is server-based when available).
  setInterval(() => {
    // Only re-render if not actively editing an offer
    if (!activeEditingListingId) {
      scheduleBuyerRefresh();
    }
  }, 10000);

  if (externalPriceRefreshTimer) clearInterval(externalPriceRefreshTimer);
  externalPriceRefreshTimer = setInterval(() => {
    refreshExternalPrices();
    refreshReplayEvents();
  }, 60000);
});

window.addEventListener('beforeunload', () => {
  if (externalPriceRefreshTimer) {
    clearInterval(externalPriceRefreshTimer);
    externalPriceRefreshTimer = null;
  }
});

window.addEventListener('storage', (e) => {
  // Skip re-render if actively editing an offer
  if (activeEditingListingId) return;

  // Debounce re-renders on storage changes
  clearTimeout(renderBuyerListingsDebounce);
  renderBuyerListingsDebounce = setTimeout(() => {
    const newCity = localStorage.getItem(STORAGE_KEYS.buyerCity);
    if (e.key === STORAGE_KEYS.buyerCity) {
      lastRenderCity = null;
      if (buyerCitySearch) buyerCitySearch.input.value = newCity || '';
      scheduleBuyerRefresh(true);
    } else if (e.key === STORAGE_KEYS.listings || e.key === STORAGE_KEYS.offers || e.key === STORAGE_KEYS.transactions || e.key === STORAGE_KEYS.communityMarketRates || e.key === STORAGE_KEYS.dailyMarketRates || e.key === STORAGE_KEYS.buyerSavedCrops) {
      if (e.key === STORAGE_KEYS.buyerSavedCrops) buyerSavedCache = null;
      scheduleBuyerRefresh(true);
    }
  }, 300);
});

function clearBuyerFilters() {
  if (buyerCitySearch) buyerCitySearch.input.value = '';
  if (buyerCropFilter) buyerCropFilter.input.value = '';
  activeCropFilter = null;
  localStorage.removeItem(STORAGE_KEYS.buyerCity);
  scheduleBuyerRefresh(true);
}

function computeBuyerSignature() {
  const listings = getListings();
  const offers = getOffers();
  const txns = getTransactions();
  const notes = getNotifications();
  const communityRatesCount = readJson(STORAGE_KEYS.communityMarketRates, []).length;
  const savedCount = readJson(STORAGE_KEYS.buyerSavedCrops, []).length;
  const buyerId = getActiveBuyerId() || '';
  const statusCounts = listings.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  const offerCounts = offers.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const unread = notes.filter(n => !n.read).length;
  return [
    listings.length, offers.length, txns.length, notes.length,
    communityRatesCount,
    savedCount,
    JSON.stringify(statusCounts), JSON.stringify(offerCounts), unread,
    localStorage.getItem(STORAGE_KEYS.buyerCity) || '',
    buyerId
  ].join('|');
}

function scheduleBuyerRefresh(force = false) {
  if (buyerRefreshTimer) return;
  buyerRefreshTimer = setTimeout(() => {
    buyerRefreshTimer = null;
    if (!force && activeEditingListingId) return;
    const sig = computeBuyerSignature();
    if (!force && sig === lastBuyerSignature) return;
    lastBuyerSignature = sig;
    renderBuyerListings();
    renderBuyerAnalytics();
    renderBuyerOrders();
    renderPurchaseHistory();
    renderBuyerNotifications();
    renderBuyerInsights();
    renderBuyerSavedItems();
    try { computeAndDisplayMarketRatesV2(); } catch (err) { }
    if (externalPriceCache.length) {
      renderImpactSummary(externalPriceCache);
      refreshExplainableRecommendation(externalPriceCache).catch(() => { });
    }
  }, 120);
}

function bindOfferButtons() {
  const container = document.getElementById('approvedListingsContainer');
  if (!container) return;

  // Event delegation: attach one listener to container for all offer buttons
  container.removeEventListener('click', handleOfferAction);
  container.addEventListener('click', handleOfferAction);
  container.removeEventListener('click', handleSaveAction);
  container.addEventListener('click', handleSaveAction);

  // Attach input listeners to preserve values while typing
  container.removeEventListener('focus', trackInputFocus, true);
  container.removeEventListener('blur', untrackInputFocus, true);
  container.removeEventListener('input', preserveInputValue, true);

  container.addEventListener('focus', trackInputFocus, true);
  container.addEventListener('blur', untrackInputFocus, true);
  container.addEventListener('input', preserveInputValue, true);
}

function handleSaveAction(e) {
  const btn = e.target.closest('button[data-save-crop]');
  if (!btn) return;
  const crop = btn.getAttribute('data-save-crop');
  const city = btn.getAttribute('data-save-city') || '';
  toggleSavedCrop(crop, city);
  renderBuyerListings();
}

function trackInputFocus(e) {
  const input = e.target.closest('input[data-offer-price], input[data-offer-qty]');
  if (!input) return;

  const card = input.closest('[data-listing-card]');
  if (card) {
    const listingId = card.getAttribute('data-listing-id');
    if (listingId) {
      activeEditingListingId = listingId;
    }
  }
}

function untrackInputFocus(e) {
  const input = e.target.closest('input[data-offer-price], input[data-offer-qty]');
  if (!input) return;

  // Only clear active editing if all inputs in the card are blurred
  setTimeout(() => {
    const card = document.querySelector(`[data-listing-card][data-listing-id="${activeEditingListingId}"]`);
    if (card) {
      const hasFocus = card.querySelector('input[data-offer-price]:focus') || card.querySelector('input[data-offer-qty]:focus');
      if (!hasFocus) {
        activeEditingListingId = null;
      }
    } else {
      activeEditingListingId = null;
    }
  }, 50);
}

function preserveInputValue(e) {
  const input = e.target.closest('input[data-offer-price], input[data-offer-qty]');
  if (!input) return;

  const card = input.closest('[data-listing-card]');
  if (!card) return;

  const listingId = card.getAttribute('data-listing-id');
  if (!listingId) return;

  // Store input values in memory
  if (!offerInputState[listingId]) {
    offerInputState[listingId] = {};
  }

  if (input.hasAttribute('data-offer-price')) {
    offerInputState[listingId].price = input.value;
  } else if (input.hasAttribute('data-offer-qty')) {
    offerInputState[listingId].qty = input.value;
  }

  updateDealQualityInCard(card);
}

function updateDealQualityInCard(card) {
  if (!card) return;
  const listingId = card.getAttribute('data-listing-id');
  if (!listingId) return;
  const listing = getListings().find(l => String(l.listingId) === String(listingId));
  if (!listing) return;
  const city = (localStorage.getItem(STORAGE_KEYS.buyerCity) || listing.city || '').trim();
  if (!city) return;

  const priceInput = card.querySelector('input[data-offer-price]');
  const offeredPrice = Number(priceInput?.value || 0);
  const guidance = getListingSmartGuidance(listing, city, offeredPrice);
  if (!guidance) return;

  const qualityPill = card.querySelector('[data-deal-quality-pill]');
  if (qualityPill) {
    qualityPill.className = `deal-quality-pill is-${guidance.gradeType}`;
    qualityPill.textContent = `${guidance.gradeLabel} (${guidance.score}/100)`;
  }

  const guidanceText = card.querySelector('[data-smart-guidance-text]');
  if (guidanceText) {
    guidanceText.textContent = `Guide: ₹${guidance.suggestedPrice}/kg (fair range ₹${guidance.fairMin.toFixed(2)}-₹${guidance.fairMax.toFixed(2)})`;
  }
}

function handleOfferAction(e) {
  const clearFilterBtn = e.target.closest('button[data-clear-buyer-filters]');
  if (clearFilterBtn) {
    clearBuyerFilters();
    return;
  }

  const acceptCounterBtn = e.target.closest('button[data-counter-offer-accept]');
  if (acceptCounterBtn) {
    const offerId = acceptCounterBtn.getAttribute('data-counter-offer-accept');
    if (!offerId) return;
    acceptCounteredOffer(offerId, acceptCounterBtn);
    return;
  }

  const rejectCounterBtn = e.target.closest('button[data-counter-offer-reject]');
  if (rejectCounterBtn) {
    const offerId = rejectCounterBtn.getAttribute('data-counter-offer-reject');
    if (!offerId) return;
    rejectCounteredOffer(offerId, rejectCounterBtn);
    return;
  }

  const retryOfferBtn = e.target.closest('button[data-offer-retry]');
  if (retryOfferBtn) {
    const listingIdValue = retryOfferBtn.getAttribute('data-offer-retry');
    if (!listingIdValue) return;
    clearOfferAndRetry(listingIdValue);
    return;
  }

  const btn = e.target.closest('button[data-offer-action]');
  if (!btn) return;

  const card = btn.closest('[data-listing-card]');
  if (!card) {
    console.error('Could not find listing card');
    return;
  }

  const listingId = card.getAttribute('data-listing-id');
  if (!listingId) {
    console.error('No listing ID found');
    return;
  }
  const startedAt = Date.now();
  emitBuyerUiMetric('buyer_place_offer', 'task_start', { listingId });

  const priceInput = card.querySelector('input[data-offer-price]');
  const qtyInput = card.querySelector('input[data-offer-qty]');

  if (!priceInput) {
    console.error('Price input not found in card');
    return;
  }
  if (!qtyInput) {
    console.error('Quantity input not found in card');
    return;
  }

  const priceStr = priceInput.value.trim();
  const qtyStr = qtyInput.value.trim();

  if (!priceStr || priceStr === '') {
    emitBuyerUiMetric('buyer_place_offer', 'validation_error', { listingId, field: 'offeredPrice' });
    alert(t('Please enter an offer price'));
    priceInput.focus();
    return;
  }

  if (!qtyStr || qtyStr === '') {
    emitBuyerUiMetric('buyer_place_offer', 'validation_error', { listingId, field: 'quantity' });
    alert(t('Please enter a quantity'));
    qtyInput.focus();
    return;
  }

  const offeredPrice = Number(priceStr);
  const quantity = Number(qtyStr);

  if (isNaN(offeredPrice) || offeredPrice <= 0) {
    emitBuyerUiMetric('buyer_place_offer', 'validation_error', { listingId, field: 'offeredPrice' });
    alert(t('Offer price must be a valid number greater than 0'));
    priceInput.focus();
    return;
  }

  if (isNaN(quantity) || quantity <= 0) {
    emitBuyerUiMetric('buyer_place_offer', 'validation_error', { listingId, field: 'quantity' });
    alert(t('Quantity must be a valid number greater than 0'));
    qtyInput.focus();
    return;
  }

  // Idempotency guard
  if (offerLocks.has(listingId)) return;
  offerLocks.add(listingId);
  setButtonLoading(btn, 'Sending...');

  const buyerId = getActiveBuyerId();
  if (!buyerId) {
    emitBuyerUiMetric('buyer_place_offer', 'ui_error', { listingId, reason: 'buyer_missing' });
    alert(t('Unable to identify buyer. Please refresh the page.'));
    offerLocks.delete(listingId);
    clearButtonLoading(btn);
    return;
  }
  const res = recordOfferAndNotify({ listingId, buyerId, offeredPrice, quantity });
  if (res.error) {
    emitBuyerUiMetric('buyer_place_offer', 'ui_error', { listingId, reason: String(res.error || 'offer_failed') });
    alert('⚠️ ' + (typeof t === 'function' ? t(res.error) : res.error));
    offerLocks.delete(listingId);
    clearButtonLoading(btn);
    return;
  }
  const savedOffer = res && res.offer ? getOffers().find(o => o.offerId === res.offer.offerId) : null;
  if (res && res.offer && res.listing && savedOffer) {
    // Clear inputs from memory and DOM only after successful submission
    delete offerInputState[listingId];
    priceInput.value = '';
    qtyInput.value = '';
    activeEditingListingId = null;
    alert(t('Offer sent to farmer!'));
    emitBuyerUiMetric('buyer_place_offer', 'task_complete', { listingId, offerId: savedOffer.offerId }, Date.now() - startedAt);
    offerLocks.delete(listingId);
    // Re-render after successful offer
    renderBuyerListings();
    renderBuyerAnalytics();
  } else {
    emitBuyerUiMetric('buyer_place_offer', 'ui_error', { listingId, reason: 'unexpected_offer_response' });
    alert(t('Error sending offer. Please try again.'));
    console.error('recordOfferAndNotify failed:', res);
    offerLocks.delete(listingId);
    clearButtonLoading(btn);
  }
}

function renderBuyerListings() {
  const container = document.getElementById('approvedListingsContainer');
  if (!container) return;

  withLoadingSkeleton(container, 'grid', () => {
    container.classList.remove('listing-grid');

    // Do NOT render if a listing card has focused input
    if (activeEditingListingId) {
      const activeCard = container.querySelector(`[data-listing-id="${activeEditingListingId}"]`);
      if (activeCard) {
        const isFocused = activeCard.querySelector('input[data-offer-price]:focus') || activeCard.querySelector('input[data-offer-qty]:focus');
        if (isFocused) {
          return;
        }
      }
    }

    const city = localStorage.getItem(STORAGE_KEYS.buyerCity);
    lastRenderCity = city;

    if (!city) {
      container.innerHTML = renderEmptyState('📍', 'Select Your City', 'Choose your city above to discover approved produce listings from local farmers.');
      return;
    }

    const allListings = getListings();
    const allOffers = getOffers();
    const myOffersByListing = {};
    const buyerId = getActiveBuyerId();
    allOffers.filter(o => String(o.buyerId || '') === String(buyerId)).forEach(o => {
      if (!myOffersByListing[o.listingId]) myOffersByListing[o.listingId] = [];
      myOffersByListing[o.listingId].push(o);
    });
    Object.keys(myOffersByListing).forEach(listingId => {
      myOffersByListing[listingId].sort((a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0));
    });

    let approvedListings = allListings.filter(l => l.status === 'Approved' && l.city === city);

    // Apply crop filter if active
    if (activeCropFilter) {
      approvedListings = approvedListings.filter(l => l.name === activeCropFilter);
    }

    const soldListings = allListings.filter(l => isSoldListing(l));

    const inProgressListings = allListings.filter(l => {
      if (l.status !== 'PurchaseRequested') return false;
      if (l.city !== city) return false;
      const mine = myOffersByListing[l.listingId] || [];
      return mine.some(o => o.status === 'Accepted' || o.status === 'Countered' || o.status === 'OfferPlaced');
    }).filter(l => !activeCropFilter || l.name === activeCropFilter);

    // Find listings where buyer has finalized offer
    const myPurchasedListingIds = new Set(
      Object.entries(myOffersByListing)
        .filter(([_, offers]) => offers.some(o => o.status === 'Finalized'))
        .map(([listingId]) => listingId)
    );

    const purchasedByMe = soldListings.filter(l => myPurchasedListingIds.has(l.listingId));

    if (approvedListings.length === 0 && inProgressListings.length === 0 && purchasedByMe.length === 0) {
      const emptyMsg = activeCropFilter
        ? 'No listings match your filters. Try another city or crop.'
        : 'No listings available. Try another city or crop.';
      container.innerHTML = renderEmptyState('🌾', 'No Listings Available', emptyMsg);
      const helper = document.createElement('div');
      helper.style.marginTop = '10px';
      helper.innerHTML = `<button class="btn-secondary" type="button" data-clear-buyer-filters data-i18n="Try another city or crop">${t('Try another city or crop')}</button>`;
      container.appendChild(helper);
      return;
    }

    let html = '';

    if (approvedListings.length > 0) {
      html += `<div class="section-active" style="margin-bottom:40px;"><h3 style="color:var(--primary);margin-bottom:20px;" data-i18n="Available to Purchase">🔍 ${t('Available to Purchase')}</h3><div class="listing-grid">`;
      html += approvedListings.map(l => renderBuyerListing(l, myOffersByListing[l.listingId])).join('');
      html += `</div></div>`;
    }

    if (inProgressListings.length > 0) {
      html += `<div class="section-active" style="margin-bottom:40px;"><h3 style="color:var(--info);margin-bottom:20px;" data-i18n="Offers In Progress">⏳ ${t('Offers In Progress')}</h3><div class="listing-grid">`;
      html += inProgressListings.map(l => renderBuyerListing(l, myOffersByListing[l.listingId])).join('');
      html += `</div></div>`;
    }

    if (purchasedByMe.length > 0) {
      html += `<div class="section-completed"><h3 style="color:var(--success);margin-bottom:20px;" data-i18n="My Completed Purchases">✅ ${t('My Completed Purchases')}</h3><div class="purchase-grid">`;
      html += purchasedByMe.map(l => renderPurchasedListing(l, myOffersByListing[l.listingId])).join('');
      html += `</div></div>`;
    }

    container.innerHTML = html;

    // RESTORE INPUT VALUES after rendering
    container.querySelectorAll('[data-listing-card]').forEach(card => {
      const listingId = card.getAttribute('data-listing-id');
      if (!listingId || !offerInputState[listingId]) return;
      const priceInput = card.querySelector('input[data-offer-price]');
      const qtyInput = card.querySelector('input[data-offer-qty]');
      if (priceInput && offerInputState[listingId].price) {
        priceInput.value = offerInputState[listingId].price;
      }
      if (qtyInput && offerInputState[listingId].qty) {
        qtyInput.value = offerInputState[listingId].qty;
      }
      updateDealQualityInCard(card);
    });

    container.querySelectorAll('[data-listing-card]').forEach(card => {
      if (!offerInputState[card.getAttribute('data-listing-id') || '']) {
        updateDealQualityInCard(card);
      }
    });

    bindOfferButtons();
  });
}

function renderBuyerListing(l, myOffers) {
  // GUARD: Do not render if listing is already sold (hard lock on listing.status)
  if (isSoldListing(l)) {
    return '';
  }
  const displayName = getCropDisplayName(l.name);
  const saved = getBuyerSavedCrops().some(item => item.crop === l.name);
  const listingImage = getListingImage(l);
  const imageHtml = listingImage ? `<div class="listing-media"><img src="${listingImage}" alt="${displayName}" loading="lazy" decoding="async" data-fallback-image="1" /></div>` : '';

  const latestOffer = myOffers && myOffers.length ? myOffers[myOffers.length - 1] : null;
  let offerSection = '';

  if (latestOffer) {
    const offerStatus = latestOffer.status;
    const displayPrice = latestOffer.counteredPrice || latestOffer.offeredPrice;
    const displayQty = latestOffer.counteredQty || latestOffer.quantity;
    let statusColor = '#666';
    if (offerStatus === 'Accepted') statusColor = 'var(--success)';
    if (offerStatus === 'Rejected') statusColor = 'var(--danger)';
    if (offerStatus === 'Countered') statusColor = 'var(--pending)';
    if (offerStatus === 'Finalized') statusColor = 'var(--info)';

    const statusKey = offerStatus === 'Finalized' ? 'Completed Trade' : (offerStatus === 'OfferPlaced' ? 'Offer Placed' : offerStatus);
    const statusLabel = typeof t === 'function' ? t(statusKey) : statusKey;

    const actionButtons = offerStatus === 'Countered'
      ? `<div class="buyer-counter-actions"><button class="btn-primary" type="button" data-counter-offer-accept="${latestOffer.offerId}" data-i18n="Accept">✓ ${t('Accept')}</button><button class="btn-secondary" type="button" data-counter-offer-reject="${latestOffer.offerId}" data-i18n="Decline">✗ ${t('Decline')}</button></div>`
      : '';

    const retryButton = offerStatus === 'Rejected'
      ? `<button class="btn-primary buyer-retry-btn" type="button" data-offer-retry="${l.listingId}" data-i18n="Try Again">${t('Try Again')}</button>`
      : '';

    offerSection = `
      <div class="buyer-offer-box" style="border-left-color:${statusColor};">
        <strong style="color:${statusColor};">💬 <span data-i18n="Your Offer">${t('Your Offer')}</span>: <span data-i18n="${statusKey}">${statusLabel}</span></strong>
        <div class="buyer-offer-meta">💰 <span data-i18n="Price">${t('Price')}</span>: ₹${displayPrice} | 📦 <span data-i18n="Qty">${t('Qty')}</span>: ${formatQuantityDisplay(displayQty, l.unit)}</div>
        ${offerStatus === 'Countered' ? `<div class="buyer-counter-note" data-i18n="Farmer countered at {price} for {qty}" data-i18n-vars='${JSON.stringify({ price: `₹${latestOffer.counteredPrice}`, qty: displayQty })}'>${t('Farmer countered at {price} for {qty}', { price: `₹${latestOffer.counteredPrice}`, qty: displayQty })}</div>` : ''}
        ${actionButtons}
        ${retryButton}
      </div>
    `;
  } else {
    // Get saved input values from memory if they exist
    const savedPrice = offerInputState[l.listingId]?.price || '';
    const savedQty = offerInputState[l.listingId]?.qty || '';

    // Get market rate hint for this city + crop
    const city = localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
    const communityRate = city ? getAverageCommunityRate(city, l.name) : null;
    const rates = city ? getDailyMarketRates(city, l.name) : null;
    const avgRate = communityRate || (rates ? rates.avg : null);
    const guidance = city ? getListingSmartGuidance(l, city, savedPrice) : null;
    const unitLabel = typeof t === 'function' ? t('kg') : 'kg';
    const hintVars = { city, rate: avgRate ? `₹${avgRate}/${unitLabel}` : '' };
    const hintInner = avgRate
      ? `<em data-i18n="Today's average rate in {city}: {rate}" data-i18n-vars='${JSON.stringify(hintVars)}'>${t('Today\'s average rate in {city}: {rate}', hintVars)}</em>`
      : '';
    const hintHtml = `<div data-market-hint style="font-size:12px;color:var(--muted);margin-top:6px;padding:8px;background:rgba(0,0,0,0.03);border-radius:4px;${avgRate ? '' : 'display:none;'}">${hintInner}</div>`;
    const guidanceLine = guidance
      ? `Guide: ₹${guidance.suggestedPrice}/kg (fair range ₹${guidance.fairMin.toFixed(2)}-₹${guidance.fairMax.toFixed(2)})`
      : 'Guide unavailable until enough market data is collected.';
    const guidanceHtml = `
      <div class="listing-intel-box">
        <div class="listing-intel-row">
          <span class="muted">${guidance ? `Market avg: ₹${guidance.avg.toFixed(2)}/kg` : 'Market avg: --'}</span>
          ${guidance ? getDealQualityPill(guidance) : '<span class="deal-quality-pill is-warning" data-deal-quality-pill>Awaiting data</span>'}
        </div>
        <div class="listing-intel-row" style="margin-top:6px;">
          <span data-smart-guidance-text>${guidanceLine}</span>
        </div>
      </div>
    `;

    offerSection = `
      <div>
        <div class="offer-row">
          <input type="number" min="1" step="0.01" placeholder="Offer price (₹)" data-i18n-placeholder="Offer price (₹)" data-offer-price value="${savedPrice}" />
          <input type="number" min="0.1" step="0.1" placeholder="${t('Qty')} (${l.unit})" data-i18n-placeholder="Qty ({unit})" data-i18n-vars='${JSON.stringify({ unit: l.unit })}' data-offer-qty value="${savedQty}" />
          <button class="btn-primary" data-offer-action data-i18n="Send Offer">📤 ${t('Send Offer')}</button>
        </div>
        ${guidanceHtml}
        ${hintHtml}
      </div>
    `;
  }

  return `
    <div class="card listing-card" data-listing-card data-listing-id="${l.listingId}">
      <div class="listing-top">
        <div>
          <strong>🌾 ${displayName}</strong>
          <div class="muted" style="font-size:12px;">🏅 ${t('Quality')}: ${l.verifiedQuality || 'B'}</div>
          <div class="muted">📍 ${l.city} • 🏷️ ${l.category}</div>
        </div>
        <div class="listing-actions">
          <button class="listing-save-btn ${saved ? 'is-saved' : ''}" type="button" data-save-crop="${l.name}" data-save-city="${l.city}" data-i18n="${saved ? 'Saved' : 'Save'}">${saved ? t('Saved') : t('Save')}</button>
          ${(() => {
      const statusKey = l.status === 'PurchaseRequested' ? 'Buyer Interest' : l.status;
      return `<span class="badge status-${l.status.toLowerCase()}" data-i18n="${statusKey}">${t(statusKey)}</span>`;
    })()}
        </div>
      </div>
      ${renderStatusStepper(l.status)}
      <div class="listing-media-row${listingImage ? '' : ' no-image'}">
        ${imageHtml}
        <div class="listing-body">
          <div>👨‍🌾 <span data-i18n="Farmer">${t('Farmer')}</span>: ${l.farmerId}</div>
          <div>⭐ <span data-i18n="Quality">${t('Quality')}</span>: <span data-i18n="${l.verifiedQuality}">${t(l.verifiedQuality)}</span></div>
          <div>📦 <span data-i18n="Quantity">${t('Quantity')}</span>: ${formatQuantityDisplay(l.quantity, l.unit)}</div>
          <div>💰 <span data-i18n="Expected Price">${t('Expected Price')}</span>: ₹${l.approvedPrice || l.price}/${l.unit}</div>
        </div>
      </div>
      ${offerSection}
    </div>
  `;
}

function renderPurchasedListing(l, myOffers) {
  const transactionOffer = myOffers && myOffers.length ? myOffers.find(o => o.listingId === l.listingId && o.status === 'Finalized') : null;

  if (!transactionOffer) return '';

  const finalPrice = Number(transactionOffer.acceptedPrice || transactionOffer.counteredPrice || transactionOffer.offeredPrice || 0);
  const qty = Number(transactionOffer.quantity || transactionOffer.counteredQty || 0);
  const transactionAmount = finalPrice * qty;
  const displayName = getCropDisplayName(l.name);
  const listingImage = getListingImage(l);
  const imageHtml = listingImage ? `<div class="listing-media"><img src="${listingImage}" alt="${displayName}" loading="lazy" decoding="async" data-fallback-image="1" /></div>` : '';

  return `
    <div class="card listing-card sold-card relative" data-listing-card data-listing-id="${l.listingId}">
      <div class="trade-ribbon" data-i18n="Completed Trade">${t('Completed Trade')}</div>
      <div class="listing-top">
        <div>
          <strong>🌾 ${displayName}</strong>
          <div class="muted">📍 ${l.city} • 🏷️ ${l.category}</div>
        </div>
        <span class="badge status-${l.status.toLowerCase()}" style="background:var(--success);color:white;border-radius:6px;padding:6px 12px;font-weight:600;" data-i18n="Purchased">✅ ${t('Purchased')}</span>
      </div>
      ${renderStatusStepper(l.status)}
      <div class="listing-media-row${listingImage ? '' : ' no-image'}">
        ${imageHtml}
        <div class="listing-body">
          <div>👨‍🌾 <span data-i18n="Farmer">${t('Farmer')}</span>: ${l.farmerId}</div>
          <div>⭐ <span data-i18n="Quality">${t('Quality')}</span>: ${l.verifiedQuality}</div>
          <div>📦 <span data-i18n="Purchased Quantity">${t('Purchased Quantity')}</span>: ${formatQuantityDisplay(qty, l.unit)}</div>
          <div>💰 <span data-i18n="Final Price">${t('Final Price')}</span>: ₹${finalPrice.toFixed(2)}/${l.unit}</div>
          <div class="verified-badge" data-i18n="Verified by Middleman">✔ ${t('Verified by Middleman')}</div>
          <div style="background:rgba(76,175,80,0.1);padding:10px;border-radius:6px;margin-top:10px;color:var(--success);font-weight:600;" data-i18n="Transaction Completed • Total: {total}" data-i18n-vars='${JSON.stringify({ total: `₹${transactionAmount.toFixed(2)}` })}'>✓ ${t('Transaction Completed • Total: {total}', { total: `₹${transactionAmount.toFixed(2)}` })}</div>
        </div>
      </div>
    </div>
  `;
}

function renderBuyerListingsPreservingInputs() {
  const container = document.getElementById('approvedListingsContainer');
  if (!container) return;
  container.classList.remove('listing-grid');

  // Save current input values before re-render
  const savedInputs = {};
  document.querySelectorAll('[data-listing-card]').forEach(card => {
    const listingId = card.getAttribute('data-listing-id');
    const priceInput = card.querySelector('input[data-offer-price]');
    const qtyInput = card.querySelector('input[data-offer-qty]');
    if (listingId && priceInput && qtyInput) {
      savedInputs[listingId] = {
        price: priceInput.value,
        qty: qtyInput.value
      };
    }
  });

  const city = localStorage.getItem(STORAGE_KEYS.buyerCity);
  lastRenderCity = city;

  if (!city) {
    container.innerHTML = `<p class="muted" data-i18n="👇 Select a city above to view approved listings.">${typeof t === 'function' ? t('👇 Select a city above to view approved listings.') : '👇 Select a city above to view approved listings.'}</p>`;
    return;
  }
  const listings = getListings().filter(l => l.status === 'Approved' && l.city === city);
  if (!listings.length) {
    container.innerHTML = `<p class="muted" data-i18n="No approved listings in {city}." data-i18n-vars='${JSON.stringify({ city })}'>${typeof t === 'function' ? t('No approved listings in {city}.', { city }) : `No approved listings in ${city}.`}</p>`;
    return;
  }
  container.innerHTML = `<div class="listing-grid">` + listings.map(l => {
    const displayName = getCropDisplayName(l.name);
    const listingImage = getListingImage(l);
    const imageHtml = listingImage ? `<div class="listing-media"><img src="${listingImage}" alt="${displayName}" loading="lazy" decoding="async" data-fallback-image="1" /></div>` : '';
    return `
    <div class="card listing-card" data-listing-card data-listing-id="${l.listingId}">
      <div class="listing-top">
        <div>
          <strong>${displayName}</strong>
          <div class="muted">${l.city} • ${l.category}</div>
        </div>
        <span class="badge status-${l.status.toLowerCase()}" data-i18n="${l.status}">${typeof t === 'function' ? t(l.status) : l.status}</span>
      </div>
      <div class="listing-media-row${listingImage ? '' : ' no-image'}">
        ${imageHtml}
        <div class="listing-body">
          <div><span data-i18n="Farmer">${typeof t === 'function' ? t('Farmer') : 'Farmer'}</span>: ${l.farmerId}</div>
          <div><span data-i18n="Quality">${typeof t === 'function' ? t('Quality') : 'Quality'}</span>: <span data-i18n="${l.verifiedQuality}">${typeof t === 'function' ? t(l.verifiedQuality) : l.verifiedQuality}</span></div>
          <div><span data-i18n="Quantity">${typeof t === 'function' ? t('Quantity') : 'Quantity'}</span>: ${formatQuantityDisplay(l.quantity, l.unit)}</div>
          <div><span data-i18n="Expected Price">${typeof t === 'function' ? t('Expected Price') : 'Expected Price'}</span>: ₹${l.approvedPrice || l.price}/${l.unit}</div>
        </div>
      </div>
      <div class="offer-row">
        <input type="number" min="1" step="0.01" placeholder="${typeof t === 'function' ? t('Offer price (₹)') : 'Offer price (₹)'}" data-i18n-placeholder="Offer price (₹)" data-offer-price />
        <input type="number" min="0.1" step="0.1" placeholder="${typeof t === 'function' ? t('Qty ({unit})', { unit: l.unit }) : `Qty (${l.unit})`}" data-i18n-placeholder="Qty ({unit})" data-i18n-vars='${JSON.stringify({ unit: l.unit })}' data-offer-qty />
        <button class="btn-primary" data-offer-action data-i18n="Send Offer">${typeof t === 'function' ? t('Send Offer') : 'Send Offer'}</button>
      </div>
    </div>
  `;
  }).join('') + `</div>`;

  // Restore input values after re-render
  document.querySelectorAll('[data-listing-card]').forEach(card => {
    const listingId = card.getAttribute('data-listing-id');
    if (savedInputs[listingId]) {
      const priceInput = card.querySelector('input[data-offer-price]');
      const qtyInput = card.querySelector('input[data-offer-qty]');
      if (priceInput) priceInput.value = savedInputs[listingId].price;
      if (qtyInput) qtyInput.value = savedInputs[listingId].qty;
    }
    updateDealQualityInCard(card);
  });

  // Re-bind offer buttons after rendering new HTML
  bindOfferButtons();
}

function renderBuyerAnalytics() {
  let city = localStorage.getItem(STORAGE_KEYS.buyerCity);
  if (!city) {
    const cities = typeof ensureCities === 'function' ? ensureCities() : [];
    city = cities && cities.length ? cities[0] : 'Pune';
    if (city) {
      localStorage.setItem(STORAGE_KEYS.buyerCity, city);
      if (buyerCitySearch?.input) buyerCitySearch.input.value = city;
    }
  }
  renderBuyerOverview(city);
  renderBuyerMetrics(city);
  renderBuyerHeader(city);

  if (typeof lazyRenderChart === 'function') {
    lazyRenderChart('transactionVolumeChart', () => {
      if (typeof renderTransactionVolume === 'function') {
        renderTransactionVolume('transactionVolumeChart');
      }
    });
  } else if (typeof renderTransactionVolume === 'function') {
    renderTransactionVolume('transactionVolumeChart');
  }
}

function renderBuyerHeader(city) {
  const trendEl = document.getElementById('buyerHeaderTrend');
  const seasonEl = document.getElementById('buyerHeaderSeason');
  const tradesEl = document.getElementById('buyerHeaderTrades');
  const impactEl = document.getElementById('buyerHeaderImpact');
  if (!trendEl || !seasonEl || !tradesEl) return;
  const hotCrops = computeHotCropsToday();
  const topCity = computeTopCityToday();
  const highlight = hotCrops[0] ? `${getCropDisplayName(hotCrops[0].crop)} ↑` : (topCity ? `${topCity.city} ↑` : (typeof t === 'function' ? t('Stable') : 'Stable'));
  const season = getSeasonLabel();
  const since = Date.now() - (7 * 86400000);
  const trades = getTransactions().filter(t => new Date(t.timestamp || t.createdAt || 0).getTime() >= since).length;
  trendEl.textContent = highlight;
  seasonEl.textContent = season;
  tradesEl.textContent = String(trades);
  if (impactEl) {
    const buyerId = getActiveBuyerId();
    const history = buyerId ? getBuyerPurchaseHistory(buyerId) : [];
    const savings = history.reduce((sum, txn) => {
      if (!txn.marketAvg || !txn.finalPrice || !txn.quantity) return sum;
      return sum + ((Number(txn.marketAvg) - Number(txn.finalPrice)) * Number(txn.quantity || 0));
    }, 0);
    const speedHoursSaved = history.length * 2.5;
    const score = clampValue(Math.round((Math.max(0, savings) / 1000) + (history.length * 4) + speedHoursSaved), 0, 999);
    impactEl.textContent = String(score);
    impactEl.setAttribute('title', `Savings ₹${Math.max(0, savings).toFixed(0)} | Hours saved ${speedHoursSaved.toFixed(0)}`);
  }
}

function getSeasonLabel() {
  const month = new Date().getMonth();
  if (month >= 5 && month <= 9) return typeof t === 'function' ? t('Kharif season') : 'Kharif season';
  if (month >= 10 || month <= 1) return typeof t === 'function' ? t('Rabi season') : 'Rabi season';
  return typeof t === 'function' ? t('Zaid season') : 'Zaid season';
}

function renderBuyerOverview(city) {
  const cardsContainer = document.getElementById('buyerOverviewCards');
  const chartBody = document.querySelector('#buyerOverview .chart-card');

  if (!cardsContainer) return;

  withLoadingSkeleton(cardsContainer, 'grid', () => {
    const buyerId = getActiveBuyerId();
    const crop = activeCropFilter || marketRateCropFilter?.getSelectedValue?.() || '';
    const rangeDays = Number(buyerTrendRange || 7);
    const buyerTrend = buyerId
      ? computeTrend(city, crop, rangeDays, t => String(t.buyerId || '') === String(buyerId))
      : { labels: [], values: [], sampleSize: 0 };
    const marketTrend = computeTrend(city, crop, rangeDays, null);
    const buyerTxns = getBuyerTransactions().filter(t => {
      const matchCity = city ? t.city === city : true;
      const matchCrop = crop ? (t.cropName === crop || t.crop === crop || t.name === crop) : true;
      if (!matchCity || !matchCrop) return false;
      const diff = (Date.now() - new Date(t.timestamp || t.createdAt || Date.now()).getTime()) / 86400000;
      return diff <= rangeDays;
    });
    const buyerAvg = buyerTxns.length
      ? buyerTxns.reduce((s, t) => s + (Number(t.finalRate || t.finalPrice) || 0), 0) / buyerTxns.length
      : 0;
    const marketRates = crop ? computeMarketRatesV2(city, crop, rangeDays) : null;
    const marketAvg = marketRates?.avg || 0;
    const diff = marketAvg && buyerAvg ? (marketAvg - buyerAvg) : 0;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (typeof val === 'number') {
        if (typeof animateNumber === 'function') animateNumber(id, val);
        else el.textContent = val.toFixed(2);
      } else {
        el.textContent = val;
      }
    };
    setText('buyerPurchaseAvgValue', buyerAvg);
    setText('buyerMarketAvgValue', marketAvg);
    setText('buyerSavingsValue', Math.abs(diff));

    const trendMeta = document.getElementById('buyerTrendMeta');
    if (trendMeta) {
      const lastBuyer = buyerTrend.values.length ? buyerTrend.values[buyerTrend.values.length - 1] : null;
      const lastMarket = marketTrend.values.length ? marketTrend.values[marketTrend.values.length - 1] : null;
      const buyerVal = Number.isFinite(lastBuyer) ? `₹${Number(lastBuyer).toFixed(2)}/kg` : '—';
      const marketVal = Number.isFinite(lastMarket) ? `₹${Number(lastMarket).toFixed(2)}/kg` : '—';
      trendMeta.innerHTML = `
        <span class="chart-chip" data-i18n="Your Purchase Avg: {price}" data-i18n-vars='${JSON.stringify({ price: buyerVal })}'>${t('Your Purchase Avg: {price}', { price: buyerVal })}</span>
        <span class="chart-chip" data-i18n="Market Avg: {price}" data-i18n-vars='${JSON.stringify({ price: marketVal })}'>${t('Market Avg: {price}', { price: marketVal })}</span>
      `;
    }

    const savingsLabel = document.getElementById('buyerSavingsLabel');
    if (savingsLabel) {
      let key = 'Compare vs market average.';
      if (marketAvg && buyerAvg) {
        if (diff > 0) key = 'Saved per kg';
        else if (diff < 0) key = 'Above market per kg';
        else key = 'At market average';
      }
      savingsLabel.setAttribute('data-i18n', key);
      savingsLabel.textContent = typeof t === 'function' ? t(key) : key;
    }

    const canvas = document.getElementById('buyerPriceChart');
    const emptyEl = document.getElementById('buyerTrendEmpty');
    if (!canvas) return;
    const hasData = (buyerTrend.sampleSize || marketTrend.sampleSize);
    if (!hasData) {
      if (canvas.__chart) {
        canvas.__chart.destroy();
        canvas.__chart = null;
      }
      if (emptyEl) emptyEl.style.display = 'block';
      if (trendMeta) {
        trendMeta.innerHTML = `<span class="chart-chip" data-i18n="No trend data yet">${t('No trend data yet')}</span>`;
      }
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    const labels = buyerTrend.labels.length ? buyerTrend.labels : marketTrend.labels;
    const datasets = [
      {
        label: 'Your Purchase Price',
        data: buyerTrend.values,
        borderColor: 'rgba(82, 212, 122, 1)',
        backgroundColor: 'rgba(82, 212, 122, 0.18)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6
      },
      {
        label: 'Average Market Price',
        data: marketTrend.values,
        borderColor: 'rgba(46, 196, 255, 1)',
        backgroundColor: 'rgba(46, 196, 255, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ];

    if (typeof lazyRenderChart === 'function') {
      lazyRenderChart('buyerPriceChart', () => renderMultiLineChart('buyerPriceChart', labels, datasets, { yTitle: '₹/kg' }));
    } else {
      renderMultiLineChart('buyerPriceChart', labels, datasets, { yTitle: '₹/kg' });
    }
  });
}

function renderBuyerMetrics() {
  const container = document.querySelector('.stats-grid');
  if (!container) return;

  withLoadingSkeleton(container, 'stats', () => {
    const buyerId = getActiveBuyerId();
    const offers = getBuyerOffers();
    const txns = getBuyerTransactions();
    const activeOffers = offers.filter(o => ['OfferPlaced', 'Countered', 'Accepted'].includes(o.status));
    const activeTxns = txns.filter(t => getBuyerOrderStatusCode(t) !== 'Delivered');
    const activeOrders = activeOffers.length + activeTxns.length;
    const totalQty = txns.reduce((s, t) => s + (Number(t.quantity) || 0), 0);
    const history = buyerId ? getBuyerPurchaseHistory(buyerId) : [];
    const totalSavings = history.reduce((s, t) => {
      if (!t.marketAvg || !t.finalPrice || !t.quantity) return s;
      return s + ((t.marketAvg - t.finalPrice) * t.quantity);
    }, 0);
    const totalPurchases = history.length;
    const savingsPerKg = totalQty > 0 ? (totalSavings / totalQty) : 0;
    const cropSet = new Set();
    getBuyerSavedCrops().forEach(item => {
      if (item.crop) cropSet.add(item.crop);
    });
    if (!cropSet.size) {
      txns.forEach(t => {
        const crop = t.cropName || t.crop || t.name || '';
        if (crop) cropSet.add(crop);
      });
      offers.forEach(o => {
        const listing = getListings().find(l => l.listingId === o.listingId);
        if (listing?.name) cropSet.add(listing.name);
      });
    }

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (typeof animateNumber === 'function' && typeof val === 'number') {
        animateNumber(id, val);
      } else {
        el.textContent = val;
      }
    };
    setText('buyerActiveOrders', activeOrders);

    const totalPurchasedEl = document.getElementById('buyerTotalPurchased');
    if (totalPurchasedEl) {
      if (typeof animateNumber === 'function') animateNumber('buyerTotalPurchased', totalQty);
      else totalPurchasedEl.textContent = `${totalQty.toFixed(0)} kg`;
    }

    setText('buyerTotalSavings', totalSavings);
    setText('buyerFavoriteCrops', cropSet.size);
    setText('buyerTotalPurchasesWidget', totalPurchases);
    setText('buyerTotalSavingsWidget', totalSavings);
    setText('buyerSavingsPerKgWidget', savingsPerKg);
  });
}

function getBuyerOrderStatusCode(txn) {
  if (!txn) return 'Processing';
  if (txn.deliveryStatus) return txn.deliveryStatus;
  const ts = new Date(txn.timestamp || txn.createdAt || Date.now()).getTime();
  const days = (Date.now() - ts) / 86400000;
  if (days < 1.5) return 'Processing';
  if (days < 4) return 'Shipped';
  return 'Delivered';
}

function getBuyerOrderStatusClass(statusCode) {
  if (statusCode === 'Delivered') return 'delivered';
  if (statusCode === 'Shipped') return 'shipped';
  return 'processing';
}

function renderBuyerOrders() {
  const tbody = document.getElementById('buyerOrdersTableBody');
  const empty = document.getElementById('buyerOrdersEmpty');
  if (!tbody) return;

  withLoadingSkeleton(tbody, 'table', () => {
    const txns = getBuyerTransactions()
      .slice()
      .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));

    if (!txns.length) {
      tbody.innerHTML = `<tr><td colspan="7">${t('No orders yet')}</td></tr>`;
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = txns.map(txn => {
      const listing = getListings().find(l => l.listingId === txn.listingId) || {};
      const crop = getCropDisplayName(txn.cropName || listing.name || txn.crop || '');
      const statusCode = getBuyerOrderStatusCode(txn);
      const statusClass = getBuyerOrderStatusClass(statusCode);
      return `
        <tr>
          <td>${txn.transactionId || txn.id || '-'}</td>
          <td>${crop || '-'}</td>
          <td>${txn.farmerId || listing.farmerId || '-'}</td>
          <td>${formatQuantityDisplay(txn.quantity, listing.unit || 'kg')}</td>
          <td><span class="status-chip ${statusClass}">${typeof t === 'function' ? t(statusCode) : statusCode}</span></td>
          <td>₹${Number(txn.totalAmount || 0).toFixed(2)}</td>
          <td>
            <button class="btn-secondary" data-order-view="${txn.transactionId || txn.id || ''}" type="button" data-i18n="View Details">${typeof t === 'function' ? t('View Details') : 'View Details'}</button>
            <button class="btn" data-order-edit="${txn.transactionId || txn.id || ''}" type="button" data-i18n="Edit">${typeof t === 'function' ? t('Edit') : 'Edit'}</button>
          </td>
        </tr>`;
    }).join('');
  });
  bindBuyerOrdersTable();
}

function bindBuyerOrdersTable() {
  const tbody = document.getElementById('buyerOrdersTableBody');
  if (!tbody) return;
  tbody.removeEventListener('click', handleBuyerOrderAction);
  tbody.addEventListener('click', handleBuyerOrderAction);
}

function updateOrderStatus(orderId, status) {
  const transactions = getTransactions();
  const txn = transactions.find(t => String(t.transactionId || t.id) === String(orderId));
  if (!txn) return false;
  txn.deliveryStatus = status;
  saveTransactions(transactions);
  return true;
}

async function handleBuyerOrderAction(e) {
  const viewBtn = e.target.closest('[data-order-view]');
  const editBtn = e.target.closest('[data-order-edit]');
  if (viewBtn) {
    const orderId = viewBtn.getAttribute('data-order-view');
    if (!orderId) return;
    openBuyerOrderModal(orderId);
    return;
  }
  if (editBtn) {
    const orderId = editBtn.getAttribute('data-order-edit');
    if (!orderId) return;
    emitBuyerUiMetric('buyer_update_order_status', 'task_start', { orderId });
    const nextValue = typeof farmaPrompt === 'function'
      ? await farmaPrompt(t('Update status: Processing, Shipped, Delivered'), { defaultValue: 'Processing' })
      : null;
    const next = typeof nextValue === 'string' ? nextValue.trim() : '';
    if (!next) {
      emitBuyerUiMetric('buyer_update_order_status', 'abandon', { orderId });
      return;
    }
    if (updateOrderStatus(orderId, next)) {
      emitBuyerUiMetric('buyer_update_order_status', 'task_complete', { orderId, status: next });
      renderBuyerOrders();
    } else {
      emitBuyerUiMetric('buyer_update_order_status', 'ui_error', { orderId, status: next });
    }
  }
}

function openBuyerOrderModal(orderId) {
  const modal = document.getElementById('buyerOrderModal');
  const body = document.getElementById('buyerOrderModalBody');
  const select = document.getElementById('buyerOrderStatusSelect');
  if (!modal || !body) return;
  const txn = getTransactions().find(t => String(t.transactionId || t.id) === String(orderId));
  if (!txn) return;
  const listing = getListings().find(l => l.listingId === txn.listingId) || {};
  const crop = getCropDisplayName(txn.cropName || listing.name || txn.crop || '');
  const statusCode = getBuyerOrderStatusCode(txn);
  const baseline = Number(listing.price || txn.marketAvg || 0);
  const paid = Number(txn.finalRate || txn.finalPrice || listing.price || 0);
  const qtyNum = Number(txn.quantity || listing.quantity || 0);
  const savings = baseline > 0 ? (baseline - paid) * qtyNum : 0;
  const savingsPct = baseline > 0 ? ((baseline - paid) / baseline) * 100 : 0;
  activeOrderId = orderId;
  body.innerHTML = `
    <div class=\"detail-grid\">
      <div><strong data-i18n=\"Order ID\">${typeof t === 'function' ? t('Order ID') : 'Order ID'}</strong>: ${txn.transactionId || txn.id}</div>
      <div><strong data-i18n=\"Crop\">${typeof t === 'function' ? t('Crop') : 'Crop'}</strong>: ${crop || '-'}</div>
      <div><strong data-i18n=\"Farmer/Seller\">${typeof t === 'function' ? t('Farmer/Seller') : 'Farmer/Seller'}</strong>: ${txn.farmerId || listing.farmerId || '-'}</div>
      <div><strong data-i18n=\"City\">${typeof t === 'function' ? t('City') : 'City'}</strong>: ${txn.city || listing.city || '-'}</div>
      <div><strong data-i18n=\"Quantity\">${typeof t === 'function' ? t('Quantity') : 'Quantity'}</strong>: ${formatQuantityDisplay(txn.quantity, listing.unit || 'kg')}</div>
      <div><strong data-i18n=\"Price per kg\">${typeof t === 'function' ? t('Price per kg') : 'Price per kg'}</strong>: ₹${Number(txn.finalRate || txn.finalPrice || 0).toFixed(2)}</div>
      <div><strong data-i18n=\"Total Cost\">${typeof t === 'function' ? t('Total Cost') : 'Total Cost'}</strong>: ₹${Number(txn.totalAmount || 0).toFixed(2)}</div>
      <div><strong data-i18n=\"Status\">${typeof t === 'function' ? t('Status') : 'Status'}</strong>: ${typeof t === 'function' ? t(statusCode) : statusCode}</div>
      <div><strong data-i18n=\"Date\">${typeof t === 'function' ? t('Date') : 'Date'}</strong>: ${new Date(txn.timestamp || txn.createdAt || Date.now()).toLocaleString()}</div>
    </div>
    <div style="margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:12px;background:rgba(90,209,151,0.08);">
      <div style="font-weight:700;">${typeof t === 'function' ? t('Savings Breakdown') : 'Savings Breakdown'}</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;font-size:13px;">
        <span>Baseline: ₹${baseline.toFixed(2)}</span>
        <span>Paid: ₹${paid.toFixed(2)}</span>
        <span>Qty: ${formatQuantityDisplay(qtyNum, listing.unit || 'kg')}</span>
        <span style="color:${savings >= 0 ? 'var(--success)' : 'var(--danger)'};">${savings >= 0 ? 'Saved' : 'Extra'}: ₹${Math.abs(savings).toFixed(2)} (${savingsPct.toFixed(1)}%)</span>
      </div>
    </div>
  `;
  if (select) select.value = statusCode;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeBuyerOrderModal() {
  const modal = document.getElementById('buyerOrderModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  activeOrderId = null;
}

function updateBuyerOrderStatus(orderId, status) {
  const txns = getTransactions();
  const txn = txns.find(t => String(t.transactionId || t.id) === String(orderId));
  if (!txn) return null;
  txn.deliveryStatus = status;
  txn.updatedAt = new Date().toISOString();
  saveTransactions(txns);
  return txn;
}

function initBuyerOrderModal() {
  const modal = document.getElementById('buyerOrderModal');
  if (!modal) return;
  const closeButtons = modal.querySelectorAll('[data-close-modal]');
  const saveBtn = document.getElementById('buyerOrderSaveBtn');
  const select = document.getElementById('buyerOrderStatusSelect');

  closeButtons.forEach(btn => btn.addEventListener('click', () => closeBuyerOrderModal()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeBuyerOrderModal();
  });
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (!activeOrderId || !select) return;
      updateBuyerOrderStatus(activeOrderId, select.value);
      closeBuyerOrderModal();
      renderBuyerOrders();
      renderPurchaseHistory();
    });
  }
}

function bindBuyerActions() {
  const viewMarketBtn = document.getElementById('viewMarketBtn');
  const trackOrdersBtn = document.getElementById('trackOrdersBtn');
  if (viewMarketBtn) {
    viewMarketBtn.addEventListener('click', () => {
      const section = document.getElementById('buyerListingsSection');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (trackOrdersBtn) {
    trackOrdersBtn.addEventListener('click', () => {
      const section = document.getElementById('buyerOrdersSection');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function setVoiceQuickStatus(message) {
  const statusEl = document.getElementById('voiceQuickActionStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
}

function handleVoiceQuickTranscript(transcript) {
  const normalized = String(transcript || '').toLowerCase().trim();
  if (!normalized) return;

  if (normalized.includes('view market')) {
    document.getElementById('buyerListingsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setVoiceQuickStatus('Opened market listings.');
    return;
  }

  if (normalized.includes('track order')) {
    document.getElementById('buyerOrdersSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setVoiceQuickStatus('Opened your orders.');
    return;
  }

  const cities = (typeof ensureCities === 'function' ? ensureCities() : []).map(c => String(c || '').trim()).filter(Boolean);
  const crops = (typeof getCrops === 'function' ? getCrops() : []).map(c => String(c?.english || '').trim()).filter(Boolean);
  const cityMatch = cities.find(city => normalized.includes(city.toLowerCase()));
  const cropMatch = crops.find(crop => normalized.includes(crop.toLowerCase()));

  if (normalized.includes('price') || normalized.includes('rate')) {
    if (cityMatch && marketRateCitySearch?.input) {
      marketRateCitySearch.input.value = cityMatch;
      localStorage.setItem(STORAGE_KEYS.buyerCity, cityMatch);
    }
    if (cropMatch && marketRateCropFilter?.input) {
      marketRateCropFilter.input.value = cropMatch;
      activeCropFilter = cropMatch;
    }
    computeAndDisplayMarketRatesV2();
    renderBuyerListings();
    renderBuyerAnalytics();
    document.getElementById('buyerMarketRates')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setVoiceQuickStatus(`Showing ${cropMatch || 'crop'} rates for ${cityMatch || 'selected city'}.`);
    return;
  }

  setVoiceQuickStatus(`Could not map command: "${transcript}"`);
}

function initVoiceQuickActions() {
  const btn = document.getElementById('voiceQuickActionBtn');
  if (!btn) return;

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    btn.disabled = true;
    setVoiceQuickStatus('Voice actions are not supported in this browser.');
    return;
  }

  if (!buyerVoiceRecognizer) {
    buyerVoiceRecognizer = new SpeechRecognitionCtor();
    buyerVoiceRecognizer.lang = 'en-IN';
    buyerVoiceRecognizer.interimResults = false;
    buyerVoiceRecognizer.maxAlternatives = 1;

    buyerVoiceRecognizer.onstart = () => {
      buyerVoiceActive = true;
      btn.textContent = 'Stop Voice';
      setVoiceQuickStatus('Listening...');
    };

    buyerVoiceRecognizer.onend = () => {
      buyerVoiceActive = false;
      btn.textContent = 'Start Voice';
    };

    buyerVoiceRecognizer.onerror = (event) => {
      buyerVoiceActive = false;
      btn.textContent = 'Start Voice';
      setVoiceQuickStatus(`Voice error: ${event?.error || 'unknown'}`);
    };

    buyerVoiceRecognizer.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      setVoiceQuickStatus(`Heard: "${transcript}"`);
      handleVoiceQuickTranscript(transcript);
    };
  }

  btn.addEventListener('click', () => {
    if (!buyerVoiceRecognizer) return;
    if (buyerVoiceActive) {
      buyerVoiceRecognizer.stop();
      return;
    }
    try {
      buyerVoiceRecognizer.start();
    } catch (err) {
      setVoiceQuickStatus(`Voice start failed: ${err.message}`);
    }
  });
}

function initSuggestRateControls() {
  const cityInput = document.getElementById('suggestCityInput');
  const categorySelect = document.getElementById('suggestCropCategory');
  const cropSelect = document.getElementById('suggestCropSelect');
  if (!cityInput || !categorySelect || !cropSelect) return;

  const cities = typeof ensureCities === 'function' ? ensureCities() : [];
  if (cities.length) {
    const listId = 'suggestCityList';
    let datalist = document.getElementById(listId);
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = listId;
      document.body.appendChild(datalist);
    }
    datalist.innerHTML = cities.map(c => `<option value="${c}"></option>`).join('');
    cityInput.setAttribute('list', listId);
  }
  const storedCity = localStorage.getItem(STORAGE_KEYS.buyerCity);
  if (storedCity && !cityInput.value) cityInput.value = storedCity;

  const crops = typeof getCrops === 'function' ? getCrops() : [];
  const categories = Array.from(new Set(crops.map(c => c.category))).filter(Boolean);
  categorySelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

  const populateCrops = (category) => {
    const filtered = crops.filter(c => c.category === category);
    cropSelect.innerHTML = filtered.map(c => `<option value="${c.english}">${c.english} (${c.marathi})</option>`).join('');
  };

  const initialCategory = categories[0] || '';
  if (initialCategory) populateCrops(initialCategory);
  categorySelect.addEventListener('change', () => {
    populateCrops(categorySelect.value);
  });
}

function clearBuyerCity() {
  localStorage.removeItem(STORAGE_KEYS.buyerCity);
  populateCitySelector();
  renderBuyerListings();
  renderBuyerAnalytics();
}

function acceptCounteredOffer(offerId, btn = null) {
  const startedAt = Date.now();
  emitBuyerUiMetric('buyer_accept_counter_offer', 'task_start', { offerId });
  if (!offerId) {
    emitBuyerUiMetric('buyer_accept_counter_offer', 'validation_error', { reason: 'offer_id_missing' });
    alert(t('Error: No offer ID provided'));
    return;
  }

  const offers = getOffers();
  const offer = offers.find(o => o.offerId === offerId);
  if (!offer) {
    emitBuyerUiMetric('buyer_accept_counter_offer', 'ui_error', { offerId, reason: 'offer_missing' });
    alert(t('Offer not found'));
    return;
  }

  // VALIDATE: Buyer can only accept countered offers, not original offers
  if (offer.status !== 'Countered') {
    emitBuyerUiMetric('buyer_accept_counter_offer', 'validation_error', { offerId, reason: 'invalid_status', status: offer.status });
    alert(t('This offer is not a counter offer. Cannot accept.'));
    return;
  }

  if (btn) setButtonLoading(btn, 'Accepting...');

  // Use the standard acceptOffer function
  const result = acceptOffer(offerId, 'buyer');
  if (result) {
    emitBuyerUiMetric('buyer_accept_counter_offer', 'task_complete', { offerId }, Date.now() - startedAt);
    alert(t('Counter offer accepted! Awaiting middleman finalization.'));
    renderBuyerListings();
    renderBuyerAnalytics();
    renderBuyerNotifications();
  } else {
    emitBuyerUiMetric('buyer_accept_counter_offer', 'ui_error', { offerId, reason: 'accept_offer_failed' });
    alert(t('Error accepting counter offer. Please try again.'));
    console.error('acceptOffer returned null for:', offerId);
    if (btn) clearButtonLoading(btn);
  }
}

async function rejectCounteredOffer(offerId, btn = null) {
  const startedAt = Date.now();
  emitBuyerUiMetric('buyer_reject_counter_offer', 'task_start', { offerId });
  if (!offerId) {
    emitBuyerUiMetric('buyer_reject_counter_offer', 'validation_error', { reason: 'offer_id_missing' });
    alert(t('Error: No offer ID provided'));
    return;
  }

  const offers = getOffers();
  const offer = offers.find(o => o.offerId === offerId);
  if (!offer) {
    emitBuyerUiMetric('buyer_reject_counter_offer', 'ui_error', { offerId, reason: 'offer_missing' });
    alert(t('Offer not found'));
    return;
  }

  if (offer.status !== 'Countered') {
    emitBuyerUiMetric('buyer_reject_counter_offer', 'validation_error', { offerId, reason: 'invalid_status', status: offer.status });
    alert(t('This is not a countered offer'));
    return;
  }

  if (typeof farmaConfirm !== 'function') {
    emitBuyerUiMetric('buyer_reject_counter_offer', 'ui_error', { offerId, reason: 'dialog_unavailable' });
    return;
  }
  const confirmed = await farmaConfirm(t('Reject this counter offer?'));
  if (!confirmed) {
    emitBuyerUiMetric('buyer_reject_counter_offer', 'abandon', { offerId });
    return;
  }
  if (btn) setButtonLoading(btn, 'Rejecting...');
  const result = rejectOffer(offerId, 'buyer');
  if (result) {
    emitBuyerUiMetric('buyer_reject_counter_offer', 'task_complete', { offerId }, Date.now() - startedAt);
    alert(t('Counter offer rejected.'));
    renderBuyerListings();
    renderBuyerAnalytics();
    renderBuyerNotifications();
  } else {
    emitBuyerUiMetric('buyer_reject_counter_offer', 'ui_error', { offerId, reason: 'reject_offer_failed' });
    alert(t('Error rejecting offer'));
    console.error('rejectOffer returned null for:', offerId);
    if (btn) clearButtonLoading(btn);
  }
}

function initAdvancedInsightsToggle() {
  const btn = document.getElementById('buyerAdvancedToggleBtn');
  if (!btn || typeof getUiFlag !== 'function' || typeof setUiFlag !== 'function') return;

  const syncLabel = () => {
    const enabled = getUiFlag('UI_ADVANCED_BUYER', false);
    const key = enabled ? 'Hide Advanced Insights' : 'Show Advanced Insights';
    btn.textContent = typeof t === 'function' ? t(key) : key;
    btn.setAttribute('data-i18n', key);
  };

  btn.addEventListener('click', () => {
    const enabled = getUiFlag('UI_ADVANCED_BUYER', false);
    setUiFlag('UI_ADVANCED_BUYER', !enabled);
    syncLabel();
    if (typeof emitUiMetric === 'function') {
      emitUiMetric({
        role: 'buyer',
        task_id: 'buyer_toggle_advanced_insights',
        event_type: 'task_complete',
        screen_id: 'buyer-dashboard',
        metadata: { enabled: !enabled }
      });
    }
  });

  window.addEventListener('farmaFeatureFlagsChanged', syncLabel);
  syncLabel();
}

function clearOfferAndRetry(listingId) {
  emitBuyerUiMetric('buyer_retry_offer', 'task_start', { listingId });
  const offers = getOffers();
  const buyerId = getActiveBuyerId();
  const target = offers.find(o => o.listingId === listingId && String(o.buyerId || '') === String(buyerId));
  if (target) {
    const nextOffers = offers.filter(o => o.offerId !== target.offerId);
    saveOffers(nextOffers);
    const notifications = getNotifications();
    const nextNotes = notifications.filter(n => n.offerId !== target.offerId);
    if (nextNotes.length !== notifications.length) {
      saveNotifications(nextNotes);
    }
  }
  emitBuyerUiMetric('buyer_retry_offer', 'task_complete', { listingId, hadExistingOffer: !!target });
  renderBuyerListings();
}

// ==================== MARKET INTELLIGENCE FUNCTIONS ====================

function computeAndDisplayMarketRates() {
  const city = marketRateCitySearch?.input?.value || '';
  const crop = marketRateCropFilter?.input?.value || '';

  if (!city || !crop) {
    alert(t('Please select both a city and crop'));
    return;
  }

  const rates = computeDailyMarketRates(city, crop);
  const display = document.getElementById('marketRatesDisplay');
  const empty = document.getElementById('marketRatesEmpty');

  if (!rates) {
    display.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  display.style.display = 'block';

  // Update display values
  document.getElementById('minRateDisplay').textContent = `₹${rates.min}`;
  document.getElementById('avgRateDisplay').textContent = `₹${rates.avg}`;
  document.getElementById('maxRateDisplay').textContent = `₹${rates.max}`;

  // Draw chart
  try {
    renderMarketRatesChart(rates);
  } catch (e) {
    // Silent chart error guard
  }
}

function renderMarketRatesChart(rates) {
  const ctx = document.getElementById('marketRatesChart');
  if (!ctx) return;

  if (ctx.__chart) ctx.__chart.destroy();
  const labelKeys = ['Min', 'Avg', 'Max'];
  const labels = labelKeys.map(k => (typeof t === 'function' ? t(k) : k));
  const datasetLabelMeta = { key: 'Market Rates - {crop} in {city}', vars: { crop: rates.crop, city: rates.city } };

  ctx.__chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: typeof t === 'function' ? t(datasetLabelMeta.key, datasetLabelMeta.vars) : `Market Rates - ${rates.crop} in ${rates.city}`,
        data: [rates.min, rates.avg, rates.max],
        backgroundColor: ['#42A5F5', '#66BB6A', '#EF5350'],
        borderColor: ['#1976D2', '#43A047', '#C62828'],
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'x',
      animation: { duration: 500, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: true, position: 'bottom' }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: typeof t === 'function' ? t('₹/kg') : '₹/kg' },
          ticks: { callback: function (value) { return '₹' + value; } }
        }
      }
    }
  });
  ctx.__chart.__i18n = { labels: labelKeys.slice(), datasetLabels: [datasetLabelMeta], yTitle: { key: '₹/kg' } };
}

function submitCommunityRate() {
  const city = (document.getElementById('suggestCityInput')?.value || '').trim();
  const crop = (document.getElementById('suggestCropSelect')?.value || '').trim();
  const rate = document.getElementById('suggestedRateInput').value;

  if (!city || !crop || !rate) {
    alert(t('Please fill in all fields'));
    return;
  }

  const buyerId = getActiveBuyerId();
  if (!buyerId) {
    alert(t('Unable to identify buyer. Please refresh the page.'));
    return;
  }
  const res = recordCommunityMarketRate(buyerId, city, crop, Number(rate));
  if (res && res.error) {
    alert(t(res.error));
    return;
  }

  // Show success message
  const msg = document.getElementById('communityRateMsg');
  msg.style.display = 'block';
  msg.style.background = 'rgba(76,175,80,0.1)';
  msg.style.color = 'var(--success)';
  msg.style.borderLeft = '4px solid var(--success)';
  msg.innerHTML = '✅ ' + t('Thank you! Your market rate has been recorded (Community Input).');

  // Clear input
  document.getElementById('suggestedRateInput').value = '';

  // If market-rate selectors are empty, prefill from the submitted community rate.
  try {
    if (marketRateCitySearch?.input && !marketRateCitySearch.input.value.trim()) marketRateCitySearch.input.value = city;
    if (marketRateCropFilter?.input && !marketRateCropFilter.input.value.trim()) marketRateCropFilter.input.value = crop;
  } catch (e) { }

  // Hide message after 3 seconds
  setTimeout(() => {
    msg.style.display = 'none';
  }, 3000);

  // Refresh analytics + hints (avoid forced re-render while typing).
  refreshOfferHintsForCityCrop(city, crop);
  try {
    computeAndDisplayMarketRatesV2();
  } catch (e) { }
  scheduleBuyerRefresh();
}

function refreshOfferHintsForCityCrop(city, crop) {
  const activeCity = localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
  if (!activeCity) return;
  // If update is for another city, do nothing.
  if (city && activeCity && city !== activeCity) return;

  const hints = document.querySelectorAll('[data-market-hint]');
  if (!hints.length) return;

  hints.forEach(hintEl => {
    const card = hintEl.closest('[data-listing-card]');
    const listingId = card ? card.getAttribute('data-listing-id') : null;
    const listing = listingId ? getListings().find(l => l.listingId === listingId) : null;
    if (!listing) return;
    if (crop && listing.name !== crop) return;
    if (isSoldListing(listing)) return;

    const communityRate = getAverageCommunityRate(activeCity, listing.name);
    const rates = getDailyMarketRates(activeCity, listing.name);
    const avgRate = communityRate || (rates ? rates.avg : null);
    const unitLabel = typeof t === 'function' ? t('kg') : 'kg';

    if (!avgRate) {
      hintEl.style.display = 'none';
      hintEl.innerHTML = '';
      return;
    }

    const vars = { city: activeCity, rate: `₹${avgRate}/${unitLabel}` };
    hintEl.style.display = 'block';
    hintEl.innerHTML = `<em data-i18n="Today's average rate in {city}: {rate}" data-i18n-vars='${JSON.stringify(vars)}'>${typeof t === 'function' ? t('Today\'s average rate in {city}: {rate}', vars) : `Today's average rate in ${activeCity}: ₹${avgRate}/${unitLabel}`}</em>`;
    try { if (typeof applyTranslations === 'function') applyTranslations(hintEl); } catch (e) { }
  });
}

function computeAndDisplayMarketRatesV2() {
  const city = (marketRateCitySearch?.input?.value || '').trim() || localStorage.getItem(STORAGE_KEYS.buyerCity) || 'Pune';
  const crop = (marketRateCropFilter?.input?.value || '').trim() || activeCropFilter || 'Tomato';

  const rates = computePreferredMarketRatesToday(city, crop);
  const display = document.getElementById('marketRatesDisplay');
  const empty = document.getElementById('marketRatesEmpty');

  if (!rates) {
    if (display) display.style.display = 'none';
    if (empty) {
      const emptyTitle = 'No market rates yet';
      const emptyMsg = (city && crop)
        ? `No rate data yet for ${crop} in ${city}. Try another crop or add a community rate.`
        : 'Select a city and crop to view market rates.';
      empty.innerHTML = renderEmptyState('📉', emptyTitle, emptyMsg);
      empty.style.display = 'block';
    }
    const compare = document.getElementById('buyerMarketCompare');
    if (compare) compare.innerHTML = '';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (display) display.style.display = 'block';

  document.getElementById('minRateDisplay').textContent = `₹${rates.min}`;
  document.getElementById('avgRateDisplay').textContent = `₹${rates.avg}`;
  document.getElementById('maxRateDisplay').textContent = `₹${rates.max}`;

  const moodDiv = document.getElementById('marketMoodDisplay');
  if (moodDiv) {
    const mood = calculateMarketMood(city, crop);
    moodDiv.setAttribute('data-i18n', mood.mood);
    moodDiv.textContent = typeof t === 'function' ? t(mood.mood) : mood.mood;
    moodDiv.style.fontSize = '16px';
    moodDiv.style.fontWeight = '600';
    moodDiv.style.marginTop = '15px';
  }

  const compare = document.getElementById('buyerMarketCompare');
  if (compare) {
    const buyerId = getActiveBuyerId();
    const buyerTxns = buyerId ? getBuyerTransactions().filter(t => t.city === city && (t.cropName === crop || t.crop === crop || t.name === crop)) : [];
    const buyerAvg = buyerTxns.length
      ? buyerTxns.reduce((s, t) => s + (Number(t.finalRate || t.finalPrice) || 0), 0) / buyerTxns.length
      : 0;
    const diff = rates.avg && buyerAvg ? (buyerAvg - rates.avg) : 0;
    compare.innerHTML = `
      <div class="snapshot-card">
        <div class="muted" data-i18n="Your Avg Rate">Your Avg Rate</div>
        <div style="font-size:18px;font-weight:700;">₹${buyerAvg.toFixed(2)}/kg</div>
      </div>
      <div class="snapshot-card">
        <div class="muted" data-i18n="Market Avg Rate">Market Avg Rate</div>
        <div style="font-size:18px;font-weight:700;">₹${rates.avg.toFixed(2)}/kg</div>
      </div>
      <div class="snapshot-card">
        <div class="muted" data-i18n="Your Delta vs Market">Your Delta vs Market</div>
        <div style="font-size:18px;font-weight:700;">${diff >= 0 ? '▲' : '▼'} ₹${Math.abs(diff).toFixed(2)}</div>
      </div>
    `;
  }

  renderMarketRatesChartV2(city, crop, rates);
  if (externalPriceCache.length) {
    refreshExplainableRecommendation(externalPriceCache).catch(() => { });
  }
}

function renderMarketRatesChartV2(city, crop, rates) {
  const ctx = document.getElementById('marketRatesChart');
  if (!ctx) return;

  if (ctx.__chart) ctx.__chart.destroy();
  const labelKeys = ['Min', 'Fair Min', 'Avg', 'Fair Max', 'Max'];
  const labels = labelKeys.map(k => (typeof t === 'function' ? t(k) : k));
  const datasetLabelMeta = { key: 'Market Rates: {crop} - {city} (₹/kg)', vars: { crop, city } };

  ctx.__chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: typeof t === 'function' ? t(datasetLabelMeta.key, datasetLabelMeta.vars) : `${crop} - ${city} (₹/kg)`,
        data: [rates.min, rates.fairMin, rates.avg, rates.fairMax, rates.max],
        backgroundColor: [
          'rgba(255, 107, 107, 0.7)',
          'rgba(255, 193, 7, 0.7)',
          'rgba(76, 175, 80, 0.7)',
          'rgba(255, 193, 7, 0.7)',
          'rgba(255, 107, 107, 0.7)'
        ],
        borderColor: ['#e53935', '#f57f17', '#388e3c', '#f57f17', '#e53935'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 500, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => {
              const val = Number((context && context.parsed && context.parsed.y) || 0);
              let label = context.label + ': ₹' + val.toFixed(2) + '/' + (typeof t === 'function' ? t('kg') : 'kg');
              if (context.dataIndex === 2) label += ` (${typeof t === 'function' ? t('Sold Trades') : 'Sold Trades'})`;
              return label;
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: typeof t === 'function' ? t('₹/kg') : '₹/kg' } }
      }
    }
  });
  ctx.__chart.__i18n = { labels: labelKeys.slice(), datasetLabels: [datasetLabelMeta], yTitle: { key: '₹/kg' } };
}

function getBuyerExternalCommodities() {
  const base = ['WHEAT', 'RICE', 'ONION'];
  const city = localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
  const listings = getListings().filter(l => l.status === 'Approved' && (!city || l.city === city));
  const dynamic = listings.slice(0, 4).map(l => commodityTokenFromCrop(l.name));
  return Array.from(new Set(base.concat(dynamic).filter(Boolean))).slice(0, 6);
}

function getLocalPriceForCommodity(city, commodity) {
  const crop = cropFromCommodity(commodity);
  const rates = computePreferredMarketRatesToday(city, crop);
  if (rates && Number(rates.avg) > 0) return Number(rates.avg);
  const txns = getTransactions().filter(txn => {
    const txnCrop = txn.cropName || txn.crop || txn.name || '';
    return String(txn.city || '') === String(city || '') && commodityTokenFromCrop(txnCrop) === commodity;
  });
  if (!txns.length) return 0;
  const values = txns.map(txn => Number(txn.finalRate || txn.finalPrice || 0)).filter(v => v > 0);
  if (!values.length) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function getExternalPriceForCommodity(commodity) {
  const match = (externalPriceCache || []).find(row => String(row.commodity || '').toUpperCase() === String(commodity || '').toUpperCase());
  if (!match) return null;
  const price = Number(match.price || 0);
  return price > 0 ? price : null;
}

function renderExternalPriceList(prices, source, errors = []) {
  const statusEl = document.getElementById('externalPriceStatus');
  const listEl = document.getElementById('externalPricesList');
  if (!statusEl || !listEl) return;
  const liveCount = prices.filter(p => p.live).length;
  statusEl.setAttribute('data-i18n', 'External Feed Source: {source} | Live items: {count}');
  statusEl.setAttribute('data-i18n-vars', JSON.stringify({ source: source || 'fallback', count: liveCount }));
  statusEl.textContent = t('External Feed Source: {source} | Live items: {count}', { source: source || 'fallback', count: liveCount });

  if (!prices.length) {
    listEl.innerHTML = `<div class="muted" data-i18n="No external prices available.">${t('No external prices available.')}</div>`;
    return;
  }

  listEl.innerHTML = prices.map(item => {
    const crop = cropFromCommodity(item.commodity);
    const unit = item.unit || 'kg';
    const live = item.live ? 'live' : 'fallback';
    return `
      <div class="external-price-row">
        <div>
          <div style="font-weight:700;">${getCropDisplayName(crop)}</div>
          <div class="external-price-meta">${live} · ${item.source || source || 'fallback'}</div>
        </div>
        <div style="font-size:20px;font-weight:700;">₹${Number(item.price || 0).toFixed(2)}/${unit}</div>
      </div>
    `;
  }).join('');

  if (errors.length) {
    const joined = errors.slice(0, 2).join(' | ');
    listEl.insertAdjacentHTML('beforeend', `<div class="muted" style="font-size:12px;">${joined}</div>`);
  }
}

function showExternalPrices(payload) {
  const prices = Array.isArray(payload?.prices) ? payload.prices : [];
  renderExternalPriceList(prices, payload?.source || 'fallback', payload?.errors || []);
}

function renderExternalComparisonChart(city, prices) {
  const canvas = document.getElementById('externalComparisonChart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (canvas.__chart) {
    canvas.__chart.destroy();
  }
  const labels = prices.map(item => getCropDisplayName(cropFromCommodity(item.commodity)));
  const localValues = prices.map(item => {
    const val = getLocalPriceForCommodity(city, String(item.commodity || ''));
    return Number.isFinite(val) ? Number(val.toFixed(2)) : 0;
  });
  const externalValues = prices.map(item => Number(Number(item.price || 0).toFixed(2)));

  canvas.__chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: typeof t === 'function' ? t('Local Market') : 'Local Market',
          data: localValues,
          backgroundColor: 'rgba(76, 175, 80, 0.7)',
          borderColor: 'rgba(56, 142, 60, 1)',
          borderWidth: 1
        },
        {
          label: typeof t === 'function' ? t('External Market') : 'External Market',
          data: externalValues,
          backgroundColor: 'rgba(33, 150, 243, 0.7)',
          borderColor: 'rgba(25, 118, 210, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: typeof t === 'function' ? t('₹/kg') : '₹/kg'
          }
        }
      }
    }
  });
}

function renderImpactSummary(prices) {
  const totalEl = document.getElementById('impactTotalSavings');
  const avgEl = document.getElementById('impactAvgSavings');
  const indexEl = document.getElementById('impactMarketIndex');
  if (!totalEl || !avgEl || !indexEl) return;

  const extMap = {};
  (prices || []).forEach(row => {
    if (!row || !row.commodity) return;
    const val = Number(row.price || 0);
    if (val > 0) extMap[String(row.commodity).toUpperCase()] = val;
  });

  const txns = getTransactions().filter(txn => {
    const qty = Number(txn.quantity || 0);
    const rate = Number(txn.finalRate || txn.finalPrice || 0);
    return qty > 0 && rate > 0;
  });

  if (!txns.length) {
    totalEl.textContent = '₹0';
    avgEl.textContent = '0%';
    indexEl.textContent = '100';
    return;
  }

  let totalSavings = 0;
  let dealCount = 0;
  let pctAccum = 0;

  txns.forEach(txn => {
    const commodity = commodityTokenFromCrop(txn.cropName || txn.crop || txn.name || '');
    const external = extMap[commodity];
    const finalRate = Number(txn.finalRate || txn.finalPrice || 0);
    const qty = Number(txn.quantity || 0);
    if (!external || external <= 0 || qty <= 0 || finalRate <= 0) return;
    const delta = (external - finalRate) * qty;
    totalSavings += delta;
    dealCount += 1;
    pctAccum += ((external - finalRate) / external) * 100;
  });

  const avgSavingsPct = dealCount ? (pctAccum / dealCount) : 0;
  const marketIndex = Math.round(100 + avgSavingsPct);

  totalEl.textContent = `₹${totalSavings.toFixed(2)}`;
  avgEl.textContent = `${avgSavingsPct.toFixed(1)}%`;
  indexEl.textContent = `${marketIndex}`;
}

function checkExternalThresholdAndNotify(city, prices) {
  if (!Array.isArray(prices) || !prices.length) return;
  prices.forEach(row => {
    const commodity = String(row.commodity || '').toUpperCase();
    const externalPrice = Number(row.price || 0);
    const localPrice = getLocalPriceForCommodity(city, commodity);
    if (!(externalPrice > 0 && localPrice > 0)) return;
    const diffPct = Math.abs(((externalPrice - localPrice) / externalPrice) * 100);
    if (diffPct < BUYER_EXTERNAL_THRESHOLD_PCT) return;
    const cacheKey = `${city || 'all'}|${commodity}`;
    const now = Date.now();
    const cached = externalThresholdAlertState[cacheKey];
    if (cached && Math.abs(cached.diffPct - diffPct) < 0.5 && now - cached.ts < 5 * 60 * 1000) {
      return;
    }
    externalThresholdAlertState[cacheKey] = { diffPct, ts: now };
    showBuyerToast({
      title: t('External price threshold crossed'),
      body: `${cropFromCommodity(commodity)}: local ₹${localPrice.toFixed(2)} vs external ₹${externalPrice.toFixed(2)}`,
      tone: 'warn'
    });
  });
}

async function refreshExplainableRecommendation(prices) {
  const city = (marketRateCitySearch?.input?.value || '').trim() || localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
  const activeCrop = (marketRateCropFilter?.input?.value || '').trim() || activeCropFilter || '';
  const boxValue = document.getElementById('explainablePriceValue');
  const boxFormula = document.getElementById('explainablePriceFormula');
  if (!boxValue || !boxFormula) return;
  if (!city || !activeCrop || typeof fetchExplainablePriceRecommendation !== 'function') {
    boxValue.textContent = '₹0';
    boxFormula.textContent = t('Select city and crop to compute recommendation.');
    return;
  }
  const commodity = commodityTokenFromCrop(activeCrop);
  try {
    const payload = await fetchExplainablePriceRecommendation({
      city,
      crop: activeCrop,
      externalCommodity: commodity
    });
    const price = Number(payload?.price || 0);
    boxValue.textContent = `₹${price.toFixed(2)}`;
    boxFormula.textContent = payload?.explanation || '--';
    clearBuyerAlert('external-failed');
  } catch (err) {
    boxValue.textContent = '₹0';
    boxFormula.textContent = t('Recommendation unavailable');
    setBuyerAlert('external-failed', t('External feed unavailable. Falling back to internal calculations.'), 'error', 'External feed unavailable. Falling back to internal calculations.');
  }
}

async function refreshExternalPrices(manual = false) {
  if (typeof fetchExternalPrices !== 'function') return;
  const city = (marketRateCitySearch?.input?.value || '').trim() || localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
  const commodities = getBuyerExternalCommodities();
  try {
    const payload = await fetchExternalPrices(commodities, { city });
    const prices = Array.isArray(payload?.prices) ? payload.prices : [];
    externalPriceCache = prices;
    externalPriceError = '';
    showExternalPrices(payload);
    renderExternalComparisonChart(city, prices);
    renderImpactSummary(prices);
    await refreshExplainableRecommendation(prices);
    checkExternalThresholdAndNotify(city, prices);
    clearBuyerAlert('external-failed');
    if (manual) {
      showBuyerToast({ title: t('External prices refreshed'), tone: 'success' });
    }
  } catch (err) {
    externalPriceError = String(err?.message || err || 'External feed unavailable');
    renderExternalPriceList([], 'unavailable', [externalPriceError]);
    renderImpactSummary([]);
    setBuyerAlert('external-failed', t('External feed unavailable. Falling back to internal calculations.'), 'error', 'External feed unavailable. Falling back to internal calculations.');
    if (manual) {
      showBuyerToast({ title: t('External feed unavailable'), body: externalPriceError, tone: 'error' });
    }
  }
}

function summarizeReplayEvent(event) {
  const type = String(event?.event || event?.rawEvent || 'event');
  const detail = event?.detail || {};
  if (type === 'offerPlaced' || type === 'farmaOfferCreated') {
    return `Offer ${detail.offerId || ''} on ${detail.listingId || ''}`;
  }
  if (type === 'listingCreated' || type === 'farmaNewListing') {
    return `Listing ${detail.listingId || ''} submitted`;
  }
  if (type === 'listingStatusChanged' || type === 'farmaListingStatusUpdated') {
    return `Listing ${detail.listingId || ''} -> ${detail.status || ''}`;
  }
  if (type === 'transactionFinalized' || type === 'farmaTransactionFinalized') {
    return `Transaction ${detail.transactionId || ''} finalized`;
  }
  return JSON.stringify(detail || {});
}

function renderReplayEvents(events) {
  const container = document.getElementById('buyerReplayTimeline');
  if (!container) return;
  if (!Array.isArray(events) || !events.length) {
    container.innerHTML = `<div class="muted" data-i18n="No replay events recorded yet.">${t('No replay events recorded yet.')}</div>`;
    return;
  }
  container.innerHTML = events.slice().reverse().map(event => {
    const ts = event.timestamp ? new Date(event.timestamp).toLocaleString() : '--';
    const type = String(event.event || event.rawEvent || 'event');
    const summary = summarizeReplayEvent(event);
    return `
      <div class="replay-item">
        <div class="replay-title">
          <span>${type}</span>
          <span class="replay-time">${ts}</span>
        </div>
        <div class="muted" style="font-size:12px;margin-top:4px;">${summary}</div>
      </div>
    `;
  }).join('');
}

async function refreshReplayEvents() {
  if (typeof fetchReplayEvents !== 'function') return;
  try {
    replayEventsCache = await fetchReplayEvents(80);
    renderReplayEvents(replayEventsCache);
  } catch (err) {
    replayEventsCache = [];
    renderReplayEvents([]);
  }
}

function replayEventSequence() {
  if (!Array.isArray(replayEventsCache) || !replayEventsCache.length) {
    showBuyerToast({ title: t('No replay events recorded yet.'), tone: 'warn' });
    return;
  }
  const items = replayEventsCache.slice(-8);
  let step = 0;
  const run = () => {
    const event = items[step];
    if (!event) return;
    showBuyerToast({
      title: `Replay: ${event.event || event.rawEvent || 'event'}`,
      body: summarizeReplayEvent(event),
      tone: 'info'
    });
    step += 1;
    if (step < items.length) {
      setTimeout(run, 900);
    }
  };
  run();
}

function renderPurchaseHistoryV2() {
  const container = document.getElementById('purchaseHistoryContainer');
  if (!container) return;

  const buyerId = getActiveBuyerId();
  const history = getBuyerPurchaseHistory(buyerId);
  const stats = getTodayPurchaseStats(buyerId);
  const unitLabel = typeof t === 'function' ? t('kg') : 'kg';

  if (!history.length) {
    container.innerHTML = renderEmptyState('📊', 'No Purchase History', 'Your completed purchases will appear here.');
    return;
  }

  let html = '';
  if (stats.count > 0) {
    html += `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:20px;">
        <div style="background:rgba(33,150,243,0.1);padding:15px;border-radius:8px;border-left:4px solid var(--primary);">
          <div style="font-size:13px;color:var(--muted);margin-bottom:5px;" data-i18n="Total Spent Today">${t('Total Spent Today')}</div>
          <div style="font-size:20px;font-weight:600;color:var(--primary);">₹${stats.totalSpent.toFixed(2)}</div>
        </div>
        <div style="background:rgba(76,175,80,0.1);padding:15px;border-radius:8px;border-left:4px solid var(--success);">
          <div style="font-size:13px;color:var(--muted);margin-bottom:5px;" data-i18n="Total Quantity Today">${t('Total Quantity Today')}</div>
          <div style="font-size:20px;font-weight:600;color:var(--success);">${stats.totalQty} ${unitLabel}</div>
        </div>
        <div style="background:rgba(156,39,176,0.1);padding:15px;border-radius:8px;border-left:4px solid var(--info);">
          <div style="font-size:13px;color:var(--muted);margin-bottom:5px;" data-i18n="Purchases Today">${t('Purchases Today')}</div>
          <div style="font-size:20px;font-weight:600;color:var(--info);">${stats.count}</div>
        </div>
      </div>
      <div style="margin-bottom:20px;">
        <h4 style="margin-bottom:10px;" data-i18n="Avg Price by Crop (Today)">📊 ${t('Avg Price by Crop (Today)')}</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
          ${Object.entries(stats.avgByCrop).map(([crop, price]) => `
            <div style="background:rgba(0,0,0,0.03);padding:10px;border-radius:6px;border-left:3px solid var(--primary);">
              <div style="font-size:13px;font-weight:600;">${getCropDisplayName(crop)}</div>
              <div style="font-size:14px;color:var(--muted);">₹${price}/${unitLabel}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  html += history.map(txn => {
    const finalPrice = Number(txn.finalPrice || 0);
    const totalAmount = Number(txn.totalAmount || 0);
    const quantity = Number(txn.quantity || 0);
    const comparison = txn.marketAvg ? t('You paid {price} (market avg {avg})', { price: `₹${finalPrice}`, avg: `₹${txn.marketAvg}` }) : t('Market data unavailable');
    const cmpBadge = getComparisonBadge(finalPrice, txn.marketAvg);
    const statusCode = getBuyerOrderStatusCode(txn);
    const statusClass = getBuyerOrderStatusClass(statusCode);
    const statusLabel = statusCode === 'Delivered' ? 'Completed' : statusCode === 'Shipped' ? 'Shipped' : 'Pending';
    return `
      <div class="card" style="border-left:3px solid var(--primary);margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;align-items:start;">
          <div>
            <strong>🛒 ${txn.crop}</strong>
            <div class="muted">${txn.cropMarathi ? '(' + txn.cropMarathi + ')' : ''} • ${txn.city}</div>
          </div>
          <span class="status-chip ${statusClass}" data-i18n="${statusLabel}">${t(statusLabel)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px;">
          <div><strong>📦 <span data-i18n="Quantity">${t('Quantity')}</span>:</strong> ${formatQuantityDisplay(quantity, unitLabel)}</div>
          <div><strong>💰 <span data-i18n="Final Rate">${t('Final Rate')}</span>:</strong> ₹${finalPrice.toFixed(2)}/${unitLabel}</div>
          <div><strong>💵 <span data-i18n="Total Amount">${t('Total Amount')}</span>:</strong> ₹${totalAmount.toFixed(2)}</div>
          <div><strong>👨‍🌾 <span data-i18n="Farmer">${t('Farmer')}</span>:</strong> ${txn.farmerId}</div>
        </div>
        <div style="background:rgba(76,175,80,0.1);padding:10px;border-radius:6px;margin-top:10px;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          📊 <span data-i18n="You paid {price} (market avg {avg})" data-i18n-vars='${JSON.stringify({ price: `₹${finalPrice}`, avg: `₹${txn.marketAvg}` })}'>${comparison}</span>
          ${cmpBadge}
        </div>
        <div style="color:var(--muted);font-size:12px;margin-top:8px;">
          📅 ${new Date(txn.timestamp).toLocaleString()}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

function renderPurchaseHistory() {
  renderPurchaseHistoryV2();
}

function getComparisonBadge(finalPrice, marketAvg) {
  if (!marketAvg || !finalPrice) return '';
  const diff = ((finalPrice - marketAvg) / marketAvg) * 100;
  if (Math.abs(diff) <= 2) {
    return `<span class="cmp-badge cmp-flat" data-i18n="At market avg">${t('At market avg')}</span>`;
  }
  if (diff > 2) {
    return `<span class="cmp-badge cmp-up" data-i18n="Above market avg">${t('Above market avg')}</span>`;
  }
  return `<span class="cmp-badge cmp-down" data-i18n="Below market avg">${t('Below market avg')}</span>`;
}

function renderBuyerInsights() {
  const container = document.getElementById('buyerInsightsContainer');
  if (!container) return;

  withLoadingSkeleton(container, 'grid', () => {
    const heat = computeDemandHeat();
    const hotCrops = computeHotCropsToday();
    const topCity = computeTopCityToday();
    const city = localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
    const crop = activeCropFilter || marketRateCropFilter?.getSelectedValue?.() || '';
    const trend7 = computeTrend(city, crop, 7);
    const trend30 = computeTrend(city, crop, 30);
    const avg7 = trend7.sampleSize ? (trend7.values.reduce((s, v) => s + v, 0) / trend7.values.length) : 0;
    const avg30 = trend30.sampleSize ? (trend30.values.reduce((s, v) => s + v, 0) / trend30.values.length) : 0;
    const bestCrop = hotCrops[0];

    const hotCropHtml = hotCrops.length
      ? hotCrops.map((c, idx) => `<div style="display:flex;justify-content:space-between;"><span>🔥 ${idx + 1}. ${getCropDisplayName(c.crop)}</span><strong>${c.score}</strong></div>`).join('')
      : `<div class="muted" data-i18n="No hot crops today">${t('No hot crops today')}</div>`;
    const topCityHtml = topCity
      ? `<div style="display:flex;justify-content:space-between;"><span>🏙️ ${topCity.city}</span><strong>₹${topCity.value.toFixed(2)}</strong></div>`
      : `<div class="muted" data-i18n="No sales today">${t('No sales today')}</div>`;

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
        <div class="card" style="padding:12px;background:rgba(16,185,129,0.08);border:1px dashed rgba(16,185,129,0.4);">
          <div class="muted" style="font-size:12px;" data-i18n="Best Selling Crop Today">${t('Best Selling Crop Today')}</div>
          <div style="font-size:18px;font-weight:700;">${bestCrop ? getCropDisplayName(bestCrop.crop) : '—'}</div>
        </div>
        <div class="card" style="padding:12px;background:rgba(33,150,243,0.08);border:1px dashed rgba(33,150,243,0.4);">
          <div class="muted" style="font-size:12px;" data-i18n="Best Selling City Today">${t('Best Selling City Today')}</div>
          <div style="font-size:18px;font-weight:700;">${topCity ? topCity.city : '—'}</div>
        </div>
        <div class="card" style="padding:12px;">
          <div class="muted" style="font-size:12px;" data-i18n="Avg Sold Rate">${t('Avg Sold Rate')}</div>
          <div style="font-size:14px;font-weight:700;">7d: ₹${avg7.toFixed(2)} • 30d: ₹${avg30.toFixed(2)}</div>
          <div style="font-size:12px;color:var(--muted);" data-i18n="${city && crop ? 'Crop in City' : 'Select city & crop to focus trends'}" ${city && crop ? `data-i18n-vars='${JSON.stringify({ crop, city })}'` : ''}>${city && crop ? t('Crop in City', { crop, city }) : t('Select city & crop to focus trends')}</div>
        </div>
        <div class="card" style="padding:12px;background:rgba(255,193,7,0.08);border:1px dashed rgba(255,193,7,0.4);">
          <div class="muted" style="font-size:12px;" data-i18n="Demand Heat (7d)">Demand Heat (7d) <span class="info-tip" data-tooltip="Demand = offers + finalized sales from last 7 days." data-i18n-tooltip="Demand = offers + finalized sales from last 7 days.">ⓘ</span></div>
          <div style="font-size:20px;font-weight:700;"><span data-i18n="${heat.heat}">${t(heat.heat)}</span></div>
          <div style="font-size:12px;color:var(--muted);" data-i18n="Offers: {offers} • Sales: {sales}" data-i18n-vars='${JSON.stringify({ offers: heat.offers7d, sales: heat.sales7d })}'>${t('Offers: {offers} • Sales: {sales}', { offers: heat.offers7d, sales: heat.sales7d })}</div>
        </div>
        <div class="card" style="padding:12px;">
          <div style="font-weight:600;margin-bottom:6px;" data-i18n="Hot crops today">${t('Hot crops today')}</div>
          ${hotCropHtml}
        </div>
        <div class="card" style="padding:12px;">
          <div style="font-weight:600;margin-bottom:6px;" data-i18n="Top city today">${t('Top city today')}</div>
          ${topCityHtml}
        </div>
      </div>
    `;
  });
}

function renderBuyerSavedItems() {
  const container = document.getElementById('buyerSavedItems');
  if (!container) return;

  withLoadingSkeleton(container, 'list', () => {
    const items = getBuyerSavedCrops();
    if (!items.length) {
      container.innerHTML = `<div class="muted" data-i18n="Saved crops will appear here.">${t('Saved crops will appear here.')}</div>`;
      return;
    }
    container.innerHTML = items.map(item => `
      <div class="saved-card">
        <div>
          <div style="font-weight:700;">${getCropDisplayName(item.crop)}</div>
          <div class="muted" style="font-size:12px;">${item.city ? `📍 ${item.city}` : t('Any city')}</div>
        </div>
        <button class="btn-secondary" type="button" data-remove-saved-crop="${encodeURIComponent(item.crop)}" data-remove-saved-city="${encodeURIComponent(item.city || '')}" data-i18n="Remove">${t('Remove')}</button>
      </div>
    `).join('');
  });
}

// ==================== NOTIFICATIONS CENTER ====================
function buildBuyerDerivedNotifications(city, buyerId = getActiveBuyerId()) {
  const notes = [];
  const now = Date.now();
  const readIds = getBuyerDerivedNotificationsReadIds(buyerId);
  if (city) {
    const recentListings = getListings().filter(l => l.status === 'Approved' && l.city === city && new Date(l.createdAt || l.updatedAt || 0).getTime() >= (now - 2 * 86400000));
    if (recentListings.length) {
      const noteId = `derived-listings-${city}`;
      notes.push({
        id: noteId,
        type: 'new_listing',
        city,
        priority: 'Info',
        read: readIds.has(noteId),
        timestamp: new Date().toISOString()
      });
    }
  }
  const crop = activeCropFilter || marketRateCropFilter?.getSelectedValue?.() || '';
  if (city && crop) {
    const rates = computePreferredMarketRatesToday(city, crop);
    if (rates && rates.avg) {
      const noteId = `derived-rate-${city}-${crop}`;
      notes.push({
        id: noteId,
        type: 'price_update',
        avg: `₹${rates.avg}/${typeof t === 'function' ? t('kg') : 'kg'}`,
        priority: 'Info',
        read: readIds.has(noteId),
        timestamp: new Date().toISOString()
      });
    }
  }
  const txns = getBuyerTransactions();
  txns.slice(0, 2).forEach(txn => {
    const status = getBuyerOrderStatusCode(txn);
    const noteId = `derived-status-${txn.transactionId || txn.id}`;
    notes.push({
      id: noteId,
      type: 'order_status',
      status,
      priority: status === 'Delivered' ? 'Finalized' : 'Info',
      read: readIds.has(noteId),
      timestamp: txn.updatedAt || txn.timestamp || new Date().toISOString()
    });
  });
  return notes;
}

function renderBuyerNotifications() {
  const container = document.getElementById('buyerNotificationsContainer');
  if (!container) return;

  withLoadingSkeleton(container, 'list', () => {
    const buyerId = getActiveBuyerId();
    const city = localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
    const baseNotifications = buyerId ? getNotifications().filter(n => n.buyerId === buyerId && (!n.audience || n.audience === 'buyer')) : [];
    const derived = buildBuyerDerivedNotifications(city, buyerId);
    const notifications = baseNotifications.concat(derived);
    // Keep the panel compact: once read, notifications are hidden from the feed.
    const activeNotifications = notifications.filter(n => !n.read);
    const unreadCount = activeNotifications.length;
    const filtered = activeNotifications.filter(n => {
      if (buyerNotificationFilter === 'action') return n.priority === 'ActionRequired';
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (!activeNotifications.length) {
      container.innerHTML = renderEmptyState('🔔', 'All caught up', 'No unread notifications right now.');
      return;
    }

    const filters = `
      <div class="notification-toolbar">
        <button class="btn-secondary ${buyerNotificationFilter === 'all' ? 'active' : ''}" type="button" data-buyer-notification-filter="all" data-i18n="All">${t('All')}</button>
        <button class="btn-secondary ${buyerNotificationFilter === 'unread' ? 'active' : ''}" type="button" data-buyer-notification-filter="unread" data-i18n="Unread (${unreadCount})">${t('Unread (${count})', { count: unreadCount })}</button>
        <button class="btn-secondary ${buyerNotificationFilter === 'action' ? 'active' : ''}" type="button" data-buyer-notification-filter="action" data-i18n="Action Required">${t('Action Required')}</button>
        <span class="notification-toolbar-spacer"></span>
        <button class="btn-primary" type="button" data-buyer-mark-all-read ${unreadCount === 0 ? 'disabled' : ''} data-i18n="Mark all as read">${t('Mark all as read')}</button>
      </div>
    `;

    const cards = filtered.map(n => {
      const badge = `<span class="badge" style="background:${n.priority === 'Finalized' ? 'var(--success)' : n.priority === 'ActionRequired' ? 'var(--pending)' : 'var(--info)'};color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>`;
      const unreadDot = !n.read ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--danger);display:inline-block;"></span>' : '';
      let body = '';
      if (n.type === 'counter_offer') {
        body = `<div style="margin:6px 0;" data-i18n="New counter offer at {price} for {qty}" data-i18n-vars='${JSON.stringify({ price: `₹${n.counteredPrice}`, qty: n.counteredQty || '' })}'>${t('New counter offer at {price} for {qty}', { price: `₹${n.counteredPrice}`, qty: n.counteredQty || '' })}</div>`;
      } else if (n.type === 'offer_accepted') {
        body = `<div style="margin:6px 0;" data-i18n="Your offer was accepted. Await finalization.">${t('Your offer was accepted. Await finalization.')}</div>`;
      } else if (n.type === 'offer_rejected') {
        body = `<div style="margin:6px 0;" data-i18n="Your offer was rejected.">${t('Your offer was rejected.')}</div>`;
      } else if (n.type === 'deal_finalized' || n.type === 'purchase_completed') {
        const cropDisplay = getCropDisplayName(n.cropName || '');
        body = `<div style="margin:6px 0;" data-i18n="Deal finalized for {crop} • {amount}" data-i18n-vars='${JSON.stringify({ crop: cropDisplay, amount: n.totalAmount ? `₹${n.totalAmount}` : '' })}'>${t('Deal finalized for {crop} • {amount}', { crop: cropDisplay, amount: n.totalAmount ? `₹${n.totalAmount}` : '' })}</div>`;
      } else if (n.type === 'new_listing') {
        body = `<div style="margin:6px 0;" data-i18n="New listings available in {city}" data-i18n-vars='${JSON.stringify({ city: n.city })}'>${t('New listings available in {city}', { city: n.city })}</div>`;
      } else if (n.type === 'price_update') {
        body = `<div style="margin:6px 0;" data-i18n="Market average updated: {avg}" data-i18n-vars='${JSON.stringify({ avg: n.avg || '' })}'>${t('Market average updated: {avg}', { avg: n.avg || '' })}</div>`;
      } else if (n.type === 'order_status') {
        body = `<div style="margin:6px 0;" data-i18n="Order status updated to {status}" data-i18n-vars='${JSON.stringify({ status: n.status })}'>${t('Order status updated to {status}', { status: n.status })}</div>`;
      } else {
        body = `<div style="margin:6px 0;">${n.type}</div>`;
      }
      return `
        <div class="notification-card ${!n.read ? 'unread' : 'is-read'}" data-id="${n.id}">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${unreadDot}
              <strong>${t(n.type)}</strong>
            </div>
            ${badge}
          </div>
          ${body}
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="muted" style="font-size:12px;">${new Date(n.timestamp).toLocaleString()}</span>
            ${!n.read ? `<button class="btn-link" style="font-size:12px;" data-buyer-mark-read="${n.id}" data-i18n="Mark as read">${t('Mark as read')}</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = filters + `<div class="notification-stack">${cards}</div>`;

    const hasRejected = activeNotifications.some(n => n.type === 'offer_rejected');
    if (hasRejected) {
      setBuyerAlert('offer-rejected', t('Offer rejected. Review latest negotiation status.'), 'warn', 'Offer rejected. Review latest negotiation status.');
    } else {
      clearBuyerAlert('offer-rejected');
    }
  });
}

function setBuyerNotificationFilter(filter) {
  buyerNotificationFilter = filter;
  renderBuyerNotifications();
}

function markAllBuyerNotificationsRead() {
  const buyerId = getActiveBuyerId();
  if (!buyerId) return;
  const city = localStorage.getItem(STORAGE_KEYS.buyerCity) || '';
  const derived = buildBuyerDerivedNotifications(city, buyerId);
  markAllNotificationsRead(n => n.buyerId === buyerId && (!n.audience || n.audience === 'buyer'));
  markBuyerDerivedNotificationsRead(derived.map(n => n.id), buyerId);
  renderBuyerNotifications();
}

function initBuyerNotificationsInteractions() {
  const container = document.getElementById('buyerNotificationsContainer');
  if (!container) return;
  container.addEventListener('click', (event) => {
    const filterBtn = event.target.closest('button[data-buyer-notification-filter]');
    if (filterBtn) {
      const filter = filterBtn.getAttribute('data-buyer-notification-filter');
      if (filter) setBuyerNotificationFilter(filter);
      return;
    }
    const markAllBtn = event.target.closest('button[data-buyer-mark-all-read]');
    if (markAllBtn) {
      markAllBuyerNotificationsRead();
      return;
    }
    const markReadBtn = event.target.closest('button[data-buyer-mark-read]');
    if (markReadBtn) {
      const notificationId = markReadBtn.getAttribute('data-buyer-mark-read');
      if (!notificationId) return;
      const wasUpdated = markNotificationRead(notificationId);
      if (!wasUpdated) markBuyerDerivedNotificationsRead([notificationId]);
      renderBuyerNotifications();
    }
  });
}

function initBuyerSavedItemsInteractions() {
  const container = document.getElementById('buyerSavedItems');
  if (!container) return;
  container.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('button[data-remove-saved-crop]');
    if (!removeBtn) return;
    const crop = decodeURIComponent(removeBtn.getAttribute('data-remove-saved-crop') || '');
    const city = decodeURIComponent(removeBtn.getAttribute('data-remove-saved-city') || '');
    if (!crop) return;
    toggleSavedCrop(crop, city);
  });
}

function initAvatarMenu() {
  const btn = document.getElementById('buyerAvatarBtn');
  const dropdown = document.getElementById('buyerAvatarDropdown');
  if (!btn || !dropdown) return;
  const avatarCircle = btn.querySelector('.avatar-circle');
  const buyerId = getActiveBuyerId();
  if (avatarCircle && buyerId) {
    const token = String(buyerId).split('-').pop() || buyerId;
    avatarCircle.textContent = token.slice(-2).toUpperCase();
  }
  const setOpen = (open) => {
    buyerAvatarOpen = open;
    dropdown.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!buyerAvatarOpen);
  });
  dropdown.addEventListener('click', async (e) => {
    const actionNode = e.target.closest('[data-avatar-action]');
    if (!actionNode) return;
    const action = actionNode.getAttribute('data-avatar-action');
    setOpen(false);
    if (action === 'profile') {
      const buyerIdDisplay = getActiveBuyerId() || '-';
      const cityDisplay = localStorage.getItem(STORAGE_KEYS.buyerCity) || '-';
      const message = `Buyer ID: ${buyerIdDisplay}\nPreferred city: ${cityDisplay}`;
      if (typeof farmaAlert === 'function') {
        await farmaAlert(message, { title: t('My Profile') });
      } else {
        alert(message);
      }
      return;
    }
    if (action === 'settings') {
      const section = document.getElementById('buyerSettingsSection') || document.getElementById('buyerSavedSection');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (action === 'logout') {
      try { localStorage.removeItem(STORAGE_KEYS.currentBuyerId); } catch (err) { }
      location.href = 'index.html';
    }
  });
  document.addEventListener('click', () => {
    if (buyerAvatarOpen) setOpen(false);
  });
}

// ==================== DEMO TOOLS ====================
function initDemoTools(role) {
  const map = {
    buyer: { quick: 'demoQuickSetupBtnBuyer', reset: 'demoResetBtnBuyer', seed: 'demoSeedBtnBuyer', topSeed: 'quickSeedDemoBtnBuyer', status: 'demoStatusBuyer', guide: 'demoGuideBtnBuyer' },
    farmer: { quick: 'demoQuickSetupBtnFarmer', reset: 'demoResetBtnFarmer', seed: 'demoSeedBtnFarmer', topSeed: 'quickSeedDemoBtnFarmer', status: 'demoStatusFarmer' },
    middleman: { quick: 'demoQuickSetupBtnMiddleman', reset: 'demoResetBtnMiddleman', seed: 'demoSeedBtnMiddleman', topSeed: 'quickSeedDemoBtnMiddleman', status: 'demoStatusMiddleman' }
  }[role];
  if (!map) return;
  const quickBtn = document.getElementById(map.quick);
  const resetBtn = document.getElementById(map.reset);
  const seedBtn = document.getElementById(map.seed);
  const topSeedBtn = document.getElementById(map.topSeed);
  const guideBtn = document.getElementById(map.guide);
  const statusEl = document.getElementById(map.status);

  if (quickBtn) {
    quickBtn.addEventListener('click', () => {
      const result = typeof resetAndSeedDemoData === 'function'
        ? resetAndSeedDemoData()
        : { seedResult: seedDemoData() };
      if (statusEl) {
        const key = result?.seedResult?.seeded
          ? 'Instant demo setup complete.'
          : 'Instant demo setup skipped (existing data).';
        statusEl.setAttribute('data-i18n', key);
        statusEl.textContent = typeof t === 'function' ? t(key) : key;
      }
      setTimeout(() => location.reload(), 300);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetAppDataForUser();
      if (statusEl) {
        statusEl.setAttribute('data-i18n', 'Runtime data reset.');
        statusEl.textContent = typeof t === 'function' ? t('Runtime data reset.') : 'Runtime data reset.';
      }
      setTimeout(() => location.reload(), 300);
    });
  }

  const runSeed = () => {
    const res = seedDemoData();
    if (statusEl) {
      const key = res?.seeded ? 'Demo data seeded.' : 'Seed skipped - data exists.';
      statusEl.setAttribute('data-i18n', key);
      statusEl.textContent = typeof t === 'function' ? t(key) : key;
    }
    renderBuyerListings();
    renderBuyerAnalytics();
    renderBuyerOrders();
    renderPurchaseHistory();
    renderBuyerNotifications();
    renderBuyerInsights();
    renderBuyerSavedItems();
    computeAndDisplayMarketRatesV2();
  };

  if (seedBtn) seedBtn.addEventListener('click', runSeed);
  if (topSeedBtn) topSeedBtn.addEventListener('click', runSeed);

  if (guideBtn) {
    guideBtn.addEventListener('click', () => {
      toggleGuidedDemoBuyer(statusEl);
    });
  }

  // Dev-only QA harness panel
  if (typeof initQAMode === 'function') {
    initQAMode(role);
  }
}

function toggleGuidedDemoBuyer(statusEl) {
  const steps = [
    { selector: '[data-demo-step="farmer-list"]', key: 'Step 1: Farmer lists produce' },
    { selector: '[data-demo-step="middleman-listings"]', key: 'Step 2: Middleman approves listings' },
    { selector: '[data-demo-step="buyer-listings"]', key: 'Step 3: Buyer places offer' },
    { selector: '[data-demo-step="middleman-finalize"]', key: 'Step 4: Middleman finalizes trade' }
  ];

  if (demoTimerBuyer) {
    clearInterval(demoTimerBuyer);
    demoTimerBuyer = null;
    clearDemoHighlights();
    if (statusEl) {
      statusEl.setAttribute('data-i18n', 'Guided demo stopped.');
      statusEl.textContent = typeof t === 'function' ? t('Guided demo stopped.') : 'Guided demo stopped.';
    }
    return;
  }

  let idx = 0;
  demoTimerBuyer = setInterval(() => {
    clearDemoHighlights();
    const step = steps[idx % steps.length];
    const el = document.querySelector(step.selector);
    if (el) el.classList.add('demo-highlight');
    if (statusEl) {
      statusEl.setAttribute('data-i18n', step.key);
      statusEl.textContent = typeof t === 'function' ? t(step.key) : step.key;
    }
    idx += 1;
  }, 2500);
}

function clearDemoHighlights() {
  document.querySelectorAll('.demo-highlight').forEach(el => el.classList.remove('demo-highlight'));
}
