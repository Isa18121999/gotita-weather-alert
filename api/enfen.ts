const ENFEN_ARCHIVE = 'https://enfen.imarpe.gob.pe/downloads/comunicados/';

export async function obtenerComunicadosEnfen() {
  const response = await fetch(ENFEN_ARCHIVE, { signal: AbortSignal.timeout(15000), headers: { Accept: 'text/html' } });
  if (!response.ok) throw new Error(`ENFEN respondió ${response.status}`);
  const html = await response.text();
  const matches = [...html.matchAll(/Comunicado Oficial Enfen N°\s*([^<\n]+?)(?=<|\s{2,})/gi)];
  const titles = [...new Set(matches.map(m => `Comunicado Oficial Enfen N° ${m[1].trim()}`))].slice(0, 12);
  return {
    source: 'ENFEN',
    sourceUrl: ENFEN_ARCHIVE,
    generatedAt: new Date().toISOString(),
    publications: titles,
    note: 'Listado obtenido desde el archivo oficial de comunicados de ENFEN. El contenido completo permanece en la publicación oficial/PDF.',
  };
}

export const handler = async () => {
  try {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(await obtenerComunicadosEnfen()) };
  } catch (error) {
    return { statusCode: 502, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) };
  }
};
