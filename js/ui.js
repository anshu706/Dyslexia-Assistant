/**
 * Dyslexia Assistant - UI Interaction & Animation Scripts
 * Handles intersection observers, counters, and simulations.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Intersection Observer for Scroll Reveals ---
    const revealElements = document.querySelectorAll('.reveal');
    const staggerTexts = document.querySelectorAll('.stagger-text');
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
                // If it's a stat counter, trigger counting
                if (entry.target.classList.contains('stat-card')) {
                    const counter = entry.target.querySelector('.counter');
                    if (counter && !counter.classList.contains('counted')) {
                        animateCounter(counter);
                        counter.classList.add('counted');
                    }
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));
    staggerTexts.forEach(el => revealObserver.observe(el));


    // --- 2. Number Counter Animation ---
    function animateCounter(element) {
        const target = parseInt(element.getAttribute('data-target'), 10);
        const duration = 2000; // 2 seconds
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime < duration) {
                // Easing function (easeOutExpo)
                const progress = elapsedTime / duration;
                const easeOut = 1 - Math.pow(2, -10 * progress);
                const currentVal = Math.floor(target * easeOut);
                element.innerText = currentVal;
                requestAnimationFrame(updateCounter);
            } else {
                element.innerText = target;
            }
        }
        requestAnimationFrame(updateCounter);
    }


    // --- 3. Dyslexia Simulation Toggle ---
    const simText = document.getElementById('sim-text');
    const toggleSimBtn = document.getElementById('toggle-sim');
    
    if (toggleSimBtn && simText) {
        toggleSimBtn.addEventListener('click', () => {
            const isActive = simText.classList.toggle('active');
            toggleSimBtn.innerText = isActive ? 'Turn off simulation' : 'Turn on simulation';
            toggleSimBtn.setAttribute('aria-pressed', isActive);
        });
    }


    // --- 4. Interactive Reading Demo ---
    const readingPreview = document.getElementById('reading-preview');
    const demoBtns = document.querySelectorAll('.demo-btn');
    
    if (readingPreview) {
        let isDyslexicFont = false;
        let isSpaced = false;
        let isOverlay = false;

        demoBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                
                if (action === 'font') {
                    isDyslexicFont = !isDyslexicFont;
                    readingPreview.style.fontFamily = isDyslexicFont ? 'OpenDyslexic, sans-serif' : 'var(--font-body)';
                    e.target.style.backgroundColor = isDyslexicFont ? 'var(--accent-secondary)' : 'var(--accent-primary)';
                    e.target.style.color = isDyslexicFont ? '#000' : 'var(--bg-color)';
                } 
                else if (action === 'space') {
                    isSpaced = !isSpaced;
                    readingPreview.style.letterSpacing = isSpaced ? '0.1em' : 'normal';
                    readingPreview.style.wordSpacing = isSpaced ? '0.2em' : 'normal';
                    readingPreview.style.lineHeight = isSpaced ? '2.5' : '1.6';
                    e.target.style.backgroundColor = isSpaced ? 'var(--accent-secondary)' : 'var(--accent-primary)';
                    e.target.style.color = isSpaced ? '#000' : 'var(--bg-color)';
                }
                else if (action === 'overlay') {
                    isOverlay = !isOverlay;
                    readingPreview.style.backgroundColor = isOverlay ? '#fcf9e8' : 'var(--bg-color)';
                    readingPreview.style.color = isOverlay ? '#111' : 'var(--text-primary)';
                    e.target.style.backgroundColor = isOverlay ? 'var(--accent-secondary)' : 'var(--accent-primary)';
                    e.target.style.color = isOverlay ? '#000' : 'var(--bg-color)';
                }
            });
        });
    }

    // --- 5. Simple TTS Demo Highlight ---
    const ttsBtn = document.getElementById('demo-play');
    const ttsWord = document.getElementById('tts-word');
    
    if (ttsBtn && ttsWord) {
        ttsBtn.addEventListener('click', () => {
            if ('speechSynthesis' in window) {
                const text = ttsWord.innerText;
                const utterance = new SpeechSynthesisUtterance("Listen to how the application reads out loud to assist comprehension.");
                
                ttsWord.style.backgroundColor = 'var(--accent-secondary)';
                ttsWord.style.color = '#000';
                
                utterance.onend = () => {
                    ttsWord.style.backgroundColor = 'transparent';
                    ttsWord.style.color = 'var(--text-primary)';
                };
                
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            } else {
                alert("Text-to-speech is not supported in your browser.");
            }
        });
    }
});
