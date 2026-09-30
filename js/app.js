/**
 * Dyslexia Assistant - Main Application Controller
 * Handles view routing, settings modal, toast notifications, keyboard shortcuts.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // VIEW ROUTING
    // =========================================================================
    const navBtns = document.querySelectorAll('.sidebar-nav .nav-btn');
    const viewPanels = document.querySelectorAll('.view-panel');

    function switchView(viewId) {
        navBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.removeAttribute('aria-current');
            if (btn.getAttribute('data-view') === viewId) {
                btn.classList.add('active');
                btn.setAttribute('aria-current', 'page');
            }
        });
        viewPanels.forEach(panel => {
            panel.classList.remove('active');
            panel.hidden = true;
            if (panel.id === `view-${viewId}`) {
                panel.classList.add('active');
                panel.hidden = false;
            }
        });

        // Contextual toolbar visibility
        const readerTools = document.querySelector('.reader-tools');
        const ttsTools = document.querySelector('.tts-tools');
        if (viewId === 'reader') {
            readerTools.style.display = 'flex';
        } else {
            readerTools.style.display = 'none';
        }
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            const viewId = e.currentTarget.getAttribute('data-view');
            if (viewId) switchView(viewId);
        });
    });

    // Keyboard shortcuts for view switching
    document.addEventListener('keydown', e => {
        if (e.altKey) {
            if (e.key === '1') switchView('reader');
            if (e.key === '2') switchView('writer');
            if (e.key === '3') switchView('flashcards');
        }
    });


    // Toast notifications — disabled (silent no-op)
    window.showToast = function() {};


    // =========================================================================
    // SETTINGS MODAL
    // =========================================================================
    const settingsBtn = document.getElementById('toggle-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-modal');
    const saveSettingsBtn = document.getElementById('btn-save-settings');
    const resetSettingsBtn = document.getElementById('btn-reset-settings');

    const DEFAULT_SETTINGS = {
        fontFamily: 'OpenDyslexic',
        fontSize: '20px',
        lineHeight: '2.0',
        letterSpacing: true,
        tintOverlay: 'dark',
        highContrast: false,
        bionicReading: false,
        rulerType: 'mask',
        syllables: false,
        autoScroll: true
    };

    function loadSettings() {
        const saved = JSON.parse(localStorage.getItem('da_settings') || 'null');
        return saved ? { ...DEFAULT_SETTINGS, ...saved } : { ...DEFAULT_SETTINGS };
    }

    function saveSettings(settings) {
        localStorage.setItem('da_settings', JSON.stringify(settings));
    }

    function applySettings(settings) {
        const readerContent = document.getElementById('reader-content');
        const writerEditor = document.getElementById('writer-editor');

        // Font family
        const fontMap = {
            'OpenDyslexic': "'OpenDyslexic', Arial, sans-serif",
            'Lexend': "'Lexend', sans-serif",
            'Comic': "'Comic Sans MS', 'Comic Sans', cursive",
            'System': "system-ui, -apple-system, sans-serif"
        };
        const chosenFont = fontMap[settings.fontFamily] || fontMap['OpenDyslexic'];
        if (readerContent) readerContent.style.fontFamily = chosenFont;
        if (writerEditor) writerEditor.style.fontFamily = chosenFont;

        // Font size
        if (readerContent) readerContent.style.fontSize = settings.fontSize;
        if (writerEditor) writerEditor.style.fontSize = settings.fontSize;

        // Line height
        if (readerContent) readerContent.style.lineHeight = settings.lineHeight;
        if (writerEditor) writerEditor.style.lineHeight = settings.lineHeight;

        // Letter spacing
        const lsVal = settings.letterSpacing ? '0.08em' : 'normal';
        const wsVal = settings.letterSpacing ? '0.18em' : 'normal';
        if (readerContent) {
            readerContent.style.letterSpacing = lsVal;
            readerContent.style.wordSpacing = wsVal;
        }
        if (writerEditor) {
            writerEditor.style.letterSpacing = lsVal;
            writerEditor.style.wordSpacing = wsVal;
        }

        // Tint overlay
        if (readerContent) {
            readerContent.className = readerContent.className.replace(/tint-\S+/g, '').trim();
            if (settings.tintOverlay !== 'none') {
                readerContent.classList.add(`tint-${settings.tintOverlay}`);
            }
        }

        // High contrast
        if (settings.highContrast) {
            document.documentElement.classList.add('high-contrast-mode');
        } else {
            document.documentElement.classList.remove('high-contrast-mode');
        }

        // Store settings globally for other modules
        window.DA_SETTINGS = settings;
    }

    function populateSettingsUI(settings) {
        const els = {
            fontFamily: document.getElementById('setting-font-family'),
            fontSize: document.getElementById('setting-font-size'),
            lineHeight: document.getElementById('setting-line-height'),
            letterSpacing: document.getElementById('setting-letter-spacing'),
            tintOverlay: document.getElementById('setting-tint-overlay'),
            highContrast: document.getElementById('setting-high-contrast'),
            bionicReading: document.getElementById('setting-bionic-reading'),
            rulerType: document.getElementById('setting-ruler-type'),
            syllables: document.getElementById('setting-syllables'),
            autoScroll: document.getElementById('setting-auto-scroll')
        };
        if (els.fontFamily) els.fontFamily.value = settings.fontFamily;
        if (els.fontSize) els.fontSize.value = settings.fontSize;
        if (els.lineHeight) els.lineHeight.value = settings.lineHeight;
        if (els.letterSpacing) els.letterSpacing.checked = settings.letterSpacing;
        if (els.tintOverlay) els.tintOverlay.value = settings.tintOverlay;
        if (els.highContrast) els.highContrast.checked = settings.highContrast;
        if (els.bionicReading) els.bionicReading.checked = settings.bionicReading;
        if (els.rulerType) els.rulerType.value = settings.rulerType;
        if (els.syllables) els.syllables.checked = settings.syllables;
        if (els.autoScroll) els.autoScroll.checked = settings.autoScroll;
    }

    function collectSettingsFromUI() {
        return {
            fontFamily: document.getElementById('setting-font-family')?.value || 'OpenDyslexic',
            fontSize: document.getElementById('setting-font-size')?.value || '20px',
            lineHeight: document.getElementById('setting-line-height')?.value || '2.0',
            letterSpacing: document.getElementById('setting-letter-spacing')?.checked ?? true,
            tintOverlay: document.getElementById('setting-tint-overlay')?.value || 'dark',
            highContrast: document.getElementById('setting-high-contrast')?.checked ?? false,
            bionicReading: document.getElementById('setting-bionic-reading')?.checked ?? false,
            rulerType: document.getElementById('setting-ruler-type')?.value || 'mask',
            syllables: document.getElementById('setting-syllables')?.checked ?? false,
            autoScroll: document.getElementById('setting-auto-scroll')?.checked ?? true
        };
    }

    // Open settings modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            const settings = loadSettings();
            populateSettingsUI(settings);
            settingsModal.classList.remove('hidden');
        });
    }

    function closeSettings() {
        settingsModal.classList.add('hidden');
    }

    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);

    if (settingsModal) {
        settingsModal.addEventListener('click', e => {
            if (e.target === settingsModal) closeSettings();
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const settings = collectSettingsFromUI();
            saveSettings(settings);
            applySettings(settings);
            closeSettings();
            window.showToast('Settings saved!', '✓');
        });
    }

    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            saveSettings(DEFAULT_SETTINGS);
            populateSettingsUI(DEFAULT_SETTINGS);
            applySettings(DEFAULT_SETTINGS);
            window.showToast('Settings reset to defaults.', '↺');
        });
    }

    // Apply settings on load
    const initialSettings = loadSettings();
    applySettings(initialSettings);


    // =========================================================================
    // PASTE TEXT MODAL
    // =========================================================================
    const pasteModal = document.getElementById('paste-modal');
    const openPasteBtn = document.getElementById('btn-paste-modal');
    const closePasteBtn = document.getElementById('close-paste-modal');
    const cancelPasteBtn = document.getElementById('cancel-paste-btn');
    const submitPasteBtn = document.getElementById('submit-paste-btn');
    const pasteTextarea = document.getElementById('paste-textarea');

    function openPasteModal() {
        if (pasteModal) {
            pasteModal.classList.remove('hidden');
            if (pasteTextarea) pasteTextarea.focus();
        }
    }

    function closePasteModal() {
        if (pasteModal) pasteModal.classList.add('hidden');
    }

    if (openPasteBtn) openPasteBtn.addEventListener('click', openPasteModal);
    if (closePasteBtn) closePasteBtn.addEventListener('click', closePasteModal);
    if (cancelPasteBtn) cancelPasteBtn.addEventListener('click', closePasteModal);

    if (pasteModal) {
        pasteModal.addEventListener('click', e => {
            if (e.target === pasteModal) closePasteModal();
        });
    }

    if (submitPasteBtn) {
        submitPasteBtn.addEventListener('click', () => {
            const text = pasteTextarea?.value?.trim();
            if (!text) {
                showToast('Please paste some text first.', '⚠');
                return;
            }
            closePasteModal();
            // Dispatch a custom event for reader.js to handle
            document.dispatchEvent(new CustomEvent('da:loadText', { detail: { text } }));
            switchView('reader');
        });
    }

    // Expose openPasteModal globally
    window.openPasteModal = openPasteModal;


    // =========================================================================
    // GLOBAL ESCAPE KEY HANDLER
    // =========================================================================
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (settingsModal && !settingsModal.classList.contains('hidden')) closeSettings();
            if (pasteModal && !pasteModal.classList.contains('hidden')) closePasteModal();
        }
    });

    // =========================================================================
    // SYNC second file-upload-empty button
    // =========================================================================
    const fileUploadEmpty = document.getElementById('file-upload-empty');
    const fileUploadMain = document.getElementById('file-upload');

    if (fileUploadEmpty && fileUploadMain) {
        fileUploadEmpty.addEventListener('change', e => {
            // Clone event to main input so reader.js handles it
            const files = e.target.files;
            if (!files || files.length === 0) return;
            const file = files[0];
            document.dispatchEvent(new CustomEvent('da:loadFile', { detail: { file } }));
            fileUploadEmpty.value = '';
        });
    }

});
