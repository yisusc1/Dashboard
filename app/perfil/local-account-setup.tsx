"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { KeyRound, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { setupLocalUser } from "./actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LocalAccountSetupProps {
  email?: string
}

export function LocalAccountSetup({ email }: LocalAccountSetupProps) {
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const isGoogleUser = email && !email.includes("@dashboard.local")

  return (
    <div className="space-y-4 mt-8 pt-6 border-t border-zinc-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-zinc-900">
          <KeyRound className="h-5 w-5 text-zinc-500" />
          <span className="font-medium">
            {isGoogleUser ? "Configurar Acceso Local" : "Cambiar Contraseña"}
          </span>
        </div>
        {!isOpen && (
          <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
            {isGoogleUser ? "Asignar Usuario/Clave" : "Modificar"}
          </Button>
        )}
      </div>

      {isGoogleUser && !isOpen && (
        <div className="pl-8 text-xs text-amber-600 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <p>
            Actualmente inicias sesión mediante Google. Si deseas poder iniciar sesión escribiendo un usuario y contraseña, configúralo aquí. (Podrás seguir usando Google).
          </p>
        </div>
      )}

      {isOpen && (
        <form 
          action={async (formData) => {
            setLoading(true)
            const result = await setupLocalUser(formData)
            setLoading(false)
            if (result.success) {
              toast.success(result.message)
              setIsOpen(false)
              router.refresh()
            } else {
              toast.error(result.message)
            }
          }}
          className="pl-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="grid gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
            {isGoogleUser && (
              <div className="space-y-1">
                <Label className="text-xs text-zinc-500 ml-1">Nuevo Usuario</Label>
                <Input 
                  name="username" 
                  placeholder="Ej: jlima" 
                  className="bg-white" 
                  required 
                />
              </div>
            )}
            
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500 ml-1">Nueva Contraseña</Label>
              <Input 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                className="bg-white" 
                required 
                minLength={6}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Guardando..." : "Guardar Credenciales"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="w-full">
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
