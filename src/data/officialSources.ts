export type OfficialSource = {
  id: 'senamhi' | 'ana' | 'enfen' | 'indeci';
  name: string;
  short: string;
  description: string;
  role: string;
  url: string;
  dataUrl: string;
  status: 'conectado' | 'fuente-oficial';
};

export const OFFICIAL_SOURCES: OfficialSource[] = [
  {
    id: 'senamhi',
    name: 'SENAMHI',
    short: 'Meteorología e hidrología',
    description: 'Avisos meteorológicos, pronósticos y datos de la red de estaciones.',
    role: 'Fuente meteorológica principal',
    url: 'https://www.senamhi.gob.pe/',
    dataUrl: 'https://web2.senamhi.gob.pe/?p=avisos',
    status: 'conectado',
  },
  {
    id: 'ana',
    name: 'ANA',
    short: 'Recursos hídricos',
    description: 'Información y productos oficiales relacionados con ríos, agua y recursos hídricos.',
    role: 'Fuente hidrológica',
    url: 'https://www.ana.gob.pe/',
    dataUrl: 'https://www.ana.gob.pe/',
    status: 'fuente-oficial',
  },
  {
    id: 'enfen',
    name: 'ENFEN',
    short: 'Fenómeno El Niño y La Niña',
    description: 'Comunicados oficiales, informes técnicos y estado del sistema de alerta costera.',
    role: 'Fuente de contexto climático y FEN',
    url: 'https://enfen.imarpe.gob.pe/',
    dataUrl: 'https://enfen.imarpe.gob.pe/comunicados/',
    status: 'conectado',
  },
  {
    id: 'indeci',
    name: 'INDECI',
    short: 'Emergencias y gestión reactiva',
    description: 'Información oficial sobre emergencias y acciones de preparación y respuesta.',
    role: 'Fuente de emergencias',
    url: 'https://www.gob.pe/indeci',
    dataUrl: 'https://geosinpad.indeci.gob.pe/indeci/rest/services/Emergencias',
    status: 'conectado',
  },
];
