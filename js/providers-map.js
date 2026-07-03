/**
 * Provider directory map—vanilla JS port of MapDirectory.tsx
 */
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const COPY = {
  lipodermaPage: "Lipoderma page",
  practiceSite:  "Practice site",
  callNow:       "Call now",
  emptyTitle:    "No providers found.",
  emptyBody:     "Try searching by state, city, specialty, or clearing the filter to see the full provider network.",
  locationSuggestionsEyebrow: "Choose a location to sort by nearest provider",
  useLocation:   "Use my location",
  locating:      "Locating...",
  nearestFirst:  "Nearest first",
  mapLoading:    "Loading map…",
  mapLazy:       "Map loads when you scroll here",
};

export function websiteHasLipodermaPage(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.includes("lipoderma") || path.includes("allograft-fat");
  } catch {
    return /lipoderma|allograft-fat/i.test(url);
  }
}

function distanceInMiles(a, b) {
  const toRadians = d => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let leafletPromise = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

function createPinIcon(L, highlight) {
  const fill = highlight ? "#fd893c" : "#233051";
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="${fill}" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C7 0 3 4 3 9c0 6.6 9 15 9 15s9-8.4 9-15c0-5-4-9-9-9zm0 12.5A3.5 3.5 0 1 1 12 5.5a3.5 3.5 0 0 1 0 7z"/></svg>`,
  });
}

