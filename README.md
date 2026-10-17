# GÓTITA — tu alerta antes de la lluvia

Plataforma de alerta temprana para lluvias y riesgo hidrometeorológico en Perú, desarrollada a partir de la Propuesta 1 y su diseño de referencia.

## Despliegue y arquitectura actual

- **Render** publica únicamente el frontend React + Vite desde la rama `main` de GitHub. Cada commit en `main` activa el despliegue automático de la web.
- **AWS** se utiliza para el backend: API Gateway HTTP + AWS Lambda y las integraciones de datos.
- El frontend alojado en Render consume la API de AWS mediante `VITE_API_URL` (por defecto, el endpoint de API Gateway definido en `src/data/weather.ts`).
- **SENAMHI WIS2** es la fuente meteorológica prioritaria en el backend; **Open-Meteo** es solo un respaldo de prototipo cuando SENAMHI no responde o no hay suficiente cobertura validada.
- Las otras fuentes oficiales configuradas son ANA, ENFEN e INDECI. El nivel operativo de cada integración debe mostrarse conforme al estado real que pueda verificarse.

## Arquitectura

```text
Usuario
  |
  v
Render Static Site (frontend React + Vite)
  |
  v
AWS API Gateway HTTP
  |
  v
AWS Lambda (TypeScript)
  |---------------------|--------------------|
  v                     v                    v
SENAMHI WIS2        ENFEN / INDECI      Otras fuentes
  |
  v
Open-Meteo solo como respaldo meteorológico
```

## Despliegue

### Frontend en Render

Render está conectado al repositorio `Isa18121999/gotita-weather-alert`, rama `main`, con:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Auto-deploy: al actualizar `main`

No es necesario publicar el frontend en S3 ni utilizar CloudFront. Para un cambio de interfaz, el flujo normal es editar y confirmar el cambio en GitHub; Render hará el despliegue.

### Backend en AWS Academy

AWS CloudShell se usa únicamente para compilar y desplegar las funciones y API de AWS. Los comandos básicos son:

```bash
npm install
sam build --template-file template.yaml
sam deploy --stack-name gotita-weather-alert --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3
```

La sesión de AWS Academy debe estar activa y conservar los permisos del rol `LabRole`. Si se cambia la plantilla de infraestructura, revisar el conjunto de cambios de CloudFormation antes de confirmar.

> El script histórico `scripts/deploy-aws.sh` todavía incluye compilación/publicación del frontend en S3. No usar ese script como flujo normal mientras Render sea el único hosting del frontend; debe actualizarse o retirarse esa parte en un cambio separado.

## Fuentes oficiales

- **SENAMHI:** observaciones meteorológicas y avisos oficiales. La correspondencia con estaciones verificadas debe confirmarse por identificadores oficiales; un valor de respaldo no se debe etiquetar como observación SENAMHI.
- **ANA:** información hidrológica y recursos hídricos; falta completar el mapeo operativo de estaciones/códigos para niveles y caudales.
- **ENFEN:** comunicados oficiales sobre el fenómeno El Niño.
- **INDECI:** emergencias y gestión reactiva, incluyendo servicios SINPAD.
- **Open-Meteo:** respaldo de prototipo claramente identificado; no sustituye datos ni avisos oficiales.

## Próximos trabajos técnicos

1. Obtener y verificar identificadores WIS2 reales para mapear estaciones SENAMHI sin asignaciones geográficas ambiguas.
2. Verificar la semántica de los campos de precipitación WIS2 antes de presentar acumulados de 1 h, 6 h o 24 h.
3. Exponer el estado de procedencia y actualidad por estación; no mostrar ausencia de datos como cero milímetros ni como una observación oficial.
4. Completar mapeo de estaciones de ANA y su endpoint válido.
5. Integrar los comunicados ENFEN e incidentes INDECI en el centro de alertas y documentar cómo afectan (si aplica) al cálculo de riesgo.
6. Añadir persistencia histórica, auditoría y pruebas automáticas.
7. Etiquetar los umbrales actuales como criterios de prototipo de GÓTITA, no como umbrales oficiales.
8. Comprobar accesibilidad del frontend y estados de carga/error desde Render.

> GÓTITA es una plataforma de apoyo y visualización. No reemplaza los avisos oficiales de SENAMHI, ANA, ENFEN o INDECI. Antes de un uso operativo se requiere validación de datos, umbrales, continuidad del servicio y protocolos institucionales.
