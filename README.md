# Project Harper

**Open-source, real-time detection of human trafficking in the emergency department.**

Project Harper detects possible child sex trafficking in real time during an emergency-department (ED) visit and connects suspected victims to help before discharge. It is a license-free rebuild of the 2022 HIMSS "Greenbaum 2.0" interoperability blueprint, built entirely on open standards and open-source software so a commercial hospital ED can adopt it without paying for the detection capability itself.

> **Synthetic data only.** Nothing here is for clinical use without appropriate governance, local validation, and safeguards.

## How it works

As a patient moves through registration → triage → examination → discharge, Harper watches the FHIR record, prompts the validated Greenbaum screen at the right moment, and scores risk with transparent, inspectable decision logic. A positive screen **drafts** a social-work referral; a licensed practitioner must **finalize** it before it routes. Automation assists — a clinician always decides — and the system never contacts law enforcement on its own.

## Open stack

FHIR R4 / US Core · CDS Hooks · SMART on FHIR · BPMN + DMN (Kogito) · Kubernetes. Every layer is open-source and permissively licensed.

## Repository layout

```
.
├── docs/                                 Specification and overview
│   ├── use-case-specification.docx       Full use-case spec (v1.2)
│   └── what-is-project-harper.docx        One-page overview
├── models/
│   ├── bpmn/                             Executable BPMN 2.0 process models
│   │   ├── ed-trafficking-detection.bpmn  Top-level collaboration (5 pools)
│   │   ├── registrar.bpmn
│   │   ├── nurse.bpmn
│   │   └── practitioner.bpmn
│   └── dmn/                              DMN 1.3 decision models
│       ├── ed-prescreen.dmn              Should the patient be screened?
│       ├── greenbaum.dmn                 At risk? (>= 2 of six items)
│       └── alarm-signs.dmn               Count + suspicious-findings threshold
└── prototype/                           Runnable FastAPI service + web UI
```

## The models

- The **top-level** BPMN orchestrates five pools; Registrar, Nurse, and Practitioner are call activities that invoke the sub-processes.
- **Signals:** the Nurse's at-risk decision throws `Referral drafted` (which starts the Practitioner swimlane); the Practitioner's *Finalize* step throws `Suspect sex trafficking` (which starts the Social Worker).
- **DMN:** *ED Prescreen* (decision table), *Greenbaum* (≥ 2 of six items), *Alarm Signs* (count + threshold). Business-rule tasks bind to these via Kogito's `implementation="http://www.jboss.org/drools/dmn"`.
- Open the models in any BPMN/DMN tool — Kogito, bpmn.io, Camunda Modeler, or Trisotech.

## Run the prototype

```bash
cd prototype
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

Then open **http://localhost:8000** (API docs at `/docs`). You can also open `prototype/index.html` directly in a browser — it runs the same decision logic client-side, with a pinned BPMN process view that highlights as you work through an encounter. See [`prototype/README.md`](prototype/README.md).

## Roadmap

The models and prototype are ready; the next step is a Kogito/Quarkus service (Helm chart + `src/main/resources` holding these BPMN/DMN files) so the real engine executes them, backed by a HAPI FHIR server, deployed to Kubernetes.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
