import { supabaseStorage } from '@/lib/supabase_storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type User = {
    id: string;
    email: string;
};

type AuthState = {
    session: string | null;
    user: User | null;

    setSession: (session: string | null) => void;

    setUser: (user: User | null) => void;

    logout: () => void;
};

const zustandStorage = {
    setItem: (name: string, value: string) => {
        supabaseStorage.setItem(name, value);
    },

    getItem: (name: string) => {
        const value = supabaseStorage.getItem(name);

        return value ?? null;
    },

    removeItem: (name: string) => {
        supabaseStorage.removeItem(name);
    },
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,

            user: null,

            setSession: (session) =>
                set({
                    session,
                }),

            setUser: (user) =>
                set({
                    user,
                }),

            logout: () =>
                set({
                    session: null,
                    user: null,
                }),
        }),

        {
            name: 'auth-storage',
            storage: createJSONStorage(() => zustandStorage),
        },
    ),
);
