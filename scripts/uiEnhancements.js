// UI Enhancements: Status Visualization

function getStatusSteps() {
  return [
    { id: 'pending', label: 'Pending', icon: '⏳' },
    { id: 'approved', label: 'Approved', icon: '✅' },
    { id: 'purchaserequested', label: 'Buyer Interest', icon: '🛒' },
    { id: 'sold', label: 'Sold', icon: '🎉' }
  ];
}

function renderStatusStepper(currentStatus) {
  const statusMap = {
    'Pending': 'pending',
    'Approved': 'approved',
    'PurchaseRequested': 'purchaserequested',
    'Sold': 'sold',
    'Rejected': 'pending'
  };

  const currentStepId = statusMap[currentStatus] || 'pending';

  // For Sold listings, show only: Pending → Approved → Sold (skip PurchaseRequested)
  const steps = currentStatus === 'Sold' ? [
    { id: 'pending', label: 'Pending', icon: '⏳' },
    { id: 'approved', label: 'Approved', icon: '✅' },
    { id: 'sold', label: 'Sold', icon: '🎉' }
  ] : getStatusSteps();

  const currentStepIndex = steps.findIndex(s => s.id === currentStepId);

  return `
    <div class="status-stepper">
      ${steps.map((step, idx) => {
    const isActive = idx === currentStepIndex;
    const isCompleted = idx < currentStepIndex;
    const classes = `stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
    const labelKey = step.label;
    return `
          <div class="${classes}">
            <div class="stepper-icon">${step.icon}</div>
            <div class="stepper-label" data-i18n="${labelKey}">${typeof t === 'function' ? t(labelKey) : labelKey}</div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

function renderEmptyState(icon, title, message) {
  const normalize = (input) => {
    if (input && typeof input === 'object' && input.key) return input;
    return { key: input, vars: null };
  };
  const tTitle = normalize(title);
  const tMsg = normalize(message);
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title" data-i18n="${tTitle.key}" ${tTitle.vars ? `data-i18n-vars='${JSON.stringify(tTitle.vars)}'` : ''}>${typeof t === 'function' ? t(tTitle.key, tTitle.vars) : tTitle.key}</div>
      <div class="empty-state-text" data-i18n="${tMsg.key}" ${tMsg.vars ? `data-i18n-vars='${JSON.stringify(tMsg.vars)}'` : ''}>${typeof t === 'function' ? t(tMsg.key, tMsg.vars) : tMsg.key}</div>
    </div>
  `;
}

