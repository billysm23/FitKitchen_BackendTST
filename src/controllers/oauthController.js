const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const jwt = require('jsonwebtoken');
const Session = require('../models/session');

const SESSION_CONFIG = {
    MAX_ACTIVE_SESSIONS: 2,
    SESSION_EXPIRY: 24 * 60 * 60 * 1000 // 24 jam
};

const getCallbackUrl = () => {
    const clientUrl = process.env.CLIENT_URL;
    const baseUrl = clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl;
    return `${baseUrl}/auth/callback`;
};

exports.googleSignIn = async (req, res) => {
    try {
        const callbackUrl = getCallbackUrl();
        console.log('Callback URL:', callbackUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: callbackUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });

        if (error) {
            console.error('Google OAuth Error:', error);
            throw error;
        }

        console.log('OAuth URL generated:', data.url); // Debugging
        res.json({
            success: true,
            data: {
                url: data.url
            }
        });
    } catch (error) {
        console.error('Google Sign In Error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
                message: 'Failed to initialize Google sign in'
            }
        });
    }
};

exports.handleOAuthCallback = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            console.error('No code received in callback');
            throw new AppError(
                'Authorization code is missing',
                400,
                ErrorCodes.MISSING_FIELD
            );
        }

        console.log('Processing OAuth callback with code:', code);

        const { data: { user, session }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Session exchange error:', error);
            throw error;
        }

        if (!user || !session) {
            throw new AppError(
                'Failed to authenticate user',
                401,
                ErrorCodes.AUTHENTICATION_FAILED
            );
        }

        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await Session.create({
            userId: user.id,
            token,
            isActive: true,
            expiresAt: new Date(Date.now() + SESSION_CONFIG.SESSION_EXPIRY)
        });

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.user_metadata.full_name || user.email.split('@')[0]
                }
            }
        });

    } catch (error) {
        console.error('OAuth Callback Error:', {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        
        res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.errorCode || ErrorCodes.AUTHENTICATION_FAILED,
                message: error.message
            }
        });
    }
};