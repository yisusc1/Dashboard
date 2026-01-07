"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle, Pencil, Send, Trash2, User, Wifi, Cloud, PenTool, Ruler, LayoutGrid, Home, MapPin, Router } from "lucide-react"
import { toast } from "sonner"
import { AutoFillButton } from "@/components/auto-fill-button"
import { Switch } from "@/components/ui/switch"

type Client = {
  id: string
  nombre: string
  cedula: string
  direccion: string
  plan: string
  equipo?: string
  onu?: string
}

type ClientFormProps = {
  client: Client
  phase: "assignment" | "review" | "closure"
  onBack: () => void
  onPhaseComplete: (nextPhase: "review" | "closure" | null) => void
  teamData?: { name: string, partner: string, members: string[] } | null
}

export function ClientForm({ client, phase, onBack, onPhaseComplete, teamData }: ClientFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successData, setSuccessData] = useState<any>(null)
  const [lastRecordId, setLastRecordId] = useState<string | null>(null)
  const [reportBlob, setReportBlob] = useState<Blob | null>(null)
  const router = useRouter()
  const [formData, setFormData] = useState({
    // Phase 1: Asignación
    equipo: client.equipo || teamData?.name || "",
    cliente: client.nombre,
    cedula: client.cedula,
    onu: client.onu || "",
    plan: client.plan,
    tecnico_1: teamData && teamData.members.length > 0 ? teamData.members[0] : "",
    tecnico_2: teamData && teamData.members.length > 1 ? teamData.members[1] : "",

    // Phase 2: Revisión
    ubicacion: "",
    precinto: "",
    mac_onu: "",
    caja_nap: "",
    cant_puertos: "",
    puerto_conectado: "",
    coordenadas: "",
    potencia_nap: "",
    potencia_cliente: "",
    observacion: "",

    // Phase 3: Cierre
    router: "",
    mac_router: "",
    power_go: "ACTIVO",
    motivo_power_go: "",
    estatus: "Activo",
    v_descarga: "",
    v_subida: "",
    codigo_carrete: "",
    conectores: "",
    metraje_usado: "",
    metraje_desechado: "",
    tensores: "",
    patchcord: false,
    rosetas: false,
    venta_router: false,
    router_serial: "",
    observacion_final: "",
  })

  // [New] Spools State
  const [mySpools, setMySpools] = useState<{ serial: string, label: string, remaining?: number }[]>([])

  useEffect(() => {
    // Load Spools on Mount
    if (phase === 'closure') {
      import("@/app/tecnicos/actions").then(({ getMySpools }) => {
        getMySpools().then(setMySpools)
      })
    }
  }, [phase])

  useEffect(() => {
    setSuccess(false)
    setSuccessData(null)
    setLastRecordId(null)

    const loadPhaseData = async () => {
      const supabase = createClient()
      setLoading(true)

      try {
        let currentData = null
        let assignmentData = null
        let reviewData = null

        let tableName = ""
        if (phase === "assignment") tableName = "asignaciones"
        else if (phase === "review") tableName = "revisiones"
        else if (phase === "closure") tableName = "cierres"

        const { data: current, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("cliente_id", client.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error("Error fetching phase data:", error)
        } else if (current) {
          setLastRecordId(current.id)
          currentData = current
        }

        if (phase === 'review' || phase === 'closure') {
          const { data } = await supabase
            .from("asignaciones")
            .select("*")
            .eq("cliente_id", client.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (data) {
            assignmentData = data
          } else if (phase === 'review') {
            toast.error("Debe completar la fase de Asignación antes de continuar.")
            onBack()
            return
          }
        }

        if (phase === 'closure') {
          const { data } = await supabase
            .from("revisiones")
            .select("*")
            .eq("cliente_id", client.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (data) {
            reviewData = data
          } else if (phase === 'closure') {
            toast.error("Debe completar la fase de Revisión antes de continuar.")
            onBack()
            return
          }
        }

        let newData = {}

        if (currentData) {
          newData = { ...currentData }
          if (phase === "closure" && currentData.zona) newData = { ...newData, ubicacion: currentData.zona }
          if (phase === "closure" && currentData.puerto) newData = { ...newData, puerto_conectado: currentData.puerto }
        }

        if (assignmentData) {
          // [Fix] Prioritize Assignment Data for Immutable Fields (ONU, Plan, etc.) unless explicitly saved in Closure
          newData = { ...newData, ...assignmentData }

          // Re-apply Closure data if it exists to respect edits, BUT ensure ONU persists if closure has it empty/null
          if (currentData) {
            const keys = Object.keys(currentData)
            keys.forEach(k => {
              // Strict Garbage Filter: Don't let --- or N/A overwrite valid Assignment data
              const val = currentData[k]
              const isGarbage = val === null || val === "" || val === "N/A" || val === "---" || val === " "

              if (!isGarbage) {
                newData[k] = currentData[k]
              }
            })
          }
        }

        if (reviewData) {
          newData = { ...newData, ...reviewData }
        }

        setFormData(prev => {
          const sanitizedNewData = { ...(newData as any) }
          Object.keys(sanitizedNewData).forEach((key) => {
            if (sanitizedNewData[key] === null || sanitizedNewData[key] === undefined) {
              sanitizedNewData[key] = ""
            }
          })

          return {
            ...prev,
            ...sanitizedNewData,
            patchcord: (newData as any).patchcord === "Si" || (newData as any).patchcord === true,
            rosetas: (newData as any).rosetas === "Si" || (newData as any).rosetas === true,
            venta_router: !!((newData as any).router && (newData as any).router !== "N/A"),
            router_serial: ((newData as any).router && (newData as any).router !== "N/A" ? (newData as any).router : "") || "",
            mac_router: ((newData as any).mac_router && (newData as any).ma_router !== "N/A" ? (newData as any).mac_router : "") || "",
            motivo_power_go: ((newData as any).motivo_power_go && (newData as any).motivo_power_go !== "N/A" ? (newData as any).motivo_power_go : "") || "",
          }
        })

      } catch (err) {
        console.error("Error in loadPhaseData:", err)
      } finally {
        setLoading(false)
      }
    }

    loadPhaseData()

  }, [client.id, phase, onBack])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  // Handle Switch Change specifically
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const capturarUbicacion = () => {
    if (navigator.geolocation) {
      toast.info("Obteniendo ubicación...")
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setFormData((prev) => ({
            ...prev,
            coordenadas: `${latitude}, ${longitude}`,
          }))
          toast.success("Ubicación capturada")
        },
        (error) => {
          console.error("Error geolocation:", error)
          toast.error("Error al obtener ubicación. Verifique permisos.")
        },
      )
    } else {
      toast.error("Geolocalización no soportada por el navegador.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("No usuario autenticado")

      let error = null
      let insertedData = null

      if (phase === "assignment") {
        const { data, error: err } = lastRecordId
          ? await supabase
            .from("asignaciones")
            .update({
              tecnico_1: formData.tecnico_1,
              tecnico_2: formData.tecnico_2,
            })
            .eq("id", lastRecordId)
            .select()
            .single()
          : await supabase
            .from("asignaciones")
            .insert([
              {
                cliente_id: client.id,
                user_id: user.id,
                tecnico_1: formData.tecnico_1,
                tecnico_2: formData.tecnico_2,
                cliente: formData.cliente,
                cedula: formData.cedula,
                equipo: formData.equipo,
                plan: formData.plan,
                onu: formData.onu,
              },
            ])
            .select()
            .single()
        error = err
        insertedData = data
      } else if (phase === "review") {
        const { data, error: err } = lastRecordId
          ? await supabase
            .from("revisiones")
            .update({
              ubicacion: formData.ubicacion,
              precinto: formData.precinto,
              mac_onu: formData.mac_onu,
              caja_nap: formData.caja_nap,
              cant_puertos: formData.cant_puertos,
              puerto_conectado: formData.puerto_conectado,
              coordenadas: formData.coordenadas,
              potencia_nap: formData.potencia_nap,
              potencia_cliente: formData.potencia_cliente,
              observacion: formData.observacion,

              // [Fix] Context Fields Persistence for UPDATE
              equipo: formData.equipo,
              cliente: formData.cliente,
              cedula: formData.cedula,
              plan: formData.plan,
              onu: formData.onu,
            })
            .eq("id", lastRecordId)
            .select()
            .single()
          : await supabase
            .from("revisiones")
            .insert([
              {
                cliente_id: client.id,
                user_id: user.id,
                ubicacion: formData.ubicacion,
                precinto: formData.precinto,
                mac_onu: formData.mac_onu,
                caja_nap: formData.caja_nap,
                cant_puertos: formData.cant_puertos,
                puerto_conectado: formData.puerto_conectado,
                coordenadas: formData.coordenadas,
                potencia_nap: formData.potencia_nap,
                potencia_cliente: formData.potencia_cliente,
                observacion: formData.observacion,

                // [Fix] Context Fields Persistence
                equipo: formData.equipo,
                cliente: formData.cliente,
                cedula: formData.cedula,
                plan: formData.plan,
                onu: formData.onu,
              },
            ])
            .select()
            .single()
        error = err
        insertedData = data
      } else if (phase === "closure") {
        const { data, error: err } = lastRecordId
          ? await supabase
            .from("cierres")
            .update({
              tecnico_id: user.id, // Support Legacy/Dual
              equipo: formData.equipo,
              tecnico_1: formData.tecnico_1,
              tecnico_2: formData.tecnico_2,
              onu: formData.onu,
              cliente: formData.cliente,
              cedula: formData.cedula,
              plan: formData.plan,
              zona: formData.ubicacion, // Map ubicacion to zona
              caja_nap: formData.caja_nap,
              potencia_nap: formData.potencia_nap,
              potencia_cliente: formData.potencia_cliente,
              puerto: formData.puerto_conectado,
              precinto: formData.precinto, // [Fix] Persist Precinto

              router: formData.venta_router ? formData.router_serial : "N/A",
              mac_router: formData.venta_router ? formData.mac_router : "N/A",
              power_go: formData.power_go,
              motivo_power_go: formData.power_go === "INACTIVO" ? formData.motivo_power_go : "N/A",
              v_descarga: formData.v_descarga,
              v_subida: formData.v_subida,
              codigo_carrete: formData.codigo_carrete,
              conectores: formData.conectores,
              metraje_usado: formData.metraje_usado,
              metraje_desechado: formData.metraje_desechado,
              tensores: formData.tensores,
              patchcord: formData.patchcord ? "Si" : "No",
              rosetas: formData.rosetas ? "Si" : "No",
              observacion_final: formData.observacion_final,
            })
            .eq("id", lastRecordId)
            .select()
            .single()
          : await supabase
            .from("cierres")
            .insert([
              {
                cliente_id: client.id,
                user_id: user.id,
                tecnico_id: user.id,

                equipo: formData.equipo,
                tecnico_1: formData.tecnico_1,
                tecnico_2: formData.tecnico_2,
                onu: formData.onu,
                cliente: formData.cliente,
                cedula: formData.cedula,
                plan: formData.plan,
                zona: formData.ubicacion,
                caja_nap: formData.caja_nap,
                potencia_nap: formData.potencia_nap,
                potencia_cliente: formData.potencia_cliente,
                puerto: formData.puerto_conectado,
                precinto: formData.precinto, // [Fix] Persist Precinto

                router: formData.venta_router ? formData.router_serial : "N/A",
                mac_router: formData.venta_router ? formData.mac_router : "N/A",
                power_go: formData.power_go,
                motivo_power_go: formData.power_go === "INACTIVO" ? formData.motivo_power_go : "N/A",
                estatus: "Activo",
                v_descarga: formData.v_descarga,
                v_subida: formData.v_subida,
                codigo_carrete: formData.codigo_carrete,
                conectores: formData.conectores,
                metraje_usado: formData.metraje_usado,
                metraje_desechado: formData.metraje_desechado,
                tensores: formData.tensores,
                patchcord: formData.patchcord ? "Si" : "No",
                rosetas: formData.rosetas ? "Si" : "No",
                observacion_final: formData.observacion_final,
              },
            ])
            .select()
            .single()
        error = err
        insertedData = data
      }

      if (error) throw error

      setSuccessData(insertedData)
      setSuccess(true)
      toast.success("Fase guardada correctamente")

    } catch (error: any) {
      console.error("Error saving phase:", error)
      toast.error("Error al guardar: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full h-11 px-3 rounded-xl border border-zinc-200 bg-white text-sm focus:ring-1 focus:ring-black focus:border-black transition-all"
  const labelClass = "block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wide"

  const handleWhatsApp = () => {
    let message = ""
    const currentDate = new Date().toLocaleDateString("es-ES")
    const currentTime = new Date().toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit', hour12: true })

    if (phase === "assignment") {
      message = `*Solicitud de asignación*\n\n` +
        `*Equipo:* ${formData.equipo}\n` +
        `*Cliente:* ${formData.cliente}\n` +
        `*Cédula:* ${formData.cedula}\n` +
        `*ONU:* ${formData.onu || 'N/A'}\n` +
        `*Plan:* ${formData.plan}\n\n` +
        `*Técnico 1:* ${formData.tecnico_1}\n` +
        `*Técnico 2:* ${formData.tecnico_2}`
    } else if (phase === "review") {
      message = `*Solicitud De Revisión*\n\n` +
        `*Equipo:* ${formData.equipo || client.equipo}\n` +
        `*Cliente:* ${client.nombre}\n` +
        `*Ubicación:* ${formData.ubicacion}\n` +
        `*Cédula:* ${client.cedula}\n` +
        `*Precinto:* ${formData.precinto}\n` +
        `*PON/ONU:* ${formData.onu || client.onu || 'N/A'}\n` +
        `*MAC ONU:* ${formData.mac_onu}\n` +
        `*Plan:* ${formData.plan || client.plan}\n` +
        `*Caja-Nap:* ${formData.caja_nap}\n` +
        `*Cantidad De Puertos:* ${formData.cant_puertos}\n` +
        `*Puerto Conectado:* ${formData.puerto_conectado}\n` +
        `*Coordenadas:* ${formData.coordenadas}\n` +
        `*Potencia Nap:* ${formData.potencia_nap}\n` +
        `*Potencia Cliente:* ${formData.potencia_cliente}\n` +
        `*Observación:* ${formData.observacion}`
    } else if (phase === "closure") {
      message = `*Reporte de Instalación*\n\n` +
        `*Fecha:* ${currentDate}\n` +
        `*Hora:* ${currentTime}\n` +
        `*Equipo:* ${formData.equipo || client.equipo}\n` +
        `*Precinto:* ${formData.precinto}\n` +
        `*Cliente:* ${client.nombre}\n` +
        `*Cédula:* ${client.cedula}\n` +
        `*ONU:* ${formData.onu || client.onu || 'N/A'}\n` +
        `*Carrete:* ${formData.codigo_carrete}\n` +
        `*Router:* ${formData.venta_router ? formData.router_serial : 'N/A'}\n` +
        `*MAC:* ${formData.venta_router ? formData.mac_router : 'N/A'}\n` +
        `*Zona:* ${formData.ubicacion}\n` +
        `*Power Go:* ${formData.power_go}\n` +
        `*Estatus:* ${formData.estatus}\n` +
        `*Plan:* ${formData.plan || client.plan}\n` +
        `*V. Descarga:* ${formData.v_descarga}\n` +
        `*V. Subida:* ${formData.v_subida}\n` +
        `*Puerto:* ${formData.puerto_conectado}\n` +
        `*Caja NAP:* ${formData.caja_nap}\n` +
        `*Potencia NAP:* ${formData.potencia_nap}\n` +
        `*Potencia Cliente:* ${formData.potencia_cliente}\n` +
        `*Conectores Utilizados:* ${formData.conectores}\n` +
        `*Metraje Utilizado:* ${formData.metraje_usado}\n` +
        `*Metraje Desechado:* ${formData.metraje_desechado}\n` +
        `*Tensores Utilizados:* ${formData.tensores}\n` +
        `*Patchcord Utilizado:* ${formData.patchcord ? 'Si' : 'No'}\n` +
        `*Rosetas Utilizadas:* ${formData.rosetas ? 'Si' : 'No'}\n` +
        `*Técnico 1:* ${formData.tecnico_1}\n` +
        `*Técnico 2:* ${formData.tecnico_2}\n` +
        `*Observación:* ${formData.observacion_final}\n` +
        `*Motivo Power Go:* ${formData.power_go === 'INACTIVO' ? formData.motivo_power_go : ''}`
    }

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  if (success) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-none shadow-xl bg-white overflow-hidden">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2">
              <CheckCircle size={40} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">¡Fase Completada!</h2>
              <p className="text-zinc-500">La información ha sido registrada exitosamente.</p>
            </div>

            <div className="pt-4 space-y-3">
              <Button onClick={handleWhatsApp} className="w-full h-12 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#128C7E] flex items-center justify-center gap-2">
                <Send size={18} />
                Enviar a WhatsApp
              </Button>

              {(phase === 'assignment' || phase === 'review') ? (
                <Button onClick={() => onPhaseComplete(phase === 'assignment' ? 'review' : 'closure')} className="w-full h-12 rounded-xl bg-black text-white font-bold hover:bg-zinc-800">
                  Continuar a Siguiente Fase
                </Button>
              ) : (
                <Button onClick={() => onPhaseComplete(null)} className="w-full h-12 rounded-xl bg-black text-white font-bold hover:bg-zinc-800">
                  Finalizar Todo
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => setSuccess(false)} variant="outline" className="w-full h-12 rounded-xl font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                  <Pencil size={18} className="mr-2" />
                  Editar
                </Button>
                <Button onClick={onBack} variant="ghost" className="w-full h-12 rounded-xl text-zinc-500 hover:text-zinc-900 font-medium">
                  Volver
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-2 sm:p-4 pb-20">
      <AutoFillButton
        phase={phase}
        onFill={(d) => setFormData((prev) => {
          const newState = { ...prev, ...d }
          if (phase === 'closure' && mySpools.length > 0 && !newState.codigo_carrete) {
            newState.codigo_carrete = mySpools[0].serial
          }
          return newState
        })}
      />
      <div className="max-w-xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-6 font-medium transition-colors text-sm"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center">
            <ArrowLeft size={16} />
          </div>
          <span>Volver</span>
        </button>

        <Card className="rounded-[24px] border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-zinc-100 py-5 px-6 bg-white">
            <CardTitle className="text-xl font-bold text-zinc-900">
              {phase === "assignment" && "Fase 1: Asignación"}
              {phase === "review" && "Fase 2: Revisión"}
              {phase === "closure" && "Fase 3: Cierre"}
            </CardTitle>
            <p className="text-zinc-400 font-medium text-sm mt-0.5">
              {client.nombre}
            </p>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* READ ONLY INFO */}
              <div className="grid grid-cols-2 gap-3 bg-zinc-50/80 p-4 rounded-2xl border border-zinc-100">
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Equipo</span>
                  <span className="font-semibold text-zinc-900 text-sm">{formData.equipo || client.equipo}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Plan</span>
                  <span className="font-semibold text-zinc-900 text-sm">{formData.plan || client.plan}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-zinc-100">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">ONU Serial</span>
                  <input className="w-full bg-transparent font-mono text-sm font-medium text-zinc-900 border-none p-0 focus:ring-0" name="onu" value={formData.onu} onChange={handleChange} placeholder="---" />
                </div>
              </div>

              {phase === "assignment" && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Técnico 1 *</label>
                    <input name="tecnico_1" value={formData.tecnico_1} onChange={handleChange} required className={`${inputClass} ${teamData?.members[0] ? 'bg-zinc-100 text-zinc-500' : ''}`} readOnly={!!teamData?.members[0]} placeholder="Nombre del técnico" />
                  </div>
                  <div>
                    <label className={labelClass}>Técnico 2 *</label>
                    <input name="tecnico_2" value={formData.tecnico_2} onChange={handleChange} required className={`${inputClass} ${teamData?.members[1] ? 'bg-zinc-100 text-zinc-500' : ''}`} readOnly={!!teamData?.members[1]} placeholder="Nombre del técnico" />
                  </div>
                </div>
              )}

              {phase === "review" && (
                <div className="space-y-5">
                  <div>
                    <label className={labelClass}>Ubicación / Zona *</label>
                    <input name="ubicacion" value={formData.ubicacion} onChange={handleChange} required className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Precinto *</label>
                      <input name="precinto" value={formData.precinto} onChange={handleChange} required className={inputClass} maxLength={8} />
                    </div>
                    <div>
                      <label className={labelClass}>MAC ONU *</label>
                      <input name="mac_onu" value={formData.mac_onu} onChange={handleChange} required className={inputClass} placeholder="XX:XX:..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Caja NAP *</label>
                      <input name="caja_nap" value={formData.caja_nap} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Puerto *</label>
                      <input name="puerto_conectado" value={formData.puerto_conectado} onChange={handleChange} required className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Cant. Puertos NAP *</label>
                    <input type="number" min="0" name="cant_puertos" value={formData.cant_puertos} onChange={handleChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Coordenadas</label>
                    <div className="flex gap-2">
                      <input name="coordenadas" value={formData.coordenadas} readOnly className={`${inputClass} bg-zinc-50 text-zinc-500`} />
                      <Button type="button" onClick={capturarUbicacion} size="icon" className="h-11 w-11 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 shrink-0">
                        <MapPin size={20} />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Potencia Nap *</label>
                      <input name="potencia_nap" value={formData.potencia_nap} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Potencia Cliente *</label>
                      <input name="potencia_cliente" value={formData.potencia_cliente} onChange={handleChange} required className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Observación</label>
                    <textarea name="observacion" value={formData.observacion} onChange={handleChange} className={`${inputClass} h-24 py-2 resize-none`} />
                  </div>
                </div>
              )}

              {phase === "closure" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>V. Descarga</label>
                      <input name="v_descarga" value={formData.v_descarga} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>V. Subida</label>
                      <input name="v_subida" value={formData.v_subida} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>

                  {/* Spool */}
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <label className="text-xs font-bold text-blue-600 mb-1.5 uppercase block">Bobina Utilizada *</label>
                    <select name="codigo_carrete" value={formData.codigo_carrete} onChange={handleChange} required className={`${inputClass} border-blue-200 bg-white`}>
                      <option value="">Seleccione Bobina...</option>
                      {mySpools.map((s) => (
                        <option key={s.serial} value={s.serial}>{s.label}</option>
                      ))}
                    </select>
                    {mySpools.length === 0 && (
                      <p className="text-red-500 text-[10px] mt-1 font-medium">⚠ Sin bobinas asignadas.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Metraje Usado *</label>
                      <input name="metraje_usado" value={formData.metraje_usado} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Merma *</label>
                      <input name="metraje_desechado" value={formData.metraje_desechado} onChange={handleChange} required className={`${inputClass} text-red-600`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Conectores *</label>
                      <input name="conectores" value={formData.conectores} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Tensores</label>
                      <input name="tensores" value={formData.tensores} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Power Go</label>
                      <select name="power_go" value={formData.power_go} onChange={handleChange} className={inputClass}>
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="INACTIVO">INACTIVO</option>
                      </select>
                    </div>
                    {formData.power_go === "INACTIVO" && (
                      <div className="animate-in slide-in-from-top-2 fade-in">
                        <label className={labelClass}>Motivo</label>
                        <input name="motivo_power_go" value={formData.motivo_power_go} onChange={handleChange} required className={inputClass} />
                      </div>
                    )}
                  </div>

                  {/* SWITCHES SECTION */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-zinc-900">Patchcord</h4>
                        <p className="text-[10px] text-zinc-400">¿Se utilizó?</p>
                      </div>
                      <Switch checked={formData.patchcord} onCheckedChange={(c) => handleSwitchChange('patchcord', c)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-zinc-900">Roseta</h4>
                        <p className="text-[10px] text-zinc-400">¿Se instaló?</p>
                      </div>
                      <Switch checked={formData.rosetas} onCheckedChange={(c) => handleSwitchChange('rosetas', c)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-zinc-900">Venta Router</h4>
                        <p className="text-[10px] text-zinc-400">¿Cliente compró?</p>
                      </div>
                      <Switch checked={formData.venta_router} onCheckedChange={(c) => handleSwitchChange('venta_router', c)} />
                    </div>
                  </div>

                  {formData.venta_router && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-300 space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <div>
                        <label className="text-xs font-bold text-purple-600 mb-1.5 uppercase block">Serial Router</label>
                        <input name="router_serial" value={formData.router_serial} onChange={handleChange} className={`${inputClass} border-purple-200 bg-white`} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-purple-600 mb-1.5 uppercase block">MAC Router</label>
                        <input name="mac_router" value={formData.mac_router} onChange={handleChange} className={`${inputClass} border-purple-200 bg-white`} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Observación Final</label>
                    <textarea name="observacion_final" value={formData.observacion_final} onChange={handleChange} className={`${inputClass} h-24 py-2 resize-none`} />
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button type="submit" disabled={loading} className="w-full h-14 bg-black text-white text-lg font-bold rounded-2xl hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-lg shadow-zinc-200">
                  {loading ? "Guardando..." : "Guardar Registro"}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
