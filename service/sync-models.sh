#!/usr/bin/env bash
# Copy the executable BPMN/DMN models into the service's resources for the build.
# The design source of truth is ../models; this service compiles a copy.
#
# NOT compiled: ed-trafficking-detection.bpmn — the five-pool collaboration is a
# DESIGN artifact (participant choreography). In BPMN each pool is its own process,
# so it cannot produce a single end-to-end instance. Execution and end-to-end
# reporting come from ed-encounter.bpmn (one instance per ED encounter).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dest="$here/src/main/resources"

rm -f "$dest"/*.bpmn "$dest"/*.dmn

for f in "$here"/../models/bpmn/*.bpmn; do
  case "$(basename "$f")" in
    ed-trafficking-detection.bpmn) continue ;;   # design-only collaboration
  esac
  cp "$f" "$dest/"
done
cp "$here"/../models/dmn/*.dmn "$dest/"

echo "Synced models -> service/src/main/resources/"
ls -1 "$dest" | sed 's/^/  /'
