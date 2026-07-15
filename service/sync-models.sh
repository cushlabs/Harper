#!/usr/bin/env bash
# Copy the canonical BPMN/DMN models into the service's resources for the build.
# The design source of truth is ../models; this service compiles a copy.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cp "$here"/../models/bpmn/*.bpmn "$here"/src/main/resources/
cp "$here"/../models/dmn/*.dmn  "$here"/src/main/resources/
echo "Synced models -> service/src/main/resources/"