function isUiFlagEnabled(flagName, fallback = false) {
  if (typeof getUiFlag === 'function') return getUiFlag(flagName, fallback);
  try {
    const raw = localStorage.getItem(flagName);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch (e) { }
  return fallback;
}

function buildSkeletonHtml(type = 'list') {
  if (type === 'table') {
    return `
      <div class="skeleton-table">
        <div class="skeleton-row header"></div>
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
      </div>
    `;
  }
  if (type === 'cards') {
    return `
      <div class="skeleton-grid">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    `;
  }
  return `<div class="skeleton-list"><div class="skeleton-item"></div><div class="skeleton-item"></div><div class="skeleton-item"></div></div>`;
}

function withLoadingSkeleton(container, type, renderFn) {
  if (!container) return renderFn();
  const originalHtml = container.innerHTML;
  container.innerHTML = buildSkeletonHtml(type);
  container.classList.add('is-loading-skeleton');

  setTimeout(() => {
    container.classList.remove('is-loading-skeleton');
    renderFn();
  }, 400); // Shorter artificial delay for perceived speed
}

function applyFeatureFlags() {
  document.querySelectorAll('[data-feature-flag]').forEach((node) => {
    const flagName = node.getAttribute('data-feature-flag');
    const enabled = isUiFlagEnabled(flagName, false);
    const navLinks = node.id
      ? document.querySelectorAll(`.topbar-nav a[href="#${node.id}"]`)
      : [];
    if (enabled) {
      node.classList.remove('feature-hidden');
      node.removeAttribute('aria-hidden');
      if (node.hidden) node.hidden = false;
      navLinks.forEach((link) => {
        link.style.display = '';
      });
      return;
    }
    node.classList.add('feature-hidden');
    node.setAttribute('aria-hidden', 'true');
    node.hidden = true;
    navLinks.forEach((link) => {
      link.style.display = 'none';
    });
  });
}

let farmaDialogHost = null;
let farmaDialogResolve = null;
let farmaDialogLastFocus = null;

function setFarmaDialogVisibility(isVisible) {
  if (!farmaDialogHost) return;
  farmaDialogHost.hidden = !isVisible;
  farmaDialogHost.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
  document.body.classList.toggle('dialog-open', !!isVisible);
}

function resolveActiveFarmaDialog(result) {
  if (!farmaDialogHost) return;
  setFarmaDialogVisibility(false);
  const done = farmaDialogResolve;
  farmaDialogResolve = null;
  if (typeof done === 'function') {
    done(result);
  } else if (typeof window !== 'undefined' && window.__farmaAlertQueue) {
    // Fallback: if resolver went missing, unblock future alerts.
    window.__farmaAlertQueue = Promise.resolve();
  }
  if (farmaDialogLastFocus && typeof farmaDialogLastFocus.focus === 'function') {
    farmaDialogLastFocus.focus();
  }
}

function ensureFarmaDialogHost() {
  if (farmaDialogHost) return farmaDialogHost;
  const host = document.createElement('div');
  host.className = 'farma-dialog-overlay';
  host.hidden = true;
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = `
    <div class="farma-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="farmaDialogTitle">
      <div class="farma-dialog-head">
        <h3 id="farmaDialogTitle" class="farma-dialog-title">Notice</h3>
        <button type="button" id="farmaDialogCloseBtn" class="farma-dialog-close" data-farma-dialog-action="close" aria-label="Close">×</button>
      </div>
      <p class="farma-dialog-message" id="farmaDialogMessage"></p>
      <label class="farma-dialog-input-wrap" id="farmaDialogInputWrap" hidden>
        <input type="text" id="farmaDialogInput" class="search-field" />
      </label>
      <div class="farma-dialog-actions">
        <button type="button" class="btn-secondary" id="farmaDialogCancelBtn" data-farma-dialog-action="cancel">Cancel</button>
        <button type="button" class="btn-primary" id="farmaDialogOkBtn" data-farma-dialog-action="ok">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(host);

  const cancelBtn = host.querySelector('#farmaDialogCancelBtn');
  const okBtn = host.querySelector('#farmaDialogOkBtn');
  const closeBtn = host.querySelector('#farmaDialogCloseBtn');
  const input = host.querySelector('#farmaDialogInput');
  const inputWrap = host.querySelector('#farmaDialogInputWrap');
  const resolveByAction = (action) => {
    if (host.hidden) return;
    if (action === 'ok') {
      resolveActiveFarmaDialog({ confirmed: true, value: input.value });
      return;
    }
    resolveActiveFarmaDialog({ confirmed: false, value: null });
  };

  // Bind directly to action buttons to avoid missed delegated clicks on some browsers.
  [okBtn, cancelBtn, closeBtn].forEach((button) => {
    if (!button) return;
    const onAction = (e) => {
      e.preventDefault();
      const action = button.getAttribute('data-farma-dialog-action');
      resolveByAction(action);
    };
    button.addEventListener('click', onAction);
    button.addEventListener('pointerup', onAction);
  });

  host.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : e.target?.parentElement;
    const actionBtn = target && typeof target.closest === 'function'
      ? target.closest('[data-farma-dialog-action]')
      : null;
    if (actionBtn && host.contains(actionBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const action = actionBtn.getAttribute('data-farma-dialog-action');
      resolveByAction(action);
      return;
    }
    if (e.target === host) resolveActiveFarmaDialog({ confirmed: false, value: null });
  });
  document.addEventListener('keydown', (e) => {
    if (host.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      resolveActiveFarmaDialog({ confirmed: false, value: null });
      return;
    }
    if (e.key === 'Enter' && (!inputWrap.hidden || document.activeElement === okBtn)) {
      e.preventDefault();
      resolveActiveFarmaDialog({ confirmed: true, value: input.value });
    }
  });

  farmaDialogHost = host;
  return host;
}

function runFarmaDialog({
  mode = 'alert',
  title = null,
  message = '',
  okText = 'OK',
  cancelText = 'Cancel',
  defaultValue = ''
} = {}) {
  const host = ensureFarmaDialogHost();
  const titleEl = host.querySelector('#farmaDialogTitle');
  const msgEl = host.querySelector('#farmaDialogMessage');
  const inputWrap = host.querySelector('#farmaDialogInputWrap');
  const input = host.querySelector('#farmaDialogInput');
  const cancelBtn = host.querySelector('#farmaDialogCancelBtn');
  const okBtn = host.querySelector('#farmaDialogOkBtn');

  // If another dialog is still active, close it first to avoid "stuck" overlays.
  if (farmaDialogResolve) {
    resolveActiveFarmaDialog({ confirmed: false, value: null, reason: 'replaced' });
  }
  const resultPromise = new Promise((resolve) => {
    farmaDialogResolve = resolve;
  });

  titleEl.textContent = title || (mode === 'confirm' ? 'Please confirm' : mode === 'prompt' ? 'Input required' : 'Notice');
  msgEl.textContent = message || '';
  okBtn.textContent = okText;
  cancelBtn.textContent = cancelText;
  inputWrap.hidden = mode !== 'prompt';
  cancelBtn.hidden = mode === 'alert';
  input.value = defaultValue || '';

  farmaDialogLastFocus = document.activeElement;
  setFarmaDialogVisibility(true);
  setTimeout(() => {
    if (mode === 'prompt') input.focus();
    else okBtn.focus();
  }, 0);

  return resultPromise;
}

function shouldUseNativeDialogs() {
  if (typeof window === 'undefined') return true;
  if (typeof getUiFlag === 'function') {
    // Default to native dialogs for reliability unless explicitly enabled.
    return !getUiFlag('UI_CUSTOM_DIALOGS', false);
  }
  try {
    const raw = localStorage.getItem('UI_CUSTOM_DIALOGS');
    if (raw === 'true') return false;
    if (raw === 'false') return true;
  } catch (e) { }
  return true;
}

async function farmaAlert(message, opts = {}) {
  if (shouldUseNativeDialogs()) {
    if (typeof window !== 'undefined' && typeof window.__nativeAlert === 'function') {
      window.__nativeAlert(String(message || ''));
      return;
    }
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(String(message || ''));
      return;
    }
  }
  await runFarmaDialog({
    mode: 'alert',
    title: opts.title || (typeof t === 'function' ? t('Notice') : 'Notice'),
    message: String(message || ''),
    okText: opts.okText || (typeof t === 'function' ? t('OK') : 'OK')
  });
}

async function farmaConfirm(message, opts = {}) {
  if (shouldUseNativeDialogs()) {
    if (typeof window !== 'undefined' && typeof window.__nativeConfirm === 'function') {
      return !!window.__nativeConfirm(String(message || ''));
    }
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return !!window.confirm(String(message || ''));
    }
    return false;
  }
  const result = await runFarmaDialog({
    mode: 'confirm',
    title: opts.title || (typeof t === 'function' ? t('Please Confirm') : 'Please Confirm'),
    message: String(message || ''),
    okText: opts.okText || (typeof t === 'function' ? t('Confirm') : 'Confirm'),
    cancelText: opts.cancelText || (typeof t === 'function' ? t('Cancel') : 'Cancel')
  });
  return !!result.confirmed;
}

async function farmaPrompt(message, opts = {}) {
  if (shouldUseNativeDialogs()) {
    if (typeof window !== 'undefined' && typeof window.__nativePrompt === 'function') {
      const value = window.__nativePrompt(String(message || ''), String(opts.defaultValue || ''));
      return value === null ? null : String(value);
    }
    if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
      const value = window.prompt(String(message || ''), String(opts.defaultValue || ''));
      return value === null ? null : String(value);
    }
    return null;
  }
  const result = await runFarmaDialog({
    mode: 'prompt',
    title: opts.title || (typeof t === 'function' ? t('Input Required') : 'Input Required'),
    message: String(message || ''),
    okText: opts.okText || (typeof t === 'function' ? t('Submit') : 'Submit'),
    cancelText: opts.cancelText || (typeof t === 'function' ? t('Cancel') : 'Cancel'),
    defaultValue: opts.defaultValue || ''
  });
  return result.confirmed ? String(result.value || '') : null;
}

function openDialog(dialogId, context = {}) {
  const modal = document.getElementById(dialogId);
  if (!modal) return null;
  modal.classList.add('is-open');
  modal.style.display = 'block';
  modal.setAttribute('aria-hidden', 'false');
  if (context && context.title) {
    const title = modal.querySelector('[data-dialog-title]');
    if (title) title.textContent = context.title;
  }
  return modal;
}

function closeDialog(dialogId, returnFocusTarget = null) {
  const modal = document.getElementById(dialogId);
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.style.display = '';
  modal.setAttribute('aria-hidden', 'true');
  if (returnFocusTarget && typeof returnFocusTarget.focus === 'function') {
    returnFocusTarget.focus();
  }
}

function renderCombobox({ idPrefix, options = [], onSelect = null, placeholder = 'Search', mount = null } = {}) {
  const safePrefix = String(idPrefix || `farma-combobox-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const inputId = `${safePrefix}-input`;
  const listId = `${safePrefix}-listbox`;
  const container = document.createElement('div');
  container.className = 'search-widget';
  container.innerHTML = `
    <input id="${inputId}" class="search-field" type="text" role="combobox" aria-autocomplete="list" aria-controls="${listId}" aria-expanded="false" placeholder="${placeholder}" />
    <div id="${listId}" class="search-dropdown" role="listbox" hidden></div>
  `;

  const input = container.querySelector(`#${inputId}`);
  const dropdown = container.querySelector(`#${listId}`);
  let activeIndex = -1;
  let items = Array.isArray(options) ? options.slice() : [];

  const close = () => {
    dropdown.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  };

  const open = () => {
    if (!dropdown.children.length) {
      close();
      return;
    }
    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const applyActive = () => {
    Array.from(dropdown.querySelectorAll('.search-option')).forEach((node, index) => {
      node.classList.toggle('is-active', index === activeIndex);
    });
    if (activeIndex >= 0) {
      const active = dropdown.querySelector(`.search-option[data-index="${activeIndex}"]`);
      if (active) {
        input.setAttribute('aria-activedescendant', active.id);
        active.scrollIntoView({ block: 'nearest' });
      }
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const render = (query = '') => {
    const q = String(query || '').trim().toLowerCase();
    const filtered = items.filter((entry) => String(entry || '').toLowerCase().includes(q)).slice(0, 20);
    if (!filtered.length) {
      dropdown.innerHTML = '';
      close();
      return;
    }
    dropdown.innerHTML = filtered.map((entry, index) => `<button type="button" id="${safePrefix}-opt-${index}" role="option" class="search-option" data-index="${index}" data-value="${String(entry)}">${String(entry)}</button>`).join('');
    activeIndex = -1;
    open();
  };

  container.addEventListener('click', (event) => {
    const option = event.target.closest('.search-option');
    if (!option) return;
    const value = option.getAttribute('data-value') || '';
    input.value = value;
    close();
    if (typeof onSelect === 'function') onSelect(value);
  });

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('focus', () => render(input.value));
  input.addEventListener('keydown', (event) => {
    const optionsCount = dropdown.querySelectorAll('.search-option').length;
    if (!optionsCount) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % optionsCount;
      applyActive();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = activeIndex <= 0 ? optionsCount - 1 : activeIndex - 1;
      applyActive();
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const active = dropdown.querySelector(`.search-option[data-index="${activeIndex}"]`);
      if (!active) return;
      const value = active.getAttribute('data-value') || '';
      input.value = value;
      close();
      if (typeof onSelect === 'function') onSelect(value);
      return;
    }
    if (event.key === 'Escape') {
      close();
    }
  });

  document.addEventListener('click', (event) => {
    if (!container.contains(event.target)) close();
  });

  const api = {
    container,
    input,
    setOptions(nextOptions) {
      items = Array.isArray(nextOptions) ? nextOptions.slice() : [];
      render(input.value);
    },
    getValue() {
      return input.value;
    },
    setValue(nextValue, triggerSelect = false) {
      input.value = String(nextValue || '');
      if (triggerSelect && typeof onSelect === 'function') onSelect(input.value);
    },
    focus() {
      input.focus();
    }
  };

  if (mount) {
    const host = typeof mount === 'string' ? document.getElementById(mount) : mount;
    if (host) {
      host.innerHTML = '';
      host.appendChild(container);
    }
  }
  return api;
}

function renderErrorSummary(errors = []) {
  const wrapper = document.createElement('div');
  wrapper.className = 'farma-error-summary';
  wrapper.setAttribute('role', 'alert');
  wrapper.setAttribute('tabindex', '-1');

  const normalized = Array.isArray(errors) ? errors.filter(Boolean) : [];
  if (!normalized.length) {
    wrapper.hidden = true;
    return wrapper;
  }

  const items = normalized.map((error) => {
    if (typeof error === 'string') return { message: error, fieldId: '' };
    return {
      message: error.message || '',
      fieldId: error.fieldId || ''
    };
  }).filter((error) => error.message);

  wrapper.hidden = !items.length;
  if (wrapper.hidden) return wrapper;

  wrapper.innerHTML = `
    <h3 class="farma-error-summary-title">${typeof t === 'function' ? t('Please fix the following issues:') : 'Please fix the following issues:'}</h3>
    <ul class="farma-error-summary-list">
      ${items.map((error) => error.fieldId
    ? `<li><a href="#${error.fieldId}" data-error-field="${error.fieldId}">${error.message}</a></li>`
    : `<li>${error.message}</li>`).join('')}
    </ul>
  `;

  wrapper.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-error-field]');
    if (!link) return;
    const fieldId = link.getAttribute('data-error-field');
    if (!fieldId) return;
    const field = document.getElementById(fieldId);
    if (!field) return;
    event.preventDefault();
    field.focus();
  });

  return wrapper;
}

