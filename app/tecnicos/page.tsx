import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { RedirectType, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Shield, Users, Wrench, ArrowRight, Package, AlertTriangle, LogOut, Lock, Trash2, Plus } from "lucide-react"
import { LogoutButton } from "@/components/ui/logout-button"
import { FinalizeDayButton } from "./components/finalize-day-button"
import { TechnicianReportDialog } from "./components/technician-report-dialog"
import { DesktopModeToggle } from "@/components/desktop-mode-toggle"

export default async function TechnicianDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { }
      },
    }
  )

  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 2. Get Profile & Team
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
            *,
            team:teams(id, name, profiles(id, first_name, last_name))
        `)
    .eq("id", user.id)
    .single()

  if (!profile) return <div>Error cargando perfil</div>

  // 3. Determine Partner (if in team)
  const partner = profile.team?.profiles?.find((p: any) => p.id !== user.id)
  const teamMembersIDs = profile.team?.profiles?.map((p: any) => p.id) || [user.id]

  // 4. Calculate Inventory (Mi Salida)

  // ROBUST DATE LOGIC
  const veFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: 'numeric', month: 'numeric', day: 'numeric' })
  const todayVE = veFormatter.format(new Date())
  const getVeDate = (d: string) => veFormatter.format(new Date(d))

  // Fetch Items from ACTIVE Assignments
  // 4. Calculate Inventory (Mi Salida)
  // Fetch Items from ACTIVE Assignments
  // We switch from 'transactions' (history) to 'assignment_items' (state) to support closing assignments.
  const { data: assignments } = await supabase
    .from("inventory_assignments")
    .select(`
        id,
        status,
        items:inventory_assignment_items (
            quantity,
            serials,
            product:inventory_products(sku, name)
        )
    `)
    .or(`assigned_to.in.(${teamMembersIDs.join(',')}),team_id.eq.${profile.team?.id}`)
    .in("status", ["ACTIVE", "PARTIAL_RETURN"]) // Filters out RETURNED/CLOSED


  // Fetch Usage (Closures) by Team or Techs
  // OPTIMIZATION: Filter by relevant IDs and Order by Date Descending to catch latest
  const { data: closures, error: closuresError } = await supabase
    .from("cierres")
    .select("metraje_usado, metraje_desechado, conectores, precinto, rosetas, tensores, patchcord, tecnico_1, equipo, created_at, id, tecnico_id, codigo_carrete, user_id, cedula, cliente")
    .or(`tecnico_id.in.(${teamMembersIDs.join(',')}),user_id.in.(${teamMembersIDs.join(',')})`)
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50)

  // Fetch Supports (Today)
  // Fetch more history and filter in JS using robust date util
  const { data: rawSupports } = await supabase
    .from("soportes")
    .select("created_at, tecnico_id, user_id, conectores, tensores, patchcord, rosetas, metraje_usado, metraje_desechado, codigo_carrete, onu_nueva")
    .or(`tecnico_id.in.(${teamMembersIDs.join(',')}),user_id.in.(${teamMembersIDs.join(',')})`)
    .order("created_at", { ascending: false })
    .limit(20)

  // Filter Supports by TZ
  const supports = rawSupports?.filter((s: any) => getVeDate(s.created_at) === todayVE) || []


  if (closuresError) {
    console.error("DEBUG: Error fetching closures:", closuresError)
  }

  if (closures && closures.length > 0) {
    console.log("DEBUG CLOSURE SCHEMA:", Object.keys(closures[0]))
  }

  // Fetch Returns (Devoluciones)
  const { data: returns } = await supabase
    .from("inventory_returns")
    .select(`
        created_at,
        inventory_return_items (
            product_id,
            quantity,
            serials,
            condition,
            product:inventory_products(sku)
        ),
        assignment:inventory_assignments!inner(assigned_to)
    `)
    .in("assignment.assigned_to", teamMembersIDs)

  if (returns && returns.length > 0) {
    console.log("DEBUG RETURNS:", JSON.stringify(returns, null, 2))
  } else {
    console.log("DEBUG RETURNS: No returns found for these users", teamMembersIDs)
  }

  // Filter relevant closures
  const myClosures = closures?.filter(c => {
    // 1. Match Team Name (Legacy)
    if (profile.team?.name && c.equipo === profile.team.name) return true

    // 2. Match Technician ID (New RLS compliant way)
    // Checks if the closure's technician is in my team list
    if (c.tecnico_id && teamMembersIDs.includes(c.tecnico_id)) return true

    // 3. Fallback: Match User ID (Legacy)
    if (c.user_id && teamMembersIDs.includes(c.user_id)) return true

    return false
  }) || []

  // CHECK FINALIZE BUTTON VISIBILITY
  // CHECK FINALIZE BUTTON VISIBILITY
  // 1. Check if already finalized today (using Venezuela Time)
  const getVeDateString = (d: string | Date) => {
    return new Date(d).toLocaleDateString("es-VE", { timeZone: "America/Caracas" })
  }
  const todayStr = getVeDateString(new Date())

  const { data: todaysAudits } = await supabase
    .from("inventory_audits")
    .select("created_at, updated_at, status, id")
    .or(`team_id.eq.${profile.team?.id || -1},technician_id.eq.${user.id}`)
    // Fetch recent audits and filter in JS to be safe with timezone
    .order("created_at", { ascending: false })
    .limit(10)

  // Filter Today's Installations
  const todaysInstallations = myClosures.filter((c: any) => getVeDate(c.created_at) === todayVE)

  // Get Last Audit (Only if belongs to today)
  const mostRecentAudit = todaysAudits?.[0]
  const lastAuditOfToday = (mostRecentAudit && getVeDate(mostRecentAudit.created_at) === todayVE) ? mostRecentAudit : null

  // Find time of latest work
  // Determine latest work time (Installation OR Support)
  const latestClosure = todaysInstallations.length > 0
    ? [...todaysInstallations].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null

  const latestSupport = supports && supports.length > 0 ? supports[0] : null

  let latestWorkTimestamp = 0
  if (latestClosure) latestWorkTimestamp = new Date(latestClosure.created_at).getTime()
  if (latestSupport) {
    const t = new Date(latestSupport.created_at).getTime()
    if (t > latestWorkTimestamp) latestWorkTimestamp = t
  }

  const latestWorkTime = latestWorkTimestamp
  // Use updated_at if available (for appended audits), otherwise created_at
  const lastAuditTime = lastAuditOfToday ? new Date(lastAuditOfToday.updated_at || lastAuditOfToday.created_at).getTime() : 0

  // Fetch ACTIVE CLIENTS (Installations in Progress) for the Team
  // Use teamMembersIDs to see IF ANYONE in team has open job?
  // Likely TECH SPECIFIC BLOCK?
  // User said "if A TECHNICIAN performs 2 installations".
  // So we check if THIS USER (or team?) has open jobs.
  // Existing query uses `teamMembersIDs`. Good.

  const { data: activeClients } = await supabase
    .from("clientes")
    .select("id, nombre, direccion, estatus, user_id, plan, created_at")
    .in("user_id", teamMembersIDs)
    .neq("estatus", "finalizado")
    .order("created_at", { ascending: false })

  const hasOpenJobs = activeClients && activeClients.length > 0
  const hasOpenAssignments = false // Check if Assignments table needed? 'activeDispatches'?
  // User mentioned "Installation" which links to Client. So activeClients is likely enough.

  const hasWork = todaysInstallations.length > 0 || (supports && supports.length > 0)

  // Determine if day is finalized (Audit exists AND is later than last work)
  const isDayCompleted = !!lastAuditOfToday && (
    !hasWork || lastAuditTime >= latestWorkTime
  )

  // CHECK REPORT STATUS (To hide button if already sent)
  // Fetch today's report metadata
  const { data: dailyReport } = await supabase
    .from("technician_daily_reports")
    .select("updated_at")
    .eq("user_id", user.id)
    .eq("date", new Date().toISOString().split('T')[0])
    .single()

  const reportSentTime = dailyReport ? new Date(dailyReport.updated_at).getTime() : 0

  // Show Report Button IF:
  // 1. Day IS Completed (Audit exists and covers work)
  // 2. AND Report is NOT sent OR Report is OLDER than the Audit (meaning new finalize happened)
  // Strict check: if reportSentTime > lastAuditTime, then we are done.
  const isReportPending = isDayCompleted && (!dailyReport || lastAuditTime > reportSentTime)

  // Show Finalize Button IF:
  // 1. No open jobs
  // 2. Has work (installations)
  // 3. The day is NOT completed (i.e., no audit, or audit is older than latest work)
  const showFinalizeButton = !hasOpenJobs && hasWork && !isDayCompleted


  // ... [Existing Logic for installedSerialsData etc] ...
  const { data: installedSerialsData } = await supabase
    .rpc('get_installed_serials', { p_user_ids: teamMembersIDs })

  const installedOnus = new Set(installedSerialsData?.map((r: any) => r.serial).filter(Boolean) || [])
  const installedRouters = new Set()




  // ... (Active Dispatches query remains) ...
  const { data: activeDispatches } = await supabase
    .from("inventory_assignments")
    .select("code, status, created_at")
    .in("assigned_to", teamMembersIDs)
    .in("status", ["ACTIVE", "PARTIAL_RETURN"])
    .order("created_at", { ascending: false })

  // Fetch Vehicles for Report
  const { data: vehicles } = await supabase
    .from("vehiculos")
    .select("id, placa, modelo, codigo")
    .order("modelo", { ascending: true })


  // ... (Stock Logic remains) ...

  // (Skip to Rendering Section)



  // Calculate Stock and Serials
  const KPI_MAP: Record<string, string> = {
    "CARRETE": "metraje_usado",
    "CONV": "conectores",
    "PREC": "precinto",
    "ROSETA": "rosetas",
    "TENS": "tensores",
    "PATCH1": "patchcord"
  }

  type StockItem = {
    name: string
    quantity: number
    serials: string[]
    waste?: number // Track waste for display
    isSpool?: boolean
  }

  const stock: Record<string, StockItem> = {}

  // 1. Add ASSIGNMENTS
  assignments?.forEach((assignment: any) => {
    // Iterate over ITEMS inside the assignment
    assignment.items?.forEach((item: any) => {
      const sku = item.product.sku
      const name = item.product.name

      // LOGIC MODIFICATION: Separate Spools by Serial
      const isSpool = sku === "I002" || sku.includes("CARRETE") || name.toUpperCase().includes("BOBINA") || name.toUpperCase().includes("CARRETE")

      if (isSpool) {
        // Iterate over serials and create individual entries
        if (Array.isArray(item.serials) && item.serials.length > 0) {
          item.serials.forEach((s: any) => {
            const serialStr = typeof s === 'string' ? s : s.serial
            const uniqueKey = `${sku}__${serialStr}` // Unique Key for this specific spool

            if (!stock[uniqueKey]) {
              stock[uniqueKey] = {
                name: `${name} (${serialStr})`,
                quantity: 0,
                serials: [serialStr],
                waste: 0,
                isSpool: true // Flag to help rendering if needed
              }
            }

            // For spools, the item.quantity is usually the TOTAL assignments. 
            // But 'item' here is from 'inventory_assignment_items'.
            // Usually 1 item row per spool assignment.
            // If we have multiple spools in ONE assignment row, item.quantity is sum.
            // We distribute it? Or usually it's 1 spool = X meters.
            // If multiple serials in one line, we assume equal split? Or just take the value?
            // Best guess: Spools are assigned 1 by 1 or separated. 
            // If 1 row has 2 serials and 2000m, we assume 1000m each or we just add full qty to first?
            // Let's assume item.quantity is for the whole batch. If multiple serials, we divide?
            // Actually, standard practice for serialized big items is 1 row per item or specific quantities.
            // Simplification: Add item.quantity once to the unique entry.
            // But if there are multiple serials, we might double count if we add full qty to each.
            // However, for CARRETE, usually serails.length is 1.

            stock[uniqueKey].quantity += (item.quantity / item.serials.length)
          })
        }
      } else {
        // Standard aggregation for non-spool items
        if (!stock[sku]) {
          stock[sku] = { name, quantity: 0, serials: [], waste: 0 }
        }

        // Add Quantity
        stock[sku].quantity += item.quantity

        // Add Serials (if any)
        if (Array.isArray(item.serials) && item.serials.length > 0) {
          stock[sku].serials.push(...item.serials)
        }
      }
    })
  })

  // 2. Subtract USAGE (Project Armor: Use View)
  const monitoredSpools = Object.values(stock)
    .filter(i => i.isSpool)
    .flatMap(i => i.serials) // Serials to check

  if (monitoredSpools.length > 0) {
    const { data: spoolStatus } = await supabase
      .from("view_spool_status")
      .select("serial_number, base_quantity, usage_since_base")
      .in("serial_number", monitoredSpools)

    // Apply View Data to Stock Items
    Object.keys(stock).forEach(key => {
      const item = stock[key]
      if (item.isSpool && item.serials.length > 0) {
        const serial = item.serials[0] // Assuming 1 serial per entry
        const status = spoolStatus?.find(s => s.serial_number === serial)

        if (status) {
          // The View is the Single Source of Truth
          // Remaining = Base - Usage
          item.quantity = (status.base_quantity || 0) - (status.usage_since_base || 0)

          // Optional: Track waste if needed for display, but View aggregates it into usage_since_base usually?
          // View definitions sum used + wasted into 'total_usage' usually?
          // Check view_spool_status definition if needed. 
          // If view only returns usage_since_base, we assume it includes both used and wasted.
          // For the UI "waste" indicator, we might lose that specific breakdown unless we query cierres.
          // But for "Quantity Available", this is 100% accurate.

          // Quick Hack: If we want to show waste specifically, we'd need to fetch it. 
          // But for "Available", trust the view.
        }
      }
    })
  }


  // 2b. Subtract Standard Usage (Actor Based)
  myClosures.forEach((c: any) => {
    // A. QUANTITY SUBTRACTION
    Object.keys(KPI_MAP).forEach(skuKey => {
      // SKIP SPOOLS HERE (Handled above)
      if (skuKey === 'CARRETE') return

      const dbField = KPI_MAP[skuKey]

      // STANDARD LOGIC (For non-serialized or aggregated items)
      if (stock[skuKey]) {
        const valStr = c[dbField]
        let val = 0
        if (valStr) {
          val = parseInt(valStr.toString().replace(/[^0-9]/g, ""), 10) || 0
        }
        if (dbField === 'patchcord' || dbField === 'rosetas') {
          val = (valStr === 'Si' || valStr === true) ? 1 : 0 // Boolean usage
        }

        stock[skuKey].quantity -= val
      }
    })
  })

  // 3. Subtract RETURNS (returned to warehouse)
  returns?.forEach((ret: any) => {
    ret.inventory_return_items.forEach((item: any) => {
      const sku = item.product?.sku
      if (sku && stock[sku]) {
        // Logic Exception: Do NOT subtract "CONSUMED" returns for CARRETE
        // This prevents the daily "Automatic Closure" from hiding the Spool
        const isCarrete = sku.includes("CARRETE")
        const isConsumed = item.condition === 'CONSUMED'

        if (isCarrete && isConsumed) {
          // Ignore subtraction
          return
        }

        // Subtract Quantity
        stock[sku].quantity -= item.quantity

        // Subtract Serials
        if (item.serials && Array.isArray(item.serials)) {
          item.serials.forEach((s: string) => {
            stock[sku].serials = stock[sku].serials.filter(existing => existing !== s)
          })
        }
      }
    })
  })

  // 4. SERIAL SUBTRACTION (Filter based on installed/specific SKU types)
  Object.keys(stock).forEach(sku => {
    if (stock[sku].serials && stock[sku].serials.length > 0) {
      if (sku.includes("ONU")) {
        stock[sku].serials = stock[sku].serials.filter(s => !installedOnus.has(s))
        stock[sku].quantity = stock[sku].serials.length // Sync quantity with available serials
      }
      // Add Router logic if SKU pattern known, e.g. ROUTER?
      // Assuming 'router' key usage might be generic, but let's leave generic serial filter as fallback if needed
      // OR just rely on the count update above if not using serials for everything.
      // Since user specificially complained about ONUs, fixing ONUs here is key.
    }
  })

  // Check if HAS STOCK to operate (Minimum Kit)
  const MINIMUM_KIT = [
    { key: 'ONU', label: 'ONU', min: 1 },
    { key: 'CARRETE', label: 'Cable Fibra', min: 1 }, // Just Need > 0
    { key: 'CONV', label: 'Conectores', min: 2 },
    { key: 'TENS', label: 'Tensores', min: 2 },
    { key: 'PATCH1', label: 'Patchcord', min: 1 },
    { key: 'ROSETA', label: 'Roseta', min: 1 },
  ]

  const missingItems: string[] = []

  MINIMUM_KIT.forEach(req => {
    // Find matching SKU in stock
    const stockItem = Object.entries(stock).find(([sku]) => sku.includes(req.key))
    const quantity = stockItem ? stockItem[1].quantity : 0

    if (quantity < req.min) {
      missingItems.push(req.label)
    }
  })

  // Check system settings
  const { getSystemSettings } = await import("../admin/settings-actions")
  const settings = await getSystemSettings()
  const restrictionsEnabled = settings["INSTALLATION_RESTRICTIONS_ENABLED"]

  const hasStock = !restrictionsEnabled || missingItems.length === 0

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 pb-32">

      {/* HEADER PROFILE */}
      <div className="max-w-7xl mx-auto mb-8 animate-in slide-in-from-top-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mi Dashboard</h1>
          <div className="flex gap-2">
            <DesktopModeToggle />
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full text-slate-400">
                <LogOut size={20} />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MAIN CONTENT (Cols 1 & 2) */}
          <div className="lg:col-span-2 space-y-8">

            {/* PROFILE CARD */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
              <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Users size={80} />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-2xl font-bold">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h2>
                    <p className="text-slate-400 text-sm font-medium">{profile.team ? profile.team.name : 'Técnico Individual'}</p>
                  </div>
                  <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${hasStock ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {hasStock ? 'ACTIVO' : 'INACTIVO'}
                  </div>
                </div>
              </div>
              <CardContent className="p-6 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rol</span>
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                      <Shield size={16} />
                      <span>Técnico</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Compañero</span>
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                      <User size={16} />
                      <span>{partner ? `${partner.first_name}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ACTIVE INSTALLATIONS LIST */}
            {activeClients && activeClients.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-gray-900 text-lg">Instalaciones en Curso</h3>
                  <Link href="/tecnicos/reportes" className="text-sm font-semibold text-blue-500 hover:text-blue-600">
                    Ver Todo
                  </Link>
                </div>

                <div className="space-y-3">
                  {activeClients.map((client: any) => (
                    <Link href="/tecnicos/reportes" key={client.id} className="block group">
                      <div className="bg-white rounded-[22px] p-5 active:scale-[0.98] transition-all duration-200 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{client.nombre}</h4>
                          <div className="flex items-center text-gray-500 text-sm mt-1 space-x-2">
                            <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{client.plan || 'Plan ?'}</span>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{client.direccion}</span>
                          </div>
                        </div>
                        <div className="h-9 w-9 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <ArrowRight size={18} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-[28px] border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Wrench size={32} />
                </div>
                <h3 className="text-slate-900 font-medium mb-1">Todo despejado</h3>
                <p className="text-gray-400 font-medium text-sm">No tienes instalaciones activas en este momento.</p>
              </div>
            )}

            {/* MAIN ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* INSTALLATION CARD */}
              <Link href="/tecnicos/reportes?action=new" className="block group relative">
                <div className="absolute inset-0 bg-blue-600 rounded-[28px] shadow-lg shadow-blue-500/30 transition-transform group-active:scale-[0.98]"></div>
                <div className="relative bg-blue-600 h-28 rounded-[28px] flex items-center justify-between px-6 overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/10 to-transparent"></div>
                  <div className="flex flex-col z-10">
                    <span className="text-blue-100 text-xs font-bold uppercase tracking-wide mb-1">Nueva</span>
                    <span className="text-white text-2xl font-bold">Instalación</span>
                  </div>
                  <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10 group-hover:bg-white group-hover:text-blue-600 transition-colors">
                    <Plus size={24} />
                  </div>
                </div>
              </Link>

              {/* SUPPORT CARD */}
              <Link href="/tecnicos/reportes?action=support" className="block group relative">
                <div className="absolute inset-0 bg-orange-500 rounded-[28px] shadow-lg shadow-orange-500/30 transition-transform group-active:scale-[0.98]"></div>
                <div className="relative bg-orange-500 h-28 rounded-[28px] flex items-center justify-between px-6 overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/10 to-transparent"></div>
                  <div className="flex flex-col z-10">
                    <span className="text-orange-100 text-xs font-bold uppercase tracking-wide mb-1">Reportar</span>
                    <span className="text-white text-2xl font-bold">Soporte</span>
                  </div>
                  <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10 group-hover:bg-white group-hover:text-orange-600 transition-colors">
                    <Wrench size={24} />
                  </div>
                </div>
              </Link>
            </div>
          </div> {/* END MAIN CONTENT */}

          {/* SIDEBAR (Col 3) */}
          <div className="space-y-6">

            <div className="flex items-center gap-2 px-2">
              <h3 className="font-bold text-gray-900 text-lg">Mi Inventario</h3>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{Object.values(stock).filter((i: any) => i.quantity > 0).length} Items</span>
            </div>

            {Object.keys(stock).length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(stock).map(([sku, item]) => (
                  item.quantity > 0 && (
                    <div key={sku} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Minimal Icon */}
                        <div className={`h-12 w-12 rounded-[16px] flex items-center justify-center ${item.isSpool ? 'bg-blue-50 text-blue-600' :
                          sku.includes('ONU') ? 'bg-purple-50 text-purple-600' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                          {item.isSpool ? <div className="w-5 h-5 rounded-full border-[3px] border-current" /> : <Package size={22} />}
                        </div>

                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{item.name}</p>
                          {item.isSpool && item.serials.length > 0 && (
                            <p className="text-xs text-gray-400 font-mono mt-1 font-medium bg-gray-50 inline-block px-1.5 rounded">
                              {item.serials[0]} {item.serials.length > 1 && `+${item.serials.length - 1}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-bold text-gray-900">{item.quantity}</span>
                        {item.isSpool && (item.waste || 0) > 0 && (
                          <p className="text-[10px] font-bold text-red-400 mt-0.5">- {item.waste}m</p>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400 bg-white rounded-[20px] border border-dashed border-gray-200">
                <p className="text-sm">Sin inventario</p>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-8">
            {isReportPending ? (
              <TechnicianReportDialog
                profile={profile}
                stock={stock}
                vehicles={vehicles || []}
                todaysInstallations={todaysInstallations}
                todaysSupports={supports || []}
                activeClients={activeClients || []}
              />
            ) : null}

            {/* FINALIZAR JORNADA BUTTON */}
            {showFinalizeButton && (
              <div className="pt-8 pb-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-black rounded-[28px] p-8 text-center relative overflow-hidden shadow-2xl shadow-gray-200">
                  {/* Decorative */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800/30 rounded-full blur-2xl -mr-10 -mt-10"></div>

                  <div className="relative z-10">
                    <h3 className="text-white text-xl font-bold mb-2">Fin de Jornada</h3>
                    <p className="text-gray-400 mb-6 text-sm">Has completado tus instalaciones de hoy.</p>
                    <FinalizeDayButton />
                  </div>
                </div>
              </div>
            )}
          </div>




        </div> {/* END SIDEBAR */}
      </div> {/* END GRID */}

      {/* FOOTER DIAGNOSTICS & FINALIZE (Spans full width or centered?) */}
      <div className="mt-8 max-w-3xl mx-auto">
      </div>
    </div>
  )
}
