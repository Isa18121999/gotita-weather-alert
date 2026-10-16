# GÓTITA — tu alerta antes de la lluvia

GÓTITA es una plataforma de alerta temprana del fenómeno de El Niño y precipitaciones en Perú, basada en la Propuesta 1. El nombre oficial del proyecto es **GÓTITA**; las referencias a Pluvix se han retirado de la documentación.

## Funcionalidades

- Dashboard con estación seleccionada, lluvia acumulada 24 h, riesgo y condiciones actuales.
- Mapa interactivo de estaciones de Costa, Sierra y Selva.
- Clasificación automática: **BAJO < 15 mm**, **MEDIO 15–35 mm**, **ALTO > 35 mm** en 24 h.
- Centro de alertas según el riesgo calculado.
- Sección de noticias y enlaces a fuentes oficiales.
- Actualización meteorológica periódica.
- Preparación para despliegue AWS con API Gateway/Lambda.

## Ejecutar

```bash
npm install
npm run dev
```

La aplicación usa `/api` durante el desarrollo. En producción puede definirse `VITE_API_URL` con la URL de API Gateway.

## Fuente meteorológica

El prototipo utiliza Open-Meteo para datos meteorológicos. **No representa mediciones oficiales de SENAMHI**. Antes de usar GÓTITA como sistema operativo de alerta, se debe integrar y validar la fuente oficial de estaciones SENAMHI/ANA y los datos oficiales de ENFEN/INDECI.

## Estructura

- `src/`: frontend React + Vite.
- `api/weather.ts`: precipitación, estaciones y pronóstico.
- `api/noticias.ts`: fuentes oficiales.
- `infra/README.md`: arquitectura cloud.
