// models/session.js
const supabase = require('../config/database');

class Session {
    static async create(sessionData) {
        const { data, error } = await supabase
            .from('sessions')
            .insert([{
                user_id: sessionData.userId,
                token: sessionData.token,
                is_active: true,
                last_activity: new Date().toISOString(),
                expires_at: sessionData.expiresAt,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async findOne(query) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', query.userId)
            .eq('token', query.token)
            .eq('is_active', query.isActive)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async find(query) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', query.userId)
            .eq('is_active', query.isActive);

        if (error) throw error;
        return data;
    }

    static async updateMany(query, update) {
        const { data, error } = await supabase
            .from('sessions')
            .update({ is_active: update.isActive })
            .eq('user_id', query.userId)
            .eq('is_active', query.isActive)
            .select();

        if (error) throw error;
        return data;
    }

    static async findOneAndUpdate(query, update) {
        if (!query.id) {
            throw new Error('Session ID is required for update');
        }

        const { data, error } = await supabase
            .from('sessions')
            .update({
                is_active: update.isActive,
                logout_at: update.logoutAt,
                last_activity: new Date().toISOString()
            })
            .eq('id', query.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async deactivateSession(userId, token) {
        try {
            // Cari session aktif
            const { data: session, error: findError } = await supabase
                .from('sessions')
                .select('id')
                .eq('user_id', userId)
                .eq('token', token)
                .eq('is_active', true)
                .single();

            if (findError) {
                if (findError.code === 'PGRST116') {
                    return null;
                }
                throw findError;
            }

            if (!session) {
                return null;
            }

            // Nonaktifkan session
            const { data, error: updateError } = await supabase
                .from('sessions')
                .update({
                    is_active: false,
                    logout_at: new Date().toISOString(),
                    last_activity: new Date().toISOString()
                })
                .eq('id', session.id)
                .select()
                .single();

            if (updateError) throw updateError;
            return data;
        } catch (error) {
            console.error('Error deactivating session:', error);
            throw error;
        }
    }
}

module.exports = Session;