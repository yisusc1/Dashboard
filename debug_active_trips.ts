
import { createClient } from "@supabase/supabase-js"
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
const envConfig = dotenv.parse(fs.readFileSync(envPath))

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase URL or Anon Key")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugActiveTrips() {
    console.log("--- Debugging Active Trips ---")

    // 1. Fetch latest 5 reports (to see if the 'exit' was recorded)
    const { data: latestReports, error: reportsError } = await supabase
        .from("reportes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

    if (reportsError) {
        console.error("Error fetching reports:", reportsError)
    } else {
        console.log("Latest reports:", JSON.stringify(latestReports, null, 2))
    }

    // 2. Fetch specifically active trips logic
    const { data: activeTrips, error: activeError } = await supabase
        .from("reportes")
        .select("*")
        .is("km_entrada", null)

    if (activeError) {
        console.error("Error fetching active trips:", activeError)
    } else {
        console.log("Active Trips (km_entrada IS NULL):", JSON.stringify(activeTrips, null, 2))
    }
}

debugActiveTrips()
