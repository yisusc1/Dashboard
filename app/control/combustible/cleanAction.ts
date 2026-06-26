"use server"

export async function cleanMonthData() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        return { success: false, error: "Configuration Error: Missing Service Key" }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    try {
        // 1. Get all logs
        const { data: allLogs, error: fetchError } = await supabase
            .from("fuel_logs")
            .select("id, talonario_vehiculo_id, vehicle_id, ticket_url, created_at, status")
            .order("created_at", { ascending: false })

        if (fetchError) throw fetchError
        if (!allLogs || allLogs.length === 0) return { success: true, message: "No hay datos que limpiar." }

        // 2. Determine which logs to KEEP.
        // We must keep the LATEST log for each talonario_vehiculo_id to not break the sequence.
        const logsToKeep = new Set<string>()
        const seenPads = new Set<string>()

        for (const log of allLogs) {
            const padId = log.talonario_vehiculo_id || log.vehicle_id
            if (!seenPads.has(padId)) {
                // This is the latest log for this pad (since ordered by created_at DESC)
                logsToKeep.add(log.id)
                seenPads.add(padId)
            }
        }

        // 3. Separate logs to DELETE
        const logsToDelete = allLogs.filter(log => !logsToKeep.has(log.id))
        if (logsToDelete.length === 0) return { success: true, message: "Solo queda el registro base de cada talonario. Nada más que limpiar." }

        const filePathsToDelete: string[] = []
        const idsToDelete: string[] = []

        for (const log of logsToDelete) {
            idsToDelete.push(log.id)
            if (log.ticket_url) {
                // Extract file path from public URL
                // Example URL: https://[project].supabase.co/storage/v1/object/public/fuel-receipts/filename.jpg
                const urlParts = log.ticket_url.split('/fuel-receipts/')
                if (urlParts.length > 1) {
                    const filePath = urlParts[1].split('?')[0] // remove query params if any
                    filePathsToDelete.push(decodeURIComponent(filePath))
                }
            }
        }

        // 4. Delete files from storage
        if (filePathsToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('fuel-receipts')
                .remove(filePathsToDelete)
            
            if (storageError) {
                console.error("Storage delete error (partial):", storageError)
                // We log it but continue to delete the DB records
            }
        }

        // 5. Delete records from database in chunks of 1000
        for (let i = 0; i < idsToDelete.length; i += 1000) {
            const chunk = idsToDelete.slice(i, i + 1000)
            const { error: dbError } = await supabase
                .from("fuel_logs")
                .delete()
                .in("id", chunk)
            
            if (dbError) throw dbError
        }

        // Revalidate cache
        const { revalidatePath } = await import('next/cache')
        revalidatePath("/control/combustible")
        revalidatePath("/admin/vehiculos")

        return { 
            success: true, 
            message: `Limpieza completada: ${idsToDelete.length} registros y ${filePathsToDelete.length} imágenes eliminadas.` 
        }

    } catch (error: any) {
        console.error("Clean Month Data Error:", error)
        return { success: false, error: error.message }
    }
}
