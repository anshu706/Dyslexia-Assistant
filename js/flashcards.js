/**
 * Dyslexia Assistant - Flashcards Logic
 * Handles creating, displaying, flipping, SRS rating, study focus mode,
 * starter deck loading, filter (all/due), grid/study view modes, and
 * quick-add from word lookup.
 */

document.addEventListener('DOMContentLoaded', () => {
    const inputFront = document.getElementById('fc-front');
    const inputBack = document.getElementById('fc-back');
    const btnAdd = document.getElementById('fc-add');
    const cardsGrid = document.getElementById('cards-grid');
    const totalCardsCount = document.getElementById('total-cards-count');
    const dueCardsCount = document.getElementById('due-cards-count');
    const studyModeContainer = document.getElementById('study-mode-container');
    const studyCardSlot = document.getElementById('study-card-slot');
    const studyCounter = document.getElementById('study-counter');

    if (!btnAdd) return;

    // =========================================================================
    // STATE
    // =========================================================================
    let flashcards = [];
    try {
        const savedCards = JSON.parse(localStorage.getItem('dyslexia_flashcards') || '[]');
        flashcards = Array.isArray(savedCards) ? savedCards : [];
    } catch (error) {
        console.warn('Saved flashcards were invalid; starting with an empty deck.', error);
        window.showToast?.('Saved flashcards could not be read and were reset.', '⚠');
    }
    let currentFilter = 'all';
    let currentMode = 'grid'; // 'grid' or 'study'
    let studyIndex = 0;
    let studyDeck = [];

    // =========================================================================
    // STARTER DECKS
    // =========================================================================
    const STARTER_DECKS = [
        // b/d confusion
        { front: 'b vs d', back: 'b: bat faces RIGHT (like a b baseball bat). d: door opens LEFT (like a d doorknob). Trick: "bed" — the b and d make the headboard and footboard of a bed 🛏', nextReview: Date.now(), srsLevel: 0 },
        { front: 'p vs q', back: 'p: the bump goes DOWN. q: the bump also goes DOWN but the tail goes RIGHT. Trick: "p is for pencil — pointing down".', nextReview: Date.now(), srsLevel: 0 },
        { front: 'was vs saw', back: 'was: W-A-S (starts with W like "Word"). saw: S-A-W (starts with S like "See"). Trick: a mirror flips "was" to "saw" 🪞', nextReview: Date.now(), srsLevel: 0 },
        { front: 'their / there / they\'re', back: 'their = belongs to them (their house). there = a place (over there). they\'re = they + are (they\'re coming). Trick: "there" has HERE inside it!', nextReview: Date.now(), srsLevel: 0 },
        { front: 'Silent letters: know, write, thumb', back: 'know → k is silent (say: "no"). write → w is silent (say: "rite"). thumb → b is silent (say: "thum"). Tip: silent letters are just shy! 🤫', nextReview: Date.now(), srsLevel: 0 },
        // Common confusable spellings
        { front: 'because', back: 'Sounds like: "bi-KAWZ". Remember: Big Elephants Can Always Use Small Eggs (B-E-C-A-U-S-E) 🐘', nextReview: Date.now(), srsLevel: 0 },
        { front: 'friend', back: 'Sounds like: "frend". Remember: "FRI-end" — Friday is a friend to everyone! 🎉', nextReview: Date.now(), srsLevel: 0 },
        { front: 'said', back: 'Sounds like: "sed". It does NOT say it the way it looks. Just memorize: S-A-I-D.', nextReview: Date.now(), srsLevel: 0 },
        { front: 'people', back: 'Sounds like: "pee-pul". Remember: PEOPle — has PEO inside (like People Enjoy Organizations… People!). P-E-O-P-L-E', nextReview: Date.now(), srsLevel: 0 },
        { front: 'definitely', back: 'Remember: there is a "finite" inside de-FINITE-ly. D-E-F-I-N-I-T-E-L-Y', nextReview: Date.now(), srsLevel: 0 },
        // Tricky vowel patterns
        { front: 'ei vs ie rule', back: '"i before e, except after c, or when sounding like ay as in neighbour and weigh". Examples: believe (i before e), receive (after c), eight (sounds like ay) 📚', nextReview: Date.now(), srsLevel: 0 },
        { front: 'Letter pair: ou', back: 'ou can sound many ways: "ow" (out, found), "oo" (you, group), "uh" (colour, cousin), "off" (cough). Context is key!', nextReview: Date.now(), srsLevel: 0 },
    ];

    const btnLoadStarter = document.getElementById('btn-load-starter-cards');
    if (btnLoadStarter) {
        btnLoadStarter.addEventListener('click', () => {
            const existing = flashcards.map(c => c.front.toLowerCase().trim());
            let added = 0;
            STARTER_DECKS.forEach(card => {
                if (!existing.includes(card.front.toLowerCase().trim())) {
                    flashcards.push({ ...card });
                    added++;
                }
            });
            saveCards();
            renderCards();
            window.showToast && window.showToast(`Added ${added} dyslexia starter cards!`, '🃏');
        });
    }

    // =========================================================================
    // ADD CARD
    // =========================================================================
    function addCard(front, back) {
        front = (front || inputFront?.value || '').trim();
        back = (back || inputBack?.value || '').trim();

        if (!front || !back) {
            window.showToast && window.showToast('Please fill in both front and back!', '⚠');
            return;
        }

        flashcards.push({ front, back, nextReview: Date.now(), srsLevel: 0, timesReviewed: 0 });
        saveCards();
        if (inputFront) inputFront.value = '';
        if (inputBack) inputBack.value = '';
        if (inputFront) inputFront.focus();
        renderCards();
        window.showToast && window.showToast(`Card "${front}" added!`, '✓');
    }

    if (btnAdd) btnAdd.addEventListener('click', () => addCard());

    [inputFront, inputBack].forEach(input => {
        if (!input) return;
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') addCard();
        });
    });

    // Quick-add from word lookup
    document.addEventListener('da:addFlashcard', e => {
        if (e.detail?.front) addCard(e.detail.front, e.detail.back || e.detail.front);
    });

    // =========================================================================
    // SAVE & LOAD
    // =========================================================================
    function saveCards() {
        try {
            localStorage.setItem('dyslexia_flashcards', JSON.stringify(flashcards));
        } catch (error) {
            window.showToast?.('Flashcards could not be saved in this browser.', '⚠');
        }
        updateCounts();
    }

    function updateCounts() {
        const now = Date.now();
        const due = flashcards.filter(c => c.nextReview <= now);
        if (totalCardsCount) totalCardsCount.textContent = flashcards.length;
        if (dueCardsCount) dueCardsCount.textContent = due.length;
    }

    // =========================================================================
    // SRS — Spaced Repetition
    // =========================================================================
    const SRS_INTERVALS = [1, 10, 60, 240, 1440, 4320, 10080]; // minutes
    const SRS_LABELS = { again: 'again', hard: 'hard', good: 'good', easy: 'easy' };

    function rateCard(index, rating) {
        const card = flashcards[index];
        if (!card) return;
        card.timesReviewed = (card.timesReviewed || 0) + 1;

        let level = card.srsLevel || 0;
        if (rating === 'again') { level = 0; }
        else if (rating === 'hard') { level = Math.max(0, level - 1); }
        else if (rating === 'good') { level = Math.min(level + 1, SRS_INTERVALS.length - 1); }
        else if (rating === 'easy') { level = Math.min(level + 2, SRS_INTERVALS.length - 1); }

        card.srsLevel = level;
        const intervalMs = SRS_INTERVALS[level] * 60 * 1000;
        card.nextReview = Date.now() + intervalMs;
        saveCards();
        renderCards();

        const ratingLabels = { again: 'Reviewing soon again!', hard: 'Revisiting in 10 min', good: 'Great! See you later!', easy: 'Excellent! Long interval set.' };
        window.showToast && window.showToast(ratingLabels[rating] || 'Rated!', '🧠');
    }

    // =========================================================================
    // FILTER TABS
    // =========================================================================
    document.getElementById('tab-all-cards')?.addEventListener('click', () => {
        currentFilter = 'all';
        setActiveTab('tab-all-cards');
        renderCards();
    });

    document.getElementById('tab-due-cards')?.addEventListener('click', () => {
        currentFilter = 'due';
        setActiveTab('tab-due-cards');
        renderCards();
    });

    function setActiveTab(activeId) {
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.id === activeId);
        });
    }

    // =========================================================================
    // VIEW MODE TOGGLE
    // =========================================================================
    document.getElementById('view-mode-grid')?.addEventListener('click', () => {
        currentMode = 'grid';
        setActiveModeBtn('view-mode-grid');
        if (cardsGrid) cardsGrid.style.display = 'grid';
        if (studyModeContainer) studyModeContainer.style.display = 'none';
        renderCards();
    });

    document.getElementById('view-mode-study')?.addEventListener('click', () => {
        currentMode = 'study';
        setActiveModeBtn('view-mode-study');
        if (cardsGrid) cardsGrid.style.display = 'none';
        if (studyModeContainer) studyModeContainer.style.display = 'flex';
        startStudyMode();
    });

    function setActiveModeBtn(activeId) {
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.id === activeId);
        });
    }

    // =========================================================================
    // RENDER GRID CARDS
    // =========================================================================
    function renderCards() {
        if (currentMode !== 'grid') return;
        if (!cardsGrid) return;

        const now = Date.now();
        let deck = flashcards;
        if (currentFilter === 'due') deck = flashcards.filter(c => (c.nextReview || 0) <= now);

        updateCounts();

        if (deck.length === 0) {
            const msg = currentFilter === 'due'
                ? 'No cards due for review! 🎉 All caught up.'
                : 'No flashcards yet. Add one above or load starter decks!';
            cardsGrid.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 2rem 0;">${msg}</p>`;
            return;
        }

        cardsGrid.innerHTML = '';

        deck.forEach((card, visibleIndex) => {
            const realIndex = flashcards.indexOf(card);
            const isDue = (card.nextReview || 0) <= now;
            const level = card.srsLevel || 0;
            const levelLabel = ['New', '10 min', '1 hr', '4 hrs', '1 day', '3 days', '1 week'][level] || 'Mastered';

            const cardEl = document.createElement('div');
            cardEl.className = 'flashcard';
            cardEl.setAttribute('role', 'button');
            cardEl.setAttribute('tabindex', '0');
            cardEl.setAttribute('aria-label', `Flashcard: ${escapeHtml(card.front)}. Press Enter to flip.`);

            cardEl.innerHTML = `
                <div class="flashcard-inner">
                    <!-- FRONT -->
                    <div class="flashcard-front">
                        <div class="card-header-bar">
                            <span class="card-badge">${isDue ? '🔴 DUE' : `✅ ${levelLabel}`}</span>
                            <button class="icon-btn-sm delete-card-btn" data-index="${realIndex}" aria-label="Delete card" title="Delete this card">🗑</button>
                        </div>
                        <h3 style="font-size: clamp(1rem, 3vw, 1.6rem); font-family: var(--font-heading); text-align: center;">${escapeHtml(card.front)}</h3>
                        <span class="text-muted" style="font-size: 0.78rem; margin-top: 8px;">Click to flip</span>
                    </div>
                    <!-- BACK -->
                    <div class="flashcard-back">
                        <div class="card-header-bar">
                            <span class="card-badge" style="color: var(--accent-secondary);">ANSWER</span>
                        </div>
                        <p style="font-size: clamp(0.8rem, 2.5vw, 1.1rem); text-align: center; line-height: 1.6; max-height: 140px; overflow-y: auto;">${escapeHtml(card.back)}</p>
                        <div class="card-actions-bar">
                            <div class="card-srs-btns">
                                <button class="srs-btn srs-again" data-index="${realIndex}" data-rating="again" title="Again — review soon">Again</button>
                                <button class="srs-btn srs-hard" data-index="${realIndex}" data-rating="hard" title="Hard — +10 min">Hard</button>
                                <button class="srs-btn srs-good" data-index="${realIndex}" data-rating="good" title="Good — next interval">Good</button>
                                <button class="srs-btn srs-easy" data-index="${realIndex}" data-rating="easy" title="Easy — long interval">Easy</button>
                            </div>
                        </div>
                    </div>
                </div>`;

            // Flip on click (not srs/delete buttons)
            cardEl.addEventListener('click', e => {
                if (e.target.classList.contains('srs-btn') || e.target.classList.contains('delete-card-btn') || e.target.closest('.srs-btn') || e.target.closest('.delete-card-btn')) return;
                cardEl.classList.toggle('flipped');
            });

            // Keyboard flip
            cardEl.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cardEl.classList.toggle('flipped'); }
            });

            cardsGrid.appendChild(cardEl);
        });

        // SRS rating listeners
        document.querySelectorAll('.srs-btn[data-rating]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'));
                const rating = btn.getAttribute('data-rating');
                rateCard(idx, rating);
            });
        });

        // Delete listeners
        document.querySelectorAll('.delete-card-btn[data-index]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'));
                if (confirm(`Delete card "${flashcards[idx]?.front}"?`)) {
                    flashcards.splice(idx, 1);
                    saveCards();
                    renderCards();
                }
            });
        });
    }

    // =========================================================================
    // STUDY FOCUS MODE
    // =========================================================================
    function startStudyMode() {
        const now = Date.now();
        studyDeck = currentFilter === 'due'
            ? flashcards.filter(c => (c.nextReview || 0) <= now)
            : [...flashcards];

        if (studyDeck.length === 0) {
            if (studyCardSlot) studyCardSlot.innerHTML = `<p class="text-muted" style="text-align: center; padding: 3rem;">No cards to study! Add some above.</p>`;
            if (studyCounter) studyCounter.textContent = 'No cards';
            return;
        }
        studyIndex = 0;
        renderStudyCard();
    }

    function renderStudyCard() {
        if (!studyCardSlot || studyDeck.length === 0) return;
        const card = studyDeck[studyIndex];
        const realIndex = flashcards.indexOf(card);

        if (studyCounter) studyCounter.textContent = `Card ${studyIndex + 1} of ${studyDeck.length}`;

        studyCardSlot.innerHTML = `
            <div class="flashcard" id="study-active-card" role="button" tabindex="0" aria-label="${escapeHtml(card.front)} — press Space to flip">
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <h3 style="font-size: clamp(1.2rem, 4vw, 2rem); font-family: var(--font-heading); text-align: center; max-width: 90%;">${escapeHtml(card.front)}</h3>
                        <span class="text-muted" style="font-size: 0.85rem; margin-top: 12px;">Press Space or click to reveal answer</span>
                    </div>
                    <div class="flashcard-back">
                        <p style="font-size: clamp(0.9rem, 2.5vw, 1.2rem); text-align: center; line-height: 1.7; max-height: 220px; overflow-y: auto; padding: 0 12px;">${escapeHtml(card.back)}</p>
                        <div class="card-actions-bar" style="position: absolute; bottom: 16px; left: 16px; right: 16px;">
                            <div class="card-srs-btns" style="width: 100%; justify-content: center; gap: 8px; display: flex; flex-wrap: wrap;">
                                <button class="srs-btn srs-again" data-index="${realIndex}" data-rating="again" style="padding: 6px 14px; font-size: 0.85rem;">😖 Again</button>
                                <button class="srs-btn srs-hard" data-index="${realIndex}" data-rating="hard" style="padding: 6px 14px; font-size: 0.85rem;">😬 Hard</button>
                                <button class="srs-btn srs-good" data-index="${realIndex}" data-rating="good" style="padding: 6px 14px; font-size: 0.85rem;">😊 Good</button>
                                <button class="srs-btn srs-easy" data-index="${realIndex}" data-rating="easy" style="padding: 6px 14px; font-size: 0.85rem;">😄 Easy</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        const activeCard = document.getElementById('study-active-card');
        activeCard?.addEventListener('click', e => {
            if (e.target.classList.contains('srs-btn') || e.target.closest('.srs-btn')) return;
            activeCard.classList.toggle('flipped');
        });

        // SRS rating in study mode
        studyCardSlot.querySelectorAll('.srs-btn[data-rating]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'));
                const rating = btn.getAttribute('data-rating');
                rateCard(idx, rating);
                // Auto advance
                if (studyIndex < studyDeck.length - 1) {
                    studyIndex++;
                    renderStudyCard();
                } else {
                    studyCardSlot.innerHTML = `<div style="text-align:center; padding: 3rem;"><h3 class="text-xl">🎉 Session Complete!</h3><p class="text-muted" style="margin-top: 1rem;">You reviewed all ${studyDeck.length} cards. Great work!</p></div>`;
                    if (studyCounter) studyCounter.textContent = `Completed ${studyDeck.length} cards`;
                }
            });
        });
    }

    // Study navigation buttons
    document.getElementById('btn-study-prev')?.addEventListener('click', () => {
        if (studyIndex > 0) { studyIndex--; renderStudyCard(); }
    });

    document.getElementById('btn-study-next')?.addEventListener('click', () => {
        if (studyIndex < studyDeck.length - 1) { studyIndex++; renderStudyCard(); }
    });

    document.getElementById('btn-study-flip')?.addEventListener('click', () => {
        document.getElementById('study-active-card')?.classList.toggle('flipped');
    });

    // Keyboard study shortcuts
    document.addEventListener('keydown', e => {
        if (currentMode !== 'study') return;
        const activeView = document.getElementById('view-flashcards');
        if (!activeView || activeView.hidden) return;

        if (e.key === ' ') { e.preventDefault(); document.getElementById('study-active-card')?.classList.toggle('flipped'); }
        if (e.key === 'ArrowRight') { if (studyIndex < studyDeck.length - 1) { studyIndex++; renderStudyCard(); } }
        if (e.key === 'ArrowLeft') { if (studyIndex > 0) { studyIndex--; renderStudyCard(); } }
        if (e.key === '1') studyCardSlot.querySelector('.srs-again')?.click();
        if (e.key === '2') studyCardSlot.querySelector('.srs-hard')?.click();
        if (e.key === '3') studyCardSlot.querySelector('.srs-good')?.click();
        if (e.key === '4') studyCardSlot.querySelector('.srs-easy')?.click();
    });

    // =========================================================================
    // HELPERS
    // =========================================================================
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // =========================================================================
    // INITIAL RENDER
    // =========================================================================
    renderCards();
    updateCounts();
});
