const INDECI_LAYER = 'https://geosinpad.indeci.gob.pe/indeci/rest/services/Emergencias/EMERGENCIAS_SINPAD/MapServer/0/query';

export async function obtenerEmergenciasIndeci() {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'IDE_SINPAD,FENOMENO,DEPARTAMENTO,PROVINCIA,DISTRITO,FECHA,HORA',
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: '200',
    orderByFields: 'FECHA DESC',
    f: 'geojson',
  });
  const response = await fetch(`${INDECI_LAYER}?${params.toString()}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`INDECI SINPAD respondió ${response.status}`);
  const raw = await response.json();
  return {
    source: 'INDECI SINPAD',
    sourceUrl: INDECI_LAYER,
    generatedAt: new Date().toISOString(),
    features: Array.isArray(raw?.features) ? raw.features : [],
  };
}

export const handler = async () => {
  try {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(await obtenerEmergenciasIndeci()) };
  } catch (error) {
    return { statusCode: 502, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) };
  }
};
