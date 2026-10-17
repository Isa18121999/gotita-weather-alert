# GÓTITA — tu alerta antes de la lluvia

Plataforma de alerta temprana para lluvias y riesgo hidrometeorológico en Perú, desarrollada a partir de la Propuesta 1 y su diseño de referencia.

## Arquitectura y despliegue

- **Render** aloja únicamente el frontend React + Vite. El sitio se conecta al repositorio `Isa18121999/gotita-weather-alert`, rama `main`, y se despliega automáticamente en cada commit.
- **AWS Academy** aloja los servicios backend: API Gateway HTTP y AWS Lambda.
- El frontend de Render consume la API de AWS a través de `VITE_API_URL` (por defecto configurada en `src/data/weather.ts`).
- No se usa S3 ni CloudFront para publicar el frontend.
- **SENAMHI WIS2** es la fuente meteorológica prioritaria; **Open-Meteo** es respaldo de prototipo y debe aparecer claramente identificado cuando se usa.

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
  |------------------|-------------------|
  v                  v                   v
SENAMHI WIS2      ENFEN / INDECI      ANA (pendiente
                                      validar endpoint)
```

## Frontend en Render

Configuración del Static Site:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Branch: `main`
- Auto-deploy: activado

Los cambios de interfaz se guardan en GitHub; Render publica el nuevo frontend automáticamente.

## Backend en AWS Academy

AWS CloudShell se usa solo para construir y desplegar API Gateway y las funciones Lambda. Antes de desplegar, revisar los cambios de CloudFormation, especialmente si se modificó `template.yaml`.

Comandos básicos para la infraestructura actual:

```bash
npm install
sam build --template-file template.yaml
sam deploy --stack-name gotita-weather-alert --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3
```

La sesión de AWS Academy debe estar activa y tener permisos del rol `LabRole`. No guardar credenciales en GitHub.

**Nota sobre el stack previo:** una versión anterior de GÓTITA creaba una función Lambda y un bucket S3 para servir la web. La plantilla actual ya no define esos recursos; antes de aplicarla sobre el stack existente, revisar el changeset de CloudFormation para asegurarse de que no se elimine ningún recurso con datos importantes. El bucket antiguo, si continúa existiendo, no debe utilizarse como hosting del frontend.

## Fuentes y estado actual

- **SENAMHI:** la API intenta consultar observaciones WIS2. El endpoint productivo puede seguir usando Open-Meteo si las observaciones no se pueden relacionar con suficientes estaciones verificadas.
- **ANA:** falta completar la validación del endpoint público y el mapeo de estaciones para niveles y caudales.
- **ENFEN:** comunicados oficiales sobre el fenómeno El Niño.
- **INDECI:** emergencias y gestión reactiva, incluidos registros SINPAD.
- **Open-Meteo:** respaldo de prototipo; no sustituye datos ni avisos oficiales.

## Próximas tareas técnicas

1. Obtener y verificar los identificadores reales de estaciones WIS2 para mapear observaciones de SENAMHI de forma inequívoca.
2. Confirmar la semántica de los campos de precipitación WIS2 antes de informar acumulados horarios o de 24 horas.
3. Indicar estado, procedencia y antigüedad por estación; no representar la falta de datos como 0 mm ni como dato oficial.
4. Validar endpoint y códigos de estaciones ANA.
5. Integrar comunicados ENFEN e incidencias INDECI en el centro de alertas, explicando qué contribución hacen al cálculo de riesgo.
6. Añadir pruebas automatizadas, persistencia histórica y auditoría.
7. Identificar los umbrales actuales como criterios experimentales de GÓTITA, no como umbrales oficiales.
8. Revisar accesibilidad, estados de error y comportamiento móvil del frontend.

> GÓTITA es una plataforma de apoyo y visualización. No reemplaza los avisos oficiales de SENAMHI, ANA, ENFEN o INDECI. Antes de un uso operativo se requiere validar datos, umbrales, continuidad del servicio y protocolos institucionales.
