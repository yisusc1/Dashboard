"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getMySpools() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // 1. Get Team
    const { data: profile } = await supabase.from("profiles").select("team_id, team:teams(id)").eq("id", user.id).single()
    if (!profile?.team_id) return []

    // 2. Get Active Spool Assignments for this Team
    const { data: assignments } = await supabase
        .from("inventory_assignments")
        .select(`
            id,
            items:inventory_assignment_items(serials, product:inventory_products(sku))
        `)
        .eq("team_id", profile.team_id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })

    // 3. Extract Serials
    const spools: { serial: string, label: string }[] = []

    assignments?.forEach((a: any) => {
        a.items?.forEach((item: any) => {
            // Only picking Spools (CARRETE)
            if (item.product?.sku?.includes("CARRETE")) {
                if (Array.isArray(item.serials)) {
                    item.serials.forEach((s: any) => {
                        const val = typeof s === 'string' ? s : s.serial
                        spools.push({ serial: val, label: val })
                    })
                }
            }
        })
    })

    return spools
}



export async function finalizeDayAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error("No autenticado")

        // 1. Identify Entity (Team or Tech)
        const { data: profile } = await supabase.from("profiles").select("*, team:teams(id, name)").eq("id", user.id).single()

        let entityId = user.id
        let entityType = 'USER'

        if (profile.team_id) {
            entityId = profile.team_id
            entityType = 'TEAM'
        }

        // 2. Fetch Data using the Controller Logic (Reusing code to ensure consistency)
        // We dynamically import to avoid circular dep issues during build if any
        const { getAuditData, saveAudit } = await import("../control/actions")

        const auditData = await getAuditData(entityId)

        // 3. Prepare Payload
        // We map the 'stock' from getAuditData to the 'items' format expected by saveAudit
        // getAuditData returns: { stock: [ { sku, name, assigned, reported, theoretical, diff, ... } ] }
        const items = auditData.stock.map((item: any) => ({
            sku: item.sku,
            name: item.name,
            productId: item.productId, // Pass product ID for FK
            theoretical: 0, // Decoupled: Ignore system stock
            physical: 0, // Supervisor fills this
            reported: item.reported || 0 // Usage Report
        }))

        // 3.1 Fetch Spool Closures for this Entity Today to append to notes
        const todayStr = new Date().toISOString().split('T')[0]
        const { data: spoolClosures } = await supabase
            .from("cierres")
            .select("observaciones")
            .ilike("observaciones", "%Finalización de Bobina%")
            .gte("created_at", todayStr)
            .or(`tecnico_1.eq.${user.id},tecnico_1.eq.${profile.first_name || ''}`)

        let notes = "Cierre de Jornada Automático (Generado por Técnico)"
        if (spoolClosures && spoolClosures.length > 0) {
            const details = spoolClosures.map((c: any) => c.observaciones).join("; ")
            notes += `. Detalle Carretes: ${details}`
        }

        // 4. Save Audit
        await saveAudit({
            entityId,
            entityType,
            notes,
            items
        })

        revalidatePath("/tecnicos")
        revalidatePath("/control")

        return { success: true, message: "Jornada finalizada y auditoría generada correctamente." }

    } catch (error: any) {
        console.error("Finalize Day Error:", error)
        return { success: false, error: error.message }
    }
}
