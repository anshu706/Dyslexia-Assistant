/**
 * Dyslexia Assistant - Landing Page UI & Animation Scripts
 * Handles intersection observers, counters, simulation toggle,
 * demo reading controls, and demo TTS preview.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. SCROLL REVEAL — Intersection Observer
    // =========================================================================
    const revealElements = document.querySelectorAll('.reveal');
    const staggerTexts = document.querySelectorAll('.stagger-text');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');

            // Trigger number counter if this is a stat card
            if (entry.target.classList.contains('stat-card')) {
                const counter = entry.target.querySelector('.counter');
                if (counter && !counter.classList.contains('counted')) {
                    animateCounter(counter);
                    counter.classList.add('counted');
                }
            }
            observer.unobserve(entry.target);
        });
    }, {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
    staggerTexts.forEach(el => revealObserver.observe(el));


    // =========================================================================
    // 2. NUMBER COUNTER ANIMATION
    // =========================================================================
    function animateCounter(element) {
        const target = parseInt(element.getAttribute('data-target'), 10);
        if (isNaN(target)) return;
        const duration = 2000;
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            if (elapsed < duration) {
                const progress = elapsed / duration;
                const easeOut = 1 - Math.pow(2, -10 * progress);
                element.innerText = Math.floor(target * easeOut);
                requestAnimationFrame(updateCounter);
            } else {
                element.innerText = target;
            }
        }
        requestAnimationFrame(updateCounter);
    }


    // =========================================================================
    // 3. DYSLEXIA SIMULATION TOGGLE
    // =========================================================================
    const simText = document.getElementById('sim-text');
    const toggleSimBtn = document.getElementById('toggle-sim');

    if (toggleSimBtn && simText) {
        toggleSimBtn.addEventListener('click', () => {
            const isActive = simText.classList.toggle('active');
            toggleSimBtn.innerText = isActive ? 'Turn off simulation' : 'Turn on simulation';
            toggleSimBtn.setAttribute('aria-pressed', String(isActive));
        });
    }


    // =========================================================================
    // 4. INTERACTIVE READING DEMO (Feature Cards)
    // =========================================================================
    const readingPreview = document.getElementById('reading-preview');
    const demoBtns = document.querySelectorAll('.demo-btn');

    if (readingPreview) {
        let isDyslexicFont = false;
        let isSpaced = false;
        let isOverlay = false;

        demoBtns.forEach(btn => {
            btn.addEventListener('click', e => {
                const action = e.currentTarget.getAttribute('data-action');

                if (action === 'font') {
                    isDyslexicFont = !isDyslexicFont;
                    readingPreview.style.fontFamily = isDyslexicFont
                        ? "'OpenDyslexic', Arial, sans-serif"
                        : "var(--font-body)";
                    highlightDemoBtn(e.currentTarget, isDyslexicFont);
                } else if (action === 'space') {
                    isSpaced = !isSpaced;
                    readingPreview.style.letterSpacing = isSpaced ? '0.1em' : 'normal';
                    readingPreview.style.wordSpacing = isSpaced ? '0.2em' : 'normal';
                    readingPreview.style.lineHeight = isSpaced ? '2.5' : '1.6';
                    highlightDemoBtn(e.currentTarget, isSpaced);
                } else if (action === 'overlay') {
                    isOverlay = !isOverlay;
                    readingPreview.style.backgroundColor = isOverlay ? '#fbf6e8' : 'var(--bg-color)';
                    readingPreview.style.color = isOverlay ? '#242118' : 'var(--text-primary)';
                    readingPreview.style.borderRadius = isOverlay ? '8px' : '12px';
                    highlightDemoBtn(e.currentTarget, isOverlay);
                }
            });
        });

        function highlightDemoBtn(btn, isOn) {
            btn.style.backgroundColor = isOn ? 'var(--accent-secondary)' : '';
            btn.style.color = isOn ? '#000' : '';
        }
    }


    // =========================================================================
    // 5. TTS DEMO — Play Audio Button
    // =========================================================================
    const ttsBtn = document.getElementById('demo-play');
    const ttsWord = document.getElementById('tts-word');

    if (ttsBtn && ttsWord) {
        ttsBtn.addEventListener('click', () => {
            if (!('speechSynthesis' in window)) {
                alert('Text-to-speech is not supported in your browser.');
                return;
            }
            const utterance = new SpeechSynthesisUtterance(
                'Listen to how the application reads out loud to assist comprehension.'
            );
            utterance.rate = 0.9;

            ttsWord.style.backgroundColor = 'var(--accent-secondary)';
            ttsWord.style.color = '#000';
            ttsWord.style.borderRadius = '6px';
            ttsWord.style.padding = '2px 4px';

            utterance.onend = () => {
                ttsWord.style.backgroundColor = '';
                ttsWord.style.color = '';
                ttsWord.style.padding = '';
            };

            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        });
    }


    // =========================================================================
    // 6. FLOATING LETTERS — subtle parallax on mouse move
    // =========================================================================
    const floatingLetters = document.querySelectorAll('.floating-letter');

    if (floatingLetters.length > 0) {
        document.addEventListener('mousemove', e => {
            const mx = (e.clientX / window.innerWidth - 0.5) * 30;
            const my = (e.clientY / window.innerHeight - 0.5) * 15;

            floatingLetters.forEach((letter, i) => {
                const depth = (i % 3 + 1) * 0.5;
                letter.style.transform = `translate(${mx * depth}px, ${my * depth}px) rotate(${mx * depth * 0.5}deg)`;
            });
        });
    }

});
