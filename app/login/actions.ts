"use server"

import { createClient } from "@supabase/supabase-js"

export async function recoverPassword(username: string) {
  try {
    const virtualEmail = username.includes("@") ? username : `${username.toLowerCase().trim()}@dashboard.local`

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Si no tenemos service_role, no podemos usar la API admin. Devolvemos mensaje genérico.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { 
        success: false, 
        message: "Contacta al administrador para restablecer tu contraseña. Si tienes tu cuenta de Google vinculada, usa el botón de Google." 
      }
    }

    // 1. Buscar en perfiles por email virtual
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", virtualEmail)
      .limit(1)

    // Fallback: intentar listUsers si profiles falla o no tiene el email
    let userId = profiles?.[0]?.id

    if (!userId) {
      // Buscar en listUsers (esto puede no encontrarlo si hay muchos usuarios, pero es un fallback)
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
      const foundUser = usersData?.users.find(u => u.email === virtualEmail)
      if (foundUser) {
        userId = foundUser.id
      }
    }

    if (!userId) {
      return { success: false, message: "Usuario no encontrado." }
    }

    // 2. Obtener identidades del usuario
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError || !userData.user) {
      return { success: false, message: "Error al obtener datos del usuario." }
    }

    const hasGoogle = userData.user.identities?.some(id => id.provider === "google")

    if (hasGoogle) {
      return { 
        success: true, 
        message: "Tu cuenta de Google está vinculada. Por favor, utiliza el botón 'Continuar con Google' para iniciar sesión." 
      }
    } else {
      return { 
        success: false, 
        message: "Por favor, contacta a tu administrador o soporte técnico para restablecer tu contraseña." 
      }
    }

  } catch (error: any) {
    console.error("Error en recoverPassword:", error)
    return { success: false, message: "Ha ocurrido un error inesperado." }
  }
}
