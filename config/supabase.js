const { createClient } = require("@supabase/supabase-js")

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Faltan las variables de entorno de Supabase. Revisa tu archivo .env")
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

module.exports = supabase
