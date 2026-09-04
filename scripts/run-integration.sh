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

# Unique log file: a predictable /tmp path could be pre-created or symlinked
# by a local process before we redirect into it.
HARNESS_LOG="$(mktemp /tmp/llm-proxy-harness.XXXXXX.log)"
# setsid gives the harness its own process group so cleanup can kill the
# whole tree (npx -> tsx -> node), not just the direct child.
setsid npx tsx scripts/llm-proxy-harness.ts > "$HARNESS_LOG" 2>&1 &
HARNESS_PID=$!
cleanup() {
  kill -- "-$HARNESS_PID" 2>/dev/null || true
  rm -f "$HARNESS_LOG"
}
trap cleanup EXIT

for i in $(seq 1 30); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$HARNESS_PID" 2>/dev/null; then
    echo "Harness exited early:" >&2
    cat "$HARNESS_LOG" >&2
    exit 1
  fi
  sleep 1
done

if ! curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
  echo "Harness did not become healthy within 30s:" >&2
  cat "$HARNESS_LOG" >&2
  exit 1
fi

cd bruno
# No exec: replacing the shell would skip the EXIT trap and leave the
# harness (and its ports) running after Bruno finishes.
node ../node_modules/@usebruno/cli/bin/bru.js run --env ci "$@"
