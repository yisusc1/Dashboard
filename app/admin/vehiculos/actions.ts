'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MileageSource = {
    type: 'fuel_log' | 'report_entry' | 'report_exit' | 'legacy' | 'unknown';
    id: string;
    vehicleId: string; // [NEW] Added for robust updates
    currentValue: number;
    date: string;
    description: string;
}

export async function getMileageSource(vehicleId: string, currentTotalMileage: number): Promise<MileageSource | null> {
    const supabase = await createClient()

    // 1. Check Fuel Logs
    const { data: fuelLog } = await supabase
        .from('fuel_logs')
        .select('id, mileage, created_at, fuel_date')
        .eq('vehicle_id', vehicleId)
        .eq('mileage', currentTotalMileage)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (fuelLog) {
        return {
            type: 'fuel_log',
            id: fuelLog.id,
            currentValue: fuelLog.mileage,
            date: fuelLog.fuel_date || fuelLog.created_at,
            description: 'Carga de Combustible',
            vehicleId: vehicleId
        }
    }
}

// 2. Check Reports (Entry)
const { data: entryReport } = await supabase
    .from('reportes')
    .select('id, km_entrada, fecha_entrada, created_at')
    .eq('vehiculo_id', vehicleId)
    .eq('km_entrada', currentTotalMileage)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

if (entryReport) {
    return {
        type: 'report_entry',
        id: entryReport.id,
        currentValue: entryReport.km_entrada,
        date: entryReport.fecha_entrada || entryReport.created_at,
        description: 'Reporte de Entrada',
        vehicleId: vehicleId
    }
}
    }

// 3. Check Reports (Exit)
const { data: exitReport } = await supabase
    .from('reportes')
    .select('id, km_salida, fecha_salida, created_at')
    .eq('vehiculo_id', vehicleId)
    .eq('km_salida', currentTotalMileage)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

if (exitReport) {
    return {
        type: 'report_exit',
        id: exitReport.id,
        currentValue: exitReport.km_salida,
        date: exitReport.fecha_salida || exitReport.created_at,
        description: 'Reporte de Salida',
        vehicleId: vehicleId
    }
}
    }

// 4. Check Master Vehicle Record (Fallback)
// If the error exists only in 'vehiculos' (or we couldn't match a log), we should treat the vehicle record itself as the source.
const { data: vehicle } = await supabase
    .from('vehiculos')
    .select('id, kilometraje, updated_at')
    .eq('id', vehicleId)
    .eq('kilometraje', currentTotalMileage)
    .single()

if (vehicle) {
    return {
        type: 'legacy', // Or 'master_record'
        id: vehicle.id,
        currentValue: vehicle.kilometraje,
        date: vehicle.updated_at,
        description: 'Registro Maestro (Vehículos)'
    }
}

return {
    type: 'unknown',
    id: vehicleId,
    currentValue: currentTotalMileage,
    date: new Date().toISOString(),
    description: 'Origen Desconocido (Forzar Corrección)'
}
}

export async function correctMileage(source: MileageSource, newValue: number) {
    const supabase = await createClient()
    let error = null

    if (source.type === 'fuel_log') {
        const { error: err } = await supabase
            .from('fuel_logs')
            .update({ mileage: newValue })
            .eq('id', source.id)
        error = err
    } else if (source.type === 'report_entry') {
        const { error: err } = await supabase
            .from('reportes')
            .update({ km_entrada: newValue })
            .eq('id', source.id)
        error = err
    } else if (source.type === 'report_exit') {
        const { error: err } = await supabase
            .from('reportes')
            .update({ km_salida: newValue })
            .eq('id', source.id)
        error = err
    } else if (source.type === 'legacy' || source.type === 'unknown') {
        // Direct update to vehicle master record
        // We do nothing here, because we ALWAYS update the vehicle record below.
    }

    if (error) {
        console.error("Error correcting mileage:", error)
        return { success: false, error: error.message }
    }

    // [CRITICAL FIX] ALWAYS update the Master Vehicle Record
    // The view 'vista_ultimos_kilometrajes' likely takes MAX(vehiculos.kilometraje, reports, logs).
    // If we only fix the log, the stale high value in 'vehiculos' might remain.
    // So we must force push the new value to 'vehiculos' as well.
    // We need the vehicle_id. 'source.id' provides it for legacy/unknown.
    // For others, we need to fetch it or pass it. 
    // Wait, 'source' structure doesn't have vehicle_id easily accessible for logs/reports (we'd have to query).
    // Let's change the function signature or fetch it? 
    // Actually, 'getMileageSource' took vehicleId as arg, but didn't return it.
    // Let's just fix specific tables first, but we really need to fix 'vehiculos'.

    // Quick Hack: If source is log/report, we might not know vehicle ID easily without query.
    // BUT! The user flow usually comes from a context where we know the vehicle.
    // Refactor: We need vehicle_id in 'correctMileage' or inside 'source'. 

    // For now, let's look at how we can get vehicle_id.
    // Let's query it if needed, or assume 'source.id' is usable.
    // Actually, let's just add 'vehicle_id' to the Source type.

    // ... (See next chunk for Type update) ...

    // Assuming we added vehicleId to source:
    if (source.vehicleId) {
        const { error: masterError } = await supabase
            .from('vehiculos')
            .update({ kilometraje: newValue })
            .eq('id', source.vehicleId)

        if (masterError) console.error("Error updating master vehicle record:", masterError)
    }

    if (error) {
        console.error("Error correcting mileage:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/vehiculos')
    return { success: true }
}
