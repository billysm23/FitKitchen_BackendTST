const supabase = require('../config/database');

class Session {
    static async create(sessionData) {
        const { data, error } = await supabase
        .from('sessions')
        .insert([{
            user_id: sessionData.userId,
            token: sessionData.token,
            is_active: true,
            last_activity: new Date(),
            expires_at: sessionData.expiresAt,
            created_at: new Date()
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
        .eq('is_active', true)
        .select();

        if (error) throw error;
        return data;
    }

    static async findOneAndUpdate(query, update) {
        const { data, error } = await supabase
        .from('sessions')
        .update({ 
            is_active: update.isActive,
            logout_at: update.logoutAt
        })
        .eq('id', query._id)
        .select()
        .single();

    if (error) throw error;
    return data;
    }
}

module.exports = Session;