function initUiTaskTracking() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-task-id]');
    if (!el || typeof emitUiMetric !== 'function') return;
    const role = document.querySelector('.role-pill')?.textContent?.trim()?.toLowerCase() || 'unknown';
    emitUiMetric({
      role,
      task_id: el.getAttribute('data-task-id'),
      event_type: 'task_start',
      screen_id: window.location.pathname.split('/').pop() || 'dashboard',
      metadata: {
        id: el.id || '',
        text: (el.textContent || '').trim().slice(0, 48)
      }
    });
  });
}

function initBackToTop() {
  if (document.querySelector('.back-to-top')) return;
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.type = 'button';
  btn.textContent = 'Top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(btn);
  const toggle = () => {
    if (window.scrollY > 400) btn.classList.add('show');
    else btn.classList.remove('show');
  };
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
}

function initScrollSpy() {
  const navLinks = Array.from(document.querySelectorAll('.topbar-nav a[href^="#"]'));
  if (!navLinks.length) return;
  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = `#${entry.target.id}`;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === id);
      });
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0.1 });
  sections.forEach(section => observer.observe(section));
}

function initSectionReveal() {
  const sections = document.querySelectorAll('.dashboard-content > section');
  if (!sections.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-reveal');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  sections.forEach(section => observer.observe(section));
}

const DENSITY_KEY = 'uiDensity';
const UNIT_KEY = 'unitPref';

function updateDensityToggle(density) {
  const btn = document.getElementById('densityToggleBtn');
  if (!btn) return;
  const isCompact = density === 'compact';
  const label = isCompact ? '↕️' : '↨';
  btn.textContent = label;
  btn.title = typeof t === 'function' ? t(isCompact ? 'Comfort' : 'Compact') : (isCompact ? 'Comfort' : 'Compact');
  btn.setAttribute('aria-label', isCompact ? 'Switch to comfortable density' : 'Switch to compact density');
}

function applyDensity(density) {
  const normalized = density === 'compact' ? 'compact' : 'comfortable';
  document.body.setAttribute('data-density', normalized);
  localStorage.setItem(DENSITY_KEY, normalized);
  updateDensityToggle(normalized);
}

function initDensityToggle() {
  const saved = localStorage.getItem(DENSITY_KEY) || 'comfortable';
  applyDensity(saved);
  const btn = document.getElementById('densityToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-density') || 'comfortable';
      applyDensity(current === 'compact' ? 'comfortable' : 'compact');
    });
  }
}

