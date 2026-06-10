import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request,
    })

    // Create Supabase client with modern cookie API (getAll/setAll)
    // This is required by @supabase/ssr v0.8+ for proper token refresh
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Get user session
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Public paths
    if (path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/verification")) {
        // If logged in, redirect to home (except verification)
        if (user && !path.startsWith("/verification")) {
            return NextResponse.redirect(new URL("/", request.url))
        }
        return response
    }

    // Protected paths: If no user, redirect to login
    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url))
    }

    // RBAC Checks
    // We need to fetch the user profile to check roles
    // Note: Middleware should be fast. Querying DB might be slow.
    // Ideally, role is in metadata. For now, we query DB as volumes are low.
    // RBAC Checks
    // We need to fetch the user profile to check roles
    const { data: profile } = await supabase
        .from("profiles")
        .select("roles, national_id, phone")
        .eq("id", user.id)
        .single()

    const roles = (profile?.roles || []).map((r: string) => r.toLowerCase())
    const hasRole = (role: string) => roles.includes("admin") || roles.includes(role)

    // 0. Profile Completion Check
    // Allow access to /complete-profile to avoid loop
    if (!path.startsWith("/complete-profile")) {
        // If profile is missing vital info, redirect
        if (!profile?.national_id || !profile?.phone) {
            return NextResponse.redirect(new URL("/complete-profile", request.url))
        }
    }

    // 1. Admin Paths
    if (path.startsWith("/admin") && !roles.includes("admin")) {
        return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // 2. Transporte
    if (path.startsWith("/transporte") && !hasRole("transporte") && !hasRole("mecanico")) {
        return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // 3. Taller
    if (path.startsWith("/taller") && !hasRole("taller")) {
        return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // 5. Control / Supervisor
    if (path.startsWith("/control") && !hasRole("supervisor")) {
        return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // 6. Gerencia (Admins & Altos Mandos)
    if (path.startsWith("/gerencia") && !hasRole("gerencia")) {
        return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // 7. Reportes Diarios
    if ((path.startsWith("/reporte-diario") || path.startsWith("/historial-reportes")) && !hasRole("reportes")) {
        return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|apk)$).*)",
    ],
}
