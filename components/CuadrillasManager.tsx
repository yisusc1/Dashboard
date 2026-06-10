"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Trash2, Edit2, Loader2, Save, X, UserPlus, Users, Wrench } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CuadrillasManager() {
  const supabase = createClient()
  const [cuadrillas, setCuadrillas] = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState<"equipos" | "tecnicos">("equipos")

  // State for Cuadrillas
  const [isAdding, setIsAdding] = useState(false)
  const [newNombre, setNewNombre] = useState("")
  const [newLider, setNewLider] = useState<string>("none")
  const [newAuxiliar, setNewAuxiliar] = useState<string>("none")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editLider, setEditLider] = useState<string>("none")
  const [editAuxiliar, setEditAuxiliar] = useState<string>("none")

  // State for Tecnicos
  const [isAddingTecnico, setIsAddingTecnico] = useState(false)
  const [newTecnicoNombre, setNewTecnicoNombre] = useState("")

  const [editingTecnicoId, setEditingTecnicoId] = useState<string | null>(null)
  const [editTecnicoNombre, setEditTecnicoNombre] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    
    // Fetch tecnicos
    const { data: tecData } = await supabase.from('tecnicos').select('*').order('nombre_completo', { ascending: true })
    if (tecData) {
        setTecnicos(tecData)
    }

    // Fetch cuadrillas
    const { data: cuadData } = await supabase.from('cuadrillas').select('*').order('created_at', { ascending: false })
    if (cuadData) {
        setCuadrillas(cuadData)
    }

    setIsLoading(false)
  }

  // --- TECNICOS CRUD ---
  const handleAddTecnico = async () => {
      if (!newTecnicoNombre.trim()) {
          toast.error("Ingresa el nombre del técnico")
          return
      }
      try {
          const { error } = await supabase.from('tecnicos').insert({ nombre_completo: newTecnicoNombre.trim() })
          if (error) throw error
          toast.success("Técnico registrado")
          setNewTecnicoNombre("")
          setIsAddingTecnico(false)
          loadData()
      } catch (err) {
          toast.error("Error al registrar técnico")
      }
  }

  const handleDeleteTecnico = async (id: string) => {
      if (!confirm("¿Seguro que deseas eliminar este técnico? Si pertenece a un equipo, su espacio quedará como 'Sin asignar'.")) return
      try {
          const { error } = await supabase.from('tecnicos').delete().eq('id', id)
          if (error) throw error
          toast.success("Técnico eliminado")
          loadData()
      } catch (err) {
          toast.error("Error al eliminar técnico")
      }
  }

  const startEditingTecnico = (t: any) => {
      setEditingTecnicoId(t.id)
      setEditTecnicoNombre(t.nombre_completo)
  }

  const handleSaveTecnicoEdit = async () => {
      if (!editTecnicoNombre.trim()) {
          toast.error("El nombre es obligatorio")
          return
      }
      try {
          const { error } = await supabase.from('tecnicos').update({ nombre_completo: editTecnicoNombre.trim() }).eq('id', editingTecnicoId)
          if (error) throw error
          toast.success("Técnico actualizado")
          setEditingTecnicoId(null)
          loadData()
      } catch (err) {
          toast.error("Error al actualizar técnico")
      }
  }

  // --- CUADRILLAS CRUD ---
  const handleAdd = async () => {
    if (!newNombre.trim()) {
        toast.error("El nombre de la cuadrilla es obligatorio")
        return
    }

    try {
        const { error } = await supabase.from('cuadrillas').insert({
            nombre: newNombre.trim(),
            lider_id: newLider && newLider !== "none" ? newLider : null,
            auxiliar_id: newAuxiliar && newAuxiliar !== "none" ? newAuxiliar : null
        })

        if (error) throw error
        toast.success("Cuadrilla creada")
        setNewNombre("")
        setNewLider("none")
        setNewAuxiliar("none")
        setIsAdding(false)
        loadData()
    } catch (err) {
        toast.error("Error al crear cuadrilla")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta cuadrilla?")) return

    try {
        const { error } = await supabase.from('cuadrillas').delete().eq('id', id)
        if (error) throw error
        toast.success("Cuadrilla eliminada")
        loadData()
    } catch (err) {
        toast.error("Error al eliminar")
    }
  }

  const startEditing = (c: any) => {
      setEditingId(c.id)
      setEditNombre(c.nombre)
      setEditLider(c.lider_id || "none")
      setEditAuxiliar(c.auxiliar_id || "none")
  }

  const handleSaveEdit = async () => {
      if (!editNombre.trim()) {
          toast.error("El nombre es obligatorio")
          return
      }

      try {
          const { error } = await supabase.from('cuadrillas').update({
              nombre: editNombre.trim(),
              lider_id: editLider && editLider !== "none" ? editLider : null,
              auxiliar_id: editAuxiliar && editAuxiliar !== "none" ? editAuxiliar : null
          }).eq('id', editingId)

          if (error) throw error
          toast.success("Cuadrilla actualizada")
          setEditingId(null)
          loadData()
      } catch (err) {
          toast.error("Error al actualizar")
      }
  }

  const getTecnicoName = (id: string) => {
      return tecnicos.find(t => t.id === id)?.nombre_completo || "No asignado"
  }

  if (isLoading) {
      return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>
  }

  return (
    <div className="space-y-6">
        
        {/* TABS NAVIGATION */}
        <div className="flex bg-zinc-100 p-1 rounded-2xl w-full max-w-sm mx-auto shadow-inner">
            <button
                onClick={() => setActiveTab("equipos")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "equipos" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
                <Users size={18} /> Equipos
            </button>
            <button
                onClick={() => setActiveTab("tecnicos")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "tecnicos" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
                <Wrench size={18} /> Técnicos
            </button>
        </div>

        {activeTab === "tecnicos" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center bg-white p-6 rounded-[24px] border border-zinc-200 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900">Directorio de Técnicos</h2>
                        <p className="text-zinc-500 text-sm">Administra el personal operativo.</p>
                    </div>
                    {!isAddingTecnico && (
                        <button 
                            onClick={() => setIsAddingTecnico(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-black transition-colors shadow-sm font-medium"
                        >
                            <UserPlus size={18} /> Nuevo Técnico
                        </button>
                    )}
                </div>

                {isAddingTecnico && (
                    <div className="bg-white border border-zinc-200 p-6 rounded-[24px] shadow-sm flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-zinc-900 mb-1">Nombre Completo *</label>
                            <input 
                                type="text" 
                                value={newTecnicoNombre} 
                                onChange={e => setNewTecnicoNombre(e.target.value)} 
                                className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none"
                                placeholder="Ej. Douglas Mayobre"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleAddTecnico} className="h-10 px-6 bg-zinc-900 text-white rounded-xl font-medium hover:bg-black flex-1 sm:flex-none flex items-center justify-center gap-2"><Save size={16}/> Guardar</button>
                            <button onClick={() => setIsAddingTecnico(false)} className="h-10 px-4 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 flex items-center justify-center"><X size={16}/></button>
                        </div>
                    </div>
                )}

                <div className="bg-white border border-zinc-200 rounded-[24px] shadow-sm overflow-hidden">
                    {tecnicos.length === 0 ? (
                        <div className="text-center p-8 text-zinc-500">No hay técnicos registrados.</div>
                    ) : (
                        <ul className="divide-y divide-zinc-100">
                            {tecnicos.map(t => (
                                <li key={t.id} className="p-4 sm:px-6 hover:bg-zinc-50 flex items-center justify-between group transition-colors">
                                    {editingTecnicoId === t.id ? (
                                        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                            <input 
                                                type="text" 
                                                value={editTecnicoNombre} 
                                                onChange={e => setEditTecnicoNombre(e.target.value)} 
                                                className="w-full sm:w-1/2 h-10 px-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-zinc-900 outline-none"
                                                autoFocus
                                            />
                                            <div className="flex items-center gap-2">
                                                <button onClick={handleSaveTecnicoEdit} className="h-10 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2"><Save size={16}/> Guardar</button>
                                                <button onClick={() => setEditingTecnicoId(null)} className="h-10 px-4 bg-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-300 flex items-center"><X size={16}/></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold uppercase">
                                                    {t.nombre_completo.substring(0, 2)}
                                                </div>
                                                <span className="font-semibold text-zinc-900">{t.nombre_completo}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditingTecnico(t)} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDeleteTecnico(t.id)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={18} /></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        )}

        {activeTab === "equipos" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center bg-white p-6 rounded-[24px] border border-zinc-200 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900">Listado de Equipos</h2>
                        <p className="text-zinc-500 text-sm">Organiza a los técnicos en cuadrillas.</p>
                    </div>
                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-black transition-colors shadow-sm font-medium"
                        >
                            <Plus size={18} /> Nueva Cuadrilla
                        </button>
                    )}
                </div>

                {/* REGISTRAR CUADRILLA FORM */}
                {isAdding && (
                    <div className="bg-white border border-zinc-200 p-6 rounded-[24px] shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-4"><h3 className="font-bold text-zinc-900 mb-2">Crear Nuevo Equipo</h3></div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-900 mb-1">Nombre del Equipo *</label>
                            <input 
                                type="text" 
                                value={newNombre} 
                                onChange={e => setNewNombre(e.target.value)} 
                                className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none"
                                placeholder="Ej. Cuadrilla 1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-900 mb-1">Técnico Líder</label>
                            <Select value={newLider} onValueChange={setNewLider}>
                                <SelectTrigger className="h-10 bg-white rounded-xl border-zinc-200"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin Asignar</SelectItem>
                                    {tecnicos.map(t => <SelectItem key={`lid-${t.id}`} value={t.id}>{t.nombre_completo}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-900 mb-1">Técnico Auxiliar</label>
                            <Select value={newAuxiliar} onValueChange={setNewAuxiliar}>
                                <SelectTrigger className="h-10 bg-white rounded-xl border-zinc-200"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin Asignar</SelectItem>
                                    {tecnicos.map(t => <SelectItem key={`aux-${t.id}`} value={t.id}>{t.nombre_completo}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAdd} className="h-10 px-4 bg-zinc-900 text-white rounded-xl font-medium hover:bg-black flex-1 flex items-center justify-center gap-2"><Save size={16}/> Guardar</button>
                            <button onClick={() => setIsAdding(false)} className="h-10 px-4 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-200 flex items-center justify-center"><X size={16}/></button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    {cuadrillas.length === 0 && !isAdding && (
                        <div className="text-center p-8 bg-white rounded-[24px] border border-dashed border-zinc-300 text-zinc-500">
                            No hay cuadrillas registradas.
                        </div>
                    )}

                    {cuadrillas.map(c => (
                        <div key={c.id} className="bg-white border border-zinc-200 p-6 rounded-[24px] shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between hover:shadow-md transition-shadow">
                            {editingId === c.id ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Nombre del Equipo</label>
                                        <input 
                                            type="text" 
                                            value={editNombre} 
                                            onChange={e => setEditNombre(e.target.value)} 
                                            className="w-full h-10 px-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-zinc-900 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Técnico Líder</label>
                                        <Select value={editLider} onValueChange={setEditLider}>
                                            <SelectTrigger className="h-10 bg-white rounded-xl"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin Asignar</SelectItem>
                                                {tecnicos.map(t => <SelectItem key={`elid-${t.id}`} value={t.id}>{t.nombre_completo}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Técnico Auxiliar</label>
                                        <Select value={editAuxiliar} onValueChange={setEditAuxiliar}>
                                            <SelectTrigger className="h-10 bg-white rounded-xl"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin Asignar</SelectItem>
                                                {tecnicos.map(t => <SelectItem key={`eaux-${t.id}`} value={t.id}>{t.nombre_completo}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <button onClick={handleSaveEdit} className="h-10 px-4 bg-zinc-900 text-white rounded-xl hover:bg-black flex-1 flex items-center justify-center gap-2"><Save size={16}/> Guardar</button>
                                        <button onClick={() => setEditingId(null)} className="h-10 px-4 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 flex items-center justify-center"><X size={16}/></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Equipo</p>
                                            <p className="font-bold text-lg text-zinc-900">{c.nombre}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Líder</p>
                                            <p className="font-medium text-zinc-700 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                                                {getTecnicoName(c.lider_id)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Auxiliar</p>
                                            <p className="font-medium text-zinc-700 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                                                {getTecnicoName(c.auxiliar_id)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                                        <button 
                                            onClick={() => startEditing(c)}
                                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(c.id)}
                                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  )
}
