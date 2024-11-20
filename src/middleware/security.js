const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const helmetConfig = helmet({
    // Mencegah clickjacking dengan X-Frame-Options
    frameguard: {
        action: 'deny'
    },
    // Mengatur Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        }
    },
    // Menyembunyikan X-Powered-By header
    hidePoweredBy: true,
    // Mencegah MIME type sniffing
    noSniff: true,
    // Mengaktifkan XSS filter di browser
    xssFilter: true,
    // Mengatur HSTS (HTTP Strict Transport Security)
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// Konfigurasi Rate Limiter
const rateLimitConfig = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // maksimum 100 request per IP
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP, please try again later.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Handler ketika limit tercapai
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests from this IP, please try again later.'
            }
        });
    }
});

// Rate Limiter khusus untuk authentication
const authLimiter = rateLimit({
    windowMs: 10 * 1000, // 10 detik untuk testing
    max: 5, // maksimum 5 percobaan login per IP
    message: {
        success: false,
        error: {
            code: 'AUTH_LIMIT_EXCEEDED',
            message: 'Too many login attempts, please try again later'
        }
    }
});

module.exports = {
    helmetConfig,
    rateLimitConfig,
    authLimiter
};