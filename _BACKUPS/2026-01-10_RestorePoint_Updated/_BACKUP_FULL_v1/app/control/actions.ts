"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

// Helper to clean meters from text (local fallback if DB function missing)
function cleanMeters(text: string | null): number {
    if (!text) return 0
    const numbers = text.replace(/[^0-9]/g, "")
    return numbers ? parseInt(numbers, 10) : 0
}

const cleanQuantity = (text: any): number => {
    if (!text) return 0
    if (typeof text === 'number') return text
    const str = String(text).trim()

    // Handle "Si", "Yes" -> 1
    if (["si", "yes", "ok", "true"].includes(str.toLowerCase())) return 1

    // Check for comma separated values (lists of serials)
    if (str.includes(',')) {
        return str.split(',').filter(s => s.trim().length > 0).length
    }

    // Attempt to parse number
    const numeric = parseInt(str.replace(/[^0-9]/g, ""), 10)

    // Logic Heuristic:
    // If input is purely alphanumeric (like a Serial "J2M9C4"), parsing might fail or return junk.
    // If it has letters and numbers, it's likely a Serial -> Count 1.
    // Regex for alphanumeric serial (at least 1 letter, total len > 3):
    if (/[a-zA-Z]/.test(str) && str.length > 3) {
        return 1
    }

    // If number is absurdly large (e.g. > 1000) for a standard item unit like Precinto
    if (!isNaN(numeric) && numeric > 1000) {
        return 1
    }

    // Common case: "2", "2 unds", "1" -> returns 2, 2, 1
    // If strict number (e.g. "3")
    if (!isNaN(numeric)) return numeric

    // Fallback: if there's text content but no clear number, assume 1? Or 0?
    // Safety: 0
    return 0
}

