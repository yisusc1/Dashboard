"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import { toast } from "sonner"

type Client = {
    id: string
    nombre: string
    cedula: string
    direccion: string
    plan: string
    equipo?: string
    onu?: string
}

type EditClientDialogProps = {
    isOpen: boolean
    onClose: () => void
    onClientUpdated: () => void
    client: Client | null
}

export function EditClientDialog({ isOpen, onClose, onClientUpdated, client }: EditClientDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nombre: "",
        cedula: "",
        plan: "",
        equipo: "",
        onu: "",
    })

    // Load client data when dialog opens
    useEffect(() => {
        if (client && isOpen) {
            setFormData({
                nombre: client.nombre || "",
                cedula: client.cedula || "",
                plan: client.plan || "",
                equipo: client.equipo || "",
                onu: client.onu || "",
            })
        }
    }, [client, isOpen])

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
            value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
        }

        setFormData({
            ...formData,
            [name]: value,
        })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!client) return

        setLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from("clientes")
                .update({
                    nombre: formData.nombre,
                    cedula: formData.cedula,
                    plan: formData.plan,
                    equipo: formData.equipo,
                    onu: formData.onu,
                })
                .eq("id", client.id)

            if (error) throw error

            onClientUpdated()
            onClose()
            toast.success("Cliente actualizado exitosamente")
        } catch (error) {
            console.error("Error updating client:", error)
            toast.error("Error al actualizar el cliente")
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <Card className="w-full max-w-lg rounded-[32px] border-none shadow-2xl bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-6 pt-6 px-6 border-b border-zinc-100">
                    <CardTitle className="text-xl font-bold text-zinc-900">Editar Cliente</CardTitle>
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
                                    onChange={handleChange}
                                    required
                                    className="w-full h-14 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                    placeholder="A"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-zinc-900 mb-2 pl-1">ONU</label>
                                <input
                                    type="text"
                                    name="onu"
                                    value={formData.onu}
                                    onChange={handleChange}
                                    required
                                    maxLength={6}
                                    className="w-full h-14 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                    placeholder="123456"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-black text-white text-lg font-semibold rounded-2xl hover:bg-zinc-800 active:scale-[0.98] transition-all"
                            >
                                {loading ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
