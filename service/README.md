# Harper — Kogito / Quarkus service

Executes the Project Harper **BPMN** processes and **DMN** decisions on [Kogito](https://kogito.kie.org/) (Quarkus), auto-generating REST endpoints for each. Pair it with the [`../ui`](../ui) clinical workstation, or drive it directly from Swagger UI. (The early FastAPI mock now lives in [`../archive/prototype`](../archive/prototype) and is unmaintained.)

- **Kogito** 1.44.0.Final · **Quarkus** 2.16.10.Final · **JDK 17** · **Maven 3.8+**

The BPMN/DMN in `src/main/resources/` are copies of the canonical models in `../models`. After editing a model, re-sync:

```bash
./sync-models.sh
```

## Run (dev mode)

```bash
cd service
mvn quarkus:dev
```

- API + live reload: http://localhost:8080
- Swagger UI: http://localhost:8080/q/swagger-ui
- OpenAPI: http://localhost:8080/q/openapi
- Health: http://localhost:8080/q/health

This module serves the **API only** — there is no UI on 8080. For the clinical workstation run
[`../ui`](../ui) alongside it (`cd ui && npm install && npm run dev`, then open
<http://localhost:5173>). CORS is already open to `localhost:5173`.

Kogito generates one REST resource per **executable** process and one per **DMN model**:

- **`Process_EDEncounter`** — the orchestrator. Start one instance per ED encounter; it calls Registrar → Nurse → (conditionally) Practitioner and is the end-to-end record for reporting. Use the process-management endpoints (and Kogito Data Index, if deployed) to query instances, stage timings, and outcomes.
- **`Process_Registrar_Sub`, `Process_Nurse_Sub`, `Process_LIP_Sub`** — the sub-processes it invokes.
- **`EDPrescreen`, `GreenbaumScreen`, `AlarmSigns`** — the DMN decision endpoints.

The five-pool collaboration (`ed-trafficking-detection.bpmn`) is **not** compiled — see `sync-models.sh`. Browse the exact generated paths in Swagger UI once the app starts.

Example:

```bash
# Evaluate the Greenbaum decision. ALL SEVEN inputs are required --
# omitting any one returns HTTP 500, not a validation error.
curl -X POST http://localhost:8080/GreenbaumScreen \
  -H 'Content-Type: application/json' \
  -d '{
        "historyOfBrokenBonesOrCuts":     false,
        "historyOfKnockedUnconscious":    true,
        "historyOfRunningAway":           false,
        "historyOfAlcoholOrDrugAbuse":    true,
        "everInvolvedWithLawEnforcement": false,
        "historyOfSTD":                   false,
        "numberOfSexualPartners":         2
      }'

# -> { "atRisk": true, "atRiskOriginalScreen": true, ... }
#    atRisk is the modified tool (what Harper acts on);
#    atRiskOriginalScreen is the original screen, for comparison.
```

### Greenbaum: two scorings, one call

The significant-trauma item is answered by two subquestions: **1a** broken bones or cuts needing
stitches, and **1b** knocked unconscious. The original screen counts a yes to either as one positive.
The multi-site evaluation also tested a **modified** tool that drops 1a and scores 1b alone.

`greenbaum.dmn` publishes both, returned together from a single POST:

| Decision | Trauma scores on | ED sensitivity | ED specificity |
|---|---|---|---|
| `atRisk` — **what Harper acts on** | 1b only | 83.3% | **59.5%** |
| `atRiskOriginalScreen` — comparison | 1a or 1b | 83.3% | 49.4% |

Figures from Greenbaum VJ et al., *J Adolesc Health* 2018 (n = 810, 16 sites); ED subgroup n = 91.
The modified tool buys ~10 points of ED specificity at unchanged sensitivity, which is why
`nurse.bpmn` binds `atRisk`.

> **All seven inputs are required on every call**, including `historyOfBrokenBonesOrCuts` even though
> the modified tool does not score it. Kogito raises a DMN error — surfacing as **HTTP 500**, not a
> validation message — for any input missing from the request context. There is no partial-screen
> support: send every field, using explicit `false` for unanswered items.

## Build & package

```bash
mvn package
java -jar target/quarkus-app/quarkus-run.jar
```

## Container image (Jib — no Dockerfile needed)

```bash
mvn package -Dquarkus.container-image.build=true
# push:  mvn package -Dquarkus.container-image.push=true
```

A JVM `Dockerfile.jvm` is also provided under `src/main/docker/` if you prefer `docker build`.

## Kubernetes

`quarkus-kubernetes` generates manifests during `mvn package`:

```bash
mvn package
kubectl apply -f target/kubernetes/kubernetes.yml
```

Deployment settings (namespace, replicas, probes) are in `src/main/resources/application.properties`.

## Tests

Unit and integration tests run under a single command:

```bash
mvn verify     # unit (surefire) + integration (*IT via failsafe) + coverage
mvn test       # unit only
```

- **Decision tests** (`*DecisionTest`, `@QuarkusTest`) exercise the DMN endpoints — `/EDPrescreen`, `/GreenbaumScreen`, `/AlarmSigns` — asserting the ≥ 2 Greenbaum rule, the 13–17 prescreen band, and the alarm-signs threshold.
- **`SmokeIT`** (`@QuarkusIntegrationTest`) boots the packaged app and checks readiness.
- **Coverage** (via `quarkus-jacoco`) is written to `target/jacoco-report/index.html`.
- **CI** (`.github/workflows/ci.yml`) runs `mvn verify` on every push and pull request — the going-forward gate: no process or decision merges without a test.

The endpoint/JSON shapes in the decision tests follow Kogito's default DMN mapping (context keyed by input-data / decision names). Confirm them against the generated OpenAPI (`/q/openapi`) on first run and adjust if your Kogito version differs. Grow the suite with a `*DecisionTest` per DMN and a process test per executable BPMN (asserting the draft → finalize → signal path).

## Model conventions

The items that once blocked a clean Kogito build are resolved — `mvn verify` is green. What
remains is the set of conventions the models follow; keep to them when adding processes or
decisions.

**Executable vs design-only.** Only `isExecutable="true"` processes reach codegen:

| Process | File | Executable |
|---|---|---|
| `Process_EDEncounter` | `ed-encounter.bpmn` | yes — the orchestrator, one instance per visit |
| `Process_Registrar_Sub` | `registrar.bpmn` | yes |
| `Process_Nurse_Sub` | `nurse.bpmn` | yes |
| `Process_LIP_Sub` | `practitioner.bpmn` | yes |
| the five pools | `ed-trafficking-detection.bpmn` | no — design artifact |

A BPMN collaboration makes each pool a separate process, so it cannot produce one end-to-end
instance. It documents the pathway; the orchestrator executes it.

**DMN names are space-free.** Model names map straight to endpoint paths — `GreenbaumScreen`
→ `POST /GreenbaumScreen`. Do not reintroduce spaces.

**Every DMN input is required.** Kogito raises a DMN error for an input absent from the request
context, and the generated resource returns **HTTP 500** — not a validation message. Send every
field on every call, with explicit `false` for unanswered booleans. There is no partial-screen
support; adding it means defaulting at the API boundary or returning a 400 instead.

**Signals and typed data.** `Referral drafted` and `Suspect sex trafficking` are declared with
item definitions so they round-trip through codegen. New signals need the same.

**No Docker required.** `quarkus.kogito.devservices.enabled=false` stops Kogito auto-starting a
Data Index container. The process endpoints work without it; Data Index only adds richer
querying. Set it to `true` (with Docker running) if you want that.
