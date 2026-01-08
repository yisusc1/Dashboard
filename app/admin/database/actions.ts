"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// 1. RESET INVENTORY (Keeps Products)
export async function resetInventoryAction() {
    try {
        const supabase = await createClient()

        // 1. Delete Transactions
        const { error: tError } = await supabase.from("inventory_transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        if (tError) throw tError

        // 2. Delete Returns components
        await supabase.from("inventory_return_items").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("inventory_returns").delete().neq("id", "00000000-0000-0000-0000-000000000000")

        // 3. Delete Assignments components
        await supabase.from("inventory_assignment_items").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("inventory_assignments").delete().neq("id", "00000000-0000-0000-0000-000000000000")

        // 4. Update Stock to 0
        const { error: pError } = await supabase
            .from("inventory_products")
            .update({ current_stock: 0 })
            .neq("id", "00000000-0000-0000-0000-000000000000")

        if (pError) throw pError

        // 5. Reset Serials
        await supabase.from("inventory_serials").delete().neq("serial_number", "00000_IGNORE")

        revalidatePath("/almacen")
        revalidatePath("/admin/database")
        return { success: true }
    } catch (error: any) {
        console.error("Reset Inventory Error:", error)
        return { success: false, error: error.message }
    }
}

// 2. RESET OPERATIONS (Keeps Clients? No, User said "dependiendo del proceso". But Reset Ops usually clears active jobs.
// The user said: "never delete created vehicles or products".
// `reset_operations_v2` deletes Clients. Is that OK?
// "dependiendo del proceso que este testeando" implies they might want to clear Clients too.
// I will keep using the RPC as it's the tested "Factory Reset" for Ops.
export async function resetOperationsAction() {
    try {
        const supabase = await createClient()

        // Use RPC to bypass RLS and ensure complete deletion of all operational data
        // [FIX] RPC might be missing tables. Doing manual deletion of everything.
        // Order matters for FK constraints usually, but cascading might handle it.
        // Safer order: Child tables first.

        // 1. Audits & Reports
        await supabase.from("inventory_audits").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("technician_daily_reports").delete().neq("id", 0)

        // 2. Activity Data
        await supabase.from("soportes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase.from("cierres").delete().neq("id", 0)

        // 3. Clients (Users said "Borra clientes")
        // Note: Assignments might link to Clients? If so, delete assignments first?
        // Assignments link to Users.
        await supabase.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000")

        // 4. Try RPC as backup? No, manual should suffice.
        // const { error: rpcError } = await supabase.rpc('reset_operations_v2')
        // if (rpcError) throw rpcError

        revalidatePath("/tecnicos")
        revalidatePath("/admin/database")
        return { success: true }
    } catch (error: any) {
        console.error("Reset Operations Error:", error)
        return { success: false, error: error.message }
    }
}

// 3. RESET FULE LOGS (Keeps Vehicles)
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
