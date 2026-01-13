"use server"

import { createClient } from "@/lib/supabase/server"
import { addDays, format, subDays, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { unstable_noStore as noStore } from "next/cache"

export type DashboardStats = {
    installationsToday: number
    supportsToday: number
    activeFaults: number
    vehiclesInMaintenance: number
    chartData: any[]
    vehicleStats: {
        total: number
        operational: number
        critical: number
        maintenance: number
    }
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const supabase = await createClient()
    const today = new Date()
    const startOfToday = startOfDay(today).toISOString()
    const endOfToday = endOfDay(today).toISOString()

    // 1. KPI: Installations Today
    const { count: installCount } = await supabase
        .from("cierres")
        .select("*", { count: 'exact', head: true })
        .gte("created_at", startOfToday)
        .lte("created_at", endOfToday)

    // 2. KPI: Supports Today
    const { count: supportCount } = await supabase
        .from("soportes")
        .select("*", { count: 'exact', head: true })
        .gte("created_at", startOfToday)
        .lte("created_at", endOfToday)

    // 3. KPI: Active Faults (Count of actual faults, for the card)
    const { count: faultsCount } = await supabase
        .from("fallas")
        .select("*", { count: 'exact', head: true })
        .neq("estado", "Resuelto")
        .neq("estado", "Descartado")
        .neq("estado", "Reparado")

    // 4. KPI: Maintenance (Just a raw count of 'En Revisión' faults? Or Vehicles? The Label says 'Vehículos en Taller')
    // We will calculate exact vehicle counts below.

    // 5. Fleet Stats Calculation
    // Fetch all vehicles
    const { data: vehicles } = await supabase.from("vehiculos").select("id")

    // Fetch all active faults with vehicle_id and status
    const { data: activeFaultsData } = await supabase
        .from("fallas")
        .select("vehiculo_id, estado")
        .neq("estado", "Resuelto")
        .neq("estado", "Descartado")
        .neq("estado", "Reparado")

    // Process Fleet Stats
    const totalVehicles = vehicles?.length || 0
    let maintenanceVehiclesCount = 0
    let criticalVehiclesCount = 0

    // Set of vehicle IDs that are down
    const downVehicleIds = new Set<string>()

    if (activeFaultsData) {
        // Group by vehicle
        const vehicleStatusMap = new Map<string, Set<string>>()

        activeFaultsData.forEach(f => {
            if (!vehicleStatusMap.has(f.vehiculo_id)) {
                vehicleStatusMap.set(f.vehiculo_id, new Set())
            }
            vehicleStatusMap.get(f.vehiculo_id)?.add(f.estado)
        })

        vehicleStatusMap.forEach((statuses, vehicleId) => {
            downVehicleIds.add(vehicleId)
            // Priority: Maintenance > Critical
            if (statuses.has("En Revisión")) {
                maintenanceVehiclesCount++
            } else {
                criticalVehiclesCount++
            }
        })
    }

    const operationalVehiclesCount = Math.max(0, totalVehicles - downVehicleIds.size)

    // 6. Chart Data (Last 7 Days)
    const chartData = []
    for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i)
        const dateStr = format(date, "yyyy-MM-dd")
        const label = format(date, "EEE", { locale: es })

        const dStart = startOfDay(date).toISOString()
        const dEnd = endOfDay(date).toISOString()

        const { count: iCount } = await supabase.from("cierres").select("*", { count: 'exact', head: true }).gte("created_at", dStart).lte("created_at", dEnd)
        const { count: sCount } = await supabase.from("soportes").select("*", { count: 'exact', head: true }).gte("created_at", dStart).lte("created_at", dEnd)

        chartData.push({
            date: label,
            Instalaciones: iCount || 0,
            Soportes: sCount || 0
        })
    }

    return {
        installationsToday: installCount || 0,
        supportsToday: supportCount || 0,
        activeFaults: faultsCount || 0, // This is total active faults (for the KPI card)
        vehiclesInMaintenance: maintenanceVehiclesCount, // This is unique vehicles
        chartData,
        vehicleStats: {
            total: totalVehicles,
            operational: operationalVehiclesCount,
            critical: criticalVehiclesCount,
            maintenance: maintenanceVehiclesCount
        }
    }
}

// --- NEW FEATURES ---