function updateUnitToggle(unit) {
  const btn = document.getElementById('unitToggleBtn');
  if (!btn) return;
  const label = unit === 'quintal' ? 'Quintal' : 'kg';
  btn.textContent = unit === 'quintal' ? 'Qtl' : 'kg';
  btn.title = label;
  btn.setAttribute('aria-label', `Unit: ${label}`);
}

function applyUnit(unit) {
  const normalized = unit === 'quintal' ? 'quintal' : 'kg';
  try { localStorage.setItem(UNIT_KEY, normalized); } catch (e) { }
  updateUnitToggle(normalized);
}

function initUnitToggle() {
  const saved = localStorage.getItem(UNIT_KEY) || 'kg';
  applyUnit(saved);
  const btn = document.getElementById('unitToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = localStorage.getItem(UNIT_KEY) || 'kg';
      const next = current === 'kg' ? 'quintal' : 'kg';
      applyUnit(next);
      location.reload();
    });
  }
}

function setRealtimeChipState(chip, state, text, title = '') {
  if (!chip) return;
  chip.classList.remove('is-connected', 'is-reconnecting', 'is-fallback', 'is-unsupported');
  if (state) chip.classList.add(`is-${state}`);
  chip.textContent = text;
  if (title) chip.setAttribute('title', title);
}

