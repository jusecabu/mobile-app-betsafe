import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { services } from '@/lib/container';
import { useAuthStore } from '@/store/auth_store';
import { StatusBar } from 'expo-status-bar';

StatusBar.setStyle('dark');

export default function RootLayout() {
    const session = useAuthStore((state) => state.session);
    const setSession = useAuthStore((state) => state.setSession);
    const setUser = useAuthStore((state) => state.setUser);
    const logout = useAuthStore((state) => state.logout);

    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const hydrateSession = async () => {
            try {
                const currentSession = await services.auth.getSession();

                if (!isMounted) {
                    return;
                }

                if (currentSession) {
                    setSession(currentSession.access_token);
                    setUser({
                        id: currentSession.user.id,
                        email: currentSession.user.email ?? '',
                    });
                } else {
                    logout();
                }
            } catch {
                if (isMounted) {
                    logout();
                }
            } finally {
                if (isMounted) {
                    setIsReady(true);
                }
            }
        };

        const { data } = services.auth.onAuthStateChange(
            (_event, nextSession) => {
                if (nextSession) {
                    setSession(nextSession.access_token);
                    setUser({
                        id: nextSession.user.id,
                        email: nextSession.user.email ?? '',
                    });
                    return;
                }

                logout();
            },
        );

        void hydrateSession();

        return () => {
            isMounted = false;
            data.subscription.unsubscribe();
        };
    }, [logout, setSession, setUser]);

    if (!isReady) {
        return null;
    }

    return (
        <Stack>
            <Stack.Protected guard={!session}>
                <Stack.Screen
                    name="(public)"
                    options={{ headerShown: false }}
                />
            </Stack.Protected>

            <Stack.Protected guard={!!session}>
                <Stack.Screen
                    name="(protected)"
                    options={{ headerShown: false }}
                />
            </Stack.Protected>
        </Stack>
    );
}
