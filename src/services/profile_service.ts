// ============================================================
// profile.service.ts
// ============================================================

import { UpdateProfileInput, UpdateProfileSchema } from '@/lib/db_schemas';
import { Profile } from '@/lib/db_types';
import { ProfileRepository } from '@/repositories/profile_repository';

export class ProfileService {
    constructor(private readonly profileRepo: ProfileRepository) {}

    async getProfile(id: string): Promise<Profile> {
        const profile = await this.profileRepo.findById(id);
        if (!profile) throw new Error('Perfil no encontrado');
        return profile;
    }

    async getProfileByUsername(username: string): Promise<Profile> {
        const profile = await this.profileRepo.findByUsername(username);
        if (!profile) throw new Error('Perfil no encontrado');
        return profile;
    }

    async updateProfile(
        id: string,
        input: UpdateProfileInput,
    ): Promise<Profile> {
        const parsed = UpdateProfileSchema.parse(input);

        // Verificar username único antes de actualizar
        if (parsed.username) {
            const existing = await this.profileRepo.findByUsername(
                parsed.username,
            );
            if (existing && existing.id !== id) {
                throw new Error('El nombre de usuario ya está en uso');
            }
        }

        return this.profileRepo.update(id, parsed);
    }

    async updateAvatar(
        userId: string,
        file: Blob,
        fileExt: string,
    ): Promise<Profile> {
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        if (!allowedExtensions.includes(fileExt.toLowerCase())) {
            throw new Error(
                `Formato no permitido. Usa: ${allowedExtensions.join(', ')}`,
            );
        }

        if (file.size > 2 * 1024 * 1024) {
            throw new Error('La imagen no puede superar 2 MB');
        }

        const publicUrl = await this.profileRepo.uploadAvatar(
            userId,
            file,
            fileExt,
        );
        return this.profileRepo.update(userId, { avatar_url: publicUrl });
    }
}
