"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import { toast } from "sonner" // Import at top level

type UserRole = "admin" | "transporte" | "taller" | "tecnico" | "invitado" | "almacen" | "chofer" | "supervisor" | "soporte" | "planificacion" | "distribucion" | "afectaciones" | "rrhh" | "tecnologico" | "comercializacion" | "auditoria" | "combustible"

interface UserProfile {
    id: string
    email: string
    roles: string[]
    first_name?: string
    last_name?: string
    national_id?: string
    department?: string
    job_title?: string
}

interface UserContextType {
    user: User | null
    profile: UserProfile | null
    isLoading: boolean
    hasRole: (role: UserRole) => boolean
    isAdmin: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({
    children,
    initialUser = null,
    initialProfile = null
}: {
    children: React.ReactNode
    initialUser?: User | null
    initialProfile?: UserProfile | null
}) {
    const [user, setUser] = useState<User | null>(initialUser)
    const [profile, setProfile] = useState<UserProfile | null>(initialProfile)
    const [isLoading, setIsLoading] = useState(!initialUser)

    const supabase = createClient()

    // Push Notifications Logic
    useEffect(() => {
        // Unconditional Debug Logs
        console.log('UserProvider: Push Effect Triggered', { user_id: user?.id })

        if (!user) {
            console.log('UserProvider: waiting for user...')
            return
        }

        const initPush = async () => {
            try {
                toast.info('🚀 DEBUG: Intentando Iniciar Push...', { duration: 5000 })

                // Dynamic import of Capacitor plugins to avoid SSR issues
                const { Capacitor } = await import('@capacitor/core')
                const { PushNotifications } = await import('@capacitor/push-notifications')

                // Bypass isNativePlatform check for debugging - show alert if not native
                if (!Capacitor.isNativePlatform()) {
                    console.warn('Not native platform, but continuing for debug...')
                    toast.warning('⚠️ No es nativo (Web Mode)', { duration: 5000 })
                    // In web mode, PushNotifications plugin usually throws or does nothing, 
                    // but we want to see this message to confirm we are running.
                    return
                }

                const permStatus = await PushNotifications.checkPermissions()
                console.log('Perm Status:', permStatus)
                toast.info(`Estado Permiso: ${permStatus.receive}`, { duration: 5000 })

                if (permStatus.receive === 'prompt') {
                    const newStatus = await PushNotifications.requestPermissions()
                    if (newStatus.receive !== 'granted') {
                        toast.error('🚫 Permiso DENEGADO por usuario')
                        return
                    }
                }

                if (permStatus.receive === 'granted') {
                    await PushNotifications.register()
                }

                PushNotifications.addListener('registration', async (token) => {
                    console.log('Push Token:', token.value)
                    toast.success('✅ TOKEN OBTENIDO')

                    const { error } = await supabase
                        .from('user_devices')
                        .upsert({
                            user_id: user.id,
                            fcm_token: token.value,
                            platform: 'android',
                            last_active: new Date().toISOString()
                        }, { onConflict: 'fcm_token' })

                    if (error) {
                        toast.error('⚠️ Error DB: ' + error.message)
                    } else {
                        toast.success('💾 Token guardado en Supabase')
                    }
                })

                PushNotifications.addListener('registrationError', (error) => {
                    toast.error(`❌ Fallo Registro: ${error.error}`)
                })

                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    toast.message(`📣 Notificación: ${notification.title}`)
                })

            } catch (e) {
                console.error('Push Init Error:', e)
                toast.error('🔥 CRASH: ' + e)
            }
        }

        initPush()

    }, [user])


    useEffect(() => {
        // If we already have user/profile from server, we don't need to fetch immediately
        // But we still set up the subscription

        const fetchUser = async () => {
            if (initialUser && initialProfile) {
                // Already have data, just ensure loading is false
                setIsLoading(false)
                return
            }

            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (user) {
                    const { data, error } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", user.id)
                        .single()

                    if (error) console.error("UserProvider: error fetching profile", error)

                    if (data) setProfile(data)
                }
            } catch (error) {
                console.error("Error fetching user data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // If the session matches what we have, do nothing (avoids flicker)
                if (session?.user?.id === user?.id) return

                setUser(session?.user ?? null)
                if (session?.user) {
                    const { data } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", session.user.id)
                        .single()
                    if (data) setProfile(data)
                } else {
                    setProfile(null)
                }
                setIsLoading(false)
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [initialUser, initialProfile, user?.id]) // Added dependencies

    const hasRole = (role: UserRole) => {
        if (!profile?.roles) return false
        const currentRoles = profile.roles.map(r => r.toLowerCase())
        if (currentRoles.includes("admin")) return true
        return currentRoles.includes(role.toLowerCase())
    }

    const value = {
        user,
        profile,
        isLoading,
        hasRole,
        isAdmin: profile?.roles?.some(r => r.toLowerCase() === "admin") ?? false
    }

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider")
    }
    return context
}
