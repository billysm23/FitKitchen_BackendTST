const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const jwt = require('jsonwebtoken');
const Session = require('../models/session');

const SESSION_CONFIG = {
    MAX_ACTIVE_SESSIONS: 2,
    SESSION_EXPIRY: 24 * 60 * 60 * 1000 // 24 jam
};

exports.googleSignIn = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${process.env.CLIENT_URL}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
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
                code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
                message: 'Failed to initialize Google sign in'
            }
        });
    }
};

exports.handleOAuthCallback = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            throw new AppError(
                'Authorization code is missing',
                400,
                ErrorCodes.MISSING_FIELD
            );
        }

        const { data: { user, session }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) throw error;

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

        // Create or update user in our users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                username: user.user_metadata.full_name || user.email.split('@')[0],
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id',
                returning: true
            })
            .single();

        if (userError) throw userError;

        res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);

    } catch (error) {
        console.error('OAuth Callback Error:', error);
        res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
};