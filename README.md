# GÓTITA — tu alerta antes de la lluvia

Plataforma de alerta temprana para lluvias y riesgo hidrometeorológico en Perú, desarrollada a partir de la Propuesta 1 y su diseño de referencia.

## Estado actual

- Diseño principal de GÓTITA integrado en React + Vite.
- Mapa de estaciones y centro de alertas.
- Conexión de observaciones con SENAMHI WIS2.
- Fuentes institucionales configuradas: SENAMHI, ANA, ENFEN e INDECI.
- Open-Meteo se conserva únicamente como respaldo de prototipo cuando SENAMHI no responde.
- Infraestructura AWS preparada con AWS SAM: API Gateway + Lambda + S3 + CloudFront.

## Arquitectura AWS

```text
Usuario
  |
  v
Amazon CloudFront
  |------------------------------|
  v                              v
S3 privado                   API Gateway HTTP
Frontend React                   |
                                 v
                         AWS Lambda (TypeScript)
                           |              |
                           v              v
                       SENAMHI WIS2   fuentes oficiales

```

AWS documenta este patrón serverless con CloudFront/S3 para la presentación y API Gateway + Lambda para la lógica. citeturn0search0turn0search1

La infraestructura se declara en `template.yaml`. AWS SAM puede compilar funciones Lambda TypeScript con esbuild. citeturn1search0turn1search2

## Despliegue AWS

Requisitos:

- AWS CLI v2 configurada.
- AWS SAM CLI.
- Node.js.

Comandos:

```bash
npm ci
npm run build
sam build --template-file template.yaml
npm run aws:deploy
```

El script `scripts/deploy-aws.sh` crea/actualiza el stack, publica el `dist/` en el bucket S3 privado e invalida CloudFront.

La primera ejecución puede requerir confirmación de recursos de CloudFormation/IAM. No se deben guardar claves AWS en el repositorio.

## Fuentes oficiales

- SENAMHI: observaciones y avisos meteorológicos.
- ANA: información hidrológica y recursos hídricos; falta completar el mapeo operativo de estaciones/códigos para niveles y caudales.
- ENFEN: comunicados oficiales sobre el fenómeno El Niño.
- INDECI: emergencias y gestión reactiva, incluyendo servicios SINPAD.

## Próximo bloque técnico

1. Mejorar la consulta SENAMHI para obtener acumulados oficiales de 1 h, 6 h y 24 h.
2. Mapear estaciones GÓTITA con códigos reales de SENAMHI y ANA.
3. Integrar niveles/caudales de ANA cuando exista el endpoint/código público validado.
4. Incorporar comunicados ENFEN e incidencias INDECI al centro de alertas.
5. Unificar las señales en el motor de riesgo de GÓTITA.
6. Añadir persistencia histórica y auditoría en AWS cuando se defina el modelo de datos.

> GÓTITA es una plataforma de apoyo y visualización. No reemplaza los avisos oficiales de SENAMHI, ANA, ENFEN o INDECI. Antes de un uso operativo se requiere validación de datos, umbrales, continuidad del servicio y protocolos institucionales.
