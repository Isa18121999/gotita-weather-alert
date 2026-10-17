export type SenamhiStationType = 'meteorologica' | 'hidrologica';
export type SenamhiModality = 'convencional' | 'automatica';

export interface SenamhiStation {
  /** Exact WIGOS identifier confirmed in the official SENAMHI WIS2 station catalogue. */
  wigosId: string | null;
  /** Traditional SENAMHI code only when verified against the official catalogue. */
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
 * Crosswalk between GÓTITA display points and official SENAMHI WIS2 stations.
 * These entries remain unverified until an exact WIGOS identifier and station
 * coordinates have been confirmed from the public stations collection.
 */
export const SENAMHI_STATIONS: SenamhiStation[] = [
  {
    wigosId: null, code: null, name: 'Chosica', type: 'hidrologica',
    modality: null, department: 'Lima', province: 'Lima',
    lat: -11.93, lng: -76.69, gotitaId: 'est-lima-chosica',
    verified: false,
    verificationNote: 'Pendiente de confirmar el WIGOS ID y sus coordenadas en el catálogo oficial WIS2.',
  },
  {
    wigosId: null, code: null, name: 'Tingo María', type: 'hidrologica',
    modality: null, department: 'Huánuco',
    lat: -9.29, lng: -76.003, gotitaId: 'est-huanuco-tingo',
    verified: false,
    verificationNote: 'Pendiente de confirmar el WIGOS ID y sus coordenadas en el catálogo oficial WIS2.',
  },
  {
    wigosId: null, code: null, name: 'Pisac', type: 'hidrologica',
    modality: null, department: 'Cusco',
    lat: -13.4195, lng: -71.8509, gotitaId: 'est-cusco-pisac',
    verified: false,
    verificationNote: 'Pendiente de confirmar el WIGOS ID y sus coordenadas en el catálogo oficial WIS2.',
  },
  {
    wigosId: null, code: null, name: 'Abancay', type: 'meteorologica',
    modality: null, department: 'Apurímac',
    lat: -13.6049, lng: -72.8568, gotitaId: 'pto-apurimac',
    verified: false,
    verificationNote: 'Pendiente de confirmar el WIGOS ID y sus coordenadas en el catálogo oficial WIS2.',
  },
  {
    wigosId: null, code: null, name: 'Puerto Maldonado', type: 'meteorologica',
    modality: null, department: 'Madre de Dios',
    lat: -12.5873, lng: -69.2089, gotitaId: 'pto-madrededios',
    verified: false,
    verificationNote: 'Pendiente de confirmar el WIGOS ID y sus coordenadas en el catálogo oficial WIS2.',
  },
];

export const SENAMHI_BY_GOTITA_ID = new Map(
  SENAMHI_STATIONS.map((station) => [station.gotitaId, station]),
);