function resolveRealtimeChipState() {
  if (typeof getFarmaSseStatus !== 'function') {
    return { state: 'unsupported', text: 'Local Sync', title: 'Realtime status API unavailable' };
  }
  const status = getFarmaSseStatus();
  if (status.connected) {
    return { state: 'connected', text: 'Live', title: `Connected to ${status.url}` };
  }
  if (status.retryCount > 0 && status.retryCount < status.maxRetries) {
    return {
      state: 'reconnecting',
      text: `Retry ${status.retryCount}/${status.maxRetries}`,
      title: `Realtime reconnecting (${status.retryCount}/${status.maxRetries})`
    };
  }
  if (status.retryCount >= status.maxRetries) {
    return { state: 'fallback', text: 'Polling', title: 'Realtime unavailable. Using polling fallback.' };
  }
  return { state: 'fallback', text: 'Disconnected', title: 'Realtime disconnected. Click to reconnect.' };
}

function initRealtimeConnectionChip() {
  const chip = document.querySelector('[data-realtime-chip]');
  if (!chip || chip.dataset.bound === '1') return;
  chip.dataset.bound = '1';

  const sync = () => {
    const view = resolveRealtimeChipState();
    setRealtimeChipState(chip, view.state, view.text, view.title);
  };

  chip.addEventListener('click', () => {
    const view = resolveRealtimeChipState();
    if ((view.state === 'fallback' || view.state === 'reconnecting') && typeof farmaSseReconnect === 'function') {
      farmaSseReconnect();
      setRealtimeChipState(chip, 'reconnecting', 'Retrying...', 'Manual reconnect requested');
      setTimeout(sync, 400);
    }
  });

  window.addEventListener('farmaSseConnected', () => {
    setRealtimeChipState(chip, 'connected', 'Live', 'Realtime connected');
  });
  window.addEventListener('farmaSseError', (e) => {
    const retryCount = Number(e?.detail?.retryCount || 0);
    const willRetry = !!e?.detail?.willRetry;
    if (willRetry) {
      setRealtimeChipState(chip, 'reconnecting', `Retry ${retryCount}`, `Realtime reconnecting (attempt ${retryCount})`);
    } else {
      setRealtimeChipState(chip, 'fallback', 'Polling', 'Realtime retries exhausted. Using polling fallback.');
    }
  });
  window.addEventListener('farmaSseGivenUp', () => {
    setRealtimeChipState(chip, 'fallback', 'Polling', 'Realtime unavailable. Using polling fallback.');
  });
  window.addEventListener('online', sync);
  window.addEventListener('offline', () => {
    setRealtimeChipState(chip, 'fallback', 'Offline', 'Network offline');
  });

  sync();
  setInterval(sync, 5000);
}

