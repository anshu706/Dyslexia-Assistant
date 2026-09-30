/**
 * Dyslexia Assistant - Editor Logic
 * Handles distraction-free writing, word count, reading level, and gentle phonetic corrections.
 */

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('writer-editor');
    const wordCountEl = document.getElementById('word-count');
    const readingLevelEl = document.getElementById('reading-level');
    const suggestionsPopover = document.getElementById('phonetic-suggestions');

    // Dictionary for common phonetic mistakes
    const dictionary = {
        'teh': 'the',
        'bcoz': 'because',
        'alot': 'a lot',
        'tommorow': 'tomorrow',
        'realy': 'really',
        'definately': 'definitely',
        'wierd': 'weird',
        'recieve': 'receive',
        'untill': 'until',
        'occured': 'occurred'
    };

    if (editor) {
        // Auto-save typing locally
        const savedText = localStorage.getItem('dyslexia_assistant_draft');
        if (savedText) {
            editor.value = savedText;
            updateStats(savedText);
        }

        editor.addEventListener('input', (e) => {
            const text = e.target.value;
            localStorage.setItem('dyslexia_assistant_draft', text);
            updateStats(text);
            checkSpelling(text);
        });

        // Clear suggestions if clicking away
        editor.addEventListener('click', () => {
            suggestionsPopover.classList.add('hidden');
        });
    }

    function updateStats(text) {
        // Word count
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const count = words.length;
        wordCountEl.innerText = `${count} word${count !== 1 ? 's' : ''}`;

        // Pseudo Reading Level (Flesch-Kincaid approximation)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
        const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
        
        let grade = 0;
        if (count > 0) {
            grade = Math.round(0.39 * (count / sentences) + 11.8 * (syllables / count) - 15.59);
        }
        
        grade = Math.max(1, grade); // Minimum grade 1
        
        if (count === 0) {
            readingLevelEl.innerText = 'Grade - Level';
        } else {
            readingLevelEl.innerText = `Grade ${grade} Level`;
        }
    }

    function countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        const match = word.match(/[aeiouy]{1,2}/g);
        return match ? match.length : 1;
    }

    function checkSpelling(text) {
        // Get the last typed word
        const words = text.split(/\s+/);
        const lastWord = words[words.length - 2]; // The one before the space just typed
        const currentWord = words[words.length - 1]; // Currently typing

        // Use the global dictionary

        // Only check if they just finished a word (space typed)
        if (text.endsWith(' ') && lastWord) {
            const cleanWord = lastWord.replace(/[.,!?]/g, '').toLowerCase();
            
            if (dictionary[cleanWord]) {
                showSuggestion(cleanWord, dictionary[cleanWord]);
            } else {
                suggestionsPopover.classList.add('hidden');
            }
        }
    }

    function showSuggestion(wrong, correct) {
        const didYouMeanText = 'Did you mean?';
        
        suggestionsPopover.innerHTML = `
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">${didYouMeanText}</div>
            <button class="suggestion-item" data-correct="${correct}">
                <strong style="color: var(--success);">${correct}</strong>
            </button>
        `;
        
        // Position at top right of the editor
        suggestionsPopover.style.top = '60px';
        suggestionsPopover.style.right = '20px';
        suggestionsPopover.classList.remove('hidden');

        const btn = suggestionsPopover.querySelector('.suggestion-item');
        btn.addEventListener('click', () => {
            applyCorrection(wrong, correct);
        });
    }

    function applyCorrection(wrong, correct) {
        // Simple replace of the last occurrence of the wrong word
        const regex = new RegExp(`\\b${wrong}\\b(?!.*\\b${wrong}\\b)`, 'i');
        editor.value = editor.value.replace(regex, correct);
        localStorage.setItem('dyslexia_assistant_draft', editor.value);
        suggestionsPopover.classList.add('hidden');
        editor.focus();
        updateStats(editor.value);
    }
});
