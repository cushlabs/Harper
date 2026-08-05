# Harper UI — ED Clinical Workstation

React + Vite front end for the Kogito service. Walks a synthetic patient through the ED
screening pathway and shows what the engine decided at each step.

> Synthetic data — **not for clinical use.**

## Run

Two terminals:

```bash
# 1) the engine
cd service && mvn quarkus:dev        # http://localhost:8080

# 2) the UI
cd ui && npm install && npm run dev  # http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:8080`, so the browser sees one origin.
Point at a different backend with:

```bash
HARPER_API=http://my-host:8080 npm run dev
```

(The service also enables CORS for `localhost:5173`, so a direct call works too.)

## What it does

1. **Select a patient** and start an **ED Encounter** — a real `Process_EDEncounter` instance in the engine.
   > **Known gap.** The engine's clinical steps are BPMN user tasks, so the instance pauses at the first
   > one and waits. This UI does not complete user tasks yet — it drives the decisions by calling the DMN
   > endpoints directly (steps 2–3), so the screening flow below works, but the encounter instance stays
   > parked rather than running to completion. Wiring the task endpoints is the next piece of work.
2. **Nurse:** run **ED Prescreen**; if screening is indicated, complete and score the **Greenbaum** screen.
3. **Practitioner:** record **Alarm Signs** and evaluate.
4. A positive screen or suspicious findings raises a **draft referral**, which a practitioner must
   **finalize** before it routes to the Social Worker.
5. The **process flow** panel highlights the path taken; **Activity** logs each call, with raw
   service responses available for inspection.

## No clinical logic here

Every threshold and rule — the 13–17 age band, the Greenbaum ≥ 2 cutoff, the alarm-sign
threshold — lives in the BPMN/DMN models and is evaluated server-side. `src/api.js` only
moves JSON; `src/App.jsx` renders whatever the service returns. Change a rule by editing a
model in [`../models`](../models), never by editing this app.

## Endpoints used

| Call | Purpose |
|---|---|
| `POST /EDPrescreen` | should this patient be screened? |
| `POST /GreenbaumScreen` | at risk? (≥ 2 of six) — returns `atRisk` (modified tool, what the UI shows) and `atRiskOriginalScreen` (comparison) |
| `POST /AlarmSigns` | alarm-sign count + suspicious findings |
| `POST /Process_EDEncounter` | start an encounter instance |
| `GET /Process_EDEncounter[/{id}]` | list / fetch instances |

All DMN inputs are required on every call — a missing field returns HTTP 500, not a validation
error. `src/api.js` always sends complete bodies.

Verify against `http://localhost:8080/q/swagger-ui`.
