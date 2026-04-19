let ROLE_IDS = {};
let farmaPubSub = new EventTarget();
let farmerCitySearch = null;
let farmerCropSearch = null;
let farmerMarketRange = '7';
let notificationFilter = 'all';
const offerActionLocks = new Set();
const BUTTON_DEFAULT_TEXT = new WeakMap();
let farmerRefreshTimer = null;
let lastFarmerSignature = '';
let demoTimerFarmer = null;
let notificationBellInitialized = false;
let isNotificationBellOpen = false;
let farmerSalesTrendMode = 'weekly';
let showAllOffers = false;
let editingListingId = null;
let farmerSalesSort = { key: 'transactionId', dir: 'desc' };
const FARMER_LOG_PREFIX = '[FarmerDashboard]';
let farmerInitialRender = true;

function emitFarmerUiMetric(taskId, eventType, metadata = {}, durationMs = null) {
  if (typeof emitUiMetric !== 'function' || !taskId || !eventType) return;
  emitUiMetric({
    role: 'farmer',
    task_id: taskId,
    event_type: eventType,
    duration_ms: typeof durationMs === 'number' ? durationMs : undefined,
    screen_id: 'farmer-dashboard',
    metadata
  });
}


function setListingFormError(message) {
  const errorEl = document.getElementById('listingFormError');
  if (!errorEl) return;
  if (!message) {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
    return;
  }
  errorEl.textContent = typeof t === 'function' ? t(message) : message;
  errorEl.classList.add('is-visible');
}

function setInputError(input, hasError) {
  if (!input) return;
  input.classList.toggle('input-error', !!hasError);
}

function showFarmerToast({ title, body, tone = 'info', tag } = {}) {
  const container = document.getElementById('farmerToastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  const safeTitle = title || (typeof t === 'function' ? t('Notification') : 'Notification');
  const safeBody = body || '';
  const tagText = tag || safeTitle;
  toast.innerHTML = `
    <span class="toast-tag">${tagText}</span>
    <div>
      <div style="font-weight:700;">${safeTitle}</div>
      <div class="muted" style="font-size:12px;">${safeBody}</div>
    </div>
  `;
  container.appendChild(toast);
  while (container.children.length > 3) {
    container.removeChild(container.firstElementChild);
  }
  setTimeout(() => {
    toast.remove();
  }, 5200);
}

function getActiveFarmerId() {
  const stored = (typeof getStoreValue === 'function' && typeof STORAGE_KEYS !== 'undefined')
    ? getStoreValue(STORAGE_KEYS.currentFarmerId)
    : (typeof localStorage !== 'undefined' && typeof STORAGE_KEYS !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.currentFarmerId)
      : null);
  const fallbackListing = getListings().find(l => l && (l.farmerId || l.farmerID));
  const id = ROLE_IDS.farmerId || stored || (fallbackListing && (fallbackListing.farmerId || fallbackListing.farmerID)) || null;
  if (!ROLE_IDS.farmerId && id) ROLE_IDS.farmerId = id;
  return id;
}

function getFarmerListings() {
  const farmerId = getActiveFarmerId();
  if (!farmerId) return [];
  return getListings().filter(l => String(l.farmerId || '') === String(farmerId));
}

function getFarmerOffers() {
  const farmerId = getActiveFarmerId();
  if (!farmerId) return [];
  const listings = getFarmerListings();
  const listingIds = new Set(listings.map(l => String(l.listingId || l.id || '')));
  return getOffers().filter(o => {
    if (String(o.farmerId || '') === String(farmerId)) return true;
    const offerListing = String(o.listingId || '');
    return offerListing && listingIds.has(offerListing);
  });
}

function getFarmerTransactions() {
  const farmerId = getActiveFarmerId();
  if (!farmerId) return [];
  return getTransactions().filter(t => String(t.farmerId || '') === String(farmerId));
}

function safeRender(label, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`${FARMER_LOG_PREFIX} ${label} failed`, err);
  }
}
const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PRODUCT_IMAGE_MAX_DIMENSION = 1400;
const PRODUCT_IMAGE_QUALITY = 0.82;

try {
  farmerSalesTrendMode = localStorage.getItem('farmerSalesTrendMode') || 'weekly';
} catch (e) { }
try {
  farmerMarketRange = localStorage.getItem('farmerMarketRange') || '7';
} catch (e) { }

function estimateDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== 'string') return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil(base64.length * 3 / 4);
}

