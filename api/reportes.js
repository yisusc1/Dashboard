const express = require("express")
const router = express.Router()
const supabase = require("../config/supabase")

// POST /api/reportes - Crear un nuevo reporte de instalación
router.post("/", async (req, res) => {
  try {
    const {
      solicitud_id,
      fecha_reporte,
      hora_reporte,
      equipo, // Este es el campo 'equipo' del formulario, que se mapea a 'equipo_letra' en DB
      nombre_cliente,
      pw_asignado,
      mac,
      precinto,
      onu_pon,
      router,
      plan_contratado,
      velocidad_descarga_mbps,
      velocidad_subida_mbps,
      potencia_nap,
      potencia_cliente,
      metraje_utilizado_m,
      metraje_desechado_m,
      estado_instalacion,
      tensores_utilizados,
      metodo_pago,
      tecnico_1_id,
      tecnico_2_id,
    } = req.body

    // Insertar el reporte de instalación
    const { data: newReport, error: reportError } = await supabase
      .from("reportes_instalacion")
      .insert([
        {
          solicitud_id: Number.parseInt(solicitud_id),
          fecha_reporte,
          hora_reporte,
          equipo_letra: equipo, // Mapear 'equipo' del formulario a 'equipo_letra' en la DB
          nombre_cliente,
          pw_asignado,
          mac,
          precinto,
          onu_pon,
          router,
          plan_contratado,
          velocidad_descarga_mbps: velocidad_descarga_mbps ? Number.parseFloat(velocidad_descarga_mbps) : null,
          velocidad_subida_mbps: velocidad_subida_mbps ? Number.parseFloat(velocidad_subida_mbps) : null,
          potencia_nap: potencia_nap ? Number.parseFloat(potencia_nap) : null,
          potencia_cliente: potencia_cliente ? Number.parseFloat(potencia_cliente) : null,
          metraje_utilizado_m: metraje_utilizado_m ? Number.parseInt(metraje_utilizado_m) : null,
          metraje_desechado_m: metraje_desechado_m ? Number.parseInt(metraje_desechado_m) : null,
          estado_instalacion,
          tensores_utilizados: tensores_utilizados ? Number.parseInt(tensores_utilizados) : null,
          metodo_pago,
          tecnico_1_id: Number.parseInt(tecnico_1_id),
          tecnico_2_id: tecnico_2_id ? Number.parseInt(tecnico_2_id) : null,
        },
      ])
      .select()

    if (reportError) {
      console.error("Error al insertar reporte de instalación:", reportError)
      return res.status(400).json({ error: reportError.message })
    }

    const reporteId = newReport[0].id

    // Actualizar el estado de la solicitud y vincularla al reporte
    const { data: updatedSolicitud, error: solicitudUpdateError } = await supabase
      .from("solicitudes")
      .update({
        estado_solicitud: "Instalado", // Cambiar estado a 'Instalado'
        reporte_id: reporteId, // Vincular con el ID del reporte
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", solicitud_id)
      .select()

    if (solicitudUpdateError) {
      console.error("Error al actualizar solicitud con reporte_id:", solicitudUpdateError)
      // Considerar revertir el reporte si la actualización de la solicitud falla
      return res.status(400).json({ error: solicitudUpdateError.message })
    }

    res.status(201).json({
      message: "Reporte de instalación creado y solicitud actualizada exitosamente",
      reporte: newReport[0],
      solicitud: updatedSolicitud[0],
    })
  } catch (error) {
    console.error("Error en POST /api/reportes:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router