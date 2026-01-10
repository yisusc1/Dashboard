import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { User, Shield, Mail, ArrowLeft, Building2, Briefcase, IdCard, Phone } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch roles and new fields from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const roles = profile?.roles || []

  // Helper for displaying optional fields
  const getDisplayValue = (value: string | undefined | null) => {
    return value || <span className="text-amber-600 font-medium italic text-xs">En espera de asignación (Por Admin)</span>
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email?.split('@')[0]

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-6">
      <div className="max-w-2xl w-full space-y-6">

        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900">Mi Perfil</h1>
        </div>

        <Card className="rounded-[32px] border-zinc-200 shadow-sm overflow-hidden">
          <div className="bg-zinc-900 p-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center border-4 border-zinc-700">
              <User className="h-12 w-12 text-zinc-100" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white capitalize">{fullName}</h2>
              <p className="text-zinc-400">{user.email}</p>
            </div>
          </div>

          <CardContent className="p-8 space-y-8">

            {/* Personal Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-zinc-500">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">Correo Electrónico</span>
                </div>
                <p className="text-zinc-900 font-medium pl-6">{user.email}</p>
              </div>

              {/* ID / Cédula */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-zinc-500">
                  <IdCard className="h-4 w-4" />
                  <span className="text-sm font-medium">Cédula de Identidad</span>
                </div>
                <p className="text-zinc-900 font-medium pl-6">{profile?.national_id || "No especificado"}</p>
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-zinc-500">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm font-medium">Teléfono</span>
                </div>
                <p className="text-zinc-900 font-medium pl-6">{profile?.phone || "No registrado"}</p>
              </div>

              {/* Localidad / Dept */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-zinc-500">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Departamento</span>
                </div>
                <p className="text-zinc-900 font-medium pl-6">{getDisplayValue(profile?.department)}</p>
              </div>

              {/* Cargo */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-zinc-500">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-sm font-medium">Cargo</span>
                </div>
                <p className="text-zinc-900 font-medium pl-6">{getDisplayValue(profile?.job_title)}</p>
              </div>
            </div>

            <Separator />

            {/* Roles Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-zinc-900">
                <Shield className="h-5 w-5 text-zinc-500" />
                <span className="font-medium">Roles y Permisos</span>
              </div>
              <div className="pl-8 flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role: string) => (
                    <span
                      key={role}
                      className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 font-medium border border-zinc-200 capitalize"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <p className="text-zinc-400 italic">Sin roles asignados</p>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div className="space-y-4 pt-4">
              <div className="text-xs text-zinc-400 text-center">
                ID de Usuario: <span className="font-mono">{user.id}</span>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
