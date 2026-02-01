"use server"

import { createClient } from "@/lib/supabase/server"
import { unstable_noStore as noStore } from "next/cache"
import { differenceInMinutes } from "date-fns"

export type FleetStatus = {
    id: string
    code: string
    plate: string
    model: string
    // Driver Info
    driver: string | null
    assigned_driver_id: string | null
    driverImg?: string | null
    driverPhone?: string | null
    driverEmail?: string | null
    // Status
    status: 'AVAILABLE' | 'IN_ROUTE' | 'MAINTENANCE' | 'CRITICAL'
    imageUrl?: string
    // Trip Info
    lastExit?: string
    tripDuration?: string | null // NEW: formatted duration
    activeReport?: any
    // Health
    activeFaults: number
    faultsSummary: {
        critical: number
        high: number
        medium: number
        low: number
    }
    // Details
    tipo: string
    año: string
    color: string
    capacidad_tanque: string
    kilometraje: number
    current_fuel_level: number
    last_fuel_update: string
    last_oil_change_km: number
    last_timing_belt_km: number
    last_chain_kit_km: number
    last_wash_date: string
    department: string
}

export async function getFleetStatus(): Promise<FleetStatus[]> {
    noStore()
    const supabase = await createClient()

    // 1. Fetch Vehicles RAW (No Joins to avoid FK errors)
    const { data: vehicles } = await supabase
        .from("vehiculos")
        .select("*")
        .order('codigo')

    if (!vehicles) return []

    // 2. Fetch Active Trips RAW
    const { data: activeTrips } = await supabase
        .from("reportes")
        .select("*")
        .is("km_entrada", null)

    const tripsMap = new Map(activeTrips?.map(t => [t.vehiculo_id, t]))

    // 3. Manual Join Strategy: Collect all Profile IDs involved
    const profileIds = new Set<string>()

    // Collect from Vehicles (Assigned Driver)
    vehicles.forEach(v => {
        if (v.assigned_driver_id) profileIds.add(v.assigned_driver_id)
    })

    // Collect from Active Trips (Current Driver)
    activeTrips?.forEach(t => {
        if (t.user_id) profileIds.add(t.user_id)
    })

    // Fetch All Relevant Profiles in one go
    let profilesMap = new Map<string, any>()
    if (profileIds.size > 0) {
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, foto_url, phone, email")
            .in("id", Array.from(profileIds))

        profiles?.forEach(p => {
            profilesMap.set(p.id, p)
        })
    }

    // 4. Fetch Active Faults Count
    const { data: faults } = await supabase
        .from("fallas")
        .select("vehiculo_id, prioridad, estado")
        .neq("estado", "Resuelto")
        .neq("estado", "Reparado")
        .neq("estado", "Descartado")

    const faultsSummaryMap = new Map<string, { critical: number, high: number, medium: number, low: number, isMaintenance: boolean }>()

    faults?.forEach(f => {
        const current = faultsSummaryMap.get(f.vehiculo_id) || { critical: 0, high: 0, medium: 0, low: 0, isMaintenance: false }

        // Check for Maintenance Status
        if (f.estado === 'En Revisión') {
            current.isMaintenance = true
        }

        switch (f.prioridad?.toLowerCase()) {
            case 'crítica':
            case 'critica':
                current.critical++
                break
            case 'alta':
                current.high++
                break
            case 'media':
                current.medium++
                break
            default:
                current.low++
        }
        faultsSummaryMap.set(f.vehiculo_id, current)
    })

    // 5. Fetch Latest Mileage
    const { data: mileageData } = await supabase
        .from("vista_ultimos_kilometrajes")
        .select("vehiculo_id, ultimo_kilometraje")

    const mileageMap = new Map(mileageData?.map(m => [m.vehiculo_id, m.ultimo_kilometraje]))

    return vehicles.map(v => {
        const activeTrip = tripsMap.get(v.id)
        const inRoute = !!activeTrip

        const summary = faultsSummaryMap.get(v.id) || { critical: 0, high: 0, medium: 0, low: 0, isMaintenance: false }
        const activeFaults = summary.critical + summary.high + summary.medium + summary.low

        let status: FleetStatus['status'] = 'AVAILABLE'

        if (inRoute) status = 'IN_ROUTE'
        else if (summary.isMaintenance) status = 'MAINTENANCE'
        else if (activeFaults > 0 || v.falla_activa) status = 'CRITICAL'

        // --- RESOLVE DRIVER INFO MANUALLY ---

        // 1. Get Assigned Driver Info
        let assignedDriver = null
        if (v.assigned_driver_id && profilesMap.has(v.assigned_driver_id)) {
            assignedDriver = profilesMap.get(v.assigned_driver_id)
        }

        // 2. Determine Display Driver
        // Default to Assigned Driver
        let displayDriverName = assignedDriver ? `${assignedDriver.first_name} ${assignedDriver.last_name}` : null
        let displayDriverImg = assignedDriver?.foto_url
        let displayDriverPhone = assignedDriver?.phone
        let displayDriverEmail = assignedDriver?.email

        // Override if In Route (Show Current Driver)
        if (inRoute && activeTrip) {
            let tripDriver = null
            if (activeTrip.user_id && profilesMap.has(activeTrip.user_id)) {
                tripDriver = profilesMap.get(activeTrip.user_id)
            }

            if (tripDriver) {
                displayDriverName = `${tripDriver.first_name} ${tripDriver.last_name}`
                displayDriverImg = tripDriver.foto_url
                displayDriverPhone = tripDriver.phone
                displayDriverEmail = tripDriver.email
            } else if (activeTrip.conductor) {
                // Text fallback
                displayDriverName = activeTrip.conductor
            }
        }

        // Calculate Duration
        let tripDuration = null
        if (inRoute && activeTrip?.fecha_salida) {
            const startStr = activeTrip.fecha_salida
            // date-fns difference
            const start = new Date(startStr)
            const now = new Date()
            const diffMins = differenceInMinutes(now, start)

            const hours = Math.floor(diffMins / 60)
            const mins = diffMins % 60
            tripDuration = `${hours}h ${mins}m`
        }

        return {
            id: v.id,
            code: v.codigo,
            plate: v.placa,
            model: v.modelo,
            driver: displayDriverName,
            assigned_driver_id: v.assigned_driver_id,
            driverImg: displayDriverImg,
            driverPhone: displayDriverPhone,
            driverEmail: displayDriverEmail,
            status,
            imageUrl: v.foto_url,
            lastExit: activeTrip?.fecha_salida, // Prioritize trip start time
            tripDuration,
            activeReport: activeTrip,
            activeFaults,
            faultsSummary: summary,
            // Details
            tipo: v.tipo,
            año: v.año,
            color: v.color,
            capacidad_tanque: v.capacidad_tanque,
            kilometraje: Math.max(mileageMap.get(v.id) || 0, v.kilometraje || 0),
            current_fuel_level: v.current_fuel_level,
            last_fuel_update: v.last_fuel_update,
            last_oil_change_km: v.last_oil_change_km,
            last_timing_belt_km: v.last_timing_belt_km,
            last_chain_kit_km: v.last_chain_kit_km,
            last_wash_date: v.last_wash_date,
            department: v.department
        }
    })
}

