/**
 * Dyslexia Assistant - Main Application Controller
 * Handles view routing and global settings.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- View Routing ---
    const navBtns = document.querySelectorAll('.sidebar-nav .nav-btn');
    const viewPanels = document.querySelectorAll('.view-panel');

    function switchView(viewId) {
        // Update nav buttons
        navBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.removeAttribute('aria-current');
            if (btn.getAttribute('data-view') === viewId) {
                btn.classList.add('active');
                btn.setAttribute('aria-current', 'page');
            }
        });

        // Update view panels
        viewPanels.forEach(panel => {
            panel.classList.remove('active');
            panel.hidden = true;
            if (panel.id === `view-${viewId}`) {
                panel.classList.add('active');
                panel.hidden = false;
            }
        });
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewId = e.currentTarget.getAttribute('data-view');
            switchView(viewId);
        });
    });

    // --- Global Settings (High Contrast Mode) ---
    const toggleSettingsBtn = document.getElementById('toggle-settings');
    let highContrast = false;

    if (toggleSettingsBtn) {
        toggleSettingsBtn.addEventListener('click', () => {
            highContrast = !highContrast;
            if (highContrast) {
                document.documentElement.classList.add('high-contrast-mode');
                toggleSettingsBtn.classList.add('active');
            } else {
                document.documentElement.classList.remove('high-contrast-mode');
                toggleSettingsBtn.classList.remove('active');
            }
        });
    }
});
