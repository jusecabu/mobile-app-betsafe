// ============================================================
// profile.repository.ts
// ============================================================

import { Profile, UpdateProfile } from '@/lib/db_types';
import { handlePostgrestError } from '@/repositories/base_repository';
import { SupabaseClient } from '@supabase/supabase-js';

export class ProfileRepository {
    constructor(private readonly db: SupabaseClient) {}

    async findById(id: string): Promise<Profile | null> {
        const { data, error } = await this.db
            .from('profiles')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data;
    }

    async findByUsername(username: string): Promise<Profile | null> {
        const { data, error } = await this.db
            .from('profiles')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (error) handlePostgrestError(error);
        return data;
    }

    async update(id: string, payload: UpdateProfile): Promise<Profile> {
        const { data, error } = await this.db
            .from('profiles')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) handlePostgrestError(error);
        return data;
    }

    async uploadAvatar(
        userId: string,
        file: Blob,
        fileExt: string,
    ): Promise<string> {
        const path = `avatars/${userId}.${fileExt}`;

        const { error: uploadError } = await this.db.storage
            .from('avatars')
            .upload(path, file, { upsert: true });

        if (uploadError) {
            throw new Error(`Error subiendo avatar: ${uploadError.message}`);
        }

        const { data } = this.db.storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
    }
}
