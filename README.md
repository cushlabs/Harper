# Project Harper

**Open-source, real-time detection of human trafficking in the emergency department.**

Project Harper detects possible child sex trafficking in real time during an emergency-department (ED) visit and connects suspected victims to help before discharge. It is an open-source rebuild of the 2022 HIMSS "Greenbaum 2.0" interoperability blueprint, built entirely on open standards so an ED can adopt the *implementation* without licensing fees. The clinical instrument it administers — the Greenbaum Short Screen — carries its own separate terms. **Read [License](#license) before deploying.**

> **Synthetic data only.** Nothing here is for clinical use without appropriate governance, local validation, and safeguards.

## How it works

As a patient moves through registration → triage → examination → discharge, Harper watches the FHIR record, prompts the validated Greenbaum screen at the right moment, and scores risk with transparent, inspectable decision logic. A positive screen **drafts** a social-work referral; a licensed practitioner must **finalize** it before it routes. Automation assists — a clinician always decides — and the system never contacts law enforcement on its own.

## Open stack

FHIR R4 / US Core · CDS Hooks · SMART on FHIR · BPMN + DMN (Kogito) · Kubernetes. Every layer of the *technology stack* is open-source and permissively licensed. The Greenbaum screening instrument encoded in the decision models is **not** — see [License](#license).

## Repository layout

```
.
├── docs/                                 Specification and overview
│   ├── use-case-specification.docx       Full use-case spec (v1.2)
│   └── what-is-project-harper.docx        One-page overview
├── models/
│   ├── bpmn/                             BPMN 2.0 process models
│   │   ├── ed-encounter.bpmn              Orchestrator — one instance per ED encounter (executable)
│   │   ├── registrar.bpmn                 } sub-processes invoked by the
│   │   ├── nurse.bpmn                     } orchestrator (executable)
│   │   ├── practitioner.bpmn              }
│   │   └── ed-trafficking-detection.bpmn  5-pool collaboration — design artifact, not compiled
│   └── dmn/                              DMN 1.3 decision models
│       ├── ed-prescreen.dmn              Should the patient be screened?
│       ├── greenbaum.dmn                 At risk? (>= 2 of six items)
│       └── alarm-signs.dmn               Count + suspicious-findings threshold
├── service/                             Kogito / Quarkus service — executes the models
└── archive/                             Superseded material (early prototype), unmaintained
```

## The models

- **`ed-encounter.bpmn` is the executable orchestrator**: one process instance per ED encounter, calling Registrar → Nurse → (when a draft referral is raised) Practitioner. That instance is the end-to-end reporting spine — status, stage timings, and outcome for a visit.
- **`ed-trafficking-detection.bpmn`** documents the same pathway as a five-pool collaboration. It is a design artifact and is deliberately **not** compiled: in BPMN each pool is a separate process, so a collaboration cannot yield a single end-to-end instance.
- **Signals:** the Nurse's at-risk decision throws `Referral drafted` (which starts the Practitioner swimlane); the Practitioner's *Finalize* step throws `Suspect sex trafficking` (which starts the Social Worker).
- **DMN:** *ED Prescreen* (decision table), *Greenbaum* (≥ 2 of six items), *Alarm Signs* (count + threshold). Business-rule tasks bind to these via Kogito's `implementation="http://www.jboss.org/drools/dmn"`.
- **Screen variants.** The significant-trauma item is answered by two subquestions — *1a* broken bones or cuts needing stitches, *1b* knocked unconscious. The **original** screen counts a yes to either as one positive. The multi-site evaluation also tested a **modified** tool that drops 1a and scores trauma on 1b alone. **Harper defaults to modified**; send `screenVariant: "original"` to score the unmodified screen. `1a` is still collected and stored either way, so switching variants needs no re-collection.
- **Screen performance.** At the ≥ 2 cutoff, per the multi-site evaluation ([Greenbaum VJ et al., *J Adolesc Health* 2018](https://doi.org/10.1016/j.jadohealth.2018.06.032); n = 810 across 16 sites, ED subgroup n = 91):

  | Variant | ED sensitivity | ED specificity | Total-sample sensitivity | Total-sample specificity |
  |---|---|---|---|---|
  | **Modified** (Harper default) | 83.3% | **59.5%** | 84.4% | 64.6% |
  | Original | 83.3% | 49.4% | 84.4% | 57.5% |

  Dropping 1a buys roughly 10 points of ED specificity at no cost to sensitivity — which is why it is the default. The original single-site study reported 92.3% / 74.4%, better than either multi-site result; do not plan around it. Even at 59.5%, about 40% of non-victims screen positive, so **size the downstream social-work path for a high false-positive rate.**
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
