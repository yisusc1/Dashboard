"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// 3. RESET FUEL LOGS (Keeps Vehicles)
export async function resetFuelLogsAction() {
    try {
        const supabase = await createClient()

        // Delete all logs
        const { error } = await supabase
            .from("fuel_logs")
            .delete()
            .neq("id", 0) // Delete all

        if (error) throw error

        revalidatePath("/control/combustible")
        revalidatePath("/admin/database")
        return { success: true }
    } catch (error: any) {
        console.error("Reset Fuel Error:", error)
        return { success: false, error: error.message }
    }
}
