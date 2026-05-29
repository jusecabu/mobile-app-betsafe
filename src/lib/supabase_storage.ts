import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV({
    id: 'supabase-storage',
    encryptionKey: 'prueba',
    encryptionType: 'AES-256',
});

export const supabaseStorage = {
    setItem: (key: string, value: string) => {
        mmkv.set(key, value);
    },
    getItem: (key: string) => {
        return mmkv.getString(key) || null;
    },
    removeItem: (key: string) => {
        mmkv.remove(key);
    },
};
