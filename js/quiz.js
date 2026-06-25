const STEPS = [
    {
        id: "restore",
        eyebrow: "Step 1 of 2",
        title: "What can Lipoderma restore for you?",
        subtitle: "Pick the option closest to your goal.",
        options: [
            "I'm noticing changes after GLP-1 weight loss",
            "I want to restore volume in my face or hands",
            "I'm looking for a natural alternative to fillers",
            "I'm here to learn more about Lipoderma",
        ]
    },
    {
        id: "timeline",
        eyebrow: "Step 2 of 2",
        title: "When would you like to connect with a provider?",
        subtitle: "No commitment yet — this just helps us understand timing.",
        options: [
            "As soon as possible",
            "In the next few weeks",
            "I am still researching",
        ]
    }
];

const COMPLETE = {
    title: "Great. Here are your next steps.",
    subtitle: "Taking you to trained providers near you.",
    eyebrow: "All set",
    selectionsSaved: "Selections saved",
    viewProviders: "View providers now",
    completeEyebrow: "Complete",
    back: "Back",
};

const MAX_SLOTS = Math.max(...STEPS.map(s => s.options.length));

function firstUnanswered(answers) {
    const i = STEPS.findIndex(s => !answers[s.id]);
    return i === -1 ? STEPS.length : i;
}

// ─── Minimal embedded variant (in the hero) ──────────────────────────────────
// Matches the original QuizFlow minimal={true} variant.
// CSS targets: .quiz-flow-minimal, .quiz-embed-stage, .quiz-embed-question,
//              .quiz-embed-body, .quiz-options-grid, .quiz-option-btn
function renderMinimal(container, answers, stepIndex, onDone) {
    const isDone = stepIndex >= STEPS.length;
    const step   = STEPS[Math.min(stepIndex, STEPS.length - 1)];

    if (isDone) {
        container.innerHTML = `
            <div class="quiz-flow-minimal quiz-embed-stage quiz-complete-panel flex h-full min-h-0 flex-col">
                <div class="quiz-complete-copy flex flex-col items-center justify-center text-center">
                    <p class="microtype">${COMPLETE.eyebrow}</p>
                    <p class="text-sm leading-relaxed text-ink-soft">${COMPLETE.subtitle}</p>
                    <a href="#providers"
                       class="quiz-complete-cta group text-sm font-semibold text-ink transition-colors hover:text-flame active:text-flame">
                        ${COMPLETE.viewProviders}<span aria-hidden="true"> →</span>
                    </a>
                </div>
            </div>`;

        setTimeout(() => {
            onDone();
            document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
            window.dispatchEvent(new Event('lipoderma:providers-target'));
        }, 700);
        return;
    }

    // Build option rows + empty filler slots so the grid is always MAX_SLOTS tall
    const optionRows = step.options.map(opt => `
        <button type="button" data-quiz-opt="${opt.replace(/"/g, '&quot;')}"
            class="quiz-option-btn w-full border border-ink/15 bg-cream px-4 py-0 text-left text-sm font-medium leading-snug text-ink transition-colors hover:border-flame active:border-flame">
            ${opt}
        </button>`).join('');

    const emptySlots = Array.from({ length: MAX_SLOTS - step.options.length })
        .map(() => `<div class="quiz-option-slot" aria-hidden="true"></div>`)
        .join('');

    container.innerHTML = `
        <div class="quiz-flow-minimal quiz-embed-stage flex h-full min-h-0 flex-col">
            <div class="quiz-embed-question shrink-0">
                <h2 class="font-display text-lg leading-snug text-ink">${step.title}</h2>
            </div>
            <div class="quiz-embed-body mt-2 flex min-h-0 flex-1 flex-col">
                <div class="quiz-options-grid grid h-full gap-2"
                     style="grid-template-rows: repeat(${MAX_SLOTS}, minmax(0, 1fr))">
                    ${optionRows}
                    ${emptySlots}
                </div>
            </div>
        </div>`;

    container.querySelectorAll('[data-quiz-opt]').forEach(btn => {
        btn.addEventListener('click', () => {
            answers[step.id] = btn.getAttribute('data-quiz-opt');
            renderMinimal(container, answers, stepIndex + 1, onDone);
        });
    });
}