function initTableEnhancements() {
  const tables = document.querySelectorAll('.data-table');
  if (!tables.length) return;

  tables.forEach((table, tableIndex) => {
    const wrapper = table.closest('.table-wrapper');
    if (!wrapper) return;

    if (!wrapper.querySelector('.table-tools')) {
      const tools = document.createElement('div');
      tools.className = 'table-tools';
      const label = document.createElement('div');
      label.className = 'table-tools-label';
      label.textContent = 'Table';

      const columnsBtn = document.createElement('button');
      columnsBtn.type = 'button';
      columnsBtn.className = 'btn table-columns-btn';
      columnsBtn.textContent = 'Columns';

      const presetBtn = document.createElement('button');
      presetBtn.type = 'button';
      presetBtn.className = 'btn table-columns-btn';
      presetBtn.textContent = 'Preset';

      const menu = document.createElement('div');
      menu.className = 'table-columns-menu';
      const ths = Array.from(table.querySelectorAll('thead th'));
      ths.forEach((th, idx) => {
        const item = document.createElement('label');
        item.className = 'table-column-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.colIndex = idx;
        checkbox.addEventListener('change', (e) => {
          const col = Number(e.target.dataset.colIndex);
          const display = e.target.checked ? '' : 'none';
          table.querySelectorAll('tr').forEach(row => {
            if (row.children[col]) row.children[col].style.display = display;
          });
        });
        const text = document.createElement('span');
        text.textContent = th.textContent.trim() || `Column ${idx + 1}`;
        item.appendChild(checkbox);
        item.appendChild(text);
        menu.appendChild(item);
      });

      const presetMenu = document.createElement('div');
      presetMenu.className = 'table-columns-menu';
      presetMenu.innerHTML = `
        <button type="button" data-preset="all">All Columns</button>
        <button type="button" data-preset="compact">Compact View</button>
      `;

      columnsBtn.addEventListener('click', () => {
        menu.classList.toggle('open');
        presetMenu.classList.remove('open');
      });

      presetBtn.addEventListener('click', () => {
        presetMenu.classList.toggle('open');
        menu.classList.remove('open');
      });

      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== columnsBtn) {
          menu.classList.remove('open');
        }
        if (!presetMenu.contains(e.target) && e.target !== presetBtn) {
          presetMenu.classList.remove('open');
        }
      });

      presetMenu.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        if (!preset) return;
        const compactMax = 4;
        table.querySelectorAll('thead th').forEach((_, col) => {
          const show = preset === 'all' ? true : col < compactMax;
          table.querySelectorAll('tr').forEach(row => {
            if (row.children[col]) row.children[col].style.display = show ? '' : 'none';
          });
          const checkbox = menu.querySelector(`input[data-col-index="${col}"]`);
          if (checkbox) checkbox.checked = show;
        });
        localStorage.setItem(`tablePreset:${table.id || tableIndex}`, preset);
        presetMenu.classList.remove('open');
      });

      tools.appendChild(label);
      tools.appendChild(columnsBtn);
      tools.appendChild(presetBtn);
      tools.appendChild(menu);
      tools.appendChild(presetMenu);
      wrapper.insertBefore(tools, wrapper.firstChild);
    }

    const headers = table.querySelectorAll('thead th');
    headers.forEach((th, idx) => {
      if (th.dataset.sortable === 'false') return;
      th.classList.add('sortable');
      th.addEventListener('click', () => {
        const direction = th.dataset.sortDir === 'asc' ? 'desc' : 'asc';
        headers.forEach(h => h.removeAttribute('data-sort-dir'));
        th.dataset.sortDir = direction;

        const rows = Array.from(table.tBodies[0]?.rows || []);
        const getCellValue = (row) => {
          const cell = row.cells[idx];
          return cell ? cell.textContent.trim() : '';
        };
        const parseValue = (val) => {
          const num = Number(val.replace(/[^0-9.-]+/g, ''));
          if (!Number.isNaN(num) && /[0-9]/.test(val)) return num;
          return val.toLowerCase();
        };

        rows.sort((a, b) => {
          const aVal = parseValue(getCellValue(a));
          const bVal = parseValue(getCellValue(b));
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
          return 0;
        });

        rows.forEach(row => table.tBodies[0].appendChild(row));
      });
    });

    if (!table.id) table.id = `dataTable-${tableIndex}`;
    const preset = localStorage.getItem(`tablePreset:${table.id}`) || '';
    if (preset) {
      const compactMax = 4;
      table.querySelectorAll('thead th').forEach((_, col) => {
        const show = preset === 'all' ? true : col < compactMax;
        table.querySelectorAll('tr').forEach(row => {
          if (row.children[col]) row.children[col].style.display = show ? '' : 'none';
        });
        const checkbox = wrapper.querySelector(`input[data-col-index="${col}"]`);
        if (checkbox) checkbox.checked = show;
      });
    }
  });
}

