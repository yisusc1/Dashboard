"use client"

import { usePushNotifications } from "@/hooks/usePushNotifications"
import { useUser } from "./providers/user-provider"
import { useEffect } from "react"

export function PushNotificationManager() {
    const { user } = useUser()
    const { token } = usePushNotifications(user?.id)

    useEffect(() => {
        if (token && user) {
            console.log("Push System Ready for:", user.email)
        }
    }, [token, user])

    return null
}
