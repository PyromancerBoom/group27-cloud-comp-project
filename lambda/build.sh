#!/usr/bin/env bash
set -euo pipefail

LAMBDA_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$LAMBDA_DIR/build"
DIST_DIR="$LAMBDA_DIR/dist"
ZIP_PATH="$DIST_DIR/analytics_lambda.zip"

rm -rf "$BUILD_DIR" "$DIST_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

if [ -f "$LAMBDA_DIR/requirements.txt" ]; then
  pip install -r "$LAMBDA_DIR/requirements.txt" -t "$BUILD_DIR"
fi

cp "$LAMBDA_DIR/handler.py" "$BUILD_DIR/"

cd "$BUILD_DIR"
zip -rq "$ZIP_PATH" .

echo "Built Lambda package at: $ZIP_PATH"