// ─── Full modal variant ───────────────────────────────────────────────────────
function renderFull(container, answers, stepIndex, onDone) {
    const isDone = stepIndex >= STEPS.length;
    const step   = STEPS[Math.min(stepIndex, STEPS.length - 1)];

    const progressDots = [0, 1].map(i =>
        `<span class="h-1.5 w-7 ${i <= stepIndex ? 'bg-flame' : 'bg-sand'}"></span>`
    ).join('');

    let bodyHtml = '';
    if (!isDone) {
        bodyHtml = step.options.map(opt => `
            <button type="button" data-quiz-opt="${opt.replace(/"/g, '&quot;')}"
                class="border border-ink/15 bg-cream px-4 py-3.5 text-left text-sm font-semibold leading-snug text-ink transition-colors hover:border-flame md:px-5 md:py-4 md:text-base">
                ${opt}
            </button>`).join('');
    } else {
        bodyHtml = `
            <div class="flex items-center justify-center border hairline bg-cream p-5 text-center">
                <div>
                    <p class="microtype">${COMPLETE.selectionsSaved}</p>
                    <p class="mt-2 text-sm text-ink-soft">${answers.restore} · ${answers.timeline}</p>
                </div>
            </div>`;
        setTimeout(() => {
            onDone();
            document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
            window.dispatchEvent(new Event('lipoderma:providers-target'));
        }, 500);
    }

    const backDisabled = stepIndex === 0 || isDone;

    container.innerHTML = `
        <div class="quiz-flow-shell quiz-stage flex flex-col border hairline bg-white shadow-lift h-[min(34rem,calc(100svh-7.5rem))]">
            <div class="quiz-stage-header px-4 pt-4 md:px-6 md:pt-5">
                <div class="mb-4 flex items-center justify-between gap-3">
                    <p class="microtype">${isDone ? COMPLETE.completeEyebrow : step.eyebrow}</p>
                    <div class="flex gap-1.5">${progressDots}</div>
                </div>
                <h2 class="font-display text-2xl leading-tight md:text-3xl">
                    ${isDone ? COMPLETE.title : step.title}
                </h2>
                <p class="mt-2 text-sm leading-relaxed text-ink-soft">
                    ${isDone ? COMPLETE.subtitle : step.subtitle}
                </p>
            </div>
            <div class="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 md:px-6 md:pb-6">
                <div class="quiz-stage-body flex flex-col">
                    <div class="quiz-options-grid grid gap-2.5">${bodyHtml}</div>
                    <div class="mt-4 flex shrink-0 items-center gap-3 border-t hairline pt-3">
                        <button type="button" ${backDisabled ? 'disabled' : ''} class="quiz-back-btn microtype border-b border-ink/30 pb-0.5 disabled:opacity-30">
                            ${COMPLETE.back}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

    if (!isDone) {
        container.querySelectorAll('[data-quiz-opt]').forEach(btn => {
            btn.addEventListener('click', () => {
                answers[step.id] = btn.getAttribute('data-quiz-opt');
                renderFull(container, answers, stepIndex + 1, onDone);
            });
        });
    }

    const backBtn = container.querySelector('.quiz-back-btn');
    if (backBtn && !backDisabled) {
        backBtn.addEventListener('click', () => {
            renderFull(container, answers, Math.max(0, stepIndex - 1), onDone);
        });
    }
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function initModal() {
    let overlay = null;

    function close() {
        if (!overlay) return;
        document.body.style.overflow = '';
        overlay.remove();
        overlay = null;
    }

    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-quiz-open]');
        if (!btn) return;

        let prefill = {};
        try { prefill = JSON.parse(btn.getAttribute('data-prefill') || '{}'); } catch (_) {}

        const answers = {
            restore:  prefill.restore  || prefill.interest || '',
            timeline: prefill.timeline || '',
        };
        const startStep = firstUnanswered(answers);

        overlay = document.createElement('div');
        overlay.className = 'quiz-overlay fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 md:px-6';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <div class="relative w-full max-w-2xl">
                <button class="quiz-close-btn absolute -top-3 right-0 z-10 flex h-10 w-10 items-center justify-center border hairline bg-white text-lg text-ink hover:text-flame md:-right-3"
                        aria-label="Close">✕</button>
                <div class="quiz-modal-body"></div>
            </div>`;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        overlay.querySelector('.quiz-close-btn').addEventListener('click', close);
        overlay.addEventListener('click', ev => { if (ev.target === overlay) close(); });

        renderFull(overlay.querySelector('.quiz-modal-body'), answers, startStep, close);
    });

    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initQuiz() {
    // Embedded minimal quizzes (hero sections)
    document.querySelectorAll('[data-quiz-embed]').forEach(el => {
        const fresh = el.getAttribute('data-quiz-fresh-start') === 'true';
        const answers = fresh ? { restore: '', timeline: '' } : {};
        renderMinimal(el, answers, firstUnanswered(answers), () => {});
    });

    // Full modal quiz triggered by [data-quiz-open] buttons
    initModal();
}
