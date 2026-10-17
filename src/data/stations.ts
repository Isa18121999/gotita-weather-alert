import type React from 'react';
import { SENAMHI_BY_GOTITA_ID } from './senamhiStations';

export type RiskLevel = 'ALTO' | 'MEDIO' | 'BAJO';
export type NaturalRegion = 'Costa' | 'Sierra' | 'Selva';
export interface WeatherStation { id:string; name:string; department:string; province:string; region:NaturalRegion; lat:number; lng:number; precipitationMm:number; riskLevel:RiskLevel; updatedMinutesAgo:number; basin:string; thresholdRedMm:number; senamhiCode?:string|null; senamhiName?:string; senamhiVerified?:boolean; senamhiType?:'meteorologica'|'hidrologica'; current?:{temperatureC:number|null; precipitationMm:number|null; rainMm:number|null; windKmh:number|null; time:string|null}; source?:string; }
export interface ActiveAlert { id:string; code:string; title:string; department:string; provinces:string[]; region:NaturalRegion; severity:'ROJA'|'NARANJA'; riskLevel:RiskLevel; issuedAt:string; validUntil:string; expectedRainfall:string; riverBasin:string; description:string; protocolSteps:string[]; evacuationCenters:number; }
export interface HistoricalAlert { id:string; date:string; region:string; naturalRegion:NaturalRegion; alertType:string; riskLevel:RiskLevel; recordedMm:string; station:string; }
export interface NewsItem { id:string; title:string; date:string; source:string; summary:string; fullText:string[]; imageUrl:string; regionTag:string; url?:string; }
export const UMBRAL_NARANJA_MM=15;
export const UMBRAL_ROJO_MM=35;
export const riskFor=(mm:number):RiskLevel=>mm>UMBRAL_ROJO_MM?'ALTO':mm>=UMBRAL_NARANJA_MM?'MEDIO':'BAJO';
export const RISK_COLOR:Record<RiskLevel,string>={ALTO:'#EF4444',MEDIO:'#F59E0B',BAJO:'#22C55E'};
const station=(id:string,name:string,department:string,province:string,region:NaturalRegion,lat:number,lng:number,basin:string):WeatherStation=>{const official=SENAMHI_BY_GOTITA_ID.get(id);return{id,name,department,province,region,lat,lng,precipitationMm:0,riskLevel:'BAJO',updatedMinutesAgo:0,basin,thresholdRedMm:35,senamhiCode:official?.code??null,senamhiName:official?.name,senamhiVerified:official?.verified??false,senamhiType:official?.type};};
export const PERU_STATIONS:WeatherStation[]=[
 station('est-piura-tambogrande','Estación Hidrometeorológica Tambogrande','Piura','Piura / Sullana','Costa',-4.928,-80.343,'Cuenca Hidrográfica del Río Piura'),
 station('est-tumbes-tigre','Estación Hidrológica Cabo Inga - El Tigre','Tumbes','Tumbes / Zarumilla','Costa',-3.758,-80.456,'Cuenca Binacional Puyango-Tumbes'),
 station('est-lambayeque-tinajones','Estación Bocatoma Raca Rumi - Chancay','Lambayeque','Chiclayo / Ferreñafe','Costa',-6.641,-79.418,'Cuenca Chancay-Lambayeque y Río La Leche'),
 station('est-libertad-laredo','Estación Quirihuac - Valle Santa Catalina','La Libertad','Trujillo / Virú','Costa',-8.089,-78.891,'Cuenca del Río Moche y Quebrada San Ildefonso'),
 station('est-lima-chosica','Estación Pluviométrica Chosica - Puente Caracol','Lima','Lima / Huarochirí','Costa',-11.936,-76.692,'Cuenca Media y Baja del Río Rímac'),
 station('est-cajamarca-weberbauer','Estación Meteorológica Augusto Weberbauer','Cajamarca','Cajamarca / Jaén','Sierra',-7.141,-78.489,'Intercuenca Alto Marañón / Río Mashcón'),
 station('est-huanuco-tingo','Estación Hidrológica Tingo María - Río Huallaga','Huánuco','Leoncio Prado / Huánuco','Sierra',-9.295,-75.998,'Cuenca Alta del Río Huallaga'),
 station('est-cusco-pisac','Estación Hidrométrica Pisac - Valle Sagrado','Cusco','Calca / Urubamba','Sierra',-13.422,-71.847,'Cuenca del Río Vilcanota - Urubamba'),
 station('est-arequipa-characato','Estación Puente del Diablo - Río Chili','Arequipa','Arequipa / Caylloma','Sierra',-16.409,-71.512,'Cuenca Quilca-Chili'),
 station('est-puno-ramis','Estación Hidrológica Puente Ramis','Puno','Huancané / San Román','Sierra',-15.252,-69.873,'Vertiente del Lago Titicaca - Río Ramis'),
 station('est-loreto-tamshiyacu','Estación Hidrológica Tamshiyacu - Amazonas','Loreto','Maynas / Alto Amazonas','Selva',-4.004,-73.161,'Cuenca del Río Amazonas - Tramo Iquitos'),
 station('est-sanmartin-tarapoto','Estación Cumbaza - Bajo Mayo','San Martín','San Martín / Picota','Selva',-6.487,-76.369,'Subcuenca del Río Mayo y Bajo Huallaga'),
 station('est-ucayali-pucallpa','Estación Hidrometeorológica Pucallpa','Ucayali','Coronel Portillo','Selva',-8.379,-74.553,'Cuenca Media del Río Ucayali'),
 station('pto-amazonas','Punto de monitoreo Chachapoyas','Amazonas','Chachapoyas','Selva',-6.2317,-77.869,'Cuenca del Río Utcubamba'),
 station('pto-ancash','Punto de monitoreo Huaraz','Áncash','Huaraz','Sierra',-9.5278,-77.5278,'Cuenca del Río Santa'),
 station('pto-apurimac','Punto de monitoreo Abancay','Apurímac','Abancay','Sierra',-13.6339,-72.8814,'Cuenca del Río Pachachaca'),
 station('pto-ayacucho','Punto de monitoreo Ayacucho','Ayacucho','Huamanga','Sierra',-13.1588,-74.2239,'Cuenca del Río Cachi'),
 station('pto-callao','Punto de monitoreo Callao','Callao','Callao','Costa',-12.0566,-77.1181,'Cuenca Baja del Río Rímac'),
 station('pto-huancavelica','Punto de monitoreo Huancavelica','Huancavelica','Huancavelica','Sierra',-12.7861,-74.9758,'Cuenca del Río Ichu'),
 station('pto-ica','Punto de monitoreo Ica','Ica','Ica','Costa',-14.0678,-75.7286,'Cuenca del Río Ica'),
 station('pto-junin','Punto de monitoreo Huancayo','Junín','Huancayo','Sierra',-12.0651,-75.2049,'Cuenca del Río Mantaro'),
 station('pto-madrededios','Punto de monitoreo Puerto Maldonado','Madre de Dios','Tambopata','Selva',-12.5933,-69.1891,'Cuenca del Río Madre de Dios'),
 station('pto-moquegua','Punto de monitoreo Moquegua','Moquegua','Mariscal Nieto','Costa',-17.1956,-70.9353,'Cuenca del Río Moquegua'),
 station('pto-pasco','Punto de monitoreo Cerro de Pasco','Pasco','Pasco','Sierra',-10.6864,-76.2625,'Cuenca Alta del Río Huallaga'),
 station('pto-tacna','Punto de monitoreo Tacna','Tacna','Tacna','Costa',-18.0066,-70.2463,'Cuenca del Río Caplina')
];
export const EMERGENCY_SITES={'115':'https://www.gob.pe/indeci','116':'https://portal.bomberosperu.gob.pe/','105':'https://www.gob.pe/pnp','106':'https://www.gob.pe/samu'} as const;
export const openOfficialSiteOnDesktop=(e:React.MouseEvent<HTMLAnchorElement>,href:string)=>{if(window.matchMedia('(pointer: coarse)').matches)return;e.preventDefault();window.open(href,'_blank','noopener,noreferrer');};
