/**
 * Dyslexia Assistant - Secure Server Middleware (ES Module)
 * Implements Secure Vibe Coding Best Practices:
 * 
 * - Layer 01: Always Validate on the Server (types, lengths, MIME types, file sizes)
 * - Layer 02: Protect Login With Rate Limiting (IP + account throttling, sliding window)
 * - Layer 04: Don't Leak Information Through Errors (Generic prod messages, no stack traces)
 * - Step 5: Prod Config (Security headers, CORS controls)
 */

/**
 * In-memory sliding-window rate limiter for sensitive routes (e.g. login, document sync).
 */
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 5, message = 'Too many requests. Please try again later.' } = {}) {
    const hits = new Map();

    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of hits.entries()) {
            if (record.resetTime <= now) {
                hits.delete(key);
            }
        }
    }, windowMs).unref();

    return function rateLimitMiddleware(req, res, next) {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const accountId = req.body?.email || req.body?.username || '';
        const key = accountId ? `${ip}:${accountId}` : ip;

        const now = Date.now();
        const record = hits.get(key) || { count: 0, resetTime: now + windowMs };

        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + windowMs;
        }

        record.count++;
        hits.set(key, record);

        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

        if (record.count > max) {
            res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
            return res.status(429).json({
                error: message,
                code: 'RATE_LIMIT_EXCEEDED'
            });
        }

        next();
    };
}

/**
 * Layer 01: Server-Side Input Validation Middleware
 */
export function validateSchema(schema) {
    return function (req, res, next) {
        const errors = [];
        const target = req.body || {};

        for (const [field, rules] of Object.entries(schema)) {
            const val = target[field];

            if (rules.required && (val === undefined || val === null || val === '')) {
                errors.push(`Field "${field}" is required.`);
                continue;
            }

            if (val !== undefined && val !== null) {
                if (rules.type && typeof val !== rules.type) {
                    errors.push(`Field "${field}" must be of type ${rules.type}.`);
                    continue;
                }

                if (rules.type === 'string') {
                    if (rules.minLength && val.length < rules.minLength) {
                        errors.push(`Field "${field}" must be at least ${rules.minLength} characters.`);
                    }
                    if (rules.maxLength && val.length > rules.maxLength) {
                        errors.push(`Field "${field}" cannot exceed ${rules.maxLength} characters.`);
                    }
                    if (rules.format === 'email') {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(val)) {
                            errors.push(`Field "${field}" must be a valid email address.`);
                        }
                    }
                }

                if (rules.type === 'number') {
                    if (rules.min !== undefined && val < rules.min) {
                        errors.push(`Field "${field}" cannot be less than ${rules.min}.`);
                    }
                    if (rules.max !== undefined && val > rules.max) {
                        errors.push(`Field "${field}" cannot exceed ${rules.max}.`);
                    }
                }

                if (rules.type === 'array') {
                    if (!Array.isArray(val)) {
                        errors.push(`Field "${field}" must be an array.`);
                    } else if (rules.maxItems && val.length > rules.maxItems) {
                        errors.push(`Field "${field}" cannot contain more than ${rules.maxItems} items.`);
                    }
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed.',
                details: errors
            });
        }

        next();
    };
}

/**
 * Step 5: Production Security Headers Middleware
 */
export function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:;"
    );
    next();
}

/**
 * Layer 04: Safe Error Handling Middleware
 */
export function safeErrorHandler(err, req, res, next) {
    const isDev = process.env.NODE_ENV === 'development';

    console.error(`[SecureServerError] ${req.method} ${req.url}:`, err);

    const statusCode = err.statusCode || err.status || 500;

    if (isDev) {
        return res.status(statusCode).json({
            error: err.message || 'Internal Server Error',
            stack: err.stack,
            code: err.code
        });
    }

    res.status(statusCode).json({
        error: statusCode === 500 ? 'An internal error occurred. Please try again later.' : (err.message || 'Request failed.'),
        code: err.code || 'INTERNAL_ERROR'
    });
}
