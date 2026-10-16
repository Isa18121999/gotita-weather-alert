#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-gotita-weather-alert}"
AWS_REGION="${AWS_REGION:-us-east-1}"

command -v aws >/dev/null 2>&1 || { echo "Falta AWS CLI v2."; exit 1; }
command -v sam >/dev/null 2>&1 || { echo "Falta AWS SAM CLI."; exit 1; }

if ! aws sts get-caller-identity --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "No hay una sesión AWS válida. Ejecuta: aws configure"
  exit 1
fi

echo "==> Instalando dependencias y compilando frontend"
npm install
npm run build

echo "==> Construyendo Lambdas con AWS SAM"
sam build --template-file template.yaml

echo "==> Desplegando infraestructura AWS"
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='WebBucketName'].OutputValue" --output text)
DISTRIBUTION=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
WEBSITE=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" --output text)
API=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

echo "==> Publicando frontend en S3: $BUCKET"
aws s3 sync dist/ "s3://$BUCKET" --delete --region "$AWS_REGION"

echo "==> Invalidando CloudFront"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths '/*' >/dev/null

echo ""
echo "GÓTITA desplegado."
echo "Web: $WEBSITE"
echo "API: $API"