export type FleetStatus = {
    id: string
    code: string
    plate: string
    model: string
    driver: string | null
    assigned_driver_id: string | null // NEW
    status: 'AVAILABLE' | 'IN_ROUTE' | 'MAINTENANCE' | 'CRITICAL'
    imageUrl?: string
    lastExit?: string
    activeReport?: any // [NEW] Full report details
    activeFaults: number
    faultsSummary: {
        critical: number
        high: number
        medium: number
        low: number
    }
    // Detailed fields for Dialog
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

    // 1. Fetch Vehicles
    const { data: vehicles } = await supabase
        .from("vehiculos")
        .select(`
            *,
            assigned_driver:profiles(first_name, last_name)
        `)
        .order('codigo')

    if (!vehicles) return []

    // 2. Fetch Active Trips (Salida without Entrada)
    // We look for reports where fecha_entrada is null
    const { data: activeTrips } = await supabase
        .from("reportes")
        .select("*") // [UPDATED] Fetch all fields for details
        .is("km_entrada", null) // [FIXED] Changed from fecha_entrada to match Transport Page logic

    const tripsMap = new Map(activeTrips?.map(t => [t.vehiculo_id, t])) // [UPDATED] Map full object
    const tripsDateMap = new Map(activeTrips?.map(t => [t.vehiculo_id, t.fecha_salida]))

    console.log("DEBUG: Active Trips found:", activeTrips) // [DEBUG]

    // 3. Fetch Active Faults Count
    const { data: faults } = await supabase
        .from("fallas")
        .select("vehiculo_id, prioridad, estado") // [UPDATED] Added estado
        .neq("estado", "Resuelto")
        .neq("estado", "Reparado") // Exclude Repaired
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

    // 4. Fetch Latest Mileage [NEW]
    const { data: mileageData } = await supabase
        .from("vista_ultimos_kilometrajes")
        .select("vehiculo_id, ultimo_kilometraje")

    const mileageMap = new Map(mileageData?.map(m => [m.vehiculo_id, m.ultimo_kilometraje]))

    return vehicles.map(v => {
        const activeTrip = tripsMap.get(v.id) // [NEW]
        const inRoute = !!activeTrip

        const summary = faultsSummaryMap.get(v.id) || { critical: 0, high: 0, medium: 0, low: 0, isMaintenance: false }
        const activeFaults = summary.critical + summary.high + summary.medium + summary.low

        let status: FleetStatus['status'] = 'AVAILABLE'

        // Revised Logic:
        if (inRoute) status = 'IN_ROUTE'
        else if (summary.isMaintenance) status = 'MAINTENANCE' // [FIXED] Prioritize Maintenance over Critical if not in route
        else if (activeFaults > 0 || v.falla_activa) status = 'CRITICAL'

        return {
            id: v.id,
            code: v.codigo,
            plate: v.placa,
            model: v.modelo,
            driver: v.assigned_driver ? `${v.assigned_driver.first_name} ${v.assigned_driver.last_name}` : null,
            assigned_driver_id: v.assigned_driver_id,
            status,
            imageUrl: v.foto_url,
            lastExit: tripsDateMap.get(v.id),
            activeReport: activeTrip, // [NEW]
            activeFaults,
            faultsSummary: summary,
            // Details
            tipo: v.tipo,
            año: v.año,
            color: v.color,
            capacidad_tanque: v.capacidad_tanque,
            kilometraje: Math.max(mileageMap.get(v.id) || 0, v.kilometraje || 0), // [FIX] Use Max of View or Table to ensure latest update from Fuel Log is seen
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

export type AdvancedStats = {
    fuelEfficiency: { vehicle: string, kmPerLiter: number }[]
    materialWaste: { item: string, avgPerInstall: number }[] // placeholder
    productivity: { team: string, installs: number }[]
}

export async function getAdvancedStats(): Promise<AdvancedStats> {
    const supabase = await createClient()

    // 1. Fuel Efficiency (Simple avg for demo)
    const { data: logs } = await supabase
        .from("fuel_logs")
        .select("liters, mileage, vehicle:vehiculos(placa)")
        .limit(50)

    // Group by vehicle -> Calculate Delta KM / Liters
    // Complex calculation req previous mileage. 
    // Simply returning mock-ish or raw data for chart.
    // Let's return raw "Liters filled" for now as proxy.

    // 2. Productivity (Installations count by Technician)
    // We need to join users.
    const { data: closures } = await supabase
        .from("cierres")
        .select("tecnico_id") // ID only

    // Count
    const techMap = new Map()
    closures?.forEach(c => {
        // This is ID. We need names.
        techMap.set(c.tecnico_id, (techMap.get(c.tecnico_id) || 0) + 1)
    })

    // Fetch names
    const productivity: { team: string, installs: number }[] = []
    if (techMap.size > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", Array.from(techMap.keys()))
        profiles?.forEach(p => {
            productivity.push({
                team: `${p.first_name}`,
                installs: techMap.get(p.id) || 0
            })
        })
    }

    return {
        fuelEfficiency: [], // TODO: refine
        materialWaste: [
            { item: "Conectores", avgPerInstall: 2.2 },
            { item: "Tensores", avgPerInstall: 2.0 },
            { item: "Patchcords", avgPerInstall: 1.05 }
        ],
        productivity: productivity.sort((a, b) => b.installs - a.installs).slice(0, 5)
    }
}
