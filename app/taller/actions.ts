"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type MaintenanceData = {
    vehicle_id: string
    service_type: string
    mileage: number
    notes?: string
    performed_by?: string
    cost?: number
}

export async function registerMaintenance(data: MaintenanceData) {
    const supabase = await createClient()

    try {
        // 1. Insert Log
        const { error: logError } = await supabase.from('maintenance_logs').insert({
            vehicle_id: data.vehicle_id,
            service_type: data.service_type,
            mileage: data.mileage,
            notes: data.notes,
            performed_by: data.performed_by,
            cost: data.cost || 0,
            service_date: new Date().toISOString()
        })

        if (logError) throw logError

        // 2. Update Vehicle Columns based on Service Type
        let updateData: any = {}

        if (data.service_type === 'OIL_CHANGE') {
            updateData.last_oil_change_km = data.mileage
        } else if (data.service_type === 'TIMING_BELT') {
            updateData.last_timing_belt_km = data.mileage
        } else if (data.service_type === 'CHAIN_KIT') {
            updateData.last_chain_kit_km = data.mileage
        } else if (data.service_type === 'WASH') {
            updateData.last_wash_date = new Date().toISOString()
        }

        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
                .from('vehiculos')
                .update(updateData)
                .eq('id', data.vehicle_id)

            if (updateError) throw updateError
        }

        revalidatePath('/taller')
        revalidatePath('/admin/vehiculos')

        return { success: true }
    } catch (error: any) {
        console.error('Maintenance Registration Error:', error)
        return { success: false, error: error.message }
    }
}

export async function reportFault(data: {
    vehicle_id: string
    description: string
    priority: string
    fault_type: string
}) {
    const supabase = await createClient()

    try {
        const { error } = await supabase.from('fallas').insert({
            vehiculo_id: data.vehicle_id,
            descripcion: data.description,
            prioridad: data.priority,
            tipo_falla: data.fault_type,
            estado: 'Pendiente',
            created_at: new Date().toISOString()
        })

        if (error) throw error

        revalidatePath('/taller')
        return { success: true }
    } catch (error: any) {
        console.error('Report Fault Error:', error)
        return { success: false, error: error.message }
    }
}
