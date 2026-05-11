"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function setupLocalUser(formData: FormData) {
  try {
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    const supabase = await createClient()
    
    // Verificar que el usuario esté logueado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, message: "No estás autenticado." }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, message: "No se puede configurar el usuario local (Falta Service Role Key)." }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const isGoogleUser = user.email && !user.email.includes("@dashboard.local")

    if (isGoogleUser) {
      if (!username || !password) {
        return { success: false, message: "Usuario y contraseña son requeridos." }
      }

      if (password.length < 6) {
        return { success: false, message: "La contraseña debe tener al menos 6 caracteres." }
      }

      const virtualEmail = username.includes("@") ? username.toLowerCase().trim() : `${username.toLowerCase().trim()}@dashboard.local`

      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          email: virtualEmail,
          password: password,
          user_metadata: {
            ...user.user_metadata,
            username: username.toLowerCase().trim()
          }
        }
      )

      if (updateError) {
        console.error("Error updating user:", updateError)
        if (updateError.message.includes("already registered") || updateError.message.includes("unique")) {
          return { success: false, message: "Ese nombre de usuario ya está en uso." }
        }
        return { success: false, message: `Error: ${updateError.message}` }
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ email: virtualEmail })
        .eq("id", user.id)

      if (profileError) {
        console.error("Error updating profile email:", profileError)
      }
    } else {
      // Usuario ya es local, solo cambiar contraseña
      if (!password) {
        return { success: false, message: "La contraseña es requerida." }
      }

      if (password.length < 6) {
        return { success: false, message: "La contraseña debe tener al menos 6 caracteres." }
      }

      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: password }
      )

      if (updateError) {
        console.error("Error updating user password:", updateError)
        return { success: false, message: `Error: ${updateError.message}` }
      }
    }

    return { success: true, message: "Usuario local configurado correctamente." }
  } catch (error: any) {
    console.error("Error en setupLocalUser:", error)
    return { success: false, message: "Ha ocurrido un error inesperado." }
  }
}
