#!/bin/bash
# Fix ES module imports after SWC build
# SWC strips /index.js from imports, which breaks ES modules

echo "Fixing ES module imports..."
find dist/src -name "*.js" -type f -exec sed -i 's|from "\(.*\)/config"|from "\1/config/index.js"|g' {} \;
echo "Fixed config imports in dist/"