function optimizeImageDataUrl(dataUrl, mimeType) {
  return new Promise((resolve) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const maxDim = PRODUCT_IMAGE_MAX_DIMENSION;
      const largestSide = Math.max(img.width, img.height);
      const scale = largestSide > maxDim ? (maxDim / largestSide) : 1;
      if (scale === 1) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const outputType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      const outputQuality = outputType === 'image/jpeg' ? PRODUCT_IMAGE_QUALITY : 0.92;
      try {
        resolve(canvas.toDataURL(outputType, outputQuality));
      } catch (err) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function getCropDisplayName(name) {
  if (typeof renderCropWithMarathi === 'function') return renderCropWithMarathi(name);
  return name || '';
}

function setBtnLoading(btn, label = null) {
  if (!btn) return;
  if (!BUTTON_DEFAULT_TEXT.has(btn)) BUTTON_DEFAULT_TEXT.set(btn, btn.textContent);
  btn.disabled = true;
  btn.classList.add('is-loading');
  const labelText = typeof t === 'function' ? t(label || 'Working...') : (label || 'Working...');
  btn.textContent = labelText;
}

function clearBtnLoading(btn) {
  if (!btn) return;
  const original = BUTTON_DEFAULT_TEXT.get(btn);
  btn.disabled = false;
  btn.classList.remove('is-loading');
  if (original) btn.textContent = original;
}

function bindProductImageUpload() {
  const fileInput = document.getElementById('productImageFile');
  const cameraInput = document.getElementById('productImageCamera');
  const previewWrap = document.getElementById('productImagePreview');
  const previewImg = document.getElementById('productImagePreviewImg');
  const errorEl = document.getElementById('productImageError');
  const clearBtn = document.getElementById('clearProductImageBtn');

  const setError = (msg) => {
    if (!errorEl) return;
    if (!msg) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
      return;
    }
    errorEl.textContent = typeof t === 'function' ? t(msg) : msg;
    errorEl.style.display = 'block';
  };

  const showPreview = (dataUrl) => {
    if (!previewWrap || !previewImg) return;
    if (!dataUrl) {
      previewImg.src = '';
      previewWrap.style.display = 'none';
      return;
    }
    previewImg.src = dataUrl;
    previewWrap.style.display = 'block';
  };

  const handleFile = (file) => {
    setError('');
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      const maxMb = (PRODUCT_IMAGE_MAX_BYTES / (1024 * 1024)).toFixed(1);
      setError(`Image too large. Max ${maxMb} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        setError('Invalid image format.');
        return;
      }
      const optimized = await optimizeImageDataUrl(dataUrl, file.type);
      if (estimateDataUrlBytes(optimized) > PRODUCT_IMAGE_MAX_BYTES * 2.5) {
        setError('Image too large after optimization. Try a smaller image.');
        return;
      }
      const saved = saveUploadedProductImage(optimized);
      if (!saved) {
        setError('Unable to save image. Try a smaller file.');
        return;
      }
      showPreview(optimized);
    };
    reader.onerror = () => {
      setError('Unable to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const bindInput = (input) => {
    if (!input) return;
    input.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      handleFile(file);
      e.target.value = '';
    });
  };

  bindInput(fileInput);
  bindInput(cameraInput);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearUploadedProductImage();
      showPreview('');
      setError('');
    });
  }

  const existing = getUploadedProductImage();
  if (existing) showPreview(existing);
}

function setProductImagePreview(dataUrl) {
  const previewWrap = document.getElementById('productImagePreview');
  const previewImg = document.getElementById('productImagePreviewImg');
  if (!previewWrap || !previewImg) return;
  if (!dataUrl) {
    previewImg.src = '';
    previewWrap.style.display = 'none';
    return;
  }
  previewImg.src = dataUrl;
  previewWrap.style.display = 'block';
}

function initMarketSelectors() {
  const citySelect = document.getElementById('farmerMarketCitySelect');
  const cropSelect = document.getElementById('farmerMarketCropSelect');
  const rangeSelect = document.getElementById('farmerMarketRangeSelect');
  if (!citySelect || !cropSelect) return;

  const cities = typeof ensureCities === 'function' ? ensureCities() : [];
  citySelect.innerHTML = cities.map(city => `<option value="${city}">${city}</option>`).join('');

  const crops = typeof getCrops === 'function' ? getCrops() : [];
  cropSelect.innerHTML = crops.map(crop => {
    const label = `${crop.english} (${crop.marathi})`;
    return `<option value="${crop.english}">${label}</option>`;
  }).join('');

  const listings = getFarmerListings();
  const txns = getFarmerTransactions();
  const fallbackCity = (txns[0]?.city || listings[0]?.city || cities[0] || '').trim();
  const fallbackCrop = (txns[0]?.cropName || listings[0]?.name || (crops[0]?.english || '') || '').trim();

  if (fallbackCity) citySelect.value = fallbackCity;
  if (fallbackCrop) cropSelect.value = fallbackCrop;
  if (rangeSelect) rangeSelect.value = farmerMarketRange;

  citySelect.addEventListener('change', () => renderFarmerInsights());
  cropSelect.addEventListener('change', () => renderFarmerInsights());
  if (rangeSelect) {
    rangeSelect.addEventListener('change', () => {
      farmerMarketRange = rangeSelect.value || '7';
      try { localStorage.setItem('farmerMarketRange', farmerMarketRange); } catch (e) { }
      renderFarmerInsights();
    });
  }
}

function initListingModal() {
  const modal = document.getElementById('listingModal');
  const openBtn = document.getElementById('openListingModalBtn');
  const shortcutBtn = document.getElementById('newListingShortcut');
  const closeBtn = document.getElementById('listingModalClose');
  const cancelBtn = document.getElementById('cancelEditBtn');
  if (openBtn) openBtn.addEventListener('click', () => {
    setListingFormMode('create');
    openListingModal();
  });
  if (shortcutBtn) shortcutBtn.addEventListener('click', () => {
    setListingFormMode('create');
    openListingModal();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeListingModal);
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    setListingFormMode('create');
    closeListingModal();
  });
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeListingModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) {
      closeListingModal();
    }
  });
}

function openListingModal() {
  const modal = document.getElementById('listingModal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeListingModal() {
  const modal = document.getElementById('listingModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (editingListingId) setListingFormMode('create');
}

function setListingFormMode(mode, listing = null) {
  const titleEl = document.getElementById('listingModalTitle');
  const metaEl = document.getElementById('listingModalMeta');
  const submitBtn = document.getElementById('listProductBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  if (mode === 'edit' && listing) {
    editingListingId = listing.listingId || listing.id || '';
    if (submitBtn) {
      submitBtn.textContent = typeof t === 'function' ? t('Update Listing') : 'Update Listing';
      submitBtn.setAttribute('data-i18n', 'Update Listing');
      submitBtn.dataset.editId = editingListingId;
    }
    if (titleEl) {
      titleEl.textContent = typeof t === 'function' ? t('Edit Listing') : 'Edit Listing';
      titleEl.setAttribute('data-i18n', 'Edit Listing');
    }
    if (metaEl) metaEl.textContent = listing.listingId ? `Listing ID: ${listing.listingId}` : '';
    if (cancelBtn) cancelBtn.textContent = typeof t === 'function' ? t('Cancel') : 'Cancel';
  } else {
    editingListingId = null;
    if (submitBtn) {
      submitBtn.textContent = typeof t === 'function' ? t('Submit Listing') : 'Submit Listing';
      submitBtn.setAttribute('data-i18n', 'Submit Listing');
      delete submitBtn.dataset.editId;
    }
    if (titleEl) {
      titleEl.textContent = typeof t === 'function' ? t('List New Produce') : 'List New Produce';
      titleEl.setAttribute('data-i18n', 'List New Produce');
    }
    if (metaEl) metaEl.textContent = '';
    resetListingForm();
  }
}

function resetListingForm() {
  if (farmerCitySearch?.input) farmerCitySearch.input.value = '';
  if (farmerCropSearch?.input) farmerCropSearch.input.value = '';
  const qty = document.getElementById('productQuantity');
  const price = document.getElementById('productPrice');
  const quality = document.getElementById('productQuality');
  const desc = document.getElementById('productDescription');
  if (qty) qty.value = '';
  if (price) price.value = '';
  if (quality) quality.value = 'Good';
  if (desc) desc.value = '';
  clearUploadedProductImage();
  setProductImagePreview('');
  const errorEl = document.getElementById('productImageError');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
  renderAiRecommendation(null);
}

function updateAiPriceRecommendation() {
  const city = farmerCitySearch?.getValue() || '';
  const crop = farmerCropSearch?.getValue() || '';
  if (!city || !crop) {
    renderAiRecommendation(null);
    return;
  }

  // Get 30-day trend for this crop/city
  const trend = typeof computeTrend === 'function' ? computeTrend(city, crop, 30) : null;
  if (!trend || !trend.values || trend.values.length === 0) {
    // Fallback: search for crop across all cities if specific city data is missing
    const broadTrend = typeof computeTrend === 'function' ? computeTrend(null, crop, 30) : null;
    if (broadTrend && broadTrend.values && broadTrend.values.length > 0) {
      const filtered = broadTrend.values.filter(v => v > 0);
      if (filtered.length > 0) {
        const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
        renderAiRecommendation(avg);
        return;
      }
    }
    renderAiRecommendation(null);
    return;
  }

  const latestAvg = trend.values.filter(v => v > 0).pop();
  renderAiRecommendation(latestAvg);
}

function renderAiRecommendation(price) {
  const container = document.getElementById('aiPriceRecommendation');
  if (!container) return;
  if (!price) {
    container.innerHTML = '';
    return;
  }

  const formattedPrice = Math.round(price);
  container.innerHTML = `
    <div class="ai-recommendation">
      <div class="recommendation-info">
        <div class="recommendation-badge">✨ \${t('AI Suggestion')}</div>
        <div class="recommendation-text">\${t('Recommended Price')}: <strong>₹\${formattedPrice}</strong></div>
      </div>
      <button id="applyAiPriceBtn" type="button" class="btn recommendation-apply">\${t('Apply')}</button>
    </div>
  `;

  const applyBtn = document.getElementById('applyAiPriceBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const priceInput = document.getElementById('productPrice');
      if (priceInput) {
        priceInput.value = formattedPrice;
        priceInput.classList.add('pulse');
        setTimeout(() => priceInput.classList.remove('pulse'), 500);
      }
    });
  }
}

function startListingEdit(listingId) {
  const listings = getListings();
  const listing = listings.find(l => String(l.listingId || l.id) === String(listingId));
  if (!listing) {
    alert(t('Listing not found.'));
    return;
  }
  setListingFormMode('edit', listing);
  if (farmerCitySearch?.input) farmerCitySearch.input.value = listing.city || '';
  if (farmerCropSearch?.input) farmerCropSearch.input.value = listing.name || listing.commodity || '';
  const qty = document.getElementById('productQuantity');
  const price = document.getElementById('productPrice');
  const quality = document.getElementById('productQuality');
  const desc = document.getElementById('productDescription');
  if (qty) qty.value = listing.quantity || '';
  if (price) price.value = listing.price || '';
  if (quality) quality.value = listing.quality || 'Good';
  if (desc) desc.value = listing.description || '';

  if (listing.imageUrl) {
    saveUploadedProductImage(listing.imageUrl);
    setProductImagePreview(listing.imageUrl);
  } else {
    clearUploadedProductImage();
    setProductImagePreview('');
  }
  updateAiPriceRecommendation();
  openListingModal();
}

function focusOffersSection() {
  const section = document.getElementById('buyerOffersSection');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function focusOffersForListing(listingId) {
  if (!listingId) return;
  showAllOffers = true;
  renderBuyerOffers();
  focusOffersSection();
  setTimeout(() => {
    document.querySelectorAll('[data-offer-card]').forEach(card => {
      const matches = card.getAttribute('data-listing-id') === String(listingId);
      card.classList.toggle('is-highlight', matches);
    });
  }, 250);
}

function renderBuyerOffersSummary() {
  const container = document.getElementById('buyerOffersSummary');
  if (!container) return;
  const offers = getFarmerOffers();
  const newCount = offers.filter(o => o.status === 'OfferPlaced').length;
  const negotiating = offers.filter(o => o.status === 'Countered').length;
  const accepted = offers.filter(o => o.status === 'Accepted' || o.status === 'Finalized').length;
  container.innerHTML = `
    <div class="offer-summary-item ${newCount ? 'accent-hot' : ''}">
      <span data-i18n="New Offers">${t('New Offers')}</span>
      <strong>${newCount}</strong>
    </div>
    <div class="offer-summary-item">
      <span data-i18n="Negotiating">${t('Negotiating')}</span>
      <strong>${negotiating}</strong>
    </div>
    <div class="offer-summary-item">
      <span data-i18n="Accepted">${t('Accepted')}</span>
      <strong>${accepted}</strong>
    </div>
  `;
}

window.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  const init = initAppData();

  if (init.versionMismatch) {
    // Silent: data was reset due to version mismatch.
  }

  ROLE_IDS = init.roles;
  window.debugOffers = () => {
    const listings = getListings();
    const offers = getOffers();
    const notifications = getNotifications();
    const farmerId = getActiveFarmerId();
    console.log('currentRole = farmer');
    console.log('currentRoleId =', farmerId || localStorage.getItem(STORAGE_KEYS.currentFarmerId));
    console.log('listings count =', listings.length, 'sample =', listings[0] || null);
    console.log('offers count =', offers.length, 'sample =', offers[0] || null);
    console.log('notifications count =', notifications.length, 'sample =', notifications[0] || null);
    const farmerOffers = getFarmerOffers();
    console.log(`Offers for this farmerId = ${farmerOffers.length}`);
  };

  // Initialize searchable city/crop selectors
  farmerCitySearch = renderCitySearch('farmerCitySearch', (city) => {
    updateAiPriceRecommendation();
  });

  farmerCropSearch = renderCropSearch('farmerCropSearch', (cropName) => {
    updateAiPriceRecommendation();
  }, false);

  initMarketSelectors();
  initListingModal();
  bindQuickActions();

  bindListingForm();
  bindProductImageUpload();
  bindOfferActions();
  initNotificationBell();
  renderMyListings();
  renderBuyerOffers();
  renderBuyerOffersSummary();
  renderNotifications();
  renderSoldDeals();
  renderFarmerAnalytics();
  renderFarmerInsights();
  initDemoTools('farmer');
  bindRoleSwitchClearImage();
  subscribeToStorageChanges();
  subscribeToNotifications();
  setTimeout(() => {
    farmerInitialRender = false;
  }, 400);

  // Polling fallback for sync (real-time is server-based when available).
  setInterval(() => {
    scheduleFarmerRefresh();
  }, 10000);
});

// SSE Connection Monitoring and Error Handling
window.addEventListener('farmaSseConnected', () => {
  console.log('[Farmer Dashboard] Data sync connection established');
  dispatchFarmaEvent('farmaConnectionRestored', { timestamp: Date.now() });
  // Force refresh when connection is restored
  scheduleFarmerRefresh(true);
});

window.addEventListener('farmaSseError', (e) => {
  const detail = e.detail || {};
  console.warn('[Farmer Dashboard] Data sync connection error. Retries:', detail.retryCount, '/', FARMA_SSE_MAX_RETRIES);
  if (!detail.willRetry) {
    console.warn('[Farmer Dashboard] Connection retries exhausted. The dashboard may not receive real-time updates.');
  }
});

window.addEventListener('farmaSseGivenUp', () => {
  console.warn('[Farmer Dashboard] SSE connection permanently failed. Using polling fallback for updates.');
  // The polling fallback (10-second interval) will still work
});

// Global error handler for uncaught errors
let errorCount = 0;
const ERROR_THRESHOLD = 10;
window.addEventListener('error', (e) => {
  errorCount++;
  console.error('[Farmer Dashboard] Global error:', e.error);
  if (errorCount > ERROR_THRESHOLD) {
    console.error('[Farmer Dashboard] Too many errors detected. Page may be unstable. Consider refreshing.');
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Farmer Dashboard] Unhandled promise rejection:', e.reason);
});

// Data persistence check on page refresh
window.addEventListener('beforeunload', () => {
  try {
    // Ensure current state is saved
    const farmerId = getActiveFarmerId();
    if (farmerId) {
      localStorage.setItem(STORAGE_KEYS.currentFarmerId, farmerId);
    }
  } catch (e) {
    console.warn('[Farmer Dashboard] Error persisting farmer ID on unload:', e);
  }
});

window.addEventListener('storage', () => {
  const init = initAppData();
  scheduleFarmerRefresh(true);
});

function subscribeToStorageChanges() {
  window.addEventListener('farmaNotificationUpdate', () => {
    renderNotifications();
  });
  window.addEventListener('farmaSyncApplied', () => {
    scheduleFarmerRefresh(true);
  });
  window.addEventListener('farmaDataSync', () => {
    scheduleFarmerRefresh(true);
  });
  window.addEventListener('farmaDataReset', () => {
    scheduleFarmerRefresh(true);
  });
}

function subscribeToNotifications() {
  window.addEventListener('farmaNewNotification', (e) => {
    scheduleFarmerRefresh(true);
    const detail = e?.detail || {};
    const farmerId = getActiveFarmerId();
    const note = getNotifications().find(n => n.id === detail.id) || getNotifications().find(n => n.farmerId === farmerId && (!n.audience || n.audience === 'farmer'));
    if (note && String(note.farmerId || '') === String(farmerId)) {
      showToastForNotification(note);
    }
  });
  window.addEventListener('farmaOfferCreated', () => {
    scheduleFarmerRefresh(true);
  });
  window.addEventListener('farmaListingStatusUpdated', () => {
    scheduleFarmerRefresh(true);
  });
  window.addEventListener('farmaMarketRatesUpdated', () => {
    scheduleFarmerRefresh(true);
  });
  window.addEventListener('farmaTransactionFinalized', (e) => {
    scheduleFarmerRefresh(true);
    const detail = e?.detail || {};
    showFarmerToast({
      title: typeof t === 'function' ? t('Deal finalized') : 'Deal finalized',
      body: detail.crop ? `${detail.crop} • ${detail.city || ''}` : (typeof t === 'function' ? t('Your sale was finalized.') : 'Your sale was finalized.'),
      tone: 'success',
      tag: typeof t === 'function' ? t('Deal') : 'Deal'
    });
  });
}

function showToastForNotification(note) {
  if (!note) return;
  const crop = getCropDisplayName(note.cropName || '');
  const city = note.city || '';
  const unitLabel = typeof t === 'function' ? t('kg') : 'kg';
  if (note.type === 'pending') {
    showFarmerToast({
      title: typeof t === 'function' ? t('Listing submitted') : 'Listing submitted',
      body: `${crop || ''} ${city ? `• ${city}` : ''}`.trim(),
      tone: 'info',
      tag: typeof t === 'function' ? t('Listing') : 'Listing'
    });
    return;
  }
  if (note.type === 'approval') {
    showFarmerToast({
      title: typeof t === 'function' ? t('Listing approved') : 'Listing approved',
      body: `${crop || ''} ${city ? `• ${city}` : ''}`.trim(),
      tone: 'success',
      tag: typeof t === 'function' ? t('Approved') : 'Approved'
    });
    return;
  }
  if (note.type === 'rejection') {
    showFarmerToast({
      title: typeof t === 'function' ? t('Listing rejected') : 'Listing rejected',
      body: `${crop || ''} ${city ? `• ${city}` : ''}`.trim(),
      tone: 'info',
      tag: typeof t === 'function' ? t('Review') : 'Review'
    });
    return;
  }
  if (note.type === 'offer') {
    const price = note.offeredPrice ? `₹${note.offeredPrice}` : '';
    const qty = note.quantity ? `${note.quantity} ${unitLabel}` : '';
    showFarmerToast({
      title: typeof t === 'function' ? t('New offer received') : 'New offer received',
      body: `${price} ${qty ? `• ${qty}` : ''}`.trim(),
      tone: 'info',
      tag: typeof t === 'function' ? t('Offer') : 'Offer'
    });
    return;
  }
  if (note.type === 'deal_finalized') {
    const payout = note.farmerPayout ? `₹${note.farmerPayout}` : '';
    showFarmerToast({
      title: typeof t === 'function' ? t('Deal finalized') : 'Deal finalized',
      body: `${crop || ''} ${payout ? `• ${payout}` : ''}`.trim(),
      tone: 'success',
      tag: typeof t === 'function' ? t('Deal') : 'Deal'
    });
    return;
  }
  showFarmerToast({
    title: typeof t === 'function' ? t('Notification') : 'Notification',
    body: note.message || note.type || '',
    tone: 'info',
    tag: typeof t === 'function' ? t('Update') : 'Update'
  });
}

function bindQuickActions() {
  const quickListBtn = document.getElementById('quickListProduceBtn');
  if (quickListBtn) {
    quickListBtn.addEventListener('click', () => {
      document.getElementById('openListingModalBtn')?.click();
    });
  }
  const quickOffersBtn = document.getElementById('quickViewOffersBtn');
  if (quickOffersBtn) {
    quickOffersBtn.addEventListener('click', () => {
      location.hash = '#buyerOffersSection';
    });
  }
  const quickListingsBtn = document.getElementById('quickMyListingsBtn');
  if (quickListingsBtn) {
    quickListingsBtn.addEventListener('click', () => {
      location.hash = '#myListingsSection';
    });
  }
  const scrollOffersBtn = document.getElementById('scrollOffersBtn');
  if (scrollOffersBtn) {
    scrollOffersBtn.addEventListener('click', () => {
      focusOffersSection();
    });
  }
  const toggleOffersBtn = document.getElementById('toggleOffersBtn');
  if (toggleOffersBtn) {
    toggleOffersBtn.addEventListener('click', () => {
      showAllOffers = !showAllOffers;
      renderBuyerOffers();
    });
  }
  const viewBtn = document.getElementById('viewMarketBtn');
  const trackBtn = document.getElementById('trackOrdersBtn');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      document.getElementById('marketOverview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (trackBtn) {
    trackBtn.addEventListener('click', () => {
      document.getElementById('salesAnalyticsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function initNotificationBell() {
  if (notificationBellInitialized) return;
  const wrapper = document.getElementById('farmerNotifWrapper');
  const btn = document.getElementById('notificationsBellBtn');
  const panel = document.getElementById('notificationsBellPanel');
  const list = document.getElementById('notificationsBellList');
  const markAllBtn = document.getElementById('notificationsBellMarkAllBtn');
  if (!wrapper || !btn || !panel || !list) return;
  notificationBellInitialized = true;

  const setOpen = (open) => {
    isNotificationBellOpen = !!open;
    panel.hidden = !isNotificationBellOpen;
    btn.setAttribute('aria-expanded', isNotificationBellOpen ? 'true' : 'false');
    if (isNotificationBellOpen) updateNotificationBell();
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!isNotificationBellOpen);
  });

  document.addEventListener('click', (e) => {
    if (!isNotificationBellOpen) return;
    if (wrapper.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (!isNotificationBellOpen) return;
    if (e.key === 'Escape') setOpen(false);
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('[data-note-id]');
    if (!item) return;
    const noteId = item.getAttribute('data-note-id');
    if (!noteId) return;
    markNotificationRead(noteId);
    setOpen(false);
    scheduleFarmerRefresh(true);
  });

  if (markAllBtn) {
    markAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const farmerId = getActiveFarmerId();
      if (farmerId) {
        markAllNotificationsRead(n => n.farmerId === farmerId && (!n.audience || n.audience === 'farmer'));
      }
      setOpen(false);
      scheduleFarmerRefresh(true);
    });
  }
}

function formatBellNotification(n) {
  const type = n && n.type ? n.type : '';
  const cropDisplay = getCropDisplayName(n.cropName || '');
  const listingKey = n.listingId || '';
  const buyerKey = n.buyerId || '';
  const reason = (n.reason || n.rejectionReason || '').trim();

  if (type === 'pending') {
    return {
      color: 'var(--pending)',
      title: t('Listing pending review'),
      body: cropDisplay && listingKey ? t('{crop} • {listingId}', { crop: cropDisplay, listingId: listingKey }) : t('Pending review')
    };
  }
  if (type === 'approval') {
    return {
      color: 'var(--success)',
      title: t('Listing approved'),
      body: cropDisplay && listingKey ? t('{crop} • {listingId}', { crop: cropDisplay, listingId: listingKey }) : t('Approved')
    };
  }
  if (type === 'rejection') {
    const base = cropDisplay && listingKey ? t('{crop} • {listingId}', { crop: cropDisplay, listingId: listingKey }) : t('Rejected');
    return {
      color: 'var(--danger)',
      title: t('Listing rejected'),
      body: reason ? `${base} — ${reason}` : base
    };
  }
  if (type === 'offer') {
    const price = Number(n.offeredPrice || 0);
    const qty = Number(n.quantity || 0);
    const body = (buyerKey && price && qty)
      ? t('{buyer} offered {price} for {qty}', { buyer: buyerKey, price: `₹${price}`, qty: `${qty}` })
      : t('New offer received');
    return { color: 'var(--info)', title: t('New Offer from Buyer'), body };
  }
  if (type === 'deal_finalized') {
    const payout = Number(n.farmerPayout || 0);
    const body = payout ? t('Payout: {amount}', { amount: `₹${payout.toFixed(2)}` }) : t('Deal finalized');
    return { color: 'var(--success)', title: t('deal finalized'), body };
  }
  if (type === 'offer_accepted') {
    return { color: 'var(--pending)', title: t('offer accepted'), body: t('Awaiting finalization') };
  }
  if (type === 'offer_rejected') {
    return { color: 'var(--danger)', title: t('offer rejected'), body: t('Offer was rejected.') };
  }

  return { color: 'var(--primary)', title: t('Notifications'), body: type || '—' };
}

function updateNotificationBell(allNotifications = null) {
  const badge = document.getElementById('notificationsBellBadge');
  const list = document.getElementById('notificationsBellList');
  const panel = document.getElementById('notificationsBellPanel');
  if (!badge || !list || !panel) return;

  const farmerId = getActiveFarmerId();
  const all = Array.isArray(allNotifications)
    ? allNotifications
    : (farmerId ? getNotifications().filter(n => n.farmerId === farmerId && (!n.audience || n.audience === 'farmer')) : []);
  const unread = all.filter(n => !n.read).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (unread.length) {
    badge.style.display = 'inline-block';
    badge.textContent = unread.length > 99 ? '99+' : String(unread.length);
  } else {
    badge.style.display = 'none';
    badge.textContent = '0';
  }

  const max = 8;
  const shown = unread.slice(0, max);
  if (!shown.length) {
    list.innerHTML = `<div class="muted" style="font-size:12px;" data-i18n="No unread notifications">${t('No unread notifications')}</div>`;
    return;
  }

  const moreCount = unread.length - shown.length;
  list.innerHTML = shown.map(n => {
    const fmt = formatBellNotification(n);
    return `
      <div class="notif-panel-item" data-note-id="${n.id}" style="border-left:4px solid ${fmt.color};${n.read ? 'opacity:0.75;' : ''}">
        <div class="notif-panel-item-title">${fmt.title}</div>
        <div class="notif-panel-item-body">${fmt.body}</div>
        <div class="notif-panel-item-meta">
          <span>${n.city || ''}</span>
          <span>${new Date(n.timestamp).toLocaleString()}</span>
        </div>
      </div>
    `;
  }).join('') + (moreCount > 0 ? `<div class="muted" style="font-size:12px;margin-top:4px;" data-i18n="And {count} more…" data-i18n-vars='${JSON.stringify({ count: moreCount })}'>${t('And {count} more…', { count: moreCount })}</div>` : '');
}

function bindOfferActions() {
  // Use event delegation on notifications list
  const containers = [
    document.getElementById('notificationsList'),
    document.getElementById('buyerOffersList')
  ].filter(Boolean);
  if (!containers.length) return;

  containers.forEach(container => {
    container.removeEventListener('click', handleFarmerOfferAction);
    container.addEventListener('click', handleFarmerOfferAction);
  });
}

function handleFarmerOfferAction(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const filter = btn.getAttribute('data-notification-filter');
  if (filter) {
    setNotificationFilter(filter);
    return;
  }

  if (btn.hasAttribute('data-mark-all-farmer-read')) {
    markAllFarmerNotificationsRead();
    return;
  }

  const markReadId = btn.getAttribute('data-mark-read');
  if (markReadId) {
    markNotificationRead(markReadId);
    renderNotifications();
    return;
  }

  let offerId = btn.getAttribute('data-offer-id');

  if (!offerId) {
    console.error('Cannot determine offerId from button');
    return;
  }

  const action = btn.getAttribute('data-action');
  if (!action || !['accept', 'reject', 'counter'].includes(action)) {
    return;
  }
  const lockKey = `${action}-${offerId}`;
  if (offerActionLocks.has(lockKey)) return;
  offerActionLocks.add(lockKey);
  setBtnLoading(btn, action === 'accept' ? 'Accepting...' : action === 'reject' ? 'Rejecting...' : 'Countering...');

  if (action === 'accept') {
    acceptOfferAction(offerId, btn);
  } else if (action === 'reject') {
    rejectOfferAction(offerId, btn);
  } else if (action === 'counter') {
    counterOfferAction(offerId, btn);
  }
}

function computeFarmerSignature() {
  const listings = getFarmerListings();
  const offers = getFarmerOffers();
  const txns = getFarmerTransactions();
  const notes = getNotifications().filter(n => n.farmerId === getActiveFarmerId());
  const statusCounts = listings.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  const offerCounts = offers.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const unread = notes.filter(n => !n.read).length;
  const qtySum = listings.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const txnSum = txns.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
  const farmerId = getActiveFarmerId() || '';
  return [
    listings.length, offers.length, txns.length, notes.length,
    JSON.stringify(statusCounts), JSON.stringify(offerCounts), unread,
    qtySum, txnSum, farmerId
  ].join('|');
}

function scheduleFarmerRefresh(force = false) {
  if (farmerRefreshTimer) return;
  farmerRefreshTimer = setTimeout(() => {
    farmerRefreshTimer = null;
    const sig = computeFarmerSignature();
    if (!force && sig === lastFarmerSignature) return;
    lastFarmerSignature = sig;
    safeRender('renderMyListings', renderMyListings);
    safeRender('renderBuyerOffers', renderBuyerOffers);
    safeRender('renderBuyerOffersSummary', renderBuyerOffersSummary);
    safeRender('renderNotifications', renderNotifications);
    safeRender('renderSoldDeals', renderSoldDeals);
    safeRender('renderFarmerAnalytics', renderFarmerAnalytics);
    safeRender('renderFarmerInsights', renderFarmerInsights);
  }, 140);
}

function bindListingForm() {
  const btn = document.getElementById('listProductBtn');
  if (!btn) return;
  const qtyInput = document.getElementById('productQuantity');
  const priceInput = document.getElementById('productPrice');
  const descInput = document.getElementById('productDescription');
  const clearErrors = () => {
    setListingFormError('');
    setInputError(qtyInput, false);
    setInputError(priceInput, false);
    setInputError(farmerCitySearch?.input, false);
    setInputError(farmerCropSearch?.input, false);
  };
  [qtyInput, priceInput, descInput, farmerCitySearch?.input, farmerCropSearch?.input].forEach(input => {
    if (!input) return;
    input.addEventListener('input', clearErrors);
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const startedAt = Date.now();
    emitFarmerUiMetric('farmer_create_or_edit_listing', 'task_start', { mode: btn.dataset.editId ? 'edit' : 'create' });

    const city = farmerCitySearch?.input?.value?.trim();
    const cropName = farmerCropSearch?.input?.value?.trim();
    const quantity = Number(document.getElementById('productQuantity').value || 0);
    const quality = document.getElementById('productQuality').value;
    const price = Number(document.getElementById('productPrice')?.value || 0);
    const description = document.getElementById('productDescription').value;

    if (!city || !cropName || quantity <= 0 || price <= 0) {
      emitFarmerUiMetric('farmer_create_or_edit_listing', 'validation_error', {
        mode: btn.dataset.editId ? 'edit' : 'create',
        missingCity: !city,
        missingCrop: !cropName,
        invalidQuantity: quantity <= 0,
        invalidPrice: price <= 0
      });
      setInputError(farmerCitySearch?.input, !city);
      setInputError(farmerCropSearch?.input, !cropName);
      setInputError(qtyInput, quantity <= 0);
      setInputError(priceInput, price <= 0);
      setListingFormError('Fill all fields with valid values');
      return;
    }
    setListingFormError('');

    purgeExpiredUploadedProductImage();
    const productImage = getUploadedProductImage();
    const cropInfo = getCropInfo(cropName);
    const category = cropInfo?.category || 'Other';

    const listings = getListings();
    const farmerId = getActiveFarmerId();
    if (!farmerId) {
      emitFarmerUiMetric('farmer_create_or_edit_listing', 'ui_error', { reason: 'farmer_missing' });
      alert(t('Unable to identify farmer. Please refresh the page.'));
      return;
    }
    const editId = btn.dataset.editId;
    if (editId) {
      const listing = listings.find(l => String(l.listingId || l.id) === String(editId));
      if (!listing) {
        emitFarmerUiMetric('farmer_create_or_edit_listing', 'ui_error', { mode: 'edit', listingId: editId, reason: 'listing_missing' });
        alert(t('Listing not found.'));
        return;
      }
      listing.city = city;
      listing.category = category;
      listing.name = cropName;
      listing.commodity = cropName;
      listing.quantity = quantity;
      listing.price = price;
      listing.quality = quality;
      listing.verifiedQuality = listing.verifiedQuality || quality;
      listing.description = description;
      listing.updatedAt = new Date().toISOString();
      if (productImage) {
        listing.imageUrl = productImage;
        saveListingImage(listing.listingId || listing.id, productImage);
      }
      saveListings(listings);
      clearUploadedProductImage();
      setListingFormMode('create');
      closeListingModal();
      renderMyListings();
      renderFarmerAnalytics();
      renderFarmerInsights();
      emitFarmerUiMetric('farmer_create_or_edit_listing', 'task_complete', { mode: 'edit', listingId: listing.listingId || listing.id }, Date.now() - startedAt);
      return;
    }

    const listing = {
      id: Date.now(),
      listingId: `LST-${Date.now()}`,
      farmerId,
      city,
      category,
      name: cropName,
      commodity: cropName,
      quantity,
      price,
      approvedPrice: 0,
      quality,
      verifiedQuality: quality,
      description,
      unit: 'kg',
      availabilityDate: new Date().toISOString(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      imageUrl: productImage || ''
    };

    listings.push(listing);
    if (productImage) {
      saveListingImage(listing.listingId, productImage);
    }
    saveListings(listings);
    trackRecentCity(city);
    trackRecentCrop(cropName);
    notifyNewListing(listing);
    triggerMiddlemanNotification(listing);
    notifyFarmerListingSubmitted(listing);

    farmerCitySearch.input.value = '';
    farmerCropSearch.input.value = '';
    document.getElementById('productQuantity').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productDescription').value = '';

    renderMyListings();
    renderFarmerAnalytics();
    setListingFormMode('create');
    closeListingModal();
    emitFarmerUiMetric('farmer_create_or_edit_listing', 'task_complete', { mode: 'create', listingId: listing.listingId }, Date.now() - startedAt);
    alert(t('Listing created! Waiting for middleman approval.'));
  });
}

function renderMyListings() {
  const container = document.getElementById('myListings');
  if (!container) return;
  const doRender = () => {
    const listings = getFarmerListings().filter(l => l.status !== 'Rejected');
    if (!listings.length) {
      container.innerHTML = renderEmptyState('🌱', 'No Active Listings', 'Create your first produce listing to start selling on E-Kisan Market. Check your Completed Deals section for sold items!');
      return;
    }
    const rows = listings.map(l => {
      const listingKey = l.listingId || l.id || '';
      const statusKey = l.status === 'PurchaseRequested' ? 'Buyer Interest' : l.status === 'Approved' ? 'Active' : l.status;
      const statusClass = l.status ? l.status.toLowerCase() : 'pending';
      return `
        <tr>
          <td>${getCropDisplayName(l.name)}</td>
          <td>${l.city}</td>
          <td>${l.quantity} ${l.unit}</td>
          <td>₹${l.price}/${l.unit}</td>
          <td><span class="badge status-${statusClass}" data-i18n="${statusKey}">${t(statusKey)}</span></td>
          <td style="white-space:nowrap;display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn-secondary" type="button" data-view-offers="${listingKey}" data-i18n="View Offers">${t('View Offers')}</button>
            <button class="btn" type="button" data-edit-listing="${listingKey}" data-i18n="Edit">${t('Edit')}</button>
          </td>
        </tr>
      `;
    }).join('');
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table listing-table">
          <thead>
            <tr>
              <th data-i18n="Crop">Crop</th>
              <th data-i18n="City">City</th>
              <th data-i18n="Quantity">Quantity</th>
              <th data-i18n="Price per kg">Price per kg</th>
              <th data-i18n="Status">Status</th>
              <th data-i18n="Actions">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    container.querySelectorAll('[data-view-offers]').forEach(btn => {
      btn.addEventListener('click', () => {
        const listingId = btn.getAttribute('data-view-offers');
        focusOffersForListing(listingId);
      });
    });
    container.querySelectorAll('[data-edit-listing]').forEach(btn => {
      btn.addEventListener('click', () => {
        const listingId = btn.getAttribute('data-edit-listing');
        startListingEdit(listingId);
      });
    });
  };
  withLoadingSkeleton(container, 'table', doRender);
}

function markNotificationsForOffer(offerId) {
  if (!offerId) return;
  const notes = getNotifications();
  const farmerId = getActiveFarmerId();
  let changed = false;
  notes.forEach(n => {
    if (n.offerId === offerId && n.farmerId === farmerId) {
      n.read = true;
      changed = true;
    }
  });
  if (changed) saveNotifications(notes);
}

function renderBuyerOffers() {
  const container = document.getElementById('buyerOffersList');
  if (!container) return;
  const doRender = () => {
    const offers = getFarmerOffers();
    if (!offers.length) {
      container.innerHTML = renderEmptyState('📨', 'No offers yet', 'Buyer offers will appear here for negotiation.');
      renderBuyerOffersSummary();
      return;
    }
    const listings = getListings();
    const visible = offers
      .filter(o => ['OfferPlaced', 'Countered', 'Accepted', 'Rejected', 'Finalized'].includes(o.status))
      .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));

    const limited = showAllOffers ? visible : visible.slice(0, 3);
    const cards = limited.map(o => {
      const listing = listings.find(l => l.listingId === o.listingId) || {};
      const unitLabel = listing.unit || 'kg';
      const status = o.status || 'OfferPlaced';
      const statusColor = status === 'Accepted' ? 'var(--success)' : status === 'Rejected' ? 'var(--danger)' : status === 'Countered' ? 'var(--pending)' : status === 'Finalized' ? 'var(--info)' : 'var(--primary)';
      const displayQty = o.counteredQty || o.quantity;
      const displayPrice = o.counteredPrice || o.offeredPrice;
      const counterInputs = status === 'OfferPlaced' ? `
        <div class="offer-row" style="margin-top:10px;">
          <input type="number" min="1" step="0.01" placeholder="${t('Counter price (₹)')}" data-i18n-placeholder="Counter price (₹)" data-counter-price value="${o.offeredPrice || ''}" />
          <input type="number" min="0.1" step="0.1" placeholder="${t('Qty')} (${unitLabel})" data-i18n-placeholder="Qty ({unit})" data-i18n-vars='${JSON.stringify({ unit: unitLabel })}' data-counter-qty value="${o.quantity || ''}" />
        </div>
      ` : '';
      const actionButtons = status === 'OfferPlaced' ? `
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn-primary" data-offer-id="${o.offerId}" data-action="accept" data-i18n="Accept">✓ ${t('Accept')}</button>
          <button class="btn-secondary" data-offer-id="${o.offerId}" data-action="counter" data-i18n="Counter">💬 ${t('Counter')}</button>
          <button class="btn-danger" data-offer-id="${o.offerId}" data-action="reject" data-i18n="Reject">✗ ${t('Reject')}</button>
        </div>
      ` : '';
      const statusLine = status === 'Countered'
        ? `<div style="color:var(--pending);margin-top:6px;font-size:13px;" data-i18n="Waiting for buyer response...">⏳ ${t('Waiting for buyer response...')}</div>`
        : status === 'Accepted'
          ? `<div style="color:var(--success);margin-top:6px;font-size:13px;" data-i18n="Accepted">✅ ${t('Accepted')}</div>`
          : status === 'Rejected'
            ? `<div style="color:var(--danger);margin-top:6px;font-size:13px;" data-i18n="Rejected">✗ ${t('Rejected')}</div>`
            : status === 'Finalized'
              ? `<div style="color:var(--info);margin-top:6px;font-size:13px;" data-i18n="Finalized">✔ ${t('Finalized')}</div>`
              : '';

      const cropName = getCropDisplayName(listing.name || listing.commodity || '');
      return `
        <div class="offer-card" data-offer-card data-offer-id="${o.offerId}" data-listing-id="${o.listingId}" style="border-left:3px solid ${statusColor};">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div>
              <strong>${cropName || o.listingId}</strong>
              <div class="muted" style="font-size:12px;">${listing.city || ''} ${listing.city ? '•' : ''} ${o.listingId}</div>
            </div>
            <span class="badge" style="background:${statusColor};color:white;">${t(status)}</span>
          </div>
          <div style="margin:8px 0;padding:8px;background:rgba(255,255,255,0.04);border-radius:8px;" data-i18n="Offered Price: {price} | Qty: {qty}" data-i18n-vars='${JSON.stringify({ price: `₹${displayPrice}`, qty: `${displayQty} ${unitLabel}` })}'>${t('Offered Price: {price} | Qty: {qty}', { price: `₹${displayPrice}`, qty: `${displayQty} ${unitLabel}` })}</div>
          ${counterInputs}
          ${actionButtons}
          ${statusLine}
          <div class="muted" style="font-size:12px;margin-top:6px;">${new Date(o.createdAt || o.timestamp || Date.now()).toLocaleString()}</div>
        </div>
      `;
    }).join('');
    container.innerHTML = cards;
    const toggleBtn = document.getElementById('toggleOffersBtn');
    if (toggleBtn) {
      const label = showAllOffers ? 'Show Less' : 'View All';
      toggleBtn.textContent = typeof t === 'function' ? t(label) : label;
      toggleBtn.setAttribute('data-i18n', label);
    }
    bindOfferActions();
    renderBuyerOffersSummary();
  };
  withLoadingSkeleton(container, 'cards', doRender);
}

function renderNotifications() {
  const container = document.getElementById('notificationsList');
  if (!container) return;
  const doRender = () => {
    const unitLabel = typeof t === 'function' ? t('kg') : 'kg';
    const farmerId = getActiveFarmerId();
    const allNotifications = getNotifications().filter(n => n.farmerId === farmerId && (!n.audience || n.audience === 'farmer'));
    updateNotificationBell(allNotifications);
    const activeNotifications = allNotifications.filter(n => !n.read);
    const unreadCount = activeNotifications.length;
    const filtered = activeNotifications.filter(n => {
      if (notificationFilter === 'action') return n.priority === 'ActionRequired';
      return true;
    });
    if (!activeNotifications.length) {
      container.innerHTML = renderEmptyState('🔔', 'All caught up', 'No unread notifications right now.');
      return;
    }
    const filtersHtml = `
      <div class="notification-toolbar">
        <button class="btn-secondary ${notificationFilter === 'all' ? 'active' : ''}" type="button" data-notification-filter="all" data-i18n="All">${t('All')}</button>
        <button class="btn-secondary ${notificationFilter === 'unread' ? 'active' : ''}" type="button" data-notification-filter="unread" data-i18n="Unread (${count})" data-i18n-vars='${JSON.stringify({ count: unreadCount })}'>${t('Unread (${count})', { count: unreadCount })}</button>
        <button class="btn-secondary ${notificationFilter === 'action' ? 'active' : ''}" type="button" data-notification-filter="action" data-i18n="Action Required">${t('Action Required')}</button>
        <span class="notification-toolbar-spacer"></span>
        <button class="btn-primary" type="button" data-mark-all-farmer-read ${unreadCount === 0 ? 'disabled' : ''} data-i18n="Mark all as read">${t('Mark all as read')}</button>
      </div>
    `;
    const cards = filtered
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .map(n => {
        if (n.type === 'pending' || n.type === 'approval' || n.type === 'rejection') {
          const badgeColor = n.type === 'approval' ? 'var(--success)' : n.type === 'rejection' ? 'var(--danger)' : 'var(--pending)';
          const titleKey = n.type === 'approval' ? 'Listing approved' : n.type === 'rejection' ? 'Listing rejected' : 'Listing pending review';
          const cropDisplay = getCropDisplayName(n.cropName || '');
          const listingKey = n.listingId || '';
          const bodyKey = n.type === 'approval'
            ? 'Your listing {crop} ({listingId}) was approved.'
            : n.type === 'rejection'
              ? 'Your listing {crop} ({listingId}) was rejected.'
              : 'Your listing {crop} ({listingId}) is pending review.';
          const vars = { crop: cropDisplay || (n.cropName || ''), listingId: listingKey, city: n.city || '', reason: (n.reason || n.rejectionReason || '').trim() };
          const reasonLine = (n.type === 'rejection' && vars.reason)
            ? `<div style="margin:8px 0;" data-i18n="Reason: {reason}" data-i18n-vars='${JSON.stringify({ reason: vars.reason })}'>📝 ${t('Reason: {reason}', { reason: vars.reason })}</div>`
            : '';
          const cityLine = vars.city ? `<div class="muted" style="font-size:12px;">📍 ${vars.city}</div>` : '';
          return `
          <div class="card notification-card" style="border-left-color:${badgeColor};${n.read ? 'opacity:0.75;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div><strong style="color:${badgeColor};" data-i18n="${titleKey}">${t(titleKey)}</strong></div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span class="badge" style="background:${badgeColor};color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>
                ${!n.read ? '<span style="width:10px;height:10px;background:var(--danger);border-radius:50%;display:inline-block;"></span>' : ''}
              </div>
            </div>
            <div style="margin:8px 0;" data-i18n="${bodyKey}" data-i18n-vars='${JSON.stringify(vars)}'>${t(bodyKey, vars)}</div>
            ${cityLine}
            ${reasonLine}
            <div class="muted" style="font-size:12px;margin-top:8px;">📅 ${new Date(n.timestamp).toLocaleString()}</div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
              <button class="btn" data-mark-read="${n.id}" type="button" data-i18n="Mark read">${t('Mark read')}</button>
            </div>
          </div>
        `;
        }
        if (n.type === 'offer_accepted') {
          const unit = typeof t === 'function' ? t('kg') : 'kg';
          const badgeColor = n.priority === 'Finalized' ? 'var(--success)' : n.priority === 'ActionRequired' ? 'var(--pending)' : 'var(--info)';
          return `
          <div class="card notification-card" data-offer-id="${n.offerId}" style="border-left-color:var(--pending);${n.read ? 'opacity:0.75;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div><strong style="color:var(--pending);" data-i18n="offer accepted">✅ ${t('offer accepted')}</strong></div>
              <div style="display:flex;gap:6px;align-items:center;"><span class="badge" style="background:${badgeColor};color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>${!n.read ? '<span style="width:10px;height:10px;background:var(--danger);border-radius:50%;display:inline-block;"></span>' : ''}</div>
            </div>
            <div style="margin:8px 0;" data-i18n="Offer accepted! Awaiting middleman finalization.">⏳ ${t('Offer accepted! Awaiting middleman finalization.')}</div>
            <div style="margin:8px 0;padding:8px;background:rgba(0,0,0,0.03);border-radius:6px;" data-i18n="Accepted Price: {price} | Qty: {qty}" data-i18n-vars='${JSON.stringify({ price: `₹${n.acceptedPrice}`, qty: `${n.quantity} ${unit}` })}'>💰 <strong>${t('Accepted Price: {price} | Qty: {qty}', { price: `₹${n.acceptedPrice}`, qty: `${n.quantity} ${unit}` })}</strong></div>
            <div class="muted" style="font-size:12px;">📅 ${new Date(n.timestamp).toLocaleString()}</div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
              <button class="btn" data-mark-read="${n.id}" type="button" data-i18n="Mark read">${t('Mark read')}</button>
            </div>
          </div>
        `;
        }
        if (n.type === 'deal_finalized') {
          const badgeColor = n.priority === 'Finalized' ? 'var(--success)' : n.priority === 'ActionRequired' ? 'var(--pending)' : 'var(--info)';
          const unit = typeof t === 'function' ? t('kg') : 'kg';
          const bodyVars = { crop: getCropDisplayName(n.cropName || ''), amount: n.totalAmount ? `₹${n.totalAmount}` : '' };
          const payoutVars = { payout: n.farmerPayout ? `₹${n.farmerPayout}` : '₹0' };
          return `
          <div class="card notification-card" data-offer-id="${n.offerId}" style="border-left-color:var(--success);${n.read ? 'opacity:0.75;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div><strong style="color:var(--success);" data-i18n="deal finalized">🎉 ${t('deal finalized')}</strong></div>
              <div style="display:flex;gap:6px;align-items:center;"><span class="badge" style="background:${badgeColor};color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>${!n.read ? '<span style="width:10px;height:10px;background:var(--danger);border-radius:50%;display:inline-block;"></span>' : ''}</div>
            </div>
            <div style="margin:8px 0;" data-i18n="Deal finalized for {crop} • {amount}" data-i18n-vars='${JSON.stringify(bodyVars)}'>${t('Deal finalized for {crop} • {amount}', bodyVars)}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
              <div>📦 <span data-i18n="Qty">${t('Qty')}</span>: ${n.quantity} ${unit}</div>
              <div>💰 <span data-i18n="Final Price">${t('Final Price')}</span>: ₹${n.finalPrice}/${unit}</div>
              <div>🏙️ <span data-i18n="City">${t('City')}</span>: ${n.city}</div>
              <div>✅ <span data-i18n="Your Payout">${t('Your Payout')}</span>: ${payoutVars.payout}</div>
            </div>
            <div class="muted" style="font-size:12px;margin-top:8px;">📅 ${new Date(n.timestamp).toLocaleString()}</div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
              <button class="btn" data-mark-read="${n.id}" type="button" data-i18n="Mark read">${t('Mark read')}</button>
            </div>
          </div>
        `;
        }
        if (n.type === 'offer_rejected') {
          const badgeColor = n.priority === 'Finalized' ? 'var(--success)' : n.priority === 'ActionRequired' ? 'var(--pending)' : 'var(--info)';
          return `
          <div class="card notification-card" data-offer-id="${n.offerId}" style="border-left-color:var(--danger);${n.read ? 'opacity:0.75;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div><strong style="color:var(--danger);" data-i18n="offer rejected">✗ ${t('offer rejected')}</strong></div>
              <div style="display:flex;gap:6px;align-items:center;"><span class="badge" style="background:${badgeColor};color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>${!n.read ? '<span style="width:10px;height:10px;background:var(--danger);border-radius:50%;display:inline-block;"></span>' : ''}</div>
            </div>
            <div style="margin:8px 0;" data-i18n="Offer was rejected.">✋ ${t('Offer was rejected.')}</div>
            <div class="muted" style="font-size:12px;">📅 ${new Date(n.timestamp).toLocaleString()}</div>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
              <button class="btn" data-mark-read="${n.id}" type="button" data-i18n="Mark read">${t('Mark read')}</button>
            </div>
          </div>
        `;
        }
        if (n.type === 'offer') {
          const offer = getOffers().find(o => o.offerId === n.offerId);
          if (!offer) {
            const unit = typeof t === 'function' ? t('kg') : 'kg';
            const priceVal = n.offeredPrice ? `₹${n.offeredPrice}` : '₹0';
            const qtyVal = n.quantity ? `${n.quantity} ${unit}` : `0 ${unit}`;
            return `
            <div class="card notification-card" data-offer-id="${n.offerId || ''}" style="border-left-color:var(--info);${n.read ? 'opacity:0.75;' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div><strong style="color:var(--info);" data-i18n="New Offer from Buyer">🛒 ${t('New Offer from Buyer')}</strong></div>
                <div style="display:flex;gap:6px;align-items:center;"><span class="badge" style="background:var(--info);color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>${!n.read ? '<span style="width:10px;height:10px;background:var(--danger);border-radius:50%;display:inline-block;"></span>' : ''}</div>
              </div>
              <div style="margin:8px 0;">👤 <strong>${n.buyerId || t('Buyer')}</strong></div>
              <div style="margin:8px 0;padding:8px;background:rgba(0,0,0,0.03);border-radius:6px;" data-i18n="Offered Price: {price} | Qty: {qty}" data-i18n-vars='${JSON.stringify({ price: priceVal, qty: qtyVal })}'>💰 <strong>${t('Offered Price: {price} | Qty: {qty}', { price: priceVal, qty: qtyVal })}</strong></div>
              <div class="muted" style="font-size:12px;">⚠️ ${t('Offer details unavailable. Refresh or check buyer offers.')}</div>
              <div class="muted" style="font-size:12px;margin-top:6px;">📅 ${new Date(n.timestamp).toLocaleString()}</div>
              <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
                <button class="btn" data-mark-read="${n.id}" type="button" data-i18n="Mark read">${t('Mark read')}</button>
              </div>
            </div>
          `;
          }

          // Don't show resolved offers (only show pending/countered)
          if (offer.status === 'Accepted' || offer.status === 'Rejected' || offer.status === 'Finalized') {
            return '';
          }

          const counterInputs = offer.status === 'OfferPlaced' ? `
          <div class="offer-row" style="margin-top:10px;">
            <input type="number" min="1" step="0.01" placeholder="${t('Counter price (₹)')}" data-i18n-placeholder="Counter price (₹)" data-counter-price value="${n.offeredPrice || ''}" />
            <input type="number" min="0.1" step="0.1" placeholder="${t('Qty')} (${unitLabel})" data-i18n-placeholder="Qty ({unit})" data-i18n-vars='${JSON.stringify({ unit: unitLabel })}' data-counter-qty value="${n.quantity || ''}" />
          </div>
        ` : '';
          const actionButtons = offer.status === 'OfferPlaced' ? `
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn-primary" data-offer-id="${n.offerId}" data-action="accept" data-i18n="Accept">✓ ${t('Accept')}</button>
            <button class="btn-secondary" data-offer-id="${n.offerId}" data-action="counter" data-i18n="Counter">💬 ${t('Counter')}</button>
            <button class="btn-danger" data-offer-id="${n.offerId}" data-action="reject" data-i18n="Reject">✗ ${t('Reject')}</button>
            <button class="btn" data-mark-read="${n.id}" type="button" data-i18n="Mark read">${t('Mark read')}</button>
          </div>
        ` : '';

          return `
          <div class="card notification-card" data-offer-id="${n.offerId}" data-offer-card style="border-left-color:var(--info);${n.read ? 'opacity:0.75;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div><strong style="color:var(--info);" data-i18n="New Offer from Buyer">🛒 ${t('New Offer from Buyer')}</strong></div>
              <div style="display:flex;gap:6px;align-items:center;"><span class="badge" style="background:var(--info);color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>${!n.read ? '<span style="width:10px;height:10px;background:var(--danger);border-radius:50%;display:inline-block;"></span>' : ''}</div>
            </div>
            <div style="margin:8px 0;">👤 <strong>${n.buyerId}</strong></div>
            <div style="margin:8px 0;padding:8px;background:rgba(0,0,0,0.03);border-radius:6px;" data-i18n="Offered Price: {price} | Qty: {qty}" data-i18n-vars='${JSON.stringify({ price: `₹${n.offeredPrice}`, qty: `${n.quantity} ${unitLabel}` })}'>💰 <strong>${t('Offered Price: {price} | Qty: {qty}', { price: `₹${n.offeredPrice}`, qty: `${n.quantity} ${unitLabel}` })}</strong></div>
            <div class="muted" style="font-size:12px;">📅 ${new Date(n.timestamp).toLocaleString()}</div>
            ${counterInputs}
            ${actionButtons}
            ${offer.status === 'Countered' ? `<div style="color:var(--pending);margin-top:8px;font-size:13px;" data-i18n="Waiting for buyer response...">⏳ ${t('Waiting for buyer response...')}</div>` : ''}
          </div>
        `;
        }
        return `
        <div class="card notification-card" style="border-left-color:var(--primary);${n.read ? 'opacity:0.75;' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div><strong data-i18n="Notification">${t('Notification')}</strong></div>
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="badge" style="background:var(--info);color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>
              ${!n.read ? '<span style="width:10px;height:10px;background:var(--danger);border-radius:50%;display:inline-block;"></span>' : ''}
            </div>
          </div>
          <div style="margin:8px 0;">${n.message || n.type || ''}</div>
          <div class="muted" style="font-size:12px;">📅 ${new Date(n.timestamp).toLocaleString()}</div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn" data-mark-read="${n.id}" type="button" data-i18n="Mark read">${t('Mark read')}</button>
          </div>
        </div>
      `;
      }).filter(Boolean);

    if (!cards.length) {
      const emptyTitle = notificationFilter === 'action' ? 'No action required' : 'No unread notifications';
      const emptyMsg = notificationFilter === 'action'
          ? 'No offers or actions need your attention right now.'
          : 'You are all caught up.';
      container.innerHTML = filtersHtml + renderEmptyState('🔔', emptyTitle, emptyMsg);
      bindOfferActions();
      return;
    }

    container.innerHTML = filtersHtml + `<div class="notification-stack">${cards.join('')}</div>`;
    bindOfferActions();
  };
  withLoadingSkeleton(container, 'list', doRender);
}

function setNotificationFilter(filter) {
  notificationFilter = filter;
  renderNotifications();
}

function markAllFarmerNotificationsRead() {
  const farmerId = getActiveFarmerId();
  if (!farmerId) return;
  markAllNotificationsRead(n => n.farmerId === farmerId && (!n.audience || n.audience === 'farmer'));
  renderNotifications();
}

// ==================== DEMO TOOLS ====================
function initDemoTools(role) {
  const map = {
    farmer: { seed: 'demoSeedBtnFarmer', status: 'demoStatusFarmer' }
  }[role];
  if (!map) return;
  const seedBtn = document.getElementById(map.seed);
  const statusEl = document.getElementById(map.status);

  const runSeed = () => {
    const res = seedDemoData();
    if (statusEl) {
      const key = res?.seeded ? 'Demo data seeded.' : 'Seed skipped - data exists.';
      statusEl.setAttribute('data-i18n', key);
      statusEl.textContent = typeof t === 'function' ? t(key) : key;
    }
    renderMyListings();
    renderBuyerOffers();
    renderBuyerOffersSummary();
    renderNotifications();
    renderSoldDeals();
    renderFarmerAnalytics();
    renderFarmerInsights();
  };

  if (seedBtn) seedBtn.addEventListener('click', runSeed);

  // Dev-only QA harness panel
  if (typeof initQAMode === 'function') {
    initQAMode(role);
  }
}

function toggleGuidedDemoFarmer(statusEl) {
  const steps = [
    { selector: '[data-demo-step="farmer-list"]', key: 'Step 1: Farmer lists produce' },
    { selector: '[data-demo-step="middleman-listings"]', key: 'Step 2: Middleman approves listings' },
    { selector: '[data-demo-step="buyer-listings"]', key: 'Step 3: Buyer places offer' },
    { selector: '[data-demo-step="middleman-finalize"]', key: 'Step 4: Middleman finalizes trade' }
  ];

  if (demoTimerFarmer) {
    clearInterval(demoTimerFarmer);
    demoTimerFarmer = null;
    clearDemoHighlights();
    if (statusEl) {
      statusEl.setAttribute('data-i18n', 'Guided demo stopped.');
      statusEl.textContent = typeof t === 'function' ? t('Guided demo stopped.') : 'Guided demo stopped.';
    }
    return;
  }

  let idx = 0;
  demoTimerFarmer = setInterval(() => {
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

function renderFarmerAnalytics() {
  renderFarmerInsights();
  const listings = getFarmerListings();
  const transactions = getFarmerTransactions();
  const totalListings = listings.length;
  const pending = listings.filter(l => l.status === 'Pending').length;
  const approved = listings.filter(l => l.status === 'Approved').length;
  const totalQty = listings.reduce((s, l) => s + (Number(l.quantity) || 0), 0);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (typeof animateNumber === 'function' && typeof val === 'number') {
      animateNumber(id, val);
    } else {
      el.textContent = val;
    }
  };

  set('statTotalListings', totalListings);
  set('statPending', pending);
  set('statApproved', approved);

  const qtyEl = document.getElementById('statQuantity');
  if (qtyEl) {
    if (typeof animateNumber === 'function') {
      animateNumber('statQuantity', totalQty);
    } else {
      qtyEl.textContent = `${totalQty} kg`;
    }
  }
}

function renderFarmerInsights() {
  const container = document.getElementById('farmerInsightsContainer');
  if (!container) return;
  const txns = getFarmerTransactions();
  const latestTxn = txns[0];
  const listings = getFarmerListings();
  const fallbackListing = listings[0];
  const citySelect = document.getElementById('farmerMarketCitySelect');
  const cropSelect = document.getElementById('farmerMarketCropSelect');
  const rangeSelect = document.getElementById('farmerMarketRangeSelect');
  const city = (citySelect?.value || latestTxn?.city || fallbackListing?.city || 'Pune').trim();
  const crop = (cropSelect?.value || latestTxn?.cropName || fallbackListing?.name || 'Onion').trim();
  const rangeDays = Number(rangeSelect?.value || farmerMarketRange || 7) || 7;
  if (citySelect && city && !citySelect.value) citySelect.value = city;
  if (cropSelect && crop && !cropSelect.value) cropSelect.value = crop;
  const cropDisplay = getCropDisplayName(crop);
  const comparison = computeFarmerVsMarketAvg(getActiveFarmerId(), city, crop);
  const farmerId = getActiveFarmerId();
  const trend = computeTrend(city, crop, rangeDays, t => String(t.farmerId || '') === String(farmerId));
  const trendMarket = computeTrend(city, crop, rangeDays, null);
  const trend7 = computeTrend(city, crop, 7, t => String(t.farmerId || '') === String(farmerId));
  const trend30 = computeTrend(city, crop, 30, t => String(t.farmerId || '') === String(farmerId));

  const directionKey = comparison.diffPct >= 0 ? 'Above market avg' : 'Below market avg';
  const performanceHtml = comparison.marketAvg
    ? `<span class="performance-indicator ${comparison.diffPct >= 0 ? 'up' : 'down'}"><span data-i18n="${directionKey}">${t(directionKey)}</span> <span data-i18n="by {pct}%" data-i18n-vars='${JSON.stringify({ pct: Math.abs(comparison.diffPct) })}'>${t('by {pct}%', { pct: Math.abs(comparison.diffPct) })}</span></span>`
    : `<span data-i18n="Awaiting market data">${t('Awaiting market data')}</span>`;
  container.innerHTML = `
    <div class="insight-card accent-farmer">
      <div class="insight-label" data-i18n="Your Avg Sold Rate">${t('Your Avg Sold Rate')}</div>
      <div class="insight-value">₹${comparison.farmerAvg.toFixed(2)}</div>
    </div>
    <div class="insight-card accent-market">
      <div class="insight-label" data-i18n="Market Avg ({city} • {crop})" data-i18n-vars='${JSON.stringify({ city, crop: cropDisplay })}'>${t('Market Avg ({city} • {crop})', { city, crop: cropDisplay })}</div>
      <div class="insight-value">₹${comparison.marketAvg.toFixed(2)}</div>
    </div>
    <div class="insight-card accent-performance">
      <div class="insight-label" data-i18n="Performance">${t('Performance')}</div>
      <div class="insight-value" style="font-size:15px;">${performanceHtml}</div>
    </div>
    <div class="insight-card">
      <div class="insight-label" data-i18n="Avg sold rate (7d / 30d)">${t('Avg sold rate (7d / 30d)')}</div>
      <div class="insight-value" style="font-size:16px;">₹${((trend7.values.reduce((s, v) => s + v, 0) / (trend7.values.length || 1)) || 0).toFixed(2)} / ₹${((trend30.values.reduce((s, v) => s + v, 0) / (trend30.values.length || 1)) || 0).toFixed(2)}</div>
    </div>
  `;

  const smartContainer = document.getElementById('farmerSmartInsights');
  if (smartContainer) {
    const farmerId = getActiveFarmerId();
    const offers = getFarmerOffers();
    const inProgress = offers.filter(o => ['OfferPlaced', 'Countered', 'Accepted'].includes(o.status)).length;
    const soldTxns = typeof getSoldTransactions === 'function' ? getSoldTransactions() : txns;
    const farmerTxns = soldTxns.filter(t => String(t.farmerId || '') === String(farmerId));
    const cropStats = {};
    const cityStats = {};
    farmerTxns.forEach(t => {
      const cropName = t.cropName || t.commodity || t.name || '—';
      const cityName = t.city || '—';
      const qty = Number(t.quantity || t.qty || 0);
      const total = Number(t.totalAmount || (t.finalPrice || t.finalRate || 0) * qty || 0);
      cropStats[cropName] = (cropStats[cropName] || 0) + qty;
      cityStats[cityName] = (cityStats[cityName] || 0) + total;
    });
    if (!farmerTxns.length) {
      listings.forEach(l => {
        const cropName = l.name || l.commodity || '—';
        const cityName = l.city || '—';
        cropStats[cropName] = (cropStats[cropName] || 0) + 1;
        cityStats[cityName] = (cityStats[cityName] || 0) + 1;
      });
    }
    const bestCrop = Object.entries(cropStats).sort((a, b) => b[1] - a[1])[0]?.[0] || t('No data yet');
    const topCity = Object.entries(cityStats).sort((a, b) => b[1] - a[1])[0]?.[0] || t('No data yet');
    smartContainer.innerHTML = `
      <div class="smart-card">
        <span class="smart-icon">🌾</span>
        <div>
          <h4 data-i18n="Best Selling Crop">${t('Best Selling Crop')}</h4>
          <div class="smart-value">${bestCrop}</div>
          <div class="muted" style="font-size:12px;" data-i18n="Based on recent sales"> ${t('Based on recent sales')}</div>
        </div>
      </div>
      <div class="smart-card">
        <span class="smart-icon">🏙️</span>
        <div>
          <h4 data-i18n="Top City">${t('Top City')}</h4>
          <div class="smart-value">${topCity}</div>
          <div class="muted" style="font-size:12px;" data-i18n="Highest demand signal">${t('Highest demand signal')}</div>
        </div>
      </div>
      <div class="smart-card">
        <span class="smart-icon">🧾</span>
        <div>
          <h4 data-i18n="Orders in Progress">${t('Orders in Progress')}</h4>
          <div class="smart-value">${inProgress}</div>
          <div class="muted" style="font-size:12px;" data-i18n="Offers awaiting action">${t('Offers awaiting action')}</div>
        </div>
      </div>
    `;
  }

  try {
    const canvas = document.getElementById('farmerTrendChart');
    const emptyEl = document.getElementById('farmerTrendEmpty');
    const metaEl = document.getElementById('farmerTrendMeta');
    if (canvas) {
      if (!trend.sampleSize && !trendMarket.sampleSize) {
        if (emptyEl) {
          emptyEl.style.display = 'block';
          emptyEl.setAttribute('data-i18n', 'Complete sales to view your recent price trajectory.');
          emptyEl.textContent = t('Complete sales to view your recent price trajectory.');
        }
        if (metaEl) {
          metaEl.innerHTML = `<span class="chart-chip" data-i18n="No trend data yet">${t('No trend data yet')}</span>`;
        }
        if (canvas.__chart) canvas.__chart.destroy();
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';
      const labels = trend.labels.length ? trend.labels : trendMarket.labels;
      if (metaEl) {
        const lastFarmer = trend.values.length ? trend.values[trend.values.length - 1] : null;
        const lastMarket = trendMarket.values.length ? trendMarket.values[trendMarket.values.length - 1] : null;
        const farmerVal = Number.isFinite(lastFarmer) ? `₹${Number(lastFarmer).toFixed(2)}/kg` : '—';
        const marketVal = Number.isFinite(lastMarket) ? `₹${Number(lastMarket).toFixed(2)}/kg` : '—';
        metaEl.innerHTML = `
          <span class="chart-chip" data-i18n="Your Price: {price}" data-i18n-vars='${JSON.stringify({ price: farmerVal })}'>${t('Your Price: {price}', { price: farmerVal })}</span>
          <span class="chart-chip" data-i18n="Market Average: {price}" data-i18n-vars='${JSON.stringify({ price: marketVal })}'>${t('Market Average: {price}', { price: marketVal })}</span>
        `;
      }
      const datasets = [
        {
          label: 'Your Avg Sold Rate',
          data: trend.values,
          borderColor: 'rgba(82, 212, 122, 1)',
          backgroundColor: 'rgba(82, 212, 122, 0.2)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Market Avg Price',
          data: trendMarket.values,
          borderColor: 'rgba(46, 196, 255, 1)',
          backgroundColor: 'rgba(46, 196, 255, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ];
      if (typeof lazyRenderChart === 'function') {
        lazyRenderChart('farmerTrendChart', () => {
          if (typeof renderTopCropsTrend === 'function') {
            renderTopCropsTrend('farmerTrendChart');
          } else {
            renderMultiLineChart('farmerTrendChart', labels, datasets, { yTitle: '₹/kg' });
          }
        });
        lazyRenderChart('demandHeatmapChart', () => {
          if (typeof renderDemandHeatmap === 'function') {
            renderDemandHeatmap('demandHeatmapChart');
          }
        });
      } else {
        if (typeof renderTopCropsTrend === 'function') {
          renderTopCropsTrend('farmerTrendChart');
        } else {
          renderMultiLineChart('farmerTrendChart', labels, datasets, { yTitle: '₹/kg' });
        }
        if (typeof renderDemandHeatmap === 'function') {
          renderDemandHeatmap('demandHeatmapChart');
        }
      }
    }
  } catch (e) {
    console.error(`${FARMER_LOG_PREFIX} renderFarmerInsights chart failed`, e);
  }
}

function acceptOfferAction(offerId, btn = null) {
  const startedAt = Date.now();
  emitFarmerUiMetric('farmer_accept_offer', 'task_start', { offerId });
  if (!offerId) {
    emitFarmerUiMetric('farmer_accept_offer', 'validation_error', { reason: 'offer_id_missing' });
    alert(t('Error: No offer ID provided'));
    if (btn) clearBtnLoading(btn);
    return;
  }

  const guard = canAcceptOffer(offerId);
  if (!guard.can) {
    emitFarmerUiMetric('farmer_accept_offer', 'validation_error', { offerId, reason: guard.reason || 'guard_failed' });
    alert(t('Cannot accept: {reason}', { reason: guard.reason }));
    if (btn) clearBtnLoading(btn);
    offerActionLocks.delete(`accept-${offerId}`);
    return;
  }

  const result = acceptOffer(offerId, 'farmer');
  if (result) {
    emitFarmerUiMetric('farmer_accept_offer', 'task_complete', { offerId }, Date.now() - startedAt);
    alert(t('Offer accepted! Awaiting middleman finalization.'));
    markNotificationsForOffer(offerId);
    renderNotifications();
    renderBuyerOffers();
    renderMyListings();
    renderFarmerAnalytics();
  } else {
    emitFarmerUiMetric('farmer_accept_offer', 'ui_error', { offerId, reason: 'accept_offer_failed' });
    alert(t('Error accepting offer. Please try again.'));
    console.error('acceptOffer returned null for:', offerId);
    if (btn) clearBtnLoading(btn);
  }
  offerActionLocks.delete(`accept-${offerId}`);
}

async function rejectOfferAction(offerId, btn = null) {
  const startedAt = Date.now();
  emitFarmerUiMetric('farmer_reject_offer', 'task_start', { offerId });
  if (!offerId) {
    emitFarmerUiMetric('farmer_reject_offer', 'validation_error', { reason: 'offer_id_missing' });
    alert(t('Error: No offer ID provided'));
    if (btn) clearBtnLoading(btn);
    return;
  }

  const guard = canRejectOffer(offerId);
  if (!guard.can) {
    emitFarmerUiMetric('farmer_reject_offer', 'validation_error', { offerId, reason: guard.reason || 'guard_failed' });
    alert(t('Cannot reject: {reason}', { reason: guard.reason }));
    if (btn) clearBtnLoading(btn);
    offerActionLocks.delete(`reject-${offerId}`);
    return;
  }

  if (typeof farmaConfirm !== 'function') {
    emitFarmerUiMetric('farmer_reject_offer', 'ui_error', { offerId, reason: 'dialog_unavailable' });
    if (btn) clearBtnLoading(btn);
    offerActionLocks.delete(`reject-${offerId}`);
    return;
  }

  const ok = await farmaConfirm(t('Reject this offer? You can still make a counter offer instead.'));
  if (!ok) {
    emitFarmerUiMetric('farmer_reject_offer', 'abandon', { offerId });
    if (btn) clearBtnLoading(btn);
    offerActionLocks.delete(`reject-${offerId}`);
    return;
  }
  const result = rejectOffer(offerId, 'farmer');
  if (result) {
    emitFarmerUiMetric('farmer_reject_offer', 'task_complete', { offerId }, Date.now() - startedAt);
    alert(t('Offer rejected'));
    markNotificationsForOffer(offerId);
    renderNotifications();
    renderBuyerOffers();
    renderMyListings();
    renderFarmerAnalytics();
  } else {
    emitFarmerUiMetric('farmer_reject_offer', 'ui_error', { offerId, reason: 'reject_offer_failed' });
    alert(t('Error rejecting offer'));
    if (btn) clearBtnLoading(btn);
  }
  offerActionLocks.delete(`reject-${offerId}`);
}

function counterOfferAction(offerId, btn = null) {
  const startedAt = Date.now();
  emitFarmerUiMetric('farmer_counter_offer', 'task_start', { offerId });
  if (!offerId) {
    emitFarmerUiMetric('farmer_counter_offer', 'validation_error', { reason: 'offer_id_missing' });
    alert(t('Error: No offer ID provided'));
    if (btn) clearBtnLoading(btn);
    return;
  }

  const guard = canCounterOffer(offerId);
  if (!guard.can) {
    emitFarmerUiMetric('farmer_counter_offer', 'validation_error', { offerId, reason: guard.reason || 'guard_failed' });
    alert(t('Cannot counter: {reason}', { reason: guard.reason }));
    if (btn) clearBtnLoading(btn);
    offerActionLocks.delete(`counter-${offerId}`);
    return;
  }

  const offer = getOffers().find(o => o.offerId === offerId);
  const card = btn ? btn.closest('[data-offer-card]') : null;
  const priceInput = card ? card.querySelector('[data-counter-price]') : null;
  const qtyInput = card ? card.querySelector('[data-counter-qty]') : null;
  const listing = offer ? getListings().find(l => l.listingId === offer.listingId) : null;

  let priceVal = priceInput ? priceInput.value.trim() : '';
  let qtyVal = qtyInput ? qtyInput.value.trim() : '';

  if (!priceVal) {
    emitFarmerUiMetric('farmer_counter_offer', 'validation_error', { offerId, field: 'counterPrice' });
    alert(t('Please enter a counter price'));
    if (btn) clearBtnLoading(btn);
    offerActionLocks.delete(`counter-${offerId}`);
    return;
  }

  const price = Number(priceVal);
  if (!Number.isFinite(price) || price <= 0) {
    emitFarmerUiMetric('farmer_counter_offer', 'validation_error', { offerId, field: 'counterPrice' });
    alert(t('Invalid price. Must be greater than 0.'));
    if (btn) clearBtnLoading(btn);
    offerActionLocks.delete(`counter-${offerId}`);
    return;
  }

  let qty = null;
  if (qtyVal) {
    const qtyNum = Number(qtyVal);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      emitFarmerUiMetric('farmer_counter_offer', 'validation_error', { offerId, field: 'counterQty' });
      alert(t('Quantity must be a valid number greater than 0'));
      if (btn) clearBtnLoading(btn);
      offerActionLocks.delete(`counter-${offerId}`);
      return;
    }
    if (listing && Number.isFinite(listing.quantity) && qtyNum > listing.quantity) {
      emitFarmerUiMetric('farmer_counter_offer', 'validation_error', { offerId, field: 'counterQty', reason: 'exceeds_listing_quantity' });
      alert(t('Quantity exceeds listing availability'));
      if (btn) clearBtnLoading(btn);
      offerActionLocks.delete(`counter-${offerId}`);
      return;
    }
    qty = qtyNum;
  }

  const result = counterOfferPrice(offerId, price, qty);
  if (result) {
    emitFarmerUiMetric('farmer_counter_offer', 'task_complete', { offerId, price, qty: qty === null ? undefined : qty }, Date.now() - startedAt);
    alert(t('Counter offer sent at {price}.\nWaiting for buyer response...', { price: `₹${price}` }));
    markNotificationsForOffer(offerId);
    renderNotifications();
    renderBuyerOffers();
    renderMyListings();
    renderFarmerAnalytics();
  } else {
    emitFarmerUiMetric('farmer_counter_offer', 'ui_error', { offerId, reason: 'counter_offer_failed' });
    alert(t('Error sending counter offer'));
    console.error('counterOfferPrice returned null for:', offerId);
    if (btn) clearBtnLoading(btn);
  }
  offerActionLocks.delete(`counter-${offerId}`);
}

function acceptCounterOffer(offerId) {
  if (!offerId) {
    alert(t('Error: No offer ID provided'));
    return;
  }

  const offer = getOffers().find(o => o.offerId === offerId);
  if (!offer) {
    alert(t('Offer not found'));
    return;
  }

  if (offer.status !== 'Countered') {
    alert(t('This is not a countered offer'));
    return;
  }

  const result = acceptOffer(offerId, 'farmer');
  if (result) {
    alert(t('Your counter offer was accepted! Awaiting middleman finalization.'));
    renderNotifications();
    renderMyListings();
    renderFarmerAnalytics();
  } else {
    alert(t('Error accepting counter offer'));
  }
}

function toIsoDateKey(date) {
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

function getWeekStartIsoKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return toIsoDateKey(d);
}

function getMonthKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function buildFarmerEarningsTrend(transactions, mode) {
  const txns = Array.isArray(transactions) ? transactions : [];
  const buckets = {};
  txns.forEach(t => {
    const payout = Number(t.farmerPayout || 0);
    if (!payout) return;
    const ts = t.timestamp || t.createdAt || '';
    const key = mode === 'monthly' ? getMonthKey(ts) : mode === 'weekly' ? getWeekStartIsoKey(ts) : toIsoDateKey(ts);
    if (!key) return;
    buckets[key] = (buckets[key] || 0) + payout;
  });

  const labels = [];
  const values = [];
  if (mode === 'monthly') {
    const months = 12;
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = getMonthKey(d);
      labels.push(key);
      values.push(parseFloat(((buckets[key] || 0)).toFixed(2)));
    }
    return { labels, values };
  }
  if (mode === 'weekly') {
    const weeks = 10;
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const key = getWeekStartIsoKey(d);
      labels.push(key);
      values.push(parseFloat(((buckets[key] || 0)).toFixed(2)));
    }
    return { labels, values };
  }

  // daily
  const days = 14;
  for (let i = days - 1; i >= 0; i--) {
    const key = toIsoDateKey(Date.now() - i * 24 * 60 * 60 * 1000);
    labels.push(key);
    values.push(parseFloat(((buckets[key] || 0)).toFixed(2)));
  }
  return { labels, values };
}

function renderFarmerEarningsTrendChart(transactions) {
  const canvas = document.getElementById('farmerEarningsTrendChart');
  if (!canvas) return;
  const mode = farmerSalesTrendMode === 'monthly' ? 'monthly' : farmerSalesTrendMode === 'daily' ? 'daily' : 'weekly';
  const trend = buildFarmerEarningsTrend(transactions, mode);
  const hasData = (trend.values || []).some(v => Number(v) > 0);
  if (!hasData) {
    const parent = canvas.parentElement;
    if (parent) parent.innerHTML = renderEmptyState('📉', 'No earnings trend yet', 'Finalize a deal to see your earnings over time.');
    return;
  }
  const labelKey = mode === 'monthly' ? 'Monthly Net Earnings (₹)' : mode === 'daily' ? 'Daily Net Earnings (₹)' : 'Weekly Net Earnings (₹)';
  if (typeof lazyRenderChart === 'function') {
    lazyRenderChart('farmerEarningsTrendChart', () => renderBarChart('farmerEarningsTrendChart', trend.labels, trend.values, labelKey));
  } else {
    renderBarChart('farmerEarningsTrendChart', trend.labels, trend.values, labelKey);
  }
}

function renderFarmerSalesComparisonChart() {
  const canvas = document.getElementById('farmerSalesComparisonChart');
  if (!canvas) return;
  const farmerId = getActiveFarmerId();
  const farmerTrend = farmerId
    ? computeTrend(null, null, 14, t => String(t.farmerId || '') === String(farmerId))
    : { labels: [], values: [], sampleSize: 0 };
  const marketTrend = computeTrend(null, null, 14, null);
  if (!farmerTrend.sampleSize && !marketTrend.sampleSize) {
    if (canvas.parentElement) {
      canvas.parentElement.innerHTML = renderEmptyState('📉', 'No sales trend yet', 'Finalize trades to compare your pricing with the market.');
    }
    return;
  }
  const labels = farmerTrend.labels.length ? farmerTrend.labels : marketTrend.labels;
  const datasets = [
    {
      label: 'Your Avg Sold Rate',
      data: farmerTrend.values,
      borderColor: 'rgba(82, 212, 122, 1)',
      backgroundColor: 'rgba(82, 212, 122, 0.18)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 6
    },
    {
      label: 'Market Avg Price',
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
    lazyRenderChart('farmerSalesComparisonChart', () => renderMultiLineChart('farmerSalesComparisonChart', labels, datasets, { yTitle: '₹/kg' }));
  } else {
    renderMultiLineChart('farmerSalesComparisonChart', labels, datasets, { yTitle: '₹/kg' });
  }
}

function sortSalesTransactions(transactions) {
  const dir = farmerSalesSort.dir === 'asc' ? 1 : -1;
  const key = farmerSalesSort.key;
  return transactions.slice().sort((a, b) => {
    const getVal = (txn) => {
      if (key === 'transactionId') return String(txn.transactionId || txn.id || '');
      if (key === 'city') return String(txn.city || '');
      if (key === 'crop') return String(txn.cropName || txn.name || '');
      if (key === 'price') return Number(txn.finalPrice || txn.finalRate || 0);
      if (key === 'earnings') return Number(txn.farmerPayout || 0);
      return new Date(txn.timestamp || txn.createdAt || 0).getTime();
    };
    const aVal = getVal(a);
    const bVal = getVal(b);
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dir;
    }
    return String(aVal).localeCompare(String(bVal)) * dir;
  });
}

function bindSalesTableSort(container) {
  if (!container) return;
  const headers = container.querySelectorAll('[data-sort-key]');
  headers.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort-key');
      if (!key) return;
      if (farmerSalesSort.key === key) {
        farmerSalesSort.dir = farmerSalesSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        farmerSalesSort.key = key;
        farmerSalesSort.dir = 'asc';
      }
      renderSoldDeals();
    });
  });
}

function renderSoldDeals() {
  const container = document.getElementById('soldDealsContainer');
  if (!container) return;
  const transactions = getFarmerTransactions();
  const unitLabel = typeof t === 'function' ? t('kg') : 'kg';
  if (!transactions.length) {
    container.innerHTML = renderEmptyState('📊', 'No Sold Deals Yet', 'Completed transactions will appear here. Approved listings typically receive buyer interest soon.');
    return;
  }
  const gross = transactions.reduce((s, t) => s + (t.totalAmount || 0), 0);
  const commission = transactions.reduce((s, t) => s + (t.commissionAmount || 0), 0);
  const net = transactions.reduce((s, t) => s + (t.farmerPayout || 0), 0);
  const dealsCount = transactions.length;
  const totalQty = transactions.reduce((s, t) => s + (Number(t.quantity) || 0), 0);
  const byCrop = {};
  transactions.forEach(txn => {
    const crop = txn.cropName || txn.name || 'Produce';
    if (!byCrop[crop]) byCrop[crop] = { crop, gross: 0, net: 0, qty: 0, deals: 0 };
    byCrop[crop].gross += Number(txn.totalAmount || 0);
    byCrop[crop].net += Number(txn.farmerPayout || 0);
    byCrop[crop].qty += Number(txn.quantity || 0);
    byCrop[crop].deals += 1;
  });
  const topProducts = Object.values(byCrop).sort((a, b) => b.gross - a.gross).slice(0, 5);
  const comparison = computeFarmerVsMarketAvg(getActiveFarmerId());
  const varianceKey = comparison.diffPct >= 0 ? 'above' : 'below';
  const varianceHtml = comparison.marketAvg
    ? `<span data-i18n="${varianceKey}">${t(varianceKey)}</span> <span data-i18n="market avg">${t('market avg')}</span> (${comparison.diffPct}%)`
    : `<span data-i18n="market data pending">${t('market data pending')}</span>`;

  const summary = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px;">
      <div class="card" style="padding:12px;background:rgba(76,175,80,0.08);border:1px dashed rgba(76,175,80,0.3);"><div class="muted" style="font-size:12px;" data-i18n="Gross Sales">${t('Gross Sales')}</div><div style="font-size:20px;font-weight:700;">₹${gross.toFixed(2)}</div></div>
      <div class="card" style="padding:12px;background:rgba(255,193,7,0.08);border:1px dashed rgba(255,193,7,0.4);"><div class="muted" style="font-size:12px;" data-i18n="Commission">${t('Commission')}</div><div style="font-size:20px;font-weight:700;">₹${commission.toFixed(2)}</div></div>
      <div class="card" style="padding:12px;background:rgba(33,150,243,0.08);border:1px dashed rgba(33,150,243,0.4);"><div class="muted" style="font-size:12px;" data-i18n="Net Payout">${t('Net Payout')}</div><div style="font-size:20px;font-weight:700;">₹${net.toFixed(2)}</div></div>
      <div class="card" style="padding:12px;background:rgba(59,130,246,0.08);border:1px dashed rgba(59,130,246,0.4);">
        <div class="muted" style="font-size:12px;" data-i18n="Products Sold">${t('Products Sold')}</div>
        <div style="font-size:20px;font-weight:700;">${dealsCount}</div>
        <div class="muted" style="font-size:12px;" data-i18n="Qty: {qty} {unit}" data-i18n-vars='${JSON.stringify({ qty: totalQty, unit: unitLabel })}'>${t('Qty: {qty} {unit}', { qty: totalQty, unit: unitLabel })}</div>
      </div>
      <div class="card" style="padding:12px;background:rgba(156,39,176,0.08);border:1px dashed rgba(156,39,176,0.4);">
        <div class="muted" style="font-size:12px;" data-i18n="Performance">${t('Performance')}</div>
        <div style="font-size:14px;font-weight:700;"><span data-i18n="You sold">${t('You sold')}</span> ${varianceHtml}</div>
      </div>
    </div>
  `;

  const topProductsHtml = topProducts.length
    ? topProducts.map((p, idx) => {
      const cropDisplay = getCropDisplayName(p.crop);
      const grossVal = `₹${p.gross.toFixed(2)}`;
      const netVal = `₹${p.net.toFixed(2)}`;
      const qtyVal = `${p.qty} ${unitLabel}`;
      const netRowVars = { net: netVal, qty: qtyVal };
      return `
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;">
          <span>🌾 ${idx + 1}. ${cropDisplay}</span>
          <strong>${grossVal}</strong>
        </div>
        <div class="muted" style="font-size:12px;margin-bottom:8px;" data-i18n="Net: {net} • Qty: {qty}" data-i18n-vars='${JSON.stringify(netRowVars)}'>${t('Net: {net} • Qty: {qty}', netRowVars)}</div>
      `;
    }).join('')
    : `<div class="muted" data-i18n="No sales yet">${t('No sales yet')}</div>`;

  const analytics = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:12px;">
      <div class="card" style="padding:12px;">
        <div style="font-weight:600;margin-bottom:8px;" data-i18n="Top-selling products">${t('Top-selling products')}</div>
        ${topProductsHtml}
      </div>
      <div class="card" style="padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <div style="font-weight:600;" data-i18n="Earnings Trend">${t('Earnings Trend')}</div>
          <select id="farmerSalesTrendMode" style="padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);">
            <option value="daily" data-i18n="Daily">${t('Daily')}</option>
            <option value="weekly" data-i18n="Weekly">${t('Weekly')}</option>
            <option value="monthly" data-i18n="Monthly">${t('Monthly')}</option>
          </select>
        </div>
        <div style="height:240px;">
          <canvas id="farmerEarningsTrendChart"></canvas>
        </div>
        <div class="muted" style="font-size:12px;margin-top:8px;" data-i18n="Net earnings after commission">${t('Net earnings after commission')}</div>
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-weight:600;margin-bottom:8px;" data-i18n="Sales Trend vs Market">${t('Sales Trend vs Market')}</div>
        <div style="height:240px;">
          <canvas id="farmerSalesComparisonChart"></canvas>
        </div>
        <div class="muted" style="font-size:12px;margin-top:8px;" data-i18n="Compare your pricing with market averages">${t('Compare your pricing with market averages')}</div>
      </div>
    </div>
  `;

  const sortedTxns = sortSalesTransactions(transactions);
  const sortLabelMap = {
    transactionId: t('Transaction ID'),
    city: t('City'),
    crop: t('Crop'),
    price: t('Price per kg'),
    earnings: t('Earnings')
  };
  const sortLabel = sortLabelMap[farmerSalesSort.key] || farmerSalesSort.key;
  const salesTable = `
    <div class="card" style="padding:12px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
        <div style="font-weight:600;" data-i18n="Recent Sales">Recent Sales</div>
        <div class="muted" style="font-size:12px;" data-i18n="Sorted by {key}" data-i18n-vars='${JSON.stringify({ key: sortLabel })}'>${t('Sorted by {key}', { key: sortLabel })}</div>
      </div>
      <div class="table-wrapper">
        <table class="data-table sales-table">
          <thead>
            <tr>
              <th data-sort-key="transactionId" class="${farmerSalesSort.key === 'transactionId' ? 'sort-active' : ''}" data-i18n="Transaction ID">Transaction ID</th>
              <th data-sort-key="city" class="${farmerSalesSort.key === 'city' ? 'sort-active' : ''}" data-i18n="City">City</th>
              <th data-sort-key="crop" class="${farmerSalesSort.key === 'crop' ? 'sort-active' : ''}" data-i18n="Crop">Crop</th>
              <th data-sort-key="price" class="${farmerSalesSort.key === 'price' ? 'sort-active' : ''}" data-i18n="Price per kg">Price per kg</th>
              <th data-sort-key="earnings" class="${farmerSalesSort.key === 'earnings' ? 'sort-active' : ''}" data-i18n="Earnings">Earnings</th>
            </tr>
          </thead>
          <tbody>
            ${sortedTxns.map(txn => `
              <tr>
                <td>${txn.transactionId || txn.id || '-'}</td>
                <td>${txn.city || '-'}</td>
                <td>${getCropDisplayName(txn.cropName || txn.name || '-')}</td>
                <td>₹${Number(txn.finalPrice || txn.finalRate || 0).toFixed(2)}/${unitLabel}</td>
                <td>₹${Number(txn.farmerPayout || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const recentCards = sortedTxns.slice(0, 3).map(txn => {
    const marketAvg = computeMarketRatesV2(txn.city, txn.cropName || txn.name)?.avg || 0;
    const cmpBadge = getComparisonBadge(txn.finalPrice, marketAvg);
    return `
    <div class="card sold-card relative" style="border-left:3px solid var(--success);margin-bottom:12px;">
      <div class="trade-ribbon" data-i18n="Completed Trade">${t('Completed Trade')}</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;align-items:start;">
        <div>
          <strong>${txn.listingId}</strong>
          <div class="muted"><span data-i18n="Buyer">${t('Buyer')}</span>: ${txn.buyerId}</div>
        </div>
        <span class="badge status-sold" data-i18n="Sold">✓ ${t('Sold')}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px;">
        <div><strong><span data-i18n="Quantity">${t('Quantity')}</span>:</strong> ${txn.quantity} ${unitLabel}</div>
        <div><strong><span data-i18n="Final Price">${t('Final Price')}</span>:</strong> ₹${Number(txn.finalPrice || txn.finalRate || 0).toFixed(2)}/${unitLabel}</div>
        <div><strong><span data-i18n="Total Amount">${t('Total Amount')}</span>:</strong> ₹${txn.totalAmount.toFixed(2)}</div>
        <div><strong><span data-i18n="Commission">${t('Commission')}</span> (${(txn.commissionRate * 100).toFixed(1)}%):</strong> ₹${txn.commissionAmount.toFixed(2)}</div>
        <div style="font-weight:bold;color:var(--success);"><strong><span data-i18n="Your Payout">${t('Your Payout')}</span>:</strong> ₹${txn.farmerPayout.toFixed(2)}</div>
        <div class="muted">${new Date(txn.timestamp).toLocaleString()}</div>
        <div class="verified-badge" data-i18n="Verified by Middleman">✔ ${t('Verified by Middleman')}</div>
        ${cmpBadge ? `<div>${cmpBadge}</div>` : ''}
      </div>
    </div>
  `;
  }).join('');

  container.innerHTML = summary + analytics + salesTable + recentCards;

  const modeSelect = document.getElementById('farmerSalesTrendMode');
  if (modeSelect) {
    modeSelect.value = farmerSalesTrendMode;
    modeSelect.addEventListener('change', () => {
      farmerSalesTrendMode = modeSelect.value;
      try { localStorage.setItem('farmerSalesTrendMode', farmerSalesTrendMode); } catch (e) { }
      renderFarmerEarningsTrendChart(transactions);
    });
  }
  renderFarmerEarningsTrendChart(transactions);
  renderFarmerSalesComparisonChart();
  bindSalesTableSort(container);
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
