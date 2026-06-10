"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, UploadCloud, Loader2, MessageCircle, Download } from "lucide-react";
import { toast } from "sonner"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { generateEquipmentWhatsAppMessage } from "@/lib/whatsappFormatter";
import * as XLSX from "xlsx";

interface EquipmentFormProps {
  usuarioActual: {
    id: string;
    nombre: string;
  };
}

const KIT_FTTH = ["Cleaver", "Stripper", "Pela Drop", "Power Meter", "Bolso Tolsen", "Alicate/Piqueta", "VFL"];
const EPP = ["Casco", "Botas", "Chaleco", "Guantes", "Lentes"];
const HERRAMIENTAS = ["Taladro", "Mecha", "Destornillador E", "Destornillador P", "Destornillador E/P", "Arnés", "Escalera", "Zinchas", "Martillo"];
const ESTADOS = ["Operativo", "Dañado", "En Reparación", "Extraviado", "No Aplica"];

const inputClass = "w-full h-12 px-4 rounded-[14px] bg-[#F2F2F7] focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all outline-none text-[15px] text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:bg-gray-100 border border-transparent";
const labelClass = "text-[15px] font-semibold text-gray-900 mb-2 block";
const sectionClass = "bg-white rounded-[24px] p-5 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-6 relative border border-gray-100";

const ItemRow = ({ title, namePrefix, control, register }: any) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 bg-[#F9F9FB] rounded-2xl border border-gray-100 mb-3 hover:border-gray-300 transition-colors">
      <div className="w-full sm:w-1/2 flex items-center gap-3">
        <Controller
          name={`${namePrefix}.check`}
          control={control}
          defaultValue={false}
          render={({ field }) => (
            <Checkbox 
              checked={field.value} 
              onCheckedChange={field.onChange}
              className="w-5 h-5 rounded-md border-gray-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" 
            />
          )}
        />
        <label className="text-sm font-semibold text-gray-800 cursor-pointer">{title}</label>
      </div>
      <div className="w-full sm:w-1/2">
        <Controller 
          control={control} 
          name={`${namePrefix}.estado`} 
          defaultValue=""
          render={({ field }) => (
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <SelectTrigger className="h-11 bg-white border-gray-200 rounded-xl w-full">
                <SelectValue placeholder="Estado..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {ESTADOS.map(e => <SelectItem key={e} value={e} className="rounded-lg">{e}</SelectItem>)}
              </SelectContent>
            </Select>
          )} 
        />
      </div>
    </div>
  );
};

