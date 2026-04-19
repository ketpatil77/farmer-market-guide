const STORAGE_KEYS = {
  listings: 'listings',
  offers: 'offers',
  notifications: 'notifications',
  cities: 'cities',
  crops: 'crops',
  transactions: 'transactions',
  farmers: 'farmers',
  buyers: 'buyers',
  middlemen: 'middlemen',
  currentFarmerId: 'currentFarmerId',
  currentBuyerId: 'currentBuyerId',
  currentMiddlemanId: 'currentMiddlemanId',
  buyerCity: 'buyerCity',
  recentCities: 'recentCities',
  recentCrops: 'recentCrops',
  theme: 'theme',
  language: 'language',
  auditLog: 'auditLog',
  appDataVersion: 'appDataVersion',
  dailyMarketRates: 'dailyMarketRates',
  communityMarketRates: 'communityMarketRates',
  marketIntelligenceV2: 'marketIntelligenceV2',
  uploadedProductImage: 'uploadedProductImage',
  uploadedProductImageMeta: 'uploadedProductImageMeta',
  listingImages: 'listingImages',
  buyerSavedCrops: 'buyerSavedCrops'
};

const APP_DATA_VERSION = '2.1.0';
const UPLOADED_PRODUCT_IMAGE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmM2Y0ZjYiLz48cmVjdCB4PSIyMCIgeT0iMjAiIHdpZHRoPSIyNjAiIGhlaWdodD0iMjYwIiByeD0iMTYiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2QxZDVkYiIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTIwIiBjeT0iMTIwIiByPSIzNiIgZmlsbD0iI2U1ZTdlYiIvPjxwYXRoIGQ9Ik02MCAyMjBsNjAtNjAgNTAgNTAgNDAtNDAgNTAgNTB2MjBINjB6IiBmaWxsPSIjZDFkNWRiIi8+PHRleHQgeD0iMTUwIiB5PSIyNjUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

const VALID_STATUSES = ['Pending', 'Approved', 'Rejected', 'PurchaseRequested', 'Sold'];
const VALID_OFFER_STATUSES = ['OfferPlaced', 'Accepted', 'Rejected', 'Countered', 'Finalized'];
const COMMISSION_RATE = 0.05;
const COMMISSION_RULE_KEY = 'commissionRules';
const MAHARASHTRA_CITIES = ['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Aurangabad', 'Kolhapur', 'Solapur', 'Satara', 'Sangli', 'Ahmednagar', 'Jalgaon', 'Dhule', 'Nandurbar', 'Beed', 'Latur', 'Osmanabad', 'Parbhani', 'Hingoli', 'Nanded', 'Akola', 'Amravati', 'Buldhana', 'Washim', 'Yavatmal', 'Wardha', 'Chandrapur', 'Gadchiroli', 'Gondia', 'Bhandara', 'Raigad', 'Ratnagiri', 'Sindhudurg', 'Thane', 'Palghar', 'Vasai-Virar', 'Kalyan-Dombivli', 'Panvel', 'Malegaon', 'Baramati', 'Indapur', 'Karad', 'Pandharpur', 'Ichalkaranji', 'Vikarabad', 'Taloja', 'Khandala', 'Lonavala', 'Lavasa'].sort();

const MAHARASHTRA_CROPS = [
  { english: 'Cotton', marathi: 'कापूस', category: 'Cash Crops' },
  { english: 'Soybean', marathi: 'सोयाबीन', category: 'Cash Crops' },
  { english: 'Sugarcane', marathi: 'ऊस', category: 'Cash Crops' },
  { english: 'Tobacco', marathi: 'तंबाखू', category: 'Cash Crops' },
  { english: 'Wheat', marathi: 'गहू', category: 'Food Grains' },
  { english: 'Rice', marathi: 'तांदूळ', category: 'Food Grains' },
  { english: 'Jowar', marathi: 'ज्वारी', category: 'Food Grains' },
  { english: 'Bajra', marathi: 'बाजरी', category: 'Food Grains' },
  { english: 'Maize', marathi: 'मक्का', category: 'Food Grains' },
  { english: 'Tur', marathi: 'तूर', category: 'Pulses' },
  { english: 'Gram', marathi: 'चने', category: 'Pulses' },
  { english: 'Udid', marathi: 'उडीद', category: 'Pulses' },
  { english: 'Moong', marathi: 'मूग', category: 'Pulses' },
  { english: 'Masoor', marathi: 'मसूर', category: 'Pulses' },
  { english: 'Groundnut', marathi: 'मूंगफळी', category: 'Oilseeds' },
  { english: 'Sunflower', marathi: 'सूर्यफूल', category: 'Oilseeds' },
  { english: 'Sorghum', marathi: 'ज्वारी', category: 'Oilseeds' },
  { english: 'Sesame', marathi: 'तिळ', category: 'Oilseeds' },
  { english: 'Safflower', marathi: 'कुसुम', category: 'Oilseeds' },
  { english: 'Onion', marathi: 'कांदा', category: 'Vegetables' },
  { english: 'Tomato', marathi: 'टोमेटो', category: 'Vegetables' },
  { english: 'Potato', marathi: 'बटाटा', category: 'Vegetables' },
  { english: 'Cabbage', marathi: 'कोबी', category: 'Vegetables' },
  { english: 'Cauliflower', marathi: 'फूलगोभी', category: 'Vegetables' },
  { english: 'Carrot', marathi: 'गाजर', category: 'Vegetables' },
  { english: 'Brinjal', marathi: 'वांगे', category: 'Vegetables' },
  { english: 'Chilli', marathi: 'मिरची', category: 'Vegetables' },
  { english: 'Garlic', marathi: 'लसूण', category: 'Vegetables' },
  { english: 'Spinach', marathi: 'पालक', category: 'Vegetables' },
  { english: 'Capsicum', marathi: 'शिमला मिरची', category: 'Vegetables' },
  { english: 'Okra', marathi: 'भिंडी', category: 'Vegetables' },
  { english: 'Cucumber', marathi: 'काकडी', category: 'Vegetables' },
  { english: 'Bottle Gourd', marathi: 'लाऊकी', category: 'Vegetables' },
  { english: 'Bitter Gourd', marathi: 'करले', category: 'Vegetables' },
  { english: 'Ridge Gourd', marathi: 'परवळ', category: 'Vegetables' },
  { english: 'Pumpkin', marathi: 'भोपळा', category: 'Vegetables' },
  { english: 'Radish', marathi: 'मूळा', category: 'Vegetables' },
  { english: 'Turnip', marathi: 'शलगम', category: 'Vegetables' },
  { english: 'Banana', marathi: 'केळी', category: 'Fruits' },
  { english: 'Grapes', marathi: 'द्राक्ष', category: 'Fruits' },
  { english: 'Mango', marathi: 'आम', category: 'Fruits' },
  { english: 'Citrus', marathi: 'साखरी', category: 'Fruits' },
  { english: 'Orange', marathi: 'नारंगी', category: 'Fruits' },
  { english: 'Lemon', marathi: 'लिंबू', category: 'Fruits' },
  { english: 'Apple', marathi: 'सफरचंद', category: 'Fruits' },
  { english: 'Pomegranate', marathi: 'डाळिंब', category: 'Fruits' },
  { english: 'Papaya', marathi: 'पपई', category: 'Fruits' },
  { english: 'Guava', marathi: 'अमरूद', category: 'Fruits' },
  { english: 'Custard Apple', marathi: 'शरिफा', category: 'Fruits' },
  { english: 'Strawberry', marathi: 'स्ट्रॉबेरी', category: 'Fruits' },
  { english: 'Pineapple', marathi: 'अननस', category: 'Fruits' },
  { english: 'Turmeric', marathi: 'हळद', category: 'Spices' },
  { english: 'Chilli Powder', marathi: 'मिरच्या पावडर', category: 'Spices' },
  { english: 'Coriander', marathi: 'धने', category: 'Spices' },
  { english: 'Cumin', marathi: 'जिरा', category: 'Spices' },
  { english: 'Pepper', marathi: 'काळीमिरच', category: 'Spices' },
  { english: 'Clove', marathi: 'लवंग', category: 'Spices' },
  { english: 'Cardamom', marathi: 'इलायची', category: 'Spices' },
  { english: 'Fenugreek', marathi: 'मेथी', category: 'Spices' },
  { english: 'Asafoetida', marathi: 'हिंग', category: 'Spices' },
  { english: 'Clove Leaf', marathi: 'लवंगपत्री', category: 'Spices' },
  { english: 'Hay', marathi: 'सुकी गवत', category: 'Fodder/Others' },
  { english: 'Straw', marathi: 'पुआल', category: 'Fodder/Others' },
  { english: 'Green Fodder', marathi: 'हिरवे चारे', category: 'Fodder/Others' },
  { english: 'Silage', marathi: 'साईलेज', category: 'Fodder/Others' }
];

// ==================== REAL-TIME EVENT BRIDGE ====================
// This project runs as a static app (no server-side push). To support "real-time"
// in-app updates across dashboards opened in different tabs, we bridge CustomEvents
// over BroadcastChannel when available (storage events + polling remain as fallback).
const FARMA_RT_CHANNEL = 'farma-market-guide';
const FARMA_CLIENT_ID = `cli-${Date.now()}-${Math.random().toString(16).slice(2)}`;
let farmaRtChannel = null;
let farmaRtListenerAttached = false;
let farmaSse = null;
let farmaSseConnected = false;
const FARMA_MEMORY_STORE = {};

function getStoreValue(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null && value !== undefined) return value;
  } catch (e) { }
  try {
    const value = sessionStorage.getItem(key);
    if (value !== null && value !== undefined) return value;
  } catch (e) { }
  if (Object.prototype.hasOwnProperty.call(FARMA_MEMORY_STORE, key)) return FARMA_MEMORY_STORE[key];
  return null;
}

function setStoreValue(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { }
  try { sessionStorage.setItem(key, value); } catch (e) { }
  FARMA_MEMORY_STORE[key] = value;
}

function removeStoreValue(key) {
  try { localStorage.removeItem(key); } catch (e) { }
  try { sessionStorage.removeItem(key); } catch (e) { }
  delete FARMA_MEMORY_STORE[key];
}

const UI_FLAG_DEFAULTS = {
  UI_DEV_MODE: false,
  UI_ADVANCED_BUYER: false,
  UI_POWER_TOOLS: false,
  UI_ARCHIVE_LOGIN: false
};

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return fallback;
  const raw = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(raw)) return false;
  return fallback;
}

function getUiFlag(flagName, fallback = false) {
  const defaultValue = Object.prototype.hasOwnProperty.call(UI_FLAG_DEFAULTS, flagName)
    ? UI_FLAG_DEFAULTS[flagName]
    : fallback;

  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.has(flagName)) return parseBoolean(qs.get(flagName), defaultValue);
  } catch (e) { }

  const stored = getStoreValue(flagName);
  if (stored !== null && stored !== undefined) {
    return parseBoolean(stored, defaultValue);
  }

  if (typeof window !== 'undefined' && typeof window[flagName] !== 'undefined') {
    return parseBoolean(window[flagName], defaultValue);
  }

  return defaultValue;
}

function setUiFlag(flagName, enabled) {
  const normalized = !!enabled;
  setStoreValue(flagName, normalized ? 'true' : 'false');
  dispatchFarmaEvent('farmaFeatureFlagsChanged', { flagName, enabled: normalized });
  return normalized;
}

const FARMA_API_BASE_URL = (getStoreValue('farmaApiBaseUrl') || 'http://localhost:8765').replace(/\/+$/, '');
const FARMA_SSE_URL = getStoreValue('farmaSseUrl') || `${FARMA_API_BASE_URL}/events`;
const FARMA_SSE_PUBLISH_URL = getStoreValue('farmaSsePublishUrl') || `${FARMA_API_BASE_URL}/publish`;
const FARMA_BACKEND_HTTP_URL = (getStoreValue('farmaBackendHttpUrl') || 'http://localhost:8000/api').replace(/\/+$/, '');
const FARMA_SYNC_KEYS = [
  STORAGE_KEYS.listings,
  STORAGE_KEYS.offers,
  STORAGE_KEYS.transactions,
  STORAGE_KEYS.notifications,
  STORAGE_KEYS.dailyMarketRates,
  STORAGE_KEYS.communityMarketRates
];

