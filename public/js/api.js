/**
 * Dyslexia Assistant - API & Sync Client
 * Communicates with Node.js backend for authentication and cloud sync.
 * Strict CSRF compliant (X-Requested-With) and session cookie enabled.
 */

const API = {
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    },

    async checkSession() {
        try {
            const res = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.user || null;
        } catch (_) {
            return null;
        }
    },

    async register(email, password) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Registration failed.');
        }
        return data;
    },

    async login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Login failed.');
        }
        return data;
    },

    async logout() {
        try {
            const res = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: this.getHeaders(),
                credentials: 'include'
            });
            return res.ok;
        } catch (_) {
            return false;
        }
    },

    async changePassword(currentPassword, newPassword) {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to update password.');
        }
        return data;
    },

    // =========================================================================
    // DOCUMENT SYNC
    // =========================================================================
    async fetchRemoteDocuments() {
        try {
            const res = await fetch('/api/sync/documents', {
                credentials: 'include'
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.documents || [];
        } catch (_) {
            return null;
        }
    },

    async saveRemoteDocument(title, content) {
        try {
            const res = await fetch('/api/sync/documents', {
                method: 'POST',
                headers: this.getHeaders(),
                credentials: 'include',
                body: JSON.stringify({ title, content })
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.document || null;
        } catch (_) {
            return null;
        }
    },

    async updateRemoteDocument(id, title, content) {
        try {
            const res = await fetch(`/api/sync/documents/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                credentials: 'include',
                body: JSON.stringify({ title, content })
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.document || null;
        } catch (_) {
            return null;
        }
    },

    async deleteRemoteDocument(id) {
        try {
            const res = await fetch(`/api/sync/documents/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                credentials: 'include'
            });
            return res.ok;
        } catch (_) {
            return false;
        }
    },

    // =========================================================================
    // FLASHCARD SYNC
    // =========================================================================
    async fetchRemoteFlashcards() {
        try {
            const res = await fetch('/api/sync/flashcards', {
                credentials: 'include'
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.cards || [];
        } catch (_) {
            return null;
        }
    },

    async saveRemoteFlashcards(cards) {
        try {
            const res = await fetch('/api/sync/flashcards', {
                method: 'POST',
                headers: this.getHeaders(),
                credentials: 'include',
                body: JSON.stringify({ cards })
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (_) {
            return null;
        }
    }
};

window.DA_API = API;
