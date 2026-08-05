## What and why

<!-- What changed, and what problem it solves. The "why" is what reviewers cannot
     reconstruct from the diff six months from now. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] **Clinical change** — a threshold, cutoff, or scoring rule (complete the section below)
- [ ] Documentation
- [ ] Build, CI, or dependencies

## Clinical changes only

<!-- Delete this section if it does not apply. -->

- **Evidence / citation:**
- **Effect on sensitivity and specificity:**
- **Effect on downstream referral load:**

## Checklist

- [ ] **No patient data anywhere** — not in the diff, tests, logs, screenshots, or commit
      messages. Synthetic data only.
- [ ] Clinical logic changed in the BPMN/DMN models, not reimplemented in code
- [ ] Ran `./sync-models.sh` if I edited anything under `models/`
- [ ] Added or updated tests; `mvn verify` passes
- [ ] Documentation updated if behaviour changed
- [ ] I have stated plainly anything I could not verify
