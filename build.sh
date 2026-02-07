#!/bin/bash
set -e

echo "=== Building frontend ==="
cd frontend
npm install
CI=false npm run build
cd ..

echo "=== Creating dist folder ==="
rm -rf dist
mkdir -p dist

echo "=== Copying React build ==="
cp -r frontend/build/* dist/

echo "=== Renaming React index to app.html ==="
mv dist/index.html dist/app.html

echo "=== Copying landing pages ==="
cp -r landing/* dist/

echo "=== Final dist contents ==="
ls -la dist/
echo "=== Done ==="
