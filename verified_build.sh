#!/bin/bash
set -e

# Build script for SyntaxVoid Pulsar
# Usage: ./verified_build.sh

echo "Starting verified build process..."

# Check Node version
echo "Node version: $(node -v)"
# Warn if not v10-16, but try anyway as per plan
if [[ $(node -v) != v1* ]]; then
  echo "WARNING: Node version is not within v10-v16 range as recommended. Proceeding with current version..."
fi

# Check for required system dependencies
echo "Checking for system dependencies..."
if ! pkg-config --exists wayland-client; then
  echo "ERROR: wayland-client is missing."
  echo "Please install it by running: sudo apt-get install libwayland-dev libx11-dev libxkbfile-dev libsecret-1-dev pkg-config"
  exit 1
fi

if ! pkg-config --exists xkbcommon; then
  echo "ERROR: xkbcommon is missing."
  echo "Please install it by running: sudo apt-get install libxkbcommon-dev"
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
yarn install --ignore-engines
echo "Patching dependencies..."
node script/patch-dependencies.js

# Build the project
echo "Building project..."
echo "Building project..."
yarn build

# Build APM
echo "Building APM..."
# yarn build:apm

echo "Build complete. To run in dev mode, execute: yarn start"
