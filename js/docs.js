/**
 * Dyslexia Assistant - Multi-Document Manager & Data Portability
 * Allows creating, editing, renaming, organizing, switching, and deleting
 * multiple documents. Provides full workspace JSON backup and restore,
 * plus TXT/Markdown/Printable export.
 */

(function () {
    'use strict';

    const DOCS_KEY = 'dyslexia_documents_list';
    const ACTIVE_DOC_KEY = 'dyslexia_active_doc_id';
    let documents = [];
    let activeDocId = null;

    function generateId() {
        return 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    function calculateWordCount(text) {
        if (!text) return 0;
        const matches = text.trim().match(/\S+/g);
        return matches ? matches.length : 0;
    }

    function loadDocuments() {
        try {
            const raw = localStorage.getItem(DOCS_KEY);
            documents = raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('Failed to load documents list, resetting to empty:', e);
            documents = [];
        }

        // Migrate existing single draft if documents list is empty
        if (documents.length === 0) {
            const legacyDraft = localStorage.getItem('dyslexia_assistant_draft') || '';
            const initialDoc = {
                id: generateId(),
                title: 'My First Document',
                content: legacyDraft || 'Welcome to your Dyslexia Assistant workspace!\n\nThis is a distraction-free writing environment designed to support your reading, writing, and cognitive flow.\n\n• Type freely without judgment.\n• Use the syllable counter, phonetic spell helper, or voice dictation.\n• Switch documents anytime or export your work.',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                wordCount: 0
            };
            initialDoc.wordCount = calculateWordCount(initialDoc.content);
            documents = [initialDoc];
            saveDocuments();
        }

        activeDocId = localStorage.getItem(ACTIVE_DOC_KEY);
        if (!activeDocId || !documents.some(d => d.id === activeDocId)) {
            activeDocId = documents[0].id;
            localStorage.setItem(ACTIVE_DOC_KEY, activeDocId);
        }
    }

    function saveDocuments() {
        try {
            localStorage.setItem(DOCS_KEY, JSON.stringify(documents));
            // Keep legacy draft updated with active document for backward compatibility
            const active = getActiveDocument();
            if (active) {
                localStorage.setItem('dyslexia_assistant_draft', active.content);
            }
        } catch (e) {
            console.error('Storage quota exceeded or storage error:', e);
            window.showToast?.('Could not auto-save: storage quota full', '⚠️');
        }
    }

    function getActiveDocument() {
        return documents.find(d => d.id === activeDocId) || documents[0] || null;
    }

    function createDocument(title = 'Untitled Note', initialContent = '') {
        const newDoc = {
            id: generateId(),
            title: title.trim() || 'Untitled Note',
            content: initialContent,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            wordCount: calculateWordCount(initialContent)
        };
        documents.unshift(newDoc);
        activeDocId = newDoc.id;
        localStorage.setItem(ACTIVE_DOC_KEY, activeDocId);
        saveDocuments();
        syncToEditor();
        updateUI();
        window.showToast?.(`Created "${newDoc.title}"`, '📄');
        return newDoc;
    }

    function switchDocument(id) {
        // Save current document before switching
        saveCurrentEditorContent();

        const target = documents.find(d => d.id === id);
        if (!target) return;

        activeDocId = target.id;
        localStorage.setItem(ACTIVE_DOC_KEY, activeDocId);
        syncToEditor();
        updateUI();
        window.showToast?.(`Opened "${target.title}"`, '📖');
    }

    function updateActiveTitle(newTitle) {
        const active = getActiveDocument();
        if (!active) return;
        active.title = (newTitle || 'Untitled Note').trim();
        active.updatedAt = Date.now();
        saveDocuments();
        updateDocBadges();
    }

    function deleteDocument(id) {
        if (documents.length <= 1) {
            window.showToast?.('Cannot delete the only remaining document.', '⚠️');
            return;
        }

        const docToDelete = documents.find(d => d.id === id);
        const title = docToDelete ? docToDelete.title : 'document';

        if (!confirm(`Are you sure you want to delete "${title}"?`)) {
            return;
        }

        documents = documents.filter(d => d.id !== id);

        if (activeDocId === id) {
            activeDocId = documents[0].id;
            localStorage.setItem(ACTIVE_DOC_KEY, activeDocId);
            syncToEditor();
        }

        saveDocuments();
        updateUI();
        window.showToast?.(`Deleted "${title}"`, '🗑️');
    }

    function saveCurrentEditorContent() {
        const editor = document.getElementById('writer-editor');
        const titleInput = document.getElementById('doc-title-input');
        if (!editor) return;

        const active = getActiveDocument();
        if (!active) return;

        active.content = editor.value;
        if (titleInput && titleInput.value.trim()) {
            active.title = titleInput.value.trim();
        }
        active.updatedAt = Date.now();
        active.wordCount = calculateWordCount(active.content);
        saveDocuments();
        updateDocBadges();
    }

    function syncToEditor() {
        const editor = document.getElementById('writer-editor');
        const titleInput = document.getElementById('doc-title-input');
        const active = getActiveDocument();
        if (!active || !editor) return;

        editor.value = active.content;
        if (titleInput) {
            titleInput.value = active.title;
        }

        // Trigger input event to update editor stats (word count, readability, etc.)
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function updateDocBadges() {
        const badge = document.getElementById('doc-count-badge');
        if (badge) {
            badge.textContent = String(documents.length);
        }
        const statusBadge = document.getElementById('doc-status-badge');
        if (statusBadge) {
            statusBadge.textContent = 'Saved ✓';
            statusBadge.classList.add('saved');
            clearTimeout(statusBadge._timeout);
            statusBadge._timeout = setTimeout(() => {
                statusBadge.textContent = 'Auto-saved';
                statusBadge.classList.remove('saved');
            }, 2000);
        }
    }

    function renderDocList(query = '') {
        const listContainer = document.getElementById('doc-list-items');
        if (!listContainer) return;

        const filterLower = (query || '').toLowerCase().trim();
        const filtered = documents.filter(d =>
            d.title.toLowerCase().includes(filterLower) ||
            d.content.toLowerCase().includes(filterLower)
        );

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="doc-empty-state">
                    <p>No documents found matching "${escapeHtml(query)}"</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filtered.map(doc => {
            const isActive = doc.id === activeDocId;
            const updatedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="doc-item ${isActive ? 'active' : ''}" data-doc-id="${doc.id}">
                    <div class="doc-item-main">
                        <div class="doc-item-title-row">
                            <span class="doc-item-title">${escapeHtml(doc.title)}</span>
                            ${isActive ? '<span class="badge badge-accent">Active</span>' : ''}
                        </div>
                        <div class="doc-item-meta">
                            <span>${doc.wordCount} words</span>
                            <span>•</span>
                            <span>Edited ${updatedDate}</span>
                        </div>
                    </div>
                    <div class="doc-item-actions">
                        ${!isActive ? `<button class="btn btn-sm btn-outline btn-open-doc" data-id="${doc.id}">Open</button>` : ''}
                        <button class="icon-btn-sm btn-delete-doc" data-id="${doc.id}" title="Delete document" aria-label="Delete document ${escapeHtml(doc.title)}">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach listeners
        listContainer.querySelectorAll('.btn-open-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                switchDocument(id);
                closeDocModal();
            });
        });

        listContainer.querySelectorAll('.btn-delete-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                deleteDocument(id);
                renderDocList(query);
            });
        });
    }

    function openDocModal() {
        const modal = document.getElementById('doc-library-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        renderDocList();
        const searchInput = document.getElementById('doc-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
    }

    function closeDocModal() {
        const modal = document.getElementById('doc-library-modal');
        if (modal) modal.classList.add('hidden');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // =========================================================================
    // EXPORT & BACKUP/RESTORE
    // =========================================================================
    function exportDocument(format = 'txt') {
        const active = getActiveDocument();
        if (!active) return;

        if (format === 'print') {
            window.print();
            return;
        }

        const safeTitle = (active.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
        let filename = `${safeTitle}.${format === 'md' ? 'md' : 'txt'}`;
        let content = active.content;

        if (format === 'md') {
            content = `# ${active.title}\n\n*Created with Dyslexia Assistant*\n\n---\n\n${active.content}`;
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.showToast?.(`Downloaded "${filename}"`, '⬇️');
    }

    function exportWorkspaceBackup() {
        const backupData = {
            version: 1,
            exportDate: new Date().toISOString(),
            documents: documents,
            flashcards: JSON.parse(localStorage.getItem('dyslexia_flashcards') || '[]'),
            settings: {
                fontFamily: localStorage.getItem('da_font_family') || 'OpenDyslexic',
                fontSize: localStorage.getItem('da_font_size') || '20px',
                tintOverlay: localStorage.getItem('da_tint') || 'cream'
            }
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dyslexia-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.showToast?.('Workspace backup exported successfully!', '💾');
    }

    function importWorkspaceBackup(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed || typeof parsed !== 'object') {
                    throw new Error('Invalid JSON format');
                }

                let importedDocsCount = 0;
                let importedCardsCount = 0;

                // Restore documents
                if (Array.isArray(parsed.documents)) {
                    parsed.documents.forEach(doc => {
                        if (doc && doc.title && typeof doc.content === 'string') {
                            const exists = documents.some(d => d.id === doc.id);
                            if (!exists) {
                                documents.push({
                                    id: doc.id || generateId(),
                                    title: String(doc.title).substring(0, 150),
                                    content: String(doc.content).substring(0, 300000),
                                    createdAt: doc.createdAt || Date.now(),
                                    updatedAt: doc.updatedAt || Date.now(),
                                    wordCount: calculateWordCount(doc.content)
                                });
                                importedDocsCount++;
                            }
                        }
                    });
                    saveDocuments();
                }

                // Restore flashcards
                if (Array.isArray(parsed.flashcards)) {
                    const existingCards = JSON.parse(localStorage.getItem('dyslexia_flashcards') || '[]');
                    parsed.flashcards.forEach(card => {
                        if (card && card.front && card.back) {
                            const exists = existingCards.some(c => c.front === card.front);
                            if (!exists) {
                                existingCards.push({
                                    front: String(card.front).substring(0, 200),
                                    back: String(card.back).substring(0, 500),
                                    srsLevel: card.srsLevel || 0,
                                    nextReview: card.nextReview || Date.now()
                                });
                                importedCardsCount++;
                            }
                        }
                    });
                    localStorage.setItem('dyslexia_flashcards', JSON.stringify(existingCards));
                }

                syncToEditor();
                updateUI();
                window.showToast?.(`Imported ${importedDocsCount} docs and ${importedCardsCount} flashcards!`, '✓');
            } catch (err) {
                console.error('Import error:', err);
                alert('Invalid backup file. Please ensure it is a valid Dyslexia Assistant backup JSON file.');
            }
        };
        reader.readAsText(file);
    }

    function updateUI() {
        updateDocBadges();
        const active = getActiveDocument();
        const titleInput = document.getElementById('doc-title-input');
        if (active && titleInput && document.activeElement !== titleInput) {
            titleInput.value = active.title;
        }
    }

    window.DA_Docs = {
        load: loadDocuments,
        createDocument,
        switchDocument,
        updateActiveTitle,
        deleteDocument,
        saveCurrentEditorContent,
        exportDocument,
        exportWorkspaceBackup,
        importWorkspaceBackup,
        openDocModal,
        closeDocModal,
        renderDocList,
        getDocuments: () => documents,
        getActiveDocument,
        initUI() {
            loadDocuments();

            const titleInput = document.getElementById('doc-title-input');
            const btnDocLibrary = document.getElementById('btn-doc-library');
            const btnNewDoc = document.getElementById('btn-new-doc');
            const btnExportDoc = document.getElementById('btn-export-doc');
            const closeDocModalBtn = document.getElementById('close-doc-modal');
            const searchInput = document.getElementById('doc-search-input');
            const btnModalNewDoc = document.getElementById('btn-modal-new-doc');

            // Backup & restore in settings
            const btnExportBackup = document.getElementById('btn-export-backup');
            const backupFileInput = document.getElementById('backup-file-input');

            if (titleInput) {
                titleInput.addEventListener('input', (e) => {
                    updateActiveTitle(e.target.value);
                });
            }

            const editor = document.getElementById('writer-editor');
            if (editor) {
                editor.addEventListener('input', () => {
                    const active = getActiveDocument();
                    if (active) {
                        active.content = editor.value;
                        active.updatedAt = Date.now();
                        active.wordCount = calculateWordCount(active.content);
                        saveDocuments();
                        updateDocBadges();
                    }
                });
            }

            if (btnDocLibrary) {
                btnDocLibrary.addEventListener('click', openDocModal);
            }

            if (btnNewDoc) {
                btnNewDoc.addEventListener('click', () => {
                    createDocument('New Document');
                });
            }

            if (btnModalNewDoc) {
                btnModalNewDoc.addEventListener('click', () => {
                    createDocument('New Document');
                    closeDocModal();
                });
            }

            if (closeDocModalBtn) {
                closeDocModalBtn.addEventListener('click', closeDocModal);
            }

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    renderDocList(e.target.value);
                });
            }

            if (btnExportDoc) {
                btnExportDoc.addEventListener('click', () => {
                    const format = prompt('Export format: Enter "txt", "md" (Markdown), or "print" (PDF printable):', 'txt');
                    if (format) {
                        exportDocument(format.trim().toLowerCase());
                    }
                });
            }

            if (btnExportBackup) {
                btnExportBackup.addEventListener('click', exportWorkspaceBackup);
            }

            if (backupFileInput) {
                backupFileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        importWorkspaceBackup(e.target.files[0]);
                        e.target.value = ''; // Reset input
                    }
                });
            }

            // Periodic auto-save every 4 seconds when typing
            setInterval(saveCurrentEditorContent, 4000);

            // Sync initial document to editor
            syncToEditor();
            updateUI();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        window.DA_Docs.initUI();
    });
})();
