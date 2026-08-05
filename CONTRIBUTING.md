# Contributing to Project Harper

Thanks for considering a contribution. Harper aims to make real-time detection of child sex
trafficking in the emergency department adoptable without licensing the detection capability,
so improvements that make it safer, clearer, or easier to deploy are all welcome.

## Ground rules

**Never include patient data.** Not in issues, pull requests, commit messages, logs,
screenshots, or test fixtures. Use synthetic data only. See [SECURITY.md](SECURITY.md) — this
is the single rule most likely to cause real harm if broken.

**Clinical logic lives in the models, not in code.** Every threshold and rule — the 13–17 age
band, the Greenbaum ≥ 2 cutoff, the alarm-sign threshold — is defined in the BPMN/DMN files
under [`models/`](models/) and evaluated by the engine. `service/src/main` contains no
hand-written Java, and the UI only moves JSON. Change a rule by editing a model, never by
writing code that reimplements it.

**Understand the licensing split before touching the screening content.** The code is Apache
2.0; the Greenbaum screening instrument is not Harper's to license, and its redistribution
terms are unresolved. See the License section of the [README](README.md) and [NOTICE](NOTICE).
Do not add clinical instruments to this repository without establishing their terms first.

## Working on the models

After editing anything in `models/`, re-sync the service's copies:

```bash
cd service && ./sync-models.sh
```

Two constraints the engine imposes:

- **DMN model names must not contain spaces** — the name becomes the endpoint path.
- **Every DMN input is required.** Kogito raises an error for an input missing from the
  request context, surfacing as an HTTP 500 rather than a validation message. Send every
  field on every call.

## Tests

New processes and decisions land with tests. That is the going-forward gate.

```bash
mvn verify     # unit + integration + coverage, from the repo root
```

Add a `*DecisionTest` per DMN model and a process test per executable BPMN, asserting the
draft → finalize → signal path. Cover the boundaries, not just the happy path — the existing
`GreenbaumScreenDecisionTest` is a reasonable model: cutoff edges, both scoring variants, and
the count-once rule.

## Changes to clinical behaviour

A change to a threshold, cutoff, or scoring rule is a clinical change, not a technical one.
Say in the pull request what evidence supports it, and cite the source. Include the
performance characteristics if you have them — Harper documents sensitivity and specificity
per decision precisely so that adopters can size the downstream referral load, and a change
that shifts those numbers without saying so is a problem.

Be aware that raising sensitivity generally lowers specificity. At the current cutoff, roughly
40% of non-victims already screen positive. Changes that increase that further need a clear
justification.

## Pull requests

Keep them focused — one concern per PR. Explain what changed and why; the *why* is what
reviewers cannot reconstruct later. If a change is unverified, say so plainly rather than
implying it was tested.

CI runs `mvn verify` and builds the UI on every pull request. Both must pass.
