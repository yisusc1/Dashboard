'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// --- FASE 1: SALIDA ---
// Helper to parse fuel text to percentage
function parseFuelLevel(fuelString: string): number {
    if (!fuelString) return 0;
    const s = fuelString.toString().toLowerCase().trim();
    if (s === 'full') return 100;
    if (s === '3/4') return 75;
    if (s === '1/2') return 50;
    if (s === '1/4') return 25;
    if (s === 'reserva') return 10;

    // Fallback for direct "50%" or number strings
    return parseInt(s.replace('%', '')) || 0;
}

// --- FASE 1: SALIDA ---
export async function crearSalida(formData: FormData) {
    const supabase = await createClient();

    // [NEW] Get Current User to track owner
    const { data: { user } } = await supabase.auth.getUser();

    const rawData = {
        // [NEW] Save User ID
        user_id: user?.id,

        vehiculo_id: formData.get('vehiculo_id'),
        conductor: formData.get('conductor'),
        departamento: formData.get('departamento'),
        fecha_salida: new Date().toISOString(),

        // Datos Operativos
        km_salida: Number(formData.get('km_salida')),
        gasolina_salida: formData.get('gasolina_salida'),
        observaciones_salida: formData.get('observaciones_salida'),

        // Chequeo Técnico
        aceite_salida: formData.get('aceite_salida') === 'on',
        agua_salida: formData.get('agua_salida') === 'on',

        // Seguridad (Carros)
        carpeta_salida: formData.get('carpeta_salida') === 'on',
        gato_salida: formData.get('gato_salida') === 'on',
        cruz_salida: formData.get('cruz_salida') === 'on',
        triangulo_salida: formData.get('triangulo_salida') === 'on',
        caucho_salida: formData.get('caucho_salida') === 'on',

        // Dispositivos (Instalación)
        onu_salida: formData.get('onu_salida') === 'on' ? 1 : 0,
        ups_salida: formData.get('ups_salida') === 'on' ? 1 : 0,
        escalera_salida: formData.get('escalera_salida') === 'on',
    };

    const { data, error } = await supabase.from('reportes').insert(rawData).select().single();
    if (error) {
        return { success: false, error: error.message };
    }

    // [NEW] Update Vehicle Fuel Level with Text Parsing
    const fuelString = rawData.gasolina_salida?.toString() || '';
    const fuelLevel = parseFuelLevel(fuelString);

    const { error: updateError } = await supabase.from('vehiculos').update({
        current_fuel_level: fuelLevel,
        last_fuel_update: new Date().toISOString()
    }).eq('id', rawData.vehiculo_id);

    revalidatePath('/transporte');
    revalidatePath('/gerencia'); // [NEW] Revalidate Administration Panel
    return { success: true, data };
}

// --- FASE 2: ENTRADA ---
export async function registrarEntrada(formData: FormData) {
    const supabase = await createClient();
    const reporte_id = formData.get('reporte_id') as string;

    const updateData = {
        fecha_entrada: new Date().toISOString(),

        // Datos Operativos
        km_entrada: Number(formData.get('km_entrada')),
        gasolina_entrada: formData.get('gasolina_entrada'),
        observaciones_entrada: formData.get('observaciones_entrada'),

        // Chequeo Técnico (Re-chequeo)
        aceite_entrada: formData.get('aceite_entrada') === 'on',
        agua_entrada: formData.get('agua_entrada') === 'on',

        // Seguridad (Re-chequeo)
        carpeta_entrada: formData.get('carpeta_entrada') === 'on',
        gato_entrada: formData.get('gato_entrada') === 'on',
        cruz_entrada: formData.get('cruz_entrada') === 'on',
        triangulo_entrada: formData.get('triangulo_entrada') === 'on',
        caucho_entrada: formData.get('caucho_entrada') === 'on',

        // Dispositivos (Re-chequeo)
        onu_entrada: formData.get('onu_entrada') === 'on' ? 1 : 0,
        ups_entrada: formData.get('ups_entrada') === 'on' ? 1 : 0,
        // La escalera la chequeamos también al entrar por seguridad
        escalera_entrada: formData.get('escalera_entrada') === 'on',
    };

    const { data, error } = await supabase.from('reportes').update(updateData).eq('id', reporte_id).select().single();
    if (error) {
        return { success: false, error: error.message };
    }

    // [NEW] Update Vehicle Fuel Level with Text Parsing
    if (updateData.gasolina_entrada) {
        const fuelLevel = parseFuelLevel(updateData.gasolina_entrada.toString());
        // Fetch vehicle_id from the report data (we selected it above)
        if (data && data.vehiculo_id) {
            await supabase.from('vehiculos').update({
                current_fuel_level: fuelLevel,
                last_fuel_update: new Date().toISOString()
            }).eq('id', data.vehiculo_id);
        }
    }

    // [NEW] Auto-Generate Fault: Filter Trivial Observations
    const obsEntrada = updateData.observaciones_entrada?.toString() || '';
    const trivialKeywords = ['ninguna', 'ninguno', 'todo bien', 'ok', 'sin novedad', 'nada', 'n/a', 'bien', 'fino', 'sin observaciones'];

    const isTrivial = trivialKeywords.some(keyword =>
        obsEntrada.toLowerCase().trim() === keyword ||
        obsEntrada.toLowerCase().trim() === keyword + '.' // Handle simple punctuation
    );

    if (obsEntrada.trim().length > 3 && !isTrivial) {
        // Create Fault
        await supabase.from('fallas').insert({
            vehiculo_id: data.vehiculo_id, // Get from updated report data
            descripcion: `[Reporte Entrada] ${obsEntrada}`,
            tipo_falla: 'Mecánica', // Default
            prioridad: 'Media',
            estado: 'Pendiente',
            created_at: new Date().toISOString()
        });
    }

    revalidatePath('/transporte');
    revalidatePath('/taller'); // Update Taller
    revalidatePath('/gerencia'); // [NEW] Revalidate Administration Panel
    return { success: true, data };
}

