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
        const origin = req.headers.origin || process.env.CLIENT_URL;
        // Buat redirectUrl yang lengkap
        const redirectUrl = `${origin}/auth/callback`;
        
        console.log('Initializing Google OAuth with redirect:', redirectUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                    response_type: 'code'
                },
                scopes: ['email', 'profile', 'openid']
            }
        });

        if (error) {
            console.error('Supabase OAuth Error:', error);
            throw error;
        }

        if (!data?.url) {
            throw new Error('No OAuth URL received from Supabase');
        }

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
                message: 'Failed to initialize Google sign in',
                details: error.message
            }
        });
    }
};

exports.handleOAuthCallback = async (req, res) => {
    try {
        const { access_token } = req.body;

        if (!access_token) {
            throw new AppError(
                'Access token is missing',
                400,
                ErrorCodes.MISSING_FIELD
            );
        }

        // Get user data from Supabase using access token
        const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);

        if (userError) {
            console.error('Supabase get user error:', userError);
            throw userError;
        }

        if (!user) {
            throw new AppError(
                'Failed to get user data',
                401,
                ErrorCodes.AUTHENTICATION_FAILED
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Handle sessions
        await Session.updateMany(
            { userId: user.id, isActive: true },
            { isActive: false }
        );

        await Session.create({
            userId: user.id,
            token,
            isActive: true,
            expiresAt: new Date(Date.now() + SESSION_CONFIG.SESSION_EXPIRY)
        });

        // Update or create user in our database
        const { data: userData, error: dbError } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                username: user.user_metadata?.full_name || user.email.split('@')[0],
                updated_at: new Date().toISOString()
            })
            .single();

        if (dbError) throw dbError;

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: userData.username,
                    avatar_url: user.user_metadata?.avatar_url
                }
            }
        });

    } catch (error) {
        console.error('OAuth Callback Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.errorCode || ErrorCodes.AUTHENTICATION_FAILED,
                message: error.message || 'Authentication failed'
            }
        });
    }
};