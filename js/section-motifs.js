/**
 * Section adipocyte cluster layer + shared ambient SVG marks
 * ───────────────────────────────────────────────────────────
 * Clusters → `.section-adipocyte-layer` (css/styles.css)
 * Shared corner SVGs → `.section-ambient-motif` on #about + footer
 * Disable entirely → MOTIF_CONFIG.enabled = false
 */
export const MOTIF_CONFIG = {
    enabled: true,
    /** Sections that receive adipocyte clusters */
    sectionSelectors: [
        '#why',
        '#glp1',
        '#results',
        '#providers .providers-section-motif',
        '.gallery-page-section',
        '#about .section-ambient-motif',
        'footer .section-ambient-motif',
    ],
    /** Sections that receive the shared corner SVG pair (same markup in both) */
    ambientShellHosts: ['#about', 'footer'],
    /** Cluster count range per section (before spacing rejects extras) */
    count: { min: 4, max: 6, reducedMotionMax: 3 },
    minDistance: 0.17,
    maxPlacementAttempts: 24,
    opacity: { min: 0.28, max: 0.52 },
    rotate: { min: -22, max: 22 },
    sizeRem: {
        single: { min: 3.5, max: 6.5 },
        double: { min: 5, max: 8.5 },
        triple: { min: 6.5, max: 10.5 },
    },
    /** Per-section cluster count overrides (key matches sectionKey) */
    countOverrides: {
        about: { min: 1, max: 2, reducedMotionMax: 1 },
        footer: { min: 2, max: 4, reducedMotionMax: 2 },
    },
};

const AMBIENT_CLASS = 'pointer-events-none absolute z-0 text-flame/[0.18]';
const AMBIENT_LEFT_CLASS = `${AMBIENT_CLASS} left-6 top-10 h-[min(46vw,19rem)] w-[min(46vw,19rem)]`;
const AMBIENT_RIGHT_CLASS = `${AMBIENT_CLASS} right-6 bottom-10 h-[min(46vw,19rem)] w-[min(46vw,19rem)]`;

/** Corner marks — about: top-left only; footer: bottom-right only */
function getSharedAmbientMarkup(hostKey) {
    const left = `
        <svg aria-hidden="true" class="${AMBIENT_LEFT_CLASS}" viewBox="0 0 220 220" fill="none">
            <circle cx="102" cy="118" r="80" stroke="currentColor" stroke-width="2.2"></circle>
            <circle cx="102" cy="118" r="44" stroke="currentColor" stroke-width="1.8" opacity="0.88"></circle>
            <circle cx="68" cy="132" r="16" fill="currentColor" opacity="0.5"></circle>
            <circle cx="148" cy="58" r="28" stroke="currentColor" stroke-width="2" opacity="0.78"></circle>
            <path d="M36 68h14M43 61v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
            <path d="M154 168h18M163 159v18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity="0.9"></path>
            <circle cx="178" cy="128" r="9" stroke="currentColor" stroke-width="1.8" opacity="0.9"></circle>
        </svg>`;

    const right = `
        <svg aria-hidden="true" class="${AMBIENT_RIGHT_CLASS}" viewBox="0 0 220 220" fill="none">
            <circle cx="114" cy="106" r="86" stroke="currentColor" stroke-width="2.2"></circle>
            <circle cx="114" cy="106" r="58" stroke="currentColor" stroke-width="1.7" opacity="0.82"></circle>
            <circle cx="78" cy="72" r="14" fill="currentColor" opacity="0.46"></circle>
            <circle cx="156" cy="154" r="20" stroke="currentColor" stroke-width="2" opacity="0.84"></circle>
            <path d="M48 172h12M54 166v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
            <path d="M168 46h16M176 38v16" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" opacity="0.92"></path>
            <circle cx="132" cy="44" r="12" stroke="currentColor" stroke-width="2" opacity="0.88"></circle>
        </svg>`;

    if (hostKey === 'about') return left;
    if (hostKey === 'footer') return right;
    return left + right;
}

const CLUSTER_FILES = [
    '1-cell-center.svg',
    '1-cell-corner.svg',
    '1-cell-lower.svg',
    '1-cell-upper.svg',
    '2-cells-adjacent.svg',
    '2-cells-diagonal.svg',
    '2-cells-horizontal.svg',
    '3-cells-row.svg',
    '3-cells-triangle.svg',
    '3-cells-triangle-up.svg',
];

const PLACEMENT_ZONES = [
    { id: 'top-left', x: [0.04, 0.28], y: [0.06, 0.34] },
    { id: 'top-right', x: [0.72, 0.96], y: [0.06, 0.34] },
    { id: 'bottom-left', x: [0.04, 0.28], y: [0.66, 0.94] },
    { id: 'bottom-right', x: [0.72, 0.96], y: [0.66, 0.94] },
    { id: 'mid-left', x: [0, 0.14], y: [0.32, 0.68] },
    { id: 'mid-right', x: [0.86, 1], y: [0.32, 0.68] },
];

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function createSeededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function clusterSizeRem(file, rand) {
    const { sizeRem } = MOTIF_CONFIG;
    if (file.startsWith('3-cells')) {
        return sizeRem.triple.min + rand() * (sizeRem.triple.max - sizeRem.triple.min);
    }
    if (file.startsWith('2-cells')) {
        return sizeRem.double.min + rand() * (sizeRem.double.max - sizeRem.double.min);
    }
    return sizeRem.single.min + rand() * (sizeRem.single.max - sizeRem.single.min);
}

