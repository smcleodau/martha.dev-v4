#!/bin/bash
# Check Temporal Cloud mTLS Certificate Status

echo "=== Temporal Cloud Certificate Check ==="
echo ""

CERT_PATH="${TEMPORAL_CLIENT_CERT_PATH:-$HOME/.credentials/temporal-client.pem}"
KEY_PATH="${TEMPORAL_CLIENT_KEY_PATH:-$HOME/.credentials/temporal-client.key}"

echo "Expected certificate locations:"
echo "  Certificate: $CERT_PATH"
echo "  Private Key: $KEY_PATH"
echo ""

# Check certificate file
if [ -f "$CERT_PATH" ]; then
  echo "✅ Certificate file exists"
  CERT_SIZE=$(stat -f%z "$CERT_PATH" 2>/dev/null || stat -c%s "$CERT_PATH" 2>/dev/null)
  CERT_PERMS=$(stat -f%Lp "$CERT_PATH" 2>/dev/null || stat -c%a "$CERT_PATH" 2>/dev/null)
  echo "   Size: $CERT_SIZE bytes"
  echo "   Permissions: $CERT_PERMS"

  if [ "$CERT_PERMS" != "600" ]; then
    echo "   ⚠️  WARNING: Permissions should be 600"
    echo "   Run: chmod 600 $CERT_PATH"
  fi
else
  echo "❌ Certificate file NOT FOUND"
  echo "   Upload client certificate to: $CERT_PATH"
fi

echo ""

# Check private key file
if [ -f "$KEY_PATH" ]; then
  echo "✅ Private key file exists"
  KEY_SIZE=$(stat -f%z "$KEY_PATH" 2>/dev/null || stat -c%s "$KEY_PATH" 2>/dev/null)
  KEY_PERMS=$(stat -f%Lp "$KEY_PATH" 2>/dev/null || stat -c%a "$KEY_PATH" 2>/dev/null)
  echo "   Size: $KEY_SIZE bytes"
  echo "   Permissions: $KEY_PERMS"

  if [ "$KEY_PERMS" != "600" ]; then
    echo "   ⚠️  WARNING: Permissions should be 600"
    echo "   Run: chmod 600 $KEY_PATH"
  fi
else
  echo "❌ Private key file NOT FOUND"
  echo "   Upload client private key to: $KEY_PATH"
fi

echo ""
echo "=== Configuration Status ==="
echo ""

# Check if both files exist
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
  echo "✅ Both certificate files present"
  echo ""
  echo "Next steps:"
  echo "  1. cd /mnt/data/martha.dev-v4-orchestration"
  echo "  2. npm run build"
  echo "  3. npm run worker"
  echo "  4. npx tsx trigger-cloud-workflow.ts"
else
  echo "⏳ Waiting for certificate files"
  echo ""
  echo "To generate certificates:"
  echo "  1. Visit: https://cloud.temporal.io/settings/certificates"
  echo "  2. Click 'Create Certificate'"
  echo "  3. Select namespace: martha-dev-v4.mnjo7"
  echo "  4. Download and save as:"
  echo "     - $CERT_PATH"
  echo "     - $KEY_PATH"
fi

echo ""
