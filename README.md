# GÓTITA — tu alerta antes de la lluvia

Plataforma de alerta temprana para lluvias y riesgo hidrometeorológico en Perú, desarrollada a partir de la Propuesta 1 y su diseño de referencia.

GÓTITA integra información meteorológica, fuentes oficiales, emergencias, comunicados y noticias relacionadas con lluvias, inundaciones, huaicos y el fenómeno El Niño, con una interfaz orientada a la prevención y visualización del riesgo.

> **Importante:** GÓTITA es una plataforma de apoyo y visualización. No reemplaza los avisos oficiales de SENAMHI, ANA, ENFEN o INDECI.

## Arquitectura actual

- **Render** aloja únicamente el frontend React + Vite.
- **GitHub** es el repositorio central del código y la rama `main` dispara el despliegue automático del frontend en Render.
- **AWS Academy** aloja el backend mediante API Gateway HTTP y AWS Lambda.
- El frontend consume la API de AWS mediante `VITE_API_URL`.
- **No se utiliza S3 ni CloudFront para publicar el frontend.**
- **SENAMHI WIS2** es la fuente meteorológica prioritaria.
- **Open-Meteo** funciona como respaldo de prototipo cuando no existe una observación SENAMHI verificable.

```text
                         ┌──────────────────────┐
                         │       Usuario        │
                         └──────────┬───────────┘
                                    │
                                    v
                    ┌────────────────────────────┐
                    │ Render — Frontend          │
                    │ React + Vite + TypeScript  │
                    └─────────────┬──────────────┘
                                  │
                                  v
                    ┌────────────────────────────┐
                    │ AWS API Gateway HTTP       │
                    └─────────────┬──────────────┘
                                  │
                 ┌────────────────┼─────────────────┐
                 v                v                 v
        ┌────────────────┐ ┌───────────────┐ ┌───────────────┐
        │ AWS Lambda     │ │ AWS Lambda     │ │ AWS Lambda     │
        │ Weather        │ │ Noticias       │ │ INDECI / ENFEN │
        └───────┬────────┘ └───────┬───────┘ └───────┬───────┘
                │                  │                 │
                v                  v                 v
          SENAMHI WIS2       Oficiales, RPP,    SINPAD / ENFEN
          + Open-Meteo       Andina y X
```

## Tecnologías

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Leaflet / OpenStreetMap

### Backend

- AWS Lambda
- Amazon API Gateway HTTP API
- AWS SAM / CloudFormation
- Node.js 22
- TypeScript

### Fuentes de información

- SENAMHI WIS2
- SENAMHI Datos Abiertos
- ANA
- ENFEN
- INDECI / SINPAD
- Open-Meteo como respaldo meteorológico
- RPP Noticias
- Agencia Andina
- Cuentas oficiales de las instituciones en X

## Funcionalidades actuales

### 🌧️ Información meteorológica

- Consulta de estaciones meteorológicas.
- Integración prioritaria con SENAMHI WIS2.
- Identificación mediante WIGOS ID exacto cuando el mapeo de la estación está verificado.
- Uso de Open-Meteo como respaldo claramente identificado.
- Estado de procedencia de los datos: observado, respaldo o sin datos.
- No se representa la ausencia de datos como `0 mm`.

### 🗺️ Mapa de riesgo

- Visualización de estaciones y zonas de riesgo.
- Filtros por nivel de riesgo y región.
- Preparado para incorporar progresivamente estaciones verificadas y datos oficiales.

### 🚨 Centro de alertas

- Visualización de información relacionada con emergencias y riesgo.
- Integración con registros oficiales de INDECI/SINPAD.
- Separación entre información oficial y contenido informativo externo.

### 📰 Noticias y comunicados

La sección **Noticias y Comunicados** distingue claramente entre:

- **OFICIAL:** SENAMHI, ANA, ENFEN e INDECI.
- **NOTICIA:** RPP Noticias y Agencia Andina.
- **X:** cuentas oficiales de SENAMHI, ENFEN e INDECI.

Incluye filtros:

- Todos
- Oficiales
- Noticias
- X
- Urgente

También incorpora una sección **“Lo más importante ahora”** para priorizar información relacionada con alertas, lluvias, inundaciones, huaicos, El Niño y emergencias.

Las noticias y publicaciones de redes se mantienen diferenciadas de los avisos oficiales para evitar presentarlas como alertas institucionales.

## Despliegue

### Frontend — Render

Servicio:

`gotita-weather-alert`

URL:

`https://gotita-weather-alert.onrender.com`

Configuración del Static Site:

- Repository: `Isa18121999/gotita-weather-alert`
- Branch: `main`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Auto-deploy: activado

Cada commit enviado a `main` puede generar un nuevo despliegue automático del frontend.

### Backend — AWS Academy

Región:

`us-east-1`

Stack:

`gotita-weather-alert`

API Gateway:

`https://1v9e21ic97.execute-api.us-east-1.amazonaws.com`

API base:

`https://1v9e21ic97.execute-api.us-east-1.amazonaws.com/api`

Funciones Lambda principales:

- `WeatherFunction`
- `OfficialSourcesFunction`
- `IndeciFunction`
- `EnfenFunction`
- `NoticiasFunction`

