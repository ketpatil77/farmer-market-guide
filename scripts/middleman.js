let ROLE_IDS = {};
let lastSeenListingCount = 0;
const actionLocks = new Set();
const BUTTON_DEFAULT_TEXT = new WeakMap();
let middlemanNotificationFilter = 'all';
let middlemanRefreshTimer = null;
let lastMiddlemanSignature = '';
let demoTimerMiddleman = null;
const recentPopupListings = new Map();
let middlemanMarketRange = '7';
let activeTransactionId = null;

function emitMiddlemanUiMetric(taskId, eventType, metadata = {}, durationMs = null) {
  if (typeof emitUiMetric !== 'function' || !taskId || !eventType) return;
  emitUiMetric({
    role: 'middleman',
    task_id: taskId,
    event_type: eventType,
    duration_ms: typeof durationMs === 'number' ? durationMs : undefined,
    screen_id: 'middleman-dashboard',
    metadata
  });
}

try {
  middlemanMarketRange = localStorage.getItem('middlemanMarketRange') || '7';
} catch (e) { }

function getActiveMiddlemanId() {
  const stored = (typeof getStoreValue === 'function' && typeof STORAGE_KEYS !== 'undefined')
    ? getStoreValue(STORAGE_KEYS.currentMiddlemanId)
    : (typeof localStorage !== 'undefined' && typeof STORAGE_KEYS !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.currentMiddlemanId)
      : null);
  const fallbackTxn = getTransactions().find(t => t && t.middlemanId);
  const fallbackListing = getListings().find(l => l && l.middlemanId);
  const id = ROLE_IDS.middlemanId || stored || (fallbackTxn && fallbackTxn.middlemanId) || (fallbackListing && fallbackListing.middlemanId) || null;
  if (!ROLE_IDS.middlemanId && id) ROLE_IDS.middlemanId = id;
  return id;
}

function shouldShowPopupForListing(listing) {
  if (!listing || typeof listing !== 'object') return false;
  const listingId = listing.listingId || listing.id;
  if (!listingId) return false;
  const now = Date.now();
  const last = recentPopupListings.get(listingId) || 0;
  if (now - last < 7000) return false;
  recentPopupListings.set(listingId, now);
  // prune
  recentPopupListings.forEach((ts, key) => {
    if (now - ts > 60_000) recentPopupListings.delete(key);
  });
  return true;
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

function computeMiddlemanSignature() {
  const listings = getListings();
  const offers = getOffers();
  const txns = getTransactions();
  const notes = getNotifications();
  const middlemanId = getActiveMiddlemanId() || '';
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
    JSON.stringify(statusCounts), JSON.stringify(offerCounts), unread,
    middlemanId
  ].join('|');
}

function scheduleMiddlemanRefresh(force = false) {
  if (middlemanRefreshTimer) return;
  middlemanRefreshTimer = setTimeout(() => {
    middlemanRefreshTimer = null;
    const sig = computeMiddlemanSignature();
    if (!force && sig === lastMiddlemanSignature) return;
    lastMiddlemanSignature = sig;
    checkForNewListings();
    renderListings();
    renderMiddlemanAnalytics();
    renderPendingOffers();
    renderEarningsStats();
    renderEarningsTable();
    renderCommunityMarketSignals();
    renderMarketConsensusV2();
    renderMiddlemanNotifications();
    renderMiddlemanInsights();
    renderMiddlemanOverview();
    renderMiddlemanMetrics();
    renderPendingOrdersSummary();
    renderRecentTransactions();
    renderMiddlemanAlerts();
  }, 140);
}

function clearBtnLoading(btn) {
  if (!btn) return;
  const original = BUTTON_DEFAULT_TEXT.get(btn);
  btn.disabled = false;
  btn.classList.remove('is-loading');
  if (original) btn.textContent = original;
}

function initMarketFilters() {
  const citySelect = document.getElementById('middlemanMarketCitySelect');
  const cropSelect = document.getElementById('middlemanMarketCropSelect');
  const rangeSelect = document.getElementById('middlemanMarketRangeSelect');
  if (!citySelect || !cropSelect) return;

  const cities = typeof ensureCities === 'function' ? ensureCities() : [];
  const crops = typeof getCrops === 'function' ? getCrops() : [];
  citySelect.innerHTML = cities.map(city => `<option value="${city}">${city}</option>`).join('');
  cropSelect.innerHTML = crops.map(crop => `<option value="${crop.english}">${crop.english} (${crop.marathi})</option>`).join('');

  const middlemanId = getActiveMiddlemanId();
  const txns = middlemanId ? getTransactions().filter(t => t.middlemanId === middlemanId) : [];
  const listings = getListings();
  const fallbackCity = txns[0]?.city || listings[0]?.city || cities[0] || '';
  const fallbackCrop = txns[0]?.cropName || listings[0]?.name || crops[0]?.english || '';
  if (fallbackCity) citySelect.value = fallbackCity;
  if (fallbackCrop) cropSelect.value = fallbackCrop;
  if (rangeSelect) rangeSelect.value = middlemanMarketRange;

  citySelect.addEventListener('change', () => renderMiddlemanOverview());
  cropSelect.addEventListener('change', () => renderMiddlemanOverview());
  if (rangeSelect) {
    rangeSelect.addEventListener('change', () => {
      middlemanMarketRange = rangeSelect.value || '7';
      try { localStorage.setItem('middlemanMarketRange', middlemanMarketRange); } catch (e) { }
      renderMiddlemanOverview();
    });
  }
}

