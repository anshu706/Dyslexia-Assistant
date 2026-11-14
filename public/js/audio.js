/**
 * Dyslexia Assistant - Focus Sound Generator
 * High-performance, 100% offline Web Audio API synthesizer.
 * Generates Brownian noise, Pink noise, and Gentle Rain to mask distractions
 * and enhance cognitive focus for neurodivergent reading & writing.
 */

(function () {
    'use strict';

    let audioCtx = null;
    let currentSource = null;
    let gainNode = null;
    let currentSoundType = 'off'; // 'off' | 'brown' | 'pink' | 'rain'
    let volume = 0.5;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function createBrownNoiseBuffer(ctx, duration = 5) {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Brownian walk with leak to prevent DC offset
            lastOut = (lastOut + 0.02 * white) / 1.02;
            data[i] = lastOut * 3.5;
        }
        return buffer;
    }

    function createPinkNoiseBuffer(ctx, duration = 5) {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
        return buffer;
    }

    function createRainBuffer(ctx, duration = 5) {
        // Soft atmospheric rainfall created by combining brownian body with gentle droplet filtering
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.03 * white) / 1.025;
            // Introduce subtle droplet variation
            const droplet = (Math.random() > 0.997) ? (Math.random() * 0.4) : 0;
            data[i] = (lastOut * 2.8) + droplet;
        }
        return buffer;
    }

    function stop() {
        if (currentSource) {
            try {
                currentSource.stop();
                currentSource.disconnect();
            } catch (e) {
                // Ignore if already stopped
            }
            currentSource = null;
        }
        currentSoundType = 'off';
        updateUI();
    }

    function play(soundType) {
        if (soundType === 'off' || soundType === currentSoundType) {
            stop();
            return;
        }

        const ctx = getAudioContext();
        if (!ctx) {
            console.warn('Web Audio API is not supported in this browser environment.');
            return;
        }

        stop();

        let buffer;
        if (soundType === 'brown') {
            buffer = createBrownNoiseBuffer(ctx);
        } else if (soundType === 'pink') {
            buffer = createPinkNoiseBuffer(ctx);
        } else if (soundType === 'rain') {
            buffer = createRainBuffer(ctx);
        } else {
            return;
        }

        currentSource = ctx.createBufferSource();
        currentSource.buffer = buffer;
        currentSource.loop = true;

        if (!gainNode) {
            gainNode = ctx.createGain();
            gainNode.connect(ctx.destination);
        }

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        currentSource.connect(gainNode);
        currentSource.start(0);

        currentSoundType = soundType;
        updateUI();
    }

    function setVolume(newVol) {
        volume = Math.max(0, Math.min(1, parseFloat(newVol) || 0.5));
        if (gainNode && audioCtx) {
            gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        }
        localStorage.setItem('da_focus_sound_vol', String(volume));
    }

    function updateUI() {
        const soundBtn = document.getElementById('tool-focus-sound');
        const soundLabel = document.getElementById('focus-sound-label');
        const soundSelect = document.getElementById('focus-sound-select');

        if (soundBtn) {
            if (currentSoundType === 'off') {
                soundBtn.classList.remove('active');
                if (soundLabel) soundLabel.textContent = 'Sound: Off';
            } else {
                soundBtn.classList.add('active');
                const names = { brown: 'Brown Noise', pink: 'Pink Noise', rain: 'Gentle Rain' };
                if (soundLabel) soundLabel.textContent = names[currentSoundType] || 'Sound: On';
            }
        }

        if (soundSelect && soundSelect.value !== currentSoundType) {
            soundSelect.value = currentSoundType;
        }
    }

    window.DA_Audio = {
        play,
        stop,
        setVolume,
        getCurrentType: () => currentSoundType,
        getVolume: () => volume,
        initUI() {
            // Restore saved volume
            const savedVol = localStorage.getItem('da_focus_sound_vol');
            if (savedVol !== null) {
                volume = Math.max(0, Math.min(1, parseFloat(savedVol) || 0.5));
            }

            const soundBtn = document.getElementById('tool-focus-sound');
            const soundSelect = document.getElementById('focus-sound-select');
            const soundVol = document.getElementById('focus-sound-volume');

            if (soundSelect) {
                soundSelect.addEventListener('change', (e) => {
                    play(e.target.value);
                });
            }

            if (soundVol) {
                soundVol.value = volume;
                soundVol.addEventListener('input', (e) => {
                    setVolume(e.target.value);
                });
            }

            if (soundBtn) {
                soundBtn.addEventListener('click', () => {
                    // Quick toggle between off and brown noise (or previous sound)
                    if (currentSoundType === 'off') {
                        play('brown');
                        window.showToast?.('Brown noise focus sound started', '🎧');
                    } else {
                        stop();
                        window.showToast?.('Focus sound paused', '⏸');
                    }
                });
            }

            updateUI();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        window.DA_Audio.initUI();
    });
})();