## Endpoints principales

| Endpoint | Función |
|---|---|
| `GET /api/weather/stations` | Datos meteorológicos por estación |
| `GET /api/weather/outlook` | Perspectiva meteorológica |
| `GET /api/fuentes-oficiales` | Fuentes institucionales |
| `GET /api/indeci/emergencias` | Emergencias de INDECI/SINPAD |
| `GET /api/enfen/comunicados` | Comunicados oficiales de ENFEN |
| `GET /api/noticias` | Noticias, fuentes oficiales y cuentas en X |

## Fuentes oficiales y estado de integración

### SENAMHI

La API relaciona observaciones WIS2 con estaciones que tengan un **WIGOS ID exacto** y cuyo mapeo esté marcado como verificado en `src/data/senamhiStations.ts`.

Mientras el catálogo de estaciones verificadas se completa, Open-Meteo puede utilizarse como respaldo de prototipo. En ese caso, la interfaz debe mostrar claramente que se trata de datos de respaldo y no de observaciones SENAMHI.

### ANA

ANA está incorporada como fuente institucional, pero todavía se requiere completar la validación de un endpoint público y el mapeo de estaciones para niveles y caudales antes de presentar esos datos como observaciones oficiales en tiempo real.

### ENFEN

Se integran los comunicados oficiales publicados por ENFEN relacionados con el fenómeno El Niño.

### INDECI

Se consulta información oficial del sistema SINPAD mediante los servicios disponibles de INDECI para incorporar registros de emergencias.

### RPP Noticias y Agencia Andina

Se incorporan como **fuentes periodísticas externas**, no como autoridades de alerta. La información se presenta separada de los comunicados oficiales.

### X

GÓTITA enlaza las cuentas oficiales en X de instituciones relevantes como SENAMHI, ENFEN e INDECI. Las cuentas se presentan como fuentes sociales institucionales y no se inventan publicaciones cuando no existe una extracción verificable del contenido.

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Ejecutar el frontend:

```bash
npm run dev
```

Construir el frontend:

```bash
npm run build
```

Validar TypeScript:

```bash
npm run lint
```

## Construcción y despliegue AWS

AWS CloudShell se utiliza para construir y desplegar API Gateway y las funciones Lambda.

```bash
npm install
sam build --template-file template.yaml
sam validate --lint
sam deploy --stack-name gotita-weather-alert --region us-east-1 --resolve-s3
```

Para revisar los cambios antes de ejecutarlos:

```bash
sam deploy --stack-name gotita-weather-alert --region us-east-1 --resolve-s3 --no-execute-changeset
```

Después de crear el Change Set, se debe revisar CloudFormation antes de ejecutar cambios sobre el stack existente.

La sesión de AWS Academy debe estar activa y contar con los permisos proporcionados por el entorno de laboratorio. **No guardar credenciales ni claves API en GitHub.**

## Estado de validación del proyecto

La infraestructura actual fue validada mediante:

- `npm install` → correcto, sin vulnerabilidades reportadas.
- `sam build` → **Build Succeeded**.
- `sam validate --lint` → **template.yaml is a valid SAM Template**.
- `sam deploy` → **Successfully created/updated stack - gotita-weather-alert**.
- `GET /api/noticias` → responde correctamente e incluye fuentes oficiales, RPP, Andina y cuentas oficiales en X.
- Frontend en Render → publicado y consumiendo el backend de AWS.

## Próximas tareas técnicas

1. Completar el catálogo de estaciones SENAMHI con WIGOS ID, coordenadas y estado de verificación.
2. Confirmar la semántica de los campos de precipitación WIS2 antes de informar acumulados horarios o de 24 horas.
3. Validar el endpoint y los códigos de estaciones de ANA.
4. Integrar de forma más profunda comunicados ENFEN e incidencias INDECI en el cálculo de riesgo.
5. Incorporar persistencia histórica y auditoría de datos.
6. Añadir pruebas automatizadas para APIs y componentes principales.
7. Definir los umbrales actuales como criterios experimentales de GÓTITA y no como umbrales oficiales.
8. Implementar alertas por correo/SMS utilizando una arquitectura compatible con las restricciones de permisos de AWS Academy.
9. Mejorar accesibilidad, estados de error y experiencia móvil.
10. Incorporar explicaciones de IA sobre los factores que contribuyen al nivel de riesgo, manteniendo separada la recomendación de IA de los avisos oficiales.

## Consideraciones de seguridad y confiabilidad

- No almacenar claves API en el repositorio.
- No presentar datos de respaldo como datos oficiales.
- No presentar noticias periodísticas como alertas oficiales.
- Mantener identificada la procedencia y antigüedad de los datos.
- Revisar los Change Sets antes de modificar recursos existentes de CloudFormation.
- Antes de un uso operativo, validar datos, umbrales, disponibilidad, continuidad del servicio y protocolos institucionales.

---

**GÓTITA — tu alerta antes de la lluvia** 🌧️

Proyecto orientado a prevención, visualización del riesgo y acceso centralizado a información relacionada con eventos hidrometeorológicos en Perú.
