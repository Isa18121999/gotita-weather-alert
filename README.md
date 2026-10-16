# GÓTITA — tu alerta antes de la lluvia

GÓTITA es una plataforma de alerta temprana para precipitaciones y el fenómeno de El Niño en Perú, basada en la Propuesta 1.

## Diseño integrado

La interfaz implementa las vistas principales de la propuesta: inicio/dashboard, mapa de riesgo y precipitaciones, centro de alertas y noticias/comunicados oficiales. El sistema está preparado para Costa, Sierra y Selva y separa claramente datos observados, pronósticos y fuentes institucionales.

## Fuentes oficiales

- **SENAMHI:** servicio WIS2 para observaciones meteorológicas cuando está disponible; portal de avisos meteorológicos como fuente oficial de consulta.
- **ANA:** fuente institucional para información de recursos hídricos; su integración de series de caudal/nivel requiere seleccionar y mapear los códigos de estación ANA correspondientes.
- **ENFEN:** comunicados oficiales e información del estado del sistema de alerta de El Niño/La Niña.
- **INDECI:** información de emergencias y servicio REST de SINPAD para servicios geográficos de emergencias.

La ruta `/api/fuentes-oficiales` comprueba la disponibilidad de los portales/servicios configurados y devuelve su estado.

## Meteorología y respaldo

`api/weather.ts` intenta primero SENAMHI WIS2. Si el servicio oficial no responde, utiliza Open-Meteo como **respaldo de prototipo**, nunca como medición oficial de SENAMHI. La interfaz identifica la fuente utilizada.

## Ejecutar

```bash
npm install
npm run dev
```

En producción puede definirse `VITE_API_URL` con la URL de la API desplegada.

## Arquitectura

- `src/`: frontend React + Vite.
- `src/data/officialSources.ts`: catálogo de fuentes institucionales.
- `api/weather.ts`: observaciones SENAMHI + respaldo meteorológico.
- `api/fuentes-oficiales.ts`: comprobación de conectividad institucional.
- `api/noticias.ts`: enlaces a publicaciones oficiales.
- `infra/README.md`: arquitectura cloud.

## Importante

GÓTITA es un proyecto tecnológico y no sustituye las alertas, avisos, comunicados ni instrucciones de las autoridades. Antes de considerar el sistema para operación real, se debe validar cada variable con la institución propietaria, definir códigos de estación oficiales y establecer controles de calidad, trazabilidad y disponibilidad.
