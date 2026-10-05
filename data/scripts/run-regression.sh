#!/usr/bin/env bash
# Full regression run: client lint -> server API tests (Vitest) -> browser
# tests (Playwright), against the throwaway docker stack. Run from anywhere:
#
#   bash data/scripts/run-regression.sh          # everything
#   bash data/scripts/run-regression.sh --keep   # leave the test stack up after
#
# See data/ai-build-docs/regression-testing/RUNBOOK.md.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

declare -A RESULT
run() { # name, dir, command...
  local name=$1 dir=$2; shift 2
  echo; echo "=== $name ==="
  if (cd "$ROOT/$dir" && "$@"); then RESULT[$name]=PASS; else RESULT[$name]=FAIL; fi
}

echo "=== test stack (Postgres :5433, Mailpit :1026/:8026) ==="
(cd "$ROOT/server" && npm run --silent test:db:up) || { echo "Could not start the test stack (is Docker running?)"; exit 1; }

run "client lint" client npm run --silent lint
run "server api (vitest)" server npm test --silent
run "browser (playwright)" client npm run --silent test:e2e

[ $KEEP = 1 ] || (cd "$ROOT/server" && npm run --silent test:db:down >/dev/null)

echo; echo "=== summary ==="
status=0
for k in "client lint" "server api (vitest)" "browser (playwright)"; do
  printf '  %-22s %s\n' "$k" "${RESULT[$k]}"
  [ "${RESULT[$k]}" = PASS ] || status=1
done
[ $status = 0 ] || echo "  Playwright report: client/playwright-report/index.html"
exit $status
