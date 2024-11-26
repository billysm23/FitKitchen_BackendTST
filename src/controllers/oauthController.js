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
        const { origin } = req.headers;
        const redirectTo = `${origin || process.env.CLIENT_URL}/auth/callback`;
        
        console.log('Initializing Google OAuth with redirect:', redirectTo);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) throw error;

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
                message: 'Failed to initialize Google sign in',
                details: error.message
            }
        });
    }
};

exports.handleOAuthCallback = async (req, res) => {
    try {
        const { code } = req.query;
        
        console.log('Received callback with code:', code?.substring(0, 10) + '...');

        if (!code) {
            throw new Error('No authorization code provided');
        }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) throw error;

        const { user, session } = data;

        if (!user || !session) {
            throw new Error('Failed to get user data from Supabase');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name
                }
            }
        });
    } catch (error) {
        console.error('OAuth Callback Error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Authentication failed',
                details: error.message
            }
        });
    }
};