#!/usr/bin/env bash
set -euo pipefail

LAMBDA_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$LAMBDA_DIR/build"
DIST_DIR="$LAMBDA_DIR/dist"
ZIP_PATH="$DIST_DIR/analytics_lambda.zip"

rm -rf "$BUILD_DIR" "$DIST_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

if [ -f "$LAMBDA_DIR/requirements.txt" ]; then
  python -m pip install -r "$LAMBDA_DIR/requirements.txt" -t "$BUILD_DIR"
fi

cp "$LAMBDA_DIR/handler.py" "$BUILD_DIR/"

export BUILD_DIR
export ZIP_PATH

python - <<'PY'
import os
import zipfile

build_dir = os.environ["BUILD_DIR"]
zip_path = os.environ["ZIP_PATH"]

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(build_dir):
        for file in files:
            full_path = os.path.join(root, file)
            arcname = os.path.relpath(full_path, build_dir)
            zf.write(full_path, arcname)

print(f"Created {zip_path}")
PY