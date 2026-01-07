"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// --- EXISTING FUNCTIONS ABOVE ---

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
            items:inventory_assignment_items(quantity, serials, product:inventory_products(sku))
        `)
        .eq("team_id", profile.team_id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })

    // 3. Extract Serials and Calculate Remaining via View (Source of Truth)
    const spools: { serial: string, label: string, remaining: number }[] = []
    const serialsToFetch: string[] = []

    for (const a of assignments || []) {
        if (!a.items) continue
        for (const item of a.items) {
            const prod = Array.isArray(item.product) ? item.product[0] : item.product // Handle array/obj
            if (prod?.sku?.includes("CARRETE")) {
                if (Array.isArray(item.serials)) {
                    for (const s of item.serials) {
                        const val = typeof s === 'string' ? s : s.serial
                        serialsToFetch.push(val)
                    }
                }
            }
        }
    }

    if (serialsToFetch.length > 0) {
        // Query the "Armored" View
        const { data: spoolStatus } = await supabase
            .from("view_spool_status")
            .select("serial_number, current_quantity")
            .in("serial_number", serialsToFetch)

        serialsToFetch.forEach(serial => {
            const status = spoolStatus?.find((s: any) => s.serial_number === serial)
            const remaining = status ? status.current_quantity : 0

            spools.push({
                serial,
                label: `${serial} (${remaining}m disp.)`,
                remaining
            })
        })
    }

    return spools
}

export async function createSupportReport(data: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Usuario no autenticado" }
    }

    try {
        const { error } = await supabase.from("soportes").insert({
            ...data,
            tecnico_id: user.id,
            realizado_por: user.email,
            estatus: "Realizado"
        })

        if (error) {
            console.error("Error creating support report:", error)
            return { success: false, error: "Error al guardar el reporte: " + error.message }
        }

        revalidatePath("/tecnicos/reportes")
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// [New] Save Technician Daily Report
export async function saveTechnicianReport(data: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Usuario no autenticado" }

    try {
        // Get team
        const { data: profile } = await supabase.from("profiles").select("team_id").eq("id", user.id).single()
        const date = new Date().toLocaleDateString("es-ES")

        // Use UPSERT on user_id + date
        // Note: If 'date' format changes, adjust constraint. We use standard formatted string to keep it daily.
        // Actually, date formats can be tricky in DB key. 
        // Let's rely on valid ISO string YYYY-MM-DD for uniqueness if possible, but user UI uses DD/MM/YYYY.
        // I'll stick to a canonical YYYY-MM-DD for database uniqueness to be safe.
        const canonicalDate = new Date().toISOString().split('T')[0] // 2024-01-01

        const payload = {
            user_id: user.id,
            team_id: profile?.team_id,
            date: canonicalDate,
            vehicle_id: data.vehicle_id,
            onu_serials: data.onu_serials,
            router_serials: data.router_serials,
            materials: data.materials,
            spools: data.spools,
            clients_snapshot: data.clients_snapshot || [],
            updated_at: new Date().toISOString(),

            // Normalized Columns
            conectores_used: data.materials?.conectores_used || 0,
            conectores_remaining: data.materials?.conectores_remaining || 0,
            conectores_defective: data.materials?.conectores_defective || 0,
            tensores_used: data.materials?.tensores_used || 0,
            tensores_remaining: data.materials?.tensores_remaining || 0,
            patchcords_used: data.materials?.patchcords_used || 0,
            patchcords_remaining: data.materials?.patchcords_remaining || 0,
            rosetas_used: data.materials?.rosetas_used || 0
        }

        const { error } = await supabase
            .from("technician_daily_reports")
            .upsert(payload, { onConflict: 'user_id, date' })

        if (error) throw error
        return { success: true }

    } catch (error: any) {
        console.error("Error saving report:", error)
        return { success: false, error: error.message }
    }
}

// [New] Get Today's Report
export async function getTechnicianReport() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const canonicalDate = new Date().toISOString().split('T')[0]

    const { data } = await supabase
        .from("technician_daily_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", canonicalDate)
        .single()

    return data
}


export async function purgeTestData() {
    try {
        const cookieStore = await cookies()
        const userClient = await createClient()
        const { data: { user } } = await userClient.auth.getUser()

        if (!user) return { success: false, error: "No se identificó el usuario." }

        const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        // Select client: Admin (Full Access) or Standard (Restricted)
        const supabase = adminKey
            ? createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                adminKey,
                { cookies: { getAll: () => [], setAll: () => { } } }
            )
            : userClient

        const todayStr = new Date().toISOString().split('T')[0]

        // 1. Delete Audits
        await supabase
            .from("inventory_audits")
            .delete()
            .or(`technician_id.eq.${user.id},team_id.eq.${user.id}`)
            .gte("created_at", todayStr)

        // 2. Delete Closures
        await supabase
            .from("cierres")
            .delete()
            .or(`tecnico_id.eq.${user.id},user_id.eq.${user.id}`)
            .gte("created_at", todayStr)

        // 3. Delete Reports (Optional, but good for reset)
        await supabase
            .from("technician_daily_reports")
            .delete()
            .eq("user_id", user.id)
            .eq("date", todayStr)

        revalidatePath("/tecnicos")
        return { success: true, message: "Datos de hoy eliminados." }

    } catch (err: any) {
        console.error("Purge Exception:", err)
        return { success: false, error: err.message }
    }
}


export async function finalizeDayAction() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No autenticado")

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        // 2. Fetch Active Assignments (Snapshot of what tech has)
        const { data: assignments } = await supabase
            .from("inventory_assignments")
            .select("*, items:inventory_assignment_items(*, product:inventory_products(id, sku, name))")
            .eq("assigned_to", user.id)
            .eq("status", "ACTIVE")

        // 2.5 Fetch Standard Products for Audit Template (Consumables)
        const KPI_SKUS = ["CARRETE", "CONV", "PREC", "ROSETA", "TENS", "PATCH1", "ONU"]
        const { data: stdProducts } = await supabase
            .from("inventory_products")
            .select("id, sku, name")
            .in("sku", KPI_SKUS)

        // 2.6 Calculate Reported Usage (Incremental if previous audit exists)
        const todayStr = new Date().toISOString().split('T')[0]

        // 3. Find ANY audit for today (Pending or Completed) - SINGLE AUDIT PER DAY POLICY
        const { data: todaysAudit } = await supabase
            .from("inventory_audits")
            .select("id, created_at, updated_at, status, notes")
            .eq("technician_id", user.id)
            .gte("created_at", todayStr)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

        // 4. Calculate Incremental Usage
        // If audit exists, we only want usage AFTER the last update
        const cutoffTime = todaysAudit ? (todaysAudit.updated_at || todaysAudit.created_at) : todayStr

        let closureQuery = supabase
            .from("cierres")
            .select("metraje_usado, metraje_desechado, conectores, precinto, rosetas, tensores, patchcord, onu, codigo_carrete, created_at")
            .eq("tecnico_id", user.id)

        if (todaysAudit) {
            closureQuery = closureQuery.gt("created_at", cutoffTime)
        } else {
            closureQuery = closureQuery.gte("created_at", todayStr)
        }

        const { data: closes } = await closureQuery

        // Setup Helpers (Moved here for scope clarity)
        const cleanMeters = (val: any) => {
            if (!val) return 0
            const num = parseInt(String(val).replace(/[^0-9]/g, ""), 10)
            return isNaN(num) ? 0 : num
        }

        const countItem = (val: any, isSerialLike: boolean) => {
            if (!val) return 0
            const str = String(val).trim()
            if (str.length === 0) return 0
            if (isSerialLike) return 1
            const num = parseInt(str.replace(/[^0-9]/g, ""), 10)
            return isNaN(num) ? 0 : num
        }

        const usageMap: Record<string, number> = {}
        const spoolUsageMap: Record<string, number> = {}

        closes?.forEach((c: any) => {
            if (c.codigo_carrete) {
                const used = cleanMeters(c.metraje_usado) + cleanMeters(c.metraje_desechado)
                spoolUsageMap[c.codigo_carrete] = (spoolUsageMap[c.codigo_carrete] || 0) + used
            }
            usageMap["CONV"] = (usageMap["CONV"] || 0) + countItem(c.conectores, false)
            usageMap["PREC"] = (usageMap["PREC"] || 0) + countItem(c.precinto, true)
            usageMap["ROSETA"] = (usageMap["ROSETA"] || 0) + countItem(c.rosetas, true)
            usageMap["TENS"] = (usageMap["TENS"] || 0) + countItem(c.tensores, false)
            usageMap["PATCH1"] = (usageMap["PATCH1"] || 0) + countItem(c.patchcord, true)
            usageMap["ONU"] = (usageMap["ONU"] || 0) + countItem(c.onu, true)
            usageMap["CARRETE"] = (usageMap["CARRETE"] || 0) + cleanMeters(c.metraje_usado) + cleanMeters(c.metraje_desechado)
        })

        // 5. Audit Upsert (Append Mode Logic)
        let auditId: string
        const currentTimestamp = new Date().toISOString()
        const batchLabel = `Anexo ${new Date().toLocaleTimeString('es-VE')}`

        if (todaysAudit) {
            auditId = todaysAudit.id
            // Re-open audit and update timestamp
            // Also append note to indicate batch
            await supabase.from("inventory_audits").update({
                status: "PENDING",
                updated_at: currentTimestamp,
                notes: (todaysAudit.notes || "Cierre de Jornada") + ` | ${batchLabel}`
            }).eq("id", auditId)
            // DO NOT DELETE existing items. We are appending.
        } else {
            const { data: newAudit, error: auditError } = await supabase.from("inventory_audits").insert({
                technician_id: user.id,
                team_id: profile?.team_id || null,
                notes: "Cierre de Jornada (Inicial)",
                status: "PENDING",
                updated_at: currentTimestamp
            }).select().single()
            if (auditError) throw new Error("Error iniciando auditoría: " + auditError.message)
            auditId = newAudit.id
        }

        // 6. Create Audit Items
        const auditItems: any[] = []
        const addedProductIds = new Set()

        if (assignments && assignments.length > 0) {
            assignments.forEach((a: any) => {
                a.items?.forEach((i: any) => {
                    const pid = i.product?.id || i.product_id
                    const sku = i.product?.sku || "UNKNOWN"
                    const name = i.product?.name || "Unknown Product"

                    let reported = 0
                    if (sku.includes("CARRETE")) {
                        if (Array.isArray(i.serials)) {
                            i.serials.forEach((s: any) => {
                                const serial = typeof s === 'string' ? s : s.serial
                                reported += (spoolUsageMap[serial] || 0)
                            })
                        } else {
                            reported = usageMap["CARRETE"] || 0
                        }
                    } else {
                        const key = KPI_SKUS.find(k => sku.includes(k))
                        if (key) reported = usageMap[key] || 0
                    }

                    // On Append (todaysAudit exists), ONLY add items with usage > 0 to avoid duplicates of "0"
                    const shouldAdd = !todaysAudit || reported > 0

                    if (shouldAdd) {
                        auditItems.push({
                            audit_id: auditId,
                            product_id: pid,
                            product_sku: sku,
                            product_name: name,
                            theoretical_quantity: i.quantity,
                            physical_quantity: i.quantity,
                            reported_quantity: reported,
                            notes: todaysAudit ? batchLabel : undefined
                        })
                    }
                    addedProductIds.add(pid)
                })
            })
        }

        if (stdProducts && stdProducts.length > 0) {
            stdProducts.forEach((p: any) => {
                if (!addedProductIds.has(p.id)) {
                    const key = KPI_SKUS.find(k => p.sku.includes(k))
                    const reported = key ? (usageMap[key] || 0) : 0

                    const shouldAdd = !todaysAudit || reported > 0

                    if (shouldAdd) {
                        auditItems.push({
                            audit_id: auditId,
                            product_id: p.id,
                            product_sku: p.sku,
                            product_name: p.name,
                            theoretical_quantity: 0,
                            physical_quantity: 0,
                            reported_quantity: reported,
                            notes: todaysAudit ? batchLabel : undefined
                        })
                    }
                }
            })
        }

        if (auditItems.length > 0) {
            const { error: itemsError } = await supabase.from("inventory_audit_items").insert(auditItems)
            if (itemsError) throw new Error("Error guardando items: " + itemsError.message)
        }

        revalidatePath("/tecnicos")
        return { success: true, message: "Jornada finalizada." }

    } catch (error: any) {
        console.error("Finalize Day Error:", error)
        return { success: false, error: error.message }
    }
}
