import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

import { useRouter } from 'next/navigation';

export const usePushNotifications = (userId?: string) => {
    const [token, setToken] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        const addListeners = async () => {
            await PushNotifications.removeAllListeners();

            await PushNotifications.addListener('registration', async token => {
                console.info('Registration token: ', token.value);
                setToken(token.value);

                if (userId) {
                    const { error } = await supabase
                        .from('user_devices')
                        .upsert({
                            user_id: userId,
                            fcm_token: token.value,
                            platform: 'android',
                            last_active: new Date().toISOString()
                        }, { onConflict: 'fcm_token' })

                    if (error) console.error("Error saving token:", error);
                    else console.log("Token saved to DB for user:", userId);
                }
            });

            await PushNotifications.addListener('registrationError', err => {
                console.error('Registration error: ', err.error);
                toast.error('Error al registrar notificaciones');
            });

            await PushNotifications.addListener('pushNotificationReceived', notification => {
                console.log('Push notification received: ', notification);
                // toast removed to avoid duplication
            });

            await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
                console.log('Push notification action performed', notification.actionId, notification.inputValue);
                // Redirect to notification history
                router.push('/gerencia/notificaciones');
            });
        };

        const register = async () => {
            try {
                const result = await PushNotifications.requestPermissions();
                if (result.receive === 'granted') {
                    // toast.success("Permisos de notificación concedidos")
                    if (Capacitor.getPlatform() === 'android') {
                        await PushNotifications.createChannel({
                            id: 'default',
                            name: 'General',
                            description: 'General notifications',
                            importance: 5, // High importance
                            visibility: 1,
                            sound: 'default', // Explicit sound
                            vibration: true,
                        });
                    }
                    await PushNotifications.register();
                } else {
                    toast.error("Permisos de notificación DENEGADOS");
                }
            } catch (e: any) {
                console.error("Error asking for permissions", e);
                toast.error("Error solicitando permisos: " + (e?.message || "Desconocido"));
            }
        }

        addListeners();
        register();

    }, [userId]);

    return { token };
};
