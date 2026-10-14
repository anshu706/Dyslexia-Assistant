/**
 * Dyslexia Assistant - Editor Logic
 * Handles distraction-free writing, word count, reading level stats,
 * phonetic spelling help, dictation (Web Speech API), copy, download,
 * send-to-reader, and read-back.
 */

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('writer-editor');
    const wordCountEl = document.getElementById('word-count-num');
    const charCountEl = document.getElementById('char-count-num');
    const readTimeEl = document.getElementById('read-time-num');
    const readingLevelEl = document.getElementById('reading-level');
    const readingEaseEl = document.getElementById('reading-ease');
    const suggestionsPopover = document.getElementById('phonetic-suggestions');

    if (!editor) return;

    // =========================================================================
    // EXTENDED PHONETIC DICTIONARY
    // =========================================================================
    const dictionary = {
        'teh': 'the', 'adn': 'and', 'nad': 'and', 'waht': 'what', 'taht': 'that',
        'thier': 'their', 'recieve': 'receive', 'beleive': 'believe', 'frend': 'friend',
        'bcoz': 'because', 'becaus': 'because', 'becuase': 'because', 'becaise': 'because',
        'alot': 'a lot', 'allot': 'a lot', 'alright': 'all right',
        'tommorow': 'tomorrow', 'tomarrow': 'tomorrow', 'tmorrow': 'tomorrow',
        'realy': 'really', 'definately': 'definitely', 'wierd': 'weird',
        'untill': 'until', 'occured': 'occurred', 'seperate': 'separate',
        'privilage': 'privilege', 'occassion': 'occasion', 'neccessary': 'necessary',
        'wrtie': 'write', 'writng': 'writing', 'reding': 'reading', 'learing': 'learning',
        'skool': 'school', 'scool': 'school', 'schol': 'school',
        'siad': 'said', 'saied': 'said', 'sayed': 'said',
        'whn': 'when', 'wen': 'when', 'wher': 'where', 'ther': 'there',
        'poeple': 'people', 'peple': 'people', 'pepole': 'people',
        'thinkng': 'thinking', 'makeing': 'making', 'comeing': 'coming',
        'runing': 'running', 'swiming': 'swimming', 'stoped': 'stopped',
        'diferent': 'different', 'differnt': 'different', 'difrent': 'different',
        'intresting': 'interesting', 'intersting': 'interesting',
        'becasue': 'because', 'problm': 'problem', 'problim': 'problem',
        'wich': 'which', 'whcih': 'which', 'thng': 'thing', 'tihng': 'thing'
    };

    // =========================================================================
    // AUTO-RESTORE DRAFT
    // =========================================================================
    const savedText = localStorage.getItem('dyslexia_assistant_draft');
    if (savedText) {
        editor.value = savedText;
        updateStats(savedText);
    }

    editor.addEventListener('input', e => {
        const text = e.target.value;
        localStorage.setItem('dyslexia_assistant_draft', text);
        updateStats(text);
        checkSpelling(text);
    });

    editor.addEventListener('click', () => {
        if (suggestionsPopover) suggestionsPopover.classList.add('hidden');
    });

    // =========================================================================
    // STATS (Word count, char count, reading time, Flesch-Kincaid, ease)
    // =========================================================================
    function updateStats(text) {
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const count = words.length;
        const chars = text.length;

        if (wordCountEl) wordCountEl.textContent = count;
        if (charCountEl) charCountEl.textContent = chars;
        if (readTimeEl) readTimeEl.textContent = Math.max(1, Math.round(count / 200)); // 200 wpm

        // Flesch-Kincaid Grade Level
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
        const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);

        let grade = 0;
        if (count > 0) {
            grade = Math.round(0.39 * (count / sentences) + 11.8 * (syllables / count) - 15.59);
            grade = Math.max(1, Math.min(grade, 16));
        }

        if (readingLevelEl) {
            readingLevelEl.textContent = count === 0 ? 'Grade — Level' : `Grade ${grade} Level`;
        }

        // Flesch Reading Ease Score
        if (readingEaseEl && count > 0) {
            const ease = Math.round(206.835 - 1.015 * (count / sentences) - 84.6 * (syllables / count));
            const easeClamp = Math.max(0, Math.min(100, ease));
            let easeLabel = 'Very Difficult';
            let easeClass = 'badge badge-accent';
            if (easeClamp >= 80) { easeLabel = 'Very Easy'; easeClass = 'badge badge-success'; }
            else if (easeClamp >= 60) { easeLabel = 'Easy'; easeClass = 'badge badge-success'; }
            else if (easeClamp >= 40) { easeLabel = 'Moderate'; easeClass = 'badge'; }
            else if (easeClamp >= 20) { easeLabel = 'Difficult'; easeClass = 'badge badge-accent'; }

            readingEaseEl.textContent = easeLabel;
            readingEaseEl.className = easeClass;
        }
    }

    function countSyllables(word) {
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        const match = word.match(/[aeiouy]{1,2}/g);
        return match ? match.length : 1;
    }

    // =========================================================================
    // PHONETIC SPELL CHECK
    // =========================================================================
    function checkSpelling(text) {
        if (!suggestionsPopover) return;
        const words = text.split(/\s+/);
        const lastWord = words[words.length - 2];

        if (text.endsWith(' ') && lastWord) {
            const clean = lastWord.replace(/[.,!?;:'"]/g, '').toLowerCase();
            if (dictionary[clean]) {
                showSuggestion(clean, dictionary[clean]);
            } else {
                suggestionsPopover.classList.add('hidden');
            }
        }
    }

    function showSuggestion(wrong, correct) {
        if (!suggestionsPopover) return;
        suggestionsPopover.innerHTML = `
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Did you mean?</div>
            <button class="suggestion-item" data-correct="${correct}">
                <span>✏ <strong style="color: var(--success);">${correct}</strong></span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Replace</span>
            </button>
            <button class="suggestion-item" id="ignore-suggestion" style="background: transparent; border-color: transparent; color: var(--text-muted); font-size: 0.8rem; padding: 4px 8px;">
                Ignore
            </button>
        `;
        suggestionsPopover.style.top = '60px';
        suggestionsPopover.style.right = '20px';
        suggestionsPopover.style.left = 'auto';
        suggestionsPopover.classList.remove('hidden');

        suggestionsPopover.querySelector('.suggestion-item[data-correct]')?.addEventListener('click', () => {
            applyCorrection(wrong, correct);
        });
        document.getElementById('ignore-suggestion')?.addEventListener('click', () => {
            suggestionsPopover.classList.add('hidden');
        });
    }

    function applyCorrection(wrong, correct) {
        const regex = new RegExp(`\\b${wrong}\\b(?!.*\\b${wrong}\\b)`, 'i');
        editor.value = editor.value.replace(regex, correct);
        localStorage.setItem('dyslexia_assistant_draft', editor.value);
        suggestionsPopover.classList.add('hidden');
        editor.focus();
        updateStats(editor.value);
        window.showToast && window.showToast(`Corrected "${wrong}" → "${correct}"`, '✏');
    }

    // =========================================================================
    // COPY TO CLIPBOARD
    // =========================================================================
    const btnCopy = document.getElementById('btn-copy-writer');
    if (btnCopy) {
        btnCopy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(editor.value);
                window.showToast && window.showToast('Copied to clipboard!', '📋');
            } catch {
                editor.select();
                document.execCommand('copy');
                window.showToast && window.showToast('Copied!', '📋');
            }
        });
    }

    // =========================================================================
    // DOWNLOAD (.txt)
    // =========================================================================
    const btnDownload = document.getElementById('btn-download-writer');
    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            const text = editor.value;
            if (!text.trim()) { window.showToast && window.showToast('Nothing to download!', '⚠'); return; }
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my-writing-${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            window.showToast && window.showToast('Downloaded!', '⬇');
        });
    }

    // =========================================================================
    // CLEAR EDITOR
    // =========================================================================
    const btnClear = document.getElementById('btn-clear-writer');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (editor.value.trim() && !confirm('Clear your writing? This cannot be undone.')) return;
            editor.value = '';
            localStorage.removeItem('dyslexia_assistant_draft');
            updateStats('');
            editor.focus();
            window.showToast && window.showToast('Editor cleared.', '🗑');
        });
    }

    // =========================================================================
    // SEND TO READER VIEW
    // =========================================================================
    const btnSendReader = document.getElementById('btn-send-reader');
    if (btnSendReader) {
        btnSendReader.addEventListener('click', () => {
            const text = editor.value.trim();
            if (!text) { window.showToast && window.showToast('Write something first!', '⚠'); return; }
            document.dispatchEvent(new CustomEvent('da:loadText', { detail: { text, title: 'My Writing' } }));
            window.DA_switchView?.('reader');
            window.showToast && window.showToast('Sent to Reader!', '📖');
        });
    }

    // =========================================================================
    // READ BACK (TTS)
    // =========================================================================
    const btnSpeakWriter = document.getElementById('btn-speak-writer');
    if (btnSpeakWriter) {
        btnSpeakWriter.addEventListener('click', () => {
            const text = editor.value.trim();
            if (!text) { window.showToast && window.showToast('Nothing to read!', '⚠'); return; }
            if (!('speechSynthesis' in window)) { window.showToast && window.showToast('TTS not supported.', '⚠'); return; }
            window.speechSynthesis.cancel();
            const selStart = editor.selectionStart;
            const selEnd = editor.selectionEnd;
            const readText = selStart !== selEnd ? editor.value.substring(selStart, selEnd) : text;
            const utt = new SpeechSynthesisUtterance(readText);
            utt.rate = parseFloat(document.getElementById('tts-speed')?.value || '1');
            window.speechSynthesis.speak(utt);
            window.showToast && window.showToast('Reading your text aloud...', '🔊');
        });
    }

    // =========================================================================
    // VOICE DICTATION (Web Speech Recognition)
    // =========================================================================
    const btnDictate = document.getElementById('btn-dictate');
    const dictateLabel = document.getElementById('dictate-label');
    let recognition = null;
    let isRecording = false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition && btnDictate) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian English default

        let interimText = '';

        recognition.onresult = event => {
            let interim = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalText += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            if (finalText) {
                const cursorPos = editor.selectionStart;
                const before = editor.value.substring(0, cursorPos);
                const after = editor.value.substring(editor.selectionEnd);
                const insertText = (before.length > 0 && !before.endsWith(' ')) ? ' ' + finalText : finalText;
                editor.value = before + insertText + after;
                editor.selectionStart = editor.selectionEnd = cursorPos + insertText.length;
                localStorage.setItem('dyslexia_assistant_draft', editor.value);
                updateStats(editor.value);
            }
        };

        recognition.onerror = e => {
            console.warn('Speech recognition error:', e.error);
            stopRecording();
        };

        recognition.onend = () => {
            if (isRecording) recognition.start(); // continuous
        };

        btnDictate.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });

        function startRecording() {
            isRecording = true;
            recognition.start();
            btnDictate.classList.add('recording-pulse');
            if (dictateLabel) dictateLabel.textContent = 'Stop Dictation';
            window.showToast && window.showToast('Dictation started. Speak clearly!', '🎙');
        }

        function stopRecording() {
            isRecording = false;
            recognition.stop();
            btnDictate.classList.remove('recording-pulse');
            if (dictateLabel) dictateLabel.textContent = 'Dictate';
            window.showToast && window.showToast('Dictation stopped.', '⏹');
        }
    } else if (btnDictate) {
        btnDictate.title = 'Voice dictation not supported in this browser';
        btnDictate.style.opacity = '0.4';
        btnDictate.disabled = true;
    }

});
