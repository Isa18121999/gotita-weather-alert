#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-gotita-weather-alert}"
AWS_REGION="${AWS_REGION:-us-east-1}"

command -v aws >/dev/null 2>&1 || { echo "Falta AWS CLI v2."; exit 1; }
command -v sam >/dev/null 2>&1 || { echo "Falta AWS SAM CLI."; exit 1; }

if ! aws sts get-caller-identity --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "No hay una sesión AWS válida. En AWS Academy usa las credenciales de CloudShell/Learner Lab."
  exit 1
fi

echo "==> Instalando dependencias necesarias para las Lambdas"
npm install

echo "==> Construyendo funciones Lambda con AWS SAM"
sam build --template-file template.yaml

echo "==> Desplegando backend AWS (API Gateway + Lambda)"
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

API=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

echo ""
echo "Backend GÓTITA desplegado en AWS."
echo "API: $API"
echo "El frontend se publica exclusivamente en Render desde GitHub."