function initMiddlemanActionButtons() {
  const reviewBtn = document.getElementById('reviewListingsBtn');
  const processBtn = document.getElementById('processOrdersBtn');
  const viewCartBtn = document.getElementById('viewCartBtn');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      const section = document.getElementById('activeListingsSection');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (processBtn) {
    processBtn.addEventListener('click', () => {
      const section = document.getElementById('pendingOrdersSection');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (viewCartBtn) {
    viewCartBtn.addEventListener('click', () => {
      const section = document.getElementById('pendingOrdersSection');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function initMiddlemanScrollTargets() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-scroll-target]');
    if (!trigger) return;
    const targetId = trigger.getAttribute('data-scroll-target');
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function initTransactionModal() {
  const modal = document.getElementById('transactionModal');
  const closeBtn = document.getElementById('transactionModalClose');
  const updateBtn = document.getElementById('transactionStatusUpdateBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeTransactionModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeTransactionModal();
    });
  }
  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      const select = document.getElementById('transactionStatusSelect');
      if (!select || !activeTransactionId) return;
      emitMiddlemanUiMetric('middleman_update_transaction_status', 'task_start', { transactionId: activeTransactionId, status: select.value });
      updateTransactionStatus(activeTransactionId, select.value);
      emitMiddlemanUiMetric('middleman_update_transaction_status', 'task_complete', { transactionId: activeTransactionId, status: select.value });
      renderRecentTransactions();
      renderEarningsTable();
      alert(t('Status updated'));
      closeTransactionModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeTransactionModal();
  });
}

function openTransactionModal(transactionId) {
  const modal = document.getElementById('transactionModal');
  const body = document.getElementById('transactionModalBody');
  if (!modal || !body) return;
  const txns = getTransactions();
  const txn = txns.find(t => String(t.transactionId || t.id) === String(transactionId));
  if (!txn) return;
  activeTransactionId = transactionId;
  const statusCode = getTransactionStatusCode(txn);
  const statusLabel = t(statusCode);
  body.innerHTML = `
    <div class="card" style="padding:12px;">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div>
          <div class="muted" data-i18n="Transaction ID">${t('Transaction ID')}</div>
          <div style="font-weight:700;">${txn.transactionId || txn.id}</div>
        </div>
        <div>
          <div class="muted" data-i18n="Status">${t('Status')}</div>
          <div class="status-chip ${getStatusClass(statusCode)}">${statusLabel}</div>
        </div>
      </div>
    </div>
    <div class="card" style="padding:12px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;font-size:14px;">
        <div><strong data-i18n="Crop">${t('Crop')}</strong>: ${getCropDisplayName(txn.cropName || txn.name || '')}</div>
        <div><strong data-i18n="City">${t('City')}</strong>: ${txn.city || '-'}</div>
        <div><strong data-i18n="Farmer">${t('Farmer')}</strong>: ${txn.farmerId}</div>
        <div><strong data-i18n="Buyer">${t('Buyer')}</strong>: ${txn.buyerId}</div>
        <div><strong data-i18n="Quantity">${t('Quantity')}</strong>: ${txn.quantity} ${t('kg')}</div>
        <div><strong data-i18n="Final Price">${t('Final Price')}</strong>: ₹${txn.finalPrice}</div>
        <div><strong data-i18n="Total Amount">${t('Total Amount')}</strong>: ₹${txn.totalAmount.toFixed(2)}</div>
        <div><strong data-i18n="Commission">${t('Commission')}</strong>: ₹${txn.commissionAmount.toFixed(2)}</div>
      </div>
    </div>
  `;
  const select = document.getElementById('transactionStatusSelect');
  if (select) select.value = statusCode;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeTransactionModal() {
  const modal = document.getElementById('transactionModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  activeTransactionId = null;
}

function updateTransactionStatus(transactionId, status) {
  const txns = getTransactions();
  const txn = txns.find(t => String(t.transactionId || t.id) === String(transactionId));
  if (!txn) return null;
  txn.deliveryStatus = status;
  txn.updatedAt = new Date().toISOString();
  saveTransactions(txns);
  return txn;
}

function getTransactionStatusCode(txn) {
  if (!txn) return 'Pending Payment';
  if (txn.deliveryStatus) return txn.deliveryStatus;
  const ts = new Date(txn.timestamp || txn.createdAt || Date.now()).getTime();
  const days = (Date.now() - ts) / 86400000;
  if (days < 1.5) return 'In Transit';
  if (days < 4) return 'Pending Payment';
  return 'Delivered';
}

function getTransactionDisplayStatus(txn) {
  return t(getTransactionStatusCode(txn));
}

function getStatusClass(statusCode) {
  if (statusCode === 'Delivered') return 'delivered';
  if (statusCode === 'In Transit') return 'transit';
  return 'pending';
}

function triggerFinalizePulse(btn) {
  const row = btn ? btn.closest('tr') : null;
  const target = row || document.body;
  target.classList.add('success-pulse');
  setTimeout(() => {
    target.classList.remove('success-pulse');
  }, 900);
}

window.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  const init = initAppData();

  // Check for data integrity issues
  if (init.versionMismatch) {
    // Silent: data was reset due to version mismatch.
  }

  ROLE_IDS = init.roles;
  lastSeenListingCount = getListings().length;
  initMarketFilters();
  initMiddlemanActionButtons();
  initMiddlemanScrollTargets();
  initMiddlemanNotificationInteractions();
  initTransactionModal();
  bindFilters();
  bindApproveRejectHandlers();
  renderListings();
  renderMiddlemanAnalytics();
  renderPendingOffers();
  renderEarningsStats();
  renderEarningsTable();
  renderCommunityMarketSignals();
  renderMarketConsensusV2();
  renderMiddlemanNotifications();
  renderMiddlemanInsights();
  renderMiddlemanOverview();
  renderMiddlemanMetrics();
  renderPendingOrdersSummary();
  renderRecentTransactions();
  renderMiddlemanAlerts();
  bindRoleSwitchClearImage();
  subscribeToNewListings();
  window.addEventListener('farmaSyncApplied', () => {
    scheduleMiddlemanRefresh(true);
  });
  window.addEventListener('farmaDataReset', () => {
    scheduleMiddlemanRefresh(true);
  });
  setInterval(() => {
    scheduleMiddlemanRefresh();
  }, 10000);
});

window.addEventListener('storage', () => {
  scheduleMiddlemanRefresh(true);
});

function subscribeToNewListings() {
  window.addEventListener('farmaNewListing', (e) => {
    const detail = e && e.detail ? e.detail : null;
    const listingId = typeof detail === 'string'
      ? detail
      : detail && typeof detail === 'object'
        ? (detail.listingId || detail.id)
        : null;
    const listing = detail && typeof detail === 'object' && detail.name ? detail : (listingId ? getListings().find(l => String(l.listingId) === String(listingId) || String(l.id) === String(listingId)) : null);
    if (listing && listing.status === 'Pending' && shouldShowPopupForListing(listing)) showPendingNotificationPopup(listing);
  });
}

function checkForNewListings() {
  const listings = getListings();
  const currentCount = listings.length;
  if (currentCount > lastSeenListingCount) {
    const pending = listings.filter(l => l.status === 'Pending');
    if (pending.length > 0) {
      const newListings = pending.slice(Math.max(0, pending.length - (currentCount - lastSeenListingCount)));
      newListings.forEach(listing => {
        if (new Date().getTime() - new Date(listing.createdAt).getTime() < 5000) {
          if (shouldShowPopupForListing(listing)) showPendingNotificationPopup(listing);
        }
      });
    }
    lastSeenListingCount = currentCount;
  }
}

function showPendingNotificationPopup(listing) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:9998;display:flex;align-items:center;justify-content:center;';
  overlay.className = 'middleman-popup-overlay';

  const popup = document.createElement('div');
  popup.style.cssText = 'background:white;border-radius:12px;padding:20px;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);z-index:9999;';

  popup.innerHTML = `
    <div style="color:#e45858;font-weight:700;margin-bottom:12px;font-size:16px;" data-i18n="New Listing Pending Review">⚠️ ${t('New Listing Pending Review')}</div>
    <div style="color:#6b7280;margin-bottom:16px;font-size:14px;">
      <div><strong data-i18n="Farmer">${t('Farmer')}</strong>: ${listing.farmerId}</div>
      <div><strong data-i18n="Crop">${t('Crop')}</strong>: ${listing.name}</div>
      <div><strong data-i18n="City">${t('City')}</strong>: ${listing.city}</div>
      <div><strong data-i18n="Quantity">${t('Quantity')}</strong>: ${listing.quantity} ${listing.unit}</div>
      <div><strong data-i18n="Price">${t('Price')}</strong>: ₹${listing.price}/${listing.unit}</div>
    </div>
    <button type="button" data-review-now style="width:100%;padding:10px;background:#3b7a57;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;" data-i18n="Review Now">${t('Review Now')}</button>
  `;

  const reviewBtn = popup.querySelector('[data-review-now]');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      overlay.remove();
      const section = document.getElementById('activeListingsSection');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  setTimeout(() => {
    try {
      overlay.remove();
    } catch (e) { }
  }, 6000);
}

function bindFilters() {
  const filter = document.getElementById('statusFilter');
  if (filter) {
    filter.addEventListener('change', () => {
      renderListings();
      renderMiddlemanAnalytics();
    });
  }
}

function bindApproveRejectHandlers() {
  document.addEventListener('click', async (e) => {
    const approveBtn = e.target.closest('.approve-btn');
    const rejectBtn = e.target.closest('.reject-btn');
    const finalizeBtn = e.target.closest('.finalize-btn');
    const editBtn = e.target.closest('.edit-listing-btn');

    if (approveBtn) {
      const listingId = approveBtn.getAttribute('data-id');
      emitMiddlemanUiMetric('middleman_approve_listing', 'task_start', { listingId });
      const lockKey = `approve-${listingId}`;
      if (actionLocks.has(lockKey)) return;
      actionLocks.add(lockKey);
      setBtnLoading(approveBtn, 'Approving...');

      const middlemanId = getActiveMiddlemanId();
      const updated = updateListingStatus(listingId, 'Approved', { middlemanId });
      if (updated) {
        emitMiddlemanUiMetric('middleman_approve_listing', 'task_complete', { listingId });
        renderListings();
        renderMiddlemanAnalytics();
        alert(t('Listing approved!'));
      } else {
        emitMiddlemanUiMetric('middleman_approve_listing', 'ui_error', { listingId, reason: 'update_failed' });
        alert(t('Unable to approve listing.'));
        clearBtnLoading(approveBtn);
      }
      actionLocks.delete(lockKey);
    } else if (rejectBtn) {
      const listingId = rejectBtn.getAttribute('data-id');
      emitMiddlemanUiMetric('middleman_reject_listing', 'task_start', { listingId });
      const lockKey = `reject-${listingId}`;
      if (actionLocks.has(lockKey)) return;
      actionLocks.add(lockKey);
      setBtnLoading(rejectBtn, 'Rejecting...');

      const reason = typeof farmaPrompt === 'function'
        ? await farmaPrompt(t('Reason for rejection (optional):'), { defaultValue: '' })
        : null;
      if (reason === null) {
        emitMiddlemanUiMetric('middleman_reject_listing', 'abandon', { listingId });
        clearBtnLoading(rejectBtn);
        actionLocks.delete(lockKey);
        return;
      }
      const middlemanId = getActiveMiddlemanId();
      const updated = updateListingStatus(listingId, 'Rejected', { middlemanId, reason });
      if (updated) {
        emitMiddlemanUiMetric('middleman_reject_listing', 'task_complete', { listingId, hasReason: !!String(reason || '').trim() });
        renderListings();
        renderMiddlemanAnalytics();
        alert(t('Listing rejected!'));
      } else {
        emitMiddlemanUiMetric('middleman_reject_listing', 'ui_error', { listingId, reason: 'update_failed' });
        alert(t('Unable to reject listing.'));
        clearBtnLoading(rejectBtn);
      }
      actionLocks.delete(lockKey);
    } else if (editBtn) {
      const listingId = editBtn.getAttribute('data-id');
      if (!listingId) return;
      emitMiddlemanUiMetric('middleman_edit_listing', 'task_start', { listingId });
      const listings = getListings();
      const listing = listings.find(l => String(l.listingId) === String(listingId));
      if (!listing) return;
      const nextQty = typeof farmaPrompt === 'function'
        ? await farmaPrompt(t('Update quantity'), { defaultValue: String(listing.quantity || '') })
        : null;
      if (nextQty === null) {
        emitMiddlemanUiMetric('middleman_edit_listing', 'abandon', { listingId, field: 'quantity' });
        return;
      }
      const nextPrice = typeof farmaPrompt === 'function'
        ? await farmaPrompt(t('Update price (₹/kg)'), { defaultValue: String(listing.price || '') })
        : null;
      if (nextPrice === null) {
        emitMiddlemanUiMetric('middleman_edit_listing', 'abandon', { listingId, field: 'price' });
        return;
      }
      const nextStatus = typeof farmaPrompt === 'function'
        ? await farmaPrompt(t('Update status (Pending/Approved/Rejected/PurchaseRequested/Sold)'), { defaultValue: String(listing.status || '') })
        : null;
      if (nextStatus === null) {
        emitMiddlemanUiMetric('middleman_edit_listing', 'abandon', { listingId, field: 'status' });
        return;
      }
      listing.quantity = Number(nextQty) || listing.quantity;
      listing.price = Number(nextPrice) || listing.price;
      listing.status = nextStatus || listing.status;
      saveListings(listings);
      emitMiddlemanUiMetric('middleman_edit_listing', 'task_complete', { listingId, status: listing.status });
      renderListings();
      renderMiddlemanAnalytics();
    } else if (finalizeBtn) {
      const offerId = finalizeBtn.getAttribute('data-offer-id');
      emitMiddlemanUiMetric('middleman_finalize_offer', 'task_start', { offerId });
      const lockKey = `finalize-${offerId}`;
      if (actionLocks.has(lockKey)) return;
      actionLocks.add(lockKey);
      setBtnLoading(finalizeBtn, 'Finalizing...');

      const guard = canFinalizeTransaction(offerId);
      if (!guard.can) {
        emitMiddlemanUiMetric('middleman_finalize_offer', 'validation_error', { offerId, reason: guard.reason || 'guard_failed' });
        alert(t('Cannot finalize: {reason}', { reason: guard.reason }));
        clearBtnLoading(finalizeBtn);
        actionLocks.delete(lockKey);
        return;
      }

      const middlemanId = getActiveMiddlemanId();
      const result = finalizeTransaction(offerId, middlemanId);
      if (result) {
        emitMiddlemanUiMetric('middleman_finalize_offer', 'task_complete', { offerId, transactionId: result.transactionId || '' });
        triggerFinalizePulse(finalizeBtn);
        alert(t('Transaction finalized! Commission: {commission} Farmer Payout: {payout}', { commission: `₹${result.commissionAmount.toFixed(2)}`, payout: `₹${result.farmerPayout.toFixed(2)}` }));
        // Force full UI refresh
        setTimeout(() => {
          const filterSelect = document.getElementById('statusFilter');
          if (filterSelect) {
            filterSelect.value = 'Sold';
          }
          renderListings();
          renderMiddlemanAnalytics();
          renderPendingOffers();
          renderEarningsStats();
          renderEarningsTable();
          renderRecentTransactions();
          renderMiddlemanOverview();
          renderMiddlemanMetrics();
        }, 100);
      } else {
        emitMiddlemanUiMetric('middleman_finalize_offer', 'ui_error', { offerId, reason: 'finalize_failed' });
        alert(t('Error finalizing transaction'));
        clearBtnLoading(finalizeBtn);
      }
      actionLocks.delete(lockKey);
    }
  });
}

function renderListings() {
  const container = document.getElementById('listingsTableBody');
  if (!container) return;

  withLoadingSkeleton(container, 'table', () => {
    const filter = document.getElementById('statusFilter');
    const selected = filter ? filter.value : 'all';
    const listings = getListings();
    const filtered = selected === 'all' ? listings : listings.filter(l => l.status === selected);

    if (!filtered.length) {
      container.innerHTML = `<tr><td colspan="9">${renderEmptyState('📋', 'No Listings', 'All pending listings have been reviewed. Check back when new farmers submit produce.')}</td></tr>`;
      return;
    }

    container.innerHTML = filtered.map(l => {
      const statusKey = l.status === 'PurchaseRequested' ? 'Buyer Interest' : l.status;
      const displayName = getCropDisplayName(l.name);
      const listingImage = getListingImage(l);
      const imageCell = listingImage ? `<img class="listing-thumb" src="${listingImage}" alt="${displayName}" loading="lazy" decoding="async" data-fallback-image="1" />` : '<span class="muted">—</span>';
      return `
      <tr>
        <td>${l.listingId}</td>
        <td>${l.farmerId}</td>
        <td>${imageCell}</td>
        <td>${displayName}</td>
        <td>${l.city}</td>
        <td>${l.quantity} ${l.unit}</td>
        <td>₹${l.price}/${l.unit}</td>
        <td><span class="status-chip ${l.status.toLowerCase()}">${t(statusKey)}</span></td>
        <td>
          <div class="action-cell">
            ${l.status === 'Pending' ? `
              <button class="btn-primary approve-btn" data-id="${l.listingId}" data-i18n="Approve">✓ ${t('Approve')}</button>
              <button class="btn-secondary reject-btn" data-id="${l.listingId}" data-i18n="Reject">✕ ${t('Reject')}</button>
            ` : ''}
            <button class="btn edit-listing-btn" data-id="${l.listingId}" data-i18n="Edit">${t('Edit')}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  });
}

function renderMiddlemanAnalytics() {
  renderMiddlemanMetrics();
  renderMiddlemanOverview();
  try {
    if (typeof renderAllChartsForMiddleman === 'function') {
      renderAllChartsForMiddleman();
    }
  } catch (err) { }
}

function renderMiddlemanMetrics() {
  const listings = getListings();
  const offers = getOffers();
  const middlemanId = getActiveMiddlemanId();
  const transactions = middlemanId ? getTransactions().filter(t => t.middlemanId === middlemanId) : [];
  const activeListings = listings.filter(l => !isSoldListing(l) && l.status !== 'Rejected').length;
  const pendingOrders = offers.filter(o => o.status === 'Accepted').filter(o => {
    const listing = listings.find(l => l.listingId === o.listingId);
    return !(listing && listing.status === 'Sold');
  }).length;
  const completedDeals = transactions.length;
  const totalVolume = transactions.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  const unitLabel = typeof t === 'function' ? t('kg') : 'kg';

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (typeof animateNumber === 'function' && typeof val === 'number') {
      animateNumber(id, val);
    } else {
      el.textContent = val;
    }
  };
  set('statActiveListings', activeListings);
  set('statPendingOrders', pendingOrders);
  set('statCompletedDeals', completedDeals);
  const totalVolumeEl = document.getElementById('statTotalVolume');
  if (totalVolumeEl) {
    if (typeof animateNumber === 'function') {
      animateNumber('statTotalVolume', totalVolume);
    } else {
      totalVolumeEl.textContent = `${totalVolume} ${unitLabel}`;
    }
  }
}

function computeMiddlemanTrendSeries(city, crop, days) {
  const now = Date.now();
  const middlemanId = getActiveMiddlemanId();
  const txns = middlemanId ? getTransactions().filter(t => t.middlemanId === middlemanId).filter(t => {
    const matchesCity = city ? t.city === city : true;
    const matchesCrop = crop ? (t.cropName === crop || t.name === crop) : true;
    const diff = (now - new Date(t.timestamp).getTime()) / 86400000;
    return matchesCity && matchesCrop && diff <= days;
  }) : [];

  const buckets = {};
  txns.forEach(t => {
    const day = new Date(t.timestamp).toISOString().split('T')[0];
    if (!buckets[day]) buckets[day] = { commission: 0, total: 0 };
    buckets[day].commission += Number(t.commissionAmount || 0);
    buckets[day].total += Number(t.totalAmount || 0);
  });

  const labels = [];
  const commission = [];
  const totals = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    labels.push(day);
    const bucket = buckets[day] || { commission: 0, total: 0 };
    commission.push(parseFloat(bucket.commission.toFixed(2)));
    totals.push(parseFloat(bucket.total.toFixed(2)));
  }
  return { labels, commission, totals, count: txns.length };
}

function computeCommissionComparison(city, crop, days) {
  const now = Date.now();
  const allTxns = getTransactions().filter(t => {
    const diff = (now - new Date(t.timestamp).getTime()) / 86400000;
    if (diff > days) return false;
    if (city && t.city !== city) return false;
    if (crop && !(t.cropName === crop || t.name === crop)) return false;
    return true;
  });
  const middlemanId = getActiveMiddlemanId();
  const mine = allTxns.filter(t => t.middlemanId === middlemanId);
  const sumMine = mine.reduce((s, t) => s + (t.commissionAmount || 0), 0);
  const sumMarket = allTxns.reduce((s, t) => s + (t.commissionAmount || 0), 0);
  const avgMine = mine.length ? sumMine / mine.length : 0;
  const avgMarket = allTxns.length ? sumMarket / allTxns.length : 0;
  const diffPct = avgMarket ? ((avgMine - avgMarket) / avgMarket) * 100 : 0;
  const totalValue = mine.reduce((s, t) => s + (t.totalAmount || 0), 0);
  return {
    avgMine: parseFloat(avgMine.toFixed(2)),
    avgMarket: parseFloat(avgMarket.toFixed(2)),
    diffPct: parseFloat(diffPct.toFixed(1)),
    totalCommission: parseFloat(sumMine.toFixed(2)),
    totalValue: parseFloat(totalValue.toFixed(2)),
    count: mine.length
  };
}

function renderMiddlemanOverview() {
  const container = document.getElementById('middlemanOverviewCards');
  if (!container) return;
  const citySelect = document.getElementById('middlemanMarketCitySelect');
  const cropSelect = document.getElementById('middlemanMarketCropSelect');
  const rangeSelect = document.getElementById('middlemanMarketRangeSelect');
  const city = citySelect?.value || '';
  const crop = cropSelect?.value || '';
  const rangeDays = Number(rangeSelect?.value || middlemanMarketRange || 7) || 7;

  const comparison = computeCommissionComparison(city, crop, rangeDays);
  const trend = computeMiddlemanTrendSeries(city, crop, rangeDays);
  const directionKey = comparison.diffPct >= 0 ? 'Above market avg' : 'Below market avg';
  const performanceHtml = comparison.avgMarket
    ? `<span class="performance-indicator ${comparison.diffPct >= 0 ? 'up' : 'down'}"><span data-i18n="${directionKey}">${t(directionKey)}</span> <span data-i18n="by {pct}%" data-i18n-vars='${JSON.stringify({ pct: Math.abs(comparison.diffPct) })}'>${t('by {pct}%', { pct: Math.abs(comparison.diffPct) })}</span></span>`
    : `<span data-i18n="Awaiting market data">${t('Awaiting market data')}</span>`;

  container.innerHTML = `
    <div class="insight-card accent-commission">
      <div class="insight-label" data-i18n="Your Commission">Your Commission</div>
      <div class="insight-value">₹${comparison.totalCommission.toFixed(2)}</div>
    </div>
    <div class="insight-card accent-transaction">
      <div class="insight-label" data-i18n="Total Transaction Value">Total Transaction Value</div>
      <div class="insight-value">₹${comparison.totalValue.toFixed(2)}</div>
    </div>
    <div class="insight-card accent-performance">
      <div class="insight-label" data-i18n="Performance">${t('Performance')}</div>
      <div class="insight-value" style="font-size:15px;">${performanceHtml}</div>
    </div>
    <div class="insight-card">
      <div class="insight-label" data-i18n="Market Avg Commission">Market Avg Commission</div>
      <div class="insight-value">₹${comparison.avgMarket.toFixed(2)}</div>
    </div>
  `;

  const canvas = document.getElementById('middlemanTrendChart');
  const emptyEl = document.getElementById('middlemanTrendEmpty');
  if (!canvas) return;
  if (!trend.count) {
    if (emptyEl) {
      emptyEl.style.display = 'block';
      emptyEl.setAttribute('data-i18n', 'Finalize deals to see commission and transaction trends.');
      emptyEl.textContent = t('Finalize deals to see commission and transaction trends.');
    }
    if (canvas.__chart) canvas.__chart.destroy();
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  const datasets = [
    {
      label: 'Your Commission',
      data: trend.commission,
      borderColor: 'rgba(82, 212, 122, 1)',
      backgroundColor: 'rgba(82, 212, 122, 0.2)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 6
    },
    {
      label: 'Total Transaction Value',
      data: trend.totals,
      borderColor: 'rgba(46, 196, 255, 1)',
      backgroundColor: 'rgba(46, 196, 255, 0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 6
    }
  ];
  if (typeof lazyRenderChart === 'function') {
    lazyRenderChart('middlemanTrendChart', () => renderMultiLineChart('middlemanTrendChart', trend.labels, datasets, { yTitle: '₹' }));
  } else {
    renderMultiLineChart('middlemanTrendChart', trend.labels, datasets, { yTitle: '₹' });
  }
}

function renderPendingOrdersSummary() {
  const container = document.getElementById('pendingOrdersSummary');
  if (!container) return;
  const listings = getListings();
  const offers = getOffers().filter(o => o.status === 'Accepted').filter(o => {
    const listing = listings.find(l => l.listingId === o.listingId);
    return !(listing && listing.status === 'Sold');
  });
  if (!offers.length) {
    container.innerHTML = `<div class="summary-chip"><span data-i18n="No pending orders">${t('No pending orders')}</span><span>0</span></div>`;
    return;
  }
  const summary = offers.slice(0, 3).map(o => {
    const listing = listings.find(l => l.listingId === o.listingId) || {};
    const qty = o.acceptedQty || o.counteredQty || o.quantity || 0;
    return `<div class="summary-chip"><span>${getCropDisplayName(listing.name || '')} • ${qty} ${listing.unit || 'kg'}</span><strong>₹${o.acceptedPrice}</strong></div>`;
  }).join('');
  container.innerHTML = summary;
}

function renderRecentTransactions() {
  const tbody = document.getElementById('middlemanTransactionsTableBody');
  if (!tbody) return;
  const unitLabel = typeof t === 'function' ? t('kg') : 'kg';
  const middlemanId = getActiveMiddlemanId();
  const transactions = middlemanId ? getTransactions().filter(txn => txn.middlemanId === middlemanId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];
  if (!transactions.length) {
    tbody.innerHTML = `<tr><td colspan="8">${renderEmptyState('📦', 'No recent transactions', 'Finalize offers to see transaction details here.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = transactions.slice(0, 8).map(txn => {
    const statusCode = getTransactionStatusCode(txn);
    const statusLabel = t(statusCode);
    const statusClass = getStatusClass(statusCode);
    return `
      <tr>
        <td>${txn.transactionId || txn.id}</td>
        <td>${getCropDisplayName(txn.cropName || txn.name || '')}</td>
        <td>${txn.farmerId}</td>
        <td>${txn.buyerId}</td>
        <td>${txn.quantity} ${unitLabel}</td>
        <td><span class="status-chip ${statusClass}">${statusLabel}</span></td>
        <td>₹${Number(txn.commissionAmount || 0).toFixed(2)}</td>
        <td><button class="btn-secondary" type="button" data-transaction-id="${txn.transactionId || txn.id}" data-i18n="View Details">${t('View Details')}</button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-transaction-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const transactionId = btn.getAttribute('data-transaction-id');
      openTransactionModal(transactionId);
    });
  });
}

function renderEarningsStats() {
  const summary = computeMiddlemanEarningsBreakdown(getActiveMiddlemanId());
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('statCommissionTotal', `₹${summary.sums.month.toFixed(2)}`);
  set('statTransactionsCount', summary.count);
  const avg = summary.count ? (summary.sums.month / summary.count) : 0;
  set('statAvgCommission', `₹${avg.toFixed(2)}`);
  set('statTransactionValue', `₹${summary.totalValue.toFixed(2)}`);
}

function renderPendingOffers() {
  const container = document.getElementById('pendingOffersContainer');
  if (!container) return;
  const listings = getListings();
  const offers = getOffers()
    .filter(o => o.status === 'Accepted')
    .filter(o => {
      const listing = listings.find(l => l.listingId === o.listingId);
      return !(listing && listing.status === 'Sold');
    });
  if (!offers.length) {
    container.innerHTML = renderEmptyState('🤝', 'No Offers to Finalize', 'Accepted offers will appear here for final settlement. Complete transactions to earn commissions.');
    renderPendingOrdersSummary();
    return;
  }
  container.innerHTML = `<table class="data-table"><thead><tr>
    <th data-i18n="Offer ID">${t('Offer ID')}</th>
    <th data-i18n="Listing ID">${t('Listing ID')}</th>
    <th data-i18n="Farmer">${t('Farmer')}</th>
    <th data-i18n="Buyer">${t('Buyer')}</th>
    <th data-i18n="Qty">${t('Qty')}</th>
    <th data-i18n="Price">${t('Price')}</th>
    <th data-i18n="Total">${t('Total')}</th>
    <th data-i18n="Commission">${t('Commission')}</th>
    <th data-i18n="Action">${t('Action')}</th>
  </tr></thead><tbody>` + offers.map(o => {
    const qty = o.acceptedQty || o.counteredQty || o.quantity;
    const totalAmount = o.acceptedPrice * qty;
    const commissionInfo = computeCommission(totalAmount);
    const listing = listings.find(l => l.listingId === o.listingId);
    const isSold = listing && listing.status === 'Sold';
    const actionBtn = isSold
      ? `<button class="btn-secondary" disabled style="padding:6px 10px;font-size:12px;" data-i18n="Sold">${t('Sold')}</button>`
      : `<button class="btn-primary finalize-btn" data-offer-id="${o.offerId}" style="padding:6px 10px;font-size:12px;" data-i18n="Finalize">✓ ${t('Finalize')}</button>`;
    return `<tr class="${isSold ? 'sold-card' : ''}"><td>${o.offerId}</td><td>${o.listingId}</td><td>${o.farmerId}</td><td>${o.buyerId}</td><td>${qty}</td><td>₹${o.acceptedPrice}</td><td>₹${totalAmount.toFixed(2)}</td><td>₹${commissionInfo.amount.toFixed(2)} (${(commissionInfo.rate * 100).toFixed(1)}%)</td><td>${actionBtn}</td></tr>`;
  }).join('') + `</tbody></table>`;
  renderPendingOrdersSummary();
}

function renderCommunityMarketSignals() {
  const container = document.getElementById('communityMarketSignalsContainer');
  if (!container) return;
  const unitLabel = typeof t === 'function' ? t('kg') : 'kg';

  const allRates = readJson(STORAGE_KEYS.communityMarketRates, []);
  const today = new Date().toISOString().split('T')[0];

  // Group by city + crop for today
  const todaySignals = {};
  allRates.filter(r => r.timestamp.split('T')[0] === today).forEach(r => {
    const key = `${r.city}|${r.crop}`;
    if (!todaySignals[key]) {
      todaySignals[key] = { city: r.city, crop: r.crop, rates: [] };
    }
    todaySignals[key].rates.push(r.rate);
  });

  const signals = Object.values(todaySignals).map(s => ({
    city: s.city,
    crop: s.crop,
    count: s.rates.length,
    avg: (s.rates.reduce((a, r) => a + r, 0) / s.rates.length).toFixed(2)
  }));

  if (signals.length === 0) {
    container.innerHTML = `<p class="muted" data-i18n="No community market reports yet.">${t('No community market reports yet.')}</p>`;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;gap:12px;">
      ${signals.map(s => `
        <div style="padding:12px;background:rgba(0,0,0,0.03);border-radius:6px;border-left:4px solid var(--info);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>🌾 ${getCropDisplayName(s.crop)}</strong>
              <div style="font-size:13px;color:var(--muted);">📍 ${s.city}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px;font-weight:600;color:var(--info);">₹${s.avg}/${unitLabel}</div>
              <div style="font-size:12px;color:var(--muted);" data-i18n="reports: {count}" data-i18n-vars='${JSON.stringify({ count: s.count })}'>${t('reports: {count}', { count: s.count })}</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderEarningsTable() {
  const container = document.getElementById('earningsTableContainer');
  if (!container) return;

  withLoadingSkeleton(container, 'list', () => {
    const earnings = calculateMiddlemanEarnings(getActiveMiddlemanId());
    const breakdown = computeMiddlemanEarningsBreakdown(getActiveMiddlemanId());
    if (!earnings.transactions.length) {
      container.innerHTML = renderEmptyState('💰', 'No Earnings Yet', 'Commission earnings will appear here once transactions are finalized.');
      return;
    }
    const cropBreakdown = Object.entries(breakdown.byCrop).map(([crop, amt]) => `<div style="display:flex;justify-content:space-between;"><span>🌾 ${getCropDisplayName(crop)}</span><strong>₹${amt.toFixed(2)}</strong></div>`).join('') || `<div class="muted" data-i18n="No crop data">${t('No crop data')}</div>`;
    const cityBreakdown = Object.entries(breakdown.byCity).map(([city, amt]) => `<div style="display:flex;justify-content:space-between;"><span>📍 ${city}</span><strong>₹${amt.toFixed(2)}</strong></div>`).join('') || `<div class="muted" data-i18n="No city data">${t('No city data')}</div>`;
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:12px;">
        <div class="card" style="padding:12px;background:rgba(76,175,80,0.08);border:1px dashed rgba(76,175,80,0.4);">
          <div class="muted" style="font-size:12px;" data-i18n="Today">${t('Today')}</div>
          <div style="font-size:20px;font-weight:700;">₹${breakdown.sums.today.toFixed(2)}</div>
        </div>
        <div class="card" style="padding:12px;background:rgba(33,150,243,0.08);border:1px dashed rgba(33,150,243,0.4);">
          <div class="muted" style="font-size:12px;" data-i18n="Last 7 days">${t('Last 7 days')}</div>
          <div style="font-size:20px;font-weight:700;">₹${breakdown.sums.week.toFixed(2)}</div>
        </div>
        <div class="card" style="padding:12px;background:rgba(156,39,176,0.08);border:1px dashed rgba(156,39,176,0.4);">
          <div class="muted" style="font-size:12px;" data-i18n="Last 30 days">${t('Last 30 days')}</div>
          <div style="font-size:20px;font-weight:700;">₹${breakdown.sums.month.toFixed(2)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:12px;">
        <div class="card" style="padding:12px;">
          <div style="font-weight:600;margin-bottom:6px;" data-i18n="By Crop">${t('By Crop')}</div>
          ${cropBreakdown}
        </div>
        <div class="card" style="padding:12px;">
          <div style="font-weight:600;margin-bottom:6px;" data-i18n="By City">${t('By City')}</div>
          ${cityBreakdown}
        </div>
      </div>
      <table class="data-table"><thead><tr>
        <th data-i18n="Date">${t('Date')}</th>
        <th data-i18n="Listing ID">${t('Listing ID')}</th>
        <th data-i18n="Farmer">${t('Farmer')}</th>
        <th data-i18n="Buyer">${t('Buyer')}</th>
        <th data-i18n="Amount">${t('Amount')}</th>
        <th data-i18n="Commission">${t('Commission')}</th>
        <th data-i18n="Payout">${t('Payout')}</th>
      </tr></thead><tbody>` + earnings.transactions.map(t => {
      return `<tr><td>${new Date(t.timestamp).toLocaleDateString()}</td><td>${t.listingId}</td><td>${t.farmerId}</td><td>${t.buyerId}</td><td>₹${t.totalAmount.toFixed(2)}</td><td>₹${t.commissionAmount.toFixed(2)}</td><td>₹${t.farmerPayout.toFixed(2)}</td></tr>`;
    }).join('') + `</tbody></table>`;
  });
}

function renderMarketConsensusV2() {
  const container = document.getElementById('marketConsensusContainer');
  if (!container) return;

  const cities = MAHARASHTRA_CITIES.slice(0, 5);
  const crops = MAHARASHTRA_CROPS.slice(0, 5).map(c => c.english);

  let html = '';

  cities.forEach(city => {
    crops.forEach(crop => {
      const txnRates = computeMarketRatesV2(city, crop);
      const communityRates = getCommunityRatesV2(city, crop);

      if (!txnRates && !communityRates) return;

      const txnAvg = txnRates?.avg || 0;
      const communityAvg = communityRates?.average || 0;
      const diff = communityAvg && txnAvg ? (((communityAvg - txnAvg) / txnAvg) * 100).toFixed(1) : 0;

      let diffIndicator = '→';
      let diffColor = '#999';
      if (diff > 5) { diffIndicator = '↑'; diffColor = '#e53935'; }
      else if (diff < -5) { diffIndicator = '↓'; diffColor = '#4caf50'; }

      const outlierFlag = communityRates && communityRates.outlierCount > 0 ? `<div style="font-size:11px;color:#f39c12;margin-top:4px;" data-i18n="Outliers filtered: {count}" data-i18n-vars='${JSON.stringify({ count: communityRates.outlierCount })}'>⚠️ ${t('Outliers filtered: {count}', { count: communityRates.outlierCount })}</div>` : '';

      const cropDisplay = getCropDisplayName(crop);
      html += `
        <div style="padding:12px;background:rgba(0,0,0,0.03);border-radius:6px;border-left:3px solid var(--primary);margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <strong>${cropDisplay}</strong>
              <div style="font-size:12px;color:var(--muted);">📍 ${city}</div>
            </div>
            ${txnRates ? `<div style="text-align:right;">
              <div style="font-weight:600;color:var(--success);" data-i18n="Txn: {amount}" data-i18n-vars='${JSON.stringify({ amount: `₹${txnAvg}` })}'>${t('Txn: {amount}', { amount: `₹${txnAvg}` })}</div>
              ${communityRates ? `<div style="font-size:12px;margin-top:4px;color:var(--muted);" data-i18n="Community: {amount}" data-i18n-vars='${JSON.stringify({ amount: `₹${communityAvg}` })}'>${t('Community: {amount}', { amount: `₹${communityAvg}` })}</div>` : ''}
              ${communityRates ? `<div style="font-weight:600;color:${diffColor};margin-top:4px;">${diffIndicator} ${Math.abs(diff)}%</div>` : ''}
            </div>` : ''}
          </div>
          ${outlierFlag}
          <div style="font-size:11px;color:var(--muted);margin-top:6px;">
            ${txnRates ? `✓ <span data-i18n="transactions: {count}" data-i18n-vars='${JSON.stringify({ count: txnRates.count })}'>${t('transactions: {count}', { count: txnRates.count })}</span>` : ''} 
            ${communityRates ? `• <span data-i18n="community reports: {count}" data-i18n-vars='${JSON.stringify({ count: communityRates.count })}'>${t('community reports: {count}', { count: communityRates.count })}</span>` : ''}
          </div>
        </div>
      `;
    });
  });

  if (!html) {
    container.innerHTML = `<p class="muted" data-i18n="No market data available yet. Check back after first transactions.">ℹ️ ${t('No market data available yet. Check back after first transactions.')}</p>`;
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:15px;padding:12px;background:rgba(156,39,176,0.1);border-radius:6px;border-left:3px solid var(--info);font-size:13px;">
      <strong data-i18n="Market Consensus (Read-Only):">ℹ️ ${t('Market Consensus (Read-Only):')}</strong> <span data-i18n="Transactions = completed sales. Community = buyer reports (filtered: ≥3 reports, ±25% outlier exclusion).">${t('Transactions = completed sales. Community = buyer reports (filtered: ≥3 reports, ±25% outlier exclusion).')}</span>
    </div>
    ${html}
  `;
}

function renderMiddlemanNotifications() {
  const container = document.getElementById('middlemanNotificationsContainer');
  if (!container) return;

  withLoadingSkeleton(container, 'list', () => {
    const notifications = getNotifications().filter(n => ['offer_accepted', 'new_listing', 'deal_finalized'].includes(n.type) && (!n.audience || n.audience === 'middleman'));
    const activeNotifications = notifications.filter(n => !n.read);
    const unreadCount = activeNotifications.length;
    const filtered = activeNotifications.filter(n => {
      if (middlemanNotificationFilter === 'action') return n.priority === 'ActionRequired';
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (!activeNotifications.length) {
      container.innerHTML = renderEmptyState('🔔', 'All caught up', 'No unread notifications right now.');
      return;
    }

    const filters = `
      <div class="notification-toolbar">
        <button class="btn-secondary ${middlemanNotificationFilter === 'all' ? 'active' : ''}" type="button" data-middleman-notification-filter="all" data-i18n="All">${t('All')}</button>
        <button class="btn-secondary ${middlemanNotificationFilter === 'unread' ? 'active' : ''}" type="button" data-middleman-notification-filter="unread" data-i18n="Unread (${unreadCount})">${t('Unread (${count})', { count: unreadCount })}</button>
        <button class="btn-secondary ${middlemanNotificationFilter === 'action' ? 'active' : ''}" type="button" data-middleman-notification-filter="action" data-i18n="Action Required">${t('Action Required')}</button>
        <span class="notification-toolbar-spacer"></span>
        <button class="btn-primary" type="button" data-middleman-mark-all-read ${unreadCount === 0 ? 'disabled' : ''} data-i18n="Mark all as read">${t('Mark all as read')}</button>
      </div>
    `;

    const cards = filtered.map(n => {
      const badge = `<span class="badge" style="background:${n.priority === 'Finalized' ? 'var(--success)' : n.priority === 'ActionRequired' ? 'var(--pending)' : 'var(--info)'};color:white;" data-i18n="${n.priority || 'Info'}">${t(n.priority || 'Info')}</span>`;
      const unreadDot = !n.read ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--danger);display:inline-block;"></span>' : '';
      let body = '';
      if (n.type === 'offer_accepted') {
        body = `<div data-i18n="Offer {offerId} accepted for {qty} @ {price}. Finalize soon." data-i18n-vars='${JSON.stringify({ offerId: n.offerId, qty: n.quantity, price: `₹${n.acceptedPrice}` })}'>${t('Offer {offerId} accepted for {qty} @ {price}. Finalize soon.', { offerId: n.offerId, qty: n.quantity, price: `₹${n.acceptedPrice}` })}</div>`;
      } else if (n.type === 'new_listing') {
        body = `<div data-i18n="New listing {listingId} submitted by {farmer}." data-i18n-vars='${JSON.stringify({ listingId: n.listingId, farmer: n.farmerId || t('Farmer') })}'>${t('New listing {listingId} submitted by {farmer}.', { listingId: n.listingId, farmer: n.farmerId || t('Farmer') })}</div>`;
      } else if (n.type === 'deal_finalized') {
        const cropDisplay = getCropDisplayName(n.cropName || '');
        body = `<div data-i18n="Deal finalized for {crop} • {amount}" data-i18n-vars='${JSON.stringify({ crop: cropDisplay, amount: n.totalAmount ? `₹${n.totalAmount}` : '' })}'>${t('Deal finalized for {crop} • {amount}', { crop: cropDisplay, amount: n.totalAmount ? `₹${n.totalAmount}` : '' })}</div>`;
      }
      return `
        <div class="notification-card unread" data-id="${n.id}">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${unreadDot}
              <strong>${t(n.type)}</strong>
            </div>
            ${badge}
          </div>
          <p style="margin:0 0 8px 0;font-size:14px;">${body}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="muted" style="font-size:12px;">${new Date(n.timestamp).toLocaleString()}</span>
            <button class="btn-link" style="font-size:12px;" data-middleman-mark-read="${n.id}" data-i18n="Mark as read">${t('Mark as read')}</button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = filters + `<div class="notification-stack">${cards}</div>`;
  });
}

function renderMiddlemanInsights() {
  const container = document.getElementById('middlemanInsightsContainer');
  if (!container) return;
  const heat = computeDemandHeat();
  const hotCrops = computeHotCropsToday();
  const topCity = computeTopCityToday();
  const todayTxns = getSoldTransactions().filter(t => t.timestamp.split('T')[0] === new Date().toISOString().split('T')[0]);
  const avgDeal = todayTxns.length ? todayTxns.reduce((s, t) => s + (t.totalAmount || 0), 0) / todayTxns.length : 0;
  const bestCrop = hotCrops[0];
  const last7 = {};
  getSoldTransactions().forEach(t => {
    const day = t.timestamp.split('T')[0];
    if ((Date.now() - new Date(t.timestamp).getTime()) <= 7 * 86400000) {
      if (!last7[day]) last7[day] = { count: 0, total: 0 };
      last7[day].count += 1;
      last7[day].total += t.totalAmount || 0;
    }
  });
  const trendRows = Object.keys(last7).sort().map(day => {
    const data = last7[day];
    const avg = data.count ? data.total / data.count : 0;
    return `<div style="display:flex;justify-content:space-between;font-size:12px;"><span>${day}</span><span data-i18n="deals: {count} • {amount}" data-i18n-vars='${JSON.stringify({ count: data.count, amount: `₹${avg.toFixed(2)}` })}'>${t('deals: {count} • {amount}', { count: data.count, amount: `₹${avg.toFixed(2)}` })}</span></div>`;
  }).join('') || `<div class="muted" style="font-size:12px;" data-i18n="No deals in last 7 days">${t('No deals in last 7 days')}</div>`;

  const hotCropHtml = hotCrops.length ? hotCrops.map((c, idx) => `<div style="display:flex;justify-content:space-between;"><span>🔥 ${idx + 1}. ${getCropDisplayName(c.crop)}</span><strong>${c.score}</strong></div>`).join('') : `<div class="muted" data-i18n="No hot crops today">${t('No hot crops today')}</div>`;
  const topCityHtml = topCity ? `<div style="display:flex;justify-content:space-between;"><span>🏙️ ${topCity.city}</span><strong>₹${topCity.value.toFixed(2)}</strong></div>` : `<div class="muted" data-i18n="No sales today">${t('No sales today')}</div>`;

  if (!todayTxns.length && !hotCrops.length && !topCity) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title" data-i18n="No data available yet">No data available yet</div>
        <div class="empty-state-text" data-i18n="Insights will appear after the first few transactions.">Insights will appear after the first few transactions.</div>
        <button class="btn-secondary" type="button" style="margin-top:12px;" data-scroll-target="commissionSection" data-i18n="View past trends">View past trends</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
      <div class="card" style="padding:12px;background:rgba(16,185,129,0.08);border:1px dashed rgba(16,185,129,0.4);">
        <div class="muted" style="font-size:12px;" data-i18n="Best selling crop today">${t('Best selling crop today')}</div>
        <div style="font-size:18px;font-weight:700;">${bestCrop ? getCropDisplayName(bestCrop.crop) : '—'}</div>
      </div>
      <div class="card" style="padding:12px;background:rgba(33,150,243,0.08);border:1px dashed rgba(33,150,243,0.4);">
        <div class="muted" style="font-size:12px;" data-i18n="Best selling city today">${t('Best selling city today')}</div>
        <div style="font-size:18px;font-weight:700;">${topCity ? topCity.city : '—'}</div>
      </div>
      <div class="card" style="padding:12px;background:rgba(255,193,7,0.08);border:1px dashed rgba(255,193,7,0.4);">
        <div class="muted" style="font-size:12px;" data-i18n="Deals closed today">${t('Deals closed today')}</div>
        <div style="font-size:20px;font-weight:700;">${todayTxns.length}</div>
        <div style="font-size:12px;color:var(--muted);" data-i18n="Avg value: {amount}" data-i18n-vars='${JSON.stringify({ amount: `₹${avgDeal.toFixed(2)}` })}'>${t('Avg value: {amount}', { amount: `₹${avgDeal.toFixed(2)}` })}</div>
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-weight:600;margin-bottom:6px;" data-i18n="Demand Heat">${t('Demand Heat')}</div>
        <div style="font-size:18px;font-weight:700;"><span data-i18n="${heat.heat}">${t(heat.heat)}</span></div>
        <div style="font-size:12px;color:var(--muted);" data-i18n="Score: {score}" data-i18n-vars='${JSON.stringify({ score: heat.score })}'>${t('Score: {score}', { score: heat.score })}</div>
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-weight:600;margin-bottom:6px;" data-i18n="Hot crops">${t('Hot crops')}</div>
        ${hotCropHtml}
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-weight:600;margin-bottom:6px;" data-i18n="Top city">${t('Top city')}</div>
        ${topCityHtml}
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-weight:600;margin-bottom:6px;" data-i18n="Last 7 days">${t('Last 7 days')}</div>
        ${trendRows}
      </div>
    </div >
    `;
}

function computeOpportunityAlerts(limit = 2) {
  const now = Date.now();
  const last24h = now - (24 * 60 * 60 * 1000);
  const listings = getListings().filter(l => l && l.status === 'Approved');
  const offers = getOffers().filter(o => {
    const ts = new Date(o.timestamp || o.createdAt || now).getTime();
    return Number.isFinite(ts) && ts >= last24h;
  });

  const map = {};
  listings.forEach(listing => {
    const key = `${listing.city}| ${listing.name} `;
    if (!map[key]) map[key] = { city: listing.city, crop: listing.name, supply: 0, demand: 0, offers: 0 };
    map[key].supply += Number(listing.quantity || 0);
  });
  offers.forEach(offer => {
    const listing = listings.find(l => String(l.listingId) === String(offer.listingId));
    const city = listing?.city || offer.city || '';
    const crop = listing?.name || offer.cropName || offer.crop || '';
    if (!city || !crop) return;
    const key = `${city}| ${crop} `;
    if (!map[key]) map[key] = { city, crop, supply: 0, demand: 0, offers: 0 };
    map[key].offers += 1;
    map[key].demand += Number(offer.counteredQty || offer.acceptedQty || offer.quantity || 0);
  });

  return Object.values(map)
    .map(entry => {
      const safeSupply = Math.max(1, entry.supply);
      const pressure = entry.demand / safeSupply;
      const score = (pressure * 100) + (entry.offers * 8);
      return { ...entry, pressure, score };
    })
    .filter(entry => entry.offers > 0 && (entry.pressure >= 0.45 || entry.supply === 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function renderMiddlemanAlerts() {
  const container = document.getElementById('middlemanAlerts');
  if (!container) return;
  const hotCrops = computeHotCropsToday().slice(0, 2).map(c => getCropDisplayName(c.crop));
  const demandLine = hotCrops.length ? hotCrops.join(', ') : t('Cotton, Onion');
  const opportunities = computeOpportunityAlerts(2);
  const opportunitiesLine = opportunities.length
    ? opportunities.map(item => `${getCropDisplayName(item.crop)} (${item.city})`).join(' | ')
    : t('No high-pressure pair right now');
  container.innerHTML = `
    <div class="alert-banner">
      <span data-i18n="Highest demand today: {crops}" data-i18n-vars='${JSON.stringify({ crops: demandLine })}'>${t('Highest demand today: {crops}', { crops: demandLine })}</span>
      <span>⚡</span>
    </div>
    <div class="alert-banner secondary">
      <span data-i18n="Spring planting season peak activity">${t('Spring planting season peak activity')}</span>
      <span>🌱</span>
    </div>
    <div class="alert-banner">
      <span data-i18n="Opportunity alerts: {opportunities}" data-i18n-vars='${JSON.stringify({ opportunities: opportunitiesLine })}'>${t('Opportunity alerts: {opportunities}', { opportunities: opportunitiesLine })}</span>
      <span>📈</span>
    </div>
  `;
}

function getSeasonLabel() {
  return t('Spring planting season');
}

function setMiddlemanNotificationFilter(filter) {
  middlemanNotificationFilter = filter;
  renderMiddlemanNotifications();
}

function markAllMiddlemanNotificationsRead() {
  markAllNotificationsRead(n => ['offer_accepted', 'new_listing', 'deal_finalized'].includes(n.type) && (!n.audience || n.audience === 'middleman'));
  renderMiddlemanNotifications();
}

function initMiddlemanNotificationInteractions() {
  const container = document.getElementById('middlemanNotificationsContainer');
  if (!container) return;
  container.addEventListener('click', (event) => {
    const filterBtn = event.target.closest('button[data-middleman-notification-filter]');
    if (filterBtn) {
      const filter = filterBtn.getAttribute('data-middleman-notification-filter');
      if (filter) setMiddlemanNotificationFilter(filter);
      return;
    }
    if (event.target.closest('button[data-middleman-mark-all-read]')) {
      markAllMiddlemanNotificationsRead();
      return;
    }
    const markReadBtn = event.target.closest('button[data-middleman-mark-read]');
    if (markReadBtn) {
      const notificationId = markReadBtn.getAttribute('data-middleman-mark-read');
      if (!notificationId) return;
      markNotificationRead(notificationId);
      renderMiddlemanNotifications();
    }
  });
}

// ==================== DEMO TOOLS ====================
function initDemoTools(role) {
  const map = {
    middleman: { quick: 'demoQuickSetupBtnMiddleman', reset: 'demoResetBtnMiddleman', seed: 'demoSeedBtnMiddleman', topSeed: 'quickSeedDemoBtnMiddleman', status: 'demoStatusMiddleman', guide: 'demoGuideBtnMiddleman' }
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
    renderListings();
    renderPendingOffers();
    renderEarningsStats();
    renderEarningsTable();
    renderMiddlemanInsights();
    renderMiddlemanOverview();
    renderMiddlemanMetrics();
    renderPendingOrdersSummary();
    renderRecentTransactions();
    renderMiddlemanNotifications();
    renderCommunityMarketSignals();
    renderMarketConsensusV2();
  };

  if (seedBtn) seedBtn.addEventListener('click', runSeed);
  if (topSeedBtn) topSeedBtn.addEventListener('click', runSeed);

  if (guideBtn) {
    guideBtn.addEventListener('click', () => {
      toggleGuidedDemoMiddleman(statusEl);
    });
  }

  // Dev-only QA harness panel
  if (typeof initQAMode === 'function') {
    initQAMode(role);
  }
}

function toggleGuidedDemoMiddleman(statusEl) {
  const steps = [
    { selector: '[data-demo-step="farmer-list"]', key: 'Step 1: Farmer lists produce' },
    { selector: '[data-demo-step="middleman-listings"]', key: 'Step 2: Middleman approves listings' },
    { selector: '[data-demo-step="buyer-listings"]', key: 'Step 3: Buyer places offer' },
    { selector: '[data-demo-step="middleman-finalize"]', key: 'Step 4: Middleman finalizes trade' }
  ];

  if (demoTimerMiddleman) {
    clearInterval(demoTimerMiddleman);
    demoTimerMiddleman = null;
    clearDemoHighlights();
    if (statusEl) {
      statusEl.setAttribute('data-i18n', 'Guided demo stopped.');
      statusEl.textContent = typeof t === 'function' ? t('Guided demo stopped.') : 'Guided demo stopped.';
    }
    return;
  }

  let idx = 0;
  demoTimerMiddleman = setInterval(() => {
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
