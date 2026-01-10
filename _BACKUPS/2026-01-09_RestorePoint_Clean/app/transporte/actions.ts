'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// --- FASE 1: SALIDA ---
export async function crearSalida(formData: FormData) {
    const supabase = await createClient();

    const rawData = {
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

    revalidatePath('/transporte');
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

    revalidatePath('/transporte');
    return { success: true, data };
}
