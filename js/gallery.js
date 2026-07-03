let lightboxEl = null;
let galleryState = {
  filter: 'all',
  flatIndex: 0,
  categories: [],
  viewSide: 'before',
};

let zoomState = {
  isZoomed: false,
  panX: 50,
  panY: 50,
  startPanX: 50,
  startPanY: 50
};

function updateZoomCSS() {
  if (!lightboxEl) return;
  const stage = lightboxEl.querySelector('.results-gallery-lightbox__stage');
  const zoomBtn = document.getElementById('results-gallery-lightbox-zoom');
  
  if (zoomState.isZoomed) {
    stage.classList.add('is-zoomed');
    if (zoomBtn) zoomBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
  } else {
    stage.classList.remove('is-zoomed');
    zoomState.panX = 50;
    zoomState.panY = 50;
    if (zoomBtn) zoomBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
  }
  stage.style.setProperty('--pan-x', `${zoomState.panX}%`);
  stage.style.setProperty('--pan-y', `${zoomState.panY}%`);
}

function toggleZoom(e) {
  zoomState.isZoomed = !zoomState.isZoomed;
  if (zoomState.isZoomed && e && e.clientX !== undefined) {
    const stage = lightboxEl.querySelector('.results-gallery-lightbox__stage');
    const rect = stage.getBoundingClientRect();
    zoomState.panX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    zoomState.panY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
  }
  updateZoomCSS();
}

function totalExamples(categories) {
  return categories.reduce((n, c) => n + c.examples.length, 0);
}

function flatList(categories, filter) {
  const list = [];
  categories.forEach((cat, catIndex) => {
    if (filter !== 'all' && filter !== cat.id) return;
    cat.examples.forEach((ex, exIndex) => {
      list.push({ cat, ex, catIndex, exIndex });
    });
  });
  return list;
}

function siteBaseUrl() {
  const pathname = window.location.pathname;
  if (/\/(gallery|science)(\/|$)/.test(pathname)) {
    return new URL('../', window.location.href);
  }
  return new URL('./', window.location.href);
}

function galleryImageUrl(relativePath) {
  if (!relativePath) return null;
  return new URL(relativePath.replace(/^\//, ''), siteBaseUrl()).href;
}

function photoMarkup(ex, side, className) {
  const label = side === 'before' ? 'Before' : 'After';
  const src = galleryImageUrl(ex[side]);

  if (src) {
    return `<img class="${className}" src="${src}" alt="${label}—${ex.slug}" loading="lazy" decoding="async" draggable="false" />`;
  }

  return `<span class="results-gallery__placeholder-copy">[ cleared ${side}—${ex.slug} ]</span>`;
}

function compareMarkup(ex, variant = 'tile') {
  const mod = variant === 'lightbox' ? ' results-gallery__compare--lightbox' : '';

  function half(side) {
    const label = side === 'before' ? 'Before' : 'After';
    return `
      <div class="results-gallery__half" data-side="${side}">
        ${photoMarkup(ex, side, 'results-gallery__photo')}
        <span class="results-gallery__half-label">${label}</span>
      </div>`;
  }

  return `
    <div class="results-gallery__compare${mod}">
      ${half('before')}
      ${half('after')}
    </div>`;
}

function tileHtml(cat, ex, exIndex) {
  return `
    <article class="results-gallery__tile"
      data-cat-index="${cat._index}"
      data-ex-index="${exIndex}">
      <button type="button" class="results-gallery__open"
        aria-label="View before and after—${ex.title}">
        ${compareMarkup(ex)}
      </button>
      <div class="results-gallery__cap">
        <p class="microtype text-flame">${cat.label} · example ${exIndex + 1}</p>
        <p class="results-gallery__cap-title">${ex.title}</p>
      </div>
    </article>`;
}

function setBodyScrollLocked(locked) {
  document.documentElement.classList.toggle('results-gallery-lightbox-open', locked);
}

function currentLightboxItem() {
  const flat = flatList(galleryState.categories, galleryState.filter);
  return flat[galleryState.flatIndex] || null;
}

function renderLightboxMedia() {
  const current = currentLightboxItem();
  if (!current) return;

  document.getElementById('results-gallery-lightbox-compare').innerHTML =
    compareMarkup(current.ex, 'lightbox');
}

function goNext() {
  const flat = flatList(galleryState.categories, galleryState.filter);
  if (galleryState.flatIndex < flat.length - 1) {
    openLightbox(galleryState.flatIndex + 1, galleryState.viewSide);
  }
}

function goPrev() {
  if (galleryState.flatIndex > 0) {
    openLightbox(galleryState.flatIndex - 1, galleryState.viewSide);
  }
}

function updateLightboxCopy() {
  const current = currentLightboxItem();
  if (!current) return;
  const flat = flatList(galleryState.categories, galleryState.filter);
  const { cat, ex } = current;

  document.getElementById('results-gallery-lightbox-title').textContent = cat.label;
  document.getElementById('results-gallery-lightbox-meta').textContent =
    `${ex.title} · ${galleryState.flatIndex + 1} of ${flat.length}`;
  document.getElementById('results-gallery-lightbox-story').textContent = ex.story;
  
  const prevBtn = document.getElementById('results-gallery-lightbox-prev');
  const nextBtn = document.getElementById('results-gallery-lightbox-next');

  prevBtn.disabled = galleryState.flatIndex === 0;
  nextBtn.disabled = galleryState.flatIndex === flat.length - 1;
}

function ensureLightbox() {
  if (lightboxEl) return lightboxEl;

  lightboxEl = document.createElement('div');
  lightboxEl.id = 'results-gallery-lightbox';
  lightboxEl.className = 'results-gallery-lightbox';
  lightboxEl.setAttribute('role', 'dialog');
  lightboxEl.setAttribute('aria-modal', 'true');
  lightboxEl.setAttribute('aria-hidden', 'true');
  lightboxEl.innerHTML = `
    <div class="results-gallery-lightbox__dialog">
      <div class="results-gallery-lightbox__head">
        <div>
          <h2 class="results-gallery-lightbox__title" id="results-gallery-lightbox-title">Midface</h2>
          <p class="results-gallery-lightbox__meta" id="results-gallery-lightbox-meta"></p>
        </div>
        <div class="results-gallery-lightbox__actions">
          <button type="button" class="results-gallery-lightbox__action-btn" id="results-gallery-lightbox-zoom" aria-label="Zoom">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
          <button type="button" class="results-gallery-lightbox__action-btn results-gallery-lightbox__close" aria-label="Close">×</button>
        </div>
      </div>
      <div class="results-gallery-lightbox__stage" id="results-gallery-lightbox-compare"></div>
      <div class="results-gallery-lightbox__body">
        <p id="results-gallery-lightbox-story"></p>
        <button type="button" data-scroll-providers
          class="results-gallery-lightbox__cta group bg-ink px-8 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-bronze">
          See our providers now<span
            class="ml-3 inline-block text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
        </button>
      </div>
      <div class="results-gallery-lightbox__nav">
        <button type="button" class="results-gallery-lightbox__nav-btn" id="results-gallery-lightbox-prev">← Prev</button>
        <button type="button" class="results-gallery-lightbox__nav-btn" id="results-gallery-lightbox-next">Next →</button>
      </div>
    </div>`;

  document.body.appendChild(lightboxEl);

  lightboxEl.querySelector('.results-gallery-lightbox__close').addEventListener('click', closeLightbox);
  lightboxEl.addEventListener('click', (e) => {
    if (e.target === lightboxEl) closeLightbox();
  });

  document.getElementById('results-gallery-lightbox-zoom').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleZoom();
  });

  const stage = lightboxEl.querySelector('.results-gallery-lightbox__stage');
  
  stage.addEventListener('click', (e) => {
    if (isDragging) return;
    toggleZoom(e);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!zoomState.isZoomed || e.pointerType !== 'mouse') return;
    const rect = stage.getBoundingClientRect();
    zoomState.panX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    zoomState.panY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    stage.style.setProperty('--pan-x', `${zoomState.panX}%`);
    stage.style.setProperty('--pan-y', `${zoomState.panY}%`);
  });

  // Swipe to navigate between examples
  let swipeStartX = 0;
  let swipeStartY = 0;
  let isDragging = false;
  const dialog = lightboxEl.querySelector('.results-gallery-lightbox__dialog');
  
  dialog.addEventListener('touchstart', (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    isDragging = false;
    if (zoomState.isZoomed) {
      zoomState.startPanX = zoomState.panX;
      zoomState.startPanY = zoomState.panY;
    }
  }, { passive: true });
  
  dialog.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - swipeStartX;
    const dy = e.touches[0].clientY - swipeStartY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDragging = true;
    }
    
    if (!zoomState.isZoomed) return;
    if (e.cancelable) e.preventDefault();
    
    const rect = stage.getBoundingClientRect();
    const scale = 2.5;
    const moveFactorX = (100 / rect.width) / (scale - 1) * 1.5;
    const moveFactorY = (100 / rect.height) / (scale - 1) * 1.5;
    
    zoomState.panX = Math.max(0, Math.min(100, zoomState.startPanX - dx * moveFactorX));
    zoomState.panY = Math.max(0, Math.min(100, zoomState.startPanY - dy * moveFactorY));
    
    stage.style.setProperty('--pan-x', `${zoomState.panX}%`);
    stage.style.setProperty('--pan-y', `${zoomState.panY}%`);
  }, { passive: false });
  
  dialog.addEventListener('touchend', (e) => {
    if (zoomState.isZoomed) {
      setTimeout(() => { isDragging = false; }, 50);
      return;
    }
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    // Only trigger if clearly more horizontal than vertical, and long enough
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) {
      goNext();
    } else if (dx > 0) {
      goPrev();
    }
  }, { passive: true });

  document.getElementById('results-gallery-lightbox-prev').addEventListener('click', goPrev);
  document.getElementById('results-gallery-lightbox-next').addEventListener('click', goNext);

  document.addEventListener('keydown', onLightboxKeydown);
  window.addEventListener('resize', () => {
    if (lightboxEl && lightboxEl.classList.contains('is-open')) {
      updateLightboxCopy();
    }
  });

  return lightboxEl;
}