export async function getAuditData(entityId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
        }
    )

    // A. DETERMINE IF ENTITY IS USER OR TEAM
    let teamMembers: string[] = []
    let teamName = ""
    let entityName = ""

    // Check if ID is a team
    const { data: team } = await supabase
        .from("teams")
        .select("id, name, profiles(id, first_name, last_name)")
        .eq("id", entityId)
        .single()

    if (team) {
        // IT IS A TEAM
        teamName = team.name
        entityName = "Equipo " + team.name
        // @ts-ignore
        teamMembers = team.profiles?.map((p: any) => p.id) || []
    } else {
        // FALLBACK: INDIVIDUAL TECHNICIAN
        const { data: user } = await supabase.from("profiles").select("*").eq("id", entityId).single()
        if (user) {
            teamMembers = [user.id]
            entityName = `${user.first_name} ${user.last_name}`
            if (user.team_id) {
                const { data: t } = await supabase.from("teams").select("name").eq("id", user.team_id).single()
                if (t) teamName = t.name
            }
        }
    }

    if (teamMembers.length === 0) throw new Error("Entidad no encontrada (Usuario o Equipo)")

    // 1. Get Assigned Inventory (For ALL members)
    const { data: assignments, error: assignError } = await supabase
        .from("inventory_transactions")
        .select(`
            quantity,
            type,
            product:inventory_products!inner(sku, name, id)
        `)
        .in("assigned_to", teamMembers)
        .eq("type", "OUT")

    if (assignError) throw new Error("Error fetching assignments: " + assignError.message)

    // 2. Get Usage from Installations (Aggregated)
    // We try to match by Team Name (field 'equipo') OR by technician names.
    const { data: closes } = await supabase
        .from("cierres")
        .select("metraje_usado, metraje_desechado, conectores, precinto, rosetas, tensores, patchcord, onu, tecnico_1, equipo")

    const teamCloses = (closes || []).filter(c => {
        // Match by Team Name
        if (teamName && c.equipo && c.equipo.trim().toLowerCase() === teamName.toLowerCase()) return true

        // Match by Tech Name is hard without precise name list. 
        // For now, if we are auditing a Team, we rely on 'equipo' column mainly.
        // If auditing a User, we rely on 'tecnico_1' partial match (existing logic)

        if (!teamName) {
            // Manual user match fallback
            return (c.tecnico_1 && c.tecnico_1.toLowerCase().includes(entityName.split(" ")[0].toLowerCase()))
        }
        return false
    })

    // 3. Aggregate Data
    const stockMap: Record<string, { name: string, assigned: number, reported: number, sku: string, productId: string }> = {}

    const KPI_MAP: Record<string, string> = {
        "CARRETE": "metraje_usado",
        "CONV": "conectores",
        "PREC": "precinto",
        "ROSETA": "rosetas",
        "TENS": "tensores",
        "PATCH1": "patchcord",
        "ONU": "onu" // Added ONU mapping
    }

    // [New] Pre-fetch product info for all KPI_MAP keys to allow reporting unassigned items
    // We need product IDs and Names for standard items if they appear in usage but not assignments.
    const kpiSkus = Object.keys(KPI_MAP)
    // We can't do exact match because "ONU" is a prefix usually? Text says "ONU"?
    // The SKU in products table is usually just "ONU", "CONV", etc? Or "ONU-ZTE"?
    // Let's assume the KPI keys match the SKUs or distinct parts of them.
    // For simplicity, let's fetch products that match these SKUs.
    const { data: allProducts } = await supabase
        .from("inventory_products")
        .select("id, sku, name")
        .in("sku", kpiSkus)

    // Helper to find product stats
    const findProduct = (skuKey: string) => allProducts?.find(p => p.sku === skuKey)

    // Process Assignments
    assignments?.forEach((tx: any) => {
        const sku = tx.product.sku
        const qty = tx.quantity
        if (!stockMap[sku]) {
            stockMap[sku] = { name: tx.product.name, assigned: 0, reported: 0, sku, productId: tx.product.id }
        }
        stockMap[sku].assigned += qty

        if (sku === "CARRETE" && qty < 50) {
            stockMap[sku].assigned = stockMap[sku].assigned - qty + (qty * 1000)
        }
    })



    // Process Reported Usage
    teamCloses.forEach((cierre: any) => {
        Object.keys(KPI_MAP).forEach(sku => {
            const key = KPI_MAP[sku]

            // Allow adding if not exists
            if (!stockMap[sku]) {
                const p = findProduct(sku)
                // Only add if we can resolve the product (so we have ID/Name)
                if (p) {
                    stockMap[sku] = { name: p.name, assigned: 0, reported: 0, sku: p.sku, productId: p.id }
                } else if (sku === 'CARRETE') {
                    // Special retry for Carrete if exact SKU didn't match (e.g. CARRETE-FIBRA vs CARRETE)
                    // But KPI_MAP uses "CARRETE" key. If database has "CARRETE 1000M", we might miss it.
                    // For now, assume strict mapping or fallback.
                    stockMap[sku] = { name: "Bobina de Fibra (Genérico)", assigned: 0, reported: 0, sku, productId: "unknown" }
                }
            }

            if (stockMap[sku]) {
                const rawVal = cierre[key]
                if (sku === 'CARRETE') {
                    // Sum used + wasted
                    const used = cleanMeters(cierre['metraje_usado'])
                    const wasted = cleanMeters(cierre['metraje_desechado']) // Needs to be selected in SQL
                    stockMap[sku].reported += (used + wasted)
                } else {
                    // @ts-ignore
                    const val = cleanQuantity(rawVal)
                    stockMap[sku].reported += val
                }
            }
        })
    })

    // Return dummy profile wrapper for frontend compatibility
    return {
        technician: {
            id: entityId,
            type: team ? 'TEAM' : 'USER',
            first_name: entityName,
            last_name: "",
            members: teamMembers // Useful for frontend info
        },
        stock: Object.values(stockMap)
    }
}

