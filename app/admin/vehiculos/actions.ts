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

    // 4. Check Master Vehicle Record (Fallback)
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
            description: 'Registro Maestro (Vehículos)',
            vehicleId: vehicleId // Actually vehicle.id is the same
        }
    }

    return {
        type: 'unknown',
        id: vehicleId,
        currentValue: currentTotalMileage,
        date: new Date().toISOString(),
        description: 'Origen Desconocido (Forzar Corrección)',
        vehicleId: vehicleId
    }
}

export async function correctMileage(source: MileageSource, newValue: number) {
    const supabase = await createClient()

    // [NUCLEAR OPTION] Force Consistency
    // Instead of just fixing one record, we fix the ecosystem to ensure the View (MAX) returns 'newValue'.

    try {
        // 1. Update Master Record (The Truth)
        if (source.vehicleId) {
            await supabase.from('vehiculos').update({ kilometraje: newValue }).eq('id', source.vehicleId)
        }

        // 2. Clamp Fuel Logs
        // Any log greater than newValue is obviously wrong (or from the future), so we flatten it.
        await supabase
            .from('fuel_logs')
            .update({ mileage: newValue })
            .eq('vehicle_id', source.vehicleId)
            .gt('mileage', newValue)

        // 3. Clamp Entry Reports
        await supabase
            .from('reportes')
            .update({ km_entrada: newValue })
            .eq('vehiculo_id', source.vehicleId)
            .gt('km_entrada', newValue)

        // 4. Clamp Exit Reports
        await supabase
            .from('reportes')
            .update({ km_salida: newValue })
            .eq('vehiculo_id', source.vehicleId)
            .gt('km_salida', newValue)

        // 5. [NEW] Clamp Maintenance Logs (Likely the missing piece causing View persistence)
        await supabase
            .from('maintenance_logs')
            .update({ mileage: newValue })
            .eq('vehicle_id', source.vehicleId)
            .gt('mileage', newValue)

        revalidatePath('/admin/vehiculos')
        revalidatePath('/control/combustible')
        revalidatePath('/transporte')
        revalidatePath('/gerencia')

        return { success: true }

    } catch (error: any) {
        console.error("Error correcting mileage (Aggressive):", error)
        return { success: false, error: error.message }
    }
}
