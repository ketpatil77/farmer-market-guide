// QA Mode (dev-only): lightweight in-app smoke tests using real app functions.
// Runs entirely locally and only manipulates runtime localStorage data.

(function () {
  function safeText(s) {
    return (s == null ? '' : String(s));
  }

  function nowTime() {
    try { return new Date().toLocaleTimeString(); } catch (e) { return ''; }
  }

  function el(tag, attrs = {}, html = '') {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'style') node.setAttribute('style', v);
      else if (k.startsWith('data-')) node.setAttribute(k, v);
      else node[k] = v;
    });
    if (html) node.innerHTML = html;
    return node;
  }

  function tryCall(fn, ...args) {
    try {
      if (typeof fn === 'function') return { ok: true, value: fn(...args) };
      return { ok: false, error: new Error('Not a function') };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  function refreshUI() {
    const fns = [
      // Buyer
      'renderBuyerListings',
      'renderBuyerAnalytics',
      'renderPurchaseHistory',
      'renderBuyerNotifications',
      'renderBuyerInsights',
      // Farmer
      'renderMyListings',
      'renderNotifications',
      'renderSoldDeals',
      'renderFarmerAnalytics',
      'renderFarmerInsights',
      // Middleman
      'renderListings',
      'renderMiddlemanAnalytics',
      'renderPendingOffers',
      'renderEarningsStats',
      'renderEarningsTable',
      'renderCommunityMarketSignals',
      'renderMarketConsensusV2',
      'renderMiddlemanNotifications',
      'renderMiddlemanInsights'
    ];
    fns.forEach(name => {
      if (typeof window[name] === 'function') {
        try { window[name](); } catch (e) {}
      }
    });
  }

  function setBuyerCityUI(city) {
    try {
      localStorage.setItem(STORAGE_KEYS.buyerCity, city);
    } catch (e) {}
    try {
      const container = document.getElementById('buyerCitySearchContainer');
      const input = container ? container.querySelector('input.search-field') : null;
      if (input) input.value = city;
    } catch (e) {}
  }

  function qaCreateListing({ farmerId, city, crop, quantity, price }) {
    const listings = getListings();
    const id = Date.now();
    const listingId = `LST-QA-${id}`;
    const cropInfo = typeof getCropInfo === 'function' ? getCropInfo(crop) : null;
    const category = cropInfo?.category || 'Vegetables';
    const base = {
      id,
      listingId,
      farmerId,
      city,
      category,
      name: crop,
      commodity: crop,
      quantity,
      price,
      approvedPrice: 0,
      quality: 'Good',
      verifiedQuality: 'Good',
      description: 'QA listing',
      unit: 'kg',
      availabilityDate: new Date().toISOString(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    const normalized = typeof normalizeListing === 'function' ? normalizeListing(base, listings.length, { farmerId }) : base;
    listings.push(normalized);
    saveListings(listings);
    try { if (typeof notifyNewListing === 'function') notifyNewListing(normalized); } catch (e) {}
    try { if (typeof triggerMiddlemanNotification === 'function') triggerMiddlemanNotification(normalized); } catch (e) {}
    return normalized;
  }

  function findCardByListingId(listingId) {
    return document.querySelector(`[data-listing-id="${listingId}"], [data-listing-card][data-listing-id="${listingId}"]`);
  }

  function queryText(container, needle) {
    if (!container) return false;
    return safeText(container.textContent).toLowerCase().includes(String(needle).toLowerCase());
  }

  async function runSmokeTest(reportEl, opts = {}) {
    const log = (type, title, detail = '') => {
      const row = el('div', { class: `qa-row qa-${type}` });
      const badge = type === 'pass' ? 'PASS' : type === 'fail' ? 'FAIL' : type === 'info' ? 'INFO' : '...';
      row.innerHTML = `<span class="qa-badge">${badge}</span><span class="qa-title">${safeText(title)}</span><span class="qa-detail">${safeText(detail)}</span><span class="qa-time">${nowTime()}</span>`;
      reportEl.appendChild(row);
      reportEl.scrollTop = reportEl.scrollHeight;
    };

    const assert = (cond, msg) => {
      if (!cond) throw new Error(msg || 'Assertion failed');
    };

    reportEl.innerHTML = '';
    log('info', typeof t === 'function' ? t('QA started') : 'QA started');

    // Step 1: Reset runtime data
    try {
      const res = resetAppDataForUser();
      initAppData();
      assert(Array.isArray(getListings()) && getListings().length === 0, 'Listings not cleared');
      assert(Array.isArray(getOffers()) && getOffers().length === 0, 'Offers not cleared');
      assert(Array.isArray(getTransactions()) && getTransactions().length === 0, 'Transactions not cleared');
      log('pass', typeof t === 'function' ? t('Reset runtime data') : 'Reset runtime data');
      // Keep role IDs for later steps
      opts.farmerId = res?.farmerId || ensureRole('farmer');
      opts.buyerId = res?.buyerId || ensureRole('buyer');
      opts.middlemanId = res?.middlemanId || ensureRole('middleman');
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Reset runtime data') : 'Reset runtime data', e.message);
      return;
    }

    // Step 2: Seed minimal entities (roles)
    try {
      const farmerId = opts.farmerId || ensureRole('farmer');
      const buyerId = opts.buyerId || ensureRole('buyer');
      const middlemanId = opts.middlemanId || ensureRole('middleman');
      assert(!!farmerId && !!buyerId && !!middlemanId, 'Missing role IDs');
      log('pass', typeof t === 'function' ? t('Seed minimal entities') : 'Seed minimal entities', `${farmerId}, ${buyerId}, ${middlemanId}`);
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Seed minimal entities') : 'Seed minimal entities', e.message);
      return;
    }

    const city = opts.city || 'Pune';
    const crop = opts.crop || 'Tomato';
    const qty = Number.isFinite(opts.quantity) ? opts.quantity : 10;
    const price = Number.isFinite(opts.price) ? opts.price : 15;
    const counterPrice = Number.isFinite(opts.counterPrice) ? opts.counterPrice : 16;

    let listing = null;
    let offer = null;
    let txn = null;

    // Step 3: Farmer creates listing
    try {
      listing = qaCreateListing({ farmerId: opts.farmerId, city, crop, quantity: qty, price });
      assert(listing && listing.listingId, 'Listing not created');
      assert(listing.status === 'Pending', 'Listing should start Pending');
      log('pass', typeof t === 'function' ? t('Farmer creates listing') : 'Farmer creates listing', `${listing.listingId}`);
      setBuyerCityUI(city);
      refreshUI();
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Farmer creates listing') : 'Farmer creates listing', e.message);
      return;
    }

    // Step 4: Middleman approves
    try {
      const updated = updateListingStatus(listing.listingId, 'Approved');
      assert(updated && updated.status === 'Approved', 'Listing not approved');
      log('pass', typeof t === 'function' ? t('Middleman approves') : 'Middleman approves', `${listing.listingId} → Approved`);
      refreshUI();
      // UI assert (if buyer listings container exists)
      const container = document.getElementById('approvedListingsContainer');
      if (container) {
        assert(findCardByListingId(listing.listingId), 'Buyer UI did not render approved listing');
      }
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Middleman approves') : 'Middleman approves', e.message);
      return;
    }

    // Step 5: Buyer offers
    try {
      const res = recordOfferAndNotify({ listingId: listing.listingId, buyerId: opts.buyerId, offeredPrice: price, quantity: qty });
      offer = res?.offer || null;
      assert(offer && offer.offerId, 'Offer not created');
      assert(offer.status === 'OfferPlaced', 'Offer should be OfferPlaced');
      log('pass', typeof t === 'function' ? t('Buyer offers') : 'Buyer offers', `${offer.offerId} @ ₹${price}`);
      refreshUI();
      // UI assert (buyer card should show offer state or disable duplicate offer)
      const card = findCardByListingId(listing.listingId);
      if (card) {
        assert(queryText(card, 'Your Offer') || queryText(card, 'Offer') || queryText(card, 'OFF-'), 'Buyer UI did not show offer state');
      }
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Buyer offers') : 'Buyer offers', e.message);
      return;
    }

    // Step 6: Farmer counter-offers
    try {
      const updated = counterOfferPrice(offer.offerId, counterPrice);
      assert(updated && updated.status === 'Countered', 'Offer not countered');
      assert(Number(updated.counteredPrice) === counterPrice, 'Counter price mismatch');
      log('pass', typeof t === 'function' ? t('Farmer counter-offers') : 'Farmer counter-offers', `₹${counterPrice}`);
      refreshUI();
      const card = findCardByListingId(listing.listingId);
      if (card) {
        assert(queryText(card, 'Countered') || queryText(card, 'counter'), 'Buyer UI did not show counter state');
      }
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Farmer counter-offers') : 'Farmer counter-offers', e.message);
      return;
    }

    // Step 7: Buyer accepts counter
    try {
      const updated = acceptOffer(offer.offerId);
      assert(updated && updated.status === 'Accepted', 'Offer not accepted');
      assert(Number(updated.acceptedPrice) === counterPrice, 'Accepted price mismatch');
      const listingAfter = getListings().find(l => l.listingId === listing.listingId);
      assert(listingAfter && listingAfter.status === 'PurchaseRequested', 'Listing should be PurchaseRequested after accept');
      log('pass', typeof t === 'function' ? t('Buyer accepts counter') : 'Buyer accepts counter', `₹${counterPrice}`);
      refreshUI();
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Buyer accepts counter') : 'Buyer accepts counter', e.message);
      return;
    }

    // Step 8: Middleman finalizes
    try {
      txn = finalizeTransaction(offer.offerId, opts.middlemanId);
      assert(txn && txn.transactionId, 'Transaction not finalized');
      log('pass', typeof t === 'function' ? t('Middleman finalizes') : 'Middleman finalizes', `${txn.transactionId}`);
      refreshUI();
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Middleman finalizes') : 'Middleman finalizes', e.message);
      return;
    }

    // Step 9: Verify Sold everywhere (storage + current UI)
    try {
      const listingAfter = getListings().find(l => l.listingId === listing.listingId);
      const offerAfter = getOffers().find(o => o.offerId === offer.offerId);
      const txns = getTransactions().filter(t => t.listingId === listing.listingId);
      assert(listingAfter && listingAfter.status === 'Sold', 'Listing not Sold');
      assert(offerAfter && offerAfter.status === 'Finalized', 'Offer not Finalized');
      assert(txns.length === 1, 'Duplicate transactions detected');
      assert(Number(listingAfter.soldQty) === qty, 'Sold quantity mismatch');
      assert(Number(listingAfter.soldRate) === counterPrice, 'Sold rate mismatch');
      assert(Number(txns[0].quantity) === qty, 'Txn quantity mismatch');
      assert(Number(txns[0].finalRate || txns[0].finalPrice) === counterPrice, 'Txn rate mismatch');

      // Idempotency: finalize twice should not create duplicates
      const before = getTransactions().length;
      const again = finalizeTransaction(offer.offerId, opts.middlemanId);
      const after = getTransactions().length;
      assert(!again && before === after, 'Finalize idempotency failed');

      // UI verify (if buyer purchased section exists)
      const container = document.getElementById('approvedListingsContainer');
      if (container) {
        refreshUI();
        const soldCard = findCardByListingId(listing.listingId);
        assert(soldCard && (queryText(soldCard, 'Completed') || queryText(soldCard, 'Sold') || queryText(soldCard, 'Purchased')), 'UI did not show completed trade');
      }

      log('pass', typeof t === 'function' ? t('Verify Sold state') : 'Verify Sold state', `${listing.listingId} ✔`);
    } catch (e) {
      log('fail', typeof t === 'function' ? t('Verify Sold state') : 'Verify Sold state', e.message);
      return;
    }

    log('pass', typeof t === 'function' ? t('QA completed') : 'QA completed');
  }

  function injectPanel(role) {
    const statusId = role === 'buyer' ? 'demoStatusBuyer' : role === 'farmer' ? 'demoStatusFarmer' : role === 'middleman' ? 'demoStatusMiddleman' : null;
    const statusEl = statusId ? document.getElementById(statusId) : null;
    const host = statusEl ? statusEl.parentElement : null;
    if (!host) return;
    if (host.querySelector('[data-qa-panel]')) return;

    const wrapper = el('div', { class: 'qa-panel', 'data-qa-panel': '1' });
    wrapper.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <button type="button" class="btn" data-qa-toggle data-i18n="QA Mode">QA Mode</button>
        <button type="button" class="btn-primary" data-qa-run style="display:none;" data-i18n="Run QA Smoke Test">Run QA Smoke Test</button>
        <div class="muted" style="font-size:12px;" data-qa-hint data-i18n="Runs local smoke tests; resets runtime data.">Runs local smoke tests; resets runtime data.</div>
      </div>
      <div class="qa-report" data-qa-report style="display:none;"></div>
    `;

    host.appendChild(wrapper);

    const toggleBtn = wrapper.querySelector('[data-qa-toggle]');
    const runBtn = wrapper.querySelector('[data-qa-run]');
    const report = wrapper.querySelector('[data-qa-report]');

    const show = (visible) => {
      report.style.display = visible ? 'block' : 'none';
      runBtn.style.display = visible ? 'inline-flex' : 'none';
      wrapper.classList.toggle('is-open', !!visible);
    };

    let isOpen = false;
    toggleBtn.addEventListener('click', () => {
      isOpen = !isOpen;
      show(isOpen);
    });

    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      runBtn.classList.add('is-loading');
      try {
        await runSmokeTest(report, {});
      } finally {
        runBtn.disabled = false;
        runBtn.classList.remove('is-loading');
      }
    });
  }

  // Public init: called from dashboards (demo tools).
  window.initQAMode = function (role) {
    try { injectPanel(role); } catch (e) {}
  };
})();

