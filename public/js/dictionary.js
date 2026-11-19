/**
 * Dyslexia Assistant - Assistive Intelligence Dictionary Engine
 * 100% Free Public Dictionary API (api.dictionaryapi.dev) with
 * client-side caching, phonetic transcription, and offline fallback.
 */

(function () {
    const CACHE_PREFIX = 'da_dict_';
    const memoryCache = new Map();

    const DictionaryEngine = {
        /**
         * Look up a word from the Free Dictionary API with local cache
         * @param {string} word
         * @returns {Promise<{word: string, phonetic?: string, audio?: string, meanings?: Array, source: 'cache'|'api'|'fallback'}>}
         */
        async lookup(word) {
            if (!word || typeof word !== 'string') return null;
            const cleanWord = word.trim().toLowerCase().replace(/[^a-z'-]/g, '');
            if (!cleanWord) return null;

            // 1. Check memory cache
            if (memoryCache.has(cleanWord)) {
                return { ...memoryCache.get(cleanWord), source: 'cache' };
            }

            // 2. Check localStorage cache
            try {
                const stored = localStorage.getItem(`${CACHE_PREFIX}${cleanWord}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    memoryCache.set(cleanWord, parsed);
                    return { ...parsed, source: 'cache' };
                }
            } catch (_) {
                // Ignore storage errors
            }

            // 3. Query Free Dictionary API
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const entry = data[0];
                        // Extract phonetic
                        const phonetic = entry.phonetic || (entry.phonetics?.find(p => p.text)?.text) || '';
                        
                        // Extract audio pronunciation if available
                        const audio = entry.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio || '';

                        // Extract top meanings (up to 3)
                        const meanings = (entry.meanings || []).slice(0, 3).map(m => ({
                            partOfSpeech: m.partOfSpeech || '',
                            definition: m.definitions?.[0]?.definition || '',
                            example: m.definitions?.[0]?.example || ''
                        }));

                        const result = {
                            word: cleanWord,
                            phonetic,
                            audio,
                            meanings,
                            found: true
                        };

                        // Store in cache
                        memoryCache.set(cleanWord, result);
                        try {
                            localStorage.setItem(`${CACHE_PREFIX}${cleanWord}`, JSON.stringify(result));
                        } catch (_) {}

                        return { ...result, source: 'api' };
                    }
                }
            } catch (err) {
                // Network failure, timeout, or offline
                console.info('[DictionaryEngine] Online lookup unavailable, using offline fallback:', err.message);
            }

            // 4. Fallback if not found or offline
            const fallbackResult = {
                word: cleanWord,
                phonetic: '',
                audio: '',
                meanings: [],
                found: false,
                source: 'fallback'
            };
            return fallbackResult;
        },

        /**
         * Play audio pronunciation if provided
         */
        playAudio(audioUrl) {
            if (!audioUrl) return false;
            try {
                const audio = new Audio(audioUrl);
                audio.play();
                return true;
            } catch (e) {
                console.warn('Audio playback failed:', e);
                return false;
            }
        }
    };

    window.DA_Dictionary = DictionaryEngine;
})();
