const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const jwt = require('jsonwebtoken');

const SESSION_CONFIG = {
    MAX_ACTIVE_SESSIONS: 2,
    SESSION_EXPIRY: 24 * 60 * 60 * 1000 // 24 jam
};

exports.googleSignIn = async (req, res) => {
    try {
        const origin = req.headers.origin || process.env.CLIENT_URL;
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

        // Get user data from Supabase
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

        console.log('User data from Supabase:', user);

        try {
            // Cek user sudah ada
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking existing user:', checkError);
                throw checkError;
            }

            let userData;
            
            if (!existingUser) {
                // Insert user baru
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert([{
                        id: user.id,
                        email: user.email,
                        username: user.user_metadata?.full_name || user.email.split('@')[0],
                        full_name: user.user_metadata?.full_name,
                        oauth_provider: 'google',
                        oauth_id: user.identities?.[0]?.id,
                        avatar_url: user.user_metadata?.avatar_url,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (insertError) {
                    console.error('User insert error:', insertError);
                    throw insertError;
                }

                userData = newUser;
            } else {
                // Update user
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({
                        email: user.email,
                        username: user.user_metadata?.full_name || user.email.split('@')[0],
                        full_name: user.user_metadata?.full_name,
                        avatar_url: user.user_metadata?.avatar_url,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('User update error:', updateError);
                    throw updateError;
                }

                userData = updatedUser;
            }

            if (!userData) {
                throw new Error('Failed to create/update user data');
            }

            console.log('User data saved:', userData);

            const token = jwt.sign(
                {
                    userId: userData.id,
                    email: userData.email
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Deactivate session lama
            const { error: sessionDeactivateError } = await supabase
                .from('sessions')
                .update({ is_active: false })
                .eq('user_id', userData.id)
                .eq('is_active', true);

            if (sessionDeactivateError) {
                console.error('Error deactivating old sessions:', sessionDeactivateError);
            }

            // Buat session baru
            const { error: sessionCreateError } = await supabase
                .from('sessions')
                .insert([{
                    user_id: userData.id,
                    token: token,
                    is_active: true,
                    expires_at: new Date(Date.now() + SESSION_CONFIG.SESSION_EXPIRY).toISOString(),
                    created_at: new Date().toISOString()
                }]);

            if (sessionCreateError) {
                console.error('Session creation error:', sessionCreateError);
                throw sessionCreateError;
            }

            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: userData.id,
                        email: userData.email,
                        username: userData.username,
                        full_name: userData.full_name,
                        avatar_url: userData.avatar_url
                    }
                }
            });

        } catch (dbError) {
            console.error('Database operation error:', dbError);
            throw new AppError(
                'Failed to process user data',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }

    } catch (error) {
        console.error('OAuth Callback Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.errorCode || ErrorCodes.AUTHENTICATION_FAILED,
                message: error.message || 'Authentication failed',
                details: error.details || error.message
            }
        });
    }
};