"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// --- ESQUEMA ZOD ---
const baseReportSchema = z.object({
  zonasOperativas: z.string().min(1, "Seleccione al menos una zona").array().optional().default([]),
  solicitudesExternas: z.string().optional().default(""),

  // Campos de ROLE_CALLE
  tecnicosInstalacion: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  tecnicosSoporte: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  tecnicosAfectaciones: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  conductores: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  novedadesAsistencia: z.string().optional().default(""),
  combustibleUtilizado: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  panelesAInstalacion: z.boolean().default(true),
  znaAfectaciones: z.boolean().default(true),
  motosSoporte: z.boolean().default(true),
  motivoRetraso: z.string().optional().default(""),
  cuadrillasVisitadas: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  novedadesSeguridad: z.string().optional().default(""),
  apoyoEnCalle: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  fallasReparadas: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),

  // Campos de ROLE_ALMACEN
  discrepanciasFibraValor: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  discrepanciasFibraMotivo: z.string().optional().default(""),
  equiposDañadosPerdidosValor: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  equiposDañadosPerdidosMotivo: z.string().optional().default(""),
  inspeccionesAuditadasIds: z.string().optional().default(""), // IDs separados por comas
  discrepanciasCalidadValor: z.number({ invalid_type_error: "Debe ser un número" }).min(0).optional(),
  discrepanciasCalidadMotivo: z.string().optional().default(""),
});

export const getReportSchema = (role: "ROLE_CALLE" | "ROLE_ALMACEN") => {
  return baseReportSchema.superRefine((data, ctx) => {
    if (role === "ROLE_CALLE") {
      const hasRetraso = !data.panelesAInstalacion || !data.znaAfectaciones || !data.motosSoporte;
      if (hasRetraso && (!data.motivoRetraso || data.motivoRetraso.trim() === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Obligatorio explicar el motivo de retraso",
          path: ["motivoRetraso"],
        });
      }
    }
  });
};

export type ReportFormValues = z.infer<typeof baseReportSchema>;

// --- TIPOS Y PROPS ---
interface SupervisionFormProps {
  usuarioActual: {
    id: string;
    nombre: string;
    rol: "ROLE_CALLE" | "ROLE_ALMACEN";
  };
  reportId: string;
}

// --- MOCK API ---
// Estas funciones simulan las llamadas al backend
const mockFetchDraft = async (reportId: string): Promise<Partial<ReportFormValues>> => {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve({
        zonasOperativas: ["Las Tejerias;CASCO CENTRAL"],
        panelesAInstalacion: true,
        znaAfectaciones: true,
        motosSoporte: true,
      });
    }, 1000)
  );
};

const mockPatchDraft = async (reportId: string, data: Partial<ReportFormValues>) => {
  return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
};

const mockSignOff = async (reportId: string, role: string) => {
  return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
};

