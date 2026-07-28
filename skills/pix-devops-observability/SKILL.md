---
name: rule-devops-observability
description: >-
  Use when defining production observability, SLOs, logging, metrics, tracing, alerts, incident response, or rollback verification. Covers measurable service health without prescribing a vendor.
tags:
  - devops
  - observability
  - reliability
  - sre
  - monitoring
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Production Observability and Reliability

Observability is an operational requirement, not a dashboard added after a
release. Select tooling that fits the project (for example OpenTelemetry,
Prometheus/Grafana, Sentry, Datadog, or Better Stack), but keep the telemetry
contract vendor-neutral.

## 1. Define user-visible service objectives

For each critical journey, document:

- **SLI** — the measurable indicator, such as successful checkout requests or
  time to first usable response.
- **SLO** — the target and window, such as 99.9% successful requests over 30
  days or p95 latency below 300 ms.
- **Error budget** — the allowed failure rate implied by the SLO and the action
  when it is exhausted.
- **Owner and response path** — who receives an alert and how they mitigate it.

Do not page on every infrastructure fluctuation. Page only for actionable,
user-impacting symptoms; use tickets or dashboards for non-urgent signals.

## 2. Emit safe, correlated telemetry

### Structured logs

Log machine-readable events with timestamp, severity, service/version,
request or trace ID, operation, duration, and outcome. Redact or omit secrets,
authorization headers, tokens, passwords, raw request bodies, and unnecessary
PII. Define retention and access controls before collecting customer data.

### Metrics

At minimum measure request volume, success/error rate, latency distributions,
saturation, and dependency failures. Prefer counters, gauges, and histograms;
avoid unbounded-cardinality labels such as user IDs, order IDs, email
addresses, or raw URLs.

### Traces

Propagate a correlation/trace ID through inbound requests, jobs, queues, and
downstream calls. Sample deliberately: retain errors and slow traces, then use
a representative baseline rate for healthy traffic.

## 3. Make deployments observable and reversible

- Attach version, commit SHA, environment, and deployment timestamp to logs,
  metrics, and error reports.
- Define health/readiness checks that reflect dependency availability and safe
  startup; avoid checks that always return success.
- Release progressively when the risk warrants it: canary, staged rollout, or
  feature flag.
- Before deployment, define rollback triggers, the last known-good artifact,
  the rollback owner, and a verification query.
- After deployment, verify the relevant SLI over a defined observation window;
  a successful pipeline alone is not proof of a healthy release.

## 4. Alert and learn from incidents

Every actionable alert must identify the affected service/journey, current
symptom, threshold/window, dashboard or trace link, severity, and first
mitigation step. Maintain a lightweight incident record with timeline, impact,
decisions, remediation, and follow-up owner.

Use blameless post-incident reviews. Turn recurring failures into backlog work:
a test, an SLO, a runbook, a capacity change, or a safer deployment control.
Measure delivery health over time with deployment frequency, lead time for
changes, change failure rate, and mean time to restore.

## Production-readiness checklist

- [ ] Critical journeys have an SLI, SLO, owner, and alert policy.
- [ ] Logs are structured, correlated, access-controlled, and redacted.
- [ ] Metrics avoid high-cardinality labels and cover latency, errors, traffic,
      saturation, and dependencies.
- [ ] Traces cross process and queue boundaries where applicable.
- [ ] Dashboards expose current service health and deployment version.
- [ ] Alerts are actionable, tested, and routed to an owner.
- [ ] Deployment, rollback, and verification procedures are rehearsed.
- [ ] Incident follow-ups have owners and due dates.

## See also

- [rule-devops](../rule-devops/SKILL.md) — DevOps skill index
- [rule-devops-gitlab-ci](../rule-devops-gitlab-ci/SKILL.md) — CI/CD pipeline and deployment stages
- [rule-backend-security](../rule-backend-security/SKILL.md) — Safe secrets, input, and transport handling
- [rule-platform-web](../rule-platform-web/SKILL.md) — Web performance budgets and client error handling
- [rule-process-feature-workflow](../rule-process-feature-workflow/SKILL.md) — Delivery validation and release workflow