const FILTERS_KEY = 'quickFilters';

function getSectionTags(section) {
  const tags = new Set();
  if (section.id) {
    tags.add(section.id.toLowerCase());
  }
  const headerText = section.querySelector('h2, h3');
  if (headerText) {
    headerText.textContent
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .forEach(t => tags.add(t));
  }
  return Array.from(tags);
}

function applySectionFilter(selectedTags = []) {
  const sections = document.querySelectorAll('.dashboard-content > section');
  if (!sections.length) return;
  if (!selectedTags.length) {
    sections.forEach(s => s.style.display = '');
    return;
  }
  sections.forEach(section => {
    const tags = section.dataset.filterTags ? section.dataset.filterTags.split(',') : getSectionTags(section);
    section.dataset.filterTags = tags.join(',');
    const match = tags.some(tag => selectedTags.includes(tag));
    section.style.display = match ? '' : 'none';
  });
}

function initQuickFiltersBar() {
  const content = document.querySelector('.dashboard-content');
  if (!content || content.querySelector('.quick-filters')) return;
  const bar = document.createElement('div');
  bar.className = 'quick-filters';
  bar.innerHTML = `
    <span class="quick-filters-label">Quick Filters</span>
    <div class="chip-group" data-filter-group></div>
    <div class="chip-group" data-saved-group></div>
    <button class="chip chip-save" type="button" data-save-filter>Save Filter</button>
  `;
  content.insertBefore(bar, content.firstChild);

  const filterGroup = bar.querySelector('[data-filter-group]');
  const savedGroup = bar.querySelector('[data-saved-group]');
  const saveBtn = bar.querySelector('[data-save-filter]');

  const defaultFilters = ['All', 'Overview', 'Listings', 'Offers', 'Orders', 'Analytics', 'Notifications', 'Settings'];
  const selected = new Set();

  function renderChips() {
    filterGroup.innerHTML = defaultFilters.map(label => `<span class="chip" data-filter="${label.toLowerCase()}">${label}</span>`).join('');
    filterGroup.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.filter;
        if (key === 'all') {
          selected.clear();
        } else {
          if (selected.has(key)) selected.delete(key);
          else selected.add(key);
        }
        filterGroup.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', selected.has(c.dataset.filter)));
        applySectionFilter(Array.from(selected));
      });
    });
  }

  function renderSaved() {
    const saved = JSON.parse(localStorage.getItem(FILTERS_KEY) || '[]');
    savedGroup.innerHTML = saved.map(s => `<span class="chip" data-saved='${JSON.stringify(s)}'>${s.name}</span>`).join('');
    savedGroup.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const data = JSON.parse(chip.dataset.saved);
        selected.clear();
        (data.tags || []).forEach(t => selected.add(t));
        filterGroup.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', selected.has(c.dataset.filter)));
        applySectionFilter(Array.from(selected));
      });
    });
  }

  saveBtn.addEventListener('click', async () => {
    if (typeof window.farmaPrompt !== 'function') return;
    const name = await window.farmaPrompt('Save filter as:', { defaultValue: '' });
    if (!name) return;
    const saved = JSON.parse(localStorage.getItem(FILTERS_KEY) || '[]');
    saved.push({ name, tags: Array.from(selected) });
    localStorage.setItem(FILTERS_KEY, JSON.stringify(saved));
    renderSaved();
  });

  renderChips();
  renderSaved();
}

