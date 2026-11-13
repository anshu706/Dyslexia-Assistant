/**
 * Dyslexia Assistant - PostgreSQL Storage & Connection Pool (ES Module)
 * Provides resilient multi-tenant storage, connection pooling, and readiness probing.
 */

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;

if (DATABASE_URL) {
    pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
        console.error('[PostgresPoolError] Unexpected error on idle client:', err.message);
    });
}

export async function initDb() {
    if (!pool) {
        return false;
    }
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const schemaSql = fs.readFileSync(path.join(currentDir, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    return true;
}

export async function query(text, params) {
    if (!pool) {
        return null;
    }
    return pool.query(text, params);
}

export async function checkReadiness() {
    if (!pool) {
        // In local in-memory fallback mode, mark ready
        return { database: 'in-memory-fallback', status: 'ready' };
    }
    try {
        const res = await pool.query('SELECT 1 AS ready');
        return { database: 'postgresql', connected: res.rows[0]?.ready === 1, status: 'ready' };
    } catch (err) {
        return { database: 'postgresql', connected: false, error: err.message, status: 'unhealthy' };
    }
}

export async function closePool() {
    if (pool) {
        await pool.end();
    }
}

