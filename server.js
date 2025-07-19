const express = require("express")
const cors = require("cors")
const path = require("path")
require("dotenv").config() // Asegúrate de que dotenv esté instalado y se cargue aquí

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, "public")))

// Importar las rutas de la API
const solicitudesRouter = require("./api/solicitudes")
const planificacionRouter = require("./api/planificacion")
const temporaryKeyRouter = require("./api/temporary-key")
const techniciansRouter = require("./api/technicians") // Importación corregida
const reportesRouter = require("./api/reportes") // Nueva importación
const soportesRouter = require("./api/soportes") // Nueva importación
const statsRouter = require('./api/stats') // Nueva importación para estadísticas

// Usar las rutas de la API
app.use("/api/solicitudes", solicitudesRouter)
app.use("/api/planificacion", planificacionRouter)
app.use("/api/temporary-key", temporaryKeyRouter)
app.use("/api/technicians", techniciansRouter) // Uso corregido
app.use("/api/reportes", reportesRouter) // Nueva ruta
app.use("/api/soportes", soportesRouter) // Nueva ruta
app.use('/api/stats', statsRouter) // Nueva ruta para estadísticas

// Rutas principales para servir los archivos HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.get("/solicitud", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "solicitud.html"))
})

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"))
})

app.get("/reporte", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reporte.html"))
})

app.get("/soporte", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "soporte.html"))
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
  console.log(`📝 Nueva Solicitud: http://localhost:${PORT}/solicitud`)
  console.log(`📊 Panel Admin: http://localhost:${PORT}/admin (clave: ${process.env.ADMIN_PASSWORD || "666"})`)
  console.log(
    `🔧 Reporte Instalación: http://localhost:${PORT}/reporte (clave: ${process.env.INSTALACION_PASSWORD || "0000"})`,
  )
  console.log(`🎧 Reporte Soporte: http://localhost:${PORT}/soporte (clave: ${process.env.SOPORTE_PASSWORD || "1111"})`)
})

