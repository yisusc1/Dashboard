export const generateWhatsAppMessage = (reportData: any, supervisorName: string, reportDate: string) => {
  let message = `*REPORTE DIARIO DE OPERACIONES*\n`;
  message += `*Supervisor:* ${supervisorName}\n`;
  message += `*Fecha:* ${reportDate}\n\n`;

  const formatLocation = (item: any) => {
    const parts = [item.estado, item.municipio, item.sector].filter(Boolean);
    return parts.length > 0 ? `Ubicación: ${parts.join(' - ')}\n` : '';
  };

  const hasData = (item: any, requiredKeys: string[]) => {
    return requiredKeys.some(key => item[key] && String(item[key]).trim() !== '');
  };

  // 1. Instalaciones
  if (reportData.instalaciones && reportData.instalaciones.length > 0) {
    const validItems = reportData.instalaciones.filter((i: any) => hasData(i, ['cedula', 'tecnicos', 'metrajeReal', 'serial']));
    if (validItems.length > 0) {
      message += `*INSPECCIÓN DE INSTALACIÓN (${validItems.length})*\n`;
      validItems.forEach((item: any) => {
        message += formatLocation(item);
        if (item.cedula) message += `• Cédula/Ticket: ${item.cedula}\n`;
        if (item.tecnicos) message += `• Cuadrilla: ${item.tecnicos}\n`;
        if (item.metrajeReal) message += `• Metraje: ${item.metrajeReal}m\n`;
        if (item.atenuacion) message += `• Atenuación: ${item.atenuacion} dBm\n`;
        if (item.serial) message += `• Serial ONT: ${item.serial}\n`;
        if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
        message += `\n`;
      });
    }
  }

  // 2. Soportes
  if (reportData.soportes && reportData.soportes.length > 0) {
    const validItems = reportData.soportes.filter((i: any) => hasData(i, ['ticket', 'tecnicos', 'diagnostico']));
    if (validItems.length > 0) {
      message += `*APOYO EN SOPORTE TÉCNICO (${validItems.length})*\n`;
      validItems.forEach((item: any) => {
        message += formatLocation(item);
        if (item.ticket) message += `• Ticket: ${item.ticket}\n`;
        if (item.tecnicos) message += `• Técnicos: ${item.tecnicos}\n`;
        if (item.diagnostico) message += `• Diagnóstico: ${item.diagnostico}\n`;
        if (item.accion) message += `• Acción: ${item.accion}\n`;
        if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
        message += `\n`;
      });
    }
  }

  // 3. Materiales
  if (reportData.materiales && reportData.materiales.length > 0) {
    const validItems = reportData.materiales.filter((i: any) => hasData(i, ['carrete', 'tecnicos']));
    if (validItems.length > 0) {
      message += `*CONTROL DE MATERIALES (${validItems.length})*\n`;
      validItems.forEach((item: any) => {
        message += formatLocation(item);
        if (item.carrete) message += `• Carrete: ${item.carrete}\n`;
        if (item.despacho || item.retorno) {
          message += `• Despacho: ${item.despacho || 0}m | Retorno: ${item.retorno || 0}m\n`;
          const consumo = (Number(item.despacho) || 0) - (Number(item.retorno) || 0);
          message += `• Consumo Neto: ${consumo}m\n`;
        }
        if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
        message += `\n`;
      });
    }
  }

  // 4. Combustible y Flota
  if (reportData.combustibles && reportData.combustibles.length > 0) {
    const validItems = reportData.combustibles.filter((i: any) => hasData(i, ['placa', 'conductor']));
    if (validItems.length > 0) {
      message += `*COMBUSTIBLE Y FLOTA (${validItems.length})*\n`;
      validItems.forEach((item: any) => {
        message += formatLocation(item);
        if (item.placa) message += `• Placa: ${item.placa}\n`;
        if (item.conductor) message += `• Conductor: ${item.conductor}\n`;
        if (item.litros) message += `• Litros: ${item.litros}\n`;
        if (item.kmSalida || item.kmLlegada) message += `• KM: Salida ${item.kmSalida || 0} -> Llegada ${item.kmLlegada || 0}\n`;
        if (item.novedades) message += `• Novedades: ${item.novedades}\n`;
        message += `\n`;
      });
    }
  }

  // 5. SST
  if (reportData.ssts && reportData.ssts.length > 0) {
    const validItems = reportData.ssts.filter((i: any) => hasData(i, ['tecnicos', 'epp']));
    if (validItems.length > 0) {
      message += `*AUDITORÍA SST (${validItems.length})*\n`;
      validItems.forEach((item: any) => {
        message += formatLocation(item);
        if (item.tecnicos) message += `• Técnicos: ${item.tecnicos}\n`;
        if (item.epp) message += `• EPP: ${item.epp}\n`;
        if (item.senalizacion) message += `• Señalización: ${item.senalizacion}\n`;
        if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
        message += `\n`;
      });
    }
  }

  // 6. Factibilidades
  if (reportData.factibilidades && reportData.factibilidades.length > 0) {
    const validItems = reportData.factibilidades.filter((i: any) => hasData(i, ['coordenadas', 'distancia', 'abonados']));
    if (validItems.length > 0) {
      message += `*LEVANTAMIENTO DE FACTIBILIDAD (${validItems.length})*\n`;
      validItems.forEach((item: any) => {
        message += formatLocation(item);
        if (item.coordenadas) message += `• Coordenadas: ${item.coordenadas}\n`;
        if (item.distancia) message += `• Distancia Enlace: ${item.distancia}m\n`;
        if (item.abonados) message += `• Est. Abonados: ${item.abonados}\n`;
        if (item.observaciones) message += `• Obs: ${item.observaciones}\n`;
        message += `\n`;
      });
    }
  }

  message += `Generado desde Dashboard`;
  
  return encodeURIComponent(message);
};
