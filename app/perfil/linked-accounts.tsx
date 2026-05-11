"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Chrome, Link2, Unlink } from "lucide-react"
import { toast } from "sonner"
import { UserIdentity } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

interface LinkedAccountsProps {
  identities: UserIdentity[]
}

export function LinkedAccounts({ identities }: LinkedAccountsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Find google identity
  const googleIdentity = identities.find(id => id.provider === "google")

  const handleLinkGoogle = async () => {
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo,
        },
      })
      if (error) throw error
    } catch (error: any) {
      console.error("Error linking google:", error)
      toast.error(`Error: ${error.message || "No se pudo vincular la cuenta"}`)
      setLoading(false)
    }
  }

  const handleUnlinkGoogle = async () => {
    if (!googleIdentity) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity)
      if (error) throw error
      
      toast.success("Cuenta de Google desvinculada correctamente")
      router.refresh()
    } catch (error: any) {
      console.error("Error unlinking google:", error)
      toast.error(`Error: ${error.message || "No se pudo desvincular la cuenta"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 text-zinc-900">
        <Link2 className="h-5 w-5 text-zinc-500" />
        <span className="font-medium">Cuentas Vinculadas</span>
      </div>
      <div className="pl-8">
        {googleIdentity ? (
          <div className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-zinc-50">
            <div className="flex items-center space-x-3">
              <Chrome className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-sm font-medium text-zinc-900">Google</p>
                <p className="text-xs text-zinc-500">Conectado ({googleIdentity.identity_data?.email || "Google Account"})</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUnlinkGoogle}
              disabled={loading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Unlink className="h-4 w-4 mr-2" />
              {loading ? "Procesando..." : "Desvincular"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-zinc-50">
            <div className="flex items-center space-x-3">
              <Chrome className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-sm font-medium text-zinc-900">Google</p>
                <p className="text-xs text-zinc-500">No conectado</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLinkGoogle}
              disabled={loading}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {loading ? "Procesando..." : "Vincular"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
