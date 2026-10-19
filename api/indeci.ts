const INDECI_LAYER = 'https://geosinpad.indeci.gob.pe/indeci/rest/services/Emergencias/EMERGENCIAS_SINPAD/MapServer/0/query';

const HYDROMETEO = [
  'LLUVIAS INTENSAS',
  'PRECIPITACIONES - LLUVIA',
  'PRECIPITACIONES PLUVIALES',
  'INUNDACION',
  'INUNDACIÓN POR DESBORDE DE RIO',
  'INUNDACIÓN POR DESBORDE DE CANALES',
  'RIADA (CRECIDA DE RIO)',
  'HUAICOS',
  'TEMPORALES (VIENTOS CON LLUVIAS)',
  'CAMBIOS CLIMATICOS (EL NINO)',
  'FRIAJE',
  'GRANIZADAS',
  'HELADAS',
  'VIENTOS FUERTES',
];

function isHydrometeorological(value: unknown) {
  const text = String(value ?? '').toUpperCase();
  return HYDROMETEO.some(term => text.includes(term));
}

function buildHydrometeoWhere() {
  return HYDROMETEO
    .map(term => `FENOMENO LIKE '%${term.replaceAll("'", "''")}%'`)
    .join(' OR ');
}

export async function obtenerEmergenciasIndeci() {
  const params = new URLSearchParams({
    where: buildHydrometeoWhere(),
    outFields: 'IDE_SINPAD,FENOMENO,DES_GRUPAL_FENOMENO,DEPARTAMENTO,PROVINCIA,DISTRITO,REGION,FECHA,FLG_SITUACION,OBJECTID',
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: '100',
    orderByFields: 'FECHA DESC',
    f: 'geojson',
  });
  const response = await fetch(`${INDECI_LAYER}?${params.toString()}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`INDECI SINPAD respondió ${response.status}`);
  const raw = await response.json();
  const features = Array.isArray(raw?.features) ? raw.features : [];
  const hydrometeorological = features
    .filter((feature: any) => isHydrometeorological(feature?.properties?.FENOMENO))
    .sort((a: any, b: any) => {
      const dateA = Number(a?.properties?.FECHA ?? 0);
      const dateB = Number(b?.properties?.FECHA ?? 0);
      return dateB - dateA;
    });
  return {
    source: 'INDECI SINPAD',
    sourceUrl: INDECI_LAYER,
    generatedAt: new Date().toISOString(),
    totalReturned: features.length,
    features: hydrometeorological,
    note: 'Registros consultados desde el servicio oficial de emergencias SINPAD. El filtro hidrometeorológico se aplica en la consulta al servicio antes de limitar los resultados y se conserva FLG_SITUACION para distinguir el estado SINPAD cuando esté disponible.',
  };
}

export const handler = async () => {
  try {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=120' }, body: JSON.stringify(await obtenerEmergenciasIndeci()) };
  } catch (error) {
    return { statusCode: 502, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) };
  }
};
