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
        const { code } = req.query;
        const clientUrl = process.env.CLIENT_URL;

        if (!code) {
            throw new AppError(
                'Authorization code is missing',
                400,
                ErrorCodes.MISSING_FIELD
            );
        }

        console.log('Processing OAuth callback with code:', code); // Debugging

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

        // Sessions
        const activeSessions = await Session.find({
            userId: user.id,
            isActive: true
        });

        if (activeSessions.length >= SESSION_CONFIG.MAX_ACTIVE_SESSIONS) {
            await Session.updateMany(
                { userId: user.id, isActive: true },
                { isActive: false }
            );
        }

        await Session.create({
            userId: user.id,
            token,
            isActive: true,
            expiresAt: new Date(Date.now() + SESSION_CONFIG.SESSION_EXPIRY)
        });

        // Update or create user in database
        const { data: userData, error: userError } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                username: user.user_metadata.full_name || user.email.split('@')[0],
                oauth_provider: 'google',
                oauth_id: user.id,
                avatar_url: user.user_metadata.avatar_url,
                full_name: user.user_metadata.full_name,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id',
                returning: true
            })
            .single();

        if (userError) {
            console.error('User upsert error:', userError);
            throw userError;
        }

        const successUrl = new URL('/auth/success', clientUrl);
        successUrl.searchParams.append('token', token);
        
        console.log('Redirecting to:', successUrl.toString());
        res.redirect(successUrl.toString());

    } catch (error) {
        console.error('OAuth Callback Error:', error);
        const errorUrl = new URL('/auth/error', clientUrl);
        errorUrl.searchParams.append('message', encodeURIComponent(error.message));
        res.redirect(errorUrl.toString());
    }
};