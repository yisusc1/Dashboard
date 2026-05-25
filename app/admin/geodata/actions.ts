"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addGeodata(data: { estado: string, municipio: string, parroquia: string, sector: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from('zonas_operativas').insert(data);
  
  if (error) throw new Error(error.message);
  revalidatePath('/admin/geodata');
}

export async function deleteGeodata(level: number, selection: any, valueToDelete: string) {
  const supabase = await createClient();
  let query = supabase.from('zonas_operativas').delete();
  
  if (level === 0) {
    query = query.eq('estado', valueToDelete);
  } else if (level === 1) {
    query = query.eq('estado', selection.estado).eq('municipio', valueToDelete);
  } else if (level === 2) {
    query = query.eq('estado', selection.estado).eq('municipio', selection.municipio).eq('parroquia', valueToDelete);
  } else if (level === 3) {
    query = query.eq('estado', selection.estado).eq('municipio', selection.municipio).eq('parroquia', selection.parroquia).eq('sector', valueToDelete);
  }
  
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath('/admin/geodata');
}
