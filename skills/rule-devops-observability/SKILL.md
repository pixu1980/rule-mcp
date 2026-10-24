---
name: rule-devops-observability
description: >-
  Use when defining production observability, SLOs, logging, metrics, tracing, alerts, incident response, or rollback verification. Covers measurable service health without prescribing a vendor, and tracing an AI agent: spans per tool call, a token ledger, and cost per session.
tags:
  - devops
  - observability
  - reliability
  - sre
  - monitoring
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-mcp-engineering
  version: "1.0"
inherits: [rule-devops]
---

# Production Observability and Reliability

Observability is an operational requirement, not a dashboard added after a
release. Select tooling that fits the project (for example OpenTelemetry,
Prometheus/Grafana, Sentry, Datadog, or Better Stack), but keep the telemetry
contract vendor-neutral.

## 1. Define user-visible service objectives

For each critical journey, document:

- **SLI** - the measurable indicator, such as successful checkout requests or
  time to first usable response.
- **SLO** - the target and window, such as 99.9% successful requests over 30
  days or p95 latency below 300 ms.
- **Error budget** - the allowed failure rate implied by the SLO and the action
  when it is exhausted.
- **Owner and response path** - who receives an alert and how they mitigate it.

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

## 5. Tracing an agent: spans, cost per session, replay

An agent breaks the assumptions the four sections above are built on:

- **The failure is semantic, not systemic.** A wrong answer returns 200. A retry
  loop is a run of successful calls. Uptime reads green while the product is
  broken.
- **Runs are not reproducible.** The same input can produce a different run, so
  "reproduce it locally" is unavailable. The trace of the failing run is often
  the only evidence that will ever exist.
- **Cost is a runtime behavior.** One run costs a fraction of a cent, the next
  costs several dollars, depending on how the loop unfolds. That is something to
  observe, not a line on a monthly invoice.
- **Quality is a distribution.** "Is it working" becomes "what share of answers
  are good, and is that share moving".

So for an agent the trace is the primary lens and metrics are the summary, which
is the reverse of a stateless service. A run is a story: plan, call a tool, read
the result, adjust, recover, answer. Metrics summarize the story badly and logs
scatter it.

### The spans a run must produce

| Span       | Carries                                                                                                                        | Answers                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Generation | Model and parameters, the full prompt and the full output, input, output and cached token counts, cost, latency, finish reason | What did the model actually see, and what did it cost         |
| Tool       | Name, arguments, result or error, duration                                                                                     | What the outside world returned, which is where most bugs are |
| Retrieval  | Query, what came back, scores, source documents                                                                                | Why it answered from the wrong document                       |

A **session** groups the traces of one conversation. **Metadata** on every span
(user, session, environment, feature flags) is what makes traces queryable three
months later, when the question is "every failed run on this prompt version for
this customer segment".

Use the OpenTelemetry GenAI attribute names rather than inventing your own, for
the same reason section 2 keeps the telemetry contract vendor-neutral.

**Never truncate the prompt or the output in a span.** A truncated generation
span is complete enough to store and useless in the incident it was stored for.

### Where this contradicts section 2, and why

Section 2 says sample deliberately. For agents, do not: **keep every trace.**
The volumes are orders of magnitude lower than a request-serving service and each
trace is worth far more, because it is the only record of a run that cannot be
reproduced. If volume ever forces a choice, sample successes and keep every
failure.

Redaction does not relax with it. Full-fidelity traces put user data in a
telemetry store, so mask at the point of emission, on day one. Retrofitting
redaction after a compliance review is a bad month.

### Version what shapes behavior

A trace says what happened. To answer what _changed_, every trace carries the
version of each thing that shapes behavior: prompt, model, tool schema,
retrieval index. Teams that tag this way answer "did the drop start with this
prompt" with a query. The rest answer it with archaeology.

### The token ledger: where the tokens and the money went

Every model call returns five numbers. Record all five per span:

**input, cache read, cache write, output, thinking.**

Everything else is arithmetic on those. Effective input price says whether
caching is working. Calls per task catches a retry storm that per-call metrics
hide. Cost per turn across a conversation should be a staircase; a hockey stick
means context is growing every turn.

Two rules pay for themselves:

- **Attribute cost to the task, not the call.** A task ID stitched through every
  span puts an expensive outlier one query away from its own story.
- **Store tokens, apply price at read time.** Prices change and models get
  swapped. A ledger of dollars cannot tell you later whether the month got more
  efficient or the vendor cut prices.

### Cost per task and cost per session, in percentiles

The unit a business buys is the finished task, not the call, and the
distribution matters more than the mean. Agent task cost is long-tailed: a
median of pennies with a p99 of dollars, because the p99 is a loop retrying a
failing tool with small variations. **A small share of tasks can eat a third of
the budget while every average looks fine.** If you keep one cost chart, keep a
percentile chart.

The defense is a harness feature, not an instruction to the model: a token
budget and a turn cap per task, enforced. Exceeding it is a first-class outcome:
stop, checkpoint, degrade or hand to a human. Then roll cost up by task, tool,
model and feature, and alert on the trend rather than the total.

### How this dies

- **Write-only tracing.** Everything instrumented, nothing read. Cure: a
  standing half hour on the worst ten runs of the week.
- **The unreadable trace.** Hundreds of flat spans with truncated fields.
  Instrument the architecture, the agent steps and tools and retrievals, not
  only the API calls.
- **Cost blindness with perfect traces.** Tokens recorded everywhere, aggregated
  nowhere, and finance forwards the invoice first.
- **Dashboard graveyard.** Twelve panels built in week one and the one that
  matters, quality over time by version, built never. Start from the four
  questions worth waking someone: quality drop, cost spike, latency regression,
  error anomaly.

This server keeps its own telemetry on exactly these lines and locally: length
and routed skill, never the prompt text, with the tier that answered each call
recorded so a hit rate is explainable rather than merely reported.

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

- [rule-devops](../rule-devops/SKILL.md) - DevOps skill index
- [rule-backend-security](../rule-backend-security/SKILL.md) - Safe secrets, input, and transport handling
- [rule-platform-web](../rule-platform-web/SKILL.md) - Web performance budgets and client error handling
