import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export const usePushNotifications = (userId?: string) => {
    const [token, setToken] = useState<string | null>(null);
    const supabase = createClient();

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
                toast.custom((t) => (
                    <div className="w-[356px] flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 rounded-[24px] pointer-events-auto transition-all animate-in slide-in-from-top-5 fade-in duration-300" >
                        {/* Icon Container */}
                        < div className="flex-shrink-0 w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/20" >
                            <span className="text-xl" >🔔</span>
                        </div>

                        {/* Content */}
                        < div className="flex-1 min-w-0" >
                            <h3 className="text-[15px] font-bold text-zinc-900 leading-tight mb-1" >
                                {notification.title || 'Nueva Notificación'}
                            </h3>
                            < p className="text-[13px] text-zinc-500 leading-snug line-clamp-2" >
                                {notification.body}
                            </p>
                        </div>

                        {/* Dismiss Button (Optional aesthetic dot) */}
                        < div className="h-full flex flex-col justify-start py-1" >
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500/80" > </div>
                        </div>
                    </div>
                ), {
                    duration: 5000,
                    position: 'top-center',
                });
            });

            await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
                console.log('Push notification action performed', notification.actionId, notification.inputValue);
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
            } catch (e) {
                console.error("Error asking for permissions", e);
                toast.error("Error solicitando permisos: " + e.message);
            }
        }

        addListeners();
        register();

    }, [userId]);

    return { token };
};
