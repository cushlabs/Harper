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
├── service/                             Kogito / Quarkus service — executes the models
└── archive/                             Superseded material (early prototype), unmaintained
```

## The models

- The **top-level** BPMN orchestrates five pools; Registrar, Nurse, and Practitioner are call activities that invoke the sub-processes.
- **Signals:** the Nurse's at-risk decision throws `Referral drafted` (which starts the Practitioner swimlane); the Practitioner's *Finalize* step throws `Suspect sex trafficking` (which starts the Social Worker).
- **DMN:** *ED Prescreen* (decision table), *Greenbaum* (≥ 2 of six items), *Alarm Signs* (count + threshold). Business-rule tasks bind to these via Kogito's `implementation="http://www.jboss.org/drools/dmn"`.
- Open the models in any BPMN/DMN tool — Kogito, bpmn.io, Camunda Modeler, or Trisotech.

## Run it

```bash
cd service
mvn quarkus:dev
```

Then open **http://localhost:8080** (Swagger UI at `/q/swagger-ui`). Kogito generates a REST endpoint per executable process and per DMN decision — no hand-written business logic. See [`service/README.md`](service/README.md).

## Source of truth

The BPMN and DMN files in `models/` define **all** process and decision logic. `service/src/main` contains no hand-written Java — everything is generated from the models at build time. Keep it that way: change a rule by editing the model, never by writing code.

## Roadmap

The [`service/`](service/) module runs these BPMN/DMN files on Kogito (Kubernetes-ready via `quarkus-kubernetes`). Remaining work: finish hardening the models for a clean Kogito build (see [`service/README.md`](service/README.md)), replace the placeholder script tasks with real FHIR service tasks, add SMART on FHIR / CDS Hooks endpoints, and back it with a HAPI FHIR server.

## Tests & CI

The `service/` module is tested under one command — `mvn verify` (unit + integration + coverage) — and [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs it on every push and pull request. Going forward, new processes and decisions land with tests. See [`service/README.md`](service/README.md#tests).

## License

Apache License 2.0 — see [LICENSE](LICENSE).