async function emitUiMetric(event = {}) {
  const payload = {
    event_id: event.event_id || `ui-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    role: event.role || event.userRole || 'unknown',
    task_id: event.task_id || event.taskId || 'unspecified',
    event_type: event.event_type || event.eventType || 'task_start',
    duration_ms: typeof event.duration_ms === 'number' ? event.duration_ms : (typeof event.durationMs === 'number' ? event.durationMs : undefined),
    screen_id: event.screen_id || event.screenId || (typeof document !== 'undefined' && document.body ? (document.body.className || 'dashboard') : 'dashboard'),
    metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : {}
  };
  const endpoint = `${FARMA_BACKEND_HTTP_URL}/ui-metrics`;

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch (err) {
    // Metrics are best-effort and should never break dashboard interactions.
  }
}

function getFarmaRtChannel() {
  if (farmaRtChannel) return farmaRtChannel;
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    farmaRtChannel = new BroadcastChannel(FARMA_RT_CHANNEL);
    return farmaRtChannel;
  } catch (err) {
    return null;
  }
}

function dispatchFarmaEvent(eventName, detail) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  if (typeof CustomEvent === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch (err) { }
}

function farmaPublish(eventName, detail) {
  dispatchFarmaEvent(eventName, detail);
  let sent = false;
  const bc = getFarmaRtChannel();
  if (bc) {
    try {
      bc.postMessage({ eventName, detail, sourceId: FARMA_CLIENT_ID, ts: Date.now() });
      sent = true;
    } catch (err) {
      sent = false;
    }
  }
  publishToServer(eventName, detail);
  return sent;
}

function initFarmaRtListener() {
  if (farmaRtListenerAttached) return;
  const bc = getFarmaRtChannel();
  if (!bc) return;
  farmaRtListenerAttached = true;
  bc.addEventListener('message', (e) => {
    const msg = e && e.data ? e.data : null;
    if (!msg || !msg.eventName) return;
    if (msg.sourceId && msg.sourceId === FARMA_CLIENT_ID) return;
    dispatchFarmaEvent(msg.eventName, msg.detail);
  });
}

initFarmaRtListener();

function applyRemoteSync(key, data) {
  if (!FARMA_SYNC_KEYS.includes(key)) return false;
  writeJson(key, data);
  if (key === STORAGE_KEYS.listings && Array.isArray(data)) {
    try { syncListingImagesWithListings(data); } catch (e) { }  
  }
  dispatchFarmaEvent('farmaSyncApplied', { key });
  return true;
}

function handleRemoteMessage(msg) {
  if (!msg || !msg.eventName) return;
  if (msg.sourceId && msg.sourceId === FARMA_CLIENT_ID) return;
  if (msg.eventName === 'farmaDataSync' && msg.detail && msg.detail.key) {
    applyRemoteSync(msg.detail.key, msg.detail.data);
    return;
  }
  dispatchFarmaEvent(msg.eventName, msg.detail);
}

let farmaSseRetryCount = 0;
let farmaSseRetryTimer = null;
const FARMA_SSE_MAX_RETRIES = 10;
const FARMA_SSE_INITIAL_RETRY_DELAY = 1000; // ms - increased from 500ms
const FARMA_SSE_MAX_RETRY_DELAY = 30000; // ms (30 seconds)

function calculateBackoffDelay(retryCount) {
  // Exponential backoff: 1000ms * 2^retryCount, max 30 seconds
  const delay = FARMA_SSE_INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
  return Math.min(delay, FARMA_SSE_MAX_RETRY_DELAY);
}

function initFarmaSse() {
  if (farmaSse || typeof EventSource === 'undefined') return;
  try {
    console.log('[DataManager] Initializing EventSource connection to', FARMA_SSE_URL);
    farmaSse = new EventSource(FARMA_SSE_URL, { withCredentials: false });

    farmaSse.onopen = () => {
      console.log('[DataManager] SSE connection established');
      farmaSseConnected = true;
      farmaSseRetryCount = 0;
      dispatchFarmaEvent('farmaSseConnected', { timestamp: Date.now() });
    };

    farmaSse.onerror = (e) => {
      console.warn('[DataManager] SSE connection error');
      farmaSseConnected = false;

      // Only log if not already disconnected
      if (farmaSse && farmaSse.readyState !== EventSource.CLOSED) {
        dispatchFarmaEvent('farmaSseError', {
          timestamp: Date.now(),
          retryCount: farmaSseRetryCount,
          willRetry: farmaSseRetryCount < FARMA_SSE_MAX_RETRIES
        });
      }

      // Close the current connection
      if (farmaSse) {
        farmaSse.close();
        farmaSse = null;
      }

      // Attempt retry with exponential backoff
      if (farmaSseRetryCount < FARMA_SSE_MAX_RETRIES) {
        const delayMs = calculateBackoffDelay(farmaSseRetryCount);
        farmaSseRetryCount++;

        if (farmaSseRetryTimer) clearTimeout(farmaSseRetryTimer);
        farmaSseRetryTimer = setTimeout(() => {
          if (!farmaSse) { // Only retry if not already connecting
            initFarmaSse();
          }
        }, delayMs);
      } else {
        console.warn('[DataManager] SSE connection exhausted retries. Using polling fallback.');
        dispatchFarmaEvent('farmaSseGivenUp', { timestamp: Date.now() });
      }
    };

    farmaSse.onmessage = (e) => {
      if (!e || !e.data) return;
      try {
        const msg = JSON.parse(e.data);
        handleRemoteMessage(msg);
      } catch (err) {
        console.warn('[DataManager] Error parsing SSE message:', err);
      }
    };
  } catch (err) {
    console.error('[DataManager] Error initializing SSE:', err);
    farmaSseConnected = false;
  }
}

function publishToServer(eventName, detail) {
  if (!FARMA_SSE_PUBLISH_URL) return false;
  const payload = { eventName, detail, sourceId: FARMA_CLIENT_ID, ts: Date.now() };

  // Try sendBeacon first (reliable for unload)
  try {
    if (navigator && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const sent = navigator.sendBeacon(FARMA_SSE_PUBLISH_URL, blob);
      if (sent) {
        console.log('[DataManager] Published event via sendBeacon:', eventName);
        return true;
      }
    }
  } catch (err) {
    console.warn('[DataManager] sendBeacon failed, falling back to fetch:', err);
  }

  // Fallback to fetch with retry logic
  const publishWithRetry = (attemptNum = 1) => {
    return fetch(FARMA_SSE_PUBLISH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
      .then(response => {
        if (response.ok) {
          console.log('[DataManager] Published event via fetch:', eventName);
          return true;
        } else {
          console.warn('[DataManager] Publish failed with status:', response.status);
          return false;
        }
      })
      .catch(err => {
        console.warn(`[DataManager] Publish attempt ${attemptNum} failed:`, err.message);
        // Retry once more if it's a network error
        if (attemptNum < 2 && err.name !== 'AbortError') {
          return new Promise(resolve => {
            setTimeout(() => {
              publishWithRetry(attemptNum + 1).then(resolve);
            }, 500);
          });
        }
        return false;
      });
  };

  publishWithRetry().catch(() => { });
  return true;
}

function publishDataSync(key, data) {
  if (!key) return;
  farmaPublish('farmaDataSync', { key, data });
}

// Public API for connection management
function farmaSseReconnect() {
  console.log('[DataManager] Manual reconnection requested');
  farmaSseRetryCount = 0;
  if (farmaSseRetryTimer) {
    clearTimeout(farmaSseRetryTimer);
    farmaSseRetryTimer = null;
  }
  if (farmaSse) {
    farmaSse.close();
    farmaSse = null;
  }
  initFarmaSse();
}

function getFarmaSseStatus() {
  return {
    connected: farmaSseConnected,
    retryCount: farmaSseRetryCount,
    maxRetries: FARMA_SSE_MAX_RETRIES,
    url: FARMA_SSE_URL,
    clientId: FARMA_CLIENT_ID
  };
}

function getFarmaApiBaseUrl() {
  return FARMA_API_BASE_URL;
}

function normalizeCommodityToken(token) {
  return String(token || '').trim().toUpperCase().replace(/\s+/g, '_');
}

async function fetchExternalPrices(commodities = [], opts = {}) {
  const list = (Array.isArray(commodities) ? commodities : String(commodities || '').split(','))
    .map(normalizeCommodityToken)
    .filter(Boolean);
  const params = new URLSearchParams();
  params.set('commodities', (list.length ? list : ['WHEAT', 'RICE', 'ONION']).join(','));
  if (opts.city) params.set('city', String(opts.city));
  const url = `${FARMA_API_BASE_URL}/api/v1/external-prices?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`External feed failed (${response.status})`);
  }
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.prices)) {
    throw new Error('Invalid external feed payload');
  }
  return payload;
}

async function fetchExplainablePriceRecommendation({ city = '', crop = '', externalCommodity = '' } = {}) {
  if (!crop) throw new Error('Missing crop for recommendation');
  const params = new URLSearchParams();
  if (city) params.set('city', String(city));
  params.set('crop', String(crop));
  if (externalCommodity) params.set('externalCommodity', normalizeCommodityToken(externalCommodity));
  const url = `${FARMA_API_BASE_URL}/api/v1/price-recommendation?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Recommendation fetch failed (${response.status})`);
  }
  return response.json();
}

async function fetchReplayEvents(limit = 80) {
  const safeLimit = Math.max(1, Math.min(300, Number(limit) || 80));
  const candidates = [
    `/events.json?limit=${safeLimit}`,
    `${FARMA_API_BASE_URL}/events.json?limit=${safeLimit}`
  ];
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { cache: 'no-store' });
      if (!res.ok) continue;
      const payload = await res.json();
      if (Array.isArray(payload)) return payload;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return [];
}

// Log SSE connection status every 30 seconds for diagnostics
setInterval(() => {
  const status = getFarmaSseStatus();
  if (!status.connected) {
    console.log('[DataManager] SSE Status - Disconnected (retries: ' + status.retryCount + '/' + status.maxRetries + ')');
  }
}, 30000);

initFarmaSse();

function readJson(key, fallback) {
  try {
    const raw = getStoreValue(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error('readJson error', key, err);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    setStoreValue(key, JSON.stringify(value));
  } catch (err) {
    console.error('writeJson error', key, err);
  }
}

function clearUploadedProductImage() {
  removeStoreValue(STORAGE_KEYS.uploadedProductImage);
  removeStoreValue(STORAGE_KEYS.uploadedProductImageMeta);
}

function purgeExpiredUploadedProductImage() {
  const raw = getStoreValue(STORAGE_KEYS.uploadedProductImage);
  if (!raw) return false;
  const meta = readJson(STORAGE_KEYS.uploadedProductImageMeta, null);
  const savedAt = meta && Number(meta.savedAt);
  if (Number.isFinite(savedAt) && Date.now() - savedAt > UPLOADED_PRODUCT_IMAGE_TTL_MS) {
    clearUploadedProductImage();
    return true;
  }
  if (!meta) {
    writeJson(STORAGE_KEYS.uploadedProductImageMeta, { savedAt: Date.now() });
  }
  return false;
}

function saveUploadedProductImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  try {
    setStoreValue(STORAGE_KEYS.uploadedProductImage, dataUrl);
    writeJson(STORAGE_KEYS.uploadedProductImageMeta, { savedAt: Date.now() });
    return true;
  } catch (err) {
    console.error('saveUploadedProductImage error', err);
    return false;
  }
}

function getUploadedProductImage() {
  purgeExpiredUploadedProductImage();
  const raw = getStoreValue(STORAGE_KEYS.uploadedProductImage);
  if (typeof raw !== 'string') return '';
  if (!raw.startsWith('data:image/')) return '';
  return raw;
}

function normalizeImageSource(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (/^(https?:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('images/')) return trimmed;
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed)) return `images/${trimmed}`;
  return trimmed;
}

function readListingImages() {
  return readJson(STORAGE_KEYS.listingImages, {});
}

function writeListingImages(images) {
  writeJson(STORAGE_KEYS.listingImages, images || {});
}

function saveListingImage(listingId, dataUrl) {
  const id = String(listingId || '').trim();
  const normalized = normalizeImageSource(dataUrl);
  if (!id || !normalized) return false;
  const images = readListingImages();
  images[id] = { url: normalized, savedAt: Date.now() };
  writeListingImages(images);
  return true;
}

function getStoredListingImage(listing) {
  if (!listing || typeof listing !== 'object') return '';
  const images = readListingImages();
  const keys = [listing.listingId, listing.id].map(val => String(val || '').trim()).filter(Boolean);
  for (const key of keys) {
    const entry = images[key];
    if (!entry) continue;
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry.url === 'string') return entry.url;
  }
  return '';
}

function syncListingImagesWithListings(listings) {
  const list = Array.isArray(listings) ? listings : [];
  const images = readListingImages();
  const ids = new Set();
  let imagesChanged = false;
  let listingsChanged = false;

  list.forEach(l => {
    if (!l || typeof l !== 'object') return;
    const id = String(l.listingId || l.id || '').trim();
    if (!id) return;
    ids.add(id);
    const direct = normalizeImageSource(l.imageUrl || l.productImage || l.image || '');
    const stored = images[id] && (typeof images[id] === 'string' ? images[id] : images[id].url);

    if (direct && direct !== stored) {
      images[id] = { url: direct, savedAt: images[id]?.savedAt || Date.now() };
      imagesChanged = true;
    } else if (!direct && stored) {
      l.imageUrl = stored;
      listingsChanged = true;
    }
  });

  Object.keys(images).forEach(id => {
    if (!ids.has(id)) {
      delete images[id];
      imagesChanged = true;
    }
  });

  if (imagesChanged) writeListingImages(images);
  if (listingsChanged) writeJson(STORAGE_KEYS.listings, list);
}

function getListingImage(listing, opts = {}) {
  const { allowPlaceholder = true } = opts || {};
  if (!listing || typeof listing !== 'object') return allowPlaceholder ? DEFAULT_PRODUCT_IMAGE : '';
  const raw = listing.imageUrl || listing.productImage || listing.image || '';
  const normalized = normalizeImageSource(raw);
  if (normalized) return normalized;
  const stored = getStoredListingImage(listing);
  if (stored) return stored;
  return allowPlaceholder ? DEFAULT_PRODUCT_IMAGE : '';
}

function getDefaultProductImage() {
  return DEFAULT_PRODUCT_IMAGE;
}

function bindRoleSwitchClearImage() {
  const link = document.querySelector('.topbar-link');
  if (!link) return;
  link.addEventListener('click', () => {
    clearUploadedProductImage();
  });
}

function pad(num, size = 4) {
  return String(num).padStart(size, '0');
}

function getCommissionRules() {
  const fallback = { mode: 'flat', flatRate: COMMISSION_RATE, tiers: [] };
  const rules = readJson(COMMISSION_RULE_KEY, fallback);
  if (!rules || typeof rules !== 'object') return fallback;
  if (rules.mode !== 'flat' && rules.mode !== 'tiered') return fallback;
  return {
    mode: rules.mode,
    flatRate: Number(rules.flatRate ?? COMMISSION_RATE) || COMMISSION_RATE,
    tiers: Array.isArray(rules.tiers) ? rules.tiers.map(t => ({
      min: Number(t.min) || 0,
      max: typeof t.max === 'number' ? t.max : null,
      rate: Number(t.rate) || COMMISSION_RATE
    })) : []
  };
}

function saveCommissionRules(rules) {
  writeJson(COMMISSION_RULE_KEY, rules);
}

function computeCommission(totalAmount) {
  const rules = getCommissionRules();
  if (rules.mode === 'tiered' && Array.isArray(rules.tiers) && rules.tiers.length) {
    const matched = rules.tiers.find(t => totalAmount >= (t.min || 0) && (t.max === null || totalAmount <= t.max));
    if (matched) {
      return { rate: matched.rate, amount: totalAmount * matched.rate };
    }
  }
  const rate = Number(rules.flatRate || COMMISSION_RATE);
  return { rate, amount: totalAmount * rate };
}

