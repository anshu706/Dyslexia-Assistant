#!/usr/bin/env bash

# Smoke-test script to verify required security headers on deployed URL or local server
# Usage: ./scripts/verify-headers.sh [URL]

TARGET_URL="${1:-http://localhost:8080}"

echo "=== Verifying Security Headers on: $TARGET_URL ==="

RESPONSE_HEADERS=$(curl -s -I "$TARGET_URL")

check_header() {
  local header="$1"
  if echo "$RESPONSE_HEADERS" | grep -i -q "$header"; then
    echo -e " [✓] PASS: $header present"
  else
    echo -e " [✗] FAIL: $header MISSING"
    FAILED=1
  fi
}

FAILED=0

check_header "Content-Security-Policy"
check_header "X-Content-Type-Options: nosniff"
check_header "X-Frame-Options: DENY"
check_header "Referrer-Policy"
check_header "Permissions-Policy"

if [ "$FAILED" -eq 0 ]; then
  echo "=== All Security Headers Verified Successfully ==="
  exit 0
else
  echo "=== Security Header Verification FAILED ==="
  exit 1
fi
