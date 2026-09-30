/**
 * Dyslexia Assistant - Reader Logic
 * Handles file parsing, text rendering, styling modifiers (font, spacing, overlay),
 * reading ruler, bionic reading, syllables, word lookup, drag-drop, sample text.
 */

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-upload');
    const readerContent = document.getElementById('reader-content');
    const rulerEl = document.getElementById('reading-ruler');
    const wordLookupCard = document.getElementById('word-lookup-card');

    // Toolbar buttons
    const btnFont = document.getElementById('tool-font');
    const btnFontInc = document.getElementById('tool-font-inc');
    const btnFontDec = document.getElementById('tool-font-dec');
    const btnSpacing = document.getElementById('tool-spacing');
    const btnOverlay = document.getElementById('tool-overlay');
    const btnRuler = document.getElementById('tool-ruler');
    const btnBionic = document.getElementById('tool-bionic');
    const btnSyllables = document.getElementById('tool-syllables');
    const btnClearDoc = document.getElementById('tool-clear-doc');
    const btnLoadSample = document.getElementById('btn-load-sample');

    // State
    let fontMode = 0; // 0=OpenDyslexic, 1=Lexend, 2=System
    const fontCycles = [
        { label: 'OpenDyslexic', css: "'OpenDyslexic', Arial, sans-serif" },
        { label: 'Lexend', css: "'Lexend', sans-serif" },
        { label: 'System Sans', css: "system-ui, -apple-system, sans-serif" }
    ];
    let fontSizeBase = 1.25; // rem
    let isSpaced = false;
    let tintIndex = 0;
    const tintCycles = ['dark', 'cream', 'peach', 'mint', 'blue', 'rose'];
    let isRulerActive = false;
    let isBionicActive = false;
    let isSyllablesActive = false;
    let hasDocument = false;

    // =========================================================================
    // SAMPLE TEXT
    // =========================================================================
    const SAMPLE_TEXT = `The Secret Garden

Mary Lennox was born in India and had always been an ill-tempered child. Her parents were always busy and had little time for her, so she grew up alone and cross.

When her parents died of cholera, Mary was sent to live with her uncle, Archibald Craven, at Misselthwaite Manor in Yorkshire, England. The manor was enormous and had a hundred rooms, most of which were locked. Mary was lonely and bored.

One day, a friendly robin showed her a rusted key buried in the garden soil. Following the bird, she discovered a hidden door, overgrown with ivy, that led to a walled garden. The garden had been locked for ten years, ever since Mary's aunt had died there.

Mary began to secretly tend the garden, pulling weeds and turning soil. She found a friend in Dickon, a local boy who had a magical way with animals and plants. Together, they breathed life back into the garden.

Inside the manor, Mary also discovered her cousin, Colin — a boy who believed he was ill and would never grow up. He had spent his whole life in bed, refusing to believe in the world outside. Mary brought him to the secret garden, and little by little, the fresh air, sunlight, and the miracle of growing things healed him.

By the end of the summer, Colin stood tall and strong, his father returned from his grief, and the secret garden bloomed once more, full of roses and wonder — a place of magic, growth, and new beginnings for all of them.`;

    // =========================================================================
    // FILE HANDLING
    // =========================================================================
    function handleFile(file) {
        if (!file) return;
        setLoadingState();
        setTimeout(async () => {
            try {
                if (file.name.endsWith('.txt')) {
                    const text = await file.text();
                    renderText(text, file.name);
                } else if (file.name.endsWith('.docx')) {
                    await parseDocx(file);
                } else if (file.name.endsWith('.pdf')) {
                    await parsePdf(file);
                } else {
                    alert('Unsupported file format. Please use .txt, .pdf, or .docx');
                    showEmptyState();
                }
            } catch (err) {
                console.error(err);
                alert('Error reading file. Please try a plain text (.txt) file.');
                showEmptyState();
            }
        }, 50);
    }

    if (fileInput) {
        fileInput.addEventListener('change', e => {
            handleFile(e.target.files[0]);
            fileInput.value = '';
        });
    }

    // Custom event from app.js (paste or empty-state upload)
    document.addEventListener('da:loadText', e => {
        if (e.detail?.text) renderText(e.detail.text, 'Pasted Text');
        switchToReaderToolbar();
    });

    document.addEventListener('da:loadFile', e => {
        if (e.detail?.file) handleFile(e.detail.file);
        switchToReaderToolbar();
    });

    function switchToReaderToolbar() {
        document.querySelector('.reader-tools').style.display = 'flex';
    }

    function setLoadingState() {
        hasDocument = false;
        readerContent.classList.remove('empty');
        readerContent.innerHTML = `<div class="empty-state"><p class="text-muted">Loading document...</p></div>`;
    }

    function showEmptyState() {
        hasDocument = false;
        readerContent.classList.add('empty');
        if (btnClearDoc) btnClearDoc.style.display = 'none';
        readerContent.innerHTML = `
            <div class="empty-state">
                <h2 class="text-xl">Ready to Read.</h2>
                <p class="text-muted" style="text-align: center; max-width: 480px;">Upload your homework, book, or article (.txt, .pdf, .docx), or load a sample story to experience dyslexia-friendly reading.</p>
                <div class="empty-state-actions">
                    <label class="btn" style="cursor: pointer;">
                        <input type="file" id="file-upload-empty" accept=".txt,.pdf,.docx" class="sr-only">
                        Upload Document
                    </label>
                    <button class="btn" id="btn-load-sample-inline" style="background: rgba(255, 255, 255, 0.1); color: var(--text-primary);">Load Sample Story</button>
                    <button class="btn" id="btn-paste-modal-inline" style="background: rgba(255, 255, 255, 0.1); color: var(--text-primary);">Paste Custom Text</button>
                </div>
            </div>`;
        
        // Re-attach listeners on dynamically injected elements
        const inlineUpload = document.getElementById('file-upload-empty');
        if (inlineUpload) {
            inlineUpload.addEventListener('change', e => {
                handleFile(e.target.files[0]);
            });
        }
        const inlineSample = document.getElementById('btn-load-sample-inline');
        if (inlineSample) {
            inlineSample.addEventListener('click', loadSampleText);
        }
        const inlinePaste = document.getElementById('btn-paste-modal-inline');
        if (inlinePaste) {
            inlinePaste.addEventListener('click', () => window.openPasteModal && window.openPasteModal());
        }
    }

    function renderText(text, title = '') {
        const paragraphs = text.split(/\n+/).filter(p => p.trim() !== '');
        let html = '';
        if (title && title !== 'Pasted Text') {
            html += `<h2 class="text-lg" style="color: var(--accent-secondary); margin-bottom: 1.5em;">${title}</h2>`;
        }
        html += paragraphs.map(p => {
            const escapedP = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<p style="margin-bottom: 1.4em;">${escapedP}</p>`;
        }).join('');

        readerContent.classList.remove('empty');
        readerContent.innerHTML = `<div class="document-content" id="document-body">${html}</div>`;
        hasDocument = true;
        if (btnClearDoc) btnClearDoc.style.display = 'inline-flex';

        // Re-apply active display settings
        reapplyActiveModifiers();
        
        // Save to IndexedDB / localStorage
        try {
            localStorage.setItem('da_last_document', JSON.stringify({ title, text: text.substring(0, 50000) }));
        } catch(e) {}
        
        if (window.showToast) window.showToast(`Document loaded! (${paragraphs.length} paragraphs)`, '📖');
    }

    async function parseDocx(file) {
        if (typeof mammoth === 'undefined') {
            alert('DOCX parser not loaded. Check your internet connection.');
            showEmptyState();
            return;
        }
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        readerContent.classList.remove('empty');
        readerContent.innerHTML = `<div class="document-content" id="document-body">${result.value}</div>`;
        hasDocument = true;
        if (btnClearDoc) btnClearDoc.style.display = 'inline-flex';
        reapplyActiveModifiers();
        if (window.showToast) window.showToast('DOCX document loaded!', '📄');
    }

    async function parsePdf(file) {
        if (typeof pdfjsLib === 'undefined') {
            alert('PDF parser not loaded. Check your internet connection.');
            showEmptyState();
            return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

        readerContent.classList.remove('empty');
        readerContent.innerHTML = `<div class="document-content" id="document-body"><p class="text-muted">Extracting ${pdf.numPages} pages...</p></div>`;

        let fullHtml = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ').trim();
            if (pageText) fullHtml += `<p style="margin-bottom: 1.4em;">${pageText.replace(/</g,'&lt;')}</p>`;
        }
        document.getElementById('document-body').innerHTML = fullHtml || '<p class="text-muted">No readable text found in PDF.</p>';
        hasDocument = true;
        if (btnClearDoc) btnClearDoc.style.display = 'inline-flex';
        reapplyActiveModifiers();
        if (window.showToast) window.showToast(`PDF loaded! (${pdf.numPages} pages)`, '📑');
    }

    function loadSampleText() {
        renderText(SAMPLE_TEXT, 'The Secret Garden — Sample Story');
    }

    if (btnLoadSample) btnLoadSample.addEventListener('click', loadSampleText);

    if (btnClearDoc) {
        btnClearDoc.addEventListener('click', () => {
            if (confirm('Clear this document and go back to the upload screen?')) {
                showEmptyState();
                if (rulerEl) rulerEl.classList.add('hidden');
                isRulerActive = false;
                if (btnRuler) btnRuler.classList.remove('active');
            }
        });
    }

    // Restore last document from localStorage
    function tryRestoreLastDocument() {
        try {
            const saved = JSON.parse(localStorage.getItem('da_last_document'));
            if (saved && saved.text) {
                renderText(saved.text, saved.title || 'Last Session');
            }
        } catch(e) {}
    }

    // =========================================================================
    // DRAG & DROP SUPPORT
    // =========================================================================
    readerContent.addEventListener('dragover', e => {
        e.preventDefault();
        readerContent.classList.add('drop-zone-active');
    });
    readerContent.addEventListener('dragleave', () => {
        readerContent.classList.remove('drop-zone-active');
    });
    readerContent.addEventListener('drop', e => {
        e.preventDefault();
        readerContent.classList.remove('drop-zone-active');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });


    // =========================================================================
    // FONT CYCLE TOGGLE
    // =========================================================================
    if (btnFont) {
        btnFont.addEventListener('click', () => {
            fontMode = (fontMode + 1) % fontCycles.length;
            const chosen = fontCycles[fontMode];
            const docBody = document.getElementById('document-body');
            if (docBody) docBody.style.fontFamily = chosen.css;
            readerContent.style.fontFamily = chosen.css;
            btnFont.classList.add('active');
            if (fontMode === 0) btnFont.classList.remove('active');
            if (window.showToast) window.showToast(`Font: ${chosen.label}`, '🔡');
        });
    }

    // =========================================================================
    // FONT SIZE
    // =========================================================================
    if (btnFontInc) {
        btnFontInc.addEventListener('click', () => {
            fontSizeBase = Math.min(fontSizeBase + 0.1, 2.5);
            const docBody = document.getElementById('document-body');
            if (docBody) docBody.style.fontSize = fontSizeBase + 'rem';
        });
    }
    if (btnFontDec) {
        btnFontDec.addEventListener('click', () => {
            fontSizeBase = Math.max(fontSizeBase - 0.1, 0.9);
            const docBody = document.getElementById('document-body');
            if (docBody) docBody.style.fontSize = fontSizeBase + 'rem';
        });
    }

    // =========================================================================
    // SPACING TOGGLE
    // =========================================================================
    if (btnSpacing) {
        btnSpacing.addEventListener('click', () => {
            isSpaced = !isSpaced;
            btnSpacing.classList.toggle('active', isSpaced);
            const docBody = document.getElementById('document-body') || readerContent;
            docBody.style.letterSpacing = isSpaced ? '0.12em' : '';
            docBody.style.wordSpacing = isSpaced ? '0.28em' : '';
            docBody.style.lineHeight = isSpaced ? '2.6' : '';
            if (window.showToast) window.showToast(isSpaced ? 'Enhanced spacing ON' : 'Normal spacing restored', '↔');
        });
    }

    // =========================================================================
    // COLOUR TINT OVERLAY CYCLE
    // =========================================================================
    if (btnOverlay) {
        btnOverlay.addEventListener('click', () => {
            tintIndex = (tintIndex + 1) % tintCycles.length;
            const tint = tintCycles[tintIndex];
            readerContent.className = readerContent.className.replace(/tint-\S+/g, '').trim();
            if (tint !== 'none') readerContent.classList.add(`tint-${tint}`);
            btnOverlay.classList.toggle('active', tint !== 'dark');
            const tintLabels = {
                dark: 'Dark (Default)', cream: 'Cream', peach: 'Peach', mint: 'Mint', blue: 'Sky Blue', rose: 'Rose'
            };
            if (window.showToast) window.showToast(`Color overlay: ${tintLabels[tint]}`, '🎨');
        });
    }

    // =========================================================================
    // READING RULER
    // =========================================================================
    if (btnRuler) {
        btnRuler.addEventListener('click', () => {
            isRulerActive = !isRulerActive;
            btnRuler.classList.toggle('active', isRulerActive);
            if (!rulerEl) return;
            rulerEl.classList.toggle('hidden', !isRulerActive);
            
            const settings = window.DA_SETTINGS || {};
            if (settings.rulerType === 'line') {
                rulerEl.classList.add('line-mode');
            } else {
                rulerEl.classList.remove('line-mode');
            }

            if (window.showToast) window.showToast(isRulerActive ? 'Reading ruler ON — move mouse/use arrows' : 'Reading ruler OFF', '📏');
        });
    }

    document.addEventListener('mousemove', e => {
        if (!isRulerActive || !rulerEl) return;
        rulerEl.style.setProperty('--mouse-y', `${e.clientY}px`);
    });

    // Keyboard ruler control (up/down arrows)
    let rulerY = window.innerHeight / 2;
    document.addEventListener('keydown', e => {
        if (!isRulerActive || !rulerEl) return;
        if (e.key === 'ArrowDown') { rulerY = Math.min(rulerY + 20, window.innerHeight); rulerEl.style.setProperty('--mouse-y', `${rulerY}px`); e.preventDefault(); }
        if (e.key === 'ArrowUp') { rulerY = Math.max(rulerY - 20, 0); rulerEl.style.setProperty('--mouse-y', `${rulerY}px`); e.preventDefault(); }
    });

    // =========================================================================
    // BIONIC READING
    // =========================================================================
    function applyBionicReading(container) {
        const textNodes = [];
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode: node => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (['SCRIPT', 'STYLE', 'H1', 'H2', 'H3'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
                if (parent.classList.contains('tts-word') || parent.classList.contains('bionic-fixation')) return NodeFilter.FILTER_REJECT;
                return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        let node;
        while ((node = walker.nextNode())) textNodes.push(node);

        textNodes.forEach(textNode => {
            const words = textNode.nodeValue.split(/(\s+)/);
            const fragment = document.createDocumentFragment();
            words.forEach(word => {
                if (word.trim().length === 0) {
                    fragment.appendChild(document.createTextNode(word));
                } else {
                    const midpoint = Math.ceil(word.length / 2);
                    const boldPart = document.createElement('strong');
                    boldPart.className = 'bionic-fixation';
                    boldPart.textContent = word.substring(0, midpoint);
                    const normalPart = document.createTextNode(word.substring(midpoint));
                    fragment.appendChild(boldPart);
                    fragment.appendChild(normalPart);
                }
            });
            textNode.parentNode.replaceChild(fragment, textNode);
        });
    }

    function removeBionicReading(container) {
        const bolds = container.querySelectorAll('.bionic-fixation');
        bolds.forEach(bold => {
            const text = bold.textContent + (bold.nextSibling?.nodeType === Node.TEXT_NODE ? bold.nextSibling.nodeValue : '');
            const parent = bold.parentNode;
            if (bold.nextSibling?.nodeType === Node.TEXT_NODE) parent.removeChild(bold.nextSibling);
            parent.replaceChild(document.createTextNode(bold.textContent + (bold.nextSibling?.textContent || '')), bold);
        });
        // Merge text nodes
        container.normalize();
    }

    if (btnBionic) {
        btnBionic.addEventListener('click', () => {
            if (!hasDocument) { window.showToast && window.showToast('Load a document first!', '⚠'); return; }
            isBionicActive = !isBionicActive;
            btnBionic.classList.toggle('active', isBionicActive);
            const docBody = document.getElementById('document-body');
            if (!docBody) return;
            if (isBionicActive) {
                applyBionicReading(docBody);
                window.showToast && window.showToast('Bionic Reading ON', '🧠');
            } else {
                // Re-render from last saved doc
                const saved = JSON.parse(localStorage.getItem('da_last_document') || 'null');
                if (saved) renderText(saved.text, saved.title);
                window.showToast && window.showToast('Bionic Reading OFF', '🧠');
            }
        });
    }

    // =========================================================================
    // SYLLABLE DIVISION
    // =========================================================================
    function syllabifyText(word) {
        // Simple rule-based syllabification
        word = word.toLowerCase();
        const vowels = 'aeiouy';
        const result = [];
        let syllable = '';
        for (let i = 0; i < word.length; i++) {
            syllable += word[i];
            const isVowel = vowels.includes(word[i]);
            const nextIsConsonant = i + 1 < word.length && !vowels.includes(word[i + 1]);
            const prevWasVowel = i > 0 && vowels.includes(word[i - 1]);
            if (isVowel && nextIsConsonant && prevWasVowel && i < word.length - 2) {
                result.push(syllable);
                syllable = '';
            }
        }
        if (syllable) result.push(syllable);
        return result.length > 1 ? result : null;
    }

    if (btnSyllables) {
        btnSyllables.addEventListener('click', () => {
            if (!hasDocument) { window.showToast && window.showToast('Load a document first!', '⚠'); return; }
            isSyllablesActive = !isSyllablesActive;
            btnSyllables.classList.toggle('active', isSyllablesActive);
            const saved = JSON.parse(localStorage.getItem('da_last_document') || 'null');
            if (saved) renderText(saved.text, saved.title);
            window.showToast && window.showToast(isSyllablesActive ? 'Syllable dots ON' : 'Syllable dots OFF', '·');
        });
    }

    // =========================================================================
    // INTERACTIVE WORD LOOKUP (Click on word)
    // =========================================================================
    readerContent.addEventListener('click', e => {
        const target = e.target;
        if (target.tagName === 'SPAN' || target.tagName === 'P') {
            const selection = window.getSelection().toString().trim();
            if (selection && selection.split(' ').length === 1 && selection.length > 1) {
                showWordLookup(selection, e.clientX, e.clientY);
            }
        }
    });

    function showWordLookup(word, x, y) {
        if (!wordLookupCard) return;
        const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
        if (!cleanWord || cleanWord.length < 2) return;

        const syllables = syllabifyText(cleanWord);
        const syllableHtml = syllables ? `<div style="font-size: 0.85rem; color: var(--text-muted);">Syllables: <strong style="color: var(--accent-secondary);">${syllables.join('·')}</strong></div>` : '';

        wordLookupCard.innerHTML = `
            <div class="lookup-header">
                <span class="lookup-word-title">${cleanWord}</span>
                <button class="icon-btn-sm" id="lookup-close" aria-label="Close lookup">✕</button>
            </div>
            ${syllableHtml}
            <div style="font-size: 0.85rem; color: var(--text-muted);">Letters: ${cleanWord.length}</div>
            <div style="display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                <button class="srs-btn" id="lookup-tts-btn" style="font-size: 0.8rem; padding: 5px 10px;">🔊 Pronounce</button>
                <button class="srs-btn" id="lookup-fc-btn" style="font-size: 0.8rem; padding: 5px 10px;">+ Add to Flashcards</button>
            </div>
        `;

        // Position safely within viewport
        const cardW = 320;
        const cardH = 160;
        const px = Math.min(x + 10, window.innerWidth - cardW - 10);
        const py = Math.min(y + 10, window.innerHeight - cardH - 10);
        wordLookupCard.style.left = `${px}px`;
        wordLookupCard.style.top = `${py}px`;
        wordLookupCard.classList.remove('hidden');

        document.getElementById('lookup-close')?.addEventListener('click', () => wordLookupCard.classList.add('hidden'));

        document.getElementById('lookup-tts-btn')?.addEventListener('click', () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utt = new SpeechSynthesisUtterance(cleanWord);
                utt.rate = 0.85;
                window.speechSynthesis.speak(utt);
            }
        });

        document.getElementById('lookup-fc-btn')?.addEventListener('click', () => {
            // Add to flashcards via custom event
            document.dispatchEvent(new CustomEvent('da:addFlashcard', { detail: { front: cleanWord, back: syllables ? syllables.join('·') : cleanWord } }));
            window.showToast && window.showToast(`"${cleanWord}" added to Flashcards!`, '✓');
            wordLookupCard.classList.add('hidden');
        });
    }

    // Close word lookup on outside click
    document.addEventListener('click', e => {
        if (wordLookupCard && !wordLookupCard.contains(e.target) && !readerContent.contains(e.target)) {
            wordLookupCard.classList.add('hidden');
        }
    });


    // =========================================================================
    // REAPPLY ACTIVE MODIFIERS after re-render
    // =========================================================================
    function reapplyActiveModifiers() {
        const docBody = document.getElementById('document-body');
        if (!docBody) return;

        if (isSpaced) {
            docBody.style.letterSpacing = '0.12em';
            docBody.style.wordSpacing = '0.28em';
            docBody.style.lineHeight = '2.6';
        }
        if (fontMode !== 0) {
            docBody.style.fontFamily = fontCycles[fontMode].css;
        }
        if (isBionicActive) {
            applyBionicReading(docBody);
        }

        // Re-apply tint
        readerContent.className = readerContent.className.replace(/tint-\S+/g, '').trim();
        if (tintCycles[tintIndex] !== 'none') {
            readerContent.classList.add(`tint-${tintCycles[tintIndex]}`);
        }

        // Apply settings-based font
        const settings = window.DA_SETTINGS;
        if (settings) {
            const fontMap = {
                'OpenDyslexic': "'OpenDyslexic', Arial, sans-serif",
                'Lexend': "'Lexend', sans-serif",
                'Comic': "'Comic Sans MS', cursive",
                'System': "system-ui, sans-serif"
            };
            if (fontMode === 0 && settings.fontFamily) {
                readerContent.style.fontFamily = fontMap[settings.fontFamily] || fontMap['OpenDyslexic'];
            }
        }
    }

});
