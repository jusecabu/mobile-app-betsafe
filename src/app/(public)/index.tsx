import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
    return (
        <SafeAreaView
            style={{
                flex: 1,
                justifyContent: 'center',
                padding: 24,
            }}
        >
            <View
                style={{
                    gap: 16,
                }}
            >
                <Text
                    style={{
                        fontSize: 32,
                        fontWeight: 'bold',
                    }}
                >
                    Betsafe
                </Text>

                <Text>Analiza tus apuestas deportivas.</Text>

                <Link href="/signin" asChild>
                    <Pressable
                        style={{
                            padding: 16,
                            backgroundColor: '#111',
                            borderRadius: 12,
                        }}
                    >
                        <Text
                            style={{
                                color: '#fff',
                            }}
                        >
                            Iniciar sesión
                        </Text>
                    </Pressable>
                </Link>

                <Link href="/signup" asChild>
                    <Pressable
                        style={{
                            padding: 16,
                            backgroundColor: '#ddd',
                            borderRadius: 12,
                        }}
                    >
                        <Text>Registrarse</Text>
                    </Pressable>
                </Link>
            </View>
        </SafeAreaView>
    );
}
