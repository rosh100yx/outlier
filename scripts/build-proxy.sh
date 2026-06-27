#!/usr/bin/env bash
if command -v cargo >/dev/null 2>&1; then
  echo "Cargo found. Compiling Rust MCP Proxy..."
  cd packages/mcp-proxy && cargo build --release
  mkdir -p ../../bin/native
  cp target/release/outlier-telemetry-engine ../../bin/native/
else
  echo "Cargo not found. Skipping Rust proxy compilation."
fi
