"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getSystemSettings() {
    const supabase = await createClient()
    // Safe fetch with error handling
    try {
        const { data, error } = await supabase
            .from("system_settings")
            .select("*")

        if (error) {
            // Warn only, don't error track this as it's a known "cold start" issue
            console.warn("System Settings table not ready, using defaults.", error.code)
            return { "INSTALLATION_RESTRICTIONS_ENABLED": true }
        }

        // Transform to simple key-value object
        const settings: Record<string, any> = {}
        data?.forEach((s: any) => {
            settings[s.key] = s.value
        })

        return settings
    } catch (e) {
        console.error("Unexpected error fetching settings:", e)
        return { "INSTALLATION_RESTRICTIONS_ENABLED": true }
    }
}

export async function toggleInstallationRestriction() {
    const supabase = await createClient()

    // 1. Get current value
    const { data: current, error: fetchError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "INSTALLATION_RESTRICTIONS_ENABLED")
        .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // Ignore not found
        throw fetchError
    }

    const newValue = !current?.value // Toggle boolean (default true if undefined? No, default insert was true)

    // 2. Upsert
    const { error: updateError } = await supabase
        .from("system_settings")
        .upsert({
            key: "INSTALLATION_RESTRICTIONS_ENABLED",
            value: newValue,
            description: "Enforce minimum inventory kit for new installations"
        })

    if (updateError) throw updateError

    revalidatePath("/tecnicos")
    revalidatePath("/admin") // Refresh admin UI

    return { success: true, value: newValue }
}
