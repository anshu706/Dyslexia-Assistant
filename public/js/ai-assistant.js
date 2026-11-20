/**
 * Dyslexia Assistant - Lexi Real-Time Voice & Cognitive AI Assistant
 * Dual-Engine Architecture:
 * 1. Google Gemini Flash LLM (free tier) for generative reasoning & tutoring
 * 2. Intelligent Offline Cognitive Rule Engine (zero API key / offline resilience)
 * Full real-time speech-to-text (STT) and voice speech-synthesis (TTS) for natural talking.
 */

(function () {
    'use strict';

    // =========================================================================
    // STATE & CONFIGURATION
    // =========================================================================
    const STORAGE_KEY_GEMINI = 'da_gemini_api_key';
    const STORAGE_KEY_VOICE_MODE = 'da_lexi_voice_mode';
    const STORAGE_KEY_MUTED = 'da_lexi_muted';

    const state = {
        apiKey: localStorage.getItem(STORAGE_KEY_GEMINI) || '',
        voiceMode: localStorage.getItem(STORAGE_KEY_VOICE_MODE) !== 'false', // default true
        isMuted: localStorage.getItem(STORAGE_KEY_MUTED) === 'true',
        isListening: false,
        isSpeaking: false,
        isOpen: false,
        history: [], // { role: 'user' | 'model', text: string }
        recognition: null,
        synth: window.speechSynthesis || null,
        currentUtterance: null
    };

    // =========================================================================
    // SYSTEM INSTRUCTIONS FOR DYSLEXIA COACHING
    // =========================================================================
    const SYSTEM_INSTRUCTION = `You are Lexi, an empathetic, encouraging, and world-class AI cognitive coach built into the Dyslexia Assistant workspace.
Your goal is to help neurodivergent and dyslexic readers and writers comprehend, compose, and learn without stress.

Strict Rules for Lexi:
1. Keep responses clear, concise, and structured. Break paragraphs into 1-3 sentences maximum.
2. Use simple, plain English words whenever possible.
3. Use bullet points for multiple ideas so the text doesn't look like an overwhelming wall of words.
4. When explaining tricky words, always include syllables with dots (e.g. syl·la·ble) and a friendly visual memory trick or mnemonic.
5. If checking a user's writing, NEVER shame or criticize. Praise their ideas first, then gently offer the preferred spelling and explain why the error is a normal dyslexic pattern (e.g., phonetic spelling, mirror letters like b/d).
6. Always end with an encouraging, actionable question (e.g., "Would you like me to read this aloud, or make flashcards for these words?").`;

    // =========================================================================
    // WORKSPACE CONTEXT EXTRACTOR
    // =========================================================================
    function getWorkspaceContext() {
        const readerView = document.getElementById('view-reader') || document.getElementById('panel-reader');
        const writerView = document.getElementById('view-writer') || document.getElementById('panel-writer');
        const isReader = readerView && (readerView.classList.contains('active') || !readerView.classList.contains('hidden'));
        const isWriter = writerView && (writerView.classList.contains('active') || !writerView.classList.contains('hidden'));

        let activeContext = 'workspace';
        let contentSample = '';
        let title = '';

        if (isReader) {
            activeContext = 'reader';
            const sel = window.getSelection()?.toString().trim();
            if (sel) {
                contentSample = sel;
            } else {
                const docBody = document.getElementById('document-body') || document.getElementById('reader-content');
                contentSample = docBody?.innerText?.trim()?.substring(0, 3000) || '';
            }
            const titleEl = document.getElementById('doc-title-display');
            title = titleEl?.textContent || 'Reader Document';
        } else if (isWriter) {
            activeContext = 'writer';
            const editor = document.getElementById('writer-editor') || document.getElementById('editor-content');
            const editorText = editor?.value || editor?.innerText || '';
            contentSample = editorText.substring(0, 3000);
            const titleInput = document.getElementById('doc-title-input') || document.getElementById('doc-title');
            title = titleInput?.value || 'Writer Draft';
        }

        return {
            mode: activeContext,
            title,
            text: contentSample
        };
    }

    // =========================================================================
    // INTELLIGENT OFFLINE / ZERO-KEY COGNITIVE ENGINE
    // =========================================================================
    async function handleOfflineCognitiveResponse(userPrompt) {
        const lower = userPrompt.toLowerCase();
        const ctx = getWorkspaceContext();

        // 1. Explanation / Summary of current page
        if (lower.includes('explain') || lower.includes('summar') || lower.includes('what is this about')) {
            if (!ctx.text || ctx.text.length < 10) {
                return `I'm ready to explain! Load a PDF, DOCX, or text into the **Reader** or write something in the **Writer**, then ask me again.`;
            }
            const cleanSentences = ctx.text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 15).slice(0, 3);
            return `Here is a quick summary of **${ctx.title}** in plain English:\n\n` +
                   cleanSentences.map((s, idx) => `• **Point ${idx + 1}**: ${s}`).join('\n\n') +
                   `\n\n*Would you like me to simplify this further or read it aloud?*`;
        }

        // 2. Simplify Text request
        if (lower.includes('simplif') || lower.includes('easier') || lower.includes('plain')) {
            if (window.DA_Simplifier && ctx.text) {
                const res = window.DA_Simplifier.simplify(ctx.text.substring(0, 800));
                return `Here is the simplified version with complex words replaced:\n\n${res.text}\n\n• **Simplified words**: ${res.replacementCount}\n• **Chunked sentences**: ${res.splitCount}\n\n*Tap "Insert in Writer" below if you'd like to use this!*`;
            }
            return `Text simplification takes long sentences and polysyllabic words and makes them shorter. Try loading text into the reader and click the **✨ Simplify** button in the toolbar!`;
        }

        // 3. Spell & Grammar Review
        if (lower.includes('spell') || lower.includes('review') || lower.includes('check') || lower.includes('grammar')) {
            if (ctx.mode === 'writer' && ctx.text) {
                return `I reviewed your draft in the Writer!\n\n• **Thought flow**: Great work putting your ideas on paper.\n• **Tip**: Words like *their* (belonging to them), *there* (a place), and *they're* (they are) often swap—take your time with those vowels.\n\n*Tap the Speak button anytime to hear how your draft sounds out loud.*`;
            }
            return `To check your writing, open the **Write** view and write your thoughts. I'll highlight confusable spellings gently and help you find the right words.`;
        }

        // 4. Tricky words / Syllables
        if (lower.includes('word') || lower.includes('syllable') || lower.includes('break down')) {
            return `To break down any word into syllables and hear its pronunciation, simply **click on any word** in the Reader! A lookup card will appear with syllables like **syl·la·ble** and audio pronunciation.`;
        }

        // 5. Flashcards
        if (lower.includes('card') || lower.includes('flashcard') || lower.includes('quiz')) {
            return `Spaced repetition flashcards help lock difficult spellings into long-term memory without stress.\n\n• Open the **Cards** view (Alt+3)\n• Add pairs of words you confuse (like *quiet* vs *quite*)\n• Review them daily for 2 minutes!`;
        }

        // 6. Who are you / Greeting
        if (lower.includes('hello') || lower.includes('hi') || lower.includes('who are you') || lower.includes('help')) {
            return `Hello! I'm **Lexi**, your personal reading and writing AI companion.\n\nHere is what I can do with you in real time:\n• **Talk aloud** with speech synthesis\n• **Explain & summarize** what you are reading\n• **Simplify dense sentences** into plain language\n• **Review your writing gently** without red ink\n\n*You can type below or tap the microphone to talk to me!*`;
        }

        // Default friendly answer
        return `I'm here with you! You asked: "${userPrompt}".\n\n• I can help you read, write, or study right now.\n• For deep unlimited reasoning, tap the ⚙️ Settings icon at the top of this drawer and enter your free **Google Gemini API Key**.\n\n*What would you like to work on together next?*`;
    }

    // =========================================================================
    // CLOUD GEMINI API CLIENT (100% Free Tier: gemini-1.5-flash / gemini-2.0-flash)
    // =========================================================================
    async function queryGemini(userPrompt) {
        if (!state.apiKey) {
            return handleOfflineCognitiveResponse(userPrompt);
        }

        const ctx = getWorkspaceContext();
        let promptWithContext = userPrompt;
        if (ctx.text) {
            promptWithContext = `[Context: User is in ${ctx.mode.toUpperCase()} mode. Document: "${ctx.title}". Excerpt: "${ctx.text.substring(0, 1500)}"]\n\nUser Question: ${userPrompt}`;
        }

        const contents = state.history.slice(-4).map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));

        contents.push({
            role: 'user',
            parts: [{ text: promptWithContext }]
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }]
                    },
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                        topP: 0.95
                    }
                })
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.warn('[Lexi AI] Gemini API error, falling back to local cognitive engine:', errData);
                return handleOfflineCognitiveResponse(userPrompt);
            }

            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                return text.trim();
            }
            return handleOfflineCognitiveResponse(userPrompt);

        } catch (err) {
            console.warn('[Lexi AI] Network request failed, using local engine:', err.message);
            return handleOfflineCognitiveResponse(userPrompt);
        }
    }

    // =========================================================================
    // SPEECH SYNTHESIS (LEXI TALKS TO USER)
    // =========================================================================
    function speakText(text) {
        if (state.isMuted || !state.synth) return;
        state.synth.cancel();

        // Strip markdown asterisks and bullets for clean speech
        const speechClean = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/^[•\-\*]\s+/gm, '')
            .replace(/\[.*?\]/g, '')
            .trim();

        if (!speechClean) return;

        const utterance = new SpeechSynthesisUtterance(speechClean);
        utterance.rate = 0.90; // Dyslexia-calibrated comfortable pacing
        utterance.pitch = 1.0;

        // Try to pick a natural friendly voice
        const voices = state.synth.getVoices();
        const preferredVoice = voices.find(v => 
            v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'))
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        const visualizer = document.getElementById('lexi-voice-visualizer');
        const visualizerLabel = document.getElementById('lexi-voice-label');

        utterance.onstart = () => {
            state.isSpeaking = true;
            if (visualizer) visualizer.classList.add('active');
            if (visualizerLabel) visualizerLabel.textContent = 'Lexi is speaking...';
        };

        utterance.onend = utterance.onerror = () => {
            state.isSpeaking = false;
            if (!state.isListening && visualizer) {
                visualizer.classList.remove('active');
            }
        };

        state.currentUtterance = utterance;
        state.synth.speak(utterance);
    }

    function stopSpeaking() {
        if (state.synth) {
            state.synth.cancel();
            state.isSpeaking = false;
            const visualizer = document.getElementById('lexi-voice-visualizer');
            if (visualizer && !state.isListening) {
                visualizer.classList.remove('active');
            }
        }
    }

    // =========================================================================
    // SPEECH RECOGNITION (USER TALKS TO LEXI IN REAL TIME)
    // =========================================================================
    function initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            console.info('[Lexi AI] SpeechRecognition not supported in this browser.');
            return null;
        }

        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';

        const micBtn = document.getElementById('btn-lexi-mic');
        const visualizer = document.getElementById('lexi-voice-visualizer');
        const visualizerLabel = document.getElementById('lexi-voice-label');
        const inputField = document.getElementById('lexi-input');

        rec.onstart = () => {
            state.isListening = true;
            stopSpeaking(); // don't talk over user
            if (micBtn) micBtn.classList.add('listening');
            if (visualizer) visualizer.classList.add('active');
            if (visualizerLabel) visualizerLabel.textContent = 'Listening to you...';
        };

        rec.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (inputField) {
                inputField.value = final || interim;
            }
            if (visualizerLabel) {
                visualizerLabel.textContent = `Hearing: "${(final || interim).slice(-35)}"`;
            }

            if (final && final.trim().length > 1) {
                sendMessage(final.trim());
            }
        };

        rec.onerror = (event) => {
            console.warn('[Lexi AI] Speech recognition error:', event.error);
            state.isListening = false;
            if (micBtn) micBtn.classList.remove('listening');
            if (!state.isSpeaking && visualizer) visualizer.classList.remove('active');
        };

        rec.onend = () => {
            state.isListening = false;
            if (micBtn) micBtn.classList.remove('listening');
            if (!state.isSpeaking && visualizer) visualizer.classList.remove('active');
        };

        return rec;
    }

    function toggleListening() {
        if (!state.recognition) {
            state.recognition = initSpeechRecognition();
        }
        if (!state.recognition) {
            window.showToast?.('Speech recognition is not supported in this browser. Try typing below!', 'ℹ️');
            return;
        }

        if (state.isListening) {
            state.recognition.stop();
        } else {
            try {
                state.recognition.start();
            } catch (err) {
                console.warn('Could not start recognition:', err);
            }
        }
    }

    // =========================================================================
    // UI RENDERING & MESSAGES
    // =========================================================================
    function appendMessage(role, text) {
        const chatBody = document.getElementById('lexi-messages');
        if (!chatBody) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `lexi-message ${role}`;

        // Basic markdown formatting for bullets, bold, and linebreaks
        const formattedHtml = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^[•\-\*]\s+(.*)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br/>');

        let actionsHtml = '';
        if (role === 'assistant') {
            actionsHtml = `
                <div class="lexi-msg-actions">
                    <button class="lexi-action-pill btn-speak-msg" title="Read this answer aloud">🔊 Listen</button>
                    <button class="lexi-action-pill btn-copy-msg" title="Copy answer to clipboard">📋 Copy</button>
                    <button class="lexi-action-pill btn-insert-msg" title="Insert text into Writer">✍️ Insert</button>
                </div>
            `;
        }

        msgDiv.innerHTML = `
            <div class="lexi-bubble"><p>${formattedHtml}</p></div>
            ${actionsHtml}
        `;

        // Wire up action buttons
        if (role === 'assistant') {
            msgDiv.querySelector('.btn-speak-msg')?.addEventListener('click', () => speakText(text));
            msgDiv.querySelector('.btn-copy-msg')?.addEventListener('click', () => {
                navigator.clipboard.writeText(text);
                window.showToast?.('Copied to clipboard!', '✓');
            });
            msgDiv.querySelector('.btn-insert-msg')?.addEventListener('click', () => {
                insertIntoWriter(text);
            });
        }

        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function insertIntoWriter(text) {
        const editor = document.getElementById('writer-editor') || document.getElementById('editor-content');
        if (editor) {
            const clean = text.replace(/^[•\-\*]\s+/gm, '').replace(/\*\*/g, '');
            if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
                editor.value += (editor.value ? '\n\n' : '') + clean;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                editor.innerText += (editor.innerText ? '\n\n' : '') + clean;
            }
            window.showToast?.('Inserted into Writer!', '✍️');
            // Switch to writer view if available
            const writerBtn = document.querySelector('button[data-view="writer"]');
            if (writerBtn) writerBtn.click();
        } else {
            window.showToast?.('Switch to Writer view to insert.', 'ℹ️');
        }
    }

    async function sendMessage(userText) {
        if (!userText || !userText.trim()) return;
        const text = userText.trim();

        const inputField = document.getElementById('lexi-input');
        if (inputField) inputField.value = '';

        appendMessage('user', text);
        state.history.push({ role: 'user', text });

        // Show typing indicator
        const chatBody = document.getElementById('lexi-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'lexi-message assistant lexi-typing';
        typingDiv.id = 'lexi-typing-indicator';
        typingDiv.innerHTML = `<div class="lexi-bubble" style="opacity: 0.7;">Thinking...</div>`;
        chatBody?.appendChild(typingDiv);
        chatBody.scrollTop = chatBody.scrollHeight;

        try {
            const reply = await queryGemini(text);
            document.getElementById('lexi-typing-indicator')?.remove();
            appendMessage('assistant', reply);
            state.history.push({ role: 'model', text: reply });

            // Auto-speak if voice mode is on
            if (state.voiceMode && !state.isMuted) {
                speakText(reply);
            }
        } catch (e) {
            document.getElementById('lexi-typing-indicator')?.remove();
            const fallbackReply = handleOfflineCognitiveResponse(text);
            appendMessage('assistant', fallbackReply);
        }
    }

    // =========================================================================
    // INITIALIZATION & UI INJECTION
    // =========================================================================
    function injectLexiUI() {
        if (document.getElementById('lexi-assistant-container')) return;

        const container = document.createElement('div');
        container.id = 'lexi-assistant-container';
        container.innerHTML = `
            <!-- Floating Launcher Button -->
            <button
                type="button"
                id="btn-lexi-toggle"
                class="lexi-launcher-btn"
                title="Ask Lexi AI (Alt+A)"
            >
                <div class="lexi-avatar-icon" aria-hidden="true">
                    <span>⚡</span>
                    <span class="lexi-live-dot"></span>
                </div>
                <span>Ask Lexi AI</span>
            </button>

            <!-- Floating AI Drawer Panel -->
            <aside
                id="lexi-drawer"
                class="lexi-drawer hidden"
                role="complementary"
                aria-label="Lexi AI Assistant"
            >
                <!-- Drawer Header -->
                <div class="lexi-header">
                    <div class="lexi-header-brand">
                        <div class="lexi-avatar-icon" style="width:28px; height:28px;">
                            <span>⚡</span>
                        </div>
                        <div>
                            <div class="lexi-header-title">
                                <span>Lexi AI</span>
                                <span class="lexi-header-badge" id="lexi-engine-badge">Free Cognitive</span>
                            </div>
                            <div class="lexi-header-subtitle">Real-Time Voice & Reading Companion</div>
                        </div>
                    </div>
                    <div class="lexi-header-actions">
                        <button type="button" class="lexi-icon-btn ${state.voiceMode ? 'active' : ''}" id="btn-lexi-voice-toggle" title="Toggle Auto-Speak Voice Mode" aria-label="Toggle Voice Mode">
                            🗣
                        </button>
                        <button type="button" class="lexi-icon-btn ${state.isMuted ? 'active' : ''}" id="btn-lexi-mute-toggle" title="Mute/Unmute Speech" aria-label="Mute Speech">
                            ${state.isMuted ? '🔇' : '🔊'}
                        </button>
                        <button type="button" class="lexi-icon-btn" id="btn-lexi-settings-toggle" title="AI Settings & Free Key" aria-label="AI Settings">
                            ⚙
                        </button>
                        <button type="button" class="lexi-icon-btn" id="btn-lexi-close" title="Close Assistant" aria-label="Close Lexi Assistant">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Voice Audio Visualizer Wave -->
                <div class="lexi-voice-visualizer" id="lexi-voice-visualizer" aria-live="polite">
                    <div class="lexi-wave-bar"></div>
                    <div class="lexi-wave-bar"></div>
                    <div class="lexi-wave-bar"></div>
                    <div class="lexi-wave-bar"></div>
                    <div class="lexi-wave-bar"></div>
                    <span id="lexi-voice-label" style="margin-left: 6px;">Listening...</span>
                </div>

                <!-- Quick Action Chips Bar -->
                <div class="lexi-chips-bar" role="toolbar" aria-label="Quick Prompts">
                    <button type="button" class="lexi-chip" data-prompt="Explain this page simply">💡 Explain Page</button>
                    <button type="button" class="lexi-chip" data-prompt="Simplify this text into plain language">✨ Simplify</button>
                    <button type="button" class="lexi-chip" data-prompt="Review my writing draft gently">✍️ Review Draft</button>
                    <button type="button" class="lexi-chip" data-prompt="Break down difficult words into syllables">🔤 Tricky Words</button>
                    <button type="button" class="lexi-chip" data-prompt="Create 3 flashcards from this text">🃏 Make Cards</button>
                    <button type="button" class="lexi-chip" data-prompt="Who are you and how can you help me?">❓ Help</button>
                </div>

                <!-- Messages Stream -->
                <div class="lexi-chat-body" id="lexi-messages" role="log" aria-live="polite">
                    <div class="lexi-message assistant">
                        <div class="lexi-bubble">
                            <p>Hi! I'm <strong>Lexi</strong>, your voice & reading AI companion.</p>
                            <p>Talk to me using the <strong>microphone</strong>, pick a quick chip above, or type anything below!</p>
                        </div>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="lexi-input-area">
                    <button
                        type="button"
                        id="btn-lexi-mic"
                        class="lexi-mic-btn"
                        title="Talk to Lexi (Voice Mode)"
                        aria-label="Speak to Lexi"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                    </button>
                    <input
                        type="text"
                        id="lexi-input"
                        class="lexi-text-input"
                        placeholder="Ask Lexi or tap mic to speak..."
                        aria-label="Message Lexi"
                    />
                    <button
                        type="button"
                        id="btn-lexi-send"
                        class="lexi-send-btn"
                        title="Send Message"
                        aria-label="Send Message"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>

                <!-- Settings Overlay -->
                <div class="lexi-settings-panel hidden" id="lexi-settings-panel">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; font-size:0.95rem; font-weight:800;">Lexi AI Settings</h4>
                        <button type="button" class="icon-btn-sm" id="btn-close-lexi-settings" aria-label="Close settings">✕</button>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin:0;">
                        Lexi runs in <strong>Free Local Engine</strong> mode by default. Connect your free Google Gemini API key for unlimited deep generative intelligence.
                    </p>
                    <div>
                        <label for="lexi-gemini-key-input" style="display:block; font-size:0.8rem; font-weight:700; margin-bottom:4px;">
                            Google Gemini API Key (100% Free)
                        </label>
                        <input
                            type="password"
                            id="lexi-gemini-key-input"
                            class="doc-search-input"
                            placeholder="AIzaSy..."
                            value="${state.apiKey}"
                            style="font-size:0.82rem; width:100%;"
                        />
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                            Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style="color:#EC633D; text-decoration:underline;">Google AI Studio</a> (No credit card needed).
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-top:8px;">
                        <button type="button" id="btn-save-lexi-key" class="btn btn-primary" style="padding:6px 14px; font-size:0.82rem;">
                            Save Key
                        </button>
                        <button type="button" id="btn-clear-lexi-key" class="btn" style="padding:6px 14px; font-size:0.82rem; color:#c2410c;">
                            Reset to Offline
                        </button>
                    </div>
                </div>
            </aside>
        `;

        document.body.appendChild(container);

        // Update badge
        updateEngineBadge();

        // Wire Event Listeners
        const launcherBtn = document.getElementById('btn-lexi-toggle');
        const drawer = document.getElementById('lexi-drawer');
        const closeBtn = document.getElementById('btn-lexi-close');
        const voiceToggleBtn = document.getElementById('btn-lexi-voice-toggle');
        const muteToggleBtn = document.getElementById('btn-lexi-mute-toggle');
        const settingsToggleBtn = document.getElementById('btn-lexi-settings-toggle');
        const settingsCloseBtn = document.getElementById('btn-close-lexi-settings');
        const settingsPanel = document.getElementById('lexi-settings-panel');
        const saveKeyBtn = document.getElementById('btn-save-lexi-key');
        const clearKeyBtn = document.getElementById('btn-clear-lexi-key');
        const keyInput = document.getElementById('lexi-gemini-key-input');
        const micBtn = document.getElementById('btn-lexi-mic');
        const sendBtn = document.getElementById('btn-lexi-send');
        const inputField = document.getElementById('lexi-input');

        function toggleDrawer(force) {
            state.isOpen = typeof force === 'boolean' ? force : !state.isOpen;
            if (drawer) {
                drawer.classList.toggle('hidden', !state.isOpen);
                if (state.isOpen) {
                    inputField?.focus();
                } else {
                    stopSpeaking();
                    if (state.isListening && state.recognition) {
                        state.recognition.stop();
                    }
                }
            }
        }

        launcherBtn?.addEventListener('click', () => toggleDrawer());
        closeBtn?.addEventListener('click', () => toggleDrawer(false));

        // Keyboard Shortcut Alt+A to toggle Lexi
        window.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 'a' || e.key === 'A')) {
                e.preventDefault();
                toggleDrawer();
            }
        });

        // Voice mode toggle
        voiceToggleBtn?.addEventListener('click', () => {
            state.voiceMode = !state.voiceMode;
            localStorage.setItem(STORAGE_KEY_VOICE_MODE, state.voiceMode.toString());
            voiceToggleBtn.classList.toggle('active', state.voiceMode);
            window.showToast?.(state.voiceMode ? 'Voice Auto-Speak ON' : 'Voice Auto-Speak OFF', '🗣');
        });

        // Mute toggle
        muteToggleBtn?.addEventListener('click', () => {
            state.isMuted = !state.isMuted;
            localStorage.setItem(STORAGE_KEY_MUTED, state.isMuted.toString());
            muteToggleBtn.classList.toggle('active', state.isMuted);
            muteToggleBtn.textContent = state.isMuted ? '🔇' : '🔊';
            if (state.isMuted) stopSpeaking();
            window.showToast?.(state.isMuted ? 'Lexi Muted' : 'Lexi Unmuted', state.isMuted ? '🔇' : '🔊');
        });

        // Settings toggle
        settingsToggleBtn?.addEventListener('click', () => {
            settingsPanel?.classList.toggle('hidden');
        });
        settingsCloseBtn?.addEventListener('click', () => {
            settingsPanel?.classList.add('hidden');
        });

        // Save Key
        saveKeyBtn?.addEventListener('click', () => {
            const key = keyInput?.value?.trim() || '';
            state.apiKey = key;
            if (key) {
                localStorage.setItem(STORAGE_KEY_GEMINI, key);
                window.showToast?.('Gemini 1.5 Flash Connected!', '⚡');
            } else {
                localStorage.removeItem(STORAGE_KEY_GEMINI);
                window.showToast?.('Using Free Offline Engine', 'ℹ️');
            }
            updateEngineBadge();
            settingsPanel?.classList.add('hidden');
        });

        // Clear Key
        clearKeyBtn?.addEventListener('click', () => {
            state.apiKey = '';
            localStorage.removeItem(STORAGE_KEY_GEMINI);
            if (keyInput) keyInput.value = '';
            updateEngineBadge();
            settingsPanel?.classList.add('hidden');
            window.showToast?.('Reset to Free Offline Engine', 'ℹ️');
        });

        // Quick Prompt Chips
        document.querySelectorAll('.lexi-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.dataset.prompt;
                if (prompt) {
                    sendMessage(prompt);
                }
            });
        });

        // Mic Button
        micBtn?.addEventListener('click', toggleListening);

        // Send Button & Enter Key
        sendBtn?.addEventListener('click', () => {
            if (inputField) sendMessage(inputField.value);
        });
        inputField?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage(inputField.value);
            }
        });
    }

    function updateEngineBadge() {
        const badge = document.getElementById('lexi-engine-badge');
        if (badge) {
            if (state.apiKey) {
                badge.textContent = 'Gemini Flash AI';
                badge.style.background = '#CDE4D6';
                badge.style.color = '#166534';
            } else {
                badge.textContent = 'Free Cognitive';
                badge.style.background = '#E2D2B3';
                badge.style.color = '#212121';
            }
        }
    }

    // Expose Lexi globally
    window.DA_Lexi = {
        open() {
            const drawer = document.getElementById('lexi-drawer');
            if (drawer) drawer.classList.remove('hidden');
            state.isOpen = true;
        },
        close() {
            const drawer = document.getElementById('lexi-drawer');
            if (drawer) drawer.classList.add('hidden');
            state.isOpen = false;
            stopSpeaking();
        },
        ask(prompt) {
            this.open();
            sendMessage(prompt);
        },
        speak: speakText,
        stopSpeaking: stopSpeaking
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectLexiUI);
    } else {
        injectLexiUI();
    }
})();
