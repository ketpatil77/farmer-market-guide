/**
 * City & Crop Search UI Utilities
 * Stable searchable combobox widgets with scoped IDs and keyboard support.
 */

function safeScopeId(raw) {
  return String(raw || 'search').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function buildSearchIds(containerId, prefix) {
  const scope = safeScopeId(containerId);
  return {
    inputId: `${scope}__${prefix}Input`,
    dropdownId: `${scope}__${prefix}Dropdown`
  };
}

function setComboboxExpanded(input, dropdown, expanded) {
  if (!input || !dropdown) return;
  input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  dropdown.style.display = expanded ? 'block' : 'none';
}

function createSearchableInput(label, placeholder, onSelect, idPrefix = 'search') {
  const ids = buildSearchIds(idPrefix, 'generic');
  const container = document.createElement('div');
  const labelText = typeof t === 'function' ? t(label) : label;
  const placeholderText = typeof t === 'function' ? t(placeholder) : placeholder;
  container.className = 'search-input-wrapper';
  container.innerHTML = `
    <label class="search-label-inline" for="${ids.inputId}" data-i18n="${label}">${labelText}</label>
    <div class="search-container">
      <input
        id="${ids.inputId}"
        type="text"
        class="search-field"
        placeholder="${placeholderText}"
        data-i18n-placeholder="${placeholder}"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls="${ids.dropdownId}"
      />
      <div id="${ids.dropdownId}" class="search-dropdown" role="listbox"></div>
    </div>
  `;

  const input = container.querySelector(`#${ids.inputId}`);
  const dropdown = container.querySelector(`#${ids.dropdownId}`);
  return {
    element: container,
    input,
    dropdown,
    setOptions: () => { },
    getValue: () => input.value,
    setValue: (val) => {
      input.value = val;
    },
    onSelect
  };
}

function renderCitySearch(containerId, onCitySelect) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const ids = buildSearchIds(containerId, 'city');
  const cities = ensureCities();
  const recent = getRecentCities();

  container.innerHTML = `
    <div class="city-search-wrapper control-field">
      <label class="search-label-inline" for="${ids.inputId}"><span class="search-label-icon" aria-hidden="true">🏙️</span> <span data-i18n="City">${typeof t === 'function' ? t('City') : 'City'}</span></label>
      <div class="search-container">
        <input
          id="${ids.inputId}"
          type="text"
          class="search-field"
          placeholder="${typeof t === 'function' ? t('Search city...') : 'Search city...'}"
          data-i18n-placeholder="Search city..."
          autocomplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls="${ids.dropdownId}"
        />
        <div id="${ids.dropdownId}" class="search-dropdown" role="listbox"></div>
      </div>
    </div>
  `;

  const input = container.querySelector(`#${ids.inputId}`);
  const dropdown = container.querySelector(`#${ids.dropdownId}`);
  let activeIndex = -1;

  function renderOptions(filter = '') {
    const filtered = cities.filter((c) => c.toLowerCase().includes(filter.toLowerCase()));
    const sorted = [...recent.filter((r) => filtered.includes(r)), ...filtered.filter((c) => !recent.includes(c))];

    if (!sorted.length) {
      dropdown.innerHTML = `<div class="search-empty" data-i18n="No city found">${typeof t === 'function' ? t('No city found') : 'No city found'}</div>`;
      activeIndex = -1;
      setComboboxExpanded(input, dropdown, true);
      return;
    }

    dropdown.innerHTML = sorted
      .map((city, idx) => {
        const isRecent = recent.includes(city);
        return `<button type="button" class="search-option" role="option" data-city="${city}" data-option-index="${idx}" aria-selected="false">
          <span>${city}</span>
          ${isRecent ? `<span class="search-recent" data-i18n="Recent">⭐ ${typeof t === 'function' ? t('Recent') : 'Recent'}</span>` : ''}
        </button>`;
      })
      .join('');
    activeIndex = -1;
    setComboboxExpanded(input, dropdown, true);
  }

  function applyActiveOption(idx) {
    const options = Array.from(dropdown.querySelectorAll('[data-option-index]'));
    options.forEach((opt, i) => {
      const isActive = i === idx;
      opt.classList.toggle('is-active', isActive);
      opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    activeIndex = idx;
  }

  function selectCity(city) {
    input.value = city;
    setComboboxExpanded(input, dropdown, false);
    trackRecentCity(city);
    if (onCitySelect) onCitySelect(city);
  }

  input.addEventListener('focus', () => renderOptions(input.value));
  input.addEventListener('input', (e) => renderOptions(e.target.value));
  input.addEventListener('keydown', (e) => {
    const options = Array.from(dropdown.querySelectorAll('[data-option-index]'));
    if (!options.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(options.length - 1, activeIndex + 1);
      applyActiveOption(next);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(0, activeIndex - 1);
      applyActiveOption(next);
      return;
    }
    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const city = options[activeIndex]?.getAttribute('data-city');
      if (city) selectCity(city);
      return;
    }
    if (e.key === 'Escape') {
      setComboboxExpanded(input, dropdown, false);
    }
  });

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('[data-city]');
    if (!item) return;
    const city = item.getAttribute('data-city');
    selectCity(city);
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      setComboboxExpanded(input, dropdown, false);
    }
  });

  return { input, dropdown, container };
}

