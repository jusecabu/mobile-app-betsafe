import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { services } from '@/lib/container';
import { useAuthStore } from '@/store/auth_store';

export default function SignInScreen() {
    const setSession = useAuthStore((state) => state.setSession);
    const setUser = useAuthStore((state) => state.setUser);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Faltan datos', 'Completa email y contraseña.');
            return;
        }

        setLoading(true);

        try {
            const { user, session } = await services.auth.signIn({
                email: email.trim(),
                password,
            });

            setUser({
                id: user.id,
                email: user.email ?? email.trim(),
            });
            setSession(session.access_token);

            router.replace('/(protected)');
        } catch (error) {
            Alert.alert(
                'No se pudo iniciar sesión',
                error instanceof Error ? error.message : 'Intenta de nuevo.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.container}>
                            <View style={styles.header}>
                                <Text style={styles.kicker}>Acceso</Text>
                                <Text style={styles.title}>Inicia sesión</Text>
                                <Text style={styles.subtitle}>
                                    Entra al prototipo con tus credenciales de
                                    Supabase.
                                </Text>
                            </View>

                            <View style={styles.card}>
                                <View style={styles.field}>
                                    <Text style={styles.label}>Email</Text>
                                    <TextInput
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="email-address"
                                        placeholder="correo@ejemplo.com"
                                        placeholderTextColor="#8A8F98"
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Contraseña</Text>
                                    <TextInput
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        placeholder="Tu contraseña"
                                        placeholderTextColor="#8A8F98"
                                        secureTextEntry
                                        style={styles.input}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                </View>

                                <Pressable
                                    style={({ pressed }) => [
                                        styles.button,
                                        pressed && styles.buttonPressed,
                                        loading && styles.buttonDisabled,
                                    ]}
                                    disabled={loading}
                                    onPress={handleSignIn}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#F5F7FA" />
                                    ) : (
                                        <Text style={styles.buttonText}>
                                            Entrar
                                        </Text>
                                    )}
                                </Pressable>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    ¿No tienes cuenta?{' '}
                                </Text>
                                <Link href="/signup" asChild>
                                    <Pressable>
                                        <Text style={styles.footerLink}>
                                            Crear cuenta
                                        </Text>
                                    </Pressable>
                                </Link>
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
        justifyContent: 'space-between',
        gap: 24,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    header: {
        gap: 10,
    },
    kicker: {
        color: '#5B6472',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
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
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        gap: 16,
        shadowColor: '#101828',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    field: {
        gap: 8,
    },
    label: {
        color: '#344054',
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderColor: '#D0D5DD',
        borderRadius: 14,
        borderWidth: 1,
        color: '#101828',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    button: {
        alignItems: 'center',
        backgroundColor: '#101828',
        borderRadius: 14,
        marginTop: 4,
        minHeight: 52,
        justifyContent: 'center',
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: '#5B6472',
        fontSize: 14,
    },
    footerLink: {
        color: '#101828',
        fontSize: 14,
        fontWeight: '700',
    },
});
