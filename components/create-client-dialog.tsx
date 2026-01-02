"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import { toast } from "sonner"

type CreateClientDialogProps = {
  isOpen: boolean
  onClose: () => void
  onClientCreated: () => void
  teamName?: string
  availableOnus?: string[]
  restrictionsEnabled?: boolean
}

export function CreateClientDialog({ isOpen, onClose, onClientCreated, teamName, availableOnus = [], restrictionsEnabled = true }: CreateClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    cedula: "",
    plan: "",
    equipo: teamName || "",
    onu: "",
  })

  // Update formData when teamName changes (if props update while open)
  if (teamName && formData.equipo !== teamName) {
    setFormData(prev => ({ ...prev, equipo: teamName }))
  }

  const planes = [
    "400MB Residencial",
    "600MB Residencial",
    "800MB Residencial",
    "400MB Empresarial",
    "600MB Empresarial",
    "800MB Empresarial",
    "1GB Empresarial",
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target

    if (name === "onu") {
      // Force uppercase and remove non-alphanumeric characters
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15) // increased length for serials
    }

    setFormData({
      ...formData,
      [name]: value,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.from("clientes").insert({
        nombre: formData.nombre,
        cedula: formData.cedula,
        direccion: "Pendiente de Revisión", // Inicializar como pendiente
        plan: formData.plan,
        equipo: formData.equipo,
        onu: formData.onu,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })

      if (error) throw error

      setFormData({ nombre: "", cedula: "", plan: "", equipo: teamName || "", onu: "" })
      onClientCreated()
      onClose()
      toast.success("Cliente creado exitosamente")
    } catch (error) {
      console.error("Error creating client:", error)
      if (typeof error === "object" && error !== null) {
        // @ts-ignore
        if (error.code === '23505') {
          toast.error("Esta cédula de cliente ya ha sido utilizada.")
        } else {
          console.error("Error Details:", JSON.stringify(error, null, 2))
          // @ts-ignore
          if (error.message) console.error("Error Message:", error.message)
          // @ts-ignore
          toast.error(`Error: ${error.message || "Error desconocido al crear el cliente"}`)
        }
      } else {
        toast.error("Error al crear el cliente")
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg rounded-[32px] border-none shadow-2xl bg-white overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-6 pt-6 px-6 border-b border-zinc-100">
          <CardTitle className="text-xl font-bold text-zinc-900">Crear Nuevo Cliente</CardTitle>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-50 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-900 mb-2 pl-1">Nombre Completo</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full h-14 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-900 mb-2 pl-1">Cédula</label>
              <input
                type="text"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                required
                className="w-full h-14 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                placeholder="V-12345678"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-900 mb-2 pl-1">Plan</label>
              <div className="relative">
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  required
                  className="w-full h-14 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-lg text-zinc-900 appearance-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                >
                  <option value="" className="text-zinc-400">Seleccionar Plan...</option>
                  {planes.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-900 mb-2 pl-1">Equipo</label>
                <input
                  type="text"
                  name="equipo"
                  value={formData.equipo}
                  readOnly
                  className="w-full h-14 px-4 bg-zinc-100 border border-zinc-200 rounded-2xl text-lg text-zinc-500 focus:outline-none cursor-not-allowed"
                  placeholder="Equipo..."
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2 pl-1">
                  <label className="block text-sm font-semibold text-zinc-900">ONU (Serial)</label>
                  {!restrictionsEnabled && (
                    <button
                      type="button"
                      onClick={() => setManualMode(!manualMode)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {manualMode ? "Seleccionar de Lista" : "Ingresar Manualmente"}
                    </button>
                  )}
                </div>

                {manualMode ? (
                  <input
                    type="text"
                    name="onu"
                    value={formData.onu}
                    onChange={handleChange}
                    required
                    className="w-full h-14 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    placeholder="Ej. ZTEGC123456"
                  />
                ) : (
                  <div className="relative">
                    <select
                      name="onu"
                      value={formData.onu}
                      onChange={handleChange}
                      required
                      className="w-full h-14 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-lg text-zinc-900 appearance-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    >
                      <option value="" className="text-zinc-400">Seleccionar ONU...</option>
                      {availableOnus.map((serial) => (
                        <option key={serial} value={serial}>
                          {serial}
                        </option>
                      ))}
                      {availableOnus.length === 0 && (
                        <option disabled>Sin ONUs disponibles</option>
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-black text-white text-lg font-semibold rounded-2xl hover:bg-zinc-800 active:scale-[0.98] transition-all"
              >
                {loading ? "Creando..." : "Crear Cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
