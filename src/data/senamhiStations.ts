export type SenamhiStationType = 'meteorologica' | 'hidrologica';
export type SenamhiModality = 'convencional' | 'automatica';

export interface SenamhiStation {
  /** Exact WIGOS identifier confirmed in the official SENAMHI WIS2 station catalogue. */
  wigosId: string | null;
  /** Traditional station identifier shown in the official WIS2 catalogue. */
  code: string | null;
  name: string;
  type: SenamhiStationType;
  modality: SenamhiModality | null;
  department: string;
  province?: string;
  lat: number | null;
  lng: number | null;
  gotitaId: string | null;
  verified: boolean;
  verificationNote: string;
}

/**
 * Crosswalk between GÓTITA's display locations and SENAMHI WIS2 stations.
 *
 * Do not infer equivalence from similar names or nearby coordinates. Only
 * populate gotitaId/coordinates after the mapping is independently checked.
 * These official stations are confirmed by the WIS2 collection, but their
 * coordinates and equivalence to GÓTITA's hydrological points still need
 * verification; they are therefore not linked to GÓTITA display points yet.
 *
 * Source: https://wis.senamhi.gob.pe/oapi/collections/stations/items?f=html
 */
export const SENAMHI_STATIONS: SenamhiStation[] = [
  { wigosId: '0-604-1-09582002', code: '09582002', name: 'TONGORRAPE', type: 'meteorologica', modality: null, department: 'Lambayeque', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-08602104', code: '08602104', name: 'CHULUCANAS', type: 'meteorologica', modality: null, department: 'Piura', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-27365204', code: '27365204', name: 'MOQUEGUA', type: 'meteorologica', modality: null, department: 'Moquegua', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-16474402', code: '16474402', name: 'MATUCANA', type: 'meteorologica', modality: null, department: 'Lima', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-07610101', code: '07610101', name: 'LANCONES', type: 'meteorologica', modality: null, department: 'Piura', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-12562302', code: '12562302', name: 'SAN MARCOS', type: 'meteorologica', modality: null, department: 'Cajamarca', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-15511401', code: '15511401', name: 'PUCA PUCA', type: 'meteorologica', modality: null, department: 'Apurímac', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-28390302', code: '28390302', name: 'PUNO', type: 'meteorologica', modality: null, department: 'Puno', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-17482401', code: '17482401', name: 'TARMA', type: 'meteorologica', modality: null, department: 'Junín', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-25445301', code: '25445301', name: 'CALCA', type: 'meteorologica', modality: null, department: 'Cusco', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-18470502', code: '18470502', name: 'HUAYTAPALLANA', type: 'meteorologica', modality: null, department: 'Junín', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-09601402', code: '09601402', name: 'CANCHAQUE', type: 'meteorologica', modality: null, department: 'Piura', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-27402502', code: '27402502', name: 'PAMPAHUTA', type: 'meteorologica', modality: null, department: 'Puno', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-09595002', code: '09595002', name: 'EL VIRREY', type: 'meteorologica', modality: null, department: 'Lambayeque', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-11572201', code: '11572201', name: 'CHUGUR', type: 'meteorologica', modality: null, department: 'Cajamarca', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-09615102', code: '09615102', name: 'PAIMAS', type: 'meteorologica', modality: null, department: 'Piura', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-27401201', code: '27401201', name: 'PALCA', type: 'meteorologica', modality: null, department: 'Puno', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-28391203', code: '28391203', name: 'ILLPA', type: 'meteorologica', modality: null, department: 'Puno', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-11593202', code: '11593202', name: 'JAEN', type: 'meteorologica', modality: null, department: 'Cajamarca', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-26373001', code: '26373001', name: 'SAN JOSE DE UZUNA', type: 'meteorologica', modality: null, department: 'Arequipa', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-10575101', code: '10575101', name: 'TINAJONES', type: 'meteorologica', modality: null, department: 'Lambayeque', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-15474502', code: '15474502', name: 'ÑAÑA', type: 'meteorologica', modality: null, department: 'Lima', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-17464402', code: '17464402', name: 'CARANIA', type: 'meteorologica', modality: null, department: 'Lima', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-26391401', code: '26391401', name: 'IMATA', type: 'meteorologica', modality: null, department: 'Arequipa', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
  { wigosId: '0-604-1-11605101', code: '11605101', name: 'SAN IGNACIO', type: 'meteorologica', modality: null, department: 'Cajamarca', lat: null, lng: null, gotitaId: null, verified: false, verificationNote: 'WIGOS y código figuran en el catálogo oficial; falta confirmar coordenadas y correspondencia con un punto GÓTITA.' },
];

export const SENAMHI_BY_GOTITA_ID = new Map(
  SENAMHI_STATIONS.filter((station) => station.gotitaId !== null).map((station) => [station.gotitaId!, station]),
);
