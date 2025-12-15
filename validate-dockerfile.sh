#!/bin/bash
echo "🔍 Comprehensive Dockerfile Validation"
echo "======================================"
echo ""

# Check if Dockerfile exists
if [ ! -f Dockerfile ]; then
    echo "❌ Dockerfile not found!"
    exit 1
fi

echo "✅ Dockerfile found"
echo ""

# Check required files
echo "📁 Checking required files:"
[ -f package.json ] && echo "  ✅ package.json" || echo "  ❌ package.json missing"
[ -f server.js ] && echo "  ✅ server.js" || echo "  ❌ server.js missing"
[ -f .dockerignore ] && echo "  ✅ .dockerignore" || echo "  ⚠️  .dockerignore missing (optional but recommended)"
echo ""

# Validate Dockerfile structure
echo "📋 Dockerfile Structure:"
grep -q "^FROM" Dockerfile && echo "  ✅ FROM statement present" || echo "  ❌ Missing FROM statement"
grep -q "^WORKDIR" Dockerfile && echo "  ✅ WORKDIR defined" || echo "  ⚠️  WORKDIR not defined"
grep -q "^COPY.*package" Dockerfile && echo "  ✅ Package files copied" || echo "  ⚠️  Package files not copied"
grep -q "^RUN.*npm" Dockerfile && echo "  ✅ Dependencies installation step" || echo "  ❌ Missing npm install step"
grep -q "^EXPOSE" Dockerfile && echo "  ✅ Port exposed" || echo "  ⚠️  Port not exposed"
grep -q "^CMD\|^ENTRYPOINT" Dockerfile && echo "  ✅ Startup command defined" || echo "  ❌ Missing startup command"
echo ""

# Check for best practices
echo "🔒 Security & Best Practices:"
grep -q "USER" Dockerfile && echo "  ✅ Non-root user configured" || echo "  ⚠️  Running as root (security risk)"
grep -q "HEALTHCHECK" Dockerfile && echo "  ✅ Health check configured" || echo "  ⚠️  No health check"
grep -q "npm cache clean" Dockerfile && echo "  ✅ npm cache cleaned" || echo "  ⚠️  npm cache not cleaned"
grep -q "rm -rf.*apt/lists" Dockerfile && echo "  ✅ apt cache cleaned" || echo "  ⚠️  apt cache not cleaned"
echo ""

# Check for potential issues
echo "⚠️  Potential Issues:"
if grep -q "npm install" Dockerfile && ! grep -q "npm ci" Dockerfile; then
    echo "  ⚠️  Using 'npm install' instead of 'npm ci' (less deterministic)"
fi
if ! grep -q "\.dockerignore" Dockerfile 2>/dev/null; then
    echo "  ℹ️  Consider using .dockerignore to reduce build context"
fi
echo ""

echo "======================================"
echo "✅ Dockerfile validation complete!"
echo ""
echo "To test the actual build, install Docker Desktop:"
echo "  brew install --cask docker"
echo "  # Then start Docker Desktop and run:"
echo "  docker build -t growable-backend:latest ."
