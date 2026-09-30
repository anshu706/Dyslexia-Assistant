/**
 * Dyslexia Assistant - Speech Logic (TTS)
 * Handles Web Speech API synthesis, play/pause/stop, word highlighting
 * with auto-scroll, voice selection, and speed adjustment.
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnPlay = document.getElementById('tts-play');
    const btnPause = document.getElementById('tts-pause');
    const btnStop = document.getElementById('tts-stop');
    const speedSelect = document.getElementById('tts-speed');
    const voiceSelect = document.getElementById('tts-voice');
    const readerContent = document.getElementById('reader-content');
    const writerEditor = document.getElementById('writer-editor');

    const synth = window.speechSynthesis;
    if (!synth) {
        console.warn('Speech Synthesis not supported.');
        return;
    }

    let currentUtterance = null;
    let isPaused = false;
    let ttsWords = [];

    // =========================================================================
    // WORD WRAPPING FOR HIGHLIGHT
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

            // Wrap words if not yet done
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
    // SPEAK
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

        // Set selected voice
        const voices = synth.getVoices();
        if (voiceSelect?.selectedOptions.length > 0) {
            const selectedName = voiceSelect.selectedOptions[0].getAttribute('data-name');
            const selectedVoice = voices.find(v => v.name === selectedName);
            if (selectedVoice) currentUtterance.voice = selectedVoice;
        }

        // On word boundary — highlight + scroll
        currentUtterance.onboundary = event => {
            if (event.name !== 'word') return;

            if (data.type === 'writer' && writerEditor) {
                writerEditor.focus();
                writerEditor.setSelectionRange(event.charIndex, event.charIndex + (event.charLength || 1));
            } else if (data.type === 'reader') {
                ttsWords.forEach(w => w.classList.remove('tts-highlight'));

                let charCount = 0;
                for (let i = 0; i < ttsWords.length; i++) {
                    const wordLen = ttsWords[i].textContent.length;
                    if (charCount <= event.charIndex && event.charIndex < charCount + wordLen + 1) {
                        ttsWords[i].classList.add('tts-highlight');

                        // Auto-scroll if enabled
                        const settings = window.DA_SETTINGS || {};
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
            ttsWords.forEach(w => w.classList.remove('tts-highlight'));
        };

        currentUtterance.onerror = e => {
            if (e.error !== 'interrupted') {
                console.warn('TTS error:', e.error);
                window.showToast && window.showToast('Speech error: ' + e.error, '⚠');
            }
            isPaused = false;
            updateUI();
        };

        synth.speak(currentUtterance);
        isPaused = false;
        updateUI();
        window.showToast && window.showToast('Reading aloud...', '🔊');
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
        ttsWords.forEach(w => w.classList.remove('tts-highlight'));
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

    // Event listeners
    if (btnPlay) btnPlay.addEventListener('click', startSpeaking);
    if (btnPause) btnPause.addEventListener('click', pauseSpeaking);
    if (btnStop) btnStop.addEventListener('click', stopSpeaking);

    if (speedSelect) {
        speedSelect.addEventListener('change', () => {
            if (synth.speaking && currentUtterance) {
                const data = getTextToRead();
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
    // POPULATE VOICE DROPDOWN
    // =========================================================================
    function populateVoices() {
        if (!voiceSelect) return;
        const availableVoices = synth.getVoices();
        if (availableVoices.length === 0) return;

        const currentSelected = voiceSelect.selectedOptions[0]?.getAttribute('data-name');
        voiceSelect.innerHTML = '';

        // Prefer English voices first
        const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
        const otherVoices = availableVoices.filter(v => !v.lang.startsWith('en'));
        const sortedVoices = [...englishVoices, ...otherVoices];

        sortedVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            if (currentSelected && voice.name === currentSelected) option.selected = true;
            voiceSelect.appendChild(option);
        });
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
