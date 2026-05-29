import { Stack } from 'expo-router';

export default function BetsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="index"
                options={{
                    title: 'Inicio',
                }}
            />
            <Stack.Screen
                name="create"
                options={{
                    title: 'Crear Apuesta',
                    headerShown: true,
                }}
            />
        </Stack>
    );
}