export async function saveAudit(auditData: any) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
        }
    )

    // 1. Create Audit Header
    const payload: any = {
        notes: auditData.notes
    }

    if (auditData.entityType === 'TEAM') {
        payload.team_id = auditData.entityId
        // ALSO assign to Leader (First Member) so history persists if Team is deleted
        if (auditData.members && auditData.members.length > 0) {
            payload.technician_id = auditData.members[0]
        }
    } else {
        payload.technician_id = auditData.entityId
    }

    const { data: audit, error: headerError } = await supabase
        .from("inventory_audits")
        .insert(payload)
        .select()
        .single()

    if (headerError) throw new Error(headerError.message)

    // 2. Insert Items & Reconcile
    const { data: { user } } = await supabase.auth.getUser()

    const items = []
    const transactions = []

    for (const item of auditData.items) {
        // A. Prepare Audit Item Record
        items.push({
            audit_id: audit.id,
            product_sku: item.sku,
            product_name: item.name,
            theoretical_quantity: item.theoretical,
            physical_quantity: item.physical,
            reported_quantity: item.reported || 0,
            item_name: item.name,
            item_sku: item.sku,
            product_id: item.productId || null,
            unit_type: item.sku.includes('CARRETE') ? 'METERS' : 'UNITS'
        })

        // B. Reconcile Logic
        if (auditData.reconcileStock) {
            const diff = item.physical - item.theoretical

            if (diff !== 0) {
                // If diff > 0: Found MORE than expected. We need to ADD to their stock -> IN
                // If diff < 0: Found LESS than expected. We need to REMOVE from their stock -> OUT
                const type = diff > 0 ? 'IN' : 'OUT'
                const qty = Math.abs(diff)

                transactions.push({
                    product_id: item.productId,
                    type: type,
                    quantity: qty,
                    reason: `Ajuste Auditoría: ${diff > 0 ? 'Sobrante' : 'Faltante'}`,
                    assigned_to: auditData.entityType === 'TEAM'
                        ? auditData.members[0] // Default to first member for team assignment valid FK? Or Team ID? 
                        // Wait, transactions use 'assigned_to' UUID (Profile). Teams don't own stock directly in this schema usually, 
                        // stock is calculated by "assigned_to IN team_members".
                        // So we assign to the first member found, or the entityId if it's a user.
                        : auditData.entityId,
                    received_by: user?.email || 'Sistema',
                    receiver_id: user?.id,
                    created_at: new Date().toISOString()
                })

                // Small correction for TEAM assignments:
                // If entityType is TEAM, we need a valid User UUID. 
                // We'll use the first member's ID as the "Holder" of the adjustment.
                if (auditData.entityType === 'TEAM' && (!auditData.members || auditData.members.length === 0)) {
                    // Fallback: Cannot assign if no members. Skip transaction to avoid FK error.
                    // But we should have members from getAuditData.
                } else if (auditData.entityType === 'TEAM') {
                    // Ensure we use a valid UUID from the members list
                    // transactions[last].assigned_to = auditData.members[0]; 
                    // Logic checked above.
                }
            }
        }
    }

    const { error: itemsError } = await supabase
        .from("inventory_audit_items")
        .insert(items)

    if (itemsError) throw new Error(itemsError.message)

    // Execute Adjustments if any
    if (transactions.length > 0) {
        const { error: txError } = await supabase
            .from("inventory_transactions")
            .insert(transactions)

        if (txError) {
            // Log error but don't fail the whole audit? Or fail hard?
            // Let's fail hard so they know adjustment didn't work.
            throw new Error("Error creando ajustes de inventario: " + txError.message)
        }
    }

    return { success: true, auditId: audit.id }
}

export async function getAuditHistory(entityId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
        }
    )

    // Try to match as team_id OR technician_id
    const { data: audits, error } = await supabase
        .from("inventory_audits")
        .select("id, created_at, notes, supervisor_id, team_id, technician_id")
        .or(`team_id.eq.${entityId},technician_id.eq.${entityId}`)
        .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)
    return audits
}

