"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { Camera } from "@capacitor/camera"
import { Geolocation } from "@capacitor/geolocation"
import { Filesystem } from "@capacitor/filesystem"
import { PushNotifications } from "@capacitor/push-notifications"

export function GlobalPermissions() {
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        const requestAllPermissions = async () => {
            console.log("Requesting Global Permissions...")

            try {
                // 1. Camera
                await Camera.requestPermissions()

                // 2. Geolocation
                await Geolocation.requestPermissions()

                // 3. Filesystem
                await Filesystem.requestPermissions()

                // 4. Push Notifications
                await PushNotifications.requestPermissions()

                console.log("Global Permissions Requested")
            } catch (error) {
                console.error("Error requesting permissions:", error)
            }
        }

        // Slight delay to ensure app is fully mounted
        setTimeout(() => {
            requestAllPermissions()
        }, 1000)

    }, [])

    return null
}