function pickClusterFile(rand) {
    return CLUSTER_FILES[Math.floor(rand() * CLUSTER_FILES.length)];
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function isTooClose(candidate, placed) {
    const sizeBuffer = ((candidate.sizeRem + (placed.sizeRem || 0)) / 100) * 0.35;
    return placed.some((p) => distance(candidate, p) < MOTIF_CONFIG.minDistance + sizeBuffer);
}

function randomPointInZone(zone, rand) {
    return {
        x: zone.x[0] + rand() * (zone.x[1] - zone.x[0]),
        y: zone.y[0] + rand() * (zone.y[1] - zone.y[0]),
    };
}

function tryPlaceCluster(placed, rand, zone = null) {
    const file = pickClusterFile(rand);
    const sizeRem = clusterSizeRem(file, rand);
    const { opacity, rotate, maxPlacementAttempts } = MOTIF_CONFIG;

    for (let attempt = 0; attempt < maxPlacementAttempts; attempt += 1) {
        const targetZone = zone ?? PLACEMENT_ZONES[Math.floor(rand() * PLACEMENT_ZONES.length)];
        const point = randomPointInZone(targetZone, rand);
        const candidate = {
            ...point,
            file,
            sizeRem,
            rotate: rotate.min + rand() * (rotate.max - rotate.min),
            opacity: opacity.min + rand() * (opacity.max - opacity.min),
            zIndex: Math.floor(rand() * 3),
        };

        if (!isTooClose(candidate, placed)) {
            return candidate;
        }
    }

    return null;
}

function shuffleZones(rand) {
    const zones = [...PLACEMENT_ZONES];
    for (let i = zones.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [zones[i], zones[j]] = [zones[j], zones[i]];
    }
    return zones;
}

function resolveCountConfig(sectionKey) {
    return MOTIF_CONFIG.countOverrides[sectionKey] ?? MOTIF_CONFIG.count;
}

function buildClusterLayout(sectionKey) {
    const rand = createSeededRandom(hashString(sectionKey));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = resolveCountConfig(sectionKey);
    const targetCount = reducedMotion
        ? count.reducedMotionMax
        : count.min + Math.floor(rand() * (count.max - count.min + 1));

    const placed = [];

    for (const zone of shuffleZones(rand)) {
        if (placed.length >= targetCount) break;
        const cluster = tryPlaceCluster(placed, rand, zone);
        if (cluster) placed.push(cluster);
    }

    while (placed.length < targetCount) {
        const cluster = tryPlaceCluster(placed, rand);
        if (!cluster) break;
        placed.push(cluster);
    }

    if (reducedMotion) {
        placed.forEach((cluster) => { cluster.rotate = 0; });
    }

    return placed;
}

function findClusterInsertPoint(container) {
    const svgs = container.querySelectorAll(':scope > svg.pointer-events-none, :scope > svg[aria-hidden="true"]');
    if (svgs.length) {
        return svgs[svgs.length - 1].nextSibling;
    }
    return container.firstChild;
}

function createClusterElement(cluster) {
    const img = document.createElement('img');
    img.className = 'section-adipocyte-cluster';
    img.src = new URL(`../images/adipocyte-clusters/${cluster.file}`, import.meta.url).href;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.draggable = false;
    img.style.setProperty('--cluster-x', `${(cluster.x * 100).toFixed(2)}%`);
    img.style.setProperty('--cluster-y', `${(cluster.y * 100).toFixed(2)}%`);
    img.style.setProperty('--cluster-w', `${cluster.sizeRem.toFixed(2)}rem`);
    img.style.setProperty('--cluster-rotate', `${cluster.rotate.toFixed(1)}deg`);
    img.style.setProperty('--cluster-opacity', cluster.opacity.toFixed(3));
    img.style.setProperty('--cluster-z', String(cluster.zIndex));
    return img;
}

function ensureAmbientMotifShell(host, sectionKey) {
    let shell = host.querySelector(':scope > .section-ambient-motif');
    if (shell) return shell;

    shell = document.createElement('div');
    shell.className = 'section-ambient-motif pointer-events-none absolute inset-0 z-0 overflow-hidden';
    shell.dataset.motifKey = sectionKey;
    shell.innerHTML = getSharedAmbientMarkup(sectionKey);

    if (host.tagName === 'FOOTER') {
        const gradient = host.querySelector(':scope > [aria-hidden]');
        if (gradient?.nextSibling) {
            host.insertBefore(shell, gradient.nextSibling);
        } else {
            host.appendChild(shell);
        }
    } else {
        host.prepend(shell);
    }

    return shell;
}

function decorateSection(container, sectionKey) {
    if (container.querySelector('.section-adipocyte-layer')) return;

    const layout = buildClusterLayout(sectionKey);
    if (!layout.length) return;

    const layer = document.createElement('div');
    layer.className = 'section-adipocyte-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.dataset.motifLayer = 'adipocyte-clusters';

    layout.forEach((cluster) => {
        layer.appendChild(createClusterElement(cluster));
    });

    container.insertBefore(layer, findClusterInsertPoint(container));
}

function sectionKeyFor(el, selector) {
    return el.dataset.motifKey || el.id || selector;
}

export function initSectionMotifs() {
    if (!MOTIF_CONFIG.enabled) return;

    MOTIF_CONFIG.ambientShellHosts.forEach((selector) => {
        document.querySelectorAll(selector).forEach((host) => {
            ensureAmbientMotifShell(host, sectionKeyFor(host, selector));
        });
    });

    MOTIF_CONFIG.sectionSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
            decorateSection(el, sectionKeyFor(el, selector));
        });
    });
}
