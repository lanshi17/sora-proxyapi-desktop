#!/bin/bash
set -e

echo "Building Sora Desktop for macOS..."

# Build frontend
npm run build

# Build Tauri app for macOS
cd src-tauri
cargo build --release --target universal-apple-darwin

echo "Build complete!"
echo "App bundle location: src-tauri/target/universal-apple-darwin/release/bundle/macos/Sora Desktop.app"
echo "DMG location: src-tauri/target/universal-apple-darwin/release/bundle/dmg/"
