/**
 * Dyslexia Assistant - Speech Logic (TTS)
 * Handles Web Speech API synthesis, playback controls, and speed adjustments.
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnPlay = document.getElementById('tts-play');
    const btnPause = document.getElementById('tts-pause');
    const btnStop = document.getElementById('tts-stop');
    const speedSelect = document.getElementById('tts-speed');
    const voiceSelect = document.getElementById('tts-voice');

    const readerContent = document.getElementById('reader-content');
    const writerEditor = document.getElementById('writer-editor');

    let synth = window.speechSynthesis;
    let currentUtterance = null;
    let isPaused = false;

    if (!synth) {
        console.warn("Speech Synthesis not supported in this browser.");
        return;
    }

    let ttsWords = [];

    function wrapWordsInDOM(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            if (text.trim().length === 0) return;
            
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
            if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && !node.classList.contains('tts-word')) {
                Array.from(node.childNodes).forEach(wrapWordsInDOM);
            }
        }
    }

    function getTextToRead() {
        const readerView = document.getElementById('view-reader');
        const writerView = document.getElementById('view-writer');

        if (readerView.classList.contains('active')) {
            const selection = window.getSelection().toString().trim();
            if (selection) return { text: selection, type: 'selection' };
            
            // Wrap words if not already wrapped
            if (!readerContent.querySelector('.tts-word')) {
                ttsWords = [];
                // Clone children to an array to avoid modifying while iterating in some cases
                Array.from(readerContent.childNodes).forEach(wrapWordsInDOM);
            } else {
                ttsWords = Array.from(readerContent.querySelectorAll('.tts-word'));
            }
            
            // Reconstruct text perfectly based on spans to align charIndex
            const reconstructedText = ttsWords.map(w => w.textContent).join(' ');
            return { text: reconstructedText, type: 'reader' };
            
        } else if (writerView.classList.contains('active')) {
            const start = writerEditor.selectionStart;
            const end = writerEditor.selectionEnd;
            if (start !== end) {
                return { text: writerEditor.value.substring(start, end), type: 'writer' };
            }
            return { text: writerEditor.value, type: 'writer' };
        }
        return { text: '', type: 'none' };
    }

    function startSpeaking() {
        if (synth.speaking && isPaused) {
            synth.resume();
            isPaused = false;
            updateUI();
            return;
        }

        if (synth.speaking) {
            synth.cancel();
        }

        const data = getTextToRead();
        if (!data.text || data.text.trim() === '') return;

        currentUtterance = new SpeechSynthesisUtterance(data.text);
        
        // Settings
        currentUtterance.rate = parseFloat(speedSelect.value);
        currentUtterance.pitch = 1.0;
        
        // Set selected voice
        const voices = synth.getVoices();
        if (voiceSelect && voiceSelect.selectedOptions.length > 0) {
            const selectedOption = voiceSelect.selectedOptions[0].getAttribute('data-name');
            const selectedVoice = voices.find(v => v.name === selectedOption);
            if (selectedVoice) {
                currentUtterance.voice = selectedVoice;
            }
        }

        // Events
        currentUtterance.onend = () => {
            isPaused = false;
            updateUI();
            // Clear highlights when done
            if (data.type === 'reader') {
                ttsWords.forEach(w => w.classList.remove('tts-highlight'));
            }
        };

        currentUtterance.onerror = (e) => {
            console.error("Speech synthesis error", e);
            isPaused = false;
            updateUI();
        };

        currentUtterance.onboundary = (event) => {
            if (event.name === 'word') {
                if (data.type === 'writer' && !window.getSelection().toString()) {
                    writerEditor.focus();
                    writerEditor.setSelectionRange(event.charIndex, event.charIndex + event.charLength);
                } else if (data.type === 'reader') {
                    ttsWords.forEach(w => w.classList.remove('tts-highlight'));
                    
                    let charCount = 0;
                    for (let i = 0; i < ttsWords.length; i++) {
                        const wordLen = ttsWords[i].textContent.length;
                        if (charCount <= event.charIndex && event.charIndex < charCount + wordLen + 1) {
                            ttsWords[i].classList.add('tts-highlight');
                            ttsWords[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                            break;
                        }
                        charCount += wordLen + 1; // +1 for the joined space
                    }
                }
            }
        };

        synth.speak(currentUtterance);
        isPaused = false;
        updateUI();
    }

    function pauseSpeaking() {
        if (synth.speaking && !isPaused) {
            synth.pause();
            isPaused = true;
            updateUI();
        }
    }

    function stopSpeaking() {
        if (synth.speaking) {
            synth.cancel();
            isPaused = false;
            updateUI();
        }
    }

    function updateUI() {
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

    // Event Listeners
    if (btnPlay) btnPlay.addEventListener('click', startSpeaking);
    if (btnPause) btnPause.addEventListener('click', pauseSpeaking);
    if (btnStop) btnStop.addEventListener('click', stopSpeaking);
    
    if (speedSelect) {
        speedSelect.addEventListener('change', () => {
            if (synth.speaking && currentUtterance) {
                // Changing speed mid-speech requires restarting the utterance in most browsers
                const text = currentUtterance.text;
                synth.cancel();
                setTimeout(() => startSpeaking(), 100);
            }
        });
    }

    // Populate voice dropdown
    function populateVoices() {
        if (!voiceSelect) return;
        let availableVoices = synth.getVoices();
        if (availableVoices.length === 0) return;

        // Store selected value to maintain selection during re-populate
        const currentSelectedName = voiceSelect.selectedOptions.length > 0 ? voiceSelect.selectedOptions[0].getAttribute('data-name') : null;

        voiceSelect.innerHTML = '';
        
        availableVoices.forEach((voice) => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            
            if (currentSelectedName && voice.name === currentSelectedName) {
                option.selected = true;
            }
            
            voiceSelect.appendChild(option);
        });
    }

    populateVoices(); // Try immediately

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }
});
