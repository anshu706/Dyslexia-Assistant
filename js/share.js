/**
 * share.js - Dyslexia Assistant One-Click Teacher & Student Share Engine
 * 
 * Capabilities:
 *  - Generates shareable URLs with pre-configured dyslexia reading accommodations:
 *      • Embedded text/lesson
 *      • Calming background tint (Sage, Cream, Blue, Peach, etc.)
 *      • Specialized typography (Lexend, OpenDyslexic)
 *      • Bionic reading mode state
 *  - Handles long-form texts gracefully via URL Hash fragment encoding
 *  - Automatically hydrates incoming links upon load with celebratory notification
 *  - One-click copy and direct sharing via WhatsApp, Classroom, and Email
 */

(function () {
    'use strict';

    function getCurrentWorkspaceState() {
        // Grab active reader text
        const readerContent = document.getElementById('reader-content');
        let text = readerContent ? readerContent.innerText.trim() : '';

        // Fallback to active writer text if reader is empty
        if (!text) {
            const writerEditor = document.getElementById('writer-editor');
            if (writerEditor) text = writerEditor.value.trim();
        }

        // Active font
        let font = 'lexend';
        if (document.body.classList.contains('font-opendyslexic')) font = 'opendyslexic';
        else if (document.body.classList.contains('font-ransom')) font = 'ransom';
        else if (document.body.classList.contains('font-system')) font = 'system';

        // Active tint
        const activeSwatch = document.querySelector('.swatch-btn.active');
        const tint = activeSwatch ? activeSwatch.getAttribute('data-tint') : 'cream';

        // Active bionic mode
        const bionicBtn = document.getElementById('tool-bionic');
        const bionic = bionicBtn && bionicBtn.classList.contains('active') ? 1 : 0;

        return { text, font, tint, bionic };
    }

    function createShareUrl(customText) {
        const state = getCurrentWorkspaceState();
        const text = customText !== undefined ? customText : state.text;

        const base = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();

        if (state.font) params.set('font', state.font);
        if (state.tint) params.set('tint', state.tint);
        if (state.bionic) params.set('bionic', '1');

        if (!text) {
            return `${base}?${params.toString()}`;
        }

        // For shorter texts (< 1200 chars), use search params for clean URLs
        if (text.length < 1200) {
            params.set('read', encodeURIComponent(text));
            return `${base}?${params.toString()}`;
        }

        // For long reading lessons, use hash fragment to prevent HTTP URI length overflow
        const hashData = encodeURIComponent(text);
        return `${base}?${params.toString()}#read=${hashData}`;
    }

    function openShareModal() {
        const modal = document.getElementById('share-modal');
        const input = document.getElementById('share-link-input');
        const preview = document.getElementById('share-text-preview');
        if (!modal) return;

        const state = getCurrentWorkspaceState();
        if (!state.text) {
            window.showToast?.('Please add or paste text into the Reader or Writer first!', '⚠️');
            return;
        }

        const shareUrl = createShareUrl();
        if (input) input.value = shareUrl;
        if (preview) {
            preview.textContent = state.text.length > 120 ? `${state.text.substring(0, 120)}...` : state.text;
        }

        modal.classList.remove('hidden');
        input?.select();
    }

    function closeShareModal() {
        const modal = document.getElementById('share-modal');
        if (modal) modal.classList.add('hidden');
    }

    function copyShareLink() {
        const input = document.getElementById('share-link-input');
        if (!input || !input.value) return;

        navigator.clipboard.writeText(input.value).then(() => {
            window.showToast?.('Link copied! Ready to share with students or tutors.', '📋');
            const copyBtn = document.getElementById('btn-copy-share-link');
            if (copyBtn) {
                const orig = copyBtn.innerText;
                copyBtn.innerText = 'Copied! ✓';
                setTimeout(() => { copyBtn.innerText = orig; }, 2000);
            }
        }).catch(() => {
            input.select();
            document.execCommand('copy');
            window.showToast?.('Link copied to clipboard!', '📋');
        });
    }

    // ─── INCOMING LINK HYDRATION ──────────────────────────────────────────────

    function checkForIncomingShare() {
        let textToLoad = null;
        const searchParams = new URLSearchParams(window.location.search);

        // Check search param
        if (searchParams.has('read')) {
            try {
                textToLoad = decodeURIComponent(searchParams.get('read'));
            } catch (_) {
                textToLoad = searchParams.get('read');
            }
        }

        // Check hash fragment
        if (!textToLoad && window.location.hash.startsWith('#read=')) {
            try {
                textToLoad = decodeURIComponent(window.location.hash.replace('#read=', ''));
            } catch (_) {
                textToLoad = window.location.hash.replace('#read=', '');
            }
        }

        if (!textToLoad) return;

        // Apply visual accommodations from link
        const font = searchParams.get('font');
        const tint = searchParams.get('tint');
        const bionic = searchParams.get('bionic');

        if (font) {
            document.body.classList.remove('font-lexend', 'font-opendyslexic', 'font-ransom', 'font-system');
            document.body.classList.add(`font-${font}`);
        }

        if (tint) {
            document.body.classList.remove(
                'tint-cream', 'tint-mint', 'tint-dark', 'tint-blue',
                'tint-lavender', 'tint-peach', 'tint-rose', 'tint-amber'
            );
            document.body.classList.add(`tint-${tint}`);
            document.querySelectorAll('.swatch-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-tint') === tint);
            });
        }

        // Switch to Reader and load text
        setTimeout(() => {
            window.DA_switchView?.('reader');
            const readerContent = document.getElementById('reader-content');
            if (readerContent) {
                // If the app has custom markdown or formatted parsing, load it
                readerContent.innerText = textToLoad;

                // Trigger bionic if requested
                if (bionic === '1' && window.DA_toggleBionic) {
                    window.DA_toggleBionic(true);
                }

                // Count words
                const wordCount = textToLoad.trim().split(/\s+/).filter(Boolean).length;
                window.DA_Stats?.recordWords(wordCount);

                window.showToast?.(`📖 Shared lesson loaded (${wordCount} words) with your accommodations!`, '🎉');
            }

            // Clean URL query without page reload
            try {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            } catch (_) {}
        }, 350);
    }

    // Export Global API
    window.DA_Share = {
        createShareUrl,
        openShareModal,
        closeShareModal,
        copyShareLink
    };

    // Auto-init on load
    document.addEventListener('DOMContentLoaded', () => {
        // Wire up buttons
        document.getElementById('btn-share-lesson')?.addEventListener('click', openShareModal);
        document.getElementById('close-share-modal')?.addEventListener('click', closeShareModal);
        document.getElementById('btn-copy-share-link')?.addEventListener('click', copyShareLink);
        document.getElementById('share-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'share-modal') closeShareModal();
        });

        // WhatsApp share button
        document.getElementById('btn-share-whatsapp')?.addEventListener('click', () => {
            const link = document.getElementById('share-link-input')?.value || '';
            const text = encodeURIComponent(`Here is your dyslexia-friendly reading lesson on Dyslexia Assistant: ${link}`);
            window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
        });

        // Email share button
        document.getElementById('btn-share-email')?.addEventListener('click', () => {
            const link = document.getElementById('share-link-input')?.value || '';
            const subject = encodeURIComponent('Dyslexia-Friendly Reading Lesson');
            const body = encodeURIComponent(`Hi!\n\nHere is your customized reading lesson with dyslexia visual accommodations and text-to-speech:\n\n${link}\n\nHappy reading!`);
            window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        });

        checkForIncomingShare();
    });
})();
