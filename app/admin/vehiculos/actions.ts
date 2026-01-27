'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MileageSource = {
    type: 'fuel_log' | 'report_entry' | 'report_exit' | 'legacy' | 'unknown';
    id: string;
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
            description: 'Carga de Combustible'
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
            description: 'Reporte de Entrada'
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
            description: 'Reporte de Salida'
        }
    }

    return null
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
    }

    if (error) {
        console.error("Error correcting mileage:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/vehiculos')
    return { success: true }
}