export async function getAuditDetails(auditId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
        }
    )

    const { data: audit, error } = await supabase
        .from("inventory_audits")
        .select(`
            *,
            items:inventory_audit_items(*)
        `)
        .eq("id", auditId)
        .single()

    if (error) throw new Error(error.message)

    // [New] Fetch Active Spool Info from Assignments
    let spoolData: any[] = []

    // Determine Team ID
    let teamId = audit.team_id
    if (!teamId && audit.technician_id) {
        // Fallback: finding team of the technician
        const { data: profile } = await supabase.from("profiles").select("team_id").eq("id", audit.technician_id).single()
        if (profile) teamId = profile.team_id
    }

    if (teamId) {
        // 1. Get Active Assignments for Team
        const { data: assignments } = await supabase
            .from("inventory_assignments")
            .select(`
                id,
                items:inventory_assignment_items(serials, product:inventory_products(sku))
            `)
            .eq("team_id", teamId)
            .eq("status", "ACTIVE")

        if (assignments && assignments.length > 0) {
            // 2. Extract Serials
            const spools: string[] = []
            assignments.forEach((a: any) => {
                a.items?.forEach((item: any) => {
                    if (item.product?.sku?.includes("CARRETE") && Array.isArray(item.serials)) {
                        item.serials.forEach((s: any) => spools.push(typeof s === 'string' ? s : s.serial))
                    }
                })
            })

            // 3. For each Spool, get Master Record + Usage
            for (const serial of spools) {
                // A. Master Record
                const { data: serialRec } = await supabase
                    .from("inventory_serials")
                    .select("serial_number, current_quantity, initial_quantity")
                    .eq("serial_number", serial)
                    .single()

                if (!serialRec) continue

                // B. Reported Usage Today (or pertinent period)
                // We sum up 'metraje_usado' + 'metraje_desechado' from Cierres where codigo_carrete = serial
                // We should filter by date? Ideally usage "Since last update". 
                // But for now, let's assume 'current_quantity' is Start of Day (updated yesterday).
                // So we sum Today's closures.
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const { data: usages } = await supabase
                    .from("cierres")
                    .select("metraje_usado, metraje_desechado")
                    .eq("codigo_carrete", serial)
                    .gte("created_at", today.toISOString())

                let reported = 0
                usages?.forEach((u: any) => {
                    // Extract numbers handles string formats like "150m"
                    const uVal = Number(String(u.metraje_usado).replace(/[^0-9.]/g, "")) || 0
                    const wVal = Number(String(u.metraje_desechado).replace(/[^0-9.]/g, "")) || 0
                    reported += (uVal + wVal)
                })

                spoolData.push({
                    serial_number: serial,
                    current_quantity: serialRec.current_quantity, // Known Start Stock
                    reported_quantity: reported,
                    assignment_id: assignments.find(a => a.items.some((i: any) => i.serials.includes(serial)))?.id
                })
            }
        }
    }

    return { ...audit, spoolData }
}

export async function approveAudit(auditId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
        }
    )

    const { error } = await supabase
        .from("inventory_audits")
        .update({ status: 'COMPLETED' })
        .eq("id", auditId)

    if (error) throw new Error(error.message)
    revalidatePath("/control")
    return { success: true }
}

export async function getPendingAudits() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
        }
    )

    const { data: audits } = await supabase
        .from("inventory_audits")
        .select("id, team_id, technician_id, created_at")
        .eq("status", "PENDING")

    return audits || []
}

export async function updateAndApproveAudit(auditId: string, items: any[], notes?: string, spoolUpdates?: { serial: string, physical: number }[]) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            },
        }
    )

    // 1. Update Items with Physical Counts
    for (const item of items) {
        // We only update physical_quantity. 
        // reported_quantity is what was used (history).
        await supabase
            .from("inventory_audit_items")
            .update({
                physical_quantity: item.physical_quantity
            })
            .eq("id", item.id)
    }

    // [New] 1.5 Update Spools if provided
    if (spoolUpdates && spoolUpdates.length > 0) {
        // Ensure it's an array (handle legacy single object call if any remains, though we fixed the caller)
        const updates = Array.isArray(spoolUpdates) ? spoolUpdates : [spoolUpdates]

        const { data: { user } } = await supabase.auth.getUser()

        for (const update of updates) {
            // A. Update Serial Master Record
            await supabase
                .from("inventory_serials")
                .update({ current_quantity: update.physical })
                .eq("serial_number", update.serial)

            // B. Log Adjustment Transaction
            await supabase.from("inventory_transactions").insert({
                type: 'ADJUST',
                quantity: update.physical,
                previous_stock: 0,
                new_stock: update.physical,
                reason: `Auditoría Supervisada: Ajuste de Bobina ${update.serial}`,
                user_id: user?.id,
                serials: [update.serial]
            })
        }
    }

    // 2. Update Audit Status & Notes
    const { error } = await supabase
        .from("inventory_audits")
        .update({
            status: 'COMPLETED',
            notes: notes ? notes : undefined // Only update if provided
        })
        .eq("id", auditId)

    if (error) throw new Error(error.message)

    revalidatePath("/control")
    revalidatePath(`/control/history/view/${auditId}`)

    return { success: true }
}

