/**
 * Dyslexia Assistant - Flashcards Logic
 * Handles creating, displaying, and flipping flashcards.
 */

document.addEventListener('DOMContentLoaded', () => {
    const inputFront = document.getElementById('fc-front');
    const inputBack = document.getElementById('fc-back');
    const btnAdd = document.getElementById('fc-add');
    const cardsGrid = document.getElementById('cards-grid');

    if (!btnAdd) return;

    let flashcards = JSON.parse(localStorage.getItem('dyslexia_flashcards')) || [];

    function renderCards() {
        cardsGrid.innerHTML = '';
        if (flashcards.length === 0) {
            cardsGrid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center;">No flashcards yet. Create your first one above!</p>';
            return;
        }

        flashcards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'flashcard';
            cardEl.setAttribute('role', 'button');
            cardEl.setAttribute('tabindex', '0');
            cardEl.setAttribute('aria-label', `Flashcard ${index + 1}. Press Enter to flip.`);
            
            cardEl.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <h3 class="text-lg">${escapeHtml(card.front)}</h3>
                        <span class="text-muted" style="font-size: 0.8rem; position: absolute; bottom: 10px;">Click to flip</span>
                    </div>
                    <div class="flashcard-back">
                        <h3 class="text-lg">${escapeHtml(card.back)}</h3>
                        <button class="btn delete-btn" data-index="${index}" style="position: absolute; bottom: 10px; background: rgba(0,0,0,0.5); padding: 5px 10px; font-size: 0.8rem;">Delete</button>
                    </div>
                </div>
            `;

            // Flip interaction
            cardEl.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn')) {
                    cardEl.classList.toggle('flipped');
                }
            });

            // Keyboard support
            cardEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    cardEl.classList.toggle('flipped');
                }
            });

            cardsGrid.appendChild(cardEl);
        });

        // Delete handlers
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = e.target.getAttribute('data-index');
                flashcards.splice(idx, 1);
                saveCards();
                renderCards();
            });
        });
    }

    function addCard() {
        const front = inputFront.value.trim();
        const back = inputBack.value.trim();

        if (front && back) {
            flashcards.push({ front, back, nextReview: Date.now() });
            saveCards();
            inputFront.value = '';
            inputBack.value = '';
            inputFront.focus();
            renderCards();
        } else {
            alert('Please fill out both the front and back of the flashcard.');
        }
    }

    function saveCards() {
        localStorage.setItem('dyslexia_flashcards', JSON.stringify(flashcards));
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    btnAdd.addEventListener('click', addCard);
    
    // Enter key support for inputs
    [inputFront, inputBack].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addCard();
            }
        });
    });

    renderCards();
});
