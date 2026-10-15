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

                        // Auto-scroll if enabled
                        if (settings.autoScroll !== false) {
                            ttsWords[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        break;
                    }
                    charCount += wordLen + 1;
                }
            }
        };

        currentUtterance.onend = () => {
            isPaused = false;
            updateUI();
            clearAllHighlights();
        };

        currentUtterance.onerror = e => {
            if (e.error !== 'interrupted') {
                console.warn('TTS error:', e.error);
                window.showToast && window.showToast('Speech error: ' + e.error, '⚠');
            }
            isPaused = false;
            updateUI();
            clearAllHighlights();
        };

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

    // Space bar play/pause shortcut (when not in textarea/input)
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
        if (e.code === 'Space' && document.getElementById('view-reader')?.classList.contains('active')) {
            e.preventDefault();
            if (synth.speaking) pauseSpeaking();
            else startSpeaking();
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
