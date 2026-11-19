/**
 * Dyslexia Assistant - Plain-Language Simplifier & Chunking Engine
 * Transforms dense, academic, or bureaucratic text into accessible,
 * high-focus prose tailored for dyslexic readers without changing core meaning.
 */

(function () {
    // Plain-English lexical substitutions for common polysyllabic confusers
    const PLAIN_ENGLISH_MAP = {
        'utilize': 'use',
        'utilizes': 'uses',
        'utilized': 'used',
        'utilizing': 'using',
        'utilization': 'use',
        'commence': 'begin',
        'commences': 'begins',
        'commenced': 'began',
        'commencing': 'beginning',
        'subsequently': 'then',
        'demonstrate': 'show',
        'demonstrates': 'shows',
        'demonstrated': 'showed',
        'demonstrating': 'showing',
        'facilitate': 'help',
        'facilitates': 'helps',
        'facilitated': 'helped',
        'endeavor': 'try',
        'endeavors': 'tries',
        'approximately': 'about',
        'terminate': 'end',
        'terminates': 'ends',
        'terminated': 'ended',
        'erroneous': 'wrong',
        'erroneously': 'wrongly',
        'numerous': 'many',
        'sufficient': 'enough',
        'insufficient': 'not enough',
        'assistance': 'help',
        'assist': 'help',
        'assists': 'helps',
        'assisted': 'helped',
        'purchase': 'buy',
        'purchases': 'buys',
        'purchased': 'bought',
        'require': 'need',
        'requires': 'needs',
        'required': 'needed',
        'requirement': 'need',
        'obtain': 'get',
        'obtains': 'gets',
        'obtained': 'got',
        'implement': 'carry out',
        'implemented': 'carried out',
        'substantial': 'large',
        'indicate': 'show',
        'indicates': 'shows',
        'indicated': 'showed',
        'objective': 'goal',
        'objectives': 'goals',
        'furthermore': 'also',
        'moreover': 'also',
        'nevertheless': 'still',
        'consequently': 'so',
        'additionally': 'also',
        'comprehend': 'understand',
        'comprehends': 'understands',
        'comprehension': 'understanding',
        'accomplish': 'finish',
        'accomplished': 'finished',
        'accomplishment': 'achievement',
        'predominantly': 'mostly',
        'discontinue': 'stop',
        'discontinued': 'stopped'
    };

    // Phrase replacements
    const PHRASE_MAP = [
        [/\bin order to\b/gi, 'to'],
        [/\bprior to\b/gi, 'before'],
        [/\bat the present time\b/gi, 'now'],
        [/\bdue to the fact that\b/gi, 'because'],
        [/\bin the event that\b/gi, 'if'],
        [/\bwith regard to\b/gi, 'about'],
        [/\bwith reference to\b/gi, 'about'],
        [/\ba large number of\b/gi, 'many'],
        [/\ba majority of\b/gi, 'most'],
        [/\bin addition to\b/gi, 'as well as']
    ];

    const SimplifierEngine = {
        /**
         * Simplify text for dyslexic readability:
         * 1. Replaces difficult multi-syllable jargon with plain English equivalents.
         * 2. Chunks long sentences (> 22 words) into manageable phrases.
         */
        simplify(text) {
            if (!text || typeof text !== 'string') return { text: '', replacementCount: 0, splitCount: 0 };

            let result = text;
            let replacementCount = 0;
            let splitCount = 0;

            // 1. Apply multi-word phrase simplifications
            for (const [regex, replacement] of PHRASE_MAP) {
                const matches = result.match(regex);
                if (matches) {
                    replacementCount += matches.length;
                    result = result.replace(regex, replacement);
                }
            }

            // 2. Apply single-word dictionary substitutions
            const words = result.split(/(\s+|[.,!?;:()[\]{}"])/);
            const processedWords = words.map(w => {
                const lower = w.toLowerCase();
                if (PLAIN_ENGLISH_MAP[lower]) {
                    replacementCount++;
                    // Preserve initial capital letter if original word had it
                    const replacement = PLAIN_ENGLISH_MAP[lower];
                    if (w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()) {
                        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
                    }
                    return replacement;
                }
                return w;
            });
            result = processedWords.join('');

            // 3. Chunk excessively long sentences (> 22 words) at conjunction commas
            const sentences = result.split(/(?<=[.?!])\s+/);
            const chunkedSentences = sentences.map(sentence => {
                const tokenCount = sentence.trim().split(/\s+/).length;
                if (tokenCount > 22) {
                    // Try to break at ", and ", ", but ", or "; "
                    let splitSentence = sentence.replace(/,\s+(and|but|yet|so)\s+/gi, (match, conj) => {
                        splitCount++;
                        return `. ${conj.charAt(0).toUpperCase() + conj.slice(1)} `;
                    });
                    splitSentence = splitSentence.replace(/;\s+/g, () => {
                        splitCount++;
                        return '. ';
                    });
                    return splitSentence;
                }
                return sentence;
            });

            result = chunkedSentences.join(' ');

            return {
                text: result,
                original: text,
                replacementCount,
                splitCount
            };
        }
    };

    window.DA_Simplifier = SimplifierEngine;
})();