function renderCropSearch(containerId, onCropSelect, categoryFilter = null) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const ids = buildSearchIds(containerId, 'crop');
  const crops = getCrops();
  const recent = getRecentCrops();
  const categories = [...new Set(crops.map((c) => c.category))].sort();

  container.innerHTML = `
    <div class="crop-search-wrapper control-field">
      <label class="search-label-inline" for="${ids.inputId}"><span class="search-label-icon" aria-hidden="true">🌾</span> <span data-i18n="Crop">${typeof t === 'function' ? t('Crop') : 'Crop'}</span></label>
      ${categoryFilter !== false
      ? `<div class="crop-categories">
        ${categories
        .map(
          (cat) =>
            `<button type="button" class="category-chip" data-category="${cat}" data-i18n="${cat}">${typeof t === 'function' ? t(cat) : cat}</button>`
        )
        .join('')}
      </div>`
      : ''
    }
      <div class="search-container with-gap">
        <input
          id="${ids.inputId}"
          type="text"
          class="search-field"
          placeholder="${typeof t === 'function' ? t('Search crop (English or मराठी)...') : 'Search crop (English or मराठी)...'}"
          data-i18n-placeholder="Search crop (English or मराठी)..."
          autocomplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls="${ids.dropdownId}"
        />
        <div id="${ids.dropdownId}" class="search-dropdown" role="listbox"></div>
      </div>
    </div>
  `;

  const input = container.querySelector(`#${ids.inputId}`);
  const dropdown = container.querySelector(`#${ids.dropdownId}`);
  let activeCategory = null;
  let activeIndex = -1;

  function renderOptions(filter = '', category = null) {
    const filtered = crops.filter((c) => {
      const matchText = c.english.toLowerCase().includes(filter.toLowerCase()) || c.marathi.includes(filter);
      const matchCategory = !category || c.category === category;
      return matchText && matchCategory;
    });

    const sorted = [
      ...recent.filter((r) => filtered.some((f) => f.english === r)).map((r) => crops.find((c) => c.english === r)),
      ...filtered.filter((f) => !recent.includes(f.english))
    ].filter(Boolean);

    if (!sorted.length) {
      dropdown.innerHTML = `<div class="search-empty" data-i18n="No crop found">${typeof t === 'function' ? t('No crop found') : 'No crop found'}</div>`;
      activeIndex = -1;
      setComboboxExpanded(input, dropdown, true);
      return;
    }

    dropdown.innerHTML = sorted
      .map((crop, idx) => {
        const isRecent = recent.includes(crop.english);
        const displayText = `${crop.english} (${crop.marathi})`;

        return `<button type="button" class="search-option" role="option" data-crop-english="${crop.english}" data-option-index="${idx}" aria-selected="false">
          <div class="search-option-content">
            <div class="search-option-title">${displayText}</div>
            <div class="search-option-meta">${crop.category}</div>
          </div>
          ${isRecent ? '<span class="search-recent">⭐</span>' : ''}
        </button>`;
      })
      .join('');

    activeIndex = -1;
    setComboboxExpanded(input, dropdown, true);
  }

  function applyActiveOption(idx) {
    const options = Array.from(dropdown.querySelectorAll('[data-option-index]'));
    options.forEach((opt, i) => {
      const isActive = i === idx;
      opt.classList.toggle('is-active', isActive);
      opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    activeIndex = idx;
  }

  function selectCrop(cropName) {
    input.value = cropName;
    setComboboxExpanded(input, dropdown, false);
    trackRecentCrop(cropName);
    if (onCropSelect) onCropSelect(cropName);
  }

  input.addEventListener('focus', () => renderOptions(input.value, activeCategory));
  input.addEventListener('input', (e) => renderOptions(e.target.value, activeCategory));
  input.addEventListener('keydown', (e) => {
    const options = Array.from(dropdown.querySelectorAll('[data-option-index]'));
    if (!options.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(options.length - 1, activeIndex + 1);
      applyActiveOption(next);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(0, activeIndex - 1);
      applyActiveOption(next);
      return;
    }
    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const crop = options[activeIndex]?.getAttribute('data-crop-english');
      if (crop) selectCrop(crop);
      return;
    }
    if (e.key === 'Escape') {
      setComboboxExpanded(input, dropdown, false);
    }
  });

  const categoryBtns = container.querySelectorAll('.category-chip');
  categoryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach((chip) => {
        chip.classList.remove('active');
      });
      const cat = btn.getAttribute('data-category');
      if (activeCategory === cat) {
        activeCategory = null;
      } else {
        activeCategory = cat;
        btn.classList.add('active');
      }
      renderOptions(input.value, activeCategory);
    });
  });

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('[data-crop-english]');
    if (!item) return;
    const cropName = item.getAttribute('data-crop-english');
    selectCrop(cropName);
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      setComboboxExpanded(input, dropdown, false);
    }
  });

  return { input, dropdown, container };
}

function getCropInfo(cropName) {
  const crops = getCrops();
  return crops.find((c) => c.english === cropName) || null;
}

function renderCropWithMarathi(cropName) {
  const crop = getCropInfo(cropName);
  if (!crop) return cropName;
  return `${crop.english} (${crop.marathi})`;
}

function getCropCategory(cropName) {
  const crop = getCropInfo(cropName);
  if (!crop) return 'Unknown';
  return crop.category;
}
