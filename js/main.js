import { initProvidersMap } from './providers-map.js';
import { initQuiz } from './quiz.js';
import { initResultsGallery } from './gallery.js?v=20260703b';
import { initSectionMotifs } from './section-motifs.js';

document.addEventListener('DOMContentLoaded', () => {

    // ── Section ambient adipocyte clusters ────────────────────────────────────
    initSectionMotifs();

    // ── Quiz ──────────────────────────────────────────────────────────────────
    initQuiz();

    // ── Async content first, then scroll reveal ───────────────────────────────
    Promise.all([
        initResultsGallery(),
        initProvidersMap(),
    ]).then(() => {
        initScrollReveal();
    });

    // ── Mobile menu toggle ────────────────────────────────────────────────────
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const mobileNav  = document.querySelector('[data-mobile-nav]');
    const iconPath   = menuToggle?.querySelector('.menu-icon-path');

    const setMenuExpanded = (expanded) => {
        if (!menuToggle || !mobileNav) return;
        menuToggle.setAttribute('aria-expanded', String(expanded));
        if (iconPath) {
            iconPath.setAttribute('d', expanded
                ? "M6 18L18 6M6 6l12 12"
                : "M4 6h16M4 12h16M4 18h16");
        }
        mobileNav.classList.toggle('is-open', expanded);
    };

    menuToggle?.addEventListener('click', () => {
        setMenuExpanded(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    // ── Smooth scroll + close menu on anchor click ────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
                if (mobileNav?.classList.contains('is-open')) {
                    setMenuExpanded(false);
                }
            }
        });
    });

    // ── "Book" / "Scroll to providers" buttons ────────────────────────────────
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-scroll-providers]');
        if (!btn) return;
        e.preventDefault();

        if (mobileNav?.classList.contains('is-open')) {
            setMenuExpanded(false);
        }

        const lightbox = document.getElementById('results-gallery-lightbox');
        if (lightbox?.classList.contains('is-open')) {
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.documentElement.classList.remove('results-gallery-lightbox-open');
        }

        const section = document.getElementById('providers');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            window.dispatchEvent(new Event('lipoderma:providers-target'));
            return;
        }

        const providersUrl = new URL('../#providers', window.location.href);
        window.location.href = providersUrl.href;
    });

});

function tagRevealElements() {
    const addReveal = (el, delayIndex = 0) => {
        if (!el || el.classList.contains('reveal')) return;
        el.classList.add('reveal');
        if (delayIndex === 1) el.classList.add('reveal-delay-1');
        if (delayIndex >= 2) el.classList.add('reveal-delay-2');
    };

    addReveal(document.querySelector('#hero-a .hero-a-mobile-copy-zone'), 0);
    addReveal(document.querySelector('#hero-a .hero-a-mobile-quiz-wrap'), 1);
    addReveal(document.querySelector('#hero-a .v2-hero-tile'), 0);
    addReveal(document.querySelector('#hero-a .hero-a-desktop-photo'), 1);

    document.querySelectorAll('main.site-main > section:not(#hero-a) > .relative.z-\\[1\\]').forEach((container) => {
        if (container.closest('#results')) {
            addReveal(container.querySelector(':scope > .mb-14'), 0);
            container.querySelectorAll(':scope > .grid article').forEach((card, i) => {
                addReveal(card, Math.min(i, 2));
            });
            return;
        }

        if (container.closest('#about')) {
            addReveal(container.querySelector(':scope > header'), 0);
            container.querySelectorAll('.about-timeline-entry').forEach((entry, i) => {
                addReveal(entry, Math.min(i % 3, 2));
            });
            return;
        }

        if (container.closest('#providers')) {
            // Keep copy and search visible; reveal only after the directory has rendered.
            addReveal(container.querySelector('.providers-directory-grid'), 0);
            return;
        }

        Array.from(container.children).forEach((child, i) => {
            addReveal(child, Math.min(i, 2));
        });
    });
}

function initScrollReveal() {
    tagRevealElements();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    revealElementsAlreadyInView();
}

function revealElementsAlreadyInView() {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) {
            el.classList.add('is-visible');
        }
    });
}