function initSparklines() {
  const statCards = document.querySelectorAll('.stat-card');
  if (!statCards.length) return;
  const charts = Array.from(document.querySelectorAll('canvas')).map(c => c.__chart).filter(Boolean);
  const dataset = charts.find(c => c.data && c.data.datasets && c.data.datasets.length)?.data?.datasets?.[0]?.data;
  const values = Array.isArray(dataset) ? dataset.slice(-12) : [4, 8, 6, 10, 7, 12, 9, 11];

  statCards.forEach(card => {
    if (card.querySelector('canvas.sparkline')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'sparkline';
    canvas.width = 120;
    canvas.height = 36;
    card.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const pad = 4;
    const span = max - min || 1;
    ctx.strokeStyle = 'rgba(90, 209, 151, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad + (i / (values.length - 1)) * (canvas.width - pad * 2);
      const y = canvas.height - pad - ((v - min) / span) * (canvas.height - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function initNonBlockingAlerts() {
  if (typeof window === 'undefined') return;
  if (window.__farmaAlertPatched) return;
  window.__farmaAlertPatched = true;
  window.__nativeAlert = window.alert ? window.alert.bind(window) : null;
  window.__nativeConfirm = window.confirm ? window.confirm.bind(window) : null;
  window.__nativePrompt = window.prompt ? window.prompt.bind(window) : null;
  if (shouldUseNativeDialogs()) {
    window.alert = window.__nativeAlert;
    window.confirm = window.__nativeConfirm;
    window.prompt = window.__nativePrompt;
    return;
  }
  window.__farmaAlertQueue = Promise.resolve();
  window.alert = (message) => {
    const runAlert = () => farmaAlert(message);
    window.__farmaAlertQueue = window.__farmaAlertQueue.then(runAlert, runAlert);
    return window.__farmaAlertQueue;
  };
}

function initImageFallbacks() {
  if (typeof window === 'undefined') return;
  if (window.__farmaImageFallbackBound) return;
  window.__farmaImageFallbackBound = true;
  document.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (!target.hasAttribute('data-fallback-image')) return;
    if (target.dataset.fallbackApplied === '1') return;
    target.dataset.fallbackApplied = '1';
    if (typeof getDefaultProductImage === 'function') {
      target.src = getDefaultProductImage();
    }
  }, true);
}

window.farmaAlert = farmaAlert;
window.farmaConfirm = farmaConfirm;
window.farmaPrompt = farmaPrompt;
window.openDialog = openDialog;
window.closeDialog = closeDialog;
window.renderCombobox = renderCombobox;
window.renderErrorSummary = renderErrorSummary;

window.addEventListener('DOMContentLoaded', () => {
  initNonBlockingAlerts();
  initImageFallbacks();
  applyFeatureFlags();
  initBackToTop();
  initScrollSpy();
  initSectionReveal();
  initRealtimeConnectionChip();
  initDensityToggle();
  initUnitToggle();
  if (isUiFlagEnabled('UI_POWER_TOOLS', false)) {
    initTableEnhancements();
    initQuickFiltersBar();
    initSparklines();
  }
  initUiTaskTracking();
  initPremiumAnimations();
});

function initPremiumAnimations() {
  if (typeof anime === 'undefined') return;

  // Initial entrance for main sections
  anime({
    targets: '.dashboard-content > section',
    translateY: [20, 0],
    opacity: [0, 1],
    delay: anime.stagger(100),
    easing: 'easeOutExpo',
    duration: 800
  });

  // Observe and animate dynamic cards when they appear
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          const targetCards = node.querySelectorAll('.listing-card, .stat-card, .notif-panel-item');
          if (targetCards.length > 0) {
            anime({
              targets: targetCards,
              translateY: [10, 0],
              opacity: [0, 1],
              delay: anime.stagger(50),
              easing: 'easeOutQuad',
              duration: 400
            });
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function animateNumber(id, endValue, duration = 1500) {
  const el = document.getElementById(id);
  if (!el || typeof anime === 'undefined') return;

  const obj = { value: 0 };
  const isCurrency = el.textContent.includes('₹') || el.id.toLowerCase().includes('price') || el.id.toLowerCase().includes('commission');
  const isKg = el.textContent.toLowerCase().includes('kg');

  anime({
    targets: obj,
    value: endValue,
    round: 1,
    easing: 'easeOutExpo',
    duration: duration,
    update: function () {
      let val = obj.value.toLocaleString('en-IN');
      if (isCurrency) val = '₹' + val;
      if (isKg) val = val + ' kg';
      el.textContent = val;
    }
  });
}

window.animateNumber = animateNumber;

window.addEventListener('farmaLanguageChanged', () => {
  const current = document.body.getAttribute('data-density') || 'comfortable';
  updateDensityToggle(current);
});

window.addEventListener('farmaFeatureFlagsChanged', () => {
  applyFeatureFlags();
});
