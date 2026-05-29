// ============================================================
// auth.service.ts
// ============================================================

import {
    ResetPasswordInput,
    ResetPasswordSchema,
    SignInInput,
    SignInSchema,
    SignUpInput,
    SignUpSchema,
    UpdatePasswordInput,
    UpdatePasswordSchema,
} from '@/lib/db_schemas';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';

export class AuthService {
    constructor(private readonly db: SupabaseClient) {}

    // ── Registro ───────────────────────────────────────────────

    async signUp(
        input: SignUpInput,
    ): Promise<{ user: User; session: Session | null }> {
        const parsed = SignUpSchema.parse(input);

        const { data, error } = await this.db.auth.signUp({
            email: parsed.email,
            password: parsed.password,
            options: {
                data: { username: parsed.username },
            },
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error('No se pudo crear el usuario');

        return { user: data.user, session: data.session };
    }

    // ── Login ──────────────────────────────────────────────────

    async signIn(
        input: SignInInput,
    ): Promise<{ user: User; session: Session }> {
        const parsed = SignInSchema.parse(input);

        const { data, error } = await this.db.auth.signInWithPassword({
            email: parsed.email,
            password: parsed.password,
        });

        if (error) throw new Error(error.message);
        if (!data.user || !data.session)
            throw new Error('Credenciales inválidas');

        return { user: data.user, session: data.session };
    }

    // ── Logout ─────────────────────────────────────────────────

    async signOut(): Promise<void> {
        const { error } = await this.db.auth.signOut();
        if (error) throw new Error(error.message);
    }

    // ── Sesión activa ──────────────────────────────────────────

    async getSession(): Promise<Session | null> {
        const { data, error } = await this.db.auth.getSession();
        if (error) throw new Error(error.message);
        return data.session;
    }

    async getUser(): Promise<User | null> {
        const { data, error } = await this.db.auth.getUser();
        if (error) return null;
        return data.user;
    }

    // ── Recuperar contraseña ───────────────────────────────────

    async resetPassword(input: ResetPasswordInput): Promise<void> {
        const parsed = ResetPasswordSchema.parse(input);

        const { error } = await this.db.auth.resetPasswordForEmail(
            parsed.email,
        );
        if (error) throw new Error(error.message);
    }

    async updatePassword(input: UpdatePasswordInput): Promise<void> {
        const parsed = UpdatePasswordSchema.parse(input);

        const { error } = await this.db.auth.updateUser({
            password: parsed.password,
        });
        if (error) throw new Error(error.message);
    }

    // ── Listener de cambios de sesión ──────────────────────────

    onAuthStateChange(
        callback: (event: string, session: Session | null) => void,
    ) {
        return this.db.auth.onAuthStateChange(callback);
    }
}
