import { initProvidersMap } from './providers-map.js?v=20261012d';
import { initQuiz } from './quiz.js?v=20260728a';
import { initResultsGallery } from './gallery.js?v=20260715f';
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

    initContactForm();

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
            window.setTimeout(() => {
                window.dispatchEvent(new Event('lipoderma:providers-target'));
            }, 900);
            return;
        }

        const providersUrl = new URL('../#providers', window.location.href);
        window.location.href = providersUrl.href;
    });

});

const LAUNCHPAD_CONTACT = 'https://www.launchpad.lipoderma.com/website-contact';
const FORMSUBMIT_CONTACT = 'https://formsubmit.co/ajax/brighterlives@britecyte.com';

function initContactForm() {
    const form = document.querySelector('[data-contact-form]');
    const success = document.querySelector('[data-form-success]');
    const error = document.querySelector('[data-form-error]');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const defaultBtnLabel = submitBtn?.textContent?.trim() || 'Send message';
    let turnstileWidgetId = null;
    let turnstilePending = null;

    function setBusy(busy) {
        const fields = form.querySelectorAll('input, textarea, select, button');
        fields.forEach((el) => { el.disabled = busy; });
        if (submitBtn) submitBtn.textContent = busy ? 'Sending…' : defaultBtnLabel;
    }

    async function launchpadSiteKey() {
        const response = await fetch(LAUNCHPAD_CONTACT, { headers: { Accept: 'application/json' } });
        if (!response.ok) return null;
        const data = await response.json().catch(() => null);
        return data?.site_key || null;
    }

    function loadTurnstile() {
        if (window.turnstile) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('turnstile'));
            document.head.appendChild(script);
        });
    }

    async function prepareTurnstile(siteKey) {
        await loadTurnstile();
        const holder = form.querySelector('[data-turnstile]');
        if (!holder || !window.turnstile) throw new Error('turnstile');
        turnstileWidgetId = window.turnstile.render(holder, {
            sitekey: siteKey,
            size: 'invisible',
            callback: (token) => turnstilePending?.resolve(token),
            'error-callback': () => turnstilePending?.reject(new Error('turnstile')),
        });
    }

    function requestTurnstileToken() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('timeout')), 20000);
            turnstilePending = {
                resolve: (token) => {
                    clearTimeout(timer);
                    resolve(token);
                },
                reject: (err) => {
                    clearTimeout(timer);
                    reject(err);
                },
            };
            window.turnstile.execute(turnstileWidgetId);
        });
    }

    async function sendThroughLaunchpad() {
        const token = await requestTurnstileToken();
        const response = await fetch(LAUNCHPAD_CONTACT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                name: form.querySelector('[name="name"]')?.value || '',
                email: form.querySelector('[name="email"]')?.value || '',
                subject: form.querySelector('[name="subject"]')?.value || '',
                message: form.querySelector('[name="message"]')?.value || '',
                company: form.querySelector('[name="company"]')?.value || '',
                turnstile_token: token,
            }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) throw new Error('Submit failed');
        if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    }

    async function sendThroughFormSubmit() {
        const subjectField = form.querySelector('[name="subject"]');
        const subjectHidden = form.querySelector('[name="_subject"]');
        if (subjectField instanceof HTMLSelectElement && subjectHidden instanceof HTMLInputElement) {
            const label = subjectField.options[subjectField.selectedIndex]?.text || 'General inquiry';
            subjectHidden.value = `Lipoderma website—${label}`;
        }

        const payload = Object.fromEntries(new FormData(form));
        delete payload.company;
        const response = await fetch(FORMSUBMIT_CONTACT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === 'false' || result?.success === false) {
            throw new Error(result?.message || 'Submit failed');
        }
    }

    const turnstileReady = launchpadSiteKey()
        .then((siteKey) => (siteKey ? prepareTurnstile(siteKey) : null))
        .catch(() => { turnstileWidgetId = null; });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (success) success.hidden = true;
        if (error) error.hidden = true;
        setBusy(true);

        try {
            await turnstileReady;
            if ((form.querySelector('[name="company"]')?.value || '').trim()) {
                form.reset();
                if (success) success.hidden = false;
                return;
            }

            if (turnstileWidgetId !== null) {
                await sendThroughLaunchpad();
            } else {
                await sendThroughFormSubmit();
            }

            form.reset();
            if (success) success.hidden = false;
        } catch {
            if (error) error.hidden = false;
        } finally {
            setBusy(false);
        }
    });
}

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

        if (container.closest('#contact')) {
            addReveal(container.querySelector('.contact-block > header'), 0);
            addReveal(container.querySelector('.contact-form'), 1);
            addReveal(container.querySelector('.contact-address'), 2);
            return;
        }

        if (container.closest('#providers')) {
            // Keep the map static; reveal only the rendered provider list.
            addReveal(container.querySelector('#provider-list'), 0);
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