export async function revalidateGerencia() {
    revalidatePath('/gerencia');
}

// [NEW] Helper Action for Client Components
export async function updateVehicleFuel(vehicleId: string, fuelText: string) {
    const supabase = await createClient();
    const fuelLevel = parseFuelLevel(fuelText);

    const { error } = await supabase.from('vehiculos').update({
        current_fuel_level: fuelLevel,
        last_fuel_update: new Date().toISOString()
    }).eq('id', vehicleId);

    if (error) {
        console.error("Error updating fuel:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/transporte');
    revalidatePath('/gerencia');
    return { success: true };
}

// [NEW] Assign Vehicle to Driver (Securely via RPC)
export async function assignVehicleToDriver(vehicleId: string) {
    const supabase = await createClient();

    // Call the RPC function logic
    const { error } = await supabase.rpc('assign_vehicle_to_me', {
        target_vehicle_id: vehicleId
    });

    if (error) {
        console.error("Error signing vehicle (RPC):", error);
        return { success: false, error: error.message };
    }

    // [DEBUG] Verify the change stuck
    const { data: verifyData } = await supabase
        .from('vehiculos')
        .select('assigned_driver_id')
        .eq('id', vehicleId)
        .single();

    // Check if the user ID matches (Supabase user ID from auth.getUser())
    const { data: { user } } = await supabase.auth.getUser();

    if (verifyData?.assigned_driver_id !== user?.id) {
        console.error("Verification Failed: DB did not update.", verifyData);
        return { success: false, error: "La base de datos no confirmó el cambio. (RLS Error?)" };
    }

    revalidatePath('/transporte');
    return { success: true };
}
// [NEW] Unified Exit Report Action (Replaces Client-Side Logic)
export async function submitExitReport(reportData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Prepare Base Report Data
    const rawData = {
        user_id: user?.id,
        vehiculo_id: reportData.vehiculo_id,
        conductor: reportData.conductor,
        departamento: reportData.departamento,
        fecha_salida: new Date().toISOString(),

        km_salida: reportData.km_salida,
        gasolina_salida: reportData.gasolina_salida,
        observaciones_salida: reportData.observaciones_salida,

        // Chequeo Técnico
        aceite_salida: reportData.aceite_salida,
        agua_salida: reportData.agua_salida,

        // Seguridad (Carros)
        carpeta_salida: reportData.carpeta_salida,
        gato_salida: reportData.gato_salida,
        cruz_salida: reportData.cruz_salida,
        triangulo_salida: reportData.triangulo_salida,
        caucho_salida: reportData.caucho_salida,

        // Dispositivos (Instalación)
        onu_salida: reportData.onu_salida,
        ups_salida: reportData.ups_salida,
        escalera_salida: reportData.escalera_salida,

        // Moto
        casco_salida: reportData.casco_salida,
        luces_salida: reportData.luces_salida,
        herramientas_salida: reportData.herramientas_salida,
    };

    // 2. Insert Report
    const { data, error } = await supabase.from('reportes').insert(rawData).select().single();
    if (error) {
        return { success: false, error: error.message };
    }

    // 3. Update Vehicle Fuel
    const fuelLevel = parseFuelLevel(rawData.gasolina_salida);
    await supabase.from('vehiculos').update({
        current_fuel_level: fuelLevel,
        last_fuel_update: new Date().toISOString()
    }).eq('id', rawData.vehiculo_id);


    // 4. [NEW] Auto-Generate Fault if there are issues
    // Logic: If any check is FALSE (meaning BAD/MISSING) or if there are observations
    // Note: In the UI, the switches are "Is Good/Present?". So false = bad.
    // However, the UI labels say "Nivel de Aceite", "Gato Hidráulico".
    // Usually, Toggle ON = Good. Toggle OFF = Bad/Missing.
    // Let's assume the user toggles ON if everything is fine.
    // Wait, let's verify `SalidaFormDialog`.
    // <Switch id="aceite" checked={checks.aceite} ... />
    // Defaults are all false.
    // So if I check it, it means "Presente/Bueno".
    // So if any check is FALSE, it is potentially missing?
    // Actually, usually users strictly check what verifies.
    // If I leave "Gato" unchecked, does it mean it's missing? Yes.
    // But maybe for a quick simplified logic, we only look at "Observaciones".
    // Or we look at specific critical failures.
    // Let's stick to: "If there is explicit text content in observations, trigger a review".
    // Generating faults for unchecked items might flood the system if they just forgot to check.
    // BETTER STRATEGY: Only Observation text triggers a fault for now, or maybe specific "Bad" states if we had "Bad" buttons.
    // Given the switches are likely "Confirmed Present", lack of check is ambiguous.
    // Let's rely on `observaciones_salida`.

    // [NEW] Process explicit faults
    if (reportData.faults && Array.isArray(reportData.faults) && reportData.faults.length > 0) {
        const faultsToInsert = reportData.faults.map((desc: string) => ({
            vehiculo_id: rawData.vehiculo_id,
            descripcion: `[Reporte Salida] ${desc}`,
            tipo_falla: 'Mecánica', // Default
            prioridad: 'Media',
            estado: 'Pendiente',
            created_at: new Date().toISOString()
        }))

        await supabase.from('fallas').insert(faultsToInsert)
    }

    // [MOD] Disabling auto-generation from observations as per new explicit flow
    /* 
    const obsSalida = rawData.observaciones_salida?.toString() || '';
    ... (Logic removed to favor explicit button)
    */

    revalidatePath('/transporte');
    revalidatePath('/taller'); // Update Taller
    revalidatePath('/gerencia');
    return { success: true, data };
}

// [NEW] Fetch Active Faults for a Vehicle
export async function getActiveFaults(vehicleId: string) {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('fallas')
            .select('descripcion, created_at, estado')
            .eq('vehiculo_id', vehicleId)
            .in('estado', ['Pendiente', 'En Revisión'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching active faults:", error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error("Exception fetching active faults:", err);
        return [];
    }
}
// [NEW] Unified Entry Report Action (Replaces Client-Side Logic & registrarEntrada)
export async function submitEntryReport(reportData: any) {
    const supabase = await createClient();

    // 1. Prepare Update Data
    const updateData: any = {
        fecha_entrada: new Date().toISOString(),

        // Datos Operativos
        km_entrada: reportData.km_entrada,
        gasolina_entrada: reportData.gasolina_entrada,
        // observaciones_entrada: reportData.observaciones_entrada, // Removed/Optional

        // Chequeo Técnico (Re-chequeo)
        aceite_entrada: reportData.aceite_entrada,
        agua_entrada: reportData.agua_entrada,

        // Seguridad (Carros)
        carpeta_entrada: reportData.carpeta_entrada,
        gato_entrada: reportData.gato_entrada,
        cruz_entrada: reportData.cruz_entrada,
        triangulo_entrada: reportData.triangulo_entrada,
        caucho_entrada: reportData.caucho_entrada,

        // Moto
        casco_entrada: reportData.casco_entrada,
        luces_entrada: reportData.luces_entrada,
        herramientas_entrada: reportData.herramientas_entrada,

        // Dispositivos (Instalación)
        onu_entrada: reportData.onu_entrada ? 1 : 0,
        ups_entrada: reportData.ups_entrada ? 1 : 0,
        escalera_entrada: reportData.escalera_entrada,
    };

    // 2. Update Report
    const { data, error } = await supabase.from('reportes')
        .update(updateData)
        .eq('id', reportData.reporte_id)
        .select()
        .single();

    if (error) {
        return { success: false, error: 'Database Error (Report): ' + error.message };
    }

    // 3. Update Vehicle Fuel & Mileage (Server-Side)
    if (data.vehiculo_id) {
        const fuelLevel = parseFuelLevel(reportData.gasolina_entrada?.toString() || "");

        await supabase.from('vehiculos').update({
            current_fuel_level: fuelLevel,
            kilometraje: reportData.km_entrada,
            last_fuel_update: new Date().toISOString()
        }).eq('id', data.vehiculo_id);
    }

    // 4. Register Explicit Faults
    if (reportData.faults && Array.isArray(reportData.faults) && reportData.faults.length > 0) {
        const faultsToInsert = reportData.faults.map((desc: string) => ({
            vehiculo_id: data.vehiculo_id,
            descripcion: `[Reporte Entrada] ${desc}`,
            tipo_falla: 'Mecánica',
            prioridad: 'Media',
            estado: 'Pendiente',
            created_at: new Date().toISOString()
        }))

        // Allow partial failure for faults, but preferably not.
        const { error: faultError } = await supabase.from('fallas').insert(faultsToInsert)
        if (faultError) console.error("Error saving faults:", faultError)
    }

    // 5. Revalidate
    revalidatePath('/transporte');
    revalidatePath('/taller');
    revalidatePath('/gerencia');

    return { success: true, data };
}
