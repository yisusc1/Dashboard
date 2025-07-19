const supabase = require("../config/supabase")
const fs = require("fs")
const path = require("path")

async function setupDatabase() {
  try {
    console.log("🔧 Configurando base de datos...")

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, "database-schema.sql")
    const sqlContent = fs.readFileSync(sqlPath, "utf8")

    // Ejecutar cada comando SQL por separado
    const commands = sqlContent.split(";").filter((cmd) => cmd.trim())

    for (const command of commands) {
      if (command.trim()) {
        const { error } = await supabase.rpc("exec_sql", {
          sql_query: command.trim(),
        })

        if (error) {
          console.error("Error ejecutando comando SQL:", error)
        } else {
          console.log("✅ Comando ejecutado correctamente")
        }
      }
    }

    console.log("🎉 Base de datos configurada exitosamente!")
  } catch (error) {
    console.error("❌ Error configurando la base de datos:", error)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupDatabase()
}

module.exports = setupDatabase
