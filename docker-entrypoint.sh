#!/bin/sh
set -e

# MinRisk Docker Entrypoint Script
# This script runs before nginx starts and can be used for runtime configuration

echo "========================================="
echo "  MinRisk ERM Platform"
echo "  Starting container..."
echo "========================================="

# Display environment info (without exposing sensitive data)
echo "Environment: ${NODE_ENV:-production}"
echo "Supabase URL: ${VITE_SUPABASE_URL:0:30}..."

# Optional: Generate runtime configuration file if needed
# This allows dynamic configuration without rebuilding the image
if [ -n "$VITE_SUPABASE_URL" ] && [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "Runtime configuration detected"

    # Create a runtime config file that can be loaded by the app
    # Note: Vite env vars are baked in at build time, so this is for future use
    cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.RUNTIME_CONFIG = {
  SUPABASE_URL: '${VITE_SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${VITE_SUPABASE_ANON_KEY}',
  ANTHROPIC_API_KEY: '${VITE_ANTHROPIC_API_KEY}',
  VERSION: '${APP_VERSION:-1.0.0}',
  ENVIRONMENT: '${NODE_ENV:-production}'
};
EOF
    echo "Runtime configuration file created"
fi

# Validate that required files exist
if [ ! -f /usr/share/nginx/html/index.html ]; then
    echo "ERROR: index.html not found. Build may have failed."
    exit 1
fi

echo "Checking nginx configuration..."
nginx -t

echo "========================================="
echo "  MinRisk is ready!"
echo "  Container started successfully"
echo "========================================="

# Execute the CMD from Dockerfile (nginx)
exec "$@"
