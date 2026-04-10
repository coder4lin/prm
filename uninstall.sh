#!/bin/bash
set -e

echo "Uninstalling PRM..."

cd "$(dirname "$0")"

# Find node bin directory
NODE_BIN_DIR=$(dirname "$(command -v node)" 2>/dev/null)
if [ -z "$NODE_BIN_DIR" ] || [ ! -d "$NODE_BIN_DIR" ]; then
    echo "Error: Node binary directory not found"
    exit 1
fi

# Get npm prefix
NPM_PREFIX=$(npm config get prefix 2>/dev/null)
if [ -z "$NPM_PREFIX" ]; then
    NPM_PREFIX="$NODE_BIN_DIR/.."
fi

# Node modules lib directory
LIB_DIR="$NPM_PREFIX/lib/node_modules/prm"

echo "Removing:"
echo "  Bin: $NODE_BIN_DIR/prm"
echo "  Lib: $LIB_DIR"
echo ""

# Remove bin symlink
if [ -L "$NODE_BIN_DIR/prm" ]; then
    rm -f "$NODE_BIN_DIR/prm"
    echo "✓ Removed bin symlink"
fi

# Remove lib directory
if [ -d "$LIB_DIR" ]; then
    rm -rf "$LIB_DIR"
    echo "✓ Removed lib directory"
fi

echo ""
echo "✅ PRM uninstalled successfully!"