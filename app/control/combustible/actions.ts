"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import { getMileageSource, correctMileage } from "@/app/admin/vehiculos/actions"

export interface FuelLogData {
    ticket_number: string
    fuel_date: Date
    vehicle_id: string
    driver_name: string
    liters: number
    mileage: number
    ticket_url?: string
    notes?: string
    forceCorrection?: boolean 
    is_skipped?: boolean // [NEW] Flag if user is skipping a number
}

function cleanTicketNumber(ticket: string): string {
    // Remove non-digits and parse as integer to handle leading zeros safely
    const digits = ticket.replace(/\D/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toString();
}

export async function getVehicles() {
    const supabase = await createClient()
    const { data: vehicles } = await supabase
        .from("vehiculos")
        .select(`
            id, placa, modelo, codigo, 
            assigned_driver_id,
            driver:profiles!assigned_driver_id(first_name, last_name)
        `)
        .order("codigo", { ascending: true })

    if (!vehicles) return []

    // Fetch mileage for all vehicles
    const { data: mileageData } = await supabase
        .from("vista_ultimos_kilometrajes")
        .select("vehiculo_id, ultimo_kilometraje")

    // Merge
    return vehicles.map(v => ({
        ...v,
        kilometraje: mileageData?.find(m => m.vehiculo_id === v.id)?.ultimo_kilometraje || 0
    }))
}

export async function createFuelLog(data: FuelLogData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "No autenticado" }
    }

    const cleanTicket = cleanTicketNumber(data.ticket_number);
    if (!cleanTicket) return { success: false, error: "Número de ticket inválido" };

    try {
        // [NEW] Validate Sequence (Per vehicle, by numerically highest ticket)
        const { data: allLogs } = await supabase
            .from("fuel_logs")
            .select("ticket_number")
            .eq("vehicle_id", data.vehicle_id)
            .eq("status", "active");

        if (allLogs && allLogs.length > 0) {
            let maxNum = -1;
            for (const log of allLogs) {
                const num = parseInt(log.ticket_number.replace(/\D/g, ''), 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }

            if (maxNum !== -1) {
                const lastNum = maxNum;
            const currentNum = parseInt(cleanTicket);

            if (currentNum <= lastNum) {
                return { success: false, error: `El número de ticket (${currentNum}) ya existe o es menor al último registrado (${lastNum}) para este vehículo.` };
            }

            if (currentNum > lastNum + 1 && !data.is_skipped) {
                return { 
                    success: false, 
                    error: `El número de ticket (${currentNum}) no es el siguiente en la secuencia (+1 de ${lastNum}).`,
                    requiresSequenceBypass: true,
                    lastTicket: lastNum
                };
            }
        }
        // [NEW] Validate Mileage
        const { data: vehicleMileage, error: mileageError } = await supabase
            .from("vista_ultimos_kilometrajes")
            .select("ultimo_kilometraje")
            .eq("vehiculo_id", data.vehicle_id)
            .single()

        // If no mileage record exists, we assume 0 or allow the entry (it might be the first one)
        const currentKm = vehicleMileage?.ultimo_kilometraje || 0


        if (data.mileage <= currentKm) {
            // [NEW] Check if correction is requested
            if (data.forceCorrection) {
                // 1. Find the BAD record preventing this
                // We assume 'data.mileage' IS the correct current value, so any record > data.mileage is wrong.
                // We need to find the specific record that is setting 'currentKm'.
                const source = await getMileageSource(data.vehicle_id, currentKm)

                if (source) {
                    // 2. Correct it to be consistent (e.g. slightly less than new mileage or equal)
                    // Strategy: Set the BAD record to be equal to Previous Valid Record? 
                    // Or just set it to current entered mileage - 1?
                    // To be safe, let's set it to the new mileage.

                    const { success, error } = await correctMileage(source, data.mileage)
                    if (!success) {
                        return { success: false, error: `Error al corregir registro previo: ${error}` }
                    }
                    // Continue to insert...
                } else {
                    return { success: false, error: "No se pudo encontrar el registro erróneo para corregirlo automáticamente." }
                }

            } else {
                // Standard Error
                return {
                    success: false,
                    error: `El kilometraje (${data.mileage}) es menor al actual del sistema (${currentKm}).`,
                    requiresCorrection: true, // Signal UI to show option
                    currentSystemKm: currentKm
                }
            }
        }

        const { error } = await supabase.from("fuel_logs").insert({
            ticket_number: cleanTicket,
            fuel_date: data.fuel_date || new Date().toISOString(), // Use provided date (UI ensures current time)
            vehicle_id: data.vehicle_id,
            driver_name: data.driver_name,
            liters: data.liters,
            mileage: data.mileage,
            supervisor_id: user.id,
            ticket_url: data.ticket_url,
            notes: data.notes,
            status: 'active'
        })

        if (error) throw error

        revalidatePath("/control/combustible")
        revalidatePath("/gerencia")
        revalidatePath("/transporte")

        // [NEW] Auto-reset vehicle fuel to 100% (Full) on refuel AND update Mileage (Write-Through)
        const { error: updateError } = await supabase.from("vehiculos").update({
            current_fuel_level: 100,
            kilometraje: data.mileage, // [CRITICAL] Sync Master Record
            last_fuel_update: new Date().toISOString()
        }).eq("id", data.vehicle_id)

        if (updateError) throw updateError

        return { success: true }
    } catch (error: any) {
        console.error("Create Fuel Log Error:", error)
        return { success: false, error: error.message }
    }
}

export async function getFuelLogs(filters?: { startDate?: string, endDate?: string, vehicleId?: string }) {
    const supabase = await createClient()

    let query = supabase
        .from("fuel_logs")
        .select(`
            *,
            vehicle:vehiculos(placa, modelo, codigo),
            supervisor:profiles(first_name, last_name)
        `) // Assuming explicit FK relation or simple join. We might need to check profile relation name.
        // If 'supervisor_id' references auth.users, we join on profiles via id usually.
        // Let's assume 'profiles' has a FK to users, or is the user table extension. 
        // If supervisor_id is auth.users.id, and profiles.id is auth.users.id:
        .order("fuel_date", { ascending: false })

    if (filters?.startDate) {
        // Use local start of day adjusted to UTC (assuming VET -04:00)
        const start = new Date(`${filters.startDate}T00:00:00-04:00`).toISOString()
        query = query.gte("fuel_date", start)
    }
    if (filters?.endDate) {
        // Use local end of day adjusted to UTC (assuming VET -04:00)
        const end = new Date(`${filters.endDate}T23:59:59-04:00`).toISOString()
        query = query.lte("fuel_date", end)
    }
    if (filters?.vehicleId && filters.vehicleId !== "all") {
        query = query.eq("vehicle_id", filters.vehicleId)
    }

    const { data, error } = await query

    if (error) {
        console.error("Get Fuel Logs Error:", error)
        return []
    }

    // Map supervisor name manually if join fails or is complex, but basic join should work if FK exists.
    // However, profiles usually reference auth.users. fuel_logs references auth.users.
    // So fuel_logs.supervisor_id -> profiles.id should work if IDs match.
    // To be safe, we can fetch profiles separately if needed, but let's try strict join first.
    // Actually, explicit foreign key 'fuel_logs_supervisor_id_fkey' points to auth.users.
    // Supabase Postgrest can switch to profiles if profiles.id is FK to auth.users.
    // But usually we need to select `supervisor:profiles(...)` and ensuring `fuel_logs.supervisor_id` matches `profiles.id`.

    return data
}

export async function getDailyReports() {
    const supabase = await createClient()
    
    // Simplificamos la consulta para evitar problemas de RLS con el join de perfiles inicialmente
    const { data, error } = await supabase
        .from("fuel_daily_reports")
        .select(`
            id,
            report_date,
            total_liters,
            details,
            supervisor_id,
            generated_at
        `)
        .order("report_date", { ascending: false })

    if (error) {
        console.error("DEBUG - Get Daily Reports Error:", error)
        return []
    }

    if (!data || data.length === 0) {
        console.log("DEBUG - No reports found in database")
        return []
    }

    // Intentamos cargar los nombres de los supervisores por separado para evitar fallos de join
    const supervisorIds = Array.from(new Set(data.map(r => r.supervisor_id)))
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", supervisorIds)

    const reportsWithSupervisor = data.map(report => ({
        ...report,
        supervisor: profiles?.find(p => p.id === report.supervisor_id) || { first_name: "Supervisor", last_name: "" }
    }))

    return reportsWithSupervisor
}

export async function getTodayStats(clientDate?: string) {
    const supabase = await createClient()
    
    // Use provided client date or fallback to today
    const dateString = clientDate || format(new Date(), "yyyy-MM-dd")
    
    // Adjust range to GMT-4 (Venezuela)
    const startDate = new Date(`${dateString}T00:00:00-04:00`).toISOString()
    const endDate = new Date(`${dateString}T23:59:59-04:00`).toISOString()

    const { data, error } = await supabase
        .from("fuel_logs")
        .select("liters")
        .eq("status", "active")
        .gte("fuel_date", startDate)
        .lte("fuel_date", endDate)

    if (error) {
        console.error("Error fetching stats:", error)
        return { totalLiters: 0, count: 0 }
    }

    const totalLiters = data.reduce((sum, log) => sum + (Number(log.liters) || 0), 0)

    return {
        totalLiters,
        count: data.length
    }
}

export async function getVehicleDetailsAction(vehicleId: string) {
    const supabase = await createClient()

    // 1. Get Vehicle & Driver Info
    const { data: vehicle, error: vError } = await supabase
        .from("vehiculos")
        .select(`
            *,
            driver:profiles!assigned_driver_id(first_name, last_name)
        `) // Assuming relation name or using strict join on assigned_driver_id
        .eq("id", vehicleId)
        .single()

    if (vError || !vehicle) {
        console.error("Error fetching vehicle details:", vError)
        return null
    }

    // 2. Get Last Fuel Log (based on highest ticket number)
    const { data: logs } = await supabase
        .from("fuel_logs")
        .select("ticket_number, fuel_date, liters, mileage")
        .eq("vehicle_id", vehicleId)
        .eq("status", "active");

    let lastFuel = null;
    if (logs && logs.length > 0) {
        let maxNum = -1;
        for (const log of logs) {
            const num = parseInt(log.ticket_number.replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
                lastFuel = log;
            }
        }
    }

    return {
        ...vehicle,
        last_fuel: lastFuel || null
    }
}

export async function getActiveDriverAction(vehicleId: string) {
    const supabase = await createClient()
    
    // Find active trip (fecha_entrada is null)
    const { data: trip, error } = await supabase
        .from('reportes')
        .select('conductor')
        .eq('vehiculo_id', vehicleId)
        .is('fecha_entrada', null)
        .order('fecha_salida', { ascending: false })
        .limit(1)
        .single()

    if (error || !trip) return null
    return trip.conductor
}

export async function annulFuelLog(logId: string, reason: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "No autorizado" }

    const { error } = await supabase
        .from("fuel_logs")
        .update({ 
            status: 'annulled', 
            void_reason: reason,
            voided_at: new Date().toISOString(),
            voided_by: user.id
        })
        .eq("id", logId)

    if (error) return { success: false, error: error.message }

    revalidatePath("/control/combustible")
    return { success: true }
}

export async function generateDailyReport(dateString: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Usuario no autenticado" }

    // 1. Fetch Logs for DATE (Adjusted to GMT-4)
    const startDate = new Date(`${dateString}T00:00:00-04:00`).toISOString()
    const endDate = new Date(`${dateString}T23:59:59-04:00`).toISOString()

    const { data: logs, error: lError } = await supabase
        .from("fuel_logs")
        .select(`
            liters,
            mileage,
            vehicle:vehiculos(modelo, placa)
        `)
        .eq("status", "active")
        .gte("fuel_date", startDate)
        .lte("fuel_date", endDate)

    if (lError) return { success: false, error: lError.message }
    if (!logs || logs.length === 0) return { success: false, error: "No hay cargas registradas en esta fecha." }

    // 2. Aggregate Data
    // We aggregate by Vehicle ID (Model + Placa)
    const vehicleMap = new Map<string, { model: string, liters: number, count: number, startKm: number, endKm: number }>()

    logs.forEach((log: any) => {
        const key = `${log.vehicle?.modelo} (${log.vehicle?.placa})`
        const current = vehicleMap.get(key) || { 
            model: key, 
            liters: 0, 
            count: 0, 
            startKm: log.mileage, 
            endKm: log.mileage 
        }
        
        current.liters += (Number(log.liters) || 0)
        current.count += 1
        current.startKm = Math.min(current.startKm, log.mileage)
        current.endKm = Math.max(current.endKm, log.mileage)
        
        vehicleMap.set(key, current)
    })

    const details = Array.from(vehicleMap.values())
    const totalLiters = logs.reduce((sum, l) => sum + (Number(l.liters) || 0), 0)

    // 3. Save Report (UPSERT logic manually or via filter)
    // Check if report for this date exists
    const { data: existingReport } = await supabase
        .from("fuel_daily_reports")
        .select("id")
        .eq("report_date", dateString)
        .maybeSingle()

    let saveError;
    if (existingReport) {
        // Update existing
        const { error } = await supabase
            .from("fuel_daily_reports")
            .update({
                supervisor_id: user.id,
                total_liters: totalLiters,
                details: details,
                generated_at: new Date().toISOString()
            })
            .eq("id", existingReport.id)
        saveError = error
    } else {
        // Insert new
        const { error } = await supabase.from("fuel_daily_reports").insert({
            report_date: dateString,
            supervisor_id: user.id,
            total_liters: totalLiters,
            details: details
        })
        saveError = error
    }

    if (saveError) return { success: false, error: "Error guardando reporte: " + saveError.message }

    // Fetch supervisor profile name
    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single()

    const supervisorName = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : "Supervisor"

    return { success: true, totalLiters, count: logs.length, details: details, supervisorName }
}
