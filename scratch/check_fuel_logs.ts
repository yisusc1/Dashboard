
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkLogs() {
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('id, fuel_date, liters, ticket_number, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error(error)
    return
  }

  console.log('Recent Fuel Logs:')
  console.table(data)
  
  const today = new Date().toISOString().split('T')[0]
  console.log('Today is:', today)
}

checkLogs()