export type NotificationItem = {
    id: string
    type: 'FALLA' | 'SALIDA' | 'ENTRADA' | 'REPARACION'
    title: string
    description: string
    timestamp: string
    vehicle_plate: string
    metadata: {
        priority?: string
        status?: string
        driver?: string
        model?: string
    }
}

export async function getNotificationHistory(offset = 0, limit = 50): Promise<NotificationItem[]> {
    noStore()
    const supabase = await createClient()

    // Fetch slightly more than needed to ensure correct merge sorting safety
    const safeLimit = offset + limit

    // 1. Fetch Recent Faults
    const { data: faults } = await supabase
        .from("fallas")
        .select(`
            id,
            created_at,
            descripcion,
            prioridad,
            estado,
            vehiculos (placa, modelo)
        `)
        .order('created_at', { ascending: false })
        .limit(safeLimit)

    // 2. Fetch Recent Trips
    const { data: trips } = await supabase
        .from("reportes")
        .select(`
            id,
            fecha_salida,
            fecha_entrada,
            conductor,
            vehiculo_id,
            vehiculos (placa, modelo)
        `)
        .order('fecha_salida', { ascending: false })
        .limit(safeLimit)

    const notifications: NotificationItem[] = []

    // Map Faults
    faults?.forEach((f: any) => {
        const title = `${f.vehiculos?.modelo} (${f.vehiculos?.placa || '?'})`
        const isResolved = f.estado === 'Reparado' || f.estado === 'Resuelto'

        notifications.push({
            id: `f-${f.id}`,
            // If resolved, treat as REPARACION, otherwise FALLA
            type: isResolved ? 'REPARACION' : 'FALLA',
            title: title,
            description: isResolved ? 'Reparación completada por mecánico' : f.descripcion,
            timestamp: f.created_at, // Ideally we'd use 'updated_at' if available, but created_at is fallback
            vehicle_plate: f.vehiculos?.placa || '???',
            metadata: {
                priority: f.prioridad,
                status: f.estado,
                model: f.vehiculos?.modelo
            }
        })
    })

    // Map Trips (Exits and Entries)
    trips?.forEach((t: any) => {
        const title = `${t.vehiculos?.modelo} (${t.vehiculos?.placa || '?'})`

        // Exit Event
        if (t.fecha_salida) {
            notifications.push({
                id: `s-${t.id}`,
                type: 'SALIDA',
                title: title,
                description: `Conductor: ${t.conductor || 'Desconocido'}`,
                timestamp: t.fecha_salida,
                vehicle_plate: t.vehiculos?.placa || '???',
                metadata: {
                    driver: t.conductor,
                    model: t.vehiculos?.modelo
                }
            })
        }

        // Entry Event (if exists)
        if (t.fecha_entrada) {
            notifications.push({
                id: `e-${t.id}`,
                type: 'ENTRADA',
                title: title,
                description: `Vehículo regresó a base`,
                timestamp: t.fecha_entrada,
                vehicle_plate: t.vehiculos?.placa || '???',
                metadata: {
                    driver: t.conductor,
                    model: t.vehiculos?.modelo
                }
            })
        }
    })

    // Sort, then slice correct page
    return notifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(offset, offset + limit)
}
