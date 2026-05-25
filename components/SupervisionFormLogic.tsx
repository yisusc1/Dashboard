"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner"; 

export type ActivityKey = 'instalacion' | 'soporte' | 'materiales' | 'combustible' | 'sst' | 'factibilidad';

interface SupervisionFormProps {
  usuarioActual: {
    id: string;
    nombre: string;
  };
}

const ACTIVITIES = [
  { id: 'instalacion', title: 'Inspección de Instalación / Alta Nueva', desc: 'Metraje, atenuación y ONT instalada' },
  { id: 'soporte', title: 'Apoyo en Soporte Técnico', desc: 'Tickets RUPBI, diagnóstico y acciones' },
  { id: 'materiales', title: 'Control de Materiales (Retorno)', desc: 'Metraje consumido y carretes devueltos' },
  { id: 'combustible', title: 'Combustible y Flota', desc: 'Kilometraje, litros y estado vehicular' },
  { id: 'sst', title: 'Auditoría SST (Seguridad)', desc: 'EPP, arnés, conos y señalización' },
  { id: 'factibilidad', title: 'Factibilidad (Nuevas Rutas)', desc: 'Coordenadas, distancia y potencial' }
];

const CIUDADES_ESTRICTAS = ["Guaicaipuro", "Los Salias", "Santos Michelena"];

// --- ESTILOS COMPARTIDOS ---
const inputClass = "w-full h-12 px-4 rounded-2xl bg-white/50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-gray-900 placeholder:text-gray-400 disabled:opacity-50";
const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1 mb-1 block";
const sectionClass = "backdrop-blur-xl bg-white/70 border border-white/40 rounded-[2.5rem] p-6 shadow-xl shadow-black/5 ring-1 ring-white/60 mb-6";

