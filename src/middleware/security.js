const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fit-kitchen-backend-tst.vercel.app"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fit-kitchen-backend-tst.vercel.app"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://fit-kitchen-backend-tst.vercel.app"],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    originAgentCluster: true
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