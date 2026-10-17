export type SenamhiStationType = 'meteorologica' | 'hidrologica';
export type SenamhiModality = 'convencional' | 'automatica';

export interface SenamhiStation {
  code: string | null;
  name: string;
  type: SenamhiStationType;
  modality: SenamhiModality | null;
  department: string;
  province?: string;
  lat: number;
  lng: number;
  gotitaId: string;
  verified: boolean;
  verificationNote: string;
}

/**
 * Catálogo de correspondencias GÓTITA ↔ SENAMHI.
 *
 * code = null cuando el código oficial aún no está respaldado por
 * la fuente consultada. verified evita presentar una coincidencia
 * geográfica como si fuera una estación oficial equivalente.
 */
export const SENAMHI_STATIONS: SenamhiStation[] = [
  {
    code: '111060',
    name: 'Chosica',
    type: 'hidrologica',
    modality: null,
    department: 'Lima',
    province: 'Lima',
    lat: -11.93,
    lng: -76.69,
    gotitaId: 'est-lima-chosica',
    verified: true,
    verificationNote: 'SENAMHI identifica Chosica con código 111060 y coordenadas -11.930, -76.690.',
  },
  {
    code: 'TMA',
    name: 'Tingo María',
    type: 'hidrologica',
    modality: null,
    department: 'Huánuco',
    lat: -9.29,
    lng: -76.003,
    gotitaId: 'est-huanuco-tingo',
    verified: true,
    verificationNote: 'Tingo María aparece en la documentación hidrológica de SENAMHI.',
  },
  {
    code: 'PIS',
    name: 'Pisac',
    type: 'hidrologica',
    modality: null,
    department: 'Cusco',
    lat: -13.4195,
    lng: -71.8509,
    gotitaId: 'est-cusco-pisac',
    verified: true,
    verificationNote: 'SENAMHI registra Pisac en su red de estaciones de Cusco.',
  },
  {
    code: null,
    name: 'Abancay',
    type: 'meteorologica',
    modality: null,
    department: 'Apurímac',
    lat: -13.6049,
    lng: -72.8568,
    gotitaId: 'pto-apurimac',
    verified: true,
    verificationNote: 'SENAMHI registra Abancay con estas coordenadas; el código oficial queda pendiente.',
  },
  {
    code: null,
    name: 'Puerto Maldonado',
    type: 'meteorologica',
    modality: null,
    department: 'Madre de Dios',
    lat: -12.5873,
    lng: -69.2089,
    gotitaId: 'pto-madrededios',
    verified: true,
    verificationNote: 'SENAMHI registra Puerto Maldonado con estas coordenadas; el código oficial queda pendiente.',
  },
];

export const SENAMHI_BY_GOTITA_ID = new Map(
  SENAMHI_STATIONS.map((station) => [station.gotitaId, station]),
);
