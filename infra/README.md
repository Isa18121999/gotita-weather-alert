# Arquitectura cloud de GÓTITA

La plataforma está preparada para separar frontend y API en AWS.

- Frontend: S3 + CloudFront o Amplify.
- API: API Gateway + Lambda.
- `api/weather.ts`: estaciones, lluvia acumulada y pronóstico.
- `api/noticias.ts`: acceso a fuentes oficiales.

Rutas: `GET /weather/stations`, `GET /weather/outlook`, `GET /noticias`.

Para producción, configurar `VITE_API_URL` con la URL de API Gateway antes de `npm run build`.

Los datos de Open-Meteo son de modelo meteorológico y no deben presentarse como mediciones oficiales de SENAMHI.