export default function EquipmentControlFormLogic({ usuarioActual }: EquipmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [finalReportData, setFinalReportData] = useState<any>(null);
  
  const [cuadrillas, setCuadrillas] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  
  const supabase = createClient();

  const { register, control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      equipo_id: "",
      equipo_nombre: "",
      tecnico_lider: "",
      tecnico_auxiliar: "",
      kit_lider: {},
      kit_auxiliar: {},
      epp_lider: {},
      epp_auxiliar: {},
      herramientas: {}
    }
  });

  const selectedEquipoId = watch("equipo_id");

  useEffect(() => {
    const fetchMasterData = async () => {
        // Fetch tecnicos
        const { data: tecData } = await supabase.from('tecnicos').select('id, nombre_completo');
        if (tecData) setTecnicos(tecData);

        // Fetch cuadrillas
        const { data: cuadData } = await supabase.from('cuadrillas').select('*');
        if (cuadData) setCuadrillas(cuadData);
    };

    fetchMasterData();
  }, [supabase]);

  useEffect(() => {
    if (selectedEquipoId && cuadrillas.length > 0 && tecnicos.length > 0) {
        const c = cuadrillas.find(x => x.id === selectedEquipoId);
        if (c) {
            setValue("equipo_nombre", c.nombre);
            
            const lider = tecnicos.find(t => t.id === c.lider_id);
            setValue("tecnico_lider", lider ? lider.nombre_completo : "Sin asignar");

            const auxiliar = tecnicos.find(t => t.id === c.auxiliar_id);
            setValue("tecnico_auxiliar", auxiliar ? auxiliar.nombre_completo : "Sin asignar");
        }
    }
  }, [selectedEquipoId, cuadrillas, tecnicos, setValue]);

  useEffect(() => {
    // Check for draft
    const initData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: draft } = await supabase
        .from('equipment_control_reports')
        .select('*')
        .eq('supervisor_id', usuarioActual.id)
        .eq('date', today)
        .eq('equipo_nombre', 'DRAFT')
        .maybeSingle();
        
      if (draft && draft.report_data) {
        reset(draft.report_data);
      }
      setLoadingInitial(false);
    };
    initData();
  }, [usuarioActual.id, supabase, reset]);

  const onSubmit = async (data: any) => {
    if (!data.equipo_nombre || !data.tecnico_lider) {
      toast.error("Debes seleccionar una cuadrilla.");
      return;
    }
    
    setIsSubmitting(true);
    toast.loading("Finalizando auditoría...", { id: 'submit' });
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Delete old draft if exists
      await supabase.from('equipment_control_reports')
        .delete()
        .eq('supervisor_id', usuarioActual.id)
        .eq('date', today)
        .eq('equipo_nombre', 'DRAFT');

      // Insert final report
      await supabase.from('equipment_control_reports').insert({ 
        supervisor_id: usuarioActual.id, 
        date: today, 
        equipo_nombre: data.equipo_nombre,
        tecnico_lider: data.tecnico_lider,
        tecnico_auxiliar: data.tecnico_auxiliar,
        report_data: data 
      });
      
      toast.success("¡Auditoría enviada exitosamente!", { id: 'submit' });
      setFinalReportData(data);
      setIsSuccess(true);
    } catch (error) {
      toast.error("Hubo un error al enviar el reporte", { id: 'submit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.loading("Generando Excel...", { id: 'excel' });
      const { data: allReports, error } = await supabase
        .from('equipment_control_reports')
        .select('date, equipo_nombre, tecnico_lider, tecnico_auxiliar, report_data')
        .neq('equipo_nombre', 'DRAFT')
        .order('date', { ascending: false });

      if (error) throw error;

      const rows: any[] = [];

      allReports.forEach(report => {
        const { date, equipo_nombre, tecnico_lider, tecnico_auxiliar, report_data } = report;
        const rd = report_data as any;

        const processGroup = (group: any, tipo: string, responsable: string) => {
            if (!group) return;
            Object.entries(group).forEach(([item, values]: [string, any]) => {
                rows.push({
                    "Fecha": date,
                    "Equipo": equipo_nombre,
                    "Técnico Líder": tecnico_lider,
                    "Técnico Auxiliar": tecnico_auxiliar,
                    "Responsable": responsable,
                    "Categoría": tipo,
                    "Ítem": item,
                    "Lo Tiene": values?.check ? 'SÍ' : 'NO',
                    "Estado": values?.estado || 'No definido'
                });
            });
        };

        processGroup(rd.kit_lider, "Kit FTTH", "Líder");
        processGroup(rd.epp_lider, "EPP", "Líder");
        processGroup(rd.kit_auxiliar, "Kit FTTH", "Auxiliar");
        processGroup(rd.epp_auxiliar, "EPP", "Auxiliar");
        processGroup(rd.herramientas, "Herramientas Compartidas", "Equipo Compartido");
      });

      // Crear y exportar archivo Excel
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Auditorías Equipamiento");
      
      XLSX.writeFile(workbook, "Control_Equipamiento.xlsx");
      
      toast.success("Descarga completada", { id: 'excel' });
    } catch(err) {
      console.error(err);
      toast.error("Error exportando datos", { id: 'excel' });
    }
  }

  if (loadingInitial) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  if (isSuccess && finalReportData) {
    const today = new Date().toISOString().split('T')[0];
    const waUrl = `https://wa.me/?text=${generateEquipmentWhatsAppMessage(finalReportData, usuarioActual.nombre, today)}`;
    
    return (
      <div className="w-full max-w-3xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">¡Auditoría Completada!</h2>
        <p className="text-gray-500">El control de equipamiento ha sido registrado exitosamente.</p>
        
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
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 h-14 px-8 rounded-[14px] bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold shadow-sm transition-all w-full sm:w-auto"
          >
            <Download className="w-5 h-5" />
            Exportar a Excel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Control de Equipamiento</h2>
          <p className="text-gray-500">Auditor: <span className="font-semibold text-gray-800">{usuarioActual.nombre}</span></p>
        </div>
        <button 
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Exportar a Excel
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <div className={sectionClass}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Seleccionar Cuadrilla *</label>
              <Controller
                control={control}
                name="equipo_id"
                render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full h-12 bg-[#F2F2F7] rounded-[14px] border-transparent focus:ring-2 focus:ring-orange-500 text-[15px]">
                            <SelectValue placeholder="Elige un equipo..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {cuadrillas.map(c => (
                                <SelectItem key={c.id} value={c.id} className="rounded-lg">{c.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de Auditoría</label>
              <input type="text" value={new Date().toLocaleDateString()} disabled className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Técnico Líder (Autocompletado)</label>
              <input type="text" {...register("tecnico_lider")} disabled className={inputClass} placeholder="Se llena solo..." />
            </div>
            <div>
              <label className={labelClass}>Técnico Auxiliar (Autocompletado)</label>
              <input type="text" {...register("tecnico_auxiliar")} disabled className={inputClass} placeholder="Se llena solo..." />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LIDER */}
          <div className={sectionClass}>
            <h3 className="text-xl font-bold text-blue-900 mb-6 pb-2 border-b border-blue-100">Técnico Líder</h3>
            
            <h4 className="font-bold text-sm text-gray-500 mb-3 uppercase tracking-wider">Kit FTTH Líder</h4>
            {KIT_FTTH.map(item => (
              <ItemRow key={`lider-kit-${item}`} title={item} namePrefix={`kit_lider.${item}`} control={control} register={register} />
            ))}

            <h4 className="font-bold text-sm text-gray-500 mt-8 mb-3 uppercase tracking-wider">EPP Líder</h4>
            {EPP.map(item => (
              <ItemRow key={`lider-epp-${item}`} title={item} namePrefix={`epp_lider.${item}`} control={control} register={register} />
            ))}
          </div>

          {/* AUXILIAR */}
          <div className={sectionClass}>
            <h3 className="text-xl font-bold text-orange-900 mb-6 pb-2 border-b border-orange-100">Técnico Auxiliar</h3>
            
            <h4 className="font-bold text-sm text-gray-500 mb-3 uppercase tracking-wider">Kit FTTH Auxiliar</h4>
            {KIT_FTTH.map(item => (
              <ItemRow key={`aux-kit-${item}`} title={item} namePrefix={`kit_auxiliar.${item}`} control={control} register={register} />
            ))}

            <h4 className="font-bold text-sm text-gray-500 mt-8 mb-3 uppercase tracking-wider">EPP Auxiliar</h4>
            {EPP.map(item => (
              <ItemRow key={`aux-epp-${item}`} title={item} namePrefix={`epp_auxiliar.${item}`} control={control} register={register} />
            ))}
          </div>
        </div>

        {/* HERRAMIENTAS DE EQUIPO */}
        <div className={sectionClass}>
          <h3 className="text-xl font-bold text-purple-900 mb-6 pb-2 border-b border-purple-100">Herramientas del Equipo (Compartidas)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HERRAMIENTAS.map(item => (
              <ItemRow key={`herramienta-${item}`} title={item} namePrefix={`herramientas.${item}`} control={control} register={register} />
            ))}
          </div>
        </div>

        <div className="pt-6 pb-20 md:pb-6 flex justify-center md:justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto h-14 px-10 rounded-2xl text-base font-bold bg-gray-900 text-white hover:bg-black transition-all duration-300 shadow-lg shadow-gray-900/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
            ) : (
              <>Guardar Auditoría <UploadCloud className="w-5 h-5 ml-2" /></>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
