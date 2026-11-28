/**
 * Dyslexia Assistant - Speech Logic (TTS)
 * Handles Web Speech API synthesis, play/pause/stop, Word Tracking Focus Box,
 * Indian & multi-lingual voice categorization, and audio preview.
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnPlay = document.getElementById('tts-play');
    const btnPause = document.getElementById('tts-pause');
    const btnStop = document.getElementById('tts-stop');
    const speedSelect = document.getElementById('tts-speed');
    const voiceSelect = document.getElementById('tts-voice');
    const btnTestVoice = document.getElementById('btn-test-voice');
    const readerContent = document.getElementById('reader-content');
    const writerEditor = document.getElementById('writer-editor');

    const synth = window.speechSynthesis;
    if (!synth) {
        console.warn('Speech Synthesis not supported in this browser.');
        return;
    }

    let currentUtterance = null;
    let isPaused = false;
    let ttsWords = [];
    let isTestingVoice = false;

    // =========================================================================
    // SMART AUTO-SCROLL — advances downward as reading nears the bottom edge,
    // yields immediately to manual scrolling, and stays paused when scrolling up
    // until the user scrolls back down to the active word or starts fresh TTS.
    // =========================================================================
    let activeWordEl = null;
    let autoScrollPausedByUser = false;
    let pauseReason = null; // 'up' | 'down' | null
    let isInitialScrollPending = false;
    let programmaticScrollUntil = 0;
    let programmaticStartY = 0;
    let programmaticTargetY = 0;
    let lastKnownScrollY = null;
    let lastManualScrollAt = 0;
    let touchStartY = null;
    let pendingScrollCheckRaf = null;

    function getScrollContainer() {
        const appMain = document.getElementById('workspace');
        if (appMain) {
            const style = window.getComputedStyle(appMain);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                appMain.scrollHeight > appMain.clientHeight + 2) {
                return appMain;
            }
        }
        return document.scrollingElement || document.documentElement;
    }

    function isViewportScroller(container) {
        return !container ||
            container === document.scrollingElement ||
            container === document.documentElement ||
            container === document.body;
    }

    function getScrollTop(container = getScrollContainer()) {
        if (isViewportScroller(container)) {
            return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        }
        return container.scrollTop;
    }

    function getMaxScrollTop(container = getScrollContainer()) {
        if (isViewportScroller(container)) {
            const docEl = document.scrollingElement || document.documentElement;
            return Math.max(0, docEl.scrollHeight - window.innerHeight);
        }
        return Math.max(0, container.scrollHeight - container.clientHeight);
    }

    function scrollContainerTo(container, top, behavior = 'smooth') {
        if (isViewportScroller(container)) {
            window.scrollTo({ top, behavior });
        } else {
            container.scrollTo({ top, behavior });
        }
    }

    function getReadableBounds(container = getScrollContainer()) {
        const viewH = isViewportScroller(container)
            ? (window.innerHeight || document.documentElement.clientHeight)
            : container.clientHeight;
        const containerTop = isViewportScroller(container)
            ? 0
            : container.getBoundingClientRect().top;

        const toolbar = document.querySelector('.app-toolbar');
        let toolbarBottom = containerTop;
        if (toolbar) {
            const tbRect = toolbar.getBoundingClientRect();
            if (tbRect.bottom > containerTop && tbRect.top <= containerTop + 40) {
                toolbarBottom = tbRect.bottom;
            }
        }

        const safeTop = Math.min(toolbarBottom + 18, containerTop + viewH * 0.4);
        const bottomPad = Math.min(72, Math.max(36, Math.round(viewH * 0.12)));
        const safeBottom = containerTop + viewH - bottomPad;

        return { viewH, containerTop, safeTop, safeBottom };
    }

    function isElementInReadableZone(el, container = getScrollContainer()) {
        if (!el || !el.isConnected) return false;
        const rect = el.getBoundingClientRect();
        const { safeTop, safeBottom } = getReadableBounds(container);
        return rect.top >= safeTop && rect.bottom <= safeBottom;
    }

    function pauseAutoScroll(reason) {
        if (pendingScrollCheckRaf) {
            cancelAnimationFrame(pendingScrollCheckRaf);
            pendingScrollCheckRaf = null;
        }
        programmaticScrollUntil = 0;
        isInitialScrollPending = false;
        autoScrollPausedByUser = true;
        pauseReason = reason;
        lastManualScrollAt = performance.now();
    }

    function evaluateDownwardManualScroll() {
        lastManualScrollAt = performance.now();
        isInitialScrollPending = false;

        if (!synth.speaking || !activeWordEl || !activeWordEl.isConnected) return;

        if (isElementInReadableZone(activeWordEl)) {
            autoScrollPausedByUser = false;
            pauseReason = null;
        } else {
            autoScrollPausedByUser = true;
            pauseReason = 'down';
        }
    }

    function scheduleDownwardCheck() {
        if (pendingScrollCheckRaf) cancelAnimationFrame(pendingScrollCheckRaf);
        pendingScrollCheckRaf = requestAnimationFrame(() => {
            pendingScrollCheckRaf = null;
            evaluateDownwardManualScroll();
        });
    }

    function shouldIgnoreScrollTarget(target) {
        return Boolean(
            target &&
            typeof target.closest === 'function' &&
            target.closest('.lexi-drawer, .modal-backdrop, .doc-list-items, select, textarea')
        );
    }

    window.addEventListener('wheel', e => {
        if (shouldIgnoreScrollTarget(e.target)) return;
        if (e.deltaY < -1) {
            pauseAutoScroll('up');
        } else if (e.deltaY > 1) {
            programmaticScrollUntil = 0;
            scheduleDownwardCheck();
        }
    }, { passive: true });

    window.addEventListener('touchstart', e => {
        if (shouldIgnoreScrollTarget(e.target)) {
            touchStartY = null;
            return;
        }
        touchStartY = e.touches && e.touches[0] ? e.touches[0].clientY : null;
    }, { passive: true });

    window.addEventListener('touchmove', e => {
        if (touchStartY === null || !e.touches || !e.touches[0]) return;
        const currentTouchY = e.touches[0].clientY;
        const fingerDeltaY = currentTouchY - touchStartY;
        if (fingerDeltaY > 6) {
            // Finger moving down scrolls content UP
            pauseAutoScroll('up');
            touchStartY = currentTouchY;
        } else if (fingerDeltaY < -6) {
            // Finger moving up scrolls content DOWN
            programmaticScrollUntil = 0;
            scheduleDownwardCheck();
            touchStartY = currentTouchY;
        }
    }, { passive: true });

    document.addEventListener('keydown', e => {
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') {
            pauseAutoScroll('up');
        } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'End') {
            programmaticScrollUntil = 0;
            scheduleDownwardCheck();
        }
    });

    function handleManualOrProgrammaticScroll(e) {
        const activeContainer = getScrollContainer();
        const isPageTarget =
            e.target === window ||
            e.target === document ||
            e.target === document.documentElement ||
            e.target === document.body ||
            e.target === activeContainer;
        if (!isPageTarget) return;

        const currentY = getScrollTop(activeContainer);
        if (lastKnownScrollY === null) {
            lastKnownScrollY = currentY;
            return;
        }

        const delta = currentY - lastKnownScrollY;
        lastKnownScrollY = currentY;
        const now = performance.now();

        if (now < programmaticScrollUntil) {
            const movingDownProgrammatically = programmaticTargetY >= programmaticStartY;
            if (movingDownProgrammatically && delta < -2) {
                // User dragged scrollbar UP against programmatic scroll
                pauseAutoScroll('up');
                return;
            }
            if (!movingDownProgrammatically && delta > 2) {
                programmaticScrollUntil = 0;
                evaluateDownwardManualScroll();
                return;
            }
            if (movingDownProgrammatically && currentY > programmaticTargetY + 4) {
                programmaticScrollUntil = 0;
                evaluateDownwardManualScroll();
                return;
            }
            if (Math.abs(currentY - programmaticTargetY) <= 3) {
                programmaticScrollUntil = 0;
            }
            return;
        }

        if (delta < -2) {
            pauseAutoScroll('up');
        } else if (delta > 2) {
            evaluateDownwardManualScroll();
        }
    }

    window.addEventListener('scroll', handleManualOrProgrammaticScroll, { passive: true });
    document.getElementById('workspace')?.addEventListener('scroll', handleManualOrProgrammaticScroll, { passive: true });

    function handleScrollEnd() {
        programmaticScrollUntil = 0;
        lastKnownScrollY = getScrollTop();
    }
    window.addEventListener('scrollend', handleScrollEnd, { passive: true });
    document.getElementById('workspace')?.addEventListener('scrollend', handleScrollEnd, { passive: true });

    function resetScrollTracking() {
        if (pendingScrollCheckRaf) {
            cancelAnimationFrame(pendingScrollCheckRaf);
            pendingScrollCheckRaf = null;
        }
        activeWordEl = null;
        autoScrollPausedByUser = false;
        pauseReason = null;
        isInitialScrollPending = true;
        programmaticScrollUntil = 0;
        lastKnownScrollY = getScrollTop();
    }

    function smartScrollTo(el) {
        if (!el || !el.isConnected) return;
        activeWordEl = el;

        const container = getScrollContainer();
        const rect = el.getBoundingClientRect();
        const { safeTop, safeBottom } = getReadableBounds(container);
        const isAbove = rect.top < safeTop;
        const isBelow = rect.bottom > safeBottom;

        // If the user previously scrolled DOWN ahead, allow auto-scroll to resume
        // once speech naturally catches up into the user's current viewport.
        if (autoScrollPausedByUser) {
            if (
                pauseReason === 'down' &&
                !isAbove &&
                !isBelow &&
                performance.now() - lastManualScrollAt > 300
            ) {
                autoScrollPausedByUser = false;
                pauseReason = null;
            } else {
                return;
            }
        }

        // Already comfortably visible inside readable viewport — do not jump
        if (!isAbove && !isBelow) {
            isInitialScrollPending = false;
            return;
        }

        // During ongoing playback, never snap UPWARD if the word moved above the viewport;
        // only allow scrolling up once on initial Listen start if word 0 began off-screen.
        if (isAbove && !isInitialScrollPending) {
            return;
        }
        isInitialScrollPending = false;

        const currentY = getScrollTop(container);
        const maxY = getMaxScrollTop(container);
        const usableH = Math.max(120, safeBottom - safeTop);
        const desiredViewportY = safeTop + Math.round(usableH * 0.32);
        const targetY = Math.max(0, Math.min(maxY, Math.round(currentY + (rect.top - desiredViewportY))));

        // Never move upward on normal downward reading progression
        if (isBelow && targetY <= currentY + 4) return;
        if (Math.abs(targetY - currentY) < 4) return;

        // Do not restart an active smooth scroll that is already heading to ~this position
        const now = performance.now();
        if (now < programmaticScrollUntil && Math.abs(targetY - programmaticTargetY) < 120) {
            return;
        }

        programmaticStartY = currentY;
        programmaticTargetY = targetY;
        programmaticScrollUntil = now + 900;
        lastKnownScrollY = currentY;
        scrollContainerTo(container, targetY, 'smooth');
    }

    // =========================================================================
    // WORD WRAPPING FOR HIGHLIGHT & WORD TRACKING BOX
    // =========================================================================
    function wrapWordsInDOM(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            if (!text.trim()) return;
            const words = text.split(/(\s+)/);
            const fragment = document.createDocumentFragment();
            words.forEach(word => {
                if (word.trim().length > 0) {
                    const span = document.createElement('span');
                    span.className = 'tts-word';
                    span.textContent = word;
                    fragment.appendChild(span);
                    ttsWords.push(span);
                } else {
                    fragment.appendChild(document.createTextNode(word));
                }
            });
            node.parentNode.replaceChild(fragment, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const skip = ['SCRIPT', 'STYLE', 'BUTTON', 'INPUT', 'SELECT'];
            if (!skip.includes(node.tagName) && !node.classList.contains('tts-word') && !node.classList.contains('bionic-fixation')) {
                Array.from(node.childNodes).forEach(wrapWordsInDOM);
            }
        }
    }

    // =========================================================================
    // GET TEXT TO READ
    // =========================================================================
    function getTextToRead() {
        const readerView = document.getElementById('view-reader');
        const writerView = document.getElementById('view-writer');

        if (readerView && readerView.classList.contains('active')) {
            const selection = window.getSelection().toString().trim();
            if (selection) return { text: selection, type: 'selection' };

            const docBody = document.getElementById('document-body');
            if (!docBody) return { text: '', type: 'none' };

            // Wrap words if not yet wrapped
            if (!docBody.querySelector('.tts-word')) {
                ttsWords = [];
                Array.from(docBody.childNodes).forEach(wrapWordsInDOM);
            } else {
                ttsWords = Array.from(docBody.querySelectorAll('.tts-word'));
            }

            const reconstructedText = ttsWords.map(w => w.textContent).join(' ');
            return { text: reconstructedText, type: 'reader' };

        } else if (writerView && writerView.classList.contains('active')) {
            const start = writerEditor?.selectionStart || 0;
            const end = writerEditor?.selectionEnd || 0;
            if (start !== end) {
                return { text: writerEditor.value.substring(start, end), type: 'writer' };
            }
            return { text: writerEditor?.value || '', type: 'writer' };
        }

        return { text: '', type: 'none' };
    }

    // =========================================================================
    // SPEAK FUNCTION
    // =========================================================================
    function startSpeaking() {
        if (synth.speaking && isPaused) {
            synth.resume();
            isPaused = false;
            updateUI();
            return;
        }

        if (synth.speaking) synth.cancel();

        const data = getTextToRead();
        if (!data.text || !data.text.trim()) {
            window.showToast && window.showToast('Nothing to read! Load a document or type something.', '⚠');
            return;
        }

        currentUtterance = new SpeechSynthesisUtterance(data.text);
        currentUtterance.rate = parseFloat(speedSelect?.value || '1');
        currentUtterance.pitch = 1.0;

        // Apply selected voice
        applySelectedVoice(currentUtterance);

        // Word boundary highlighting & Word Focus Box
        currentUtterance.onboundary = event => {
            if (event.name !== 'word') return;

            if (data.type === 'writer' && writerEditor) {
                writerEditor.focus();
                writerEditor.setSelectionRange(event.charIndex, event.charIndex + (event.charLength || 1));
            } else if (data.type === 'reader') {
                // Clear all previous active highlights and word boxes
                ttsWords.forEach(w => {
                    w.classList.remove('tts-highlight');
                    w.classList.remove('tts-word-boxed');
                });

                let charCount = 0;
                for (let i = 0; i < ttsWords.length; i++) {
                    const wordLen = ttsWords[i].textContent.length;
                    if (charCount <= event.charIndex && event.charIndex < charCount + wordLen + 1) {
                        ttsWords[i].classList.add('tts-highlight');

                        // Check Word Tracking Box feature setting
                        const settings = window.DA_SETTINGS || {};
                        if (settings.wordFocusBox !== false) {
                            ttsWords[i].classList.add('tts-word-boxed');
                        }

                        // Auto-scroll if enabled — only when word is out of visible area
                        if (settings.autoScroll !== false) {
                            smartScrollTo(ttsWords[i]);
                        }
                        break;
                    }
                    charCount += wordLen + 1;
                }
            }
        };

        currentUtterance.onend = () => {
            isPaused = false;
            resetScrollTracking();
            updateUI();
            clearAllHighlights();
        };

        currentUtterance.onerror = e => {
            if (e.error !== 'interrupted') {
                console.warn('TTS error:', e.error);
                window.showToast && window.showToast('Speech error: ' + e.error, '⚠');
            }
            isPaused = false;
            resetScrollTracking();
            updateUI();
            clearAllHighlights();
        };

        resetScrollTracking();
        synth.speak(currentUtterance);
        isPaused = false;
        updateUI();
        window.showToast && window.showToast('Reading aloud...', '🔊');
    }

    function clearAllHighlights() {
        ttsWords.forEach(w => {
            w.classList.remove('tts-highlight');
            w.classList.remove('tts-word-boxed');
        });
    }

    function pauseSpeaking() {
        if (synth.speaking && !isPaused) {
            synth.pause();
            isPaused = true;
            updateUI();
        }
    }

    function stopSpeaking() {
        synth.cancel();
        isPaused = false;
        resetScrollTracking();
        clearAllHighlights();
        updateUI();
    }

    function updateUI() {
        if (!btnPlay || !btnPause) return;
        if (synth.speaking && !isPaused) {
            btnPlay.style.display = 'none';
            btnPause.style.display = 'inline-flex';
            btnPlay.classList.add('active');
        } else {
            btnPlay.style.display = 'inline-flex';
            btnPause.style.display = 'none';
            btnPlay.classList.remove('active');
        }
    }

    // Helper: apply selected voice to utterance
    function applySelectedVoice(utterance) {
        if (!voiceSelect || voiceSelect.selectedOptions.length === 0) return;
        const selectedOpt = voiceSelect.selectedOptions[0];
        const selectedName = selectedOpt.getAttribute('data-name');
        const selectedLang = selectedOpt.getAttribute('data-lang');

        // Check if simulated Indian profile
        if (selectedOpt.value === 'simulated-indian') {
            const voices = synth.getVoices();
            // Use closest English voice with Indian cadence settings
            const enVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
            if (enVoice) utterance.voice = enVoice;
            utterance.pitch = 1.08;
            utterance.rate = Math.max(0.7, parseFloat(speedSelect?.value || '1') * 0.94);
            return;
        }

        const voices = synth.getVoices();
        const selectedVoice = voices.find(v => v.name === selectedName);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            if (selectedLang) utterance.lang = selectedLang;
        }
    }

    // =========================================================================
    // VOICE TEST PREVIEW BUTTON
    // =========================================================================
    function testSelectedVoice() {
        if (!voiceSelect || voiceSelect.selectedOptions.length === 0) return;
        if (synth.speaking) synth.cancel();

        const selectedOpt = voiceSelect.selectedOptions[0];
        const selectedName = selectedOpt.getAttribute('data-name') || 'Default';
        const selectedLang = selectedOpt.getAttribute('data-lang') || 'en';

        // Choose friendly test sentence based on voice language
        let testText = "Hello! This is a voice preview for Dyslexia Assistant. Ready to read comfortably.";
        if (selectedLang.startsWith('hi') || selectedName.toLowerCase().includes('hindi')) {
            testText = "नमस्ते! डिस्लेक्सिया असिस्टेंट में आपका स्वागत है। पढ़ना अब और भी आसान हो गया है।";
        } else if (selectedLang.includes('IN') || selectedOpt.value === 'simulated-indian' || selectedName.toLowerCase().includes('india')) {
            testText = "Namaste! This is an Indian voice preview for Dyslexia Assistant. Reading is now made gentler.";
        } else if (selectedLang.startsWith('fr')) {
            testText = "Bonjour! Ceci est un aperçu vocal pour Dyslexia Assistant. Bonne lecture!";
        } else if (selectedLang.startsWith('es')) {
            testText = "¡Hola! Esta es una prueba de voz para Dyslexia Assistant. Lectura accesible.";
        } else if (selectedLang.startsWith('de')) {
            testText = "Hallo! Dies ist eine Sprachvorschau für Dyslexia Assistant.";
        } else if (selectedLang.startsWith('it')) {
            testText = "Ciao! Questa è un'anteprima vocale per Dyslexia Assistant.";
        } else if (selectedLang.startsWith('ja')) {
            testText = "こんにちは！ディスレクシア・アシスタントの音声プレビューです。";
        } else if (selectedLang.startsWith('zh')) {
            testText = "您好！这是阅读助手的语音试听，让阅读更轻松。";
        }

        const testUtterance = new SpeechSynthesisUtterance(testText);
        testUtterance.rate = parseFloat(speedSelect?.value || '1');
        applySelectedVoice(testUtterance);

        if (btnTestVoice) {
            btnTestVoice.classList.add('active');
        }

        testUtterance.onend = () => {
            if (btnTestVoice) btnTestVoice.classList.remove('active');
        };
        testUtterance.onerror = () => {
            if (btnTestVoice) btnTestVoice.classList.remove('active');
        };

        synth.speak(testUtterance);
        window.showToast && window.showToast(`Testing voice: ${selectedName}`, '🔊');
    }

    if (btnTestVoice) {
        btnTestVoice.addEventListener('click', testSelectedVoice);
    }

    // Event listeners
    if (btnPlay) btnPlay.addEventListener('click', startSpeaking);
    if (btnPause) btnPause.addEventListener('click', pauseSpeaking);
    if (btnStop) btnStop.addEventListener('click', stopSpeaking);

    if (speedSelect) {
        speedSelect.addEventListener('change', () => {
            if (synth.speaking && currentUtterance) {
                synth.cancel();
                setTimeout(() => startSpeaking(), 150);
            }
        });
    }

    if (voiceSelect) {
        voiceSelect.addEventListener('change', () => {
            const selectedName = voiceSelect.selectedOptions[0]?.getAttribute('data-name');
            if (selectedName) {
                localStorage.setItem('da_selected_voice', selectedName);
            }
            if (synth.speaking && currentUtterance) {
                synth.cancel();
                setTimeout(() => startSpeaking(), 150);
            }
        });
    }

    // Space bar play/pause shortcut (when not in interactive controls)
    document.addEventListener('keydown', e => {
        const tag = e.target?.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
        if (e.code === 'Space' && document.getElementById('view-reader')?.classList.contains('active')) {
            e.preventDefault();
            if (synth.speaking && !isPaused) pauseSpeaking();
            else startSpeaking();
        }
    });

    document.addEventListener('da:settingsChanged', e => {
        if (e.detail && e.detail.autoScroll !== false) {
            autoScrollPausedByUser = false;
            pauseReason = null;
        }
    });

    // =========================================================================
    // POPULATE VOICES: INDIAN VOICES + ALL LANGUAGES (CATEGORIZED)
    // =========================================================================
    function populateVoices() {
        if (!voiceSelect) return;
        const availableVoices = synth.getVoices();
        if (availableVoices.length === 0) return;

        const savedSelectedVoice = localStorage.getItem('da_selected_voice');
        const currentlySelected = voiceSelect.selectedOptions[0]?.getAttribute('data-name') || savedSelectedVoice;
        voiceSelect.innerHTML = '';

        // 1. Identify Indian Voices (English India, Hindi, Tamil, Telugu, etc.)
        const isIndianVoice = v => {
            const lang = (v.lang || '').toLowerCase();
            const name = (v.name || '').toLowerCase();
            return (
                lang.includes('in') ||
                lang.startsWith('hi') ||
                lang.startsWith('ta') ||
                lang.startsWith('te') ||
                lang.startsWith('bn') ||
                lang.startsWith('mr') ||
                lang.startsWith('gu') ||
                lang.startsWith('kn') ||
                lang.startsWith('ml') ||
                lang.startsWith('pa') ||
                lang.startsWith('ur') ||
                name.includes('india') ||
                name.includes('hindi') ||
                name.includes('heera') ||
                name.includes('ravi') ||
                name.includes('swara') ||
                name.includes('madhur') ||
                name.includes('neerja') ||
                name.includes('prabhat') ||
                name.includes('kalliope') ||
                name.includes('kalpana') ||
                name.includes('geeta')
            );
        };

        const indianVoices = availableVoices.filter(isIndianVoice);
        const nonIndianVoices = availableVoices.filter(v => !isIndianVoice(v));

        // 2. Global English Voices
        const englishGlobal = nonIndianVoices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));

        // 3. European Voices
        const euroPrefixes = ['es', 'fr', 'de', 'it', 'pt', 'ru', 'nl', 'pl', 'sv', 'da', 'fi', 'el', 'no'];
        const europeanVoices = nonIndianVoices.filter(v => {
            const l = (v.lang || '').toLowerCase();
            return euroPrefixes.some(p => l.startsWith(p));
        });

        // 4. Asian & World Voices
        const asianPrefixes = ['ja', 'zh', 'ko', 'ar', 'tr', 'vi', 'th', 'id', 'he', 'ms'];
        const asianVoices = nonIndianVoices.filter(v => {
            const l = (v.lang || '').toLowerCase();
            return asianPrefixes.some(p => l.startsWith(p));
        });

        // 5. Other Remaining Voices
        const categorizedSet = new Set([...indianVoices, ...englishGlobal, ...europeanVoices, ...asianVoices]);
        const otherVoices = availableVoices.filter(v => !categorizedSet.has(v));

        // Helper to append option
        const appendOption = (voice, group) => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            option.value = voice.name;
            if (currentlySelected && (voice.name === currentlySelected || voice.name.includes(currentlySelected))) {
                option.selected = true;
            }
            group.appendChild(option);
        };

        // GROUP 1: Indian Voices (Always at the top)
        const indianGroup = document.createElement('optgroup');
        indianGroup.label = '🇮🇳 Indian Voices (English India & Hindi & Regional)';

        if (indianVoices.length > 0) {
            indianVoices.forEach(v => appendOption(v, indianGroup));
        }

        // Add Simulated Indian Profile Option (so Indian voice is always available on any device)
        const simOpt = document.createElement('option');
        simOpt.value = 'simulated-indian';
        simOpt.setAttribute('data-lang', 'en-IN');
        simOpt.setAttribute('data-name', 'Indian English (Cadence Profile)');
        simOpt.textContent = '🇮🇳 Indian English (Cadence Preset)';
        if (currentlySelected === 'Indian English (Cadence Profile)') simOpt.selected = true;
        indianGroup.appendChild(simOpt);

        voiceSelect.appendChild(indianGroup);

        // GROUP 2: English Global
        if (englishGlobal.length > 0) {
            const enGroup = document.createElement('optgroup');
            enGroup.label = '🌐 English Global (US, UK, AU, CA)';
            englishGlobal.forEach(v => appendOption(v, enGroup));
            voiceSelect.appendChild(enGroup);
        }

        // GROUP 3: European Languages
        if (europeanVoices.length > 0) {
            const euroGroup = document.createElement('optgroup');
            euroGroup.label = '🌍 European Languages (ES, FR, DE, IT...)';
            europeanVoices.forEach(v => appendOption(v, euroGroup));
            voiceSelect.appendChild(euroGroup);
        }

        // GROUP 4: Asian & World Languages
        if (asianVoices.length > 0) {
            const asianGroup = document.createElement('optgroup');
            asianGroup.label = '🌏 Asian & World Languages (JA, ZH, KO, AR...)';
            asianVoices.forEach(v => appendOption(v, asianGroup));
            voiceSelect.appendChild(asianGroup);
        }

        // GROUP 5: All Remaining System Voices
        if (otherVoices.length > 0) {
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = '✨ Other Available Voices';
            otherVoices.forEach(v => appendOption(v, otherGroup));
            voiceSelect.appendChild(otherGroup);
        }

        // If no voice is marked selected yet, pick first Indian or first available voice
        if (!voiceSelect.value && voiceSelect.options.length > 0) {
            voiceSelect.options[0].selected = true;
        }
    }

    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }

    // Stop speech when switching views
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (synth.speaking) stopSpeaking();
        });
    });
});
