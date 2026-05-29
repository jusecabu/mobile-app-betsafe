import { Tabs } from 'expo-router';

export default function ProtectedLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#101828',
                tabBarInactiveTintColor: '#667085',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopColor: '#EAECF0',
                },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
            <Tabs.Screen
                name="bets"
                options={{ title: 'Apuestas', popToTopOnBlur: true }}
            />
            <Tabs.Screen name="history" options={{ title: 'Historial' }} />
            <Tabs.Screen name="analytics" options={{ title: 'Análisis' }} />
        </Tabs>
    );
}