export default function SupervisionFormLogic({ usuarioActual }: SupervisionFormProps) {
  const [zonas, setZonas] = useState<any[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<ActivityKey[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const supabase = createClient();

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      actividades: [] as string[],
    } as Record<string, any>
  });

  useEffect(() => {
    const initData = async () => {
      const { data: zonasData } = await supabase.from('zonas_operativas').select('*').order('estado');
      if (zonasData) setZonas(zonasData);
      
      const today = new Date().toISOString().split('T')[0];
      const { data: draft } = await supabase
        .from('daily_activities_reports')
        .select('*')
        .eq('supervisor_id', usuarioActual.id)
        .eq('date', today)
        .single();
        
      if (draft) {
        setSelectedActivities(draft.selected_activities as ActivityKey[]);
        if (draft.report_data) {
          Object.keys(draft.report_data).forEach(key => {
            setValue(key, draft.report_data[key]);
          });
        }
      }
      setLoadingInitial(false);
    };
    initData();
  }, [usuarioActual.id, supabase, setValue]);

  const toggleActivity = (id: ActivityKey) => {
    setSelectedActivities(prev => {
      const newActivities = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      setValue('actividades', newActivities);
      autoSave(newActivities, watch());
      return newActivities;
    });
  };

  const autoSave = async (activities: string[], formData: any) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existing } = await supabase
        .from('daily_activities_reports')
        .select('id')
        .eq('supervisor_id', usuarioActual.id)
        .eq('date', today)
        .single();

      if (existing) {
        await supabase.from('daily_activities_reports').update({
          selected_activities: activities,
          report_data: formData
        }).eq('id', existing.id);
      } else {
        await supabase.from('daily_activities_reports').insert({
          supervisor_id: usuarioActual.id,
          date: today,
          status: 'DRAFT',
          selected_activities: activities,
          report_data: formData
        });
      }
    } catch (error) {
      console.error("Autosave error", error);
    }
  };

  const onSubmit = async (data: any) => {
    if (selectedActivities.length === 0) {
      toast.error("Debes seleccionar al menos una actividad.");
      return;
    }
    
    setIsSubmitting(true);
    toast.loading("Finalizando reporte...", { id: 'submit' });
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('daily_activities_reports')
        .select('id')
        .eq('supervisor_id', usuarioActual.id)
        .eq('date', today)
        .single();

      if (existing) {
        await supabase.from('daily_activities_reports').update({
          status: 'COMPLETED',
          report_data: data
        }).eq('id', existing.id);
      }
      toast.success("¡Reporte enviado exitosamente!", { id: 'submit' });
    } catch (error) {
      toast.error("Hubo un error al enviar el reporte", { id: 'submit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-12">
      
      <div className="mb-8 text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Reporte de Operaciones</h2>
        <p className="text-gray-500">Supervisor: <span className="font-semibold text-gray-800">{usuarioActual.nombre}</span></p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* SELECTOR DE ACTIVIDADES */}
        <div className={sectionClass}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">1. ¿Qué actividades realizaste hoy?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACTIVITIES.map((act) => {
              const isSelected = selectedActivities.includes(act.id as ActivityKey);
              return (
                <div 
                  key={act.id} 
                  onClick={() => toggleActivity(act.id as ActivityKey)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/50 border-gray-200 hover:border-blue-300 hover:bg-white text-gray-800'}`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-sm leading-tight">{act.title}</h4>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-white shrink-0" />}
                  </div>
                  <p className={`text-xs mt-2 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{act.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 1: INSTALACIÓN */}
        {selectedActivities.includes('instalacion') && (
          <div className={sectionClass}>
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">Inspección de Instalación / Alta Nueva</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Ciudad Operativa (Dirección Exacta)</label>
                <select {...register("inst_ciudad")} className={inputClass}>
                  <option value="">Seleccione...</option>
                  {zonas.map(z => <option key={z.id} value={`${z.estado} - ${z.municipio} - ${z.sector}`}>{z.municipio} - {z.sector}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Cédula / ID del Cliente</label>
                <input type="text" {...register("inst_cedula")} className={inputClass} placeholder="V-12345678" />
              </div>
              <div>
                <label className={labelClass}>Nombres de Cuadrilla</label>
                <input type="text" {...register("inst_tecnicos")} className={inputClass} placeholder="Técnicos involucrados" />
              </div>
              <div>
                <label className={labelClass}>Metraje Consumo Reportado</label>
                <input type="number" {...register("inst_metrajeReportado")} className={inputClass} placeholder="Metros" />
              </div>
              <div>
                <label className={labelClass}>Metraje Consumo Real (Físico)</label>
                <input type="number" {...register("inst_metrajeReal")} className={inputClass} placeholder="Metros" />
              </div>
              <div>
                <label className={labelClass}>Atenuación Final (dBm)</label>
                <input type="number" step="0.01" {...register("inst_atenuacion")} className={inputClass} placeholder="-22.5" />
              </div>
              <div>
                <label className={labelClass}>Serial / MAC Equipo ONT</label>
                <input type="text" {...register("inst_serial")} className={inputClass} placeholder="SN: 485754..." />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Observaciones del Aval / Prueba</label>
                <input type="text" {...register("inst_observaciones_aval")} className={inputClass} placeholder="Ej: Se validó potenciómetro y fachada correctamente" />
              </div>
            </div>
          </div>
        )}

        {/* 2: SOPORTE */}
        {selectedActivities.includes('soporte') && (
          <div className={sectionClass}>
            <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">Inspección en Soporte Técnico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ciudad Operativa</label>
                <select {...register("sop_ciudad")} className={inputClass}>
                  <option value="">Seleccione...</option>
                  {CIUDADES_ESTRICTAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>N° Ticket / Cédula Cliente</label>
                <input type="text" {...register("sop_ticket")} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Nombres de Técnicos de Soporte</label>
                <input type="text" {...register("sop_tecnicos")} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Diagnóstico Encontrado</label>
                <input type="text" {...register("sop_diagnostico")} className={inputClass} placeholder="Ej. Corte de drop..." />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Acción Correctiva Realizada</label>
                <input type="text" {...register("sop_accion")} className={inputClass} placeholder="Ej. Re-empalme..." />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Observaciones del Aval / Prueba</label>
                <input type="text" {...register("sop_observaciones_aval")} className={inputClass} placeholder="Ej: Se comprobó parámetros normalizados de ONT" />
              </div>
            </div>
          </div>
        )}

        {/* 3: MATERIALES */}
        {selectedActivities.includes('materiales') && (
          <div className={sectionClass}>
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">Control de Materiales (Retorno)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombres de Técnicos</label>
                <input type="text" {...register("mat_tecnicos")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>ID / Código del Carrete</label>
                <input type="text" {...register("mat_carrete")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Metraje de Despacho (AM)</label>
                <input type="number" {...register("mat_despacho")} className={inputClass} placeholder="Metros iniciales" />
              </div>
              <div>
                <label className={labelClass}>Metraje de Retorno (PM)</label>
                <input type="number" {...register("mat_retorno")} className={inputClass} placeholder="Metros devueltos" />
              </div>
            </div>
            
            {(watch("mat_despacho") && watch("mat_retorno")) && (
               <div className="mt-4 p-4 bg-purple-50 rounded-xl text-sm font-semibold text-purple-800">
                 Diferencia / Consumo Neto: {(watch("mat_despacho") || 0) - (watch("mat_retorno") || 0)} Metros
               </div>
            )}
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Firma de Conformidad del Técnico</label>
                <input type="text" {...register("mat_firma")} className={inputClass} placeholder="Nombre y Cédula del Técnico" />
              </div>
              <div>
                <label className={labelClass}>Observaciones del Aval / Prueba</label>
                <input type="text" {...register("mat_observaciones_aval")} className={inputClass} placeholder="Ej: Se validó metraje impreso en chaqueta" />
              </div>
            </div>
          </div>
        )}

        {/* 4: COMBUSTIBLE */}
        {selectedActivities.includes('combustible') && (
          <div className={sectionClass}>
            <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">Control de Combustible y Flota</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Placa / Unidad</label>
                <input type="text" {...register("com_placa")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Conductor</label>
                <input type="text" {...register("com_conductor")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Kilometraje de Salida</label>
                <input type="number" {...register("com_kmSalida")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Kilometraje de Llegada</label>
                <input type="number" {...register("com_kmLlegada")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Litros Surtidos / N° Ticket</label>
                <input type="text" {...register("com_litros")} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Novedades del Vehículo</label>
                <input type="text" {...register("com_novedades")} className={inputClass} placeholder="Luces, cauchos, fluidos..." />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Observaciones del Aval / Prueba</label>
                <input type="text" {...register("com_observaciones_aval")} className={inputClass} placeholder="Ej: Se validó odómetro y ticket de bomba" />
              </div>
            </div>
          </div>
        )}

        {/* 5: SST */}
        {selectedActivities.includes('sst') && (
          <div className={sectionClass}>
            <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">Auditoría SST en Campo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ciudad Operativa</label>
                <select {...register("sst_ciudad")} className={inputClass}>
                  <option value="">Seleccione...</option>
                  {CIUDADES_ESTRICTAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Técnicos Auditados</label>
                <input type="text" {...register("sst_tecnicos")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Estado de EPP</label>
                <select {...register("sst_epp")} className={inputClass}>
                  <option value="">Seleccione...</option>
                  <option value="Conforme">Conforme (Arnés, Eslinga, Casco...)</option>
                  <option value="No Conforme">No Conforme</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Señalización (Conos)</label>
                <select {...register("sst_senalizacion")} className={inputClass}>
                  <option value="">Seleccione...</option>
                  <option value="Conforme">Conforme</option>
                  <option value="No Conforme">No Conforme</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Observaciones del Aval / Prueba</label>
                <input type="text" {...register("sst_observaciones_aval")} className={inputClass} placeholder="Ej: Cuadrilla correctamente anclada y señalizada" />
              </div>
            </div>
          </div>
        )}

        {/* 6: FACTIBILIDAD */}
        {selectedActivities.includes('factibilidad') && (
          <div className={sectionClass}>
            <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">Levantamiento de Factibilidad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ciudad Operativa</label>
                <select {...register("fac_ciudad")} className={inputClass}>
                  <option value="">Seleccione...</option>
                  {CIUDADES_ESTRICTAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Coordenadas GPS</label>
                <input type="text" {...register("fac_coordenadas")} className={inputClass} placeholder="10.1234, -66.1234" />
              </div>
              <div>
                <label className={labelClass}>Distancia de Enlace</label>
                <input type="number" {...register("fac_distancia")} className={inputClass} placeholder="Metros a OLT/NAP" />
              </div>
              <div>
                <label className={labelClass}>Estimación de Abonados</label>
                <input type="number" {...register("fac_abonados")} className={inputClass} placeholder="Cantidad potencial" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Observaciones del Aval / Prueba</label>
                <input type="text" {...register("fac_observaciones_aval")} className={inputClass} placeholder="Ej: Se validó postería y pines en el mapa" />
              </div>
            </div>
          </div>
        )}

        {/* --- BOTÓN DE ENVÍO --- */}
        {selectedActivities.length > 0 && (
          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 px-8 rounded-full text-base font-medium bg-gray-900 text-white hover:bg-black transition-all duration-300 shadow-lg shadow-gray-900/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Finalizando...</>
              ) : (
                <>Enviar Reporte Final <UploadCloud className="w-5 h-5 ml-2" /></>
              )}
            </button>
          </div>
        )}

      </form>
    </div>
  );
}
