/**
 * Dyslexia Assistant - Reader Logic
 * Handles file parsing, styling modifiers, and the reading ruler.
 */

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-upload');
    const readerContent = document.getElementById('reader-content');
    
    // Formatting Toggles
    const btnFont = document.getElementById('tool-font');
    const btnSpacing = document.getElementById('tool-spacing');
    const btnOverlay = document.getElementById('tool-overlay');
    const btnRuler = document.getElementById('tool-ruler');
    const rulerEl = document.getElementById('reading-ruler');
    
    let isDyslexicFont = false;
    let isSpaced = false;
    let isOverlay = false;
    let isRulerActive = false;

    // --- File Handling ---
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            readerContent.innerHTML = '<div class="empty-state"><p class="text-muted">Loading document...</p></div>';
            readerContent.classList.remove('empty');

            try {
                if (file.name.endsWith('.txt')) {
                    const text = await file.text();
                    renderText(text);
                } else if (file.name.endsWith('.docx')) {
                    await parseDocx(file);
                } else if (file.name.endsWith('.pdf')) {
                    await parsePdf(file);
                } else {
                    alert('Unsupported file format.');
                    readerContent.classList.add('empty');
                    readerContent.innerHTML = '<div class="empty-state"><h2 class="text-xl">Ready to Read.</h2><p class="text-muted">Upload a .txt, .pdf, or .docx file to begin.</p></div>';
                }
            } catch (err) {
                console.error(err);
                alert('Error reading file. Please try a text file instead.');
            }
        });
    }

    function renderText(text) {
        // Simple paragraph splitting for txt files
        const paragraphs = text.split('\n').filter(p => p.trim() !== '');
        const html = paragraphs.map(p => `<p style="margin-bottom: 1.5em;">${p}</p>`).join('');
        readerContent.innerHTML = `<div class="document-content" style="padding: 2rem;">${html}</div>`;
    }

    async function parseDocx(file) {
        if (typeof mammoth === 'undefined') {
            alert('Docx parser not loaded. Make sure you are online.');
            return;
        }
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        readerContent.innerHTML = `<div class="document-content" style="padding: 2rem;">${result.value}</div>`;
    }

    async function parsePdf(file) {
        if (typeof pdfjsLib === 'undefined') {
            alert('PDF parser not loaded. Make sure you are online.');
            return;
        }
        
        // Setup PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `<p style="margin-bottom: 1.5em;">${pageText}</p>`;
        }
        
        readerContent.innerHTML = `<div class="document-content" style="padding: 2rem;">${fullText}</div>`;
    }

    // --- Styling Modifiers ---
    btnFont.addEventListener('click', () => {
        isDyslexicFont = !isDyslexicFont;
        btnFont.classList.toggle('active');
        readerContent.style.fontFamily = isDyslexicFont ? 'OpenDyslexic, sans-serif' : 'var(--font-body)';
    });

    btnSpacing.addEventListener('click', () => {
        isSpaced = !isSpaced;
        btnSpacing.classList.toggle('active');
        readerContent.style.letterSpacing = isSpaced ? '0.1em' : 'normal';
        readerContent.style.wordSpacing = isSpaced ? '0.25em' : 'normal';
        readerContent.style.lineHeight = isSpaced ? '2.5' : '1.8';
    });

    btnOverlay.addEventListener('click', () => {
        isOverlay = !isOverlay;
        btnOverlay.classList.toggle('active');
        if (isOverlay) {
            document.body.style.backgroundColor = '#fcf9e8'; // Light yellow tint
            document.body.style.color = '#111';
            readerContent.style.color = '#111';
        } else {
            document.body.style.backgroundColor = 'var(--bg-color)';
            document.body.style.color = 'var(--text-primary)';
            readerContent.style.color = '';
        }
    });

    // --- Reading Ruler ---
    btnRuler.addEventListener('click', () => {
        isRulerActive = !isRulerActive;
        btnRuler.classList.toggle('active');
        if (isRulerActive) {
            rulerEl.classList.remove('hidden');
        } else {
            rulerEl.classList.add('hidden');
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isRulerActive) return;
        rulerEl.style.setProperty('--mouse-y', `${e.clientY}px`);
    });
});
