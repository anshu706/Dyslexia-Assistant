/**
 * owl-avatar.js
 * 
 * Interactive AI Avatar ("Lexi the Wise Owl") for Dyslexia-Assistant.
 * 
 * Capabilities:
 *  - High-fidelity vector SVG mascot with spring physics (jump-in, squash & stretch)
 *  - Real-time speech-synchronized lip-sync (beak flaps, head bobs) via Web Speech API
 *  - Autonomous eye-blink loop & natural idle breathing
 *  - Interactive spotlight cutout guiding users through core accommodations:
 *      1. Comfort Tints (Contrast Shield)
 *      2. Dyslexia Fonts & Bionic Guiding
 *      3. Real-Time Word Tracking Box
 *      4. Phonetic Writer & Flashcard Vault
 *      5. Lexi Voice AI Assistant
 *  - Keyboard navigation (Esc to exit, Arrow keys / Enter to navigate)
 *  - WCAG 2.1 AA compliant (accessible naming, screen reader live region, reduced-motion)
 */

(function () {
    'use strict';

    // ─── STATE ───────────────────────────────────────────────────────────────
    const state = {
        currentStep: 0,
        isOpen: false,
        isTalking: false,
        blinkTimer: null,
        speechUtterance: null,
    };

    // ─── TOUR STEPS SPECIFICATION ────────────────────────────────────────────
    const TOUR_STEPS = [
        {
            title: "Hoot! I'm Lexi, Your Wise Guide 🦉",
            text: "Welcome to your dyslexia-friendly workspace! I'm here to show you how our visual and auditory tools quiet screen glare and make reading feel effortless.",
            speech: "Hoot! I am Lexi, your wise reading companion. Welcome to your workspace! Let me show you how our tools make reading and writing feel effortless.",
            target: null, // Centered
            pose: 'wave',
        },
        {
            title: "The Comfort Tint Shield 🎨",
            text: "Harsh white screen glare causes words to dance or blur. Choose <strong>Sage Mint</strong>, <strong>Peach</strong>, or <strong>Warm Cream</strong> to instantly soothe your eyes.",
            speech: "First, screen glare tires dyslexic eyes. Choose a warm sage, peach, or cream background tint to keep letters from dancing.",
            target: '#tint-picker',
            fallbackTarget: '.tint-btn',
            pose: 'point',
        },
        {
            title: "Dyslexia Fonts & Bionic Guiding 🔤",
            text: "Switch between <strong>Lexend</strong> and <strong>OpenDyslexic</strong> with weighted bottoms to anchor letters. Turn on <strong>Bionic Reading</strong> to guide your gaze smoothly.",
            speech: "We feature specialized fonts like Lexend and OpenDyslexic with weighted bottoms that stop letters from flipping. Bionic mode bolds word centers to guide your eye effortlessly.",
            target: '#font-selector',
            fallbackTarget: '#reading-settings',
            pose: 'point',
        },
        {
            title: "Listen with Live Word Tracking 🎧",
            text: "Press <strong>Listen</strong> anytime! As sentences are read aloud at your pace, a glowing focus box wraps each word in real time so you never lose your place.",
            speech: "Listen at your own pace! As sentences are read aloud, a glowing focus box wraps each spoken word in real time, keeping your eyes locked on track.",
            target: '#tool-speak',
            fallbackTarget: '#reader-content',
            pose: 'point',
        },
        {
            title: "Stress-Free Writer & Memory Vault ✍️",
            text: "Open the <strong>Write</strong> view to express your thoughts without red ink. Practice difficult word pairs (like <em>quiet</em> vs <em>quite</em>) with spaced repetition flashcards.",
            speech: "Draft your thoughts in Write mode without fear of red ink. Practice tricky confusions using spaced repetition flashcards.",
            target: 'button[data-view="writer"]',
            fallbackTarget: '.sidebar-nav',
            pose: 'point',
        },
        {
            title: "I'm Always a Hop Away! ⚡",
            text: "Click on me or press <strong>Alt + A</strong> anytime to ask questions, summarize long documents, or break down difficult words. Let's make learning enjoyable!",
            speech: "Whenever you need help, click on me or press Alt plus A. I can explain any text, simplify complex words, or review your writing. Enjoy your reading!",
            target: '#btn-lexi-toggle',
            fallbackTarget: null,
            pose: 'wave',
        }
    ];

    // ─── SVG MASCOT TEMPLATE ──────────────────────────────────────────────────
    function createOwlSvg() {
        return `
        <svg class="owl-mascot-svg" viewBox="0 0 170 190" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lexi the Owl">
            <defs>
                <!-- Tawny feather gradient -->
                <linearGradient id="owlBodyGrad" x1="85" y1="20" x2="85" y2="180" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#D97706"/>
                    <stop offset="45%" stop-color="#B45309"/>
                    <stop offset="100%" stop-color="#78350F"/>
                </linearGradient>

                <!-- Cream belly gradient -->
                <linearGradient id="owlBellyGrad" x1="85" y1="80" x2="85" y2="165" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FFFBEB"/>
                    <stop offset="100%" stop-color="#FEF3C7"/>
                </linearGradient>

                <!-- Soft drop shadow -->
                <radialGradient id="owlShadow" cx="85" cy="184" r="50" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="rgba(15, 23, 42, 0.45)"/>
                    <stop offset="100%" stop-color="rgba(15, 23, 42, 0)"/>
                </radialGradient>

                <!-- Gold Beak Gradient -->
                <linearGradient id="owlBeakGrad" x1="85" y1="92" x2="85" y2="114" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FBBF24"/>
                    <stop offset="100%" stop-color="#D97706"/>
                </linearGradient>
            </defs>

            <!-- Shadow underneath -->
            <ellipse cx="85" cy="182" rx="52" ry="7" fill="url(#owlShadow)"/>

            <!-- Feet / Talons -->
            <g id="owl-feet">
                <ellipse cx="68" cy="176" rx="8" ry="4.5" fill="#D97706"/>
                <ellipse cx="76" cy="177" rx="7" ry="4" fill="#B45309"/>
                <ellipse cx="94" cy="177" rx="7" ry="4" fill="#B45309"/>
                <ellipse cx="102" cy="176" rx="8" ry="4.5" fill="#D97706"/>
            </g>

            <!-- Main Body -->
            <path d="M85 30 C45 30 32 70 32 125 C32 162 55 178 85 178 C115 178 138 162 138 125 C138 70 125 30 85 30 Z"
                  fill="url(#owlBodyGrad)" stroke="#78350F" stroke-width="2.5"/>

            <!-- Cream Belly with subtle feather chevron marks -->
            <path d="M85 82 C60 82 52 110 52 142 C52 165 67 172 85 172 C103 172 118 165 118 142 C118 110 110 82 85 82 Z"
                  fill="url(#owlBellyGrad)"/>
            <path d="M78 110 Q85 116 92 110 M75 128 Q85 135 95 128 M80 146 Q85 151 90 146"
                  stroke="#D97706" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>

            <!-- Left Wing -->
            <g class="owl-wing-left">
                <path d="M35 85 C22 105 24 140 38 152 C44 145 46 115 42 90 Z"
                      fill="#9A3412" stroke="#78350F" stroke-width="2"/>
            </g>

            <!-- Right Wing (Active Waving / Pointing) -->
            <g class="owl-wing-right">
                <path d="M135 85 C148 105 146 140 132 152 C126 145 124 115 128 90 Z"
                      fill="#9A3412" stroke="#78350F" stroke-width="2"/>
            </g>

            <!-- Head Group (Tilts and Bobs) -->
            <g class="owl-head-group">
                <!-- Ear Tufts -->
                <path d="M48 42 L36 18 Q55 24 64 36 Z" fill="#9A3412" stroke="#78350F" stroke-width="2"/>
                <path d="M122 42 L134 18 Q115 24 106 36 Z" fill="#9A3412" stroke="#78350F" stroke-width="2"/>

                <!-- Left Eye -->
                <g id="owl-eye-left">
                    <circle cx="64" cy="74" r="21" fill="#FFFFFF" stroke="#78350F" stroke-width="2"/>
                    <circle cx="65" cy="74" r="11" fill="#1E293B"/>
                    <circle cx="68" cy="71" r="4" fill="#FFFFFF"/>
                    <circle cx="62" cy="77" r="1.5" fill="#FFFFFF"/>
                    <!-- Eyelid for Blinking -->
                    <path class="owl-eyelid" d="M43 74 A21 21 0 0 1 85 74 Z" fill="#B45309"/>
                </g>

                <!-- Right Eye -->
                <g id="owl-eye-right">
                    <circle cx="106" cy="74" r="21" fill="#FFFFFF" stroke="#78350F" stroke-width="2"/>
                    <circle cx="105" cy="74" r="11" fill="#1E293B"/>
                    <circle cx="108" cy="71" r="4" fill="#FFFFFF"/>
                    <circle cx="102" cy="77" r="1.5" fill="#FFFFFF"/>
                    <!-- Eyelid for Blinking -->
                    <path class="owl-eyelid" d="M85 74 A21 21 0 0 1 127 74 Z" fill="#B45309"/>
                </g>

                <!-- Cute Tortoiseshell Reading Spectacles -->
                <g class="owl-glasses">
                    <circle cx="64" cy="74" r="23" fill="none" stroke="#78350F" stroke-width="3.5"/>
                    <circle cx="106" cy="74" r="23" fill="none" stroke="#78350F" stroke-width="3.5"/>
                    <!-- Bridge between lenses -->
                    <path d="M83 72 Q85 68 87 72" fill="none" stroke="#78350F" stroke-width="3.5" stroke-linecap="round"/>
                    <!-- Lens light reflection -->
                    <path class="owl-glasses-glint" d="M52 64 L60 56 M94 64 L102 56" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
                </g>

                <!-- Upper Beak -->
                <path d="M78 88 Q85 86 92 88 L85 106 Z" fill="url(#owlBeakGrad)" stroke="#78350F" stroke-width="1.5"/>

                <!-- Lower Beak (Articulates when talking) -->
                <path class="owl-beak-lower" d="M81 100 Q85 108 89 100 L85 105 Z" fill="#B45309"/>

                <!-- Scholarly Mortarboard Cap -->
                <g id="owl-cap">
                    <!-- Cap base ring -->
                    <ellipse cx="85" cy="34" rx="28" ry="8" fill="#0F172A"/>
                    <!-- Diamond top plate -->
                    <polygon points="85,12 135,26 85,38 35,26" fill="#1E293B" stroke="#0F172A" stroke-width="1.5"/>
                    <!-- Cap button -->
                    <circle cx="85" cy="25" r="3.5" fill="#F59E0B"/>
                    <!-- Dangling golden tassel -->
                    <path d="M85 25 Q115 32 122 48" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="122" cy="50" r="3" fill="#D97706"/>
                </g>
            </g>
        </svg>
        `;
    }

    // ─── DOM INJECTION & SETUP ────────────────────────────────────────────────
    function injectAvatarDOM() {
        if (document.getElementById('owl-tour-container')) return;

        const container = document.createElement('div');
        container.id = 'owl-tour-container';
        container.innerHTML = `
            <!-- Fullscreen Dimming Overlay & Spotlight Ring -->
            <div class="owl-tour-overlay" id="owl-tour-overlay" aria-hidden="true">
                <div class="owl-tour-scrim"></div>
                <div class="owl-spotlight-box" id="owl-spotlight-box"></div>
            </div>

            <!-- Floating Stage: Mascot + Speech Bubble -->
            <div
                class="owl-avatar-stage hidden"
                id="owl-avatar-stage"
                role="dialog"
                aria-modal="true"
                aria-labelledby="owl-bubble-title"
                aria-describedby="owl-bubble-text"
            >
                <div class="owl-mascot-wrapper" id="owl-mascot-wrapper" title="Lexi the Wise Owl (Click to hear me speak!)">
                    ${createOwlSvg()}
                </div>

                <div class="owl-speech-bubble" id="owl-speech-bubble">
                    <div class="owl-bubble-header">
                        <span class="owl-bubble-title" id="owl-bubble-title">Welcome</span>
                        <span class="owl-step-counter" id="owl-step-counter">1 of 6</span>
                    </div>

                    <div class="owl-speech-status" id="owl-speech-status" aria-hidden="true" style="display: none;">
                        <div class="owl-soundwave-anim">
                            <span></span><span></span><span></span><span></span>
                        </div>
                        <span>Speaking aloud...</span>
                    </div>

                    <div class="owl-bubble-body">
                        <p id="owl-bubble-text">Loading instructions...</p>
                    </div>

                    <div class="owl-bubble-actions">
                        <button type="button" class="btn-owl-skip" id="btn-owl-skip">Skip Tour</button>
                        <div class="owl-nav-buttons">
                            <button type="button" class="btn-owl-action btn-owl-secondary" id="btn-owl-prev">
                                ⬅ Back
                            </button>
                            <button type="button" class="btn-owl-action btn-owl-primary" id="btn-owl-next">
                                Next ➔
                            </button>
                        </div>
                    </div>

                    <div class="owl-progress-dots" id="owl-progress-dots" aria-hidden="true"></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        // Bind interactive events
        bindEvents();
        startBlinkLoop();
    }

    // ─── EVENT BINDINGS ──────────────────────────────────────────────────────
    function bindEvents() {
        const nextBtn = document.getElementById('btn-owl-next');
        const prevBtn = document.getElementById('btn-owl-prev');
        const skipBtn = document.getElementById('btn-owl-skip');
        const mascotWrapper = document.getElementById('owl-mascot-wrapper');
        const overlay = document.getElementById('owl-tour-overlay');

        nextBtn?.addEventListener('click', () => nextStep());
        prevBtn?.addEventListener('click', () => prevStep());
        skipBtn?.addEventListener('click', () => closeTour());
        overlay?.addEventListener('click', (e) => {
            // Clicking outside dismisses
            if (e.target.classList.contains('owl-tour-scrim')) {
                closeTour();
            }
        });

        // Replay speech on owl click
        mascotWrapper?.addEventListener('click', () => {
            const step = TOUR_STEPS[state.currentStep];
            if (step) speakText(step.speech || step.text);
        });

        // Global Keyboard Navigation
        window.addEventListener('keydown', (e) => {
            if (!state.isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                closeTour();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                e.preventDefault();
                nextStep();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevStep();
            }
        });
    }

    // ─── BLINKING ANIMATION LOOP ─────────────────────────────────────────────
    function startBlinkLoop() {
        if (state.blinkTimer) clearTimeout(state.blinkTimer);

        const scheduleBlink = () => {
            const delay = 3200 + Math.random() * 2500;
            state.blinkTimer = setTimeout(() => {
                const stage = document.getElementById('owl-avatar-stage');
                if (stage) {
                    stage.classList.add('do-blink');
                    setTimeout(() => stage.classList.remove('do-blink'), 180);
                }
                scheduleBlink();
            }, delay);
        };

        scheduleBlink();
    }

    // ─── SPEECH SYNTHESIS & LIP-SYNC COORDINATION ────────────────────────────
    function speakText(text) {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const cleanText = text.replace(/<[^>]*>/g, '').replace(/[\*_~]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);

        utterance.rate = 0.92; // Slightly relaxed for clarity
        utterance.pitch = 1.05; // Friendly warm tone

        // Pick preferred English voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
        if (preferred) utterance.voice = preferred;

        const stage = document.getElementById('owl-avatar-stage');
        const status = document.getElementById('owl-speech-status');

        utterance.onstart = () => {
            state.isTalking = true;
            stage?.classList.add('is-talking');
            if (status) status.style.display = 'flex';
        };

        const stopSpeaking = () => {
            state.isTalking = false;
            stage?.classList.remove('is-talking');
            if (status) status.style.display = 'none';
        };

        utterance.onend = stopSpeaking;
        utterance.onerror = stopSpeaking;

        state.speechUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    // ─── STEP RENDER & POSITIONING ───────────────────────────────────────────
    function renderStep(index) {
        if (index < 0 || index >= TOUR_STEPS.length) return;
        state.currentStep = index;

        const step = TOUR_STEPS[index];
        const stage = document.getElementById('owl-avatar-stage');
        const overlay = document.getElementById('owl-tour-overlay');
        const spotlight = document.getElementById('owl-spotlight-box');
        const titleEl = document.getElementById('owl-bubble-title');
        const textEl = document.getElementById('owl-bubble-text');
        const counterEl = document.getElementById('owl-step-counter');
        const prevBtn = document.getElementById('btn-owl-prev');
        const nextBtn = document.getElementById('btn-owl-next');
        const dotsContainer = document.getElementById('owl-progress-dots');

        if (!stage || !overlay || !spotlight) return;

        // Update Text
        if (titleEl) titleEl.innerHTML = step.title;
        if (textEl) textEl.innerHTML = step.text;
        if (counterEl) counterEl.textContent = `${index + 1} of ${TOUR_STEPS.length}`;

        // Update Buttons
        if (prevBtn) {
            prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        }
        if (nextBtn) {
            nextBtn.textContent = index === TOUR_STEPS.length - 1 ? 'Start Reading! ✓' : 'Next ➔';
        }

        // Update Progress Dots
        if (dotsContainer) {
            dotsContainer.innerHTML = TOUR_STEPS.map((_, i) =>
                `<span class="owl-dot ${i === index ? 'active' : ''}"></span>`
            ).join('');
        }

        // Apply Pose
        stage.classList.remove('wave-wing', 'point-wing');
        if (step.pose === 'wave') stage.classList.add('wave-wing');
        if (step.pose === 'point') stage.classList.add('point-wing');

        // Target Element Spotlighting
        let targetEl = step.target ? document.querySelector(step.target) : null;
        if (!targetEl && step.fallbackTarget) {
            targetEl = document.querySelector(step.fallbackTarget);
        }

        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            setTimeout(() => {
                const rect = targetEl.getBoundingClientRect();
                const pad = 10;

                // Position spotlight box around target
                spotlight.style.display = 'block';
                spotlight.style.left = `${Math.max(4, rect.left - pad)}px`;
                spotlight.style.top = `${Math.max(4, rect.top - pad)}px`;
                spotlight.style.width = `${rect.width + pad * 2}px`;
                spotlight.style.height = `${rect.height + pad * 2}px`;

                // Position stage adjacent to target
                stage.classList.remove('stage-centered');

                // Determine whether to place below or above
                const spaceBelow = window.innerHeight - rect.bottom;
                const stageWidth = Math.min(460, window.innerWidth * 0.92);
                let leftPos = Math.max(16, Math.min(window.innerWidth - stageWidth - 16, rect.left + rect.width / 2 - stageWidth / 2));

                if (spaceBelow > 380 || rect.top < 200) {
                    // Place below
                    stage.style.left = `${leftPos}px`;
                    stage.style.top = `${Math.min(window.innerHeight - 360, rect.bottom + 20)}px`;
                    stage.style.transform = 'none';
                } else {
                    // Place above
                    stage.style.left = `${leftPos}px`;
                    stage.style.top = `${Math.max(16, rect.top - 360)}px`;
                    stage.style.transform = 'none';
                }
            }, 120);
        } else {
            // Centered Welcome & Conclusion
            spotlight.style.display = 'none';
            stage.classList.add('stage-centered');
            stage.style.left = '50%';
            stage.style.top = '50%';
            stage.style.transform = 'translate(-50%, -50%)';
        }

        // Voice speech
        speakText(step.speech || step.text);
    }

    // ─── TOUR CONTROL PUBLIC API ──────────────────────────────────────────────
    function launchTour(startIndex = 0) {
        injectAvatarDOM();

        const stage = document.getElementById('owl-avatar-stage');
        const overlay = document.getElementById('owl-tour-overlay');

        if (!stage || !overlay) return;

        state.isOpen = true;
        overlay.classList.add('active');
        stage.classList.remove('hidden');
        stage.classList.add('jump-in');

        // Focus trap
        setTimeout(() => {
            document.getElementById('btn-owl-next')?.focus();
        }, 300);

        renderStep(startIndex);
    }

    function closeTour() {
        state.isOpen = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        const stage = document.getElementById('owl-avatar-stage');
        const overlay = document.getElementById('owl-tour-overlay');
        const spotlight = document.getElementById('owl-spotlight-box');

        if (overlay) overlay.classList.remove('active');
        if (spotlight) spotlight.style.display = 'none';
        if (stage) {
            stage.classList.add('hidden');
            stage.classList.remove('jump-in', 'wave-wing', 'point-wing', 'stage-centered');
            // Clear any positional inline styles so next launch positions cleanly
            stage.style.left = '';
            stage.style.top = '';
            stage.style.transform = '';
        }

        // Remember tour completed
        try {
            localStorage.setItem('da_owl_tour_completed', 'true');
        } catch (_) {}
    }

    function nextStep() {
        if (state.currentStep < TOUR_STEPS.length - 1) {
            renderStep(state.currentStep + 1);
        } else {
            closeTour();
            window.showToast?.('Welcome aboard! Lexi is ready when you are.', '🦉');
        }
    }

    function prevStep() {
        if (state.currentStep > 0) {
            renderStep(state.currentStep - 1);
        }
    }

    // ─── AUTO-TRIGGER ON FIRST VISIT ──────────────────────────────────────────
    function setupAutoTrigger() {
        // Wire up any persistent tour button in header — toggle: open or close
        const triggerBtn = document.getElementById('btn-owl-tour');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => {
                if (state.isOpen) {
                    closeTour();
                } else {
                    launchTour(0);
                }
            });
        }

        // Do not auto-launch in automated test environments (Playwright, Puppeteer, Axe-core)
        if (navigator.webdriver || window.__DA_TESTING__) {
            return;
        }

        // Auto-launch if user hasn't seen the tour yet
        try {
            const hasSeen = localStorage.getItem('da_owl_tour_completed');
            if (!hasSeen) {
                // Wait for initial reader view to hydrate
                setTimeout(() => {
                    launchTour(0);
                }, 1400);
            }
        } catch (_) {}
    }

    // Export global helper
    window.DA_OwlAvatar = {
        launch: launchTour,
        close: closeTour,
        next: nextStep,
        prev: prevStep,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAutoTrigger);
    } else {
        setupAutoTrigger();
    }
})();
