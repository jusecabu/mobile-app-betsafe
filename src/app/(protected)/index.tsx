import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { services } from '@/lib/container';
import { useAuthStore } from '@/store/auth_store';

export default function HomeScreen() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);

        try {
            await services.auth.signOut();
            logout();
            router.replace('/signin');
        } catch (error) {
            Alert.alert(
                'No se pudo cerrar sesión',
                error instanceof Error ? error.message : 'Intenta de nuevo.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Inicio</Text>
                    <Text style={styles.subtitle}>
                        Pantalla principal simple para el prototipo.
                    </Text>

                    {user ? (
                        <Text style={styles.userText}>
                            Sesión activa: {user.email}
                        </Text>
                    ) : null}

                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed,
                            loading && styles.buttonDisabled,
                        ]}
                        disabled={loading}
                        onPress={handleLogout}
                    >
                        {loading ? (
                            <ActivityIndicator color="#F5F7FA" />
                        ) : (
                            <Text style={styles.buttonText}>Logout</Text>
                        )}
                    </Pressable>

                    <Link href="/bets" style={styles.link}>
                        Ir a apuestas
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F5F9',
    },
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        gap: 16,
        shadowColor: '#101828',
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    title: {
        color: '#101828',
        fontSize: 32,
        fontWeight: '800',
    },
    subtitle: {
        color: '#5B6472',
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: '#344054',
        fontSize: 14,
        fontWeight: '600',
    },
    button: {
        alignItems: 'center',
        backgroundColor: '#101828',
        borderRadius: 14,
        justifyContent: 'center',
        minHeight: 52,
        paddingHorizontal: 16,
    },
    buttonPressed: {
        opacity: 0.9,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#F5F7FA',
        fontSize: 16,
        fontWeight: '700',
    },
    link: {
        color: '#101828',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
});
