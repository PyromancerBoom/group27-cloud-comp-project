#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

BUCKET=$(terraform -chdir=terraform output -raw static_bucket_name)
CF_DOMAIN=$(terraform -chdir=terraform output -raw cloudfront_domain)
CF_ID=$(terraform -chdir=terraform output -raw cloudfront_distribution_id)

echo "Bucket:     $BUCKET"
echo "CloudFront: $CF_DOMAIN"

# API and WebSocket are routed through CloudFront behaviours, so:
#   - VITE_API_URL is empty (relative paths like /pings resolve to CloudFront)
#   - VITE_WS_URL uses wss:// so the WebSocket upgrade goes over TLS
VITE_API_URL=""
VITE_WS_URL="wss://$CF_DOMAIN"

# Build and upload frontend
echo ""
echo "==> Building frontend..."
cd frontend
npm install
VITE_API_URL="$VITE_API_URL" VITE_WS_URL="$VITE_WS_URL" npx vite build
echo "==> Uploading frontend to s3://$BUCKET/..."
aws s3 sync dist/ "s3://$BUCKET/" --delete
cd ..

# Build and upload dashboard
echo ""
echo "==> Building dashboard..."
cd dashboard
npm install
VITE_API_URL="$VITE_API_URL" npx vite build
echo "==> Uploading dashboard to s3://$BUCKET/dashboard/..."
aws s3 sync dist/ "s3://$BUCKET/dashboard/" --delete
cd ..

echo ""
echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths "/*"

echo ""
echo "Done."
echo "Frontend:  https://$CF_DOMAIN/"
echo "Dashboard: https://$CF_DOMAIN/dashboard/"
