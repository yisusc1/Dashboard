"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, UploadCloud, Loader2, Plus, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateWhatsAppMessage } from "@/lib/whatsappFormatter";
import Link from "next/link";

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

// --- ESTILOS COMPARTIDOS (iOS Premium Aesthetic) ---
const inputClass = "w-full h-12 px-4 rounded-[14px] bg-[#F2F2F7] focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none text-[15px] text-gray-900 placeholder:text-gray-400 disabled:opacity-50 border border-transparent";
const labelClass = "text-[15px] font-semibold text-gray-900 mb-2 block";
const sectionClass = "bg-white rounded-[24px] p-5 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-6 relative border border-gray-100";
const cardClass = "bg-[#F9F9FB] border border-gray-100 rounded-[20px] p-5 mb-4 relative";

// --- SUBCOMPONENTE DE CASCADA (Usando Shadcn Select para look iOS) ---
const LocationSelector = ({ control, register, setValue, index, namespace, zonas }: any) => {
  const estadoPath = `${namespace}.${index}.estado`;
  const municipioPath = `${namespace}.${index}.municipio`;
  const parroquiaPath = `${namespace}.${index}.parroquia`;
  const sectorPath = `${namespace}.${index}.sector`;

  const estado = useWatch({ control, name: estadoPath });
  const municipio = useWatch({ control, name: municipioPath });
  const parroquia = useWatch({ control, name: parroquiaPath });

  const estados = Array.from(new Set(zonas.map((z: any) => z.estado)));
  const municipios = Array.from(new Set(zonas.filter((z: any) => z.estado === estado).map((z: any) => z.municipio)));
  const parroquias = Array.from(new Set(zonas.filter((z: any) => z.estado === estado && z.municipio === municipio).map((z: any) => z.parroquia)));
  const sectores = Array.from(new Set(zonas.filter((z: any) => z.estado === estado && z.municipio === municipio && z.parroquia === parroquia).map((z: any) => z.sector)));

  return (
    <div className="md:col-span-2 bg-[#F9F9FB] p-5 rounded-[20px] border border-gray-100 space-y-3">
      <p className="text-[15px] font-bold text-gray-900">Ubicación Operativa</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Estado *</label>
          <Select value={estado || ""} onValueChange={(val) => { setValue(estadoPath, val); setValue(municipioPath, ''); setValue(parroquiaPath, ''); setValue(sectorPath, ''); }}>
            <SelectTrigger className={`${inputClass} bg-white`}>
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {estados.map((e: any) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={labelClass}>Municipio *</label>
          <Select disabled={!estado} value={municipio || ""} onValueChange={(val) => { setValue(municipioPath, val); setValue(parroquiaPath, ''); setValue(sectorPath, ''); }}>
            <SelectTrigger className={`${inputClass} bg-white`}>
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {municipios.map((m: any) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={labelClass}>Parroquia *</label>
          <Select disabled={!municipio} value={parroquia || ""} onValueChange={(val) => { setValue(parroquiaPath, val); setValue(sectorPath, ''); }}>
            <SelectTrigger className={`${inputClass} bg-white`}>
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {parroquias.map((p: any) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={labelClass}>Sector *</label>
          <Select disabled={!parroquia} value={useWatch({ control, name: sectorPath }) || ""} onValueChange={(val) => setValue(sectorPath, val)}>
            <SelectTrigger className={`${inputClass} bg-white`}>
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {sectores.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default function SupervisionFormLogic({ usuarioActual }: SupervisionFormProps) {
  const [zonas, setZonas] = useState<any[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<ActivityKey[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [finalReportData, setFinalReportData] = useState<any>(null);
  
  const supabase = createClient();

  const { register, control, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      actividades: [] as string[],
      instalaciones: [],
      soportes: [],
      materiales: [],
      combustibles: [],
      ssts: [],
      factibilidades: []
    } as Record<string, any>
  });

  // Arreglos dinámicos para cada actividad
  const instArr = useFieldArray({ control, name: "instalaciones" });
  const sopArr = useFieldArray({ control, name: "soportes" });
  const matArr = useFieldArray({ control, name: "materiales" });
  const comArr = useFieldArray({ control, name: "combustibles" });
  const sstArr = useFieldArray({ control, name: "ssts" });
  const facArr = useFieldArray({ control, name: "factibilidades" });

  useEffect(() => {
    const initData = async () => {
      const { data: zonasData } = await supabase.from('zonas_operativas').select('*').order('estado');
      if (zonasData) setZonas(zonasData);
      
      const today = new Date().toISOString().split('T')[0];
      const { data: draft } = await supabase
        .from('daily_activities_reports')
        .select('*')
        .eq('supervisor_id', usuarioActual.id)
        .eq('date', today).maybeSingle();
        
      if (draft) {
        setSelectedActivities(draft.selected_activities as ActivityKey[]);
        if (draft.report_data) {
          reset(draft.report_data);
        }
      }
      setLoadingInitial(false);
    };
    initData();
  }, [usuarioActual.id, supabase, reset]);

  const toggleActivity = (id: ActivityKey) => {
    setSelectedActivities(prev => {
      const newActivities = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      setValue('actividades', newActivities);
      
      if (!prev.includes(id)) {
        if (id === 'instalacion' && instArr.fields.length === 0) instArr.append({});
        if (id === 'soporte' && sopArr.fields.length === 0) sopArr.append({});
        if (id === 'materiales' && matArr.fields.length === 0) matArr.append({});
        if (id === 'combustible' && comArr.fields.length === 0) comArr.append({});
        if (id === 'sst' && sstArr.fields.length === 0) sstArr.append({});
        if (id === 'factibilidad' && facArr.fields.length === 0) facArr.append({});
      }

      autoSave(newActivities, watch());
      return newActivities;
    });
  };

  const autoSave = async (activities: string[], formData: any) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('daily_activities_reports').select('id').eq('supervisor_id', usuarioActual.id).eq('date', today).maybeSingle();
      if (existing) {
        await supabase.from('daily_activities_reports').update({ selected_activities: activities, report_data: formData }).eq('id', existing.id);
      } else {
        await supabase.from('daily_activities_reports').insert({ supervisor_id: usuarioActual.id, date: today, status: 'DRAFT', selected_activities: activities, report_data: formData });
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
      const { data: existing } = await supabase.from('daily_activities_reports').select('id').eq('supervisor_id', usuarioActual.id).eq('date', today).maybeSingle();
      if (existing) {
        await supabase.from('daily_activities_reports').update({ status: 'COMPLETED', report_data: data }).eq('id', existing.id);
      }
      toast.success("¡Reporte enviado exitosamente!", { id: 'submit' });
      setFinalReportData(data);
      setIsSuccess(true);
    } catch (error) {
      toast.error("Hubo un error al enviar el reporte", { id: 'submit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastRecordFilled = (arrayName: string) => {
    const items = watch(arrayName);
    if (!items || items.length === 0) return true;
    const last = items[items.length - 1];
    return last && last.estado && last.sector; 
  };

  if (loadingInitial) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  if (isSuccess && finalReportData) {
    const today = new Date().toISOString().split('T')[0];
    const waUrl = `https://wa.me/?text=${generateWhatsAppMessage(finalReportData, usuarioActual.nombre, today)}`;
    
    return (
      <div className="w-full max-w-3xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">¡Reporte Enviado!</h2>
        <p className="text-gray-500">Tu reporte de operaciones ha sido guardado exitosamente.</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 pt-6">
          <a 
            href={waUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-14 px-8 rounded-[14px] bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold shadow-lg shadow-[#25D366]/30 transition-all w-full sm:w-auto hover:scale-[1.02]"
          >
            <MessageCircle className="w-5 h-5" />
            Enviar a WhatsApp
          </a>
          
          <Link 
            href="/historial-reportes"
            className="flex items-center justify-center gap-2 h-14 px-8 rounded-[14px] bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold shadow-sm transition-all w-full sm:w-auto"
          >
            Ver Historial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <div className="mb-8 text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Reporte de Operaciones</h2>
        <p className="text-gray-500">Supervisor: <span className="font-semibold text-gray-800">{usuarioActual.nombre}</span></p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* SELECTOR DE ACTIVIDADES */}
        <div className={sectionClass}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">1. ¿Qué tipo de actividades realizaste hoy?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACTIVITIES.map((act) => {
              const isSelected = selectedActivities.includes(act.id as ActivityKey);
              return (
                <div key={act.id} onClick={() => toggleActivity(act.id as ActivityKey)} className={`p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/50 border-gray-200 hover:border-blue-300 hover:bg-white text-gray-800'}`}>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">Inspección de Instalación / Alta Nueva</h3>
            </div>
            
            {instArr.fields.map((field, index) => (
              <div key={field.id} className={cardClass}>
                {instArr.fields.length > 1 && (
                  <div className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => instArr.remove(index)}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                )}
                <h4 className="text-sm font-bold text-gray-800 mb-4">Registro #{index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocationSelector control={control} register={register} setValue={setValue} index={index} namespace="instalaciones" zonas={zonas} />
                  <div><label className={labelClass}>Cédula / ID Cliente *</label><input type="text" {...register(`instalaciones.${index}.cedula`)} className={inputClass} placeholder="V-12345678" /></div>
                  <div><label className={labelClass}>Nombres Cuadrilla</label><input type="text" {...register(`instalaciones.${index}.tecnicos`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Metraje Reportado</label><input type="number" {...register(`instalaciones.${index}.metrajeReportado`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Metraje Físico Real</label><input type="number" {...register(`instalaciones.${index}.metrajeReal`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Atenuación Final (dBm)</label><input type="number" step="0.01" {...register(`instalaciones.${index}.atenuacion`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Serial / MAC ONT</label><input type="text" {...register(`instalaciones.${index}.serial`)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Observaciones Aval / Prueba</label><input type="text" {...register(`instalaciones.${index}.observaciones`)} className={inputClass} /></div>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              disabled={!isLastRecordFilled('instalaciones')}
              onClick={() => instArr.append({})} 
              className="flex items-center text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir otro registro
              {!isLastRecordFilled('instalaciones') && <span className="ml-2 text-xs font-normal">(Completa la ubicación del anterior)</span>}
            </button>
          </div>
        )}

        {/* 2: SOPORTE */}
        {selectedActivities.includes('soporte') && (
          <div className={sectionClass}>
            <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">Inspección en Soporte Técnico</h3>
            
            {sopArr.fields.map((field, index) => (
              <div key={field.id} className={cardClass}>
                {sopArr.fields.length > 1 && (
                  <div className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => sopArr.remove(index)}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                )}
                <h4 className="text-sm font-bold text-gray-800 mb-4">Soporte #{index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocationSelector control={control} register={register} setValue={setValue} index={index} namespace="soportes" zonas={zonas} />
                  <div><label className={labelClass}>N° Ticket / Cédula *</label><input type="text" {...register(`soportes.${index}.ticket`)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Nombres de Técnicos</label><input type="text" {...register(`soportes.${index}.tecnicos`)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Diagnóstico Encontrado</label><input type="text" {...register(`soportes.${index}.diagnostico`)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Acción Correctiva</label><input type="text" {...register(`soportes.${index}.accion`)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Observaciones Aval / Prueba</label><input type="text" {...register(`soportes.${index}.observaciones`)} className={inputClass} /></div>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              disabled={!isLastRecordFilled('soportes')}
              onClick={() => sopArr.append({})} 
              className="flex items-center text-sm font-semibold text-orange-600 bg-orange-50 px-4 py-2 rounded-full hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir otro soporte
              {!isLastRecordFilled('soportes') && <span className="ml-2 text-xs font-normal">(Completa la ubicación del anterior)</span>}
            </button>
          </div>
        )}

        {/* 3: MATERIALES */}
        {selectedActivities.includes('materiales') && (
          <div className={sectionClass}>
            <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">Control de Materiales (Retorno)</h3>
            
            {matArr.fields.map((field, index) => {
              const dep = watch(`materiales.${index}.despacho`) || 0;
              const ret = watch(`materiales.${index}.retorno`) || 0;
              
              return (
              <div key={field.id} className={cardClass}>
                {matArr.fields.length > 1 && (
                  <div className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => matArr.remove(index)}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                )}
                <h4 className="text-sm font-bold text-gray-800 mb-4">Retorno #{index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocationSelector control={control} register={register} setValue={setValue} index={index} namespace="materiales" zonas={zonas} />
                  <div><label className={labelClass}>Técnicos Responsables</label><input type="text" {...register(`materiales.${index}.tecnicos`)} className={inputClass} /></div>
                  <div><label className={labelClass}>ID / Código Carrete *</label><input type="text" {...register(`materiales.${index}.carrete`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Despacho (AM)</label><input type="number" {...register(`materiales.${index}.despacho`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Retorno (PM)</label><input type="number" {...register(`materiales.${index}.retorno`)} className={inputClass} /></div>
                </div>
                
                {(dep > 0 || ret > 0) && (
                   <div className="mt-4 p-4 bg-purple-50 rounded-xl text-sm font-semibold text-purple-800">
                     Diferencia / Consumo Neto: {dep - ret} Metros
                   </div>
                )}
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Firma Conformidad</label><input type="text" {...register(`materiales.${index}.firma`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Observaciones Aval</label><input type="text" {...register(`materiales.${index}.observaciones`)} className={inputClass} /></div>
                </div>
              </div>
            )})}
            <button 
              type="button" 
              disabled={!isLastRecordFilled('materiales')}
              onClick={() => matArr.append({})} 
              className="flex items-center text-sm font-semibold text-purple-600 bg-purple-50 px-4 py-2 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir otro carrete
              {!isLastRecordFilled('materiales') && <span className="ml-2 text-xs font-normal">(Completa la ubicación del anterior)</span>}
            </button>
          </div>
        )}

        {/* 4: COMBUSTIBLE */}
        {selectedActivities.includes('combustible') && (
          <div className={sectionClass}>
            <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">Control de Combustible y Flota</h3>
            
            {comArr.fields.map((field, index) => (
              <div key={field.id} className={cardClass}>
                {comArr.fields.length > 1 && (
                  <div className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => comArr.remove(index)}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                )}
                <h4 className="text-sm font-bold text-gray-800 mb-4">Vehículo #{index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocationSelector control={control} register={register} setValue={setValue} index={index} namespace="combustibles" zonas={zonas} />
                  <div><label className={labelClass}>Placa / Unidad *</label><input type="text" {...register(`combustibles.${index}.placa`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Conductor</label><input type="text" {...register(`combustibles.${index}.conductor`)} className={inputClass} /></div>
                  <div><label className={labelClass}>KM Salida</label><input type="number" {...register(`combustibles.${index}.kmSalida`)} className={inputClass} /></div>
                  <div><label className={labelClass}>KM Llegada</label><input type="number" {...register(`combustibles.${index}.kmLlegada`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Litros Surtidos / N° Ticket</label><input type="text" {...register(`combustibles.${index}.litros`)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Novedades del Vehículo</label><input type="text" {...register(`combustibles.${index}.novedades`)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Observaciones Aval</label><input type="text" {...register(`combustibles.${index}.observaciones`)} className={inputClass} /></div>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              disabled={!isLastRecordFilled('combustibles')}
              onClick={() => comArr.append({})} 
              className="flex items-center text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir otro vehículo
              {!isLastRecordFilled('combustibles') && <span className="ml-2 text-xs font-normal">(Completa la ubicación del anterior)</span>}
            </button>
          </div>
        )}

        {/* 5: SST */}
        {selectedActivities.includes('sst') && (
          <div className={sectionClass}>
            <h3 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">Auditoría SST en Campo</h3>
            
            {sstArr.fields.map((field, index) => (
              <div key={field.id} className={cardClass}>
                {sstArr.fields.length > 1 && (
                  <div className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => sstArr.remove(index)}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                )}
                <h4 className="text-sm font-bold text-gray-800 mb-4">Auditoría #{index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocationSelector control={control} register={register} setValue={setValue} index={index} namespace="ssts" zonas={zonas} />
                  <div className="md:col-span-2"><label className={labelClass}>Técnicos Auditados *</label><input type="text" {...register(`ssts.${index}.tecnicos`)} className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>Estado de EPP</label>
                    <Controller control={control} name={`ssts.${index}.epp`} render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Conforme">Conforme</SelectItem>
                          <SelectItem value="No Conforme">No Conforme</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div>
                    <label className={labelClass}>Señalización (Conos)</label>
                    <Controller control={control} name={`ssts.${index}.senalizacion`} render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Conforme">Conforme</SelectItem>
                          <SelectItem value="No Conforme">No Conforme</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="md:col-span-2"><label className={labelClass}>Observaciones Aval</label><input type="text" {...register(`ssts.${index}.observaciones`)} className={inputClass} /></div>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              disabled={!isLastRecordFilled('ssts')}
              onClick={() => sstArr.append({})} 
              className="flex items-center text-sm font-semibold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir otra auditoría SST
              {!isLastRecordFilled('ssts') && <span className="ml-2 text-xs font-normal">(Completa la ubicación del anterior)</span>}
            </button>
          </div>
        )}

        {/* 6: FACTIBILIDAD */}
        {selectedActivities.includes('factibilidad') && (
          <div className={sectionClass}>
            <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">Levantamiento de Factibilidad</h3>
            
            {facArr.fields.map((field, index) => (
              <div key={field.id} className={cardClass}>
                {facArr.fields.length > 1 && (
                  <div className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => facArr.remove(index)}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                )}
                <h4 className="text-sm font-bold text-gray-800 mb-4">Factibilidad #{index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocationSelector control={control} register={register} setValue={setValue} index={index} namespace="factibilidades" zonas={zonas} />
                  <div><label className={labelClass}>Coordenadas GPS</label><input type="text" {...register(`factibilidades.${index}.coordenadas`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Distancia Enlace</label><input type="number" {...register(`factibilidades.${index}.distancia`)} className={inputClass} /></div>
                  <div><label className={labelClass}>Estimación Abonados</label><input type="number" {...register(`factibilidades.${index}.abonados`)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Observaciones Aval</label><input type="text" {...register(`factibilidades.${index}.observaciones`)} className={inputClass} /></div>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              disabled={!isLastRecordFilled('factibilidades')}
              onClick={() => facArr.append({})} 
              className="flex items-center text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir otro levantamiento
              {!isLastRecordFilled('factibilidades') && <span className="ml-2 text-xs font-normal">(Completa la ubicación del anterior)</span>}
            </button>
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
