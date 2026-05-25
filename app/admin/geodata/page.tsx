"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { addGeodata, deleteGeodata } from "./actions";
import { ChevronRight, MapPin, Trash2, Folder, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Geodata {
  estado: string;
  municipio: string;
  parroquia: string;
  sector: string;
}

export default function GeodataManagement() {
  const [data, setData] = useState<Geodata[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState(0); // 0: Estado, 1: Municipio, 2: Parroquia, 3: Sector
  const [selection, setSelection] = useState({ estado: "", municipio: "", parroquia: "", sector: "" });
  const [newItemName, setNewItemName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    const { data: zonas, error } = await supabase.from('zonas_operativas').select('*');
    if (!error && zonas) setData(zonas as Geodata[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const items = useMemo(() => {
    let filtered = data;
    if (level > 0) filtered = filtered.filter(item => item.estado === selection.estado);
    if (level > 1) filtered = filtered.filter(item => item.municipio === selection.municipio);
    if (level > 2) filtered = filtered.filter(item => item.parroquia === selection.parroquia);

    const key = level === 0 ? 'estado' : level === 1 ? 'municipio' : level === 2 ? 'parroquia' : 'sector';
    
    // Extraer únicos y evitar vacíos
    const uniqueVals = Array.from(new Set(filtered.map(item => item[key as keyof Geodata]))).filter(Boolean);
    return uniqueVals.sort();
  }, [data, level, selection]);

  const handleNavigate = (val: string) => {
    if (level === 0) setSelection({ estado: val, municipio: "", parroquia: "", sector: "" });
    else if (level === 1) setSelection({ ...selection, municipio: val, parroquia: "", sector: "" });
    else if (level === 2) setSelection({ ...selection, parroquia: val, sector: "" });
    
    if (level < 3) setLevel(level + 1);
  };

  const handleBreadcrumbClick = (targetLevel: number) => {
    setLevel(targetLevel);
    if (targetLevel === 0) setSelection({ estado: "", municipio: "", parroquia: "", sector: "" });
    else if (targetLevel === 1) setSelection({ ...selection, municipio: "", parroquia: "", sector: "" });
    else if (targetLevel === 2) setSelection({ ...selection, parroquia: "", sector: "" });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        estado: level === 0 ? newItemName.trim() : selection.estado,
        municipio: level === 1 ? newItemName.trim() : (level > 0 ? selection.municipio : ""),
        parroquia: level === 2 ? newItemName.trim() : (level > 1 ? selection.parroquia : ""),
        sector: level === 3 ? newItemName.trim() : (level > 2 ? selection.sector : "")
      };

      await addGeodata(payload);
      toast.success("Añadido correctamente");
      setNewItemName("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al añadir");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de eliminar "${val}" y todo su contenido interno?`)) return;

    try {
      await deleteGeodata(level, selection, val);
      toast.success("Eliminado correctamente");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar");
    }
  };

  const levelName = level === 0 ? "Estado" : level === 1 ? "Municipio" : level === 2 ? "Parroquia" : "Sector";

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 min-h-screen">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-sm overflow-x-auto pb-2">
        <button onClick={() => handleBreadcrumbClick(0)} className={`whitespace-nowrap transition-colors ${level === 0 ? 'text-zinc-900 font-bold dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}>
          Zonas Operativas
        </button>
        {level > 0 && (
          <>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
            <button onClick={() => handleBreadcrumbClick(1)} className={`whitespace-nowrap transition-colors ${level === 1 ? 'text-zinc-900 font-bold dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {selection.estado}
            </button>
          </>
        )}
        {level > 1 && (
          <>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
            <button onClick={() => handleBreadcrumbClick(2)} className={`whitespace-nowrap transition-colors ${level === 2 ? 'text-zinc-900 font-bold dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {selection.municipio}
            </button>
          </>
        )}
        {level > 2 && (
          <>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-900 font-bold dark:text-zinc-100 whitespace-nowrap">
              {selection.parroquia}
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Lado Izquierdo: Creación */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border-dashed border-2 border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">Añadir {levelName}</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <input 
                type="text" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`Nombre del ${levelName}`}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button 
                type="submit" 
                disabled={isSubmitting || !newItemName.trim()}
                className="w-full h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Guardar
              </button>
            </form>
          </div>

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 text-[11px] text-zinc-500 leading-relaxed">
            Estás gestionando el nivel de <strong>{levelName}</strong>. 
            Cualquier elemento eliminado borrará en cascada todas las zonas que dependan internamente de él.
          </div>
        </div>

        {/* Lado Derecho: Grid de Tarjetas */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-dashed border-2 border-zinc-100 dark:border-zinc-800 rounded-3xl">
              <MapPin className="w-12 h-12 text-zinc-300 mb-3" />
              <p className="text-zinc-500 text-sm">No hay datos en este nivel</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((val) => (
                <div 
                  key={val} 
                  onClick={() => handleNavigate(val)}
                  className="group relative flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                      {level === 3 ? <MapPin className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{val}</span>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDelete(val, e)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
