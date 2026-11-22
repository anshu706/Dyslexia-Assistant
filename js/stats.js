/**
 * stats.js - Dyslexia Assistant Gamified Learning & Reading Stats Engine
 * 
 * Features:
 *  - Daily reading streak tracking with automatic calendar day rollover
 *  - Cumulative & daily words read counter
 *  - Active reading / listening focus minutes tracker
 *  - Spaced-repetition word confusion mastery tracker
 *  - Achievement superpower badges
 *  - 100% local-first persistence via localStorage (da_learning_stats)
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'da_learning_stats';

    function getTodayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function getDefaultStats() {
        return {
            streak: 1,
            lastActiveDate: getTodayKey(),
            totalWordsRead: 0,
            wordsReadToday: 0,
            todayDate: getTodayKey(),
            focusMinutes: 0,
            cardsReviewedTotal: 0,
            cardsMasteredTotal: 0,
            badges: ['first_step']
        };
    }

    function loadStats() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return getDefaultStats();
            const data = JSON.parse(raw);
            const today = getTodayKey();

            // Daily rollover logic
            if (data.todayDate !== today) {
                // Check if last active was yesterday
                const lastDate = new Date(data.lastActiveDate || data.todayDate);
                const currDate = new Date(today);
                const diffTime = currDate.getTime() - lastDate.getTime();
                const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

                if (diffDays === 1) {
                    // Consecutive day!
                    data.streak = (data.streak || 0) + 1;
                } else if (diffDays > 1) {
                    // Streak broken, restart
                    data.streak = 1;
                }
                data.wordsReadToday = 0;
                data.todayDate = today;
                data.lastActiveDate = today;
            }

            if (!Array.isArray(data.badges)) data.badges = ['first_step'];
            return data;
        } catch (_) {
            return getDefaultStats();
        }
    }

    function saveStats(stats) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
            updateStatsUI(stats);
        } catch (_) {}
    }

    // ─── PUBLIC TRACKING API ──────────────────────────────────────────────────

    function recordWords(count) {
        if (!count || count <= 0) return;
        const stats = loadStats();
        stats.totalWordsRead = (stats.totalWordsRead || 0) + count;
        stats.wordsReadToday = (stats.wordsReadToday || 0) + count;
        stats.lastActiveDate = getTodayKey();

        // Check milestones
        if (stats.totalWordsRead >= 500 && !stats.badges.includes('reader_500')) {
            stats.badges.push('reader_500');
            window.showToast?.('🏅 Superpower Unlocked: Read 500+ Words!', '🌟');
        }
        if (stats.streak >= 3 && !stats.badges.includes('streak_3')) {
            stats.badges.push('streak_3');
            window.showToast?.('🔥 Superpower Unlocked: 3-Day Focus Streak!', '⚡');
        }
        if (stats.streak >= 7 && !stats.badges.includes('streak_7')) {
            stats.badges.push('streak_7');
            window.showToast?.('🏆 Master Mind: 7-Day Reading Streak!', '👑');
        }

        saveStats(stats);
    }

    function recordReadingTime(minutes = 1) {
        const stats = loadStats();
        stats.focusMinutes = (stats.focusMinutes || 0) + minutes;
        if (stats.focusMinutes >= 30 && !stats.badges.includes('focus_30')) {
            stats.badges.push('focus_30');
            window.showToast?.('🎧 Focus Champion: 30 Minutes of Immersive Reading!', '⏱️');
        }
        saveStats(stats);
    }

    function recordCardReview(isMastered = false) {
        const stats = loadStats();
        stats.cardsReviewedTotal = (stats.cardsReviewedTotal || 0) + 1;
        if (isMastered) {
            stats.cardsMasteredTotal = (stats.cardsMasteredTotal || 0) + 1;
            if (stats.cardsMasteredTotal >= 5 && !stats.badges.includes('confusion_conqueror')) {
                stats.badges.push('confusion_conqueror');
                window.showToast?.('🧠 Superpower: Mastered 5 Tricky Dyslexia Word Pairs!', '✨');
            }
        }
        saveStats(stats);
    }

    // ─── UI UPDATES ──────────────────────────────────────────────────────────

    function updateStatsUI(stats = loadStats()) {
        const streakBadge = document.getElementById('stat-streak-badge');
        const streakCount = document.getElementById('stat-streak-count');
        const wordsToday = document.getElementById('stat-words-today');
        const wordsTotal = document.getElementById('stat-words-total');
        const focusMin = document.getElementById('stat-focus-minutes');
        const cardsReviewed = document.getElementById('stat-cards-reviewed');
        const cardsMastered = document.getElementById('stat-cards-mastered');

        if (streakBadge) streakBadge.textContent = `${stats.streak}d 🔥`;
        if (streakCount) streakCount.textContent = stats.streak;
        if (wordsToday) wordsToday.textContent = (stats.wordsReadToday || 0).toLocaleString();
        if (wordsTotal) wordsTotal.textContent = (stats.totalWordsRead || 0).toLocaleString();
        if (focusMin) focusMin.textContent = `${stats.focusMinutes || 0}m`;
        if (cardsReviewed) cardsReviewed.textContent = stats.cardsReviewedTotal || 0;
        if (cardsMastered) cardsMastered.textContent = stats.cardsMasteredTotal || 0;

        // Render Badges
        const badgeContainer = document.getElementById('stat-badge-list');
        if (badgeContainer) {
            const allBadges = [
                { id: 'first_step', name: 'First Step', icon: '🌱', desc: 'Started your journey' },
                { id: 'reader_500', name: 'Page Turner', icon: '📖', desc: 'Read 500+ words' },
                { id: 'streak_3', name: 'Focus Flame', icon: '🔥', desc: '3-day active streak' },
                { id: 'streak_7', name: 'Super Scholar', icon: '👑', desc: '7-day active streak' },
                { id: 'focus_30', name: 'Deep Listener', icon: '🎧', desc: '30 mins of listening' },
                { id: 'confusion_conqueror', name: 'Letter Master', icon: '🧠', desc: '5 tricky pairs mastered' },
            ];

            badgeContainer.innerHTML = allBadges.map(b => {
                const unlocked = stats.badges.includes(b.id);
                return `
                    <div class="stat-badge-card ${unlocked ? 'unlocked' : 'locked'}" title="${b.desc}">
                        <div class="stat-badge-icon">${b.icon}</div>
                        <div class="stat-badge-name">${b.name}</div>
                        <div class="stat-badge-status">${unlocked ? '✓ Unlocked' : 'Locked'}</div>
                    </div>
                `;
            }).join('');
        }
    }

    function openModal() {
        const modal = document.getElementById('progress-modal');
        if (modal) {
            updateStatsUI();
            modal.classList.remove('hidden');
        }
    }

    function closeModal() {
        const modal = document.getElementById('progress-modal');
        if (modal) modal.classList.add('hidden');
    }

    // Export Global API
    window.DA_Stats = {
        recordWords,
        recordReadingTime,
        recordCardReview,
        getStats: loadStats,
        openModal,
        closeModal,
        updateStatsUI
    };

    // Auto-init on load
    document.addEventListener('DOMContentLoaded', () => {
        updateStatsUI();

        // Passive focus timer (every 60s of active window, record 1 min)
        let isFocused = true;
        window.addEventListener('focus', () => { isFocused = true; });
        window.addEventListener('blur', () => { isFocused = false; });

        setInterval(() => {
            if (isFocused && !document.hidden) {
                // If user is listening to speech or actively in reader view
                const isListening = document.querySelector('#tts-pause')?.style.display !== 'none';
                const isReaderActive = document.querySelector('#view-reader')?.classList.contains('active');
                if (isListening || isReaderActive) {
                    recordReadingTime(1);
                }
            }
        }, 60000);

        // Bind progress modal triggers
        document.getElementById('btn-view-progress')?.addEventListener('click', openModal);
        document.getElementById('close-progress-modal')?.addEventListener('click', closeModal);
        document.getElementById('progress-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'progress-modal') closeModal();
        });
    });
})();
