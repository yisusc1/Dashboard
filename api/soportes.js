// /api/soportes.js (NUEVO ARCHIVO)

const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase"); // Asegúrate que la ruta a tu config de Supabase sea correcta

// POST /api/soportes - Crear un nuevo reporte de soporte técnico
router.post("/", async (req, res) => {
  try {
    // 1. Obtenemos todos los datos del formulario que envía el frontend
    const {
      fecha_reporte,
      hora_reporte,
      nombre_cliente,
      coordenadas,
      precinto,
      caja_nap,
      cantidad_puertos_nap,
      puerto_cliente,
      potencia_dbm,
      zona,
      estatus_visita,
      causa_problema,
      accion_realizada,
      conectores_utilizados,
      metraje_utilizado_m,
      observaciones,
      realizado_por_tecnico,
    } = req.body;

    // 2. Insertamos los datos en la tabla 'reportes_soporte'
    const { data: newSupportReport, error } = await supabase
      .from("reportes_soporte")
      .insert([
        {
          fecha_reporte,
          hora_reporte,
          nombre_cliente,
          coordenadas,
          precinto,
          caja_nap,
          // Convertimos los campos numéricos para asegurar que se guarden como números
          cantidad_puertos_nap: cantidad_puertos_nap ? parseInt(cantidad_puertos_nap, 10) : null,
          puerto_cliente: puerto_cliente ? parseInt(puerto_cliente, 10) : null,
          potencia_dbm: potencia_dbm ? parseFloat(potencia_dbm) : null,
          zona,
          estatus_visita,
          causa_problema,
          accion_realizada,
          conectores_utilizados: conectores_utilizados ? parseInt(conectores_utilizados, 10) : null,
          metraje_utilizado_m: metraje_utilizado_m ? parseInt(metraje_utilizado_m, 10) : null,
          observaciones,
          realizado_por_tecnico,
        },
      ])
      .select(); // .select() devuelve el registro recién creado

    // 3. Manejamos posibles errores de la base de datos
    if (error) {
      console.error("Error al insertar reporte de soporte:", error);
      // Enviamos el mensaje de error de Supabase para tener más detalles
      return res.status(400).json({ error: error.message });
    }

    // 4. Si todo sale bien, enviamos una respuesta exitosa con los datos guardados
    res.status(201).json({
      message: "Reporte de soporte creado exitosamente",
      reporte: newSupportReport[0], // Enviamos el objeto del reporte creado
    });

  } catch (error) {
    console.error("Error en el servidor en POST /api/soportes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;