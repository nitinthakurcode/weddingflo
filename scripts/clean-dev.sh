#!/usr/bin/env bash
# Clean stale build artifacts before dev server start.
# Prevents cold-start failures from corrupted Turbopack/TS cache.
# Usage: npm run dev:clean

set -e

echo "Cleaning stale build artifacts..."

rm -rf .next
rm -f tsconfig.tsbuildinfo

echo "Clean complete. Starting dev server..."