function matchesQuery(provider, normalized) {
  if (!normalized) return true;
  return [
    provider.doctor,
    provider.practice,
    provider.city,
    provider.state,
    provider.zip,
    ...(provider.specialties || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function getSortOrigin(state) {
  if (state.selectedOrigin) return state.selectedOrigin;
  if (state.userLocation) return state.userLocation;
  const query = state.query.trim();
  if (query.length >= 2 && state.locationSuggestions.length > 0) {
    return state.locationSuggestions[0];
  }
  return null;
}

function getVisibleProviders(allProviders, query, origin) {
  const normalized = query.trim().toLowerCase();
  const providers = origin
    ? allProviders
    : allProviders.filter(p => matchesQuery(p, normalized));
  if (!origin) return providers;
  return [...providers].sort(
    (a, b) => distanceInMiles(origin, a) - distanceInMiles(origin, b)
  );
}

function buildStatusText(state) {
  const implicitOrigin =
    !state.selectedOrigin &&
    !state.userLocation &&
    state.query.trim().length >= 2 &&
    state.locationSuggestions[0];
  const origin = state.selectedOrigin ?? state.userLocation ?? implicitOrigin;

  let text = "";
  if (state.selectedOrigin) {
    text = `Sorted by distance from ${state.selectedOrigin.label}.`;
  } else if (state.userLocation) {
    text = "Sorted by distance from your location.";
  } else if (implicitOrigin) {
    text = `Showing nearest providers to ${implicitOrigin.label}.`;
  } else if (state.suggestionStatus === "loading") {
    text = "Looking for matching locations.";
  } else if (state.suggestionStatus === "empty" && state.query.trim().length >= 2) {
    text = "Choose a suggested location when available to sort by distance.";
  }
  if (state.locationStatus === "blocked") {
    text += `${text ? " " : ""}Location access is off; search still works by provider, practice, city, state, or specialty.`;
  }
  return text;
}

function renderProviderItem(provider, activeId) {
  const isActive = provider.id === activeId;
  const websiteLabel = websiteHasLipodermaPage(provider.website)
    ? COPY.lipodermaPage
    : COPY.practiceSite;

  return `
    <div
      id="provider-${escapeHtml(provider.id)}"
      class="provider-list-item cursor-pointer p-5 transition-colors ${isActive ? "bg-sand/50" : "hover:bg-cream"}"
      data-provider-id="${escapeHtml(provider.id)}"
      role="button"
      tabindex="0"
    >
      <div>
        <h3 class="font-display text-lg leading-snug">${escapeHtml(provider.doctor)}</h3>
        <p class="text-sm text-ink-soft">${escapeHtml(provider.practice)}</p>
        <p class="mt-1 text-sm text-ink-soft">
          ${escapeHtml(provider.city)}, ${escapeHtml(provider.state)} ·
          <a href="tel:${escapeHtml(provider.phone)}" class="provider-phone font-medium text-bronze-deep hover:underline">${escapeHtml(provider.phone)}</a>
        </p>
      </div>
      <div class="mt-3 flex gap-2">
        <a href="tel:${escapeHtml(provider.phone)}" class="provider-phone bg-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-bronze">
          ${COPY.callNow} <span class="text-flame">→</span>
        </a>
        <a href="${escapeHtml(provider.website)}" target="_blank" rel="noopener noreferrer" class="provider-website border border-ink/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:border-flame hover:text-flame">
          ${websiteLabel}
        </a>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="p-8">
      <p class="font-display text-xl">${COPY.emptyTitle}</p>
      <p class="mt-2 text-sm leading-relaxed text-ink-soft">${COPY.emptyBody}</p>
    </div>
  `;
}

export async function initProvidersMap() {
  const section = document.getElementById("providers");
  if (!section) return;

  const searchInput  = section.querySelector("#provider-search");
  const geolocateBtn = section.querySelector("#provider-geolocate");
  const searchBar    = section.querySelector(".providers-search-bar");
  const suggestionsEl = section.querySelector("#location-suggestions");
  const statusEl     = section.querySelector("#provider-status");
  const listEl       = section.querySelector("#provider-list");
  const mapEl        = section.querySelector("#provider-map");
  const mapPanel     = section.querySelector(".providers-map-panel");

  if (!searchInput || !geolocateBtn || !suggestionsEl || !statusEl || !listEl || !mapEl || !mapPanel) {
    console.warn("providers-map: missing required DOM elements");
    return;
  }

  let allProviders = [];
  try {
    const response = await fetch(new URL("../data/providers.json", import.meta.url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allProviders = (data.providers || []).filter(p => p.verified);
  } catch (error) {
    console.error("providers-map: failed to load providers", error);
    statusEl.textContent = "Unable to load provider directory.";
    return;
  }

  const state = {
    query: searchInput.value || "",
    active: null,
    mapReady: false,
    shouldLoadMap: false,
    userLocation: null,
    selectedOrigin: null,
    locationSuggestions: [],
    suggestionStatus: "idle",
    locationStatus: "idle",
  };

  let mapInstance = null;
  const markers = {};
  let geocodeController = null;
  let geocodeTimer = null;
  let mapOverlay = null;

  function ensureMapOverlay() {
    if (mapOverlay) return mapOverlay;
    mapOverlay = document.createElement("div");
    mapOverlay.className =
      "providers-map-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-cream";
    mapOverlay.innerHTML = `<p class="microtype text-center"></p>`;
    mapPanel.appendChild(mapOverlay);
    return mapOverlay;
  }

  function updateMapOverlay() {
    const overlay = ensureMapOverlay();
    const messageEl = overlay.querySelector("p");
    if (state.mapReady) { overlay.style.display = "none"; return; }
    overlay.style.display = "flex";
    messageEl.innerHTML = `${state.shouldLoadMap ? COPY.mapLoading : COPY.mapLazy} <span class="text-flame">●</span>`;
  }

  function renderSuggestionsDropdown() {
    if (!state.locationSuggestions.length) {
      suggestionsEl.hidden = true;
      suggestionsEl.innerHTML = "";
      searchBar?.classList.remove("is-suggesting");
      return;
    }
    const items = state.locationSuggestions
      .map(s => `
        <button
          type="button"
          class="location-suggestion block w-full border-b hairline px-4 py-3 text-left text-sm font-medium text-ink transition-colors last:border-b-0 hover:bg-cream"
          data-suggestion-id="${escapeHtml(s.id)}"
        >${escapeHtml(s.label)}</button>
      `).join("");
    suggestionsEl.innerHTML = `
      <div class="border hairline bg-white shadow-lift">
        <p class="microtype border-b hairline px-4 py-2 !text-[9px]">${COPY.locationSuggestionsEyebrow}</p>
        ${items}
      </div>
    `;
    suggestionsEl.hidden = false;
    searchBar?.classList.add("is-suggesting");
  }

  function updateMarkerIcons() {
    if (!window.L) return;
    Object.entries(markers).forEach(([id, marker]) => {
      marker.setIcon(createPinIcon(window.L, id === state.active));
    });
  }

  function renderList() {
    const origin = getSortOrigin(state);
    const visible = getVisibleProviders(allProviders, state.query, origin);
    statusEl.textContent = buildStatusText(state);
    geolocateBtn.textContent =
      state.locationStatus === "loading" ? COPY.locating :
      state.locationStatus === "ready"   ? COPY.nearestFirst :
      COPY.useLocation;

    if (visible.length === 0) { listEl.innerHTML = renderEmptyState(); return; }
    listEl.innerHTML = visible.map(p => renderProviderItem(p, state.active)).join("");
    updateMarkerIcons();
  }

  function setActive(id) {
    state.active = id;
    updateMarkerIcons();
    listEl.querySelectorAll(".provider-list-item").forEach(item => {
      const isActive = item.dataset.providerId === id;
      item.classList.toggle("bg-sand/50", isActive);
      item.classList.toggle("hover:bg-cream", !isActive);
    });
  }

  function focusProvider(provider) {
    setActive(provider.id);
    if (!mapInstance) return;
    mapInstance.flyTo([provider.lat, provider.lng], 9, { duration: 0.8 });
    markers[provider.id]?.openPopup();
  }

  function chooseLocationSuggestion(suggestion) {
    state.query = suggestion.label;
    searchInput.value = suggestion.label;
    state.selectedOrigin = suggestion;
    state.userLocation = null;
    state.locationStatus = "idle";
    state.locationSuggestions = [];
    state.suggestionStatus = "idle";
    renderSuggestionsDropdown();
    renderList();
    mapInstance?.flyTo([suggestion.lat, suggestion.lng], 6, { duration: 0.8 });
  }

  function requestLocation() {
    if (!navigator.geolocation) { state.locationStatus = "blocked"; renderList(); return; }
    state.selectedOrigin = null;
    state.locationSuggestions = [];
    state.suggestionStatus = "idle";
    state.locationStatus = "loading";
    renderSuggestionsDropdown();
    renderList();
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { lat: coords.latitude, lng: coords.longitude };
        state.userLocation = location;
        state.locationStatus = "ready";
        renderList();
        mapInstance?.flyTo([location.lat, location.lng], 6, { duration: 0.8 });
      },
      () => { state.locationStatus = "blocked"; renderList(); },
      { timeout: 8000 }
    );
  }

  function scheduleGeocode(raw) {
    if (geocodeTimer) window.clearTimeout(geocodeTimer);
    if (geocodeController) geocodeController.abort();
    if (state.selectedOrigin?.label === raw) return;
    state.selectedOrigin = null;
    if (raw.length < 2) {
      state.locationSuggestions = [];
      state.suggestionStatus = "idle";
      renderSuggestionsDropdown();
      renderList();
      return;
    }
    geocodeController = new AbortController();
    const { signal } = geocodeController;
    geocodeTimer = window.setTimeout(async () => {
      state.suggestionStatus = "loading";
      renderList();
      try {
        const suggestions = [];
        const zip = raw.match(/\b\d{5}\b/)?.[0];
        if (zip) {
          const zipRes = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal });
          if (zipRes.ok) {
            const data = await zipRes.json();
            const place = data.places?.[0];
            if (place) {
              suggestions.push({
                id: `zip-${zip}`,
                lat: Number(place.latitude),
                lng: Number(place.longitude),
                label: `${place["place name"]}, ${place["state abbreviation"]} ${zip}`,
              });
            }
          }
        }
        const locRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=us,ca&limit=5&q=${encodeURIComponent(raw)}`,
          { signal }
        );
        if (locRes.ok) {
          const places = await locRes.json();
          places.forEach(place => {
            const label = place.display_name.split(",").slice(0, 4).join(",");
            if (!suggestions.some(s => s.label === label)) {
              suggestions.push({ id: `place-${place.place_id}`, lat: Number(place.lat), lng: Number(place.lon), label });
            }
          });
        }
        state.locationSuggestions = suggestions.slice(0, 5);
        state.suggestionStatus = suggestions.length > 0 ? "ready" : "empty";
      } catch {
        if (!signal.aborted) { state.locationSuggestions = []; state.suggestionStatus = "empty"; }
      }
      renderSuggestionsDropdown();
      renderList();
    }, 250);
  }

  async function initMap() {
    if (mapInstance) return;
    try {
      const L = await loadLeaflet();
      for (let i = 0; i < 40; i++) {
        if (mapEl.offsetHeight > 0 && mapEl.offsetWidth > 0) break;
        await new Promise(r => requestAnimationFrame(r));
      }
      if (mapInstance) return;
      const map = L.map(mapEl, { scrollWheelZoom: false, attributionControl: true })
        .setView([39.5, -98], 4);
      mapInstance = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      const markerGroup = L.featureGroup();
      allProviders.forEach(p => {
        const marker = L.marker([p.lat, p.lng], { icon: createPinIcon(L, false) })
          .addTo(map)
          .bindPopup(
            `<strong style="font-size:14px">${escapeHtml(p.doctor)}</strong><br/>${escapeHtml(p.practice)}<br/>${escapeHtml(p.city)}, ${escapeHtml(p.state)}<br/><a href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a>`
          );
        marker.on("click", () => {
          setActive(p.id);
          document.getElementById(`provider-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        markers[p.id] = marker;
        markerGroup.addLayer(marker);
      });
      if (markerGroup.getLayers().length > 0) {
        map.fitBounds(markerGroup.getBounds().pad(0.12));
      }
      const resize = () => map.invalidateSize({ animate: false });
      map.whenReady(() => { resize(); state.mapReady = true; updateMapOverlay(); });
      window.setTimeout(resize, 200);
      window.setTimeout(resize, 800);
      window.addEventListener("resize", resize);
      window.addEventListener("orientationchange", resize);
    } catch (error) {
      console.error("providers-map: failed to initialize map", error);
    }
  }

  function activateMapLoad() {
    if (state.shouldLoadMap) return;
    state.shouldLoadMap = true;
    updateMapOverlay();
    initMap();
  }

  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) activateMapLoad(); },
    { threshold: 0.05, rootMargin: "240px 0px 320px 0px" }
  );
  observer.observe(mapPanel);
  window.addEventListener("lipoderma:providers-target", activateMapLoad);
  activateMapLoad();

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    scheduleGeocode(state.query.trim());
    renderList();
  });

  geolocateBtn.addEventListener("click", requestLocation);

  suggestionsEl.addEventListener("click", event => {
    const button = event.target.closest(".location-suggestion");
    if (!button) return;
    const suggestion = state.locationSuggestions.find(s => s.id === button.dataset.suggestionId);
    if (suggestion) chooseLocationSuggestion(suggestion);
  });

  listEl.addEventListener("click", event => {
    if (event.target.closest(".provider-phone, .provider-website")) return;
    const item = event.target.closest(".provider-list-item");
    if (!item) return;
    const provider = allProviders.find(p => p.id === item.dataset.providerId);
    if (provider) focusProvider(provider);
  });

  listEl.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest(".provider-list-item");
    if (!item || event.target !== item) return;
    event.preventDefault();
    const provider = allProviders.find(p => p.id === item.dataset.providerId);
    if (provider) focusProvider(provider);
  });

  renderList();
  updateMapOverlay();
}
