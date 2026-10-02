#!/usr/bin/env bash
set -euo pipefail

# RBL-003: prove that a failing producer is not hidden by tee.
if (set -o pipefail; false | tee /dev/null >/dev/null); then
  echo "ERROR: pipefail self-test unexpectedly succeeded"
  exit 1
fi

echo "ci pipefail self-test: PASS"
