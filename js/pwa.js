/**
 * Dyslexia Assistant - Progressive Web App (PWA) Manager
 * Captures beforeinstallprompt event, displays native install button,
 * and handles one-click standalone app installation on desktop and mobile.
 */

(function () {
    'use strict';

    let deferredPrompt = null;

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
    }

    function initPWA() {
        const installBtn = document.getElementById('btn-pwa-install');
        const installBanner = document.getElementById('pwa-install-banner');
        const dismissBannerBtn = document.getElementById('btn-dismiss-install');
        const bannerActionBtn = document.getElementById('btn-banner-install');

        if (isStandalone()) {
            console.log('Dyslexia Assistant is running as an installed PWA.');
            if (installBtn) installBtn.style.display = 'none';
            if (installBanner) installBanner.style.display = 'none';
            return;
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            deferredPrompt = e;

            // Show install button in header
            if (installBtn) {
                installBtn.style.display = 'inline-flex';
            }

            // Show install promotion banner if not dismissed before
            const dismissed = localStorage.getItem('da_pwa_banner_dismissed');
            if (installBanner && !dismissed) {
                installBanner.style.display = 'flex';
            }
        });

        async function triggerInstall() {
            if (!deferredPrompt) {
                window.showToast?.('To install, use browser menu: "Install app" or "Add to Home Screen"', 'ℹ️');
                return;
            }

            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);

            if (outcome === 'accepted') {
                if (installBtn) installBtn.style.display = 'none';
                if (installBanner) installBanner.style.display = 'none';
                window.showToast?.('Installing Dyslexia Assistant...', '🚀');
            }

            deferredPrompt = null;
        }

        if (installBtn) {
            installBtn.addEventListener('click', triggerInstall);
        }

        if (bannerActionBtn) {
            bannerActionBtn.addEventListener('click', triggerInstall);
        }

        if (dismissBannerBtn) {
            dismissBannerBtn.addEventListener('click', () => {
                if (installBanner) installBanner.style.display = 'none';
                localStorage.setItem('da_pwa_banner_dismissed', 'true');
            });
        }

        window.addEventListener('appinstalled', () => {
            console.log('Dyslexia Assistant was installed');
            if (installBtn) installBtn.style.display = 'none';
            if (installBanner) installBanner.style.display = 'none';
            window.showToast?.('Dyslexia Assistant installed successfully!', '🎉');
        });
    }

    document.addEventListener('DOMContentLoaded', initPWA);
})();
