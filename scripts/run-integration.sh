#!/usr/bin/env bash
# One-shot integration test runner (#29).
# Boots the llm-proxy harness (real Edge handlers + mock LLM upstream +
# mock Upstash KV), waits for readiness, runs the Bruno collection against
# localhost, then tears everything down. Fails hard on any failure —
# no swallowing, no fake greens.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export API_KEY="${API_KEY:-harness-test-key}"
PROXY_PORT="${PROXY_PORT:-3000}"
HEALTH_URL="http://localhost:${PROXY_PORT}/api/llm-proxy"

npx tsx scripts/llm-proxy-harness.ts > /tmp/llm-proxy-harness.log 2>&1 &
HARNESS_PID=$!
cleanup() {
  kill "$HARNESS_PID" 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 30); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$HARNESS_PID" 2>/dev/null; then
    echo "Harness exited early:" >&2
    cat /tmp/llm-proxy-harness.log >&2
    exit 1
  fi
  sleep 1
done

if ! curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
  echo "Harness did not become healthy within 30s:" >&2
  cat /tmp/llm-proxy-harness.log >&2
  exit 1
fi

cd bruno
exec node ../node_modules/@usebruno/cli/bin/bru.js run --env ci "$@"