// --- COMPONENTE PRINCIPAL ---
export default function SupervisionFormLogic({ usuarioActual, reportId }: SupervisionFormProps) {
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalleSigned, setIsCalleSigned] = useState(false);
  const [isAlmacenSigned, setIsAlmacenSigned] = useState(false);

  const isCalle = usuarioActual.rol === "ROLE_CALLE";
  const isAlmacen = usuarioActual.rol === "ROLE_ALMACEN";

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(getReportSchema(usuarioActual.rol)),
    mode: "onBlur",
  });

  // 1. Cargar borrador al montar
  useEffect(() => {
    const loadDraft = async () => {
      setIsDraftLoading(true);
      try {
        const draftData = await mockFetchDraft(reportId);
        reset(draftData); // Inicializa los valores del formulario
      } catch (error) {
        console.error("Error cargando borrador:", error);
      } finally {
        setIsDraftLoading(false);
      }
    };
    loadDraft();
  }, [reportId, reset]);

  // 2. Auto-guardado (Debounce)
  const formValues = watch(); // Observa todos los cambios

  useEffect(() => {
    if (isDraftLoading) return; // No guardar durante la carga inicial

    const handleSaveProgress = async (data: Partial<ReportFormValues>) => {
      setIsSaving(true);
      try {
        await mockPatchDraft(reportId, data);
        console.log("Progreso guardado (auto-save):", data);
      } catch (error) {
        console.error("Error guardando progreso:", error);
      } finally {
        setIsSaving(false);
      }
    };

    const timer = setTimeout(() => {
      // Filtramos la data en base al rol antes de guardar (PATCH parcial)
      const dataToSave = { ...formValues };
      // Opcional: Podrías limpiar claves que el rol no debería guardar, 
      // pero si el form está deshabilitado no deberían cambiar.
      handleSaveProgress(dataToSave);
    }, 2000); // Espera 2 segundos después de que el usuario deje de tipear

    return () => clearTimeout(timer);
  }, [formValues, isDraftLoading, reportId]);

  // 3. Función de Firmado
  const onSignOff = async () => {
    try {
      await mockSignOff(reportId, usuarioActual.rol);
      if (isCalle) setIsCalleSigned(true);
      if (isAlmacen) setIsAlmacenSigned(true);
      
      // Si ambos están firmados, enviar evento de finalización
      if ((isCalle && isAlmacenSigned) || (isAlmacen && isCalleSigned)) {
        console.log("¡Reporte Unificado y Finalizado!");
      }
    } catch (error) {
      console.error("Error al firmar:", error);
    }
  };

  if (isDraftLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando reporte de hoy...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg mt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reporte Diario de Supervisión</h1>
        <div className="flex items-center gap-4">
          {isSaving && <span className="text-sm text-blue-500 animate-pulse">Guardando borrador...</span>}
          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600 font-medium">
            {usuarioActual.rol}
          </span>
        </div>
      </div>

      <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
        
        {/* --- SECCIÓN 1: ENCABEZADO (Compartido) --- */}
        <section className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">1. Encabezado</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zonas Operativas (Selección múltiple desde CSV)
            </label>
            {/* Este select simula la carga de zonas, aquí se podrían mapear options reales */}
            <select
              multiple
              className="w-full border-gray-300 rounded-md shadow-sm p-2 bg-white"
              {...register("zonasOperativas")}
            >
              <option value="Las Tejerias;CASCO CENTRAL">Las Tejerias - CASCO CENTRAL</option>
              <option value="San antonio;LOS CASTORES">San Antonio - LOS CASTORES</option>
              <option value="San antonio;LA MORITA">San Antonio - LA MORITA</option>
            </select>
            {errors.zonasOperativas && <p className="text-red-500 text-xs mt-1">{errors.zonasOperativas.message}</p>}
          </div>
        </section>

        {/* --- SECCIÓN 2: CALLE (Solo ROLE_CALLE) --- */}
        <section className={`p-4 rounded-md border ${isCalle ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">2. Operaciones y Calle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Técnicos de Instalación</label>
              <input type="number" disabled={!isCalle} {...register("tecnicosInstalacion", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Técnicos de Soporte</label>
              <input type="number" disabled={!isCalle} {...register("tecnicosSoporte", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Técnicos Afectaciones</label>
              <input type="number" disabled={!isCalle} {...register("tecnicosAfectaciones", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Conductores</label>
              <input type="number" disabled={!isCalle} {...register("conductores", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Novedades de Asistencia</label>
              <input type="text" disabled={!isCalle} {...register("novedadesAsistencia")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Combustible Utilizado (Litros/Tickets)</label>
              <input type="number" disabled={!isCalle} {...register("combustibleUtilizado", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Checklist de Salida:</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" disabled={!isCalle} {...register("panelesAInstalacion")} />
                <span className="text-sm text-gray-700">Paneles asignados a Instalación</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" disabled={!isCalle} {...register("znaAfectaciones")} />
                <span className="text-sm text-gray-700">Zona cubierta por Afectaciones</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" disabled={!isCalle} {...register("motosSoporte")} />
                <span className="text-sm text-gray-700">Motos operativas para Soporte</span>
              </label>
            </div>
            {/* Lógica Condicional: Motivo de retraso requerido */}
            {(!formValues.panelesAInstalacion || !formValues.znaAfectaciones || !formValues.motosSoporte) && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-red-600 mb-1">Motivo del Retraso (Requerido)*</label>
                <textarea disabled={!isCalle} {...register("motivoRetraso")} className="block w-full rounded-md border-red-300 shadow-sm p-2 border focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100" />
                {errors.motivoRetraso && <p className="text-red-500 text-xs mt-1">{errors.motivoRetraso.message}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-xs font-medium text-gray-700">Cuadrillas Visitadas</label>
              <input type="number" disabled={!isCalle} {...register("cuadrillasVisitadas", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Fallas Reparadas</label>
              <input type="number" disabled={!isCalle} {...register("fallasReparadas", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Apoyo en Calle</label>
              <input type="number" disabled={!isCalle} {...register("apoyoEnCalle", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Novedades de Seguridad</label>
              <input type="text" disabled={!isCalle} {...register("novedadesSeguridad")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
          </div>
        </section>

        {/* --- SECCIÓN 3: ALMACÉN (Solo ROLE_ALMACEN) --- */}
        <section className={`p-4 rounded-md border ${isAlmacen ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">3. Almacén y Equipos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Discrepancias Fibra */}
            <div className="p-3 border rounded-md bg-white">
              <h3 className="text-sm font-medium mb-2 text-gray-800">Discrepancias en Fibra</h3>
              <label className="block text-xs font-medium text-gray-700">Cantidad (Diferencia de carretes)</label>
              <input type="number" disabled={!isAlmacen} {...register("discrepanciasFibraValor", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100 mb-2" />
              <label className="block text-xs font-medium text-gray-700">Motivo / Descripción</label>
              <input type="text" disabled={!isAlmacen} {...register("discrepanciasFibraMotivo")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>

            {/* Equipos Dañados */}
            <div className="p-3 border rounded-md bg-white">
              <h3 className="text-sm font-medium mb-2 text-gray-800">Equipos Dañados o Perdidos</h3>
              <label className="block text-xs font-medium text-gray-700">Cantidad</label>
              <input type="number" disabled={!isAlmacen} {...register("equiposDañadosPerdidosValor", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100 mb-2" />
              <label className="block text-xs font-medium text-gray-700">Motivo / Descripción</label>
              <input type="text" disabled={!isAlmacen} {...register("equiposDañadosPerdidosMotivo")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>

            {/* Discrepancias Calidad */}
            <div className="p-3 border rounded-md bg-white">
              <h3 className="text-sm font-medium mb-2 text-gray-800">Discrepancias de Calidad</h3>
              <label className="block text-xs font-medium text-gray-700">Cantidad</label>
              <input type="number" disabled={!isAlmacen} {...register("discrepanciasCalidadValor", { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100 mb-2" />
              <label className="block text-xs font-medium text-gray-700">Motivo / Descripción</label>
              <input type="text" disabled={!isAlmacen} {...register("discrepanciasCalidadMotivo")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>

            {/* Inspecciones Auditadas */}
            <div className="p-3 border rounded-md bg-white">
              <h3 className="text-sm font-medium mb-2 text-gray-800">Auditorías</h3>
              <label className="block text-xs font-medium text-gray-700">IDs de Inspecciones Auditadas (Separados por coma)</label>
              <input type="text" disabled={!isAlmacen} placeholder="ej. INS-001, INS-002" {...register("inspeccionesAuditadasIds")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100" />
            </div>
          </div>
        </section>

        {/* --- SECCIÓN 4: CIERRE (Compartido) --- */}
        <section className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">4. Cierre</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Solicitudes Externas</label>
            <textarea {...register("solicitudesExternas")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border h-24" />
          </div>
        </section>

        {/* ACCIONES */}
        <div className="flex justify-end pt-4 border-t gap-4">
          <button
            type="button"
            onClick={handleSubmit(onSignOff)}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Firmar mi sección ({usuarioActual.rol})
          </button>
        </div>
      </form>
    </div>
  );
}
