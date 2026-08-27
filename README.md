# Project Harper

**Open-source, real-time detection of human trafficking in the emergency department.**

Project Harper detects possible child sex trafficking in real time during an emergency-department (ED) visit and connects suspected victims to help before discharge. It is an open-source rebuild of the 2022 HIMSS "Greenbaum 2.0" interoperability blueprint, built entirely on open standards so an ED can adopt the *implementation* without licensing fees. The clinical instrument it administers — the Greenbaum Short Screen — carries its own separate terms. **Read [License](#license) before deploying.**

> **Synthetic data only.** Nothing here is for clinical use without appropriate governance, local validation, and safeguards.

**[Reference architecture →](https://cushlabs.github.io/Harper/)** — the target-state design in one page: logical, runtime and Kubernetes deployment views, with the open standard named on every interface.

## How it works

As a patient moves through registration → triage → examination → discharge, Harper watches the FHIR record, prompts the validated Greenbaum screen at the right moment, and scores risk with transparent, inspectable decision logic. A positive screen **drafts** a social-work referral; a licensed practitioner must **finalize** it before it routes. Automation assists — a clinician always decides — and the system never contacts law enforcement on its own.

## Open stack

FHIR R4 / US Core · CDS Hooks · SMART on FHIR · BPMN + DMN (Kogito) · Kubernetes. Every layer of the *technology stack* is open-source and permissively licensed. The Greenbaum screening instrument encoded in the decision models is **not** — see [License](#license).

## Repository layout

```
.
├── docs/                                 Specification, overview, and the published site
│   ├── index.html                        Reference architecture — served at cushlabs.github.io/Harper
│   ├── use-case-specification.docx       Full use-case spec (v1.2)
│   └── what-is-project-harper.docx       One-page overview
├── models/
│   ├── bpmn/                             BPMN 2.0 process models
│   │   ├── ed-encounter.bpmn              Orchestrator — one instance per ED encounter (executable)
│   │   ├── registrar.bpmn                 } sub-processes invoked by the
│   │   ├── nurse.bpmn                     } orchestrator (executable)
│   │   ├── practitioner.bpmn              }
│   │   └── ed-trafficking-detection.bpmn  5-pool collaboration — design artifact, not compiled
│   └── dmn/                              DMN 1.3 decision models
│       ├── ed-prescreen.dmn              Should the patient be screened?
│       ├── greenbaum.dmn                 At risk? (>= 2 of six items; modified + original)
│       └── alarm-signs.dmn               Count + suspicious-findings threshold
├── service/                             Kogito / Quarkus service — executes the models
├── ui/                                  React + Vite clinical workstation (talks to the service)
└── archive/                             Superseded material (early prototype), unmaintained
```

## The models

- **`ed-encounter.bpmn` is the executable orchestrator**: one process instance per ED encounter, calling Registrar → Nurse → (when a draft referral is raised) Practitioner. It is designed to be the end-to-end reporting spine — status, stage timings, and outcome for a visit.
- **The pathway is asynchronous.** The clinical steps are BPMN **user tasks**: an instance runs until it reaches one, then waits for a human to complete it with data. "Nurse Triage Data Collection" supplies the three ED Prescreen inputs; "Nurse collects information" supplies the seven Greenbaum items; "Collect Patient Data" supplies the seven alarm signs. Those answers land in process variables that the business-rule tasks read. Starting an encounter therefore returns a *waiting* instance, not a finished result. **The UI does not yet complete these tasks** — it calls the DMN endpoints directly instead, so an encounter instance currently parks at the first user task. Wiring that up is the next piece of work.
- **`ed-trafficking-detection.bpmn`** documents the same pathway as a five-pool collaboration. It is a design artifact and is deliberately **not** compiled: in BPMN each pool is a separate process, so a collaboration cannot yield a single end-to-end instance.
- **Signals:** the Nurse's at-risk decision throws `Referral drafted` (which starts the Practitioner swimlane); the Practitioner's *Finalize* step throws `Suspect sex trafficking` (which starts the Social Worker).
- **DMN:** *ED Prescreen* (decision table), *Greenbaum* (≥ 2 of six items), *Alarm Signs* (count + threshold). Business-rule tasks bind to these via Kogito's `implementation="http://www.jboss.org/drools/dmn"`.
- **Two scorings, one call.** The significant-trauma item is answered by two subquestions — *1a* broken bones or cuts needing stitches, *1b* knocked unconscious. The **original** screen counts a yes to either as one positive; the **modified** tool drops 1a and scores 1b alone. `greenbaum.dmn` publishes both as separate decisions — `atRisk` (modified) and `atRiskOriginalScreen` (original) — returned together from one call. **Harper acts on `atRisk`.** All seven inputs are required on every call, including 1a.
- **Screen performance.** At the ≥ 2 cutoff, per the multi-site evaluation ([Greenbaum VJ et al., *J Adolesc Health* 2018](https://doi.org/10.1016/j.jadohealth.2018.06.032); n = 810 across 16 sites, ED subgroup n = 91):

  | Decision | Trauma scores on | ED sens. | ED spec. | Total sens. | Total spec. |
  |---|---|---|---|---|---|
  | **`atRisk`** (modified, Harper default) | 1b | 83.3% | **59.5%** | 84.4% | 64.6% |
  | `atRiskOriginalScreen` | 1a or 1b | 83.3% | 49.4% | 84.4% | 57.5% |

  Dropping 1a buys roughly 10 points of ED specificity at no cost to sensitivity — which is why Harper scores it by default. The original single-site study reported 92.3% / 74.4%, better than either multi-site result; do not plan around it. Even at 59.5%, about 40% of non-victims screen positive, so **size the downstream social-work path for a high false-positive rate.**
- Open the models in any BPMN/DMN tool — Kogito, bpmn.io, Camunda Modeler, or Trisotech.

## Run it

**Prerequisites:** JDK 17 · Maven 3.8+ · Node 18+ (for the UI). No Docker needed — Kogito's
Data Index dev service is disabled by default.

Harper is two processes: the **engine** (Kogito/Quarkus, serves the API) and the **UI**
(React/Vite). Run both, in two terminals:

```bash
# 1) the engine — REST endpoints generated from the BPMN/DMN models
cd service && mvn quarkus:dev          # http://localhost:8080

# 2) the UI — clinical workstation
cd ui && npm install && npm run dev    # http://localhost:5173
```

Then open **<http://localhost:5173>** and walk a synthetic patient through the pathway.

The engine has no UI of its own — port 8080 is the API. Useful entry points there:

| URL | What |
|---|---|
| `http://localhost:8080/q/swagger-ui` | every generated endpoint, try them directly |
| `http://localhost:8080/q/openapi` | the OpenAPI document |
| `http://localhost:8080/q/health` | liveness / readiness |

Kogito generates one REST endpoint per executable process and per DMN decision — there is no
hand-written business logic. Vite proxies `/api/*` to port 8080, so the browser sees a single
origin; the service also allows CORS from `localhost:5173` for direct calls. Point the UI at a
different backend with `HARPER_API=http://host:8080 npm run dev`.

**Engine only?** Skip step 2 and drive the API from Swagger UI. See
[`service/README.md`](service/README.md). **UI details:** [`ui/README.md`](ui/README.md).

## Source of truth

The BPMN and DMN files in `models/` define **all** process and decision logic. `service/src/main` contains no hand-written Java — everything is generated from the models at build time. Keep it that way: change a rule by editing the model, never by writing code.

## Roadmap

The [`service/`](service/) module runs these BPMN/DMN files on Kogito (Kubernetes-ready via `quarkus-kubernetes`) and builds green. **The FHIR, CDS Hooks and SMART on FHIR layers are not built yet** — the models call placeholder script tasks, not a real FHIR server. Remaining work: wire the UI to fetch and complete the BPMN user tasks so an encounter runs end to end, replace the placeholder script tasks with real FHIR service tasks, add SMART on FHIR / CDS Hooks endpoints, back it with a HAPI FHIR server, and add a partial-screen path so an incomplete screen returns a validation error rather than an HTTP 500 (see [`service/README.md`](service/README.md)).

## Tests & CI

The `service/` module is tested under one command — `mvn verify` from the repo root (unit + integration + coverage) — and [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs it on every push and pull request. Going forward, new processes and decisions land with tests. See [`service/README.md`](service/README.md#tests).

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes [`docs/`](docs/) to <https://cushlabs.github.io/Harper/> when a change to that directory lands on `main`. The site is the single self-contained `docs/index.html` — no build step and no generator, so editing that file is the whole publishing process.

## License

This repository is **split-licensed**, and the distinction matters before you deploy.

### Code, models, and documentation — Apache License 2.0

Everything Project Harper authored — the BPMN processes, the Kogito/Quarkus service, the DMN model structure, the documentation, and the archived prototype — is licensed under the [Apache License 2.0](LICENSE). Free to use, modify, and redistribute, commercially or otherwise.

### The Greenbaum screening instrument — terms not established

The *clinical content* encoded in [`models/dmn/greenbaum.dmn`](models/dmn/greenbaum.dmn) — the six screening items and the ≥ 2 cutoff — is **not Project Harper's to license.** It derives from the Short Screen for Child Sex Trafficking (SSCST):

> Greenbaum VJ, Dodd M, McCracken C. *A Short Screening Tool to Identify Victims of Child Sex Trafficking in the Health Care Setting.* Pediatric Emergency Care. [PMID 26599463](https://pubmed.ncbi.nlm.nih.gov/26599463/)

That paper is not open access, and **we have not established the instrument's redistribution terms.** Apache 2.0 does not extend to this content. Project Harper does not grant, and cannot grant, any rights to it.

What this means if you intend to deploy Harper:

- **Assume permission is required.** Obtain your own licensing determination from the rights holder before any clinical or commercial use. Do not treat this repository as authority that you may use the instrument.
- **The derivative-works question is open.** Harper encodes the items in DMN with reworded labels and an explicit partner-count threshold. Whether that is a permitted reproduction or a derivative work **has not been reviewed by counsel.**

**Status: unresolved and under review.** Do not rely on this repository for a licensing determination. Nothing here is legal advice.

See [NOTICE](NOTICE) for the full third-party attribution record.
