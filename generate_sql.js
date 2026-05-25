const fs = require('fs');

const lines = fs.readFileSync('direcciones.csv', 'utf8').split('\n');
const inserts = lines.slice(1).map(line => {
  const parts = line.split(';');
  if (parts.length < 4) return null;
  const [e, m, p, s] = parts.map(v => v.trim().replace(/'/g, "''"));
  if (!e || !m || !p || !s) return null;
  return `INSERT INTO public.zonas_operativas (estado, municipio, parroquia, sector) VALUES ('${e}', '${m}', '${p}', '${s}');`;
}).filter(Boolean);

fs.writeFileSync('insert_direcciones.sql', inserts.join('\n'));
console.log('Created insert_direcciones.sql with ' + inserts.length + ' rows.');
