# Security Policy

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report privately through GitHub's [private vulnerability reporting](https://github.com/cushlabs/Harper/security/advisories/new)
(Security → Report a vulnerability). If that is unavailable, email the maintainer listed in
[CODEOWNERS](.github/CODEOWNERS).

Please include what you found, how to reproduce it, and what an attacker could do with it.
Expect an acknowledgement within a week. Because Harper is a small volunteer project, please
allow reasonable time for a fix before disclosing publicly.

## Never include patient data in a report

This applies to security reports, bug reports, pull requests, logs, screenshots, and test
fixtures — everywhere, without exception.

Harper processes information about **minors being screened for sex trafficking**. That is
among the most sensitive data a health system holds. A well-meaning reproduction case
containing a real encounter would be a serious breach, and once posted to a public repository
it cannot be recalled.

If you need to demonstrate a problem with real data, say so in your report and the maintainer
will arrange a private channel. Otherwise use synthetic data. If you believe real patient data
has already been committed here, report it as a security issue immediately rather than opening
a pull request to delete it — deleting a file does not remove it from git history.

## Scope

In scope: the Kogito/Quarkus service, the BPMN/DMN models, the React UI, the build and CI
configuration.

Out of scope: `archive/`, which is unmaintained and retained only for reference.

## What this software is and is not

Harper is a **reference implementation built on synthetic data**. It is not a
medical device, it is not validated for clinical use, and it must not be deployed to make
decisions about real patients without local governance, clinical validation, and appropriate
safeguards.

Two properties are deliberate and should be treated as security-relevant. A positive screen
raises a **draft** referral that a licensed practitioner must finalize before it routes —
automation assists, a clinician always decides. And the system **never contacts law
enforcement on its own**. A change that weakens either is a safety regression, and we would
treat a report of one as a security issue.

Note also that the service ships with **no authentication or authorization**. Every generated
endpoint is open. Anyone deploying Harper is responsible for putting authentication,
authorization, transport security, and audit logging in front of it.
