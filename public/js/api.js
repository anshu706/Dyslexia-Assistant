/**
 * Dyslexia Assistant - API & Sync Client (Phase 2 Cloud Backend)
 * Dual-engine architecture:
 * 1. Supabase Cloud Backend (free tier direct-to-database with RLS) when configured
 * 2. Node.js backend fallback with strict CSRF + HTTP cookies for local & offline testing
 */

const API = {
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    },

    getSupabase() {
        return (typeof window !== 'undefined' && window.DA_SUPABASE) ? window.DA_SUPABASE : null;
    },

    async checkSession() {
        const sb = this.getSupabase();
        if (sb) {
            try {
                const { data: { session }, error } = await sb.auth.getSession();
                if (!error && session?.user) {
                    return {
                        id: session.user.id,
                        email: session.user.email,
                        provider: 'supabase'
                    };
                }
            } catch (_) {
                // fall through to REST check
            }
        }

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
        const sb = this.getSupabase();
        if (sb) {
            const { data, error } = await sb.auth.signUp({
                email,
                password
            });
            if (error) {
                throw new Error(error.message || 'Registration failed via cloud.');
            }
            if (data?.user) {
                return {
                    message: 'Account created successfully.',
                    user: { id: data.user.id, email: data.user.email, provider: 'supabase' }
                };
            }
        }

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
        const sb = this.getSupabase();
        if (sb) {
            const { data, error } = await sb.auth.signInWithPassword({
                email,
                password
            });
            if (error) {
                throw new Error(error.message || 'Invalid email or password.');
            }
            if (data?.user) {
                return {
                    message: 'Signed in successfully.',
                    user: { id: data.user.id, email: data.user.email, provider: 'supabase' }
                };
            }
        }

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
        const sb = this.getSupabase();
        if (sb) {
            try {
                await sb.auth.signOut();
                return true;
            } catch (_) {
                // fall through
            }
        }

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
        const sb = this.getSupabase();
        if (sb) {
            const { data, error } = await sb.auth.updateUser({
                password: newPassword
            });
            if (error) {
                throw new Error(error.message || 'Failed to update password.');
            }
            return { message: 'Password updated successfully.', user: data.user };
        }

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
        const sb = this.getSupabase();
        if (sb) {
            try {
                const { data, error } = await sb
                    .from('documents')
                    .select('*')
                    .order('updated_at', { ascending: false });

                if (!error && Array.isArray(data)) {
                    return data.map(d => ({
                        id: d.id,
                        title: d.title,
                        content: d.content || '',
                        updatedAt: new Date(d.updated_at).getTime(),
                        createdAt: new Date(d.created_at).getTime()
                    }));
                }
            } catch (_) {
                // fallback to REST
            }
        }

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
        const sb = this.getSupabase();
        if (sb) {
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (session?.user) {
                    const { data, error } = await sb
                        .from('documents')
                        .insert([{
                            user_id: session.user.id,
                            title: title || 'Untitled Document',
                            content: content || '',
                            updated_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (!error && data) {
                        return {
                            id: data.id,
                            title: data.title,
                            content: data.content,
                            updatedAt: new Date(data.updated_at).getTime()
                        };
                    }
                }
            } catch (_) {
                // fallback to REST
            }
        }

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
        const sb = this.getSupabase();
        if (sb) {
            try {
                const { data, error } = await sb
                    .from('documents')
                    .update({
                        title: title || 'Untitled Document',
                        content: content || '',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .select()
                    .single();

                if (!error && data) {
                    return {
                        id: data.id,
                        title: data.title,
                        content: data.content,
                        updatedAt: new Date(data.updated_at).getTime()
                    };
                }
            } catch (_) {
                // fallback to REST
            }
        }

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
        const sb = this.getSupabase();
        if (sb) {
            try {
                const { error } = await sb
                    .from('documents')
                    .delete()
                    .eq('id', id);
                if (!error) return true;
            } catch (_) {
                // fallback to REST
            }
        }

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
        const sb = this.getSupabase();
        if (sb) {
            try {
                const { data, error } = await sb
                    .from('flashcards')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && Array.isArray(data)) {
                    return data.map(c => ({
                        id: c.id,
                        front: c.front,
                        back: c.back,
                        category: c.category || 'General',
                        level: c.level || 0,
                        nextReview: c.next_review ? new Date(c.next_review).getTime() : Date.now()
                    }));
                }
            } catch (_) {
                // fallback to REST
            }
        }

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
        const sb = this.getSupabase();
        if (sb && Array.isArray(cards)) {
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (session?.user) {
                    // Replace / sync flashcards for current user
                    await sb.from('flashcards').delete().eq('user_id', session.user.id);
                    if (cards.length > 0) {
                        const rows = cards.map(c => ({
                            user_id: session.user.id,
                            front: c.front,
                            back: c.back,
                            category: c.category || 'General',
                            level: c.level || 0,
                            next_review: c.nextReview ? new Date(c.nextReview).toISOString() : new Date().toISOString()
                        }));
                        const { data, error } = await sb.from('flashcards').insert(rows).select();
                        if (!error && data) {
                            return { success: true, count: data.length };
                        }
                    } else {
                        return { success: true, count: 0 };
                    }
                }
            } catch (_) {
                // fallback to REST
            }
        }

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
    },

    // =========================================================================
    // SEAMLESS GUEST-TO-USER ONBOARDING MIGRATION
    // =========================================================================
    async migrateGuestData(user) {
        if (!user || !user.id) return { migratedDocs: 0, migratedCards: 0 };
        const migrationKey = `da_migrated_guest_${user.id}`;
        if (localStorage.getItem(migrationKey)) {
            return { migratedDocs: 0, migratedCards: 0 }; // Already migrated for this user
        }

        let migratedDocs = 0;
        let migratedCards = 0;

        try {
            // 1. Migrate Local Documents to Cloud
            const localDocs = window.DA_Docs?.getDocuments ? window.DA_Docs.getDocuments() : [];
            const remoteDocs = await this.fetchRemoteDocuments() || [];

            for (const doc of localDocs) {
                const exists = remoteDocs.some(rd => rd.id === doc.id || rd.title === doc.title);
                if (!exists && (doc.title !== 'Untitled Document' || (doc.content && doc.content.trim().length > 0))) {
                    await this.saveRemoteDocument(doc.title, doc.content);
                    migratedDocs++;
                }
            }

            // 2. Migrate Local Flashcards to Cloud
            const localCards = window.DA_getFlashcards ? window.DA_getFlashcards() : [];
            const remoteCards = await this.fetchRemoteFlashcards() || [];

            if (localCards.length > 0 && remoteCards.length === 0) {
                await this.saveRemoteFlashcards(localCards);
                migratedCards = localCards.length;
            }

            localStorage.setItem(migrationKey, Date.now().toString());
        } catch (err) {
            console.warn('[Migration] Partial guest sync error:', err);
        }

        return { migratedDocs, migratedCards };
    }
};

window.DA_API = API;