function generateId(prefix, list, field) {
  const maxNum = (list || []).reduce((max, item) => {
    const val = item?.[field];
    if (!val || typeof val !== 'string') return max;
    const num = parseInt(val.replace(`${prefix}-`, ''), 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${prefix}-${pad(maxNum + 1)}`;
}

function ensureRole(role) {
  const config = {
    farmer: { listKey: STORAGE_KEYS.farmers, currentKey: STORAGE_KEYS.currentFarmerId, field: 'farmerId', prefix: 'FARM' },
    buyer: { listKey: STORAGE_KEYS.buyers, currentKey: STORAGE_KEYS.currentBuyerId, field: 'buyerId', prefix: 'BUY' },
    middleman: { listKey: STORAGE_KEYS.middlemen, currentKey: STORAGE_KEYS.currentMiddlemanId, field: 'middlemanId', prefix: 'MID' }
  }[role];

  if (!config) return null;

  const list = readJson(config.listKey, []);
  let current = getStoreValue(config.currentKey);

  // If no current role id is stored but role data exists, adopt the first existing role id
  if (!current && Array.isArray(list) && list.length) {
    const existing = list.find(entry => entry && entry[config.field]);
    if (existing) {
      current = existing[config.field];
      setStoreValue(config.currentKey, current);
    }
  }

  if (!current) {
    current = generateId(config.prefix, list, config.field);
    setStoreValue(config.currentKey, current);
  }

  const exists = list.some(entry => entry[config.field] === current);
  if (!exists) {
    const base = { [config.field]: current, name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`, createdAt: new Date().toISOString() };
    list.push(base);
    writeJson(config.listKey, list);
  }

  return current;
}

function setCurrentRoleId(role, id) {
  const config = {
    farmer: { listKey: STORAGE_KEYS.farmers, currentKey: STORAGE_KEYS.currentFarmerId, field: 'farmerId' },
    buyer: { listKey: STORAGE_KEYS.buyers, currentKey: STORAGE_KEYS.currentBuyerId, field: 'buyerId' },
    middleman: { listKey: STORAGE_KEYS.middlemen, currentKey: STORAGE_KEYS.currentMiddlemanId, field: 'middlemanId' }
  }[role];
  if (!config) return null;
  const normalized = String(id || '').trim();
  if (!normalized) return null;
  setStoreValue(config.currentKey, normalized);
  const list = readJson(config.listKey, []);
  const safeList = Array.isArray(list) ? list : [];
  const exists = safeList.some(entry => entry && entry[config.field] === normalized);
  if (!exists) {
    safeList.push({ [config.field]: normalized, name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`, createdAt: new Date().toISOString() });
    writeJson(config.listKey, safeList);
  }
  return normalized;
}

function ensureCities() {
  writeJson(STORAGE_KEYS.cities, MAHARASHTRA_CITIES);
  return MAHARASHTRA_CITIES;
}

function ensureCrops() {
  writeJson(STORAGE_KEYS.crops, MAHARASHTRA_CROPS);
  return MAHARASHTRA_CROPS;
}

function getCrops() {
  return readJson(STORAGE_KEYS.crops, MAHARASHTRA_CROPS);
}

function trackRecentCity(city) {
  if (!city) return;
  const recent = readJson(STORAGE_KEYS.recentCities, []);
  const filtered = recent.filter(c => c !== city);
  filtered.unshift(city);
  writeJson(STORAGE_KEYS.recentCities, filtered.slice(0, 5));
}

function trackRecentCrop(cropName) {
  if (!cropName) return;
  const recent = readJson(STORAGE_KEYS.recentCrops, []);
  const filtered = recent.filter(c => c !== cropName);
  filtered.unshift(cropName);
  writeJson(STORAGE_KEYS.recentCrops, filtered.slice(0, 8));
}

function getRecentCities() {
  return readJson(STORAGE_KEYS.recentCities, []);
}

function getRecentCrops() {
  return readJson(STORAGE_KEYS.recentCrops, []);
}

function wipeAppData() {
  const keysToWipe = [
    STORAGE_KEYS.listings,
    STORAGE_KEYS.offers,
    STORAGE_KEYS.notifications,
    STORAGE_KEYS.transactions,
    STORAGE_KEYS.auditLog,
    STORAGE_KEYS.buyerCity,
    STORAGE_KEYS.dailyMarketRates,
    STORAGE_KEYS.communityMarketRates,
    STORAGE_KEYS.listingImages,
    STORAGE_KEYS.buyerSavedCrops,
    COMMISSION_RULE_KEY
  ];
  keysToWipe.forEach(key => removeStoreValue(key));
  clearUploadedProductImage();
}

function forceFreshInit() {
  wipeAppData();
  let farmerId = ensureRole('farmer');
  let buyerId = ensureRole('buyer');
  let middlemanId = ensureRole('middleman');
  const cities = ensureCities();
  ensureCrops();
  writeJson(STORAGE_KEYS.listings, []);
  writeJson(STORAGE_KEYS.offers, []);
  writeJson(STORAGE_KEYS.notifications, []);
  writeJson(STORAGE_KEYS.transactions, []);
  writeJson(STORAGE_KEYS.auditLog, []);
  writeJson(STORAGE_KEYS.dailyMarketRates, {});
  writeJson(STORAGE_KEYS.communityMarketRates, []);
  if (!readJson(COMMISSION_RULE_KEY, null)) {
    saveCommissionRules({ mode: 'flat', flatRate: COMMISSION_RATE, tiers: [] });
  }
  removeStoreValue(STORAGE_KEYS.buyerCity);
  setStoreValue(STORAGE_KEYS.appDataVersion, APP_DATA_VERSION);
  return { farmerId, buyerId, middlemanId, cities };
}

function checkDataIntegrity() {
  const storedVersion = getStoreValue(STORAGE_KEYS.appDataVersion);
  if (storedVersion !== APP_DATA_VERSION) {
    forceFreshInit();
    return true;
  }
  return false;
}

function normalizeStatus(status) {
  if (!status) return 'Pending';
  const found = VALID_STATUSES.find(s => s.toLowerCase() === String(status).toLowerCase());
  return found || 'Pending';
}

function resolveListingFarmerId(listing, ids = {}) {
  if (!listing || typeof listing !== 'object') return ids.farmerId || null;
  return listing.farmerId || listing.farmerID || listing.ownerId || listing.ownerID || ids.farmerId || null;
}

function normalizeListing(listing, idx = 0, ids = {}) {
  if (!listing || typeof listing !== 'object') return null;
  const id = listing.id || listing.listingId || Date.now() + idx;
  const listingId = listing.listingId || `LST-${pad(idx + 1)}`;
  const city = listing.city || 'Pune';
  const name = listing.name || listing.commodity || 'Produce';
  const status = normalizeStatus(listing.status);
  const quantity = Number(listing.quantity || 0);
  const price = Number(listing.price || listing.approvedPrice || 0);
  const farmerId = resolveListingFarmerId(listing, ids) || 'FARM-0001';
  return {
    ...listing,
    id,
    listingId,
    farmerId,
    city,
    name,
    commodity: listing.commodity || name,
    category: listing.category || 'Other',
    quantity: Number.isFinite(quantity) ? quantity : 0,
    price: Number.isFinite(price) ? price : 0,
    approvedPrice: Number.isFinite(listing.approvedPrice) ? listing.approvedPrice : Number.isFinite(price) ? price : 0,
    quality: listing.quality || 'Good',
    verifiedQuality: listing.verifiedQuality || listing.quality || 'Good',
    description: listing.description || '',
    unit: listing.unit || 'kg',
    availabilityDate: listing.availabilityDate || new Date().toISOString(),
    status,
    createdAt: listing.createdAt || new Date().toISOString()
  };
}

function migrateListings(rawListings, ids) {
  return (rawListings || [])
    .map((l, idx) => normalizeListing(l, idx, ids))
    .filter(Boolean);
}

function normalizeTransaction(txn, idx = 0, refs = null) {
  if (!txn || typeof txn !== 'object') return null;
  const quantity = Number(txn.quantity ?? txn.finalQty ?? txn.qty ?? 0);
  const finalRate = Number(txn.finalRate ?? txn.finalPrice ?? txn.rate ?? 0);
  const finalPrice = Number(txn.finalPrice ?? txn.finalRate ?? finalRate);
  const totalAmount = Number(txn.totalAmount ?? (Number.isFinite(finalPrice) && Number.isFinite(quantity) ? finalPrice * quantity : 0));
  const base = {
    ...txn,
    transactionId: txn.transactionId || txn.id || `TXN-${Date.now()}-${idx}`,
    listingId: txn.listingId || txn.listingID || txn.listing || '',
    cropName: txn.cropName || txn.crop || txn.name || '',
    city: txn.city || '',
    quantity: Number.isFinite(quantity) ? quantity : 0,
    finalRate: Number.isFinite(finalRate) ? finalRate : 0,
    // Back-compat: many UI paths expect finalPrice.
    finalPrice: Number.isFinite(finalPrice) ? finalPrice : 0,
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : 0,
    status: txn.status || 'Finalized',
    timestamp: txn.timestamp || txn.createdAt || new Date().toISOString()
  };
  const listingId = String(base.listingId || '').trim();
  const offerId = String(base.offerId || txn.offerId || txn.offerID || '').trim();
  const listing = listingId && refs?.listingById ? refs.listingById.get(listingId) : null;
  const offer = offerId && refs?.offerById ? refs.offerById.get(offerId) : null;

  if (!base.offerId && offerId) base.offerId = offerId;
  if (!base.farmerId) base.farmerId = base.farmerID || base.farmer_id || offer?.farmerId || listing?.farmerId || null;
  if (!base.buyerId) base.buyerId = base.buyerID || base.buyer_id || offer?.buyerId || listing?.buyerId || null;
  if (!base.middlemanId) base.middlemanId = base.middlemanID || base.middleman_id || offer?.middlemanId || listing?.middlemanId || null;
  if (!base.city) base.city = listing?.city || offer?.city || '';
  if (!base.cropName) base.cropName = listing?.name || listing?.commodity || offer?.cropName || offer?.crop || offer?.name || '';

  return base;
}

function migrateTransactions(rawTransactions) {
  const listings = getListings();
  const offers = getOffers();
  const listingById = new Map((listings || []).map(l => [String(l.listingId || l.id || ''), l]));
  const offerById = new Map((offers || []).map(o => [String(o.offerId || ''), o]));

  return (rawTransactions || [])
    .map((t, idx) => normalizeTransaction(t, idx, { listingById, offerById }))
    .filter(Boolean);
}

function initAppData() {
  const hasVersionMismatch = checkDataIntegrity();
  purgeExpiredUploadedProductImage();

  const farmerId = ensureRole('farmer');
  const buyerId = ensureRole('buyer');
  const middlemanId = ensureRole('middleman');
  const cities = ensureCities();
  const crops = ensureCrops();

  const rawListings = readJson(STORAGE_KEYS.listings, []);
  const listings = migrateListings(rawListings, { farmerId, middlemanId });
  writeJson(STORAGE_KEYS.listings, listings);
  syncListingImagesWithListings(listings);

  const offers = readJson(STORAGE_KEYS.offers, []);
  if (!Array.isArray(offers)) writeJson(STORAGE_KEYS.offers, []);

  const notifications = readJson(STORAGE_KEYS.notifications, []);
  if (!Array.isArray(notifications)) writeJson(STORAGE_KEYS.notifications, []);

  const rawTransactions = readJson(STORAGE_KEYS.transactions, null);
  if (!Array.isArray(rawTransactions)) {
    writeJson(STORAGE_KEYS.transactions, []);
  } else {
    writeJson(STORAGE_KEYS.transactions, migrateTransactions(rawTransactions));
  }

  const auditLog = readJson(STORAGE_KEYS.auditLog, []);
  if (!Array.isArray(auditLog)) writeJson(STORAGE_KEYS.auditLog, []);

  // Ensure commission rules exist
  if (!readJson(COMMISSION_RULE_KEY, null)) {
    saveCommissionRules({ mode: 'flat', flatRate: COMMISSION_RATE, tiers: [] });
  }

  syncSoldListingsFromTransactions();

  return {
    listings,
    offers: readJson(STORAGE_KEYS.offers, []),
    notifications: readJson(STORAGE_KEYS.notifications, []),
    cities,
    crops,
    roles: { farmerId, buyerId, middlemanId },
    versionMismatch: hasVersionMismatch
  };
}

function getCities() {
  return ensureCities();
}

function getListings() {
  const raw = readJson(STORAGE_KEYS.listings, []);
  return (raw || []).map((l, idx) => {
    if (!l) return l;
    if (l.farmerId) return l;
    const farmerId = resolveListingFarmerId(l, {});
    if (!farmerId) return l;
    return { ...l, farmerId };
  });
}

function saveListings(listings) {
  writeJson(STORAGE_KEYS.listings, listings || []);
  publishDataSync(STORAGE_KEYS.listings, listings || []);
}

function getOffers() {
  return readJson(STORAGE_KEYS.offers, []);
}

function saveOffers(offers) {
  writeJson(STORAGE_KEYS.offers, offers || []);
  publishDataSync(STORAGE_KEYS.offers, offers || []);
}

function getTheme() {
  return getStoreValue(STORAGE_KEYS.theme) || 'light';
}

function saveTheme(theme) {
  setStoreValue(STORAGE_KEYS.theme, theme === 'dark' ? 'dark' : 'light');
  return getTheme();
}

function getLanguagePref() {
  return getStoreValue(STORAGE_KEYS.language) || 'en';
}

function saveLanguagePref(lang) {
  setStoreValue(STORAGE_KEYS.language, lang || 'en');
  return getLanguagePref();
}

function syncSoldListingsFromTransactions() {
  const transactions = getTransactions();
  if (!transactions.length) return;
  const listings = getListings();
  const offers = getOffers();
  let listingsChanged = false;
  let offersChanged = false;
  transactions.forEach(t => {
    if (t.status !== 'Finalized' && t.status !== 'Sold') return;
    const listing = listings.find(l => String(l.listingId) === String(t.listingId) || String(l.id) === String(t.listingId));
    if (listing && listing.status !== 'Sold') {
      listing.status = 'Sold';
      listing.soldAt = listing.soldAt || t.timestamp || new Date().toISOString();
      listing.buyerId = t.buyerId || listing.buyerId;
      listing.soldQty = Number(t.quantity ?? listing.soldQty ?? 0);
      listing.soldRate = Number(t.finalPrice ?? t.finalRate ?? listing.soldRate ?? 0);
      listing.soldTotal = Number(t.totalAmount ?? (listing.soldRate * listing.soldQty));
      listingsChanged = true;
    }
    const offer = offers.find(o => String(o.offerId) === String(t.offerId));
    if (offer && offer.status !== 'Finalized') {
      offer.status = 'Finalized';
      offer.finalRate = Number(t.finalPrice ?? t.finalRate ?? offer.finalRate ?? offer.acceptedPrice ?? offer.offeredPrice ?? 0);
      offer.finalQty = Number(t.quantity ?? offer.finalQty ?? offer.acceptedQty ?? offer.counteredQty ?? offer.quantity ?? 0);
      offer.finalizedAt = offer.finalizedAt || t.timestamp || new Date().toISOString();
      offer.transactionId = offer.transactionId || t.transactionId;
      offersChanged = true;
    }
  });
  if (listingsChanged) saveListings(listings);
  if (offersChanged) saveOffers(offers);
}

function getNotifications() {
  const notes = readJson(STORAGE_KEYS.notifications, []);
  if (!Array.isArray(notes)) return [];
  const listings = getListings();
  const offers = getOffers();
  const listingById = new Map((listings || []).map(l => [String(l.listingId || l.id || ''), l]));
  const offerById = new Map((offers || []).map(o => [String(o.offerId || ''), o]));

  return (notes || []).map(n => {
    const next = { ...(n || {}) };
    const listingKey = next.listingId || next.listing || next.id;
    const offerKey = next.offerId || next.offer;
    const listing = listingKey ? listingById.get(String(listingKey)) : null;
    const offer = offerKey ? offerById.get(String(offerKey)) : null;

    if (!next.farmerId) {
      next.farmerId = next.farmerID || (typeof next.user_id === 'string' && next.user_id.startsWith('FARM') ? next.user_id : null) || offer?.farmerId || listing?.farmerId || null;
    }
    if (!next.buyerId) {
      next.buyerId = next.buyerID || next.buyer_id || (typeof next.user_id === 'string' && next.user_id.startsWith('BUY') ? next.user_id : null) || offer?.buyerId || listing?.buyerId || null;
    }
    if (!next.audience) {
      if (next.farmerId) next.audience = 'farmer';
      else if (next.buyerId) next.audience = 'buyer';
      else if (next.middlemanId) next.audience = 'middleman';
    }

    if (!next.timestamp) next.timestamp = next.createdAt || new Date().toISOString();
    next.read = next.read === true || String(next.status || '').toLowerCase() === 'read';
    next.priority = next.priority || (next.type === 'offer' || next.type === 'counter_offer' || next.type === 'offer_accepted' ? 'ActionRequired' : next.type === 'deal_finalized' || next.type === 'purchase_completed' ? 'Finalized' : 'Info');
    // Back-compat + simpler UI: expose a string status alongside boolean read flag.
    next.status = next.read ? 'read' : 'unread';
    return next;
  });
}

function saveNotifications(notifications) {
  writeJson(STORAGE_KEYS.notifications, notifications || []);
  try { farmaPublish('farmaNotificationUpdate', { count: (notifications || []).length }); } catch (e) { }
  publishDataSync(STORAGE_KEYS.notifications, notifications || []);
}

function markNotificationRead(notificationId) {
  const notifications = getNotifications();
  let updated = false;
  notifications.forEach(n => {
    if (n.id === notificationId) {
      n.read = true;
      updated = true;
    }
  });
  if (updated) saveNotifications(notifications);
  return updated;
}

function markAllNotificationsRead(filterFn = null) {
  const notifications = getNotifications();
  let changed = false;
  notifications.forEach(n => {
    if (!filterFn || filterFn(n)) {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    }
  });
  if (changed) saveNotifications(notifications);
  return changed;
}

function appendNotification(notification) {
  const notifications = getNotifications();
  notifications.push(notification);
  saveNotifications(notifications);
}

function appendAudit(event) {
  const log = readJson(STORAGE_KEYS.auditLog, []);
  log.push({
    timestamp: new Date().toISOString(),
    event
  });
  writeJson(STORAGE_KEYS.auditLog, log);
}

function updateListingStatus(listingId, status, meta = {}) {
  const listings = getListings();
  const listing = listings.find(l => String(l.listingId) === String(listingId) || String(l.id) === String(listingId));
  if (!listing) return null;
  const previousStatus = listing.status;
  const nextStatus = normalizeStatus(status);
  const nowIso = new Date().toISOString();
  listing.status = nextStatus;

  // Store review metadata when middleman reviews listings.
  if (nextStatus === 'Approved') {
    listing.reviewedAt = listing.reviewedAt || nowIso;
    listing.reviewedBy = meta && meta.middlemanId ? meta.middlemanId : (listing.reviewedBy || null);
    listing.approvedAt = listing.approvedAt || nowIso;
    listing.rejectionReason = '';
  }
  if (nextStatus === 'Rejected') {
    listing.reviewedAt = listing.reviewedAt || nowIso;
    listing.reviewedBy = meta && meta.middlemanId ? meta.middlemanId : (listing.reviewedBy || null);
    listing.rejectedAt = listing.rejectedAt || nowIso;
    const reason = meta && typeof meta.reason === 'string' ? meta.reason.trim() : '';
    if (reason) listing.rejectionReason = reason;
  }

  saveListings(listings);
  appendAudit({ action: 'status_update', listingId, status: nextStatus, previousStatus, timestamp: nowIso, meta: meta || {} });

  // Notify farmer when listing is approved/rejected.
  // (Pending notifications are created on submission by the farmer.)
  if (previousStatus !== nextStatus && (nextStatus === 'Approved' || nextStatus === 'Rejected')) {
    const farmerId = resolveListingFarmerId(listing, {});
    if (farmerId) {
      const notifications = getNotifications();
      const isApproved = nextStatus === 'Approved';
      const reason = !isApproved ? (listing.rejectionReason || (meta && meta.reason) || '') : '';
      const cropName = listing.name || listing.commodity || '';
      const city = listing.city || '';
      const messageKey = isApproved ? 'Your listing was approved' : 'Your listing was rejected';
      const messageVars = { crop: cropName, city, listingId: listing.listingId, reason };
      const message = isApproved
        ? `Your listing was approved: ${cropName} (${listing.listingId}).`
        : `Your listing was rejected: ${cropName} (${listing.listingId})${reason ? `. Reason: ${reason}` : '.'}`;

      const note = {
        id: `NTF-${Date.now()}-${isApproved ? 'A' : 'R'}`,
        audience: 'farmer',
        type: isApproved ? 'approval' : 'rejection',
        user_id: farmerId,
        farmerId,
        listingId: listing.listingId,
        cropName,
        city,
        messageKey,
        messageVars,
        message,
        reason: reason || '',
        reviewedBy: listing.reviewedBy || null,
        status: 'unread',
        timestamp: nowIso,
        priority: 'Info',
        read: false
      };
      notifications.push(note);
      saveNotifications(notifications);
      farmaPublish('farmaNewNotification', { id: note.id, farmerId, listingId: listing.listingId, type: note.type });
    }
  }

  farmaPublish('farmaListingStatusUpdated', { listingId: listing.listingId, status: nextStatus, previousStatus, farmerId: listing.farmerId || null });
  return listing;
}

function recordOfferAndNotify({ listingId, buyerId, offeredPrice, quantity }) {
  const listings = getListings();
  const listing = listings.find(l => String(l.listingId) === String(listingId) || String(l.id) === String(listingId));

  // GUARD: Listing must exist and have valid farmerId
  if (!listing) {
    return { offer: null, listing: null, error: 'Listing not found' };
  }
  const listingFarmerId = resolveListingFarmerId(listing, {});
  if (!listingFarmerId) {
    return { offer: null, listing, error: 'Listing has no farmer assigned' };
  }
  if (!listing.farmerId && listingFarmerId) {
    listing.farmerId = listingFarmerId;
    saveListings(listings);
  }

  const offers = getOffers();
  const notifications = getNotifications();

  // GUARD: Check if buyer already has an active offer on this listing
  const existingOffer = offers.find(o =>
    o.listingId === listingId &&
    o.buyerId === buyerId &&
    (o.status === 'OfferPlaced' || o.status === 'Countered' || o.status === 'Accepted')
  );
  if (existingOffer) {
    return { offer: null, listing, error: 'You already have an active offer on this listing' };
  }

  const offer = {
    offerId: `OFF-${Date.now()}`,
    listingId,
    buyerId,
    farmerId: listingFarmerId,
    offeredPrice: Number(offeredPrice) || 0,
    quantity: Number(quantity) || 0,
    status: 'OfferPlaced',
    createdAt: new Date().toISOString()
  };
  offer.timestamp = offer.createdAt;
  offers.push(offer);
  saveOffers(offers);

  // Create notification with guarantee that farmerId exists
  const notification = {
    id: `NTF-${Date.now()}`,
    audience: 'farmer',
    farmerId: listingFarmerId,
    buyerId,
    offeredPrice: Number(offeredPrice) || 0,
    quantity: Number(quantity) || 0,
    listingId: listing.listingId,
    offerId: offer.offerId,
    timestamp: offer.createdAt,
    type: 'offer',
    priority: 'ActionRequired',
    read: false
  };
  notifications.push(notification);
  saveNotifications(notifications);
  appendAudit({ action: 'offer_created', offerId: offer.offerId, buyerId, farmerId: listingFarmerId });

  // Dispatch events for real-time updates (same-tab + cross-tab)
  farmaPublish('farmaOfferCreated', { offerId: offer.offerId, listingId: offer.listingId, farmerId: listingFarmerId, buyerId, notificationId: notification.id });

  return { offer, listing };
}

async function getInitializedData() {
  const init = initAppData();
  return {
    data: { farmerListings: init.listings, cities: init.cities, transactions: readJson(STORAGE_KEYS.transactions, []) },
    farmerId: init.roles.farmerId,
    buyerId: init.roles.buyerId,
    middlemanId: init.roles.middlemanId
  };
}

function notifyNewListing(listing) {
  const notifications = getNotifications();
  notifications.push({
    id: `NTF-${Date.now()}`,
    audience: 'middleman',
    type: 'new_listing',
    listingId: listing.listingId,
    farmerId: listing.farmerId,
    timestamp: new Date().toISOString(),
    priority: 'Info',
    read: false
  });
  saveNotifications(notifications);
  appendAudit({ action: 'listing_created', listingId: listing.listingId, farmerId: listing.farmerId });
}

function notifyFarmerListingSubmitted(listing) {
  if (!listing || typeof listing !== 'object') return null;
  const farmerId = resolveListingFarmerId(listing, {});
  if (!farmerId) return null;
  const nowIso = new Date().toISOString();
  const cropName = listing.name || listing.commodity || '';
  const city = listing.city || '';
  const listingKey = listing.listingId || listing.id || '';
  const messageKey = 'Your listing is pending review';
  const messageVars = { crop: cropName, city, listingId: listingKey };
  const note = {
    id: `NTF-${Date.now()}-P`,
    audience: 'farmer',
    type: 'pending',
    user_id: farmerId,
    farmerId,
    listingId: listingKey,
    cropName,
    city,
    messageKey,
    messageVars,
    message: `Your listing is pending review: ${cropName} (${listingKey}).`,
    status: 'unread',
    timestamp: nowIso,
    priority: 'Info',
    read: false
  };
  const notifications = getNotifications();
  notifications.push(note);
  saveNotifications(notifications);
  farmaPublish('farmaNewNotification', { id: note.id, farmerId, listingId: listingKey, type: note.type });
  return note;
}

function triggerMiddlemanNotification(listing) {
  const listingId = listing && typeof listing === 'object' ? (listing.listingId || listing.id) : listing;
  if (!listingId) return;
  // Keep broadcast payload small (listing may include large image data URLs).
  farmaPublish('farmaNewListing', { listingId });
}

function findMarketRateForListing() { return null; }
function computeMarketAnalysis() { return null; }
function buildTransactionRecord() { return null; }

function getTransactions() {
  return readJson(STORAGE_KEYS.transactions, []);
}

function saveTransactions(transactions) {
  writeJson(STORAGE_KEYS.transactions, transactions || []);
  publishDataSync(STORAGE_KEYS.transactions, transactions || []);
}

function updateOfferStatus(offerId, status) {
  const offers = getOffers();
  const offer = offers.find(o => o.offerId === offerId);
  if (!offer) return null;
  const validStatus = VALID_OFFER_STATUSES.find(s => s === status);
  if (!validStatus) return null;
  offer.status = status;
  saveOffers(offers);
  appendAudit({ action: 'offer_status_update', offerId, status, timestamp: new Date().toISOString() });
  return offer;
}

function counterOfferPrice(offerId, newPrice, newQty = null) {
  const offers = getOffers();
  const offer = offers.find(o => o.offerId === offerId);
  if (!offer) return null;

  // VALIDATE: Can only counter from OfferPlaced state
  if (offer.status !== 'OfferPlaced') {
    console.error('Cannot counter offer in state:', offer.status);
    return null;
  }

  const newPriceNum = Number(newPrice) || 0;
  if (newPriceNum <= 0) {
    console.error('Counter price must be positive');
    return null;
  }

  let newQtyNum = null;
  if (newQty !== null && newQty !== undefined && newQty !== '') {
    newQtyNum = Number(newQty);
    if (!Number.isFinite(newQtyNum) || newQtyNum <= 0) {
      console.error('Counter quantity must be positive');
      return null;
    }
  }

  // UPDATE OFFER STATE
  offer.status = 'Countered';
  offer.counteredPrice = newPriceNum;
  if (newQtyNum !== null) {
    offer.counteredQty = newQtyNum;
  }
  offer.counteredAt = new Date().toISOString();
  saveOffers(offers);
  appendAudit({ action: 'offer_countered', offerId, counteredPrice: offer.counteredPrice, farmerId: offer.farmerId });

  // NOTIFY BUYER about counter offer
  const notifications = getNotifications();
  notifications.push({
    id: `NTF-${Date.now()}`,
    type: 'counter_offer',
    buyerId: offer.buyerId,
    offerId,
    counteredPrice: offer.counteredPrice,
    counteredQty: offer.counteredQty || offer.quantity,
    listingId: offer.listingId,
    timestamp: new Date().toISOString(),
    priority: 'ActionRequired',
    read: false
  });
  saveNotifications(notifications);
  try {
    farmaPublish('farmaOfferStatusChanged', {
      offerId,
      listingId: offer.listingId,
      status: 'Countered',
      buyerId: offer.buyerId,
      farmerId: offer.farmerId,
      counteredPrice: offer.counteredPrice,
      counteredQty: offer.counteredQty || offer.quantity
    });
  } catch (e) { }

  return offer;
}

function acceptOffer(offerId, actorRole = null) {
  const offers = getOffers();
  const offer = offers.find(o => o.offerId === offerId);
  if (!offer) {
    console.error('Offer not found:', offerId);
    return null;
  }

  // VALIDATE: Can accept from OfferPlaced OR Countered state
  if (offer.status !== 'OfferPlaced' && offer.status !== 'Countered') {
    console.error('Cannot accept offer in state:', offer.status);
    return null;
  }

  // DETERMINE price based on context
  const acceptedPrice = offer.counteredPrice || offer.offeredPrice;
  const acceptedQty = offer.counteredQty || offer.quantity;

  // UPDATE OFFER STATE
  offer.status = 'Accepted';
  offer.acceptedAt = new Date().toISOString();
  offer.acceptedPrice = acceptedPrice;
  offer.acceptedQty = acceptedQty;
  saveOffers(offers);

  // UPDATE LISTING STATUS to PurchaseRequested (if not already)
  const listings = getListings();
  const listing = listings.find(l => l.listingId === offer.listingId);
  if (listing && listing.status !== 'Sold') {
    listing.status = 'PurchaseRequested';
    listing.approvedPrice = acceptedPrice;
    saveListings(listings);
  }

  appendAudit({
    action: 'offer_accepted',
    offerId,
    acceptedPrice,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    listingId: offer.listingId
  });

  // NOTIFY MIDDLEMAN for finalization
  const notifications = getNotifications();
  notifications.push({
    id: `NTF-${Date.now()}`,
    audience: 'middleman',
    type: 'offer_accepted',
    offerId,
    listingId: offer.listingId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    acceptedPrice: acceptedPrice,
    quantity: acceptedQty,
    timestamp: new Date().toISOString(),
    priority: 'ActionRequired',
    read: false
  });
  if (actorRole === 'buyer') {
    notifications.push({
      id: `NTF-${Date.now()}-F`,
      audience: 'farmer',
      type: 'offer_accepted',
      offerId,
      listingId: offer.listingId,
      farmerId: offer.farmerId,
      buyerId: offer.buyerId,
      acceptedPrice: acceptedPrice,
      quantity: acceptedQty,
      timestamp: new Date().toISOString(),
      priority: 'ActionRequired',
      read: false
    });
  } else {
    notifications.push({
      id: `NTF-${Date.now()}-B`,
      audience: 'buyer',
      type: 'offer_accepted',
      offerId,
      listingId: offer.listingId,
      farmerId: offer.farmerId,
      buyerId: offer.buyerId,
      acceptedPrice: acceptedPrice,
      quantity: acceptedQty,
      timestamp: new Date().toISOString(),
      priority: 'ActionRequired',
      read: false
    });
  }
  saveNotifications(notifications);
  try {
    farmaPublish('farmaOfferStatusChanged', {
      offerId,
      listingId: offer.listingId,
      status: 'Accepted',
      buyerId: offer.buyerId,
      farmerId: offer.farmerId,
      acceptedPrice,
      acceptedQty
    });
  } catch (e) { }

  return offer;
}

function rejectOffer(offerId, actorRole = null) {
  const offers = getOffers();
  const offer = offers.find(o => o.offerId === offerId);
  if (!offer) {
    console.error('Offer not found:', offerId);
    return null;
  }

  // VALIDATE: Can reject from OfferPlaced OR Countered state
  if (offer.status !== 'OfferPlaced' && offer.status !== 'Countered') {
    console.error('Cannot reject offer in state:', offer.status);
    return null;
  }

  // UPDATE OFFER STATE
  offer.status = 'Rejected';
  offer.rejectedAt = new Date().toISOString();
  saveOffers(offers);

  appendAudit({
    action: 'offer_rejected',
    offerId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId
  });

  const notifications = getNotifications();
  const base = {
    id: `NTF-${Date.now()}`,
    type: 'offer_rejected',
    audience: actorRole === 'buyer' ? 'farmer' : 'buyer',
    offerId,
    listingId: offer.listingId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    timestamp: new Date().toISOString(),
    priority: 'Info',
    read: false
  };
  if (actorRole === 'buyer') {
    notifications.push({ ...base, id: `${base.id}-F` });
  } else {
    notifications.push({ ...base, id: `${base.id}-B` });
  }
  saveNotifications(notifications);
  try {
    farmaPublish('farmaOfferStatusChanged', {
      offerId,
      listingId: offer.listingId,
      status: 'Rejected',
      buyerId: offer.buyerId,
      farmerId: offer.farmerId
    });
  } catch (e) { }

  return offer;
}

function finalizeTransaction(offerId, middlemanId) {
  const offers = getOffers();
  const offer = offers.find(o => o.offerId === offerId);
  if (!offer) {
    console.error('Offer not found:', offerId);
    return null;
  }

  const listings = getListings();
  const listing = listings.find(l => String(l.listingId) === String(offer.listingId) || String(l.id) === String(offer.listingId));
  if (!listing) {
    console.error('Listing not found:', offer.listingId);
    return null;
  }

  const transactions = getTransactions();
  // Check if transaction already exists for this listing/offer (prevent duplicates, repair partials)
  const existingTxn = transactions.find(t => (String(t.listingId) === String(offer.listingId) || String(t.offerId) === String(offer.offerId)));
  if (existingTxn) {
    if (existingTxn.offerId && String(existingTxn.offerId) !== String(offer.offerId)) {
      return null;
    }
    const finalPrice = Number(existingTxn.finalPrice ?? existingTxn.finalRate ?? offer.acceptedPrice ?? offer.offeredPrice ?? 0);
    const finalQty = Number(existingTxn.quantity ?? offer.acceptedQty ?? offer.counteredQty ?? offer.quantity ?? 0);
    const totalAmount = Number(existingTxn.totalAmount ?? (finalPrice * finalQty));
    let txnChanged = false;
    if (existingTxn.status !== 'Finalized') {
      existingTxn.status = 'Finalized';
      txnChanged = true;
    }
    let offerChanged = false;
    if (offer.status !== 'Finalized') {
      offer.status = 'Finalized';
      offer.finalRate = finalPrice;
      offer.finalQty = finalQty;
      offer.finalizedAt = offer.finalizedAt || new Date().toISOString();
      offerChanged = true;
    }
    if (!offer.transactionId && existingTxn.transactionId) {
      offer.transactionId = existingTxn.transactionId;
      offerChanged = true;
    }
    if (offerChanged) saveOffers(offers);
    let listingChanged = false;
    if (listing.status !== 'Sold') {
      listing.status = 'Sold';
      listing.soldAt = listing.soldAt || new Date().toISOString();
      listing.buyerId = offer.buyerId || listing.buyerId;
      listing.soldQty = finalQty;
      listing.soldRate = finalPrice;
      listing.soldTotal = totalAmount;
      listingChanged = true;
      saveListings(listings);
    }
    if (txnChanged) saveTransactions(transactions);
    // Idempotency contract: repeat finalize should not produce a new success result.
    // Return a transaction only when we actually repaired an inconsistent partial state.
    if (!txnChanged && !offerChanged && !listingChanged) {
      return null;
    }
    return existingTxn;
  }

  // VALIDATE: Only finalize Accepted offers
  if (offer.status !== 'Accepted') {
    console.error('Cannot finalize offer in state:', offer.status, '(must be Accepted)');
    return null;
  }

  // Check if transaction already exists for this listing (prevent duplicates)
  if (transactions.some(t => (t.listingId === offer.listingId || t.offerId === offer.offerId) && t.status === 'Finalized')) {
    return null;
  }

  // CALCULATE TRANSACTION AMOUNTS
  const finalPrice = offer.acceptedPrice || offer.offeredPrice;
  const finalQty = Number(offer.acceptedQty ?? offer.counteredQty ?? offer.quantity);
  const totalAmount = finalPrice * finalQty;
  const commissionInfo = computeCommission(totalAmount);
  const commission = commissionInfo.amount;
  const farmerPayout = totalAmount - commission;

  // CREATE TRANSACTION RECORD
  const transaction = {
    transactionId: `TXN-${Date.now()}`,
    listingId: offer.listingId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    middlemanId,
    offerId,
    cropName: listing.name,
    city: listing.city,
    quantity: finalQty,
    finalRate: finalPrice,
    // Back-compat: many UI paths expect finalPrice.
    finalPrice: finalPrice,
    totalAmount,
    commissionRate: commissionInfo.rate,
    commissionAmount: commission,
    farmerPayout,
    status: 'Finalized',
    timestamp: new Date().toISOString()
  };

  // ATOMIC WRITES
  // 1. Save transaction
  transactions.push(transaction);
  saveTransactions(transactions);

  // 2. Update offer with finalization details
  offer.status = 'Finalized';
  offer.finalRate = finalPrice;
  offer.finalQty = finalQty;
  offer.finalizedAt = new Date().toISOString();
  offer.transactionId = transaction.transactionId;
  saveOffers(offers);

  // 3. Update listing DIRECTLY to SOLD (no intermediate states allowed)
  listing.status = 'Sold';
  listing.soldAt = new Date().toISOString();
  listing.buyerId = offer.buyerId;
  listing.soldQty = finalQty;
  listing.soldRate = finalPrice;
  listing.soldTotal = totalAmount;
  saveListings(listings);

  // Market rate cache invalidation (new transaction affects today's computed rates).
  invalidateDailyMarketRatesCache(listing.city, listing.name);

  // 4. Append audit log
  appendAudit({
    action: 'transaction_finalized',
    transactionId: transaction.transactionId,
    offerId,
    listingId: offer.listingId,
    middlemanId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    finalPrice,
    finalQty,
    totalAmount,
    commissionAmount: commission,
    farmerPayout
  });

  // 5. NOTIFY both farmer and buyer
  const notifications = getNotifications();
  notifications.push({
    id: `NTF-${Date.now()}-farmer`,
    audience: 'farmer',
    type: 'deal_finalized',
    transactionId: transaction.transactionId,
    offerId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    cropName: listing.name,
    city: listing.city,
    quantity: finalQty,
    finalPrice,
    totalAmount,
    farmerPayout,
    commissionAmount: commission,
    timestamp: new Date().toISOString(),
    priority: 'Finalized',
    read: false
  });
  notifications.push({
    id: `NTF-${Date.now()}-buyer`,
    audience: 'buyer',
    type: 'purchase_completed',
    transactionId: transaction.transactionId,
    offerId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    cropName: listing.name,
    city: listing.city,
    quantity: finalQty,
    finalPrice,
    totalAmount,
    timestamp: new Date().toISOString(),
    priority: 'Finalized',
    read: false
  });
  notifications.push({
    id: `NTF-${Date.now()}-middleman`,
    audience: 'middleman',
    type: 'deal_finalized',
    transactionId: transaction.transactionId,
    offerId,
    farmerId: offer.farmerId,
    buyerId: offer.buyerId,
    middlemanId,
    cropName: listing.name,
    city: listing.city,
    quantity: finalQty,
    finalPrice,
    totalAmount,
    commissionAmount: commission,
    timestamp: new Date().toISOString(),
    priority: 'Finalized',
    read: false
  });
  saveNotifications(notifications);
  try {
    farmaPublish('farmaTransactionFinalized', {
      transactionId: transaction.transactionId,
      farmerId: offer.farmerId,
      buyerId: offer.buyerId,
      city: listing.city,
      crop: listing.name,
      listingId: listing.listingId
    });
  } catch (e) { }

  return transaction;
}

function getOffersByFarmer(farmerId) {
  return getOffers().filter(o => o.farmerId === farmerId);
}

function getOffersByBuyer(buyerId) {
  return getOffers().filter(o => o.buyerId === buyerId);
}

function getTransactionsByMiddleman(middlemanId) {
  return getTransactions().filter(t => t.middlemanId === middlemanId);
}

function calculateMiddlemanEarnings(middlemanId) {
  const transactions = getTransactionsByMiddleman(middlemanId);
  const totalCommission = transactions.reduce((sum, t) => sum + (t.commissionAmount || 0), 0);
  return {
    totalTransactions: transactions.length,
    totalCommission,
    avgCommissionPerDeal: transactions.length ? (totalCommission / transactions.length) : 0,
    transactions
  };
}

// NOTE: `window.farmaSanityCheck` is defined later (single consolidated version).

// ==================== STATE GUARD FUNCTIONS ====================
function canAcceptOffer(offerId) {
  const offer = getOffers().find(o => o.offerId === offerId);
  if (!offer) return { can: false, reason: 'Offer not found' };
  if (offer.status !== 'OfferPlaced' && offer.status !== 'Countered') {
    return { can: false, reason: `Cannot accept offer in ${offer.status} state` };
  }
  return { can: true };
}

function canRejectOffer(offerId) {
  const offer = getOffers().find(o => o.offerId === offerId);
  if (!offer) return { can: false, reason: 'Offer not found' };
  if (offer.status !== 'OfferPlaced' && offer.status !== 'Countered') {
    return { can: false, reason: `Cannot reject offer in ${offer.status} state` };
  }
  return { can: true };
}

function canCounterOffer(offerId) {
  const offer = getOffers().find(o => o.offerId === offerId);
  if (!offer) return { can: false, reason: 'Offer not found' };
  if (offer.status !== 'OfferPlaced') {
    return { can: false, reason: `Cannot counter offer in ${offer.status} state` };
  }
  return { can: true };
}

function canFinalizeTransaction(offerId) {
  const offer = getOffers().find(o => o.offerId === offerId);
  if (!offer) return { can: false, reason: 'Offer not found' };
  if (offer.status === 'Finalized') {
    return { can: false, reason: 'Offer already finalized' };
  }
  if (offer.status !== 'Accepted') {
    return { can: false, reason: `Cannot finalize offer in ${offer.status} state` };
  }
  const listing = getListings().find(l => l.listingId === offer.listingId);
  if (listing && listing.status === 'Sold') {
    return { can: false, reason: 'Listing already sold' };
  }
  return { can: true };
}

function resetAppDataForUser() {
  wipeAppData();
  const farmerId = ensureRole('farmer');
  const buyerId = ensureRole('buyer');
  const middlemanId = ensureRole('middleman');
  const cities = ensureCities();
  ensureCrops();
  writeJson(STORAGE_KEYS.listings, []);
  writeJson(STORAGE_KEYS.offers, []);
  writeJson(STORAGE_KEYS.notifications, []);
  writeJson(STORAGE_KEYS.transactions, []);
  writeJson(STORAGE_KEYS.auditLog, []);
  writeJson(STORAGE_KEYS.dailyMarketRates, {});
  writeJson(STORAGE_KEYS.communityMarketRates, []);
  if (!readJson(COMMISSION_RULE_KEY, null)) {
    saveCommissionRules({ mode: 'flat', flatRate: COMMISSION_RATE, tiers: [] });
  }
  removeStoreValue(STORAGE_KEYS.buyerCity);
  setStoreValue(STORAGE_KEYS.appDataVersion, APP_DATA_VERSION);
  try {
    farmaPublish('farmaDataReset', { timestamp: Date.now() });
  } catch (e) {
    window.dispatchEvent(new Event('farmaDataReset'));
  }
  return { farmerId, buyerId, middlemanId, cities };
}

// ==================== MARKET INTELLIGENCE FUNCTIONS ====================

function getDailyMarketRates(city, crop) {
  const key = `${city}|${crop}`;
  const rates = readJson(STORAGE_KEYS.dailyMarketRates, {});
  const cached = rates[key];
  const today = new Date().toISOString().split('T')[0];
  // If we don't have a cached value for today, compute fresh (and cache it).
  if (!cached || cached.date !== today) {
    return computeDailyMarketRates(city, crop);
  }
  return cached;
}

function invalidateDailyMarketRatesCache(city, crop) {
  if (!city || !crop) return;
  const key = `${city}|${crop}`;
  const rates_store = readJson(STORAGE_KEYS.dailyMarketRates, {});
  let changed = false;
  if (rates_store && rates_store[key]) {
    delete rates_store[key];
    writeJson(STORAGE_KEYS.dailyMarketRates, rates_store);
    changed = true;
  }
  if (changed) {
    try { farmaPublish('farmaMarketRatesUpdated', { city, crop }); } catch (e) { }
  }
}

function computeDailyMarketRates(city, crop) {
  const today = new Date().toISOString().split('T')[0];

  // Aggregate data from Sold listings (finalized transactions)
  const transactions = getTransactions();
  const relevantTxns = transactions.filter(t =>
    t.city === city && t.cropName === crop && t.status === 'Finalized'
  );

  if (relevantTxns.length === 0) {
    return null; // Insufficient data
  }

  const rates = relevantTxns.map(t => Number(t.finalRate) || 0).filter(r => r > 0);
  if (rates.length === 0) {
    return null;
  }

  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const avg = rates.reduce((s, r) => s + r, 0) / rates.length;

  const rateData = {
    city,
    crop,
    min: Math.round(min * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    max: Math.round(max * 100) / 100,
    date: today,
    source: 'Completed Transactions',
    count: rates.length
  };

  // Cache in localStorage
  const rates_store = readJson(STORAGE_KEYS.dailyMarketRates, {});
  const key = `${city}|${crop}`;
  rates_store[key] = rateData;
  writeJson(STORAGE_KEYS.dailyMarketRates, rates_store);

  return rateData;
}

function getCommunityMarketRates(city, crop) {
  const today = new Date().toISOString().split('T')[0];
  const allRates = readJson(STORAGE_KEYS.communityMarketRates, []);

  const todayRates = allRates.filter(r => {
    const rDate = r.timestamp.split('T')[0];
    return r.city === city && r.crop === crop && rDate === today;
  });

  if (todayRates.length < 3) {
    return null;
  }

  const rates = todayRates.map(r => Number(r.rate) || 0).filter(r => r > 0);
  if (rates.length < 3) {
    return null;
  }

  const sorted = rates.slice().sort((a, b) => a - b);
  const avg = sorted.reduce((s, r) => s + r, 0) / sorted.length;
  const threshold = avg * 0.25;
  const filtered = sorted.filter(r => Math.abs(r - avg) <= threshold);

  // Safety: require a minimum number of post-filter reports.
  if (filtered.length < 3) {
    return null;
  }

  const finalAvg = filtered.reduce((s, r) => s + r, 0) / filtered.length;
  const min = Math.min(...filtered);
  const max = Math.max(...filtered);

  return {
    city,
    crop,
    min: Math.round(min * 100) / 100,
    avg: Math.round(finalAvg * 100) / 100,
    max: Math.round(max * 100) / 100,
    count: filtered.length,
    date: today,
    source: 'Community Avg (Indicative)'
  };
}

function recordCommunityMarketRate(buyerId, city, crop, rate) {
  if (!rate || rate <= 0) {
    return { error: 'Invalid rate' };
  }

  const entry = {
    id: `CMR-${Date.now()}`,
    buyerId,
    city,
    crop,
    rate: Number(rate),
    timestamp: new Date().toISOString()
  };

  const allRates = readJson(STORAGE_KEYS.communityMarketRates, []);
  allRates.push(entry);
  writeJson(STORAGE_KEYS.communityMarketRates, allRates);
  publishDataSync(STORAGE_KEYS.communityMarketRates, allRates);

  // Same-tab refresh hook (storage event won't fire in the same window).
  try {
    farmaPublish('farmaCommunityMarketRateUpdated', { city, crop, entry });
  } catch (e) { }

  return { success: true, entry };
}

function getAverageCommunityRate(city, crop) {
  const rates = getCommunityMarketRates(city, crop);
  if (!rates) {
    return null;
  }
  return rates.avg;
}

window.farmaSanityCheck = function () {
  const results = [];
  const push = (name, pass, extra = {}) => results.push({ name, pass: !!pass, ...extra });

  // -------------------- Data Basics --------------------
  try {
    const cities = ensureCities();
    push('Cities seeded', Array.isArray(cities) && cities.length > 0 && cities.includes('Dhule'));
  } catch (e) { push('Cities seeded', false, { err: e.message }); }

  try {
    const listings = getListings();
    push('Listings parse', Array.isArray(listings));
  } catch (e) { push('Listings parse', false, { err: e.message }); }

  try {
    const listings = getListings();
    const ok = Array.isArray(listings) ? listings.every(l => VALID_STATUSES.includes(l.status)) : false;
    push('Statuses valid', ok);
  } catch (e) { push('Statuses valid', false, { err: e.message }); }

  try {
    const city = (ensureCities()[0]) || '';
    const buyerView = getListings().filter(l => l.status === 'Approved' && l.city === city);
    push('Buyer sees only approved listings for city', Array.isArray(buyerView) && buyerView.every(l => l.status === 'Approved'));
  } catch (e) { push('Buyer sees only approved listings for city', false, { err: e.message }); }

  // -------------------- Offer → Notification --------------------
  try {
    const testFarmerId = ensureRole('farmer');
    const testBuyerId = ensureRole('buyer');
    const listingId = `LST-OFFER-TEST-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const listing = normalizeListing({ id: Date.now(), listingId, farmerId: testFarmerId, city: 'Pune', name: 'Onion', quantity: 5, price: 10, status: 'Approved', createdAt: nowIso }, 0, { farmerId: testFarmerId });
    const listings = getListings();
    listings.push(listing);
    saveListings(listings);

    const beforeOffers = getOffers().length;
    const beforeNotes = getNotifications().length;
    const tmp = recordOfferAndNotify({ listingId, buyerId: testBuyerId, offeredPrice: 11, quantity: 2 });
    const afterOffers = getOffers().length;
    const afterNotes = getNotifications().length;
    const offerId = tmp && tmp.offer ? tmp.offer.offerId : null;
    const pass = !!offerId && afterOffers === beforeOffers + 1 && afterNotes === beforeNotes + 1;
    push('Offer creates notification', pass);

    // cleanup
    try {
      if (offerId) {
        saveOffers(getOffers().filter(o => o.offerId !== offerId));
        saveNotifications(getNotifications().filter(n => n.offerId !== offerId));
      }
      saveListings(getListings().filter(l => String(l.listingId) !== String(listingId)));
    } catch (e) { }
  } catch (e) { push('Offer creates notification', false, { err: e.message }); }

  // -------------------- Listing Review → Farmer Notification --------------------
  try {
    const testFarmerId = ensureRole('farmer');
    const testMiddlemanId = ensureRole('middleman');
    const listingId = `LST-REVIEW-TEST-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const listing = normalizeListing({ id: Date.now() + 1, listingId, farmerId: testFarmerId, city: 'Pune', name: 'Tomato', quantity: 3, price: 20, status: 'Pending', createdAt: nowIso }, 0, { farmerId: testFarmerId });
    const listings = getListings();
    listings.push(listing);
    saveListings(listings);

    const beforeNotes = getNotifications().length;
    updateListingStatus(listingId, 'Approved', { middlemanId: testMiddlemanId });
    const notes = getNotifications();
    const approvedNote = notes.find(n => n.type === 'approval' && String(n.listingId) === String(listingId) && String(n.farmerId) === String(testFarmerId));
    const afterNotes = notes.length;
    push('Listing approval creates farmer notification', !!approvedNote && afterNotes === beforeNotes + 1);

    // cleanup
    try {
      saveListings(getListings().filter(l => String(l.listingId) !== String(listingId)));
      saveNotifications(getNotifications().filter(n => String(n.listingId) !== String(listingId)));
    } catch (e) { }
  } catch (e) { push('Listing approval creates farmer notification', false, { err: e.message }); }

  try {
    const testFarmerId = ensureRole('farmer');
    const testMiddlemanId = ensureRole('middleman');
    const listingId = `LST-REJECT-TEST-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const listing = normalizeListing({ id: Date.now() + 2, listingId, farmerId: testFarmerId, city: 'Pune', name: 'Cotton', quantity: 2, price: 50, status: 'Pending', createdAt: nowIso }, 0, { farmerId: testFarmerId });
    const listings = getListings();
    listings.push(listing);
    saveListings(listings);

    const beforeNotes = getNotifications().length;
    updateListingStatus(listingId, 'Rejected', { middlemanId: testMiddlemanId, reason: 'Quality mismatch' });
    const notes = getNotifications();
    const rejectedNote = notes.find(n => n.type === 'rejection' && String(n.listingId) === String(listingId) && String(n.farmerId) === String(testFarmerId));
    const afterNotes = notes.length;
    push('Listing rejection creates farmer notification', !!rejectedNote && afterNotes === beforeNotes + 1);

    // cleanup
    try {
      saveListings(getListings().filter(l => String(l.listingId) !== String(listingId)));
      saveNotifications(getNotifications().filter(n => String(n.listingId) !== String(listingId)));
    } catch (e) { }
  } catch (e) { push('Listing rejection creates farmer notification', false, { err: e.message }); }

  // -------------------- Listing Submission → Pending Notification --------------------
  try {
    const testFarmerId = ensureRole('farmer');
    const listingId = `LST-PENDING-TEST-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const listing = normalizeListing({ id: Date.now() + 3, listingId, farmerId: testFarmerId, city: 'Pune', name: 'Onion', quantity: 1, price: 10, status: 'Pending', createdAt: nowIso }, 0, { farmerId: testFarmerId });
    const listings = getListings();
    listings.push(listing);
    saveListings(listings);

    const beforeNotes = getNotifications().length;
    notifyFarmerListingSubmitted(listing);
    const notes = getNotifications();
    const pendingNote = notes.find(n => n.type === 'pending' && String(n.listingId) === String(listingId) && String(n.farmerId) === String(testFarmerId));
    const afterNotes = notes.length;
    push('Listing submission creates pending notification', !!pendingNote && afterNotes === beforeNotes + 1);

    // cleanup
    try {
      saveListings(getListings().filter(l => String(l.listingId) !== String(listingId)));
      saveNotifications(getNotifications().filter(n => String(n.listingId) !== String(listingId)));
    } catch (e) { }
  } catch (e) { push('Listing submission creates pending notification', false, { err: e.message }); }

  console.group('E-Kisan Market Sanity Check');
  let overall = true;
  results.forEach(r => {
    overall = overall && !!r.pass;
    console.log(`${r.pass ? 'PASS' : 'FAIL'} - ${r.name}` + (r.err ? ` (${r.err})` : '') + (r.note ? ` - ${r.note}` : ''));
  });
  console.log(overall ? 'OVERALL: PASS' : 'OVERALL: FAIL');
  console.groupEnd();
  return results;
};

// ==================== SOLD STATE HARD LOCK ====================
function enforceSoldState() {
  const listings = getListings();
  const updated = listings.map(l => {
    if (l.status === 'Sold') {
      return {
        ...l,
        status: 'Sold'
      };
    }
    return l;
  });
  saveListings(updated);
}

function isSoldListing(listing) {
  return listing && listing.status === 'Sold';
}

function computeMarketRatesV2(city, crop, days = 7) {
  const now = Date.now();
  const listings = getListings();
  const transactions = getSoldTransactions().filter(t => {
    const ts = new Date(t.timestamp || '').getTime();
    if (!Number.isFinite(ts)) return false;
    const diffDays = (now - ts) / (1000 * 60 * 60 * 24);
    if (diffDays > days) return false;
    const listing = listings.find(l => l.listingId === t.listingId);
    // If listing exists, require SOLD state.
    if (listing && !isSoldListing(listing)) return false;
    const tCity = t.city || listing?.city || '';
    const tCrop = t.cropName || t.crop || t.name || listing?.name || '';
    return tCity === city && tCrop === crop;
  });

  const txnListingIds = new Set(transactions.map(t => String(t.listingId || '')));
  const soldListingRates = listings.filter(l => {
    if (!l || !isSoldListing(l)) return false;
    if (city && l.city !== city) return false;
    const lCrop = l.name || l.commodity || '';
    if (crop && lCrop !== crop) return false;
    if (txnListingIds.has(String(l.listingId || l.id || ''))) return false;
    const ts = new Date(l.soldAt || l.updatedAt || l.createdAt || '').getTime();
    if (!Number.isFinite(ts)) return false;
    const diffDays = (now - ts) / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  }).map(l => {
    const soldRate = Number(l.soldRate || 0);
    if (Number.isFinite(soldRate) && soldRate > 0) return soldRate;
    const qty = Number(l.soldQty || 0);
    const total = Number(l.soldTotal || 0);
    if (qty > 0 && total > 0) return total / qty;
    return 0;
  }).filter(r => Number.isFinite(r) && r > 0);

  const rates = transactions
    .map(t => Number(t.finalRate || t.finalPrice || 0))
    .filter(r => Number.isFinite(r) && r > 0)
    .concat(soldListingRates);

  if (rates.length < 1) return null;

  const sorted = rates.slice().sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = rates.reduce((s, r) => s + r, 0) / rates.length;
  const fairMin = avg * 0.92;
  const fairMax = avg * 1.08;

  return {
    city, crop, min, avg: parseFloat(avg.toFixed(2)), max,
    fairMin: parseFloat(fairMin.toFixed(2)), fairMax: parseFloat(fairMax.toFixed(2)),
    date: new Date().toISOString().split('T')[0],
    source: `Sold Transactions (${days}d)`,
    count: rates.length,
    windowDays: days
  };
}

function computePreferredMarketRatesToday(city, crop) {
  const community = getCommunityMarketRates(city, crop);
  if (community) {
    const avg = Number(community.avg || 0);
    const fairMin = avg * 0.92;
    const fairMax = avg * 1.08;
    return {
      city,
      crop,
      min: community.min,
      avg: community.avg,
      max: community.max,
      fairMin: parseFloat(fairMin.toFixed(2)),
      fairMax: parseFloat(fairMax.toFixed(2)),
      date: community.date,
      source: community.source,
      count: community.count
    };
  }
  return computeMarketRatesV2(city, crop);
}

function calculateMarketMood(city, crop) {
  const today = new Date().toISOString().split('T')[0];
  const listings = getListings();
  const offers = getOffers().filter(o => {
    const listing = listings.find(l => l.listingId === o.listingId && l.city === city && l.name === crop);
    const day = (o.timestamp || o.createdAt || '').split('T')[0];
    return listing && day === today;
  }).length;
  const soldToday = getTransactions().filter(t => {
    const listing = getListings().find(l => l.listingId === t.listingId && l.city === city && l.name === crop && isSoldListing(l));
    return listing && t.timestamp.split('T')[0] === today;
  }).length;

  const demandScore = offers + (soldToday * 3);
  if (demandScore > 8) return { mood: '🔥 High Demand', score: 'high' };
  if (demandScore > 3) return { mood: '🟡 Normal', score: 'normal' };
  return { mood: '💤 Low Demand', score: 'low' };
}

function getOfferQualityIndicator(offeredPrice, avgRate, tolerance = 0.10) {
  const diff = (offeredPrice - avgRate) / avgRate;
  if (diff <= tolerance && diff >= -tolerance) return { indicator: '🟢 Competitive', type: 'good' };
  if (diff > tolerance && diff <= tolerance * 2) return { indicator: '🟡 Slightly High', type: 'warning' };
  return { indicator: '🔴 Too Low', type: 'info' };
}

function recordCommunityRate(city, crop, rate, buyerId) {
  // Back-compat wrapper.
  recordCommunityMarketRate(buyerId, city, crop, rate);
}

function getCommunityRatesV2(city, crop) {
  const today = new Date().toISOString().split('T')[0];
  const allRates = readJson(STORAGE_KEYS.communityMarketRates, []);
  const todayRates = allRates.filter(r =>
    r.city === city && r.crop === crop && r.timestamp.split('T')[0] === today
  ).map(r => r.rate);

  if (todayRates.length < 3) return null;

  const sorted = todayRates.slice().sort((a, b) => a - b);
  const avg = sorted.reduce((s, r) => s + r, 0) / sorted.length;
  const threshold = avg * 0.25;
  const filtered = sorted.filter(r => Math.abs(r - avg) <= threshold);

  if (!filtered.length) return null;

  const finalAvg = filtered.reduce((s, r) => s + r, 0) / filtered.length;
  return {
    city, crop, average: parseFloat(finalAvg.toFixed(2)),
    count: filtered.length, source: 'Community Avg', outlierCount: todayRates.length - filtered.length
  };
}

function getBuyerPurchaseHistory(buyerId) {
  const transactions = getTransactions().filter(t => t.buyerId === buyerId);
  return transactions.map(t => {
    const listing = getListings().find(l => l.listingId === t.listingId) || {};
    const crop = MAHARASHTRA_CROPS.find(c => c.english === listing.name) || { english: listing.name, marathi: '' };
    return {
      ...t,
      crop: crop.english,
      cropMarathi: crop.marathi,
      marketAvg: computeMarketRatesV2(t.city || listing.city, t.crop || listing.name)?.avg || 0
    };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getTodayPurchaseStats(buyerId) {
  const today = new Date().toISOString().split('T')[0];
  const todayTxns = getBuyerPurchaseHistory(buyerId).filter(t => t.timestamp.split('T')[0] === today);

  const totalSpent = todayTxns.reduce((s, t) => s + (t.totalAmount || 0), 0);
  const totalQty = todayTxns.reduce((s, t) => s + (t.quantity || 0), 0);

  const avgByCrop = {};
  todayTxns.forEach(t => {
    if (!avgByCrop[t.crop]) avgByCrop[t.crop] = { total: 0, count: 0 };
    avgByCrop[t.crop].total += t.finalPrice || 0;
    avgByCrop[t.crop].count += 1;
  });

  Object.keys(avgByCrop).forEach(crop => {
    avgByCrop[crop] = parseFloat((avgByCrop[crop].total / avgByCrop[crop].count).toFixed(2));
  });

  return { totalSpent, totalQty, avgByCrop, count: todayTxns.length };
}

// ==================== ANALYTICS V2 ====================
function getSoldTransactions() {
  return getTransactions().filter(t => t.status === 'Finalized' || t.status === 'Sold' || t.status === 'Finalized');
}

function computeTrend(city, crop, days = 7, filterFn = null) {
  const now = Date.now();
  const listings = getListings();
  const allowByFilter = (entry) => {
    if (!filterFn) return true;
    try {
      return filterFn(entry);
    } catch (err) {
      return false;
    }
  };
  const transactions = getSoldTransactions().filter(t => {
    const matchesCity = city ? t.city === city : true;
    const matchesCrop = crop ? t.cropName === crop || t.crop === crop || t.name === crop : true;
    return matchesCity && matchesCrop;
  }).filter(t => {
    const diff = (now - new Date(t.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= days;
  }).filter(t => allowByFilter(t));

  const txnListingIds = new Set(transactions.map(t => String(t.listingId || '')));
  const soldListings = listings.filter(l => {
    if (!l || !isSoldListing(l)) return false;
    if (city && l.city !== city) return false;
    const lCrop = l.name || l.commodity || '';
    if (crop && lCrop !== crop) return false;
    if (txnListingIds.has(String(l.listingId || l.id || ''))) return false;
    const ts = new Date(l.soldAt || l.updatedAt || l.createdAt || '').getTime();
    if (!Number.isFinite(ts)) return false;
    const diff = (now - ts) / (1000 * 60 * 60 * 24);
    return diff <= days;
  }).filter(l => allowByFilter(l))
    .map(l => {
      const rate = Number(l.soldRate || 0) || (Number(l.soldTotal || 0) / Number(l.soldQty || 1));
      return {
        listingId: l.listingId || l.id,
        timestamp: l.soldAt || l.updatedAt || l.createdAt,
        finalRate: rate
      };
    }).filter(l => Number.isFinite(l.finalRate) && l.finalRate > 0);

  const buckets = {};
  const allEntries = transactions.concat(soldListings);
  allEntries.forEach(t => {
    const day = new Date(t.timestamp).toISOString().split('T')[0];
    const rate = Number(t.finalRate || t.finalPrice || 0);
    if (!buckets[day]) buckets[day] = [];
    if (rate > 0) buckets[day].push(rate);
  });

  const labels = [];
  const values = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    labels.push(date);
    const rates = buckets[date] || [];
    const avg = rates.length ? (rates.reduce((s, r) => s + r, 0) / rates.length) : 0;
    values.push(parseFloat(avg.toFixed(2)));
  }

  return { labels, values, sampleSize: allEntries.length };
}

function computeFarmerVsMarketAvg(farmerId, city, crop) {
  const farmerTxns = getSoldTransactions().filter(t => t.farmerId === farmerId && (!city || t.city === city) && (!crop || t.cropName === crop));
  const marketTxns = getSoldTransactions().filter(t => (!city || t.city === city) && (!crop || t.cropName === crop));
  const farmerAvg = farmerTxns.length ? farmerTxns.reduce((s, t) => s + (t.finalRate || 0), 0) / farmerTxns.length : 0;
  const marketAvg = marketTxns.length ? marketTxns.reduce((s, t) => s + (t.finalRate || 0), 0) / marketTxns.length : 0;
  return {
    farmerAvg: parseFloat(farmerAvg.toFixed(2)),
    marketAvg: parseFloat(marketAvg.toFixed(2)),
    diffPct: marketAvg ? parseFloat((((farmerAvg - marketAvg) / marketAvg) * 100).toFixed(1)) : 0,
    sample: { farmer: farmerTxns.length, market: marketTxns.length }
  };
}

function computeMiddlemanEarningsBreakdown(middlemanId) {
  const txns = getSoldTransactions().filter(t => t.middlemanId === middlemanId);
  const now = new Date();
  const makeRange = (days) => now.getTime() - days * 24 * 60 * 60 * 1000;
  const sums = { today: 0, week: 0, month: 0 };
  const byCrop = {};
  const byCity = {};
  let totalValue = 0;

  txns.forEach(t => {
    const ts = new Date(t.timestamp).getTime();
    const amount = t.commissionAmount || 0;
    if (ts >= makeRange(1)) sums.today += amount;
    if (ts >= makeRange(7)) sums.week += amount;
    if (ts >= makeRange(30)) sums.month += amount;
    if (t.cropName) byCrop[t.cropName] = (byCrop[t.cropName] || 0) + amount;
    if (t.city) byCity[t.city] = (byCity[t.city] || 0) + amount;
    totalValue += Number(t.totalAmount || 0);
  });

  return { sums, byCrop, byCity, count: txns.length, totalValue };
}

function computeDemandHeat() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const offers = getOffers();
  const transactions = getSoldTransactions();

  const last7 = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const offerScore = offers.filter(o => {
    const ts = new Date(o.timestamp || o.createdAt || now).getTime();
    return ts >= last7;
  }).length;

  const soldScore = transactions.filter(t => new Date(t.timestamp).getTime() >= last7).length * 3;
  const todaySold = transactions.filter(t => t.timestamp.split('T')[0] === today).length;
  const totalScore = offerScore + soldScore + todaySold * 2;
  const heat = totalScore > 15 ? 'High' : totalScore > 6 ? 'Moderate' : 'Low';
  return { heat, score: totalScore, offers7d: offerScore, sales7d: soldScore / 3, salesToday: todaySold };
}

function computeHotCropsToday(limit = 3) {
  const today = new Date().toISOString().split('T')[0];
  const tally = {};
  getOffers().forEach(o => {
    if ((o.timestamp || '').split('T')[0] === today) {
      tally[o.listingId] = (tally[o.listingId] || 0) + 1;
    }
  });
  getSoldTransactions().forEach(t => {
    if ((t.timestamp || '').split('T')[0] === today) {
      tally[t.listingId] = (tally[t.listingId] || 0) + 3;
    }
  });
  const listings = getListings();
  const entries = Object.keys(tally).map(id => {
    const listing = listings.find(l => l.listingId === id) || {};
    return { id, crop: listing.name || 'Crop', score: tally[id] };
  }).sort((a, b) => b.score - a.score);
  return entries.slice(0, limit);
}

function computeTopCityToday() {
  const today = new Date().toISOString().split('T')[0];
  const tally = {};
  getSoldTransactions().forEach(t => {
    if ((t.timestamp || '').split('T')[0] === today) {
      tally[t.city] = (tally[t.city] || 0) + (t.totalAmount || 0);
    }
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  return { city: sorted[0][0], value: sorted[0][1] };
}

// ==================== DEMO MODE ====================
function seedDemoData() {
  const mergeByKey = (existingList, incomingList, keyName) => {
    const target = Array.isArray(existingList) ? existingList.slice() : [];
    const incoming = Array.isArray(incomingList) ? incomingList : [];
    const indexByKey = new Map();
    target.forEach((item, idx) => {
      const key = item && item[keyName] != null ? String(item[keyName]) : '';
      if (key) indexByKey.set(key, idx);
    });
    let added = 0;
    let updated = 0;
    incoming.forEach((item) => {
      const key = item && item[keyName] != null ? String(item[keyName]) : '';
      if (!key) return;
      const idx = indexByKey.get(key);
      if (typeof idx === 'number') {
        target[idx] = { ...(target[idx] || {}), ...(item || {}) };
        updated += 1;
      } else {
        target.push(item);
        indexByKey.set(key, target.length - 1);
        added += 1;
      }
    });
    return { list: target, added, updated };
  };

  const farmerId = getStoreValue(STORAGE_KEYS.currentFarmerId) || ensureRole('farmer');
  const buyerId = getStoreValue(STORAGE_KEYS.currentBuyerId) || ensureRole('buyer');
  const middlemanId = getStoreValue(STORAGE_KEYS.currentMiddlemanId) || ensureRole('middleman');
  const farmer2Id = 'FARM-0002';
  const buyer2Id = 'BUY-0002';

  // Keep role pointers stable so seeded records are visible immediately.
  setStoreValue(STORAGE_KEYS.currentFarmerId, farmerId);
  setStoreValue(STORAGE_KEYS.currentBuyerId, buyerId);
  setStoreValue(STORAGE_KEYS.currentMiddlemanId, middlemanId);
  setStoreValue(STORAGE_KEYS.buyerCity, 'Pune');

  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const todayIso = new Date(now).toISOString();
  const yesterdayIso = new Date(now - (24 * hour)).toISOString();

  // Listings: include Pending/Approved/PurchaseRequested/Sold/Rejected so every section has content.
  const demoListingsRaw = [
    { listingId: 'LST-DEMO-1001', name: 'Onion', city: 'Pune', quantity: 1200, price: 18, unit: 'kg', category: 'Vegetables', status: 'Sold', farmerId, approvedPrice: 18, soldQty: 300, soldRate: 17, soldTotal: 5100, soldAt: new Date(now - 18 * hour).toISOString(), createdAt: new Date(now - 72 * hour).toISOString(), description: 'Fresh red onions - demo lot' },
    { listingId: 'LST-DEMO-1002', name: 'Tomato', city: 'Mumbai', quantity: 900, price: 24, unit: 'kg', category: 'Vegetables', status: 'Sold', farmerId, approvedPrice: 24, soldQty: 450, soldRate: 23, soldTotal: 10350, soldAt: new Date(now - 30 * hour).toISOString(), createdAt: new Date(now - 80 * hour).toISOString(), description: 'Grade A tomato batch' },
    { listingId: 'LST-DEMO-1003', name: 'Cotton', city: 'Nagpur', quantity: 600, price: 70, unit: 'kg', category: 'Cash Crops', status: 'Pending', farmerId, createdAt: new Date(now - 3 * hour).toISOString() },
    { listingId: 'LST-DEMO-1004', name: 'Wheat', city: 'Nashik', quantity: 1500, price: 26, unit: 'kg', category: 'Food Grains', status: 'Approved', farmerId: farmer2Id, approvedPrice: 26, createdAt: new Date(now - 10 * hour).toISOString() },
    { listingId: 'LST-DEMO-1005', name: 'Tur', city: 'Aurangabad', quantity: 500, price: 96, unit: 'kg', category: 'Pulses', status: 'PurchaseRequested', farmerId, approvedPrice: 96, createdAt: new Date(now - 9 * hour).toISOString() },
    { listingId: 'LST-DEMO-1006', name: 'Soybean', city: 'Latur', quantity: 750, price: 46, unit: 'kg', category: 'Cash Crops', status: 'Rejected', farmerId, rejectionReason: 'Quality mismatch in sample inspection', createdAt: new Date(now - 50 * hour).toISOString() },
    { listingId: 'LST-DEMO-1007', name: 'Potato', city: 'Pune', quantity: 400, price: 22, unit: 'kg', category: 'Vegetables', status: 'Approved', farmerId: farmer2Id, approvedPrice: 22, createdAt: new Date(now - 6 * hour).toISOString() },
    { listingId: 'LST-DEMO-1008', name: 'Wheat', city: 'Nashik', quantity: 700, price: 25, unit: 'kg', category: 'Food Grains', status: 'Sold', farmerId: farmer2Id, approvedPrice: 25, soldQty: 280, soldRate: 25, soldTotal: 7000, soldAt: new Date(now - 5 * hour).toISOString(), createdAt: new Date(now - 40 * hour).toISOString() }
  ];
  const demoListings = demoListingsRaw.map((l, idx) => normalizeListing({ ...l, id: l.id || (Date.now() + idx) }, idx, { farmerId: l.farmerId })).filter(Boolean);
  const mergedListings = mergeByKey(getListings(), demoListings, 'listingId');
  saveListings(mergedListings.list);

  // Offers: include open + accepted + finalized + rejected + countered states.
  const demoOffersRaw = [
    { id: 'OFF-DEMO-2001', offerId: 'OFF-DEMO-2001', listingId: 'LST-DEMO-1001', buyerId, farmerId, offeredPrice: 16, acceptedPrice: 17, acceptedQty: 300, finalRate: 17, finalQty: 300, status: 'Finalized', transactionId: 'TXN-DEMO-3001', timestamp: new Date(now - 26 * hour).toISOString(), finalizedAt: new Date(now - 18 * hour).toISOString() },
    { id: 'OFF-DEMO-2002', offerId: 'OFF-DEMO-2002', listingId: 'LST-DEMO-1002', buyerId: buyer2Id, farmerId, offeredPrice: 22, acceptedPrice: 23, acceptedQty: 450, finalRate: 23, finalQty: 450, status: 'Finalized', transactionId: 'TXN-DEMO-3002', timestamp: new Date(now - 34 * hour).toISOString(), finalizedAt: new Date(now - 30 * hour).toISOString() },
    { id: 'OFF-DEMO-2003', offerId: 'OFF-DEMO-2003', listingId: 'LST-DEMO-1005', buyerId, farmerId, offeredPrice: 94, acceptedPrice: 96, acceptedQty: 200, status: 'Accepted', timestamp: new Date(now - 8 * hour).toISOString(), acceptedAt: new Date(now - 7 * hour).toISOString() },
    { id: 'OFF-DEMO-2004', offerId: 'OFF-DEMO-2004', listingId: 'LST-DEMO-1004', buyerId, farmerId: farmer2Id, offeredPrice: 24, quantity: 350, status: 'OfferPlaced', timestamp: new Date(now - 2 * hour).toISOString() },
    { id: 'OFF-DEMO-2005', offerId: 'OFF-DEMO-2005', listingId: 'LST-DEMO-1007', buyerId, farmerId: farmer2Id, offeredPrice: 25, quantity: 120, counteredPrice: 27, counteredQty: 120, status: 'Countered', timestamp: new Date(now - 90 * 60000).toISOString(), counteredAt: new Date(now - 60 * 60000).toISOString() },
    { id: 'OFF-DEMO-2006', offerId: 'OFF-DEMO-2006', listingId: 'LST-DEMO-1004', buyerId: buyer2Id, farmerId: farmer2Id, offeredPrice: 20, quantity: 100, status: 'Rejected', rejectionReason: 'Price too low', timestamp: yesterdayIso, rejectedAt: yesterdayIso },
    { id: 'OFF-DEMO-2007', offerId: 'OFF-DEMO-2007', listingId: 'LST-DEMO-1008', buyerId, farmerId: farmer2Id, offeredPrice: 24, acceptedPrice: 25, acceptedQty: 280, finalRate: 25, finalQty: 280, status: 'Finalized', transactionId: 'TXN-DEMO-3003', timestamp: new Date(now - 8 * hour).toISOString(), finalizedAt: new Date(now - 5 * hour).toISOString() }
  ];
  const mergedOffers = mergeByKey(getOffers(), demoOffersRaw, 'offerId');
  saveOffers(mergedOffers.list);

  // Transactions: use Finalized + commissionAmount fields so all analytics panels populate.
  const demoTransactionsRaw = [
    { transactionId: 'TXN-DEMO-3001', offerId: 'OFF-DEMO-2001', listingId: 'LST-DEMO-1001', buyerId, farmerId, middlemanId, cropName: 'Onion', city: 'Pune', quantity: 300, finalRate: 17, finalPrice: 17, totalAmount: 5100, commissionRate: 0.05, commissionAmount: 255, farmerPayout: 4845, status: 'Finalized', timestamp: new Date(now - 18 * hour).toISOString() },
    { transactionId: 'TXN-DEMO-3002', offerId: 'OFF-DEMO-2002', listingId: 'LST-DEMO-1002', buyerId: buyer2Id, farmerId, middlemanId, cropName: 'Tomato', city: 'Mumbai', quantity: 450, finalRate: 23, finalPrice: 23, totalAmount: 10350, commissionRate: 0.05, commissionAmount: 517.5, farmerPayout: 9832.5, status: 'Finalized', timestamp: new Date(now - 30 * hour).toISOString() },
    { transactionId: 'TXN-DEMO-3003', offerId: 'OFF-DEMO-2007', listingId: 'LST-DEMO-1008', buyerId, farmerId: farmer2Id, middlemanId, cropName: 'Wheat', city: 'Nashik', quantity: 280, finalRate: 25, finalPrice: 25, totalAmount: 7000, commissionRate: 0.05, commissionAmount: 350, farmerPayout: 6650, status: 'Finalized', timestamp: new Date(now - 5 * hour).toISOString() }
  ];
  const demoTransactions = demoTransactionsRaw.map((tx, idx) => normalizeTransaction(tx, idx)).filter(Boolean);
  const mergedTransactions = mergeByKey(getTransactions(), demoTransactions, 'transactionId');
  saveTransactions(mergedTransactions.list);

  // Align sold listings/offers from transaction truth.
  syncSoldListingsFromTransactions();

  const demoNotifications = [
    { id: 'NTF-DEMO-5001', audience: 'middleman', type: 'new_listing', listingId: 'LST-DEMO-1003', farmerId, timestamp: todayIso, priority: 'Info', read: false },
    { id: 'NTF-DEMO-5002', audience: 'buyer', type: 'offer_accepted', offerId: 'OFF-DEMO-2003', listingId: 'LST-DEMO-1005', farmerId, buyerId, acceptedPrice: 96, quantity: 200, timestamp: new Date(now - 6 * hour).toISOString(), priority: 'ActionRequired', read: false },
    { id: 'NTF-DEMO-5003', audience: 'farmer', type: 'deal_finalized', transactionId: 'TXN-DEMO-3001', offerId: 'OFF-DEMO-2001', listingId: 'LST-DEMO-1001', farmerId, buyerId, finalPrice: 17, totalAmount: 5100, farmerPayout: 4845, commissionAmount: 255, timestamp: new Date(now - 18 * hour).toISOString(), priority: 'Finalized', read: false },
    { id: 'NTF-DEMO-5004', audience: 'buyer', type: 'counter_offer', offerId: 'OFF-DEMO-2005', listingId: 'LST-DEMO-1007', farmerId: farmer2Id, buyerId, counteredPrice: 27, counteredQty: 120, timestamp: new Date(now - 55 * 60000).toISOString(), priority: 'ActionRequired', read: false },
    { id: 'NTF-DEMO-5005', audience: 'farmer', type: 'offer_rejected', offerId: 'OFF-DEMO-2006', listingId: 'LST-DEMO-1004', farmerId: farmer2Id, buyerId: buyer2Id, timestamp: yesterdayIso, priority: 'Info', read: true }
  ];
  const mergedNotifications = mergeByKey(getNotifications(), demoNotifications, 'id');
  saveNotifications(mergedNotifications.list);

  // Buyer saved crops must be object rows by buyerId for Saved Items UI.
  const rawSaved = readJson(STORAGE_KEYS.buyerSavedCrops, []);
  const savedList = (Array.isArray(rawSaved) ? rawSaved : []).map((entry, idx) => {
    if (entry && typeof entry === 'object') return entry;
    if (typeof entry === 'string') {
      return { id: `SAVED-MIG-${idx}`, buyerId, crop: entry, city: 'Pune', savedAt: new Date(now - idx * hour).toISOString() };
    }
    return null;
  }).filter(Boolean);
  const demoSaved = [
    { id: 'SAVED-DEMO-6001', buyerId, crop: 'Onion', city: 'Pune', savedAt: new Date(now - 12 * hour).toISOString() },
    { id: 'SAVED-DEMO-6002', buyerId, crop: 'Tomato', city: 'Mumbai', savedAt: new Date(now - 11 * hour).toISOString() },
    { id: 'SAVED-DEMO-6003', buyerId, crop: 'Wheat', city: 'Nashik', savedAt: new Date(now - 10 * hour).toISOString() },
    { id: 'SAVED-DEMO-6004', buyerId, crop: 'Tur', city: 'Aurangabad', savedAt: new Date(now - 9 * hour).toISOString() }
  ];
  const mergedSaved = mergeByKey(savedList, demoSaved, 'id');
  writeJson(STORAGE_KEYS.buyerSavedCrops, mergedSaved.list);
  publishDataSync(STORAGE_KEYS.buyerSavedCrops, mergedSaved.list);

  // Community rates: keep >=3 same-day reports for same city/crop so market intelligence always shows data.
  const demoCommunityRates = [
    { id: 'CMR-DEMO-7001', buyerId, city: 'Pune', crop: 'Onion', rate: 17.6, timestamp: todayIso },
    { id: 'CMR-DEMO-7002', buyerId: buyer2Id, city: 'Pune', crop: 'Onion', rate: 18.1, timestamp: new Date(now - 45 * 60000).toISOString() },
    { id: 'CMR-DEMO-7003', buyerId, city: 'Pune', crop: 'Onion', rate: 17.9, timestamp: new Date(now - 95 * 60000).toISOString() },
    { id: 'CMR-DEMO-7004', buyerId, city: 'Mumbai', crop: 'Tomato', rate: 23.2, timestamp: todayIso },
    { id: 'CMR-DEMO-7005', buyerId: buyer2Id, city: 'Mumbai', crop: 'Tomato', rate: 22.8, timestamp: new Date(now - 35 * 60000).toISOString() },
    { id: 'CMR-DEMO-7006', buyerId, city: 'Mumbai', crop: 'Tomato', rate: 23.0, timestamp: new Date(now - 80 * 60000).toISOString() }
  ];
  const existingCommunityRates = readJson(STORAGE_KEYS.communityMarketRates, []);
  const mergedCommunityRates = mergeByKey(Array.isArray(existingCommunityRates) ? existingCommunityRates : [], demoCommunityRates, 'id');
  writeJson(STORAGE_KEYS.communityMarketRates, mergedCommunityRates.list);
  publishDataSync(STORAGE_KEYS.communityMarketRates, mergedCommunityRates.list);

  // Prime cached daily rates for the buyer market card (compute functions still use transactions as source of truth).
  const ratesStore = readJson(STORAGE_KEYS.dailyMarketRates, {}) || {};
  ratesStore['Pune|Onion'] = { city: 'Pune', crop: 'Onion', min: 17, avg: 17.8, max: 18.2, date: new Date().toISOString().split('T')[0], source: 'Demo Seed', count: 3 };
  ratesStore['Mumbai|Tomato'] = { city: 'Mumbai', crop: 'Tomato', min: 22.8, avg: 23.0, max: 23.2, date: new Date().toISOString().split('T')[0], source: 'Demo Seed', count: 3 };
  writeJson(STORAGE_KEYS.dailyMarketRates, ratesStore);
  publishDataSync(STORAGE_KEYS.dailyMarketRates, ratesStore);

  const mergeUniqueText = (key, values) => {
    const existing = readJson(key, []);
    const list = Array.isArray(existing) ? existing : [];
    const merged = Array.from(new Set(list.concat(values || [])));
    writeJson(key, merged);
    return merged;
  };
  mergeUniqueText(STORAGE_KEYS.recentCities, ['Pune', 'Mumbai', 'Nashik', 'Aurangabad']);
  mergeUniqueText(STORAGE_KEYS.recentCrops, ['Onion', 'Tomato', 'Wheat', 'Tur']);

  const demoAudit = [
    { id: 'AUD-DEMO-8001', action: 'transaction_finalized', details: 'Demo transaction TXN-DEMO-3001 finalized.', timestamp: new Date(now - 18 * hour).toISOString(), actorId: middlemanId },
    { id: 'AUD-DEMO-8002', action: 'offer_accepted', details: 'Demo offer OFF-DEMO-2003 accepted and pending finalization.', timestamp: new Date(now - 7 * hour).toISOString(), actorId: farmerId },
    { id: 'AUD-DEMO-8003', action: 'listing_created', details: 'Demo listing LST-DEMO-1003 created and pending approval.', timestamp: new Date(now - 3 * hour).toISOString(), actorId: farmerId }
  ];
  const mergedAudit = mergeByKey(readJson(STORAGE_KEYS.auditLog, []), demoAudit, 'id');
  writeJson(STORAGE_KEYS.auditLog, mergedAudit.list);

  const added = {
    listings: mergedListings.added,
    offers: mergedOffers.added,
    transactions: mergedTransactions.added,
    notifications: mergedNotifications.added,
    communityRates: mergedCommunityRates.added,
    savedCrops: mergedSaved.added,
    audit: mergedAudit.added
  };
  const updated = {
    listings: mergedListings.updated,
    offers: mergedOffers.updated,
    transactions: mergedTransactions.updated,
    notifications: mergedNotifications.updated,
    communityRates: mergedCommunityRates.updated,
    savedCrops: mergedSaved.updated,
    audit: mergedAudit.updated
  };
  const touched = Object.values(added).reduce((s, n) => s + n, 0) + Object.values(updated).reduce((s, n) => s + n, 0);
  if (touched === 0) {
    return { seeded: false, skipped: true, reason: 'Demo data already present', added, updated };
  }
  return { seeded: true, added, updated, offers: mergedOffers.list.length, transactions: mergedTransactions.list.length };
}

function resetAndSeedDemoData() {
  const resetResult = resetAppDataForUser();
  const seedResult = seedDemoData();
  try {
    farmaPublish('farmaDemoSetupReady', {
      timestamp: Date.now(),
      seeded: !!seedResult?.seeded,
      offers: seedResult?.offers || 0,
      transactions: seedResult?.transactions || 0
    });
  } catch (e) { }
  return { resetResult, seedResult };
}
