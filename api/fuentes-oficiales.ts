type OfficialFeed = {
  id: string;
  name: string;
  role: string;
  url: string;
  dataUrl: string;
  mode: 'live-portal' | 'rest-service';
  connected: boolean;
  checkedAt: string;
};

const FEEDS: Omit<OfficialFeed, 'connected' | 'checkedAt'>[] = [
  { id: 'senamhi', name: 'SENAMHI', role: 'Avisos meteorológicos y observación', url: 'https://www.senamhi.gob.pe/', dataUrl: 'https://web2.senamhi.gob.pe/?p=avisos', mode: 'live-portal' },
  { id: 'ana', name: 'ANA', role: 'Información hidrológica y recursos hídricos', url: 'https://www.ana.gob.pe/', dataUrl: 'https://www.ana.gob.pe/', mode: 'live-portal' },
  { id: 'enfen', name: 'ENFEN', role: 'Comunicados e información del fenómeno El Niño', url: 'https://enfen.imarpe.gob.pe/', dataUrl: 'https://enfen.imarpe.gob.pe/comunicados/', mode: 'live-portal' },
  { id: 'indeci', name: 'INDECI', role: 'Emergencias y gestión reactiva', url: 'https://www.gob.pe/indeci', dataUrl: 'https://geosinpad.indeci.gob.pe/indeci/rest/services/Emergencias', mode: 'rest-service' },
];

async function check(url: string) {
  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function obtenerFuentesOficiales() {
  const checkedAt = new Date().toISOString();
  const feeds = await Promise.all(FEEDS.map(async (feed) => ({
    ...feed,
    connected: await check(feed.dataUrl),
    checkedAt,
  })));
  return {
    platform: 'GÓTITA',
    checkedAt,
    feeds,
    note: 'La disponibilidad indica que el portal o servicio oficial respondió. No implica que todos los datos sean una API pública ni que GÓTITA deba sustituir la publicación oficial.',
  };
}

export const handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(await obtenerFuentesOficiales()),
});