function onLightboxKeydown(e) {
  if (!lightboxEl?.classList.contains('is-open')) return;

  if (e.key === 'Escape') {
    closeLightbox();
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    goPrev();
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    goNext();
  }
}

function openLightbox(flatIndex, side = 'before') {
  galleryState.flatIndex = flatIndex;
  galleryState.viewSide = side;
  zoomState.isZoomed = false;
  zoomState.panX = 50;
  zoomState.panY = 50;
  ensureLightbox();
  updateZoomCSS();
  updateLightboxCopy();
  renderLightboxMedia();
  lightboxEl.classList.add('is-open');
  lightboxEl.setAttribute('aria-hidden', 'false');
  setBodyScrollLocked(true);
  lightboxEl.querySelector('.results-gallery-lightbox__close')?.focus();
}

function closeLightbox() {
  if (!lightboxEl) return;
  lightboxEl.classList.remove('is-open');
  lightboxEl.setAttribute('aria-hidden', 'true');
  setBodyScrollLocked(false);
}

function tileFlatIndex(tile) {
  const flat = flatList(galleryState.categories, galleryState.filter);
  const catIndex = Number(tile.dataset.catIndex);
  const exIndex = Number(tile.dataset.exIndex);
  return flat.findIndex((item) => item.catIndex === catIndex && item.exIndex === exIndex);
}

function openLightboxFromTile(tile, side) {
  const flatIndex = tileFlatIndex(tile);
  if (flatIndex >= 0) openLightbox(flatIndex, side);
}

function renderGallery(root, categories, filter) {
  const flat = flatList(categories, filter);
  const tabs = [
    { id: 'all', label: `All (${totalExamples(categories)})` },
    ...categories.map((c) => ({ id: c.id, label: `${c.label} (${c.examples.length})` }))
  ];

  const desc = filter === 'all'
    ? 'Browse every cleared result across all injection sites.'
    : categories.find((c) => c.id === filter)?.desc || '';

  root.innerHTML = `
    <div class="results-gallery__tabs" role="tablist">
      ${tabs.map((t) => `
        <button type="button" class="results-gallery__tab${filter === t.id ? ' is-active' : ''}"
          data-filter="${t.id}" role="tab" aria-selected="${filter === t.id}">${t.label}</button>`).join('')}
    </div>
    <p class="results-gallery__desc">${desc}</p>
    <p class="results-gallery__count">${flat.length} result${flat.length === 1 ? '' : 's'} shown</p>
    <div class="results-gallery__grid">
      ${flat.map(({ cat, ex, exIndex }) => tileHtml(cat, ex, exIndex)).join('')}
    </div>`;

  galleryState.categories = categories;
  galleryState.filter = filter;
}

export async function initResultsGallery() {
  const roots = document.querySelectorAll('[data-results-gallery]');
  if (!roots.length) return;

  let categories;
  try {
    const res = await fetch(new URL('data/gallery.json', siteBaseUrl()));
    if (!res.ok) throw new Error(`gallery.json ${res.status}`);
    const data = await res.json();
    categories = data.categories.map((cat, i) => ({ ...cat, _index: i }));
  } catch {
    roots.forEach((root) => {
      root.innerHTML = '<p class="microtype text-ink-soft/70">Unable to load results. Please refresh the page.</p>';
    });
    return;
  }

  roots.forEach((root) => {
    const urlParams = new URLSearchParams(window.location.search);
    let initialFilter = urlParams.get('filter') || 'all';
    
    // Validate filter against available categories
    const validFilters = ['all', ...categories.map(c => c.id)];
    if (!validFilters.includes(initialFilter)) {
      initialFilter = 'all';
    }

    renderGallery(root, categories, initialFilter);

    root.addEventListener('click', (e) => {
      const tab = e.target.closest('.results-gallery__tab');
      if (tab) {
        const filter = tab.dataset.filter;
        renderGallery(root, categories, filter);
        
        // Update URL to reflect the active filter without reloading
        const newUrl = new URL(window.location.href);
        if (filter === 'all') {
          newUrl.searchParams.delete('filter');
        } else {
          newUrl.searchParams.set('filter', filter);
        }
        window.history.replaceState({}, '', newUrl);
        return;
      }

      const open = e.target.closest('.results-gallery__open');
      if (open) {
        const tile = open.closest('.results-gallery__tile');
        const half = e.target.closest('.results-gallery__half');
        const side = half ? half.dataset.side : 'before';
        if (!tile) return;
        openLightboxFromTile(tile, side);
      }
    });
  });
}
