"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { MessageSquare, Copy, Send } from "lucide-react"
import { toast } from "sonner"

type Props = {
    profile: any
    stock: any
    todaysInstallations: any[]
    activeClients: any[] // "No Efectuadas" candidates
}

export function TechnicianReportDialog({ profile, stock, todaysInstallations, activeClients }: Props) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState("")
    const [statusOnus, setStatusOnus] = useState("Panel 04") // Default or Input?

    useEffect(() => {
        if (open) {
            generateText()
        }
    }, [open, statusOnus])

    function generateText() {
        const teamName = profile.team?.name || "Sin Equipo"
        const installers = [profile.first_name, profile.last_name]

        // Try to add partner if exists
        const partner = profile.team?.profiles?.find((p: any) => p.id !== profile.id)
        if (partner) installers.push(`${partner.first_name} ${partner.last_name}`)

        const date = new Date().toLocaleDateString("es-ES")

        // 1. ONUS (Manual Entry requested)
        // 2. ROUTERS (Manual Entry requested)

        // 3. Installations
        const failedCount = activeClients.length

        // 4. Materials Used (Sum from todaysInstallations)
        let conectores = 0
        let tensores = 0
        let patchcords = 0
        let rosetas = 0

        todaysInstallations.forEach((c: any) => {
            // Parse text to numbers
            conectores += parseInt(String(c.conectores || 0).replace(/\D/g, '')) || 0
            tensores += parseInt(String(c.tensores || 0).replace(/\D/g, '')) || 0

            // Patch/Roseta might be "Si"/"No" or number?
            if (c.patchcord === 'Si' || c.patchcord === true) patchcords++
            if (c.rosetas === 'Si' || c.rosetas === true) rosetas++
        })

        // 5. Spools
        const spoolUsage: Record<string, { used: number, remaining: number }> = {}
        // We need REMAINING for spools. Stock object handles "Quantity" as remaining!
        // Stock object keys for spools are `CARRETE__SERIAL`.

        Object.keys(stock).forEach(key => {
            if (key.includes("CARRETE")) {
                const parts = key.split("__")
                const serial = parts[1] || parts[0]

                spoolUsage[serial] = {
                    used: 0, // Will sum below
                    remaining: stock[key].quantity // Already calculated in page.tsx
                }
            }
        })

        // Sum Usage from closures
        todaysInstallations.forEach((c: any) => {
            if (c.codigo_carrete && spoolUsage[c.codigo_carrete]) {
                const u = parseFloat(String(c.metraje_usado || 0).replace(/[^0-9.]/g, '')) || 0
                const w = parseFloat(String(c.metraje_desechado || 0).replace(/[^0-9.]/g, '')) || 0
                spoolUsage[c.codigo_carrete].used += (u + w)
            }
        })


        // BUILD STRING
        let t = `*Reporte De Entrada ${teamName}*\n`
        t += `*Fecha: ${date}*\n`
        t += `*Nombre De Instaladores:* ${profile.first_name} ${profile.last_name}`
        if (partner) t += ` y ${partner.first_name} ${partner.last_name}`
        t += `\n\n`

        t += `*Estatus ONUS:* ${statusOnus}\n\n`

        t += `*ONUS:* 00\n\n`
        t += `[ESCRIBIR SERIALES ONUS AQUÍ]\n`
        t += `\n`

        t += `*ROUTER:* 00\n\n`
        t += `[ESCRIBIR SERIALES ROUTERS AQUÍ]\n`
        t += `\n`

        t += `*Instalaciones Asignadas No Efectuadas:* ${String(failedCount).padStart(2, '0')}\n\n`
        activeClients.forEach(c => {
            t += `${c.nombre}: cliente manifestó no contar con el dinero (Editar Razón)\n`
        })
        t += `\n`

        t += `*Total De Instalaciones Realizadas:* ${String(todaysInstallations.length).padStart(2, '0')}\n\n`

        t += `*Conectores Utilizados:*  ${String(conectores).padStart(2, '0')}\n`
        // We normally track Remaining Connectors? Stock has it.
        const totalConnectors = activeStockQuantity(stock, "CONV")
        t += `*Conectores  Restantes:* ${String(totalConnectors).padStart(2, '0')}\n`
        t += `*Conectores Defectuosos:* 00\n` // Manual input usually
        t += `*Tensores Utilizados:* ${String(tensores).padStart(2, '0')}\n`
        t += `*Patchcords Utilizados:* ${String(patchcords).padStart(2, '0')}\n`
        t += `*Rosetas Utilizadas:* ${String(rosetas).padStart(2, '0')}\n\n`

        Object.keys(spoolUsage).forEach(serial => {
            t += `Carrete ${serial}\n`
            t += ` Metraje Utilizado:  ${spoolUsage[serial].used}Mts\n`
            t += `*Metraje Restante:* ${spoolUsage[serial].remaining}Mts\n\n`
        })

        setText(t)
    }

    // Helper to extract serials/qty
    function activeStockSerials(item: any) {
        return item?.serials || []
    }
    function activeStockQuantity(stockObj: any, keyMap: string) {
        // keyMap like "CONV"
        let q = 0
        Object.keys(stockObj).forEach(k => {
            if (k.includes(keyMap)) q += stockObj[k].quantity
        })
        return q
    }

    function sendWhatsApp() {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl mt-4 h-12 gap-2">
                    <MessageSquare size={20} />
                    Reporte WhatsApp
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full max-h-[85vh] overflow-y-auto rounded-3xl bg-zinc-50">
                <DialogHeader>
                    <DialogTitle>Generar Reporte Diario</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2 block">Estatus ONUS</label>
                        <Input
                            value={statusOnus}
                            onChange={e => setStatusOnus(e.target.value)}
                            className="bg-zinc-50 border-zinc-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-semibold text-zinc-700">Vista Previa</span>
                            <span className="text-xs text-zinc-400">Puede editar el texto abajo</span>
                        </div>
                        <Textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            className="min-h-[300px] font-mono text-sm bg-white border-zinc-200 rounded-xl p-4 leading-relaxed"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copiado") }} className="h-12 rounded-xl text-zinc-600">
                            <Copy size={18} className="mr-2" /> Copiar
                        </Button>
                        <Button onClick={sendWhatsApp} className="h-12 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold">
                            <Send size={18} className="mr-2" /> Enviar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
