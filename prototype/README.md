# Project Harper — ED Trafficking Detection · Prototype

A fast, local prototype of the Harper detection workflow. It implements the three
DMN decisions from the spec — **ED Prescreen**, **Greenbaum (≥2 of six)**, and
**Alarm Signs** — over synthetic FHIR patients, and emits FHIR R4 resources
(`QuestionnaireResponse`, `RiskAssessment`, `Flag`, `Task`) plus an event log that
mirrors the BPMN signal → Social Worker hand-off.

> Synthetic data only. **Not for clinical use.**

## Run it

```bash
cd prototype
python3 -m venv .venv && source .venv/bin/activate      # optional
pip install -r requirements.txt
uvicorn app:app --reload
```

Then open:

- **UI:** http://localhost:8000
- **API docs (Swagger):** http://localhost:8000/docs

No backend required to just try the UI: you can also open `index.html` directly in a
browser — it computes the same decisions client-side (the badge shows
"API: standalone"). When served by the FastAPI app, the badge shows "API: connected"
and the UI calls the service.

## What it demonstrates

1. **Select a patient.** Three synthetic cases exercise the three paths:
   - *A. R. (16 F)* → screened; positive Greenbaum (≥2); suspicious alarm signs.
   - *S. B. (15 M)* → screened; negative Greenbaum (1 item).
   - *M. K. (20 F)* → **not** screened (age outside the validated 13–17 band).
2. **Nurse workstation.** Run **ED Prescreen**; if eligible, score the **Greenbaum** screen.
3. **Practitioner workstation.** Evaluate **Alarm Signs** (configurable threshold).
4. **Interoperability output.** See the generated FHIR resources and the event log
   (signal thrown, Task routed to the Social Worker worklist).

## API

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/patients` | Sample synthetic patients |
| POST | `/api/prescreen` | ED Prescreen decision |
| POST | `/api/greenbaum` | Greenbaum score + FHIR resources |
| POST | `/api/alarm-signs` | Alarm-signs decision + FHIR resources |
| POST | `/api/run-encounter` | Full nurse + practitioner flow for a sample patient |

The decision logic in `app.py` mirrors the DMN files in the repo
(`../models/dmn/ed-prescreen.dmn`, `../models/dmn/greenbaum.dmn`, `../models/dmn/alarm-signs.dmn`). Thresholds
(age band 13–17, Greenbaum cutoff 2, alarm-sign threshold 2) are constants at the
top of `app.py`.

## Relationship to the real stack

This is a stand-in for the Kogito/Quarkus service so we can iterate on the workflow
and UI quickly. The next step swaps this mock for the actual BPMN/DMN executed by
Kogito and a real FHIR server (HAPI), with no change to the clinical logic.
