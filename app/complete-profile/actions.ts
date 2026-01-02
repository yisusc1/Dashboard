"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login")
    }

    const national_id = formData.get("national_id") as string
    const phone = formData.get("phone") as string

    if (!national_id || !phone) {
        return { error: "Todos los campos son obligatorios" }
    }

    // Upsert profile to ensure it exists
    const { error } = await supabase
        .from("profiles")
        .upsert({
            id: user.id,
            national_id: national_id,
            phone: phone,
            email: user.email, // Ensure email is synchronized
            updated_at: new Date().toISOString()
        })

    if (error) {
        console.error("Error updating profile:", error)
        return { error: `Error: ${error.message} (Code: ${error.code})` }
    }

    revalidatePath("/", "layout")
    redirect("/")
}
