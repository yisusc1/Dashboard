export const generateWhatsAppMessage = (reportData: any, supervisorName: string, reportDate: string) => {
  let message = `📋 *REPORTE DIARIO DE OPERACIONES*\n`;
  message += `👤 *Supervisor:* ${supervisorName}\n`;
  message += `📅 *Fecha:* ${reportDate}\n\n`;

  // 1. Instalaciones
  if (reportData.instalaciones && reportData.instalaciones.length > 0) {
    message += `*📍 INSPECCIÓN DE INSTALACIÓN / ALTA NUEVA (${reportData.instalaciones.length})*\n`;
    reportData.instalaciones.forEach((item: any, i: number) => {
      message += `_➤ ${item.estado || ''} - ${item.municipio || ''} - ${item.sector || ''}_\n`;
      message += `• Cédula/Ticket: ${item.cedula || 'N/A'}\n`;
      message += `• Cuadrilla: ${item.tecnicos || 'N/A'}\n`;
      if (item.metrajeReal) message += `• Metraje: ${item.metrajeReal}m\n`;
      if (item.atenuacion) message += `• Atenuación: ${item.atenuacion} dBm\n`;
      if (item.serial) message += `• Serial ONT: ${item.serial}\n`;
      if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
      message += `\n`;
    });
  }

  // 2. Soportes
  if (reportData.soportes && reportData.soportes.length > 0) {
    message += `*🛠️ APOYO EN SOPORTE TÉCNICO (${reportData.soportes.length})*\n`;
    reportData.soportes.forEach((item: any, i: number) => {
      message += `_➤ ${item.estado || ''} - ${item.municipio || ''} - ${item.sector || ''}_\n`;
      message += `• Ticket: ${item.ticket || 'N/A'}\n`;
      message += `• Técnicos: ${item.tecnicos || 'N/A'}\n`;
      if (item.diagnostico) message += `• Diagnóstico: ${item.diagnostico}\n`;
      if (item.accion) message += `• Acción: ${item.accion}\n`;
      if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
      message += `\n`;
    });
  }

  // 3. Materiales
  if (reportData.materiales && reportData.materiales.length > 0) {
    message += `*📦 CONTROL DE MATERIALES (${reportData.materiales.length})*\n`;
    reportData.materiales.forEach((item: any, i: number) => {
      message += `_➤ ${item.estado || ''} - ${item.municipio || ''} - ${item.sector || ''}_\n`;
      message += `• Carrete: ${item.carrete || 'N/A'}\n`;
      message += `• Despacho: ${item.despacho || 0}m | Retorno: ${item.retorno || 0}m\n`;
      const consumo = (Number(item.despacho) || 0) - (Number(item.retorno) || 0);
      message += `• Consumo Neto: ${consumo}m\n`;
      if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
      message += `\n`;
    });
  }

  // 4. Combustible y Flota
  if (reportData.combustibles && reportData.combustibles.length > 0) {
    message += `*🚗 COMBUSTIBLE Y FLOTA (${reportData.combustibles.length})*\n`;
    reportData.combustibles.forEach((item: any, i: number) => {
      message += `_➤ ${item.estado || ''} - ${item.municipio || ''} - ${item.sector || ''}_\n`;
      message += `• Placa: ${item.placa || 'N/A'}\n`;
      message += `• Conductor: ${item.conductor || 'N/A'}\n`;
      message += `• Litros: ${item.litros || 'N/A'}\n`;
      message += `• KM: Salida ${item.kmSalida || 0} -> Llegada ${item.kmLlegada || 0}\n`;
      if (item.novedades) message += `• Novedades: ${item.novedades}\n`;
      message += `\n`;
    });
  }

  // 5. SST
  if (reportData.ssts && reportData.ssts.length > 0) {
    message += `*🦺 AUDITORÍA SST (${reportData.ssts.length})*\n`;
    reportData.ssts.forEach((item: any, i: number) => {
      message += `_➤ ${item.estado || ''} - ${item.municipio || ''} - ${item.sector || ''}_\n`;
      message += `• Técnicos: ${item.tecnicos || 'N/A'}\n`;
      message += `• EPP: ${item.epp || 'N/A'}\n`;
      message += `• Señalización: ${item.senalizacion || 'N/A'}\n`;
      if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
      message += `\n`;
    });
  }

  // 6. Factibilidades
  if (reportData.factibilidades && reportData.factibilidades.length > 0) {
    message += `*📡 LEVANTAMIENTO DE FACTIBILIDAD (${reportData.factibilidades.length})*\n`;
    reportData.factibilidades.forEach((item: any, i: number) => {
      message += `_➤ ${item.estado || ''} - ${item.municipio || ''} - ${item.sector || ''}_\n`;
      if (item.coordenadas) message += `• Coordenadas: ${item.coordenadas}\n`;
      if (item.distancia) message += `• Distancia Enlace: ${item.distancia}m\n`;
      if (item.abonados) message += `• Est. Abonados: ${item.abonados}\n`;
      if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
      message += `\n`;
    });
  }

  message += `✅ _Generado desde App Reportes_`;
  
  return encodeURIComponent(message);
};